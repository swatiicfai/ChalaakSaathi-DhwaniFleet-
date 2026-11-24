const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Embedding live app screenshot into Slide 6 of deck.html...');

let html = fs.readFileSync(path.join(__dirname, 'deck.html'), 'utf8');

// Slide 6 Regex replacement
const slide6Regex = /<!-- SLIDE 6: WIREFRAMES & MOCKUP DIAGRAMS -->[\s\S]*?<!-- SLIDE 7: ARCHITECTURE DIAGRAM -->/;

const slide6New = `<!-- SLIDE 6: WIREFRAMES & MOCKUP DIAGRAMS -->
  <div class="slide">
    <div class="flex justify-between items-center mb-2">
      <div>
        <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-0.5">Interface & Prototype</span>
        <h2 class="text-3xl font-bold text-white">Live Prototype Dashboard & Telemetry Console</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
          <i class="fa-solid fa-circle text-[8px] animate-pulse mr-1"></i> LIVE APPLICATION SCREENSHOT
        </span>
        <span class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
          http://localhost:3000
        </span>
      </div>
    </div>

    <div class="my-auto flex items-center justify-center p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden" style="max-height: 5.9in;">
      <img src="public/app_screenshot.png" alt="ChalaakSaathi Live Dashboard" class="rounded-xl w-full h-auto object-contain" style="max-height: 5.7in;"/>
    </div>

    <div class="slide-footer">
      <span>ChalaakSaathi — Live Prototype Console (Gemini 2.0 Flash Multimodal Live)</span>
      <span>Slide 6 / 12</span>
    </div>
  </div>


  <!-- SLIDE 7: ARCHITECTURE DIAGRAM -->`;

html = html.replace(slide6Regex, slide6New);
fs.writeFileSync(path.join(__dirname, 'deck.html'), html);
console.log('Slide 6 updated with live app screenshot!');

// Also update README.md to put the screenshot right under the hero title
let readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
if (!readme.includes('app_screenshot.png')) {
  readme = readme.replace(
    '[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)]()',
    `[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)]()\n\n## 🖥️ Live Application Dashboard\n\n![ChalaakSaathi Live Dashboard](app_screenshot.png)`
  );
  fs.writeFileSync(path.join(__dirname, 'README.md'), readme);
  console.log('README.md updated with live screenshot!');
}

// Re-render PDF using Chrome or Edge
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = fs.existsSync(chromePath) ? chromePath : edgePath;

const pdfPath = path.join(__dirname, 'DhwaniFleet_Idea_Submission_Deck.pdf');
const downloadsPdf = 'C:\\Users\\Swati\\Downloads\\ChalaakSaathi_Idea_Submission_Deck.pdf';

console.log('Re-rendering PDF presentation with Chrome...');
const cmd = `"${browser}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "file:///${path.join(__dirname, 'deck.html').replace(/\\/g, '/')}"`;
execSync(cmd);
fs.copyFileSync(pdfPath, downloadsPdf);

console.log('Updated submission PDF saved at:');
console.log('1. ', pdfPath);
console.log('2. ', downloadsPdf);
console.log('File size:', fs.statSync(pdfPath).size, 'bytes');
