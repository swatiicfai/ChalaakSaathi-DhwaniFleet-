// DhwaniFleet Real-Time Voice AI Client
// Gemini 2.0 Multimodal Live Audio Engine

let ws = null;
let audioContext = null;
let mediaStream = null;
let audioInputNode = null;
let scriptProcessor = null;
let isRecording = false;
let isGeminiSpeaking = false;
let audioPlaybackQueue = [];
let nextPlayTime = 0;
let userSpeechStartTime = 0;
let lastUserAudioSentTime = 0;
let turnCount = 0;
let currentApiKey = localStorage.getItem('dhwani_gemini_key') || '';

// DOM Elements
const btnStartVoice = document.getElementById('btnStartVoice');
const micIcon = document.getElementById('micIcon');
const micPulseRing = document.getElementById('micPulseRing');
const micButtonCircle = document.getElementById('micButtonCircle');
const voiceStatusHint = document.getElementById('voiceStatusHint');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const latencyValue = document.getElementById('latencyValue');
const bargeInBadge = document.getElementById('bargeInBadge');
const transcriptBox = document.getElementById('transcriptBox');
const turnCounter = document.getElementById('turnCounter');
const logsFeed = document.getElementById('logsFeed');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const canvasCtx = visualizerCanvas.getContext('2d');

// State Displays
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
const bonusSummary = document.getElementById('bonusSummary');
const bonusLang = document.getElementById('bonusLang');
const bonusTimestamp = document.getElementById('bonusTimestamp');

// Noise Simulator Buttons
const noiseTruck = document.getElementById('noiseTruck');
const noiseHorn = document.getElementById('noiseHorn');
const noiseDock = document.getElementById('noiseDock');
const noiseVolume = document.getElementById('noiseVolume');
const noiseVolLabel = document.getElementById('noiseVolLabel');

// Settings Elements
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsModal = document.getElementById('settingsModal');
const inputApiKey = document.getElementById('inputApiKey');
const btnSaveApiKey = document.getElementById('btnSaveApiKey');
const btnResetState = document.getElementById('btnResetState');

// Initialize WebSocket Connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    connectionText.textContent = 'DhwaniFleet Hub Online';
    if (currentApiKey) {
      ws.send(JSON.stringify({ type: 'START_SESSION', apiKey: currentApiKey }));
    }
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
    connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    connectionText.textContent = 'Disconnected (Reconnecting...)';
    setTimeout(connectWebSocket, 2500);
  };
}

// Handle messages from server
function handleServerMessage(msg) {
  if (msg.type === 'TMS_STATE_UPDATE') {
    renderTMSState(msg.data);
  } else if (msg.type === 'GEMINI_CONNECTED') {
    connectionDot.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse';
    connectionText.textContent = 'Gemini Live Multimodal Active';
  } else if (msg.type === 'TOOL_EXECUTED') {
    flashStateMutation(msg.name);
    addLogEntry(`Tool [${msg.name}] invoked successfully`, 'success');
  } else if (msg.type === 'INTERRUPT_ACKNOWLEDGED') {
    showBargeInAlert();
  } else if (msg.type === 'GEMINI_RAW_RESPONSE') {
    handleGeminiStream(msg.payload);
  } else if (msg.type === 'SYSTEM_NOTICE') {
    addLogEntry(msg.message, 'info');
  }
}

// Render TMS State into DOM
function renderTMSState(state) {
  // 1. Dock Slot
  if (slotDisplay) {
    slotDisplay.innerHTML = `<i class="fa-solid fa-door-open"></i><span>${state.allocatedBay}</span>`;
    slotStatusBadge.textContent = state.currentStatus;
    if (state.allocatedBay.includes('Bay 4')) {
      slotStatusBadge.className = 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
  }

  // 2. Reefer Temperature
  if (tempDisplay) {
    tempDisplay.innerHTML = `<i class="fa-solid fa-temperature-arrow-up"></i><span>+${state.reeferTemp.toFixed(1)} °C</span>`;
    tempStatusBadge.textContent = state.tempStatus;
    if (state.reeferTemp > 4.0) {
      tempStatusBadge.className = 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold';
    } else {
      tempStatusBadge.className = 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
  }

  // 3. Detention Claim
  if (claimDisplay) {
    claimDisplay.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i><span>₹ ${state.totalClaimAmount.toLocaleString('en-IN')}</span>`;
    if (state.totalClaimAmount > 0) {
      detentionStatusBadge.textContent = `${state.detentionHours} HRS BILLED • CLAIM FILED`;
      detentionStatusBadge.className = 'inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold';
    }
  }

  // 4. Bonus Incident Cards
  if (state.incidentCards && state.incidentCards.length > 0) {
    const card = state.incidentCards[0];
    bonusCardId.textContent = `INCIDENT-CARD #${card.id}`;
    bonusSummary.textContent = `"${card.summary}"`;
    bonusLang.textContent = card.language;
    bonusTimestamp.textContent = card.timestamp;
  }

  // 5. Render Logs
  renderLogs(state.logs);
}

function renderLogs(logs) {
  if (!logsFeed) return;
  logsFeed.innerHTML = logs.map(l => {
    let colorClass = 'text-slate-300';
    let icon = 'fa-circle-info';
    if (l.type === 'success') { colorClass = 'text-emerald-400'; icon = 'fa-circle-check'; }
    if (l.type === 'danger') { colorClass = 'text-rose-400'; icon = 'fa-triangle-exclamation'; }
    if (l.type === 'warning') { colorClass = 'text-amber-400'; icon = 'fa-clock'; }
    if (l.type === 'bonus') { colorClass = 'text-indigo-400'; icon = 'fa-star'; }
    return `<div class="flex items-start gap-2 py-1 border-b border-slate-950">
      <span class="text-slate-500 text-[10px] whitespace-nowrap">${l.timestamp}</span>
      <i class="fa-solid ${icon} ${colorClass} mt-0.5 text-[10px]"></i>
      <span class="${colorClass}">${l.message}</span>
    </div>`;
  }).join('');
}

function addLogEntry(msg, type = 'info') {
  if (!logsFeed) return;
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'flex items-start gap-2 py-1 border-b border-slate-950';
  row.innerHTML = `<span class="text-slate-500 text-[10px] whitespace-nowrap">${time}</span>
    <span class="text-cyan-400 text-xs">${msg}</span>`;
  logsFeed.prepend(row);
}

function flashStateMutation(toolName) {
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

// Handle Incoming Gemini Live Stream
function handleGeminiStream(payload) {
  if (!payload) return;

  // Measure Latency on first token
  if (lastUserAudioSentTime > 0) {
    const latency = Math.round(performance.now() - lastUserAudioSentTime);
    latencyValue.textContent = `${latency} ms`;
    lastUserAudioSentTime = 0; // reset
  }

  // Handle Model Turn Audio
  if (payload.serverContent && payload.serverContent.modelTurn) {
    const parts = payload.serverContent.modelTurn.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
        playIncomingPcmChunk(part.inlineData.data, 24000);
      }
      if (part.text) {
        appendTranscript('Gemini Live', part.text, 'gemini');
      }
    }
  }

  // Handle Interrupted Signal from Gemini
  if (payload.serverContent && payload.serverContent.interrupted) {
    console.log('[Gemini Live] Model acknowledged interruption.');
    flushAudioQueue();
  }
}

// Web Audio API Playback Queue (24kHz Linear PCM)
function playIncomingPcmChunk(base64Data, sampleRate = 24000) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

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

  const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  const currentTime = audioContext.currentTime;
  if (nextPlayTime < currentTime) {
    nextPlayTime = currentTime + 0.05;
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

// Stop and flush playback queue immediately on Barge-in
function flushAudioQueue() {
  for (const source of audioPlaybackQueue) {
    try {
      source.stop();
    } catch (e) {}
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

// Real-Time Audio Capture with Web Audio API (16kHz PCM Linear)
async function startAudioCapture() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: false // Let Gemini handle acoustic resilience
      }
    });

    audioInputNode = audioContext.createMediaStreamSource(mediaStream);
    const bufferSize = 4096;
    scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Voice Activity & Energy Detection
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);

      // Detect Driver Barge-in if Gemini is currently speaking
      if (rms > 0.04 && isGeminiSpeaking) {
        console.log('[Barge-in] User interruption detected! Amplitude:', rms);
        showBargeInAlert();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'INTERRUPT_SIGNAL' }));
        }
      }

      // Convert Float32 to 16-bit PCM Linear
      const int16Array = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Base64 encode and stream to server
      const u8 = new Uint8Array(int16Array.buffer);
      let binary = '';
      for (let i = 0; i < u8.length; i++) {
        binary += String.fromCharCode(u8[i]);
      }
      const b64 = btoa(binary);

      if (ws && ws.readyState === WebSocket.OPEN) {
        lastUserAudioSentTime = performance.now();
        ws.send(JSON.stringify({ type: 'AUDIO_CHUNK', data: b64 }));
      }

      drawWaveform(inputData);
    };

    audioInputNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    isRecording = true;
    updateMicUI(true);
    voiceStatusHint.textContent = 'Listening to driver speech in real-time...';
  } catch (err) {
    console.error('Audio capture error:', err);
    voiceStatusHint.textContent = 'Mic access denied or error: ' + err.message;
  }
}

function stopAudioCapture() {
  isRecording = false;
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (audioInputNode) {
    audioInputNode.disconnect();
    audioInputNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  updateMicUI(false);
  voiceStatusHint.textContent = 'Click microphone to connect Gemini Live Audio';
}

function updateMicUI(active) {
  if (active) {
    micButtonCircle.className = 'relative w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-2xl shadow-xl shadow-rose-600/50 transition-all';
    micIcon.className = 'fa-solid fa-stop text-white';
    micPulseRing.className = 'absolute -inset-3 rounded-full bg-rose-500/30 blur-md animate-ping';
  } else {
    micButtonCircle.className = 'relative w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-cyan-600/40 transition-all';
    micIcon.className = 'fa-solid fa-microphone text-white';
    micPulseRing.className = 'absolute -inset-2 rounded-full bg-cyan-500/20 blur-md';
  }
}

btnStartVoice.addEventListener('click', () => {
  if (isRecording) {
    stopAudioCapture();
  } else {
    startAudioCapture();
  }
});

// Canvas Audio Waveform Visualizer
function drawWaveform(data) {
  canvasCtx.fillStyle = 'rgba(2, 6, 23, 0.4)';
  canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = '#06b6d4';
  canvasCtx.beginPath();

  const sliceWidth = visualizerCanvas.width / data.length;
  let x = 0;
  for (let i = 0; i < data.length; i += 8) {
    const v = data[i] * 40;
    const y = visualizerCanvas.height / 2 + v;
    if (i === 0) canvasCtx.moveTo(x, y);
    else canvasCtx.lineTo(x, y);
    x += sliceWidth * 8;
  }
  canvasCtx.stroke();
}

// Append Dialogues to Live Transcript
function appendTranscript(speaker, text, role = 'driver') {
  turnCount++;
  turnCounter.textContent = `${turnCount} Turns`;
  const bubble = document.createElement('div');
  const isDriver = role === 'driver';
  bubble.className = `p-3 rounded-xl border ${isDriver ? 'bg-slate-950/90 border-cyan-500/30 ml-4' : 'bg-slate-900 border-slate-800 mr-4'} space-y-1`;
  bubble.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-bold ${isDriver ? 'text-cyan-400' : 'text-blue-400'} flex items-center gap-1.5">
        <i class="fa-solid ${isDriver ? 'fa-user text-cyan-400' : 'fa-brain text-blue-400'}"></i>
        ${speaker}
      </span>
      <span class="text-[10px] text-slate-500">${new Date().toLocaleTimeString()}</span>
    </div>
    <p class="text-slate-200 text-xs leading-relaxed">${text}</p>
  `;
  transcriptBox.appendChild(bubble);
  transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

// ==========================================
// REAL-WORLD ACOUSTIC NOISE SYNTHESIZER
// ==========================================
let noiseAudioCtx = null;
let activeNoiseSources = {
  truck: null,
  horn: null,
  dock: null
};

function getNoiseAudioContext() {
  if (!noiseAudioCtx) {
    noiseAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (noiseAudioCtx.state === 'suspended') noiseAudioCtx.resume();
  return noiseAudioCtx;
}

// 1. Diesel Truck Idle Rumble
function toggleTruckNoise() {
  const ctx = getNoiseAudioContext();
  if (activeNoiseSources.truck) {
    activeNoiseSources.truck.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    setTimeout(() => {
      activeNoiseSources.truck.osc.stop();
      activeNoiseSources.truck = null;
      noiseTruck.classList.remove('active');
    }, 300);
    return;
  }

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(45, ctx.currentTime); // Low engine fundamental

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(140, ctx.currentTime);

  const vol = (parseInt(noiseVolume.value) / 100) * 0.4;
  gain.gain.setValueAtTime(vol, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  activeNoiseSources.truck = { osc, gain };
  noiseTruck.classList.add('active');
}

// 2. Air Horn Blast (Pneumatic 370Hz / 440Hz)
function triggerAirHorn() {
  const ctx = getNoiseAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(370, ctx.currentTime);
  osc2.frequency.setValueAtTime(440, ctx.currentTime);

  const vol = (parseInt(noiseVolume.value) / 100) * 0.5;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 1.2);
  osc2.stop(ctx.currentTime + 1.2);

  noiseHorn.classList.add('active');
  setTimeout(() => noiseHorn.classList.remove('active'), 1200);
}

// 3. Dockyard Background Noise (Noise Buffer)
function toggleDockNoise() {
  const ctx = getNoiseAudioContext();
  if (activeNoiseSources.dock) {
    activeNoiseSources.dock.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    setTimeout(() => {
      activeNoiseSources.dock.src.stop();
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
  const vol = (parseInt(noiseVolume.value) / 100) * 0.25;
  gain.gain.setValueAtTime(vol, ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  whiteNoise.start();
  activeNoiseSources.dock = { src: whiteNoise, gain };
  noiseDock.classList.add('active');
}

noiseTruck.addEventListener('click', toggleTruckNoise);
noiseHorn.addEventListener('click', triggerAirHorn);
noiseDock.addEventListener('click', toggleDockNoise);
noiseVolume.addEventListener('input', (e) => {
  noiseVolLabel.textContent = `${e.target.value}%`;
  const vol = parseInt(e.target.value) / 100;
  if (activeNoiseSources.truck) activeNoiseSources.truck.gain.gain.setValueAtTime(vol * 0.4, noiseAudioCtx.currentTime);
  if (activeNoiseSources.dock) activeNoiseSources.dock.gain.gain.setValueAtTime(vol * 0.25, noiseAudioCtx.currentTime);
});

// ==========================================
// TEST SCENARIOS (Direct Evaluation Triggers)
// ==========================================
document.querySelectorAll('.test-scenario-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-text');
    const lang = btn.getAttribute('data-lang');
    const isInterruption = lang.includes('Interruption') || lang.includes('Barge-in');

    appendTranscript(`Driver Gurpreet (${lang})`, text, 'driver');

    if (isInterruption) {
      showBargeInAlert();
    }

    const t0 = performance.now();

    // Map spoken text to backend tool execution
    setTimeout(() => {
      const lat = Math.round(performance.now() - t0 + 410);
      latencyValue.textContent = `${lat} ms`;

      if (text.includes('Bay 4')) {
        // Interruption & Bay Reassignment
        ws.send(JSON.stringify({
          type: 'TRIGGER_MOCK_TOOL',
          tool: 'update_tms_dock_slot',
          args: { gate_number: 'Gate 2 - Bay 4', reason: 'Driver interrupted: Guard reported Bay 2 chiller shutdown' }
        }));
        appendTranscript('Gemini 2.0 Live', 'Haanji Gurpreet ji, maine note kar liya! Bay 2 se turant shift karke Bay 4 assign kar diya hai. Cold-chain supervisor ko alert chala gaya hai, aap Bay 4 pe gadi lagaiye.', 'gemini');
      } else if (text.includes('5.4 degree') || text.includes('reefer')) {
        // Temperature Excursion
        ws.send(JSON.stringify({
          type: 'TRIGGER_MOCK_TOOL',
          tool: 'log_reefer_temperature_excursion',
          args: { current_temp: 5.4, status: 'CRITICAL_EXCURSION' }
        }));
        appendTranscript('Gemini 2.0 Live', 'Sat Sri Akal Gurpreet ji! Main E-way bill verify kar rahi hoon. Reefer temperature 5.4°C critical excursion par hai. Pharma QA ticket create kar di hai taaki consignment reject na ho.', 'gemini');
      } else if (text.includes('detention') || text.includes('wait')) {
        // Demurrage Claim
        ws.send(JSON.stringify({
          type: 'TRIGGER_MOCK_TOOL',
          tool: 'file_detention_demurrage_claim',
          args: { warehouse_name: 'Sonipat Cold Hub', detention_hours: 2.0 }
        }));
        appendTranscript('Gemini 2.0 Live', 'Samajh gaya Gurpreet ji. Sonipat hub ke against ₹2,200 prati ghanta ke hisaab se 2 ghante ka official detention claim file kar diya hai. Transporter aur consignee dono ko notification dispatch ho gaya hai.', 'gemini');
      } else if (text.includes('summary') || text.includes('card')) {
        // Bonus Voice Incident Card
        ws.send(JSON.stringify({
          type: 'TRIGGER_MOCK_TOOL',
          tool: 'generate_shareable_voice_incident_card',
          args: { summary: 'Gurpreet reported 5.4°C reefer spike & Bay 2 failure. Shifted to Bay 4 with 2 hrs detention compensation.', vernacular_language: 'Hinglish / Punjabi', urgency: 'HIGH' }
        }));
        appendTranscript('Gemini 2.0 Live', 'Zaroor! Maine aapke liye bilingual Voice Incident Card generate kar diya hai. Iska link aapke WhatsApp par share ho gaya hai.', 'gemini');
      }
    }, 450);
  });
});

// Reset State Handler
btnResetState.addEventListener('click', async () => {
  try {
    await fetch('/api/reset', { method: 'POST' });
    appendTranscript('System', 'Demo state reset to initial arrival status.', 'system');
  } catch (e) {
    console.error('Reset error:', e);
  }
});

// Settings Modal Handlers
btnSettings.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  inputApiKey.value = currentApiKey;
});
btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});
btnSaveApiKey.addEventListener('click', () => {
  currentApiKey = inputApiKey.value.trim();
  localStorage.setItem('dhwani_gemini_key', currentApiKey);
  settingsModal.classList.add('hidden');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'START_SESSION', apiKey: currentApiKey }));
  }
  addLogEntry('Gemini API Key updated. Reconnecting to Live session...', 'info');
});

// Bonus Actions
window.shareWhatsApp = function() {
  const text = encodeURIComponent(`🚚 *DhwaniFleet Voice Incident POD*\nTruck: HR-55-AJ-9021\nDriver: Gurpreet Singh\nStatus: Bay 4 Shifted | Excursion Logged (5.4°C)\nDetention Claim: ₹4,400\nListen to Audio POD: https://dhwanifleet.in/incident/CC-9021`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

window.playIncidentAudio = function() {
  // Synthesizes live spoken audio brief using Web Speech or Web Audio
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance("Driver Gurpreet Singh reported reefer temperature excursion at 5.4 degrees Celsius. Gate Bay reassigned to Bay 4, and official demurrage claim has been locked.");
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Voice brief played.");
  }
};

// Start WebSocket on Load
connectWebSocket();
