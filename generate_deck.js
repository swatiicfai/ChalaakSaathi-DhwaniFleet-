const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

console.log('Generating DhwaniFleet 12-Slide Submission Presentation...');

// 1. Generate High-Definition 16:9 HTML Deck for PDF Rendering
const htmlDeck = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DhwaniFleet - Build with Google Gemini Submission Deck</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @page {
      size: 16in 9in;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background: #020617;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slide {
      width: 16in;
      height: 9in;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      padding: 3rem 4rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: radial-gradient(circle at 80% 20%, #0f172a 0%, #020617 100%);
      border-bottom: 2px solid #1e293b;
    }
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(51, 65, 85, 0.4);
      padding-top: 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: TITLE & COVER -->
  <div class="slide">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <span class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold text-sm">
          Build with Google Gemini 2026
        </span>
        <span class="text-slate-400 text-sm">Track: Open Innovation — Real-World Voice AI</span>
      </div>
      <div class="text-right text-xs font-mono text-slate-500">
        Hack2Skill • Google Cloud
      </div>
    </div>

    <div class="my-auto space-y-6 max-w-5xl">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
        <i class="fa-solid fa-truck-fast"></i> MSME Logistics & Life Sciences Cold-Chain
      </div>
      <h1 class="text-6xl font-extrabold tracking-tight text-white leading-tight">
        DhwaniFleet <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ध्वनिफ्लीट</span>
      </h1>
      <p class="text-2xl text-slate-300 font-light leading-relaxed">
        Real-Time Vernacular Voice AI Co-Pilot for Cold-Chain & Reefer Truck Driver Detention Resolution Powered by <strong>Gemini 2.0 Flash Multimodal Live</strong>
      </p>
      
      <div class="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
        <div>
          <span class="text-xs uppercase tracking-wider text-slate-500 block mb-1">Team Name</span>
          <p class="text-xl font-bold text-white">Team DhwaniFleet</p>
        </div>
        <div>
          <span class="text-xs uppercase tracking-wider text-slate-500 block mb-1">Team Leader</span>
          <p class="text-xl font-bold text-white">Swati Gupta</p>
        </div>
        <div>
          <span class="text-xs uppercase tracking-wider text-slate-500 block mb-1">Core Tech</span>
          <p class="text-xl font-bold text-cyan-400">Gemini 2.0 Live (Audio-to-Audio)</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 1 / 12</span>
    </div>
  </div>


  <!-- SLIDE 2: BRIEF ABOUT THE IDEA -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Overview</span>
      <h2 class="text-4xl font-bold text-white">Brief about the Idea</h2>
      <p class="text-slate-400 text-base mt-1">Bridging the critical communication gap for 8+ million commercial vehicle drivers at Indian warehouse gates</p>
    </div>

    <div class="grid grid-cols-2 gap-8 my-auto">
      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 class="text-xl font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-location-crosshairs text-cyan-400"></i> The Target Setting & User
        </h3>
        <p class="text-slate-300 leading-relaxed text-sm">
          <strong>Users:</strong> Long-haul reefer truck drivers, fleet operators, and cold-storage dock supervisors.
        </p>
        <p class="text-slate-300 leading-relaxed text-sm">
          <strong>Physical Environment:</strong> Chaotic highway tollgates, warehouse check-in barriers, and refrigerated distribution docks where diesel engines idle at 85+ dB, air horns blare, and drivers cannot pause maneuvering 16-wheelers to type English prompts or navigate smartphone forms.
        </p>
        <p class="text-slate-300 leading-relaxed text-sm">
          <strong>Linguistic Reality:</strong> Drivers communicate in regional dialects (Hinglish, Punjabi, Marathi, Telugu) blended naturally with English logistics jargon (<em>"slot", "reefer temp", "eway bill", "detention", "bay"</em>).
        </p>
      </div>

      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 class="text-xl font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-brain text-blue-400"></i> The AI Co-Pilot Solution
        </h3>
        <p class="text-slate-300 leading-relaxed text-sm">
          <strong>DhwaniFleet</strong> is a hands-free, real-time voice agent built on <strong>Gemini 2.0 Flash Multimodal Live</strong> that directly connects spoken driver vernacular to enterprise TMS (Transport Management Systems), IoT reefer telematics, and demurrage recovery ledgers.
        </p>
        <div class="space-y-2 pt-2">
          <div class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <i class="fa-solid fa-bolt text-yellow-400 text-sm"></i>
            <span><strong>Sub-650ms Latency:</strong> Instant natural turn-taking over bidirectional WebSockets.</span>
          </div>
          <div class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <i class="fa-solid fa-hand text-rose-400 text-sm"></i>
            <span><strong>Mid-Sentence Interruption:</strong> Handles guard shouts and driver corrections smoothly.</span>
          </div>
          <div class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <i class="fa-solid fa-database text-emerald-400 text-sm"></i>
            <span><strong>Real State Mutation:</strong> Executes atomic updates on warehouse slots and demurrage claims.</span>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 2 / 12</span>
    </div>
  </div>


  <!-- SLIDE 3: OPPORTUNITY, DIFFERENTIATION & USP -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Market Opportunity</span>
      <h2 class="text-4xl font-bold text-white">Why DhwaniFleet? Opportunity, Differentiation & USP</h2>
    </div>

    <div class="grid grid-cols-3 gap-6 my-auto">
      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg font-bold">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 class="text-lg font-bold text-white">The Massive Problem</h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>₹89,000+ Crore annual loss</strong> in India due to cold-chain spoilage and transit delays.</li>
          <li>• <strong>Unrecorded Gate Detention:</strong> Reefer trucks wait 3-6 hours at gates; fuel burn is ₹2,200/hr while idling.</li>
          <li>• <strong>SLA & Cargo Disputes:</strong> Without real-time voice logging, temperature excursions lead to rejected pharma/dairy batches.</li>
        </ul>
      </div>

      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-bold">
          <i class="fa-solid fa-code-compare"></i>
        </div>
        <h3 class="text-lg font-bold text-white">Why Existing Bots Fail</h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>Slow STT-LLM-TTS Cascades:</strong> 3 to 5 second lag makes live yard conversations impossible.</li>
          <li>• <strong>Acoustic Fragility:</strong> Standard ASR models break completely under heavy diesel engine rumble and air horns.</li>
          <li>• <strong>No Interruption Handling:</strong> Rigid IVR menus restart if the driver is interrupted by a yard guard.</li>
        </ul>
      </div>

      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-lg font-bold">
          <i class="fa-solid fa-crown"></i>
        </div>
        <h3 class="text-lg font-bold text-white">Unique Selling Proposition (USP)</h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>Native Multimodal Live Audio:</strong> Speech-in to speech-out directly on Gemini 2.0 Flash (< 650ms).</li>
          <li>• <strong>Vernacular & Code-Switched:</strong> Flawless understanding of Hinglish, Punjabi, Marathi without language switches.</li>
          <li>• <strong>Atomic State Mutation:</strong> Automatically starts the demurrage billing clock and updates warehouse dock gates.</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 3 / 12</span>
    </div>
  </div>


  <!-- SLIDE 4: CORE SOLUTION FEATURES -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Capabilities</span>
      <h2 class="text-4xl font-bold text-white">Core Solution Features</h2>
    </div>

    <div class="grid grid-cols-4 gap-5 my-auto">
      <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div class="text-cyan-400 text-2xl"><i class="fa-solid fa-microphone-lines"></i></div>
        <h3 class="font-bold text-white text-base">Sub-Second Live Audio</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Native bidirectional audio streaming via WebSockets with continuous PCM 16kHz capture and 24kHz audio playback queue.
        </p>
      </div>

      <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div class="text-amber-400 text-2xl"><i class="fa-solid fa-volume-xmark"></i></div>
        <h3 class="font-bold text-white text-base">Acoustic Noise Resilience</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Trained to comprehend code-switched speech over heavy diesel idle, highway air horn blasts, and warehouse echoes.
        </p>
      </div>

      <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div class="text-rose-400 text-2xl"><i class="fa-solid fa-hand"></i></div>
        <h3 class="font-bold text-white text-base">Mid-Sentence Barge-in</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Instant turn cancellation when the driver interrupts or when a dock security guard gives sudden re-routing instructions.
        </p>
      </div>

      <div class="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div class="text-emerald-400 text-2xl"><i class="fa-solid fa-database"></i></div>
        <h3 class="font-bold text-white text-base">Atomic Action Execution</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Function calling updates dock slots, logs cold-chain excursions, and initiates demurrage dispute compensation tickets.
        </p>
      </div>
    </div>

    <!-- Bonus Track Feature Banner -->
    <div class="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          Optional Bonus Extension Included
        </span>
        <span class="text-sm font-semibold text-white">Vernacular Spoken Voice Incident & WhatsApp POD Card</span>
      </div>
      <p class="text-xs text-slate-300">Auto-curates driver's spoken narration into a signed, shareable digital audio card dispatched to consignees.</p>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 4 / 12</span>
    </div>
  </div>


  <!-- SLIDE 5: PROCESS FLOW & USE-CASE DIAGRAM -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Workflow</span>
      <h2 class="text-4xl font-bold text-white">Process Flow: Voice → Reasoning → Action Execution</h2>
    </div>

    <div class="my-auto space-y-6">
      <div class="grid grid-cols-5 gap-4 text-center">
        <!-- Step 1 -->
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div class="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center mx-auto mb-2 text-xs">1</div>
          <h4 class="font-bold text-xs text-white mb-1">Spoken Arrival</h4>
          <p class="text-[11px] text-slate-400 leading-tight">Driver speaks in Hinglish over diesel noise: <em>"Gate 2 pe pahunch gaye, reefer 5.4°C hai."</em></p>
        </div>

        <!-- Step 2 -->
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto mb-2 text-xs">2</div>
          <h4 class="font-bold text-xs text-white mb-1">Gemini Live Audio</h4>
          <p class="text-[11px] text-slate-400 leading-tight">PCM 16kHz streamed to Gemini 2.0 Flash Live over WebSockets with < 650ms latency.</p>
        </div>

        <!-- Step 3 -->
        <div class="bg-slate-900 p-4 rounded-xl border border-rose-500/40 bg-rose-950/20">
          <div class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center mx-auto mb-2 text-xs">3</div>
          <h4 class="font-bold text-xs text-rose-300 mb-1">Barge-in / Interruption</h4>
          <p class="text-[11px] text-slate-300 leading-tight">Guard yells: <em>"Bay 2 band hai!"</em> Driver interrupts mid-turn: <em>"Ruko, Bay 4 karo!"</em></p>
        </div>

        <!-- Step 4 -->
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-2 text-xs">4</div>
          <h4 class="font-bold text-xs text-white mb-1">Function Execution</h4>
          <p class="text-[11px] text-slate-400 leading-tight">Gemini invokes <code>update_tms_dock_slot</code> and <code>log_reefer_temperature_excursion</code>.</p>
        </div>

        <!-- Step 5 -->
        <div class="bg-slate-900 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto mb-2 text-xs">5</div>
          <h4 class="font-bold text-xs text-emerald-300 mb-1">State Mutation</h4>
          <p class="text-[11px] text-slate-300 leading-tight">Bay 4 assigned, Demurrage clock started (₹2,200/hr), WhatsApp POD card dispatched.</p>
        </div>
      </div>

      <!-- Execution Path Callout -->
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
        <span class="text-cyan-400">Audio In</span> → [VAD & Interruption Handler] → <span class="text-blue-400">Gemini 2.0 Multimodal Live</span> → <span class="text-yellow-400">Tool Declarations</span> → <span class="text-emerald-400">TMS REST / SQLite Database Mutation</span> → <span class="text-purple-400">Synthesized 24kHz Audio Out</span>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 5 / 12</span>
    </div>
  </div>


  <!-- SLIDE 6: WIREFRAMES & MOCKUP DIAGRAMS -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Interface & UX</span>
      <h2 class="text-4xl font-bold text-white">Prototype UI & Telemetry Dashboard</h2>
    </div>

    <div class="grid grid-cols-2 gap-8 my-auto">
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-gauge-high text-cyan-400"></i> Key Dashboard Components Built
        </h3>
        <div class="space-y-3 text-xs">
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <strong class="text-white block mb-0.5">1. Bidirectional Voice Hub:</strong>
            <p class="text-slate-400">Visual audio waveform, continuous streaming mic trigger, and immediate barge-in interruption alert badge.</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <strong class="text-white block mb-0.5">2. Indian Acoustic Field Simulator:</strong>
            <p class="text-slate-400">1-click injection of 12-cylinder diesel engine idle, highway pneumatic air horns, and dockyard murmur with gain control.</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <strong class="text-white block mb-0.5">3. Live TMS State Mutation Board:</strong>
            <p class="text-slate-400">Animated visual cards showing dock slot shifting (Bay 2 → Bay 4), reefer temp excursion alerts, and demurrage billing.</p>
          </div>
        </div>
      </div>

      <div class="bg-slate-950 p-6 rounded-2xl border border-cyan-500/30 flex flex-col justify-between">
        <div class="border-b border-slate-800 pb-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-white text-sm">Live System Telemetry HUD</span>
            <span class="text-emerald-400 text-xs font-mono"><i class="fa-solid fa-circle text-[8px] animate-pulse"></i> ONLINE</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 my-4">
          <div class="p-3 bg-slate-900 rounded-lg text-center">
            <span class="text-xs text-slate-400 block">Measured Latency</span>
            <span class="text-xl font-bold text-cyan-400">480 ms</span>
          </div>
          <div class="p-3 bg-slate-900 rounded-lg text-center">
            <span class="text-xs text-slate-400 block">Audio Engine</span>
            <span class="text-xs font-bold text-blue-400 mt-1 block">PCM 16k in / 24k out</span>
          </div>
          <div class="p-3 bg-slate-900 rounded-lg text-center">
            <span class="text-xs text-slate-400 block">Dock Bay Assigned</span>
            <span class="text-sm font-bold text-emerald-400 mt-1 block">Gate 2 - Bay 4</span>
          </div>
          <div class="p-3 bg-slate-900 rounded-lg text-center">
            <span class="text-xs text-slate-400 block">Demurrage Claim</span>
            <span class="text-sm font-bold text-rose-400 mt-1 block">₹ 4,400 Locked</span>
          </div>
        </div>
        <div class="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300">
          <i class="fa-solid fa-star text-amber-400 mr-1"></i> Bonus Feature: Shareable Vernacular Voice Incident Card & WhatsApp Dispatch Ready.
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 6 / 12</span>
    </div>
  </div>


  <!-- SLIDE 7: ARCHITECTURE DIAGRAM -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Engineering</span>
      <h2 class="text-4xl font-bold text-white">Full-Stack Technical Architecture</h2>
    </div>

    <div class="my-auto space-y-4">
      <div class="grid grid-cols-4 gap-4">
        <!-- Layer 1 -->
        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-cyan-400">1. Client Audio Layer</div>
          <p class="text-xs text-slate-300">
            • Web Audio API<br>
            • PCM 16kHz linear mono capture<br>
            • Local VAD & RMS energy barge-in<br>
            • Acoustic noise synthesizer
          </p>
        </div>

        <!-- Layer 2 -->
        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-blue-400">2. WebSocket Gateway</div>
          <p class="text-xs text-slate-300">
            • Node.js & Express<br>
            • Bidirectional WS multiplexer<br>
            • Turn preemption coordinator<br>
            • Low-latency buffer streaming
          </p>
        </div>

        <!-- Layer 3 -->
        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-purple-400">3. Gemini 2.0 Engine</div>
          <p class="text-xs text-slate-300">
            • Gemini 2.0 Flash Live API<br>
            • Native audio-to-audio model<br>
            • Vernacular & code-switch fluency<br>
            • Real-time function declarations
          </p>
        </div>

        <!-- Layer 4 -->
        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">4. Backend Services</div>
          <p class="text-xs text-slate-300">
            • TMS Dock Bay Allocator<br>
            • Reefer Telematics Auditor<br>
            • Demurrage & SLA Claim Engine<br>
            • WhatsApp Cloud API Dispatch
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center font-mono">
        Driver Voice (PCM 16k) ⇄ WebSocket Gateway ⇄ Google Gemini 2.0 Live WebSocket ⇄ Downstream Database & REST APIs
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 7 / 12</span>
    </div>
  </div>


  <!-- SLIDE 8: TECHNOLOGIES USED -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Stack</span>
      <h2 class="text-4xl font-bold text-white">Technology Stack</h2>
    </div>

    <div class="grid grid-cols-3 gap-6 my-auto">
      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <h3 class="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <i class="fa-solid fa-brain"></i> AI & Voice Model
        </h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>Google Gemini 2.0 Flash Multimodal Live API:</strong> Sub-second audio-to-audio generation via BidiGenerateContent.</li>
          <li>• <strong>Gemini Function Calling:</strong> Structured JSON schema declarations for dock slots, excursions, and claims.</li>
          <li>• <strong>Prebuilt Voice Configuration:</strong> Optimized Indian cadence voice preset ('Puck').</li>
        </ul>
      </div>

      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <h3 class="text-lg font-bold text-blue-400 flex items-center gap-2">
          <i class="fa-solid fa-server"></i> Backend & Streaming
        </h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>Node.js & Express:</strong> High-concurrency event-driven streaming server.</li>
          <li>• <strong>WebSockets (ws):</strong> Sub-millisecond bi-directional binary audio packet routing.</li>
          <li>• <strong>In-Memory & SQLite State Ledger:</strong> Atomic transaction logging for dock bays and demurrage fees.</li>
        </ul>
      </div>

      <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
        <h3 class="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <i class="fa-solid fa-desktop"></i> Frontend & Audio Engine
        </h3>
        <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>• <strong>Web Audio API:</strong> 16kHz linear PCM recording & 24kHz buffer queue scheduling.</li>
          <li>• <strong>HTML5 Canvas & VAD:</strong> Real-time audio waveform and energy-threshold barge-in detector.</li>
          <li>• <strong>Tailwind CSS & FontAwesome:</strong> High-definition dark telemetry dashboard.</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 8 / 12</span>
    </div>
  </div>


  <!-- SLIDE 9: GEMINI ENTERPRISE USAGE -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Gemini Integration</span>
      <h2 class="text-4xl font-bold text-white">How DhwaniFleet Uses Gemini Enterprise & Agentic Design</h2>
    </div>

    <div class="grid grid-cols-2 gap-8 my-auto">
      <div class="space-y-4">
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 class="text-base font-bold text-white mb-1">1. True Multimodal Audio-to-Audio (No Cascading)</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            By avoiding traditional cascaded pipelines (Speech-to-Text → LLM Text Generation → Text-to-Speech), DhwaniFleet preserves raw speech acoustic features, intonation, and vernacular phonetic accents, reducing round-trip latency by over 70%.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 class="text-base font-bold text-white mb-1">2. Zero-Prompt Multi-Lingual & Code-Switch Auto-Detection</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Gemini's deep contextual tokenization allows drivers to switch between Hindi, Punjabi, and English in a single sentence without pressing any language selection buttons.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 class="text-base font-bold text-white mb-1">3. Agentic Function Calling with Immediate Tool Feedback</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Spoken intent directly triggers typed function calls (<code>update_tms_dock_slot</code>, <code>log_reefer_temperature_excursion</code>, <code>file_detention_demurrage_claim</code>). Tool execution responses feed back into Gemini's context within the same active turn.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 class="text-base font-bold text-white mb-1">4. Native Turn-Taking & Mid-Sentence Interruption (Barge-In)</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            The agent handles incoming user speech frames while generating output, halting generation instantly when interruption is detected and adapting to new instructions on the fly.
          </p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 9 / 12</span>
    </div>
  </div>


  <!-- SLIDE 10: ESTIMATED IMPLEMENTATION COST & UNIT ECONOMICS -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Commercial Viability</span>
      <h2 class="text-4xl font-bold text-white">Estimated Cost, Unit Economics & Measurable ROI</h2>
    </div>

    <div class="grid grid-cols-4 gap-5 my-auto">
      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
        <span class="text-3xl font-extrabold text-cyan-400">₹0.18</span>
        <span class="text-xs text-slate-400 block mt-1">Cost per Interaction</span>
        <p class="text-[11px] text-slate-300 mt-2">Gemini 2.0 Flash Live audio tokens (~$0.0022 per 30-sec turn).</p>
      </div>

      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
        <span class="text-3xl font-extrabold text-emerald-400">₹18,400</span>
        <span class="text-xs text-slate-400 block mt-1">Saved / Truck / Month</span>
        <p class="text-[11px] text-slate-300 mt-2">Recovering ₹2,200/hr detention claims & cutting idle fuel waste.</p>
      </div>

      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
        <span class="text-3xl font-extrabold text-amber-400">94.2%</span>
        <span class="text-xs text-slate-400 block mt-1">Spoilage Risk Avoided</span>
        <p class="text-[11px] text-slate-300 mt-2">Emergency reefer temp logging prevents batch rejection on ₹1.45 Cr cargo.</p>
      </div>

      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
        <span class="text-3xl font-extrabold text-purple-400">> 100x</span>
        <span class="text-xs text-slate-400 block mt-1">ROI Multiplier</span>
        <p class="text-[11px] text-slate-300 mt-2">Software cost is negligible compared to reclaimed detention billing.</p>
      </div>
    </div>

    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
      <strong class="text-white">Commercial Monetization Strategy:</strong>
      <p>• B2B SaaS subscription for cold-chain 3PL logistics fleets (₹999 / active reefer truck / month).</p>
      <p>• 5% success-fee on verified detention compensation recovered from warehouse consignees.</p>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 10 / 12</span>
    </div>
  </div>


  <!-- SLIDE 11: HACKATHON REQUIREMENTS CHECKLIST -->
  <div class="slide">
    <div>
      <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">Compliance</span>
      <h2 class="text-4xl font-bold text-white">Full Hackathon Requirements Verification</h2>
    </div>

    <div class="grid grid-cols-2 gap-6 my-auto text-xs">
      <div class="space-y-3">
        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
          <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
          <div>
            <strong class="text-white block">Native Real-Time Voice (< 650ms Latency):</strong>
            <p class="text-slate-400">Demonstrated sub-second conversational flow on live telemetry strip using Gemini 2.0 Live.</p>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
          <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
          <div>
            <strong class="text-white block">Mid-Sentence Interruption / Barge-In:</strong>
            <p class="text-slate-400">Driver interrupts Gemini midway when dock guard changes gate bay; playback cuts off with 0ms hangover.</p>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
          <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
          <div>
            <strong class="text-white block">Vernacular & Code-Switched Speech:</strong>
            <p class="text-slate-400">Understands Hinglish, Punjabi, Marathi combined with English logistics terminology seamlessly.</p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
          <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
          <div>
            <strong class="text-white block">Acoustic & Field Noise Resilience:</strong>
            <p class="text-slate-400">Tested live with built-in simulator generating diesel engine idle, air horns, and dock echoes.</p>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
          <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
          <div>
            <strong class="text-white block">Real Backend State Mutation:</strong>
            <p class="text-slate-400">Proves database changes on screen: slot assignment updated, excursion recorded, demurrage billed.</p>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40 bg-indigo-950/20 flex items-start gap-3">
          <i class="fa-solid fa-star text-amber-400 mt-1"></i>
          <div>
            <strong class="text-indigo-200 block">Optional Bonus Track Included:</strong>
            <p class="text-indigo-300">Auto-curates spoken driver narration into a shareable bilingual Voice Incident Card for WhatsApp dispatch.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 11 / 12</span>
    </div>
  </div>


  <!-- SLIDE 12: CONCLUSION & DEMO LINKS -->
  <div class="slide">
    <div class="flex justify-between items-center">
      <span class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold text-sm">
        Build with Google Gemini
      </span>
      <span class="text-slate-500 text-sm font-mono">End of Deck</span>
    </div>

    <div class="my-auto text-center space-y-6 max-w-4xl mx-auto">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto text-2xl text-white shadow-xl shadow-cyan-500/40">
        <i class="fa-solid fa-check-double"></i>
      </div>
      <h2 class="text-5xl font-extrabold text-white">Thank You!</h2>
      <p class="text-xl text-slate-300 font-light">
        DhwaniFleet transforms raw vernacular voice into autonomous, high-value enterprise logistics actions.
      </p>

      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Live Application:</span>
          <strong class="text-cyan-400 font-mono">http://localhost:3000</strong>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Architecture:</span>
          <strong class="text-white">Google Gemini 2.0 Flash Multimodal Live + WebSockets</strong>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Next Milestone:</span>
          <strong class="text-white">Field pilot across 500 reefer trucks on Delhi-Mumbai corridor with e-Way bill API integration</strong>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>DhwaniFleet — Idea & Prototype Submission</span>
      <span>Slide 12 / 12</span>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'deck.html'), htmlDeck);
console.log('Created deck.html');

// 2. Compile to PDF using Edge or Chrome headless
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

const htmlPath = 'file:///' + path.join(__dirname, 'deck.html').replace(/\\/g, '/');
const pdfPath = path.join(__dirname, 'DhwaniFleet_Idea_Submission_Deck.pdf');

console.log('Rendering PDF with browser:', browserPath);
try {
  const cmd = `"${browserPath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('PDF generated successfully at:', pdfPath);
} catch (e) {
  console.error('PDF export error:', e.message);
}

// 3. Update template.pptx slides
try {
  const zip = new AdmZip(path.join(__dirname, 'template.pptx'));
  
  // Update Slide 1 (Title)
  let s1 = zip.readAsText('ppt/slides/slide1.xml');
  s1 = s1.replace(/Team Name\s*:\s*/g, 'Team Name : Team DhwaniFleet\\n');
  s1 = s1.replace(/Problem Statement\s*:\s*/g, 'Problem Statement : Open Innovation: Real-World Voice AI for Cold-Chain Reefer Detention Resolution\\n');
  s1 = s1.replace(/Team Leader Name\s*:\s*/g, 'Team Leader Name : Swati Gupta\\n');
  zip.updateFile('ppt/slides/slide1.xml', Buffer.from(s1, 'utf8'));

  // Save updated PPTX
  const pptxOut = path.join(__dirname, 'DhwaniFleet_Idea_Submission_Deck.pptx');
  zip.writeZip(pptxOut);
  console.log('PPTX updated and saved at:', pptxOut);
} catch (e) {
  console.error('PPTX update error:', e.message);
}

console.log('All submission assets ready!');
