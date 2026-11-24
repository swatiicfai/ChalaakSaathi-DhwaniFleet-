const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Real-Time TMS & Detention State Ledger
let tmsState = {
  truckId: 'HR-55-AJ-9021',
  driverName: 'Gurpreet Singh',
  driverPhone: '+91 98765 43210',
  preferredLanguage: 'Punjabi / Hinglish (Auto-detected)',
  consignee: 'Bharat Life Sciences Cold Hub (Sonipat)',
  cargoType: 'Temperature Sensitive Vaccines (Covaxin & Biologics)',
  cargoValue: '₹ 1,45,00,000',
  scheduledSlot: 'Gate 2 - Bay 2 (11:00 AM)',
  currentStatus: 'GATE_ARRIVED_PENDING_INSPECTION',
  allocatedBay: 'Gate 2 - Bay 2',
  reeferTemp: 5.4, // Celsius (Excursion limit: > 4.0 C)
  tempStatus: 'WARNING_EXCURSION',
  detentionHours: 0.0,
  detentionRatePerHour: 2200, // INR per hour
  totalClaimAmount: 0,
  isDetentionClockRunning: false,
  detentionStartTime: null,
  activeTickets: [],
  incidentCards: [],
  logs: [
    { timestamp: new Date().toLocaleTimeString(), message: 'Truck arrived at Sonipat Hub perimeter. Telematics connected.', type: 'info' }
  ]
};

// Tool Handlers
const tools = {
  update_tms_dock_slot: (args) => {
    const oldBay = tmsState.allocatedBay;
    tmsState.allocatedBay = args.gate_number || 'Bay 4';
    tmsState.currentStatus = 'BAY_REASSIGNED_PROCEEDING';
    const logMsg = `TMS Dock Slot updated from [${oldBay}] to [${tmsState.allocatedBay}]. Reason: ${args.reason || 'Guard instructed / chiller failure at Bay 2'}`;
    tmsState.logs.unshift({ timestamp: new Date().toLocaleTimeString(), message: logMsg, type: 'success' });
    return {
      status: 'SUCCESS',
      previous_bay: oldBay,
      new_bay: tmsState.allocatedBay,
      dock_supervisor_alerted: true,
      e_gate_pass_code: 'GP-' + Math.floor(1000 + Math.random() * 9000),
      message: `Dock slot successfully shifted to ${tmsState.allocatedBay}. Supervisor notified.`
    };
  },

  log_reefer_temperature_excursion: (args) => {
    tmsState.reeferTemp = Number(args.current_temp) || 5.4;
    tmsState.tempStatus = args.status || 'CRITICAL_EXCURSION';
    const ticketId = 'CC-EXC-' + Math.floor(10000 + Math.random() * 90000);
    const ticket = {
      id: ticketId,
      timestamp: new Date().toLocaleTimeString(),
      temp: tmsState.reeferTemp,
      status: tmsState.tempStatus,
      cargo: tmsState.cargoType,
      action: 'Emergency cooling protocol triggered & Pharma QA alerted.'
    };
    tmsState.activeTickets.unshift(ticket);
    const logMsg = `Cold-Chain Excursion logged! Temp: ${tmsState.reeferTemp}°C. Ticket ${ticketId} created. QA Alert sent.`;
    tmsState.logs.unshift({ timestamp: new Date().toLocaleTimeString(), message: logMsg, type: 'danger' });
    return {
      status: 'LOGGED_CRITICAL',
      ticket_id: ticketId,
      recorded_temp: tmsState.reeferTemp,
      pharma_compliance_logged: true,
      message: `Reefer temperature ${tmsState.reeferTemp}°C recorded in blockchain audit trail. Cooling technician notified.`
    };
  },

  file_detention_demurrage_claim: (args) => {
    tmsState.isDetentionClockRunning = true;
    tmsState.detentionStartTime = new Date().toLocaleTimeString();
    tmsState.detentionHours = Number(args.detention_hours) || 1.5;
    tmsState.totalClaimAmount = tmsState.detentionHours * tmsState.detentionRatePerHour;
    const claimId = 'DEM-' + Math.floor(1000 + Math.random() * 9000);
    const claimLog = `Demurrage claim ${claimId} opened. Hours: ${tmsState.detentionHours} hrs @ ₹${tmsState.detentionRatePerHour}/hr. Total: ₹${tmsState.totalClaimAmount}`;
    tmsState.logs.unshift({ timestamp: new Date().toLocaleTimeString(), message: claimLog, type: 'warning' });
    return {
      status: 'DEMURRAGE_CLAIM_FILED',
      claim_id: claimId,
      hours_billed: tmsState.detentionHours,
      rate_per_hour: tmsState.detentionRatePerHour,
      total_claim_inr: tmsState.totalClaimAmount,
      transporter_notified: true,
      message: `Official detention claim filed with consignee. ₹${tmsState.totalClaimAmount} claim added to e-Way bill ledger.`
    };
  },

  generate_shareable_voice_incident_card: (args) => {
    const cardId = 'CARD-' + Math.floor(1000 + Math.random() * 9000);
    const card = {
      id: cardId,
      timestamp: new Date().toLocaleTimeString(),
      summary: args.summary || 'Driver reported Bay 2 chiller breakdown and 5.4°C reefer spike. Re-routed to Bay 4 and detention claim filed.',
      language: args.vernacular_language || 'Hinglish / Punjabi',
      urgency: args.urgency || 'HIGH',
      driverAudioClipUrl: '/audio/incident_recording_sample.mp3',
      shareUrl: `https://dhwanifleet.in/incident/${cardId}`
    };
    tmsState.incidentCards.unshift(card);
    const logMsg = `Bonus: Shareable Voice Incident Card [${cardId}] created in ${card.language}. Ready for WhatsApp dispatch.`;
    tmsState.logs.unshift({ timestamp: new Date().toLocaleTimeString(), message: logMsg, type: 'bonus' });
    return {
      status: 'CREATED',
      card_id: cardId,
      share_url: card.shareUrl,
      whatsapp_dispatch_ready: true,
      message: `Voice incident card created. Dispatched to consignee WhatsApp and fleet manager portal.`
    };
  }
};

// REST API for current state
app.get('/api/state', (req, res) => {
  res.json(tmsState);
});

app.post('/api/reset', (req, res) => {
  tmsState.allocatedBay = 'Gate 2 - Bay 2';
  tmsState.currentStatus = 'GATE_ARRIVED_PENDING_INSPECTION';
  tmsState.reeferTemp = 5.4;
  tmsState.tempStatus = 'WARNING_EXCURSION';
  tmsState.detentionHours = 0.0;
  tmsState.totalClaimAmount = 0;
  tmsState.isDetentionClockRunning = false;
  tmsState.activeTickets = [];
  tmsState.incidentCards = [];
  tmsState.logs = [
    { timestamp: new Date().toLocaleTimeString(), message: 'System state reset to initial gate arrival conditions.', type: 'info' }
  ];
  broadcastState();
  res.json({ status: 'ok', state: tmsState });
});

function broadcastState() {
  const payload = JSON.stringify({ type: 'TMS_STATE_UPDATE', data: tmsState });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// System Instruction for Gemini 2.0 Live Audio Agent
const SYSTEM_INSTRUCTION = `
You are DhwaniFleet, a high-velocity, real-time vernacular Voice AI co-pilot for Indian long-haul reefer (refrigerated) truck drivers and cold-chain fleet dispatchers.
You are talking directly to truck drivers over audio in loud, demanding environments (warehouse gates, highway dhabas, loading docks).

KEY OPERATIONAL CHARACTERISTICS:
1. VERNACULAR & CODE-SWITCHING FLUENCY:
- You seamlessly understand and speak in whatever language the driver uses: Hindi, Hinglish, Punjabi, Marathi, Tamil, Telugu, Gujarati, or Indian English.
- Drivers mix regional speech with English logistics terms like 'reefer temp', 'eway bill', 'slot', 'detention', 'bay', 'chiller', 'POD'.
- If the driver speaks in Hinglish/Hindi (e.g., "Bhaiya hum Sonipat gate 2 pe khade hain..."), speak back in natural, respectful, conversational Hinglish ("Haanji Gurpreet ji, main check kar rahi hoon...").
- Be concise, direct, and warm. Drivers have no time for long corporate speeches.

2. IMMEDIATE BARGE-IN & INTERRUPTION HANDLING:
- Drivers work in noisy yards where guards shout or situations change mid-sentence.
- If the driver interrupts or corrects something mid-way, STOP IMMEDIATELY, acknowledge the correction, and pivot smoothly without getting confused.

3. ACTION EXECUTION (MANDATORY FUNCTION CALLING):
- Whenever the driver mentions slot changes, gate shifts, or bay assignments, execute: 'update_tms_dock_slot'.
- Whenever the driver mentions temperature issues (e.g., reefer temp 5.4°C, chiller band hai, cooling issue), execute: 'log_reefer_temperature_excursion'.
- Whenever the driver is made to wait, delayed, or faces gate detention, execute: 'file_detention_demurrage_claim'.
- Whenever the incident is settled or the driver asks for a summary/voice record for WhatsApp/manager, execute: 'generate_shareable_voice_incident_card'.

Always execute the right tool immediately while keeping your spoken responses brisk, reassuring, and solution-focused.
`;

const FUNCTION_DECLARATIONS = [
  {
    name: 'update_tms_dock_slot',
    description: 'Updates warehouse dock gate or bay assignment for the truck.',
    parameters: {
      type: 'OBJECT',
      properties: {
        gate_number: { type: 'STRING', description: 'The new gate or bay number, e.g., Bay 4, Gate 5' },
        reason: { type: 'STRING', description: 'Reason for bay reassignment' }
      },
      required: ['gate_number']
    }
  },
  {
    name: 'log_reefer_temperature_excursion',
    description: 'Logs an emergency temperature breach or excursion for cold-chain goods.',
    parameters: {
      type: 'OBJECT',
      properties: {
        current_temp: { type: 'NUMBER', description: 'Current temperature reading in Celsius' },
        status: { type: 'STRING', enum: ['NORMAL', 'WARNING_EXCURSION', 'CRITICAL_EXCURSION'] }
      },
      required: ['current_temp', 'status']
    }
  },
  {
    name: 'file_detention_demurrage_claim',
    description: 'Starts the official demurrage compensation clock and files a detention dispute ticket with consignee.',
    parameters: {
      type: 'OBJECT',
      properties: {
        warehouse_name: { type: 'STRING', description: 'Warehouse location' },
        detention_hours: { type: 'NUMBER', description: 'Estimated or current detention hours' }
      },
      required: ['warehouse_name']
    }
  },
  {
    name: 'generate_shareable_voice_incident_card',
    description: 'Curates the spoken incident report into a shareable bilingual voice incident card for WhatsApp/dispatch (Bonus Track).',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'Concise summary of the incident and actions taken' },
        vernacular_language: { type: 'STRING', description: 'Language used by driver e.g. Hinglish, Punjabi, Hindi' },
        urgency: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
      },
      required: ['summary', 'vernacular_language']
    }
  }
];

// WebSocket Connection Handler
wss.on('connection', (clientWs) => {
  console.log('[DhwaniFleet] Client connected via WebSocket');
  let geminiWs = null;
  let isGeminiConnected = false;

  clientWs.send(JSON.stringify({ type: 'TMS_STATE_UPDATE', data: tmsState }));

  // Connect to Gemini 2.0 Multimodal Live API
  function initGeminiLive(apiKey) {
    const key = apiKey || GEMINI_API_KEY;
    if (!key) {
      clientWs.send(JSON.stringify({
        type: 'SYSTEM_NOTICE',
        message: 'No GEMINI_API_KEY detected in .env. Running in interactive demo mode with real-time tool calling and simulated audio synthesis, or provide an API key in settings.'
      }));
      return;
    }

    const host = 'generativelanguage.googleapis.com';
    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${key}`;

    try {
      geminiWs = new WebSocket(uri);

      geminiWs.on('open', () => {
        console.log('[DhwaniFleet] Connected to Google Gemini Multimodal Live API');
        isGeminiConnected = true;
        clientWs.send(JSON.stringify({ type: 'GEMINI_CONNECTED', model: 'gemini-2.0-flash-exp' }));

        // Send Setup Frame
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
          }
        };
        geminiWs.send(JSON.stringify(setupMessage));
      });

      geminiWs.on('message', (data) => {
        try {
          const resp = JSON.parse(data.toString());

          // Handle Tool Calls from Gemini
          if (resp.toolCall && resp.toolCall.functionCalls) {
            for (const call of resp.toolCall.functionCalls) {
              console.log('[DhwaniFleet Tool Execution]:', call.name, call.args);
              const handler = tools[call.name];
              let result = { error: 'Unknown tool' };
              if (handler) {
                result = handler(call.args);
                broadcastState();
                clientWs.send(JSON.stringify({
                  type: 'TOOL_EXECUTED',
                  name: call.name,
                  args: call.args,
                  result: result
                }));
              }

              // Send Tool Response back to Gemini Live
              const toolResponseMsg = {
                toolResponse: {
                  functionResponses: [
                    {
                      response: { output: result },
                      id: call.id
                    }
                  ]
                }
              };
              if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
                geminiWs.send(JSON.stringify(toolResponseMsg));
              }
            }
          }

          // Forward Audio or Text tokens to Client
          clientWs.send(JSON.stringify({ type: 'GEMINI_RAW_RESPONSE', payload: resp }));
        } catch (e) {
          // If binary or unexpected format
          clientWs.send(data);
        }
      });

      geminiWs.on('error', (err) => {
        console.error('[Gemini WS Error]:', err.message);
        clientWs.send(JSON.stringify({ type: 'GEMINI_ERROR', error: err.message }));
      });

      geminiWs.on('close', (code, reason) => {
        console.log('[Gemini WS Closed]:', code, reason.toString());
        isGeminiConnected = false;
        clientWs.send(JSON.stringify({ type: 'GEMINI_DISCONNECTED', code }));
      });
    } catch (err) {
      console.error('[Gemini Connection Exception]:', err);
    }
  }

  // Handle messages from Browser Client
  clientWs.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'START_SESSION') {
        initGeminiLive(msg.apiKey);
      } else if (msg.type === 'AUDIO_CHUNK') {
        // Driver PCM audio frame (16kHz 16-bit linear PCM base64)
        if (isGeminiConnected && geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          const frame = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: msg.data
                }
              ]
            }
          };
          geminiWs.send(JSON.stringify(frame));
        }
      } else if (msg.type === 'INTERRUPT_SIGNAL') {
        // Driver spoke while Gemini was speaking: client detected barge-in!
        console.log('[DhwaniFleet] Barge-in Interruption detected from driver!');
        clientWs.send(JSON.stringify({
          type: 'INTERRUPT_ACKNOWLEDGED',
          timestamp: new Date().toLocaleTimeString(),
          message: 'Barge-in triggered: Audio queue flushed, model turn preempted.'
        }));
      } else if (msg.type === 'TRIGGER_MOCK_TOOL') {
        // Allows direct evaluation test of state mutation from test suite
        const handler = tools[msg.tool];
        if (handler) {
          const res = handler(msg.args);
          broadcastState();
          clientWs.send(JSON.stringify({ type: 'TOOL_EXECUTED', name: msg.tool, args: msg.args, result: res }));
        }
      }
    } catch (e) {
      console.error('Error parsing client message:', e);
    }
  });

  clientWs.on('close', () => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚚 DhwaniFleet Voice AI Server is running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
  console.log(`=======================================================`);
});
