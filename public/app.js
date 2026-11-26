// ChalaakSaathi (DhwaniFleet) Real-Time Voice AI Client
// Powered by Gemini 3.8 Live (@google/genai v1beta)

let ws = null;
let audioContext = null;
let mediaStream = null;
let audioInputNode = null;
let workletNode = null;
let workletLoaded = false;
let scriptProcessor = null;
let noiseMixGain = null;
let silentSinkGain = null;
let isRecording = false;
let isGeminiLiveActive = false;
let isGeminiSpeaking = false;
let audioPlaybackQueue = [];
let nextPlayTime = 0;
let consecutiveBargeInFrames = 0;
let lastDemoLatency = null;
let turnCount = 0;
let latestTmsState = null;

let activeDriverBubble = null;
let activeGeminiBubble = null;

let currentApiKey = localStorage.getItem('chalaaksaathi_gemini_key') || '';
let currentModel = localStorage.getItem('chalaaksaathi_live_model') || 'gemini-3.8-live';

// DOM Elements
const btnStartVoice = document.getElementById('btnStartVoice');
const micIcon = document.getElementById('micIcon');
const micPulseRing = document.getElementById('micPulseRing');
const micButtonCircle = document.getElementById('micButtonCircle');
const voiceStatusHint = document.getElementById('voiceStatusHint');
const captureModeLabel = document.getElementById('captureModeLabel');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const modelBadge = document.getElementById('modelBadge');
const latencyValue = document.getElementById('latencyValue');
const persistenceBadge = document.getElementById('persistenceBadge');
const bargeInBadge = document.getElementById('bargeInBadge');
const transcriptBox = document.getElementById('transcriptBox');
const turnCounter = document.getElementById('turnCounter');
const logsFeed = document.getElementById('logsFeed');
const scenarioModeHint = document.getElementById('scenarioModeHint');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const canvasCtx = visualizerCanvas.getContext('2d');

// State Displays
const ewayBadge = document.getElementById('ewayBadge');
const slotDisplay = document.getElementById('slotDisplay');
const slotStatusBadge = document.getElementById('slotStatusBadge');
const slotCard = document.getElementById('slotCard');
const tempDisplay = document.getElementById('tempDisplay');
const tempStatusBadge = document.getElementById('tempStatusBadge');
const tempCard = document.getElementById('tempCard');
const claimDisplay = document.getElementById('claimDisplay');
const detentionStatusBadge = document.getElementById('detentionStatusBadge');
const detentionCard = document.getElementById('detentionCard');
const bonusCardContainer = document.getElementById('bonusCardContainer');
const bonusCardId = document.getElementById('bonusCardId');
const bonusUrgency = document.getElementById('bonusUrgency');
const bonusSummary = document.getElementById('bonusSummary');
const bonusLang = document.getElementById('bonusLang');
const bonusTimestamp = document.getElementById('bonusTimestamp');
const liveTokenStats = document.getElementById('liveTokenStats');
const kpiLastTtft = document.getElementById('kpiLastTtft');
const kpiSessionCost = document.getElementById('kpiSessionCost');

// Noise Simulator Controls
const noiseTruck = document.getElementById('noiseTruck');
const noiseHorn = document.getElementById('noiseHorn');
const noiseDock = document.getElementById('noiseDock');
const noiseVolume = document.getElementById('noiseVolume');
const noiseVolLabel = document.getElementById('noiseVolLabel');
const chkMixNoiseToMic = document.getElementById('chkMixNoiseToMic');

// Settings Elements
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsModal = document.getElementById('settingsModal');
const selectLiveModel = document.getElementById('selectLiveModel');
const inputApiKey = document.getElementById('inputApiKey');
const btnSaveApiKey = document.getElementById('btnSaveApiKey');
const btnResetState = document.getElementById('btnResetState');

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  if (!noiseMixGain) {
    noiseMixGain = audioContext.createGain();
    noiseMixGain.gain.setValueAtTime(1.0, audioContext.currentTime);
    noiseMixGain.connect(audioContext.destination);
  }
  return audioContext;
}

// Initialize WebSocket Connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
    connectionText.textContent = 'Hub Online (Starting Live Session...)';
    // Automatically connect using client override key or server .env key
    ws.send(
      JSON.stringify({
        type: 'START_SESSION',
        apiKey: currentApiKey,
        model: currentModel
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (e) {
      console.error('Non-JSON message received:', e);
    }
  };

  ws.onclose = () => {
    isGeminiLiveActive = false;
    updateScenarioModeHint();
    connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    connectionText.textContent = 'Disconnected (Reconnecting...)';
    setTimeout(connectWebSocket, 2500);
  };
}

function updateScenarioModeHint() {
  if (isGeminiLiveActive) {
    scenarioModeHint.textContent = `Live: ${currentModel}`;
    scenarioModeHint.className = 'text-[10px] text-cyan-400 font-mono';
  } else {
    scenarioModeHint.textContent = 'Offline SQLite Demo Fallback';
    scenarioModeHint.className = 'text-[10px] text-amber-400 font-mono';
  }
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'TMS_STATE_UPDATE':
      renderTMSState(msg.data);
      break;

    case 'GEMINI_CONNECTED':
      isGeminiLiveActive = true;
      currentModel = msg.model || currentModel;
      modelBadge.textContent = currentModel;
      connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse';
      connectionText.textContent = msg.resumed ? 'Gemini 3.8 Live Resumed' : 'Gemini 3.8 Live Active';
      updateScenarioModeHint();
      break;

    case 'GEMINI_DISCONNECTED':
      isGeminiLiveActive = false;
      connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
      connectionText.textContent = 'Demo Mode (Live Disconnected)';
      updateScenarioModeHint();
      break;

    case 'GEMINI_ERROR':
      isGeminiLiveActive = false;
      connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      connectionText.textContent = 'Live Error (Demo Fallback)';
      addLogEntry(`Gemini Live error: ${msg.error}`, 'danger');
      updateScenarioModeHint();
      break;

    case 'TOOL_EXECUTED':
      flashStateMutation(msg.name);
      addLogEntry(`Tool [${msg.name}] committed to SQLite`, 'success');
      break;

    case 'INTERRUPT_ACKNOWLEDGED':
      showBargeInAlert();
      break;

    case 'GEMINI_INTERRUPTED':
      showBargeInAlert();
      finalizeActiveBubble('gemini', ' [Interrupted]');
      activeDriverBubble = null;
      break;

    case 'TRANSCRIPT_EVENT':
      if (msg.ttftMs) {
        updateLatencyHud(msg.ttftMs);
      }
      if (msg.role === 'driver') {
        upsertStreamBubble('driver', msg.text, msg.interim);
      } else {
        upsertStreamBubble('gemini', msg.text, false);
      }
      break;

    case 'GEMINI_AUDIO_CHUNK':
      if (msg.ttftMs) {
        updateLatencyHud(msg.ttftMs);
      }
      playIncomingPcmChunk(msg.data, 24000);
      break;

    case 'GEMINI_TURN_COMPLETE':
      finalizeActiveBubble('driver');
      finalizeActiveBubble('gemini');
      break;

    case 'SYSTEM_NOTICE':
      if (msg.mode === 'demo') {
        isGeminiLiveActive = false;
        connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
        connectionText.textContent = 'Offline SQLite Demo Mode';
        updateScenarioModeHint();
      }
      addLogEntry(msg.message, 'info');
      break;
  }
}

function updateLatencyHud(ms) {
  latencyValue.textContent = `${ms} ms`;
  kpiLastTtft.textContent = `${ms} ms`;
}

// Render SQLite-backed TMS State into DOM
function renderTMSState(state) {
  latestTmsState = state;
  if (!state) return;

  if (persistenceBadge && state.persistenceMode) {
    persistenceBadge.textContent = state.persistenceMode;
  }

  if (ewayBadge) {
    ewayBadge.textContent = `${state.ewayBillNo} • ${state.ewayBillStatus}`;
    ewayBadge.className =
      state.ewayBillStatus === 'VERIFIED_ACTIVE'
        ? 'text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
        : 'text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono';
  }

  if (slotDisplay) {
    slotDisplay.innerHTML = `<i class="fa-solid fa-door-open"></i><span>${escapeHtml(state.allocatedBay)}</span>`;
    slotStatusBadge.textContent = state.currentStatus;
    slotStatusBadge.className = state.allocatedBay.includes('Bay 4')
      ? 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      : 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
  }

  if (tempDisplay) {
    tempDisplay.innerHTML = `<i class="fa-solid fa-temperature-arrow-up"></i><span>+${Number(state.reeferTemp).toFixed(1)} °C</span>`;
    tempStatusBadge.textContent = state.tempStatus;
    tempStatusBadge.className =
      state.reeferTemp > 4.0
        ? 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
        : 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  }

  if (claimDisplay) {
    claimDisplay.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i><span>₹ ${Number(state.totalClaimAmount).toLocaleString('en-IN')}</span>`;
    if (state.totalClaimAmount > 0) {
      detentionStatusBadge.textContent = `${state.detentionHours} HRS BILLED • CLAIM FILED`;
      detentionStatusBadge.className =
        'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold';
    } else {
      detentionStatusBadge.textContent = `RATE: ₹${state.detentionRatePerHour}/HR`;
      detentionStatusBadge.className = 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400';
    }
  }

  if (state.incidentCards && state.incidentCards.length > 0) {
    const card = state.incidentCards[0];
    bonusCardId.textContent = `INCIDENT-CARD #${card.id}`;
    bonusUrgency.textContent = card.urgency || 'HIGH';
    bonusUrgency.className = 'text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold';
    bonusSummary.textContent = `"${card.summary}"`;
    bonusLang.textContent = card.language;
    bonusTimestamp.textContent = card.timestamp;
  } else {
    bonusCardId.textContent = 'NO CARD GENERATED YET';
    bonusUrgency.textContent = 'STANDBY';
    bonusUrgency.className = 'text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold';
    bonusSummary.textContent = 'Ask ChalaakSaathi for a WhatsApp incident summary or run Scenario 5 to generate a live signed POD card.';
    bonusLang.textContent = 'Auto-detected';
    bonusTimestamp.textContent = '--';
  }

  if (state.telemetry) {
    const tokens = state.telemetry.totalTokens || 0;
    const turns = state.telemetry.totalTurns || 0;
    liveTokenStats.textContent = `Session: ${tokens.toLocaleString('en-IN')} tokens (${turns} events)`;
    if (tokens > 0) {
      // Approximate blended audio/text token cost at scale in INR
      const estInr = Math.max(0.01, (tokens / 1000) * 0.25);
      kpiSessionCost.textContent = `₹${estInr.toFixed(2)}`;
    } else {
      kpiSessionCost.textContent = '~₹0.18';
    }
  }

  renderLogs(state.logs || []);
}

function renderLogs(logs) {
  if (!logsFeed) return;
  logsFeed.innerHTML = logs
    .map((l) => {
      let colorClass = 'text-slate-300';
      let icon = 'fa-circle-info';
      if (l.type === 'success') { colorClass = 'text-emerald-400'; icon = 'fa-circle-check'; }
      if (l.type === 'danger') { colorClass = 'text-rose-400'; icon = 'fa-triangle-exclamation'; }
      if (l.type === 'warning') { colorClass = 'text-amber-400'; icon = 'fa-clock'; }
      if (l.type === 'bonus') { colorClass = 'text-indigo-400'; icon = 'fa-star'; }
      return `<div class="flex items-start gap-2 py-1 border-b border-slate-950">
        <span class="text-slate-500 text-[10px] whitespace-nowrap">${escapeHtml(l.timestamp)}</span>
        <i class="fa-solid ${icon} ${colorClass} mt-0.5 text-[10px]"></i>
        <span class="${colorClass}">${escapeHtml(l.message)}</span>
      </div>`;
    })
    .join('');
}

function addLogEntry(msg, type = 'info') {
  if (!logsFeed) return;
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'flex items-start gap-2 py-1 border-b border-slate-950';
  const color = type === 'danger' ? 'text-rose-400' : type === 'success' ? 'text-emerald-400' : 'text-cyan-400';
  row.innerHTML = `<span class="text-slate-500 text-[10px] whitespace-nowrap">${time}</span>
    <span class="${color} text-xs">${escapeHtml(msg)}</span>`;
  logsFeed.prepend(row);
}

function flashStateMutation(toolName = '') {
  if (toolName.includes('dock') || toolName.includes('slot')) {
    slotCard.classList.add('highlight-mutate');
    setTimeout(() => slotCard.classList.remove('highlight-mutate'), 1800);
  } else if (toolName.includes('temperature') || toolName.includes('excursion')) {
    tempCard.classList.add('highlight-mutate');
    setTimeout(() => tempCard.classList.remove('highlight-mutate'), 1800);
  } else if (toolName.includes('detention') || toolName.includes('demurrage')) {
    detentionCard.classList.add('highlight-mutate');
    setTimeout(() => detentionCard.classList.remove('highlight-mutate'), 1800);
  } else if (toolName.includes('incident_card')) {
    bonusCardContainer.classList.add('highlight-mutate');
    setTimeout(() => bonusCardContainer.classList.remove('highlight-mutate'), 1800);
  }
}

// ==========================================
// 24kHz PCM PLAYBACK QUEUE & BARGE-IN FLUSH
// ==========================================
function playIncomingPcmChunk(base64Data, sampleRate = 24000) {
  const ctx = ensureAudioContext();
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const currentTime = ctx.currentTime;
  if (nextPlayTime < currentTime) {
    nextPlayTime = currentTime + 0.03;
  }

  source.start(nextPlayTime);
  nextPlayTime += audioBuffer.duration;
  audioPlaybackQueue.push(source);
  isGeminiSpeaking = true;

  source.onended = () => {
    const idx = audioPlaybackQueue.indexOf(source);
    if (idx !== -1) audioPlaybackQueue.splice(idx, 1);
    if (audioPlaybackQueue.length === 0) {
      isGeminiSpeaking = false;
    }
  };
}

function flushAudioQueue() {
  for (const source of audioPlaybackQueue) {
    try {
      source.stop();
    } catch {}
  }
  audioPlaybackQueue = [];
  nextPlayTime = 0;
  isGeminiSpeaking = false;
}

function showBargeInAlert() {
  bargeInBadge.classList.remove('hidden');
  flushAudioQueue();
  setTimeout(() => bargeInBadge.classList.add('hidden'), 2200);
}

// ==========================================
// 16kHz PCM AUDIO CAPTURE (AudioWorklet + Fallback)
// ==========================================
function downsampleTo16k(input, inputRate) {
  if (inputRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputRate / 16000;
  const outLength = Math.floor(input.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
    }
    const avg = end > start ? sum / (end - start) : input[start] || 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

function int16BufferToBase64(arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function handleCapturedPcmFrame(pcm16Buffer, cleanRms, previewSamples) {
  const speechActive = cleanRms > 0.02;

  // Echo-aware multi-frame barge-in check (avoids accidental click false-triggers)
  if (isGeminiSpeaking && cleanRms > 0.055) {
    consecutiveBargeInFrames++;
    if (consecutiveBargeInFrames >= 3) {
      consecutiveBargeInFrames = 0;
      showBargeInAlert();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'INTERRUPT_SIGNAL' }));
      }
    }
  } else {
    consecutiveBargeInFrames = 0;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'AUDIO_CHUNK',
        data: int16BufferToBase64(pcm16Buffer),
        speechActive
      })
    );
  }

  if (previewSamples) {
    drawWaveform(previewSamples);
  }
}

async function startAudioCapture() {
  try {
    const ctx = ensureAudioContext();
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: false // Let Gemini 3.8 Live handle noisy yard resilience
      }
    });

    audioInputNode = ctx.createMediaStreamSource(mediaStream);
    silentSinkGain = ctx.createGain();
    silentSinkGain.gain.setValueAtTime(0, ctx.currentTime);
    silentSinkGain.connect(ctx.destination);

    if (ctx.audioWorklet) {
      if (!workletLoaded) {
        await ctx.audioWorklet.addModule('/pcm-capture-worklet.js');
        workletLoaded = true;
      }
      workletNode = new AudioWorkletNode(ctx, 'pcm-16k-capture-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      workletNode.port.onmessage = (event) => {
        if (!isRecording) return;
        const { pcm16Buffer, cleanRms, preview } = event.data;
        handleCapturedPcmFrame(pcm16Buffer, cleanRms, preview);
      };

      audioInputNode.connect(workletNode, 0, 0);
      if (chkMixNoiseToMic.checked && noiseMixGain) {
        noiseMixGain.connect(workletNode, 0, 1);
      }
      workletNode.connect(silentSinkGain);
      captureModeLabel.textContent = `AudioWorklet ${ctx.sampleRate}Hz → 16kHz PCM`;
    } else {
      const bufferSize = 2048;
      scriptProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        if (!isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        let sq = 0;
        for (let i = 0; i < inputData.length; i++) sq += inputData[i] * inputData[i];
        const rms = Math.sqrt(sq / inputData.length);
        const int16 = downsampleTo16k(inputData, ctx.sampleRate);
        handleCapturedPcmFrame(int16.buffer, rms, inputData);
      };
      audioInputNode.connect(scriptProcessor);
      scriptProcessor.connect(silentSinkGain);
      captureModeLabel.textContent = `Resampled ${ctx.sampleRate}Hz → 16kHz PCM`;
    }

    isRecording = true;
    updateMicUI(true);
    voiceStatusHint.textContent = isGeminiLiveActive
      ? 'Streaming live 16kHz PCM audio to Gemini 3.8 Live...'
      : 'Mic active (add API key in Settings for live Gemini 3.8 audio)';
  } catch (err) {
    console.error('Audio capture error:', err);
    voiceStatusHint.textContent = 'Mic access denied or error: ' + err.message;
  }
}

function stopAudioCapture() {
  isRecording = false;
  if (workletNode) {
    try {
      if (noiseMixGain) noiseMixGain.disconnect(workletNode);
    } catch {}
    workletNode.disconnect();
    workletNode = null;
  }
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (audioInputNode) {
    audioInputNode.disconnect();
    audioInputNode = null;
  }
  if (silentSinkGain) {
    silentSinkGain.disconnect();
    silentSinkGain = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'AUDIO_STREAM_END' }));
  }
  updateMicUI(false);
  voiceStatusHint.textContent = 'Click microphone for live 16kHz PCM audio to Gemini 3.8 Live';
}

chkMixNoiseToMic.addEventListener('change', () => {
  if (!workletNode || !noiseMixGain) return;
  try {
    if (chkMixNoiseToMic.checked) {
      noiseMixGain.connect(workletNode, 0, 1);
    } else {
      noiseMixGain.disconnect(workletNode);
    }
  } catch {}
});

function updateMicUI(active) {
  if (active) {
    micButtonCircle.className =
      'relative w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-2xl shadow-xl shadow-rose-600/50 transition-all';
    micIcon.className = 'fa-solid fa-stop text-white';
    micPulseRing.className = 'absolute -inset-3 rounded-full bg-rose-500/30 blur-md animate-ping';
  } else {
    micButtonCircle.className =
      'relative w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-cyan-600/40 transition-all';
    micIcon.className = 'fa-solid fa-microphone text-white';
    micPulseRing.className = 'absolute -inset-2 rounded-full bg-cyan-500/20 blur-md';
  }
}

btnStartVoice.addEventListener('click', () => {
  if (isRecording) stopAudioCapture();
  else void startAudioCapture();
});

// Canvas Audio Waveform Visualizer
function drawWaveform(data) {
  canvasCtx.fillStyle = 'rgba(2, 6, 23, 0.45)';
  canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = isGeminiSpeaking ? '#a855f7' : '#06b6d4';
  canvasCtx.beginPath();

  const step = Math.max(1, Math.floor(data.length / 64));
  const sliceWidth = visualizerCanvas.width / Math.ceil(data.length / step);
  let x = 0;
  for (let i = 0; i < data.length; i += step) {
    const v = data[i] * 50;
    const y = visualizerCanvas.height / 2 + v;
    if (i === 0) canvasCtx.moveTo(x, y);
    else canvasCtx.lineTo(x, y);
    x += sliceWidth;
  }
  canvasCtx.stroke();
}

// ==========================================
// STREAMING BILINGUAL TRANSCRIPT BUBBLES
// ==========================================
function createTranscriptBubble(speaker, text, role) {
  turnCount++;
  turnCounter.textContent = `${turnCount} Turns`;

  if (turnCount === 1 && transcriptBox.firstElementChild?.classList.contains('italic')) {
    transcriptBox.innerHTML = '';
  }

  const bubble = document.createElement('div');
  const isDriver = role === 'driver';
  const isSystem = role === 'system';

  bubble.className = `p-3 rounded-xl border ${
    isDriver
      ? 'bg-slate-950/90 border-cyan-500/30 ml-4'
      : isSystem
      ? 'bg-slate-950 border-slate-700'
      : 'bg-slate-900 border-slate-800 mr-4'
  } space-y-1`;

  const speakerColor = isDriver ? 'text-cyan-400' : isSystem ? 'text-emerald-400' : 'text-blue-400';
  const speakerIcon = isDriver ? 'fa-user' : isSystem ? 'fa-circle-info' : 'fa-brain';

  bubble.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-bold ${speakerColor} flex items-center gap-1.5">
        <i class="fa-solid ${speakerIcon}"></i>
        <span>${escapeHtml(speaker)}</span>
      </span>
      <span class="text-[10px] text-slate-500">${new Date().toLocaleTimeString()}</span>
    </div>
    <p class="transcript-body text-slate-200 text-xs leading-relaxed">${escapeHtml(text)}</p>
  `;
  transcriptBox.appendChild(bubble);
  transcriptBox.scrollTop = transcriptBox.scrollHeight;
  return bubble;
}

function appendTranscript(speaker, text, role = 'driver') {
  return createTranscriptBubble(speaker, text, role);
}

function upsertStreamBubble(role, chunkText, isInterim) {
  if (!chunkText) return;
  const activeRef = role === 'driver' ? activeDriverBubble : activeGeminiBubble;
  if (!activeRef) {
    const label = role === 'driver' ? 'Driver (Live Speech)' : currentModel;
    const el = createTranscriptBubble(label, chunkText, role);
    if (role === 'driver') {
      activeDriverBubble = { el, text: chunkText, interim: isInterim };
    } else {
      activeGeminiBubble = { el, text: chunkText, interim: false };
    }
    return;
  }

  if (isInterim) {
    activeRef.el.querySelector('.transcript-body').textContent = chunkText;
  } else {
    activeRef.text = activeRef.interim ? chunkText : `${activeRef.text}${chunkText}`;
    activeRef.interim = false;
    activeRef.el.querySelector('.transcript-body').textContent = activeRef.text;
  }
  transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

function finalizeActiveBubble(role, suffix = '') {
  const ref = role === 'driver' ? activeDriverBubble : activeGeminiBubble;
  if (ref && suffix) {
    const body = ref.el.querySelector('.transcript-body');
    body.textContent = `${body.textContent}${suffix}`;
  }
  if (role === 'driver') activeDriverBubble = null;
  else activeGeminiBubble = null;
}

// ==========================================
// REAL-WORLD ACOUSTIC NOISE SYNTHESIZER
// ==========================================
const activeNoiseSources = {
  truck: null,
  horn: null,
  dock: null
};

function toggleTruckNoise() {
  const ctx = ensureAudioContext();
  if (activeNoiseSources.truck) {
    activeNoiseSources.truck.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    setTimeout(() => {
      try { activeNoiseSources.truck?.osc.stop(); } catch {}
      activeNoiseSources.truck = null;
      noiseTruck.classList.remove('active');
    }, 300);
    return;
  }

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(45, ctx.currentTime);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(140, ctx.currentTime);

  const vol = (parseInt(noiseVolume.value, 10) / 100) * 0.35;
  gain.gain.setValueAtTime(Math.max(0.001, vol), ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(noiseMixGain);

  osc.start();
  activeNoiseSources.truck = { osc, gain };
  noiseTruck.classList.add('active');
}

function triggerAirHorn() {
  const ctx = ensureAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(370, ctx.currentTime);
  osc2.frequency.setValueAtTime(440, ctx.currentTime);

  const vol = (parseInt(noiseVolume.value, 10) / 100) * 0.45;
  gain.gain.setValueAtTime(Math.max(0.001, vol), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(noiseMixGain);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 1.2);
  osc2.stop(ctx.currentTime + 1.2);

  noiseHorn.classList.add('active');
  setTimeout(() => noiseHorn.classList.remove('active'), 1200);
}

function toggleDockNoise() {
  const ctx = ensureAudioContext();
  if (activeNoiseSources.dock) {
    activeNoiseSources.dock.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    setTimeout(() => {
      try { activeNoiseSources.dock?.src.stop(); } catch {}
      activeNoiseSources.dock = null;
      noiseDock.classList.remove('active');
    }, 300);
    return;
  }

  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.Q.setValueAtTime(2.0, ctx.currentTime);

  const gain = ctx.createGain();
  const vol = (parseInt(noiseVolume.value, 10) / 100) * 0.22;
  gain.gain.setValueAtTime(Math.max(0.001, vol), ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(noiseMixGain);

  whiteNoise.start();
  activeNoiseSources.dock = { src: whiteNoise, gain };
  noiseDock.classList.add('active');
}

noiseTruck.addEventListener('click', toggleTruckNoise);
noiseHorn.addEventListener('click', triggerAirHorn);
noiseDock.addEventListener('click', toggleDockNoise);
noiseVolume.addEventListener('input', (e) => {
  noiseVolLabel.textContent = `${e.target.value}%`;
  const vol = parseInt(e.target.value, 10) / 100;
  if (activeNoiseSources.truck && audioContext) {
    activeNoiseSources.truck.gain.gain.setValueAtTime(Math.max(0.001, vol * 0.35), audioContext.currentTime);
  }
  if (activeNoiseSources.dock && audioContext) {
    activeNoiseSources.dock.gain.gain.setValueAtTime(Math.max(0.001, vol * 0.22), audioContext.currentTime);
  }
});

// ==========================================
// TEST SCENARIOS (Live Gemini 3.8 OR Offline Demo Fallback)
// ==========================================
function runOfflineDemoScenario(action, lang) {
  const t0 = performance.now();
  const actions = {
    arrival: () => {
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'verify_eway_bill', args: { eway_bill_number: '408' } }));
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'log_reefer_temperature_excursion', args: { current_temp: 5.4, status: 'CRITICAL_EXCURSION' } }));
      return 'Sat Sri Akal Gurpreet ji! E-way bill 408 verify ho gaya hai, aur 5.4°C reefer temperature excursion SQLite audit mein log kar diya hai. [Demo Mode]';
    },
    bargein: () => {
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'update_tms_dock_slot', args: { gate_number: 'Gate 2 - Bay 4', reason: 'Driver interrupted: Bay 2 chiller failure' } }));
      return 'Haanji Gurpreet ji, maine turant note kar liya! Bay 2 se shift karke Gate 2 - Bay 4 assign kar diya hai. [Demo Mode]';
    },
    tanglish: () => {
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'verify_eway_bill', args: { eway_bill_number: '409' } }));
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'log_reefer_temperature_excursion', args: { current_temp: 5.8, status: 'CRITICAL_EXCURSION' } }));
      return 'Vanakkam Anna! E-way bill 409 verify panniten, 5.8°C reefer excursion alert Pharma QA-kku anuppitten. [Demo Mode]';
    },
    detention: () => {
      ws.send(JSON.stringify({ type: 'TRIGGER_MOCK_TOOL', tool: 'file_detention_demurrage_claim', args: { warehouse_name: 'Sonipat Cold Hub', detention_hours: 2.0 } }));
      return 'Samajh gaya Gurpreet ji. Sonipat Cold Hub par ₹2,200/hr ke hisaab se 2 ghante ka ₹4,400 detention claim file kar diya hai. [Demo Mode]';
    },
    card: () => {
      ws.send(JSON.stringify({
        type: 'TRIGGER_MOCK_TOOL',
        tool: 'generate_shareable_voice_incident_card',
        args: {
          summary: 'EWB-408 verified; 5.4°C reefer excursion logged; shifted to Bay 4 with ₹4,400 detention claim.',
          vernacular_language: lang,
          urgency: 'HIGH'
        }
      }));
      return 'Bilingual Voice Incident Card SQLite mein save ho gaya hai aur WhatsApp dispatch ke liye ready hai. [Demo Mode]';
    }
  };

  setTimeout(() => {
    const reply = (actions[action] || actions.arrival)();
    lastDemoLatency = Math.round(performance.now() - t0);
    updateLatencyHud(lastDemoLatency);
    appendTranscript('Demo Fallback (Offline)', reply, 'gemini');
  }, 150);
}

document.querySelectorAll('.test-scenario-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-text');
    const lang = btn.getAttribute('data-lang');
    const action = btn.getAttribute('data-action');
    const isInterruption = action === 'bargein';

    ensureAudioContext();
    finalizeActiveBubble('driver');
    finalizeActiveBubble('gemini');
    appendTranscript(`Driver (${lang})`, text, 'driver');

    if (isInterruption) {
      showBargeInAlert();
    }

    if (isGeminiLiveActive && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'TEXT_INPUT',
          text,
          interrupt: isInterruption
        })
      );
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      runOfflineDemoScenario(action, lang);
    }
  });
});

// Reset SQLite State Handler
btnResetState.addEventListener('click', async () => {
  try {
    flushAudioQueue();
    await fetch('/api/reset', { method: 'POST' });
    appendTranscript('System', 'SQLite ledger reset to initial gate arrival state.', 'system');
  } catch (e) {
    console.error('Reset error:', e);
  }
});

// Settings Modal Handlers
btnSettings.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  inputApiKey.value = currentApiKey;
  selectLiveModel.value = currentModel;
});
btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});
btnSaveApiKey.addEventListener('click', () => {
  currentApiKey = inputApiKey.value.trim();
  currentModel = selectLiveModel.value;
  localStorage.setItem('chalaaksaathi_gemini_key', currentApiKey);
  localStorage.setItem('chalaaksaathi_live_model', currentModel);
  settingsModal.classList.add('hidden');

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'START_SESSION',
        apiKey: currentApiKey,
        model: currentModel
      })
    );
  }
  addLogEntry(`Reconnecting Gemini Live session (${currentModel})...`, 'info');
});

// Bonus Actions (grounded in live SQLite state)
window.shareWhatsApp = function () {
  const s = latestTmsState || {};
  const card = s.incidentCards?.[0];
  const shareUrl = card?.shareUrl || 'https://chalaaksaathi.in/incident/LIVE';
  const text = encodeURIComponent(
    `🚚 *ChalaakSaathi Voice Incident POD*\nTruck: ${s.truckId || 'HR-55-AJ-9021'}\nDriver: ${s.driverName || 'Gurpreet Singh'}\ne-Way Bill: ${s.ewayBillNo || 'EWB-408'} (${s.ewayBillStatus || 'ACTIVE'})\nBay: ${s.allocatedBay || 'Gate 2 - Bay 2'} | Temp: +${Number(s.reeferTemp || 5.4).toFixed(1)}°C\nDetention Claim: ₹${Number(s.totalClaimAmount || 0).toLocaleString('en-IN')}\nPOD Link: ${shareUrl}`
  );
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

window.playIncidentAudio = function () {
  const s = latestTmsState || {};
  const card = s.incidentCards?.[0];
  const summaryText =
    card?.summary ||
    `Driver ${s.driverName || 'Gurpreet Singh'} on truck ${s.truckId || 'HR-55-AJ-9021'}. Bay assigned ${s.allocatedBay || 'Gate 2 - Bay 2'}, reefer temperature ${Number(s.reeferTemp || 5.4).toFixed(1)} degrees Celsius, detention claim ${s.totalClaimAmount || 0} rupees.`;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summaryText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start WebSocket on Load
connectWebSocket();
