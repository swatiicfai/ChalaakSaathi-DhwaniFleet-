const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const {
  GoogleGenAI,
  Modality,
  ActivityHandling,
  FunctionResponseScheduling
} = require('@google/genai');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');
const { FUNCTION_DECLARATIONS, executeTool } = require('./tmsService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = Number(process.env.PORT) || 3000;
const ENV_GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
const ALLOWED_MODELS = new Set([
  'gemini-3.8-live',
  'gemini-3.8-live-extended-thinking'
]);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_INSTRUCTION = `
You are ChalaakSaathi (DhwaniFleet), a high-velocity, real-time vernacular Voice AI co-pilot for Indian long-haul reefer (refrigerated) truck drivers and cold-chain fleet dispatchers.
You speak directly to truck drivers over live audio in loud logistics environments (warehouse intake gates, highway dhabas, cold-storage bays with 85+ dB diesel engine noise and air horns).

KEY OPERATIONAL RULES:
1. VERNACULAR & CODE-SWITCHING FLUENCY:
- Understand and reply naturally in whichever language or mix the driver uses: Hindi, Hinglish, Punjabi, Tamil, Tanglish, Marathi, Telugu, Gujarati, or Indian English.
- Drivers mix vernacular speech with English logistics jargon: 'reefer temp', 'eway bill', 'slot', 'detention', 'demurrage', 'bay', 'chiller', 'POD'.
- Mirror the driver's language warmly and concisely (1–2 crisp sentences max; drivers are maneuvering 16-wheelers).

2. IMMEDIATE BARGE-IN & INTERRUPTION HANDLING:
- If a driver interrupts mid-sentence because a gate guard shouted or plans changed, stop immediately, acknowledge the updated instruction, and execute the new tool action without repeating old stale details.

3. STRICT TOOL-FIRST GROUNDING & EXECUTION:
- NEVER claim an e-Way Bill is verified, a bay is shifted, an excursion is logged, a claim is filed, or a card is generated until the corresponding tool call returns SUCCESS/VERIFIED.
- When driver gives an e-Way Bill number -> call 'verify_eway_bill'.
- When driver mentions bay/gate/slot shifts -> call 'update_tms_dock_slot'.
- When driver reports reefer temperature or chiller malfunction -> call 'log_reefer_temperature_excursion'.
- When driver reports waiting/detention/unloading delay -> call 'file_detention_demurrage_claim'.
- When driver requests a WhatsApp summary/POD/incident card -> call 'generate_shareable_voice_incident_card'.
`;

function broadcastState() {
  const payload = JSON.stringify({ type: 'TMS_STATE_UPDATE', data: db.getState() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Non-browser CLI/test clients
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || parsed.host === req.headers.host;
  } catch {
    return false;
  }
}

function resolveModel(requestedModel) {
  if (requestedModel && ALLOWED_MODELS.has(requestedModel)) {
    return requestedModel;
  }
  return DEFAULT_LIVE_MODEL;
}

function buildLiveConfig(model, resumptionHandle) {
  const config = {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Puck' }
      }
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: resumptionHandle ? { handle: resumptionHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
    realtimeInputConfig: {
      activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS
    },
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
  };

  if (model === 'gemini-3.8-live-extended-thinking') {
    config.thinkingConfig = { thinkingLevel: 'low' };
  }

  return config;
}

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ChalaakSaathi (DhwaniFleet)',
    defaultModel: DEFAULT_LIVE_MODEL,
    supportedModels: Array.from(ALLOWED_MODELS),
    persistence: 'SQLite (node:sqlite)',
    sqlite: true,
    apiKeyConfigured: Boolean(ENV_GEMINI_API_KEY && !ENV_GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY'))
  });
});

app.get('/api/state', (req, res) => {
  res.json(db.getState());
});

app.get('/api/ledger', (req, res) => {
  const state = db.getState();
  res.json({
    truckId: state.truckId,
    ewayBillNo: state.ewayBillNo,
    ewayBillStatus: state.ewayBillStatus,
    allocatedBay: state.allocatedBay,
    reeferTemp: state.reeferTemp,
    totalClaimAmount: state.totalClaimAmount,
    excursionTickets: state.activeTickets,
    demurrageClaims: state.demurrageClaims,
    incidentCards: state.incidentCards,
    telemetry: state.telemetry,
    logs: state.logs
  });
});

app.post('/api/reset', (req, res) => {
  const state = db.resetState();
  broadcastState();
  res.json({ status: 'ok', state });
});

// WebSocket Bridge: Browser <-> Node.js <-> Gemini 3.8 Live (@google/genai)
wss.on('connection', (clientWs, req) => {
  if (!isOriginAllowed(req)) {
    console.warn('[Security] Rejected cross-origin WebSocket connection:', req.headers.origin);
    clientWs.close(1008, 'Origin not allowed');
    return;
  }

  console.log('[ChalaakSaathi] Client connected via WebSocket');
  let liveSession = null;
  let activeModel = DEFAULT_LIVE_MODEL;
  let activeApiKey = '';
  let resumptionHandle = null;
  let isConnecting = false;
  let isClosingClient = false;
  let lastInputSentAt = 0;
  let awaitingFirstOutputForTurn = false;
  const cancelledToolIds = new Set();

  sendJson(clientWs, { type: 'TMS_STATE_UPDATE', data: db.getState() });

  function closeLiveSession() {
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {
        console.warn('[ChalaakSaathi] Error closing Gemini session:', e.message);
      }
      liveSession = null;
    }
  }

  async function initGeminiLive({ apiKey, model, resumeHandle = null } = {}) {
    if (isConnecting) return;
    const key = (apiKey || activeApiKey || ENV_GEMINI_API_KEY || '').trim();
    activeModel = resolveModel(model || activeModel);

    if (!key || key.includes('YOUR_GEMINI_API_KEY')) {
      sendJson(clientWs, {
        type: 'SYSTEM_NOTICE',
        mode: 'demo',
        message: 'No GEMINI_API_KEY configured. Running in offline SQLite Demo Mode; add your key in Settings for live Gemini 3.8 audio.'
      });
      return;
    }

    activeApiKey = key;
    isConnecting = true;
    closeLiveSession();

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: { apiVersion: 'v1beta' }
      });

      let session = null;
      session = await ai.live.connect({
        model: activeModel,
        config: buildLiveConfig(activeModel, resumeHandle),
        callbacks: {
          onopen: () => {
            console.log(`[ChalaakSaathi] Connected to ${activeModel} (v1beta)`);
          },
          onmessage: (msg) => {
            handleGeminiServerMessage(msg, session || liveSession);
          },
          onerror: (err) => {
            const message = err?.message || 'Gemini Live WebSocket error';
            console.error('[Gemini Live Error]:', message);
            sendJson(clientWs, { type: 'GEMINI_ERROR', error: message });
          },
          onclose: (event) => {
            console.log('[Gemini Live Closed]:', event?.code, event?.reason || '');
            if (liveSession === session) {
              liveSession = null;
            }
            if (!isClosingClient) {
              sendJson(clientWs, {
                type: 'GEMINI_DISCONNECTED',
                code: event?.code || 1000,
                reason: event?.reason || ''
              });
            }
          }
        }
      });

      liveSession = session;
      sendJson(clientWs, {
        type: 'GEMINI_CONNECTED',
        model: activeModel,
        resumed: Boolean(resumeHandle)
      });
    } catch (err) {
      console.error('[ChalaakSaathi] Failed to connect Gemini Live:', err.message);
      sendJson(clientWs, {
        type: 'GEMINI_ERROR',
        error: err.message || 'Unable to connect to Gemini 3.8 Live'
      });
    } finally {
      isConnecting = false;
    }
  }

  function handleGeminiServerMessage(msg, session) {
    if (msg.sessionResumptionUpdate?.newHandle) {
      resumptionHandle = msg.sessionResumptionUpdate.newHandle;
    }

    if (msg.goAway) {
      console.warn('[Gemini Live GoAway]: Reconnecting with resumption handle...', msg.goAway);
      sendJson(clientWs, {
        type: 'SYSTEM_NOTICE',
        message: 'Gemini Live session approaching connection limit; seamlessly resuming...'
      });
      if (!isClosingClient && resumptionHandle) {
        setTimeout(() => {
          void initGeminiLive({ apiKey: activeApiKey, model: activeModel, resumeHandle: resumptionHandle });
        }, 50);
      }
      return;
    }

    if (msg.toolCallCancellation?.ids) {
      for (const id of msg.toolCallCancellation.ids) {
        cancelledToolIds.add(id);
      }
      db.addAuditLog(`Tool execution cancelled by barge-in (${msg.toolCallCancellation.ids.join(', ')})`, 'info');
      broadcastState();
    }

    if (msg.toolCall?.functionCalls) {
      const functionResponses = [];
      for (const call of msg.toolCall.functionCalls) {
        if (cancelledToolIds.has(call.id)) {
          cancelledToolIds.delete(call.id);
          continue;
        }
        console.log(`[ChalaakSaathi Tool Call]: ${call.name}`, call.args);
        const result = executeTool(call.name, call.args);
        broadcastState();
        sendJson(clientWs, {
          type: 'TOOL_EXECUTED',
          name: call.name,
          args: call.args,
          result
        });
        functionResponses.push({
          id: call.id,
          name: call.name,
          scheduling: FunctionResponseScheduling.WHEN_IDLE,
          response: { output: result }
        });
      }

      if (functionResponses.length > 0) {
        const activeSess = session || liveSession;
        if (activeSess) {
          activeSess.sendToolResponse({ functionResponses });
        }
      }
    }

    const sc = msg.serverContent;
    let measuredTtft = null;

    if (sc) {
      if (sc.interrupted) {
        awaitingFirstOutputForTurn = false;
        sendJson(clientWs, {
          type: 'GEMINI_INTERRUPTED',
          timestamp: new Date().toLocaleTimeString()
        });
      }

      if (sc.interimInputTranscription?.text) {
        sendJson(clientWs, {
          type: 'TRANSCRIPT_EVENT',
          role: 'driver',
          interim: true,
          text: sc.interimInputTranscription.text
        });
      }

      if (sc.inputTranscription?.text) {
        sendJson(clientWs, {
          type: 'TRANSCRIPT_EVENT',
          role: 'driver',
          interim: false,
          text: sc.inputTranscription.text
        });
      }

      if (sc.outputTranscription?.text) {
        if (awaitingFirstOutputForTurn && lastInputSentAt > 0) {
          measuredTtft = Math.round(Date.now() - lastInputSentAt);
          awaitingFirstOutputForTurn = false;
        }
        sendJson(clientWs, {
          type: 'TRANSCRIPT_EVENT',
          role: 'gemini',
          interim: false,
          text: sc.outputTranscription.text,
          ttftMs: measuredTtft
        });
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) {
            if (awaitingFirstOutputForTurn && lastInputSentAt > 0) {
              measuredTtft = Math.round(Date.now() - lastInputSentAt);
              awaitingFirstOutputForTurn = false;
            }
            sendJson(clientWs, {
              type: 'GEMINI_AUDIO_CHUNK',
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
              ttftMs: measuredTtft
            });
          } else if (part.text) {
            sendJson(clientWs, {
              type: 'TRANSCRIPT_EVENT',
              role: 'gemini',
              interim: false,
              text: part.text
            });
          }
        }
      }

      if (sc.turnComplete || sc.interactionStatus === 'IDLE') {
        sendJson(clientWs, {
          type: 'GEMINI_TURN_COMPLETE',
          interactionStatus: sc.interactionStatus || 'IDLE',
          turnCompleteReason: sc.turnCompleteReason || null
        });
      }
    }

    if (msg.usageMetadata) {
      db.recordUsage({
        promptTokens: msg.usageMetadata.promptTokenCount || 0,
        responseTokens: msg.usageMetadata.responseTokenCount || 0,
        totalTokens: msg.usageMetadata.totalTokenCount || 0,
        ttftMs: measuredTtft
      });
      broadcastState();
    }
  }

  clientWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'START_SESSION') {
        void initGeminiLive({ apiKey: msg.apiKey, model: msg.model });
      } else if (msg.type === 'AUDIO_CHUNK') {
        if (liveSession && msg.data) {
          if (msg.speechActive || !awaitingFirstOutputForTurn) {
            lastInputSentAt = Date.now();
            awaitingFirstOutputForTurn = true;
          }
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        }
      } else if (msg.type === 'AUDIO_STREAM_END') {
        if (liveSession) {
          lastInputSentAt = Date.now();
          awaitingFirstOutputForTurn = true;
          liveSession.sendRealtimeInput({ audioStreamEnd: true });
        }
      } else if (msg.type === 'TEXT_INPUT') {
        if (liveSession && msg.text) {
          lastInputSentAt = Date.now();
          awaitingFirstOutputForTurn = true;
          if (msg.interrupt) {
            // Unconditionally interrupts active generation per Gemini 3.8 Live spec
            liveSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: msg.text }] }],
              turnComplete: true
            });
          } else {
            liveSession.sendRealtimeInput({ text: msg.text });
          }
        } else {
          sendJson(clientWs, {
            type: 'GEMINI_UNAVAILABLE',
            message: 'Gemini Live session not connected.'
          });
        }
      } else if (msg.type === 'INTERRUPT_SIGNAL') {
        console.log('[ChalaakSaathi] Client barge-in signal received');
        awaitingFirstOutputForTurn = false;
        sendJson(clientWs, {
          type: 'INTERRUPT_ACKNOWLEDGED',
          timestamp: new Date().toLocaleTimeString(),
          message: 'Client barge-in acknowledged; playback queue flushed.'
        });
      } else if (msg.type === 'TRIGGER_MOCK_TOOL') {
        const result = executeTool(msg.tool, msg.args);
        broadcastState();
        sendJson(clientWs, {
          type: 'TOOL_EXECUTED',
          name: msg.tool,
          args: msg.args,
          result
        });
      }
    } catch (e) {
      console.error('[ChalaakSaathi] Error parsing client message:', e);
    }
  });

  clientWs.on('close', () => {
    isClosingClient = true;
    closeLiveSession();
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('=======================================================');
    console.log(`🚚 ChalaakSaathi (DhwaniFleet) Server running on port ${PORT}`);
    console.log(`🤖 Model: ${DEFAULT_LIVE_MODEL} (@google/genai v1beta)`);
    console.log(`💾 Persistence: SQLite (${db.DB_PATH})`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
    console.log('=======================================================');
  });
}

module.exports = { app, server };
