const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let html = fs.readFileSync(path.join(__dirname, 'deck.html'), 'utf8');
const svg = fs.readFileSync(path.join(__dirname, 'public', 'architecture_diagram.svg'), 'utf8');

const slide7Regex = /<!-- SLIDE 7: ARCHITECTURE DIAGRAM -->[\s\S]*?<!-- SLIDE 8: TECHNOLOGIES USED -->/;

const slide7New = `<!-- SLIDE 7: ARCHITECTURE DIAGRAM -->
  <div class="slide">
    <div class="flex justify-between items-center mb-2">
      <div>
        <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-0.5">Engineering & Architecture</span>
        <h2 class="text-3xl font-bold text-white">Live System & Agentic Architecture</h2>
      </div>
      <div class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/30">
        Google Gemini 2.0 Flash Multimodal Live • Bidirectional WebSockets
      </div>
    </div>

    <div class="my-auto flex items-center justify-center p-2 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-2xl overflow-hidden" style="max-height: 5.8in;">
      ${svg}
    </div>

    <div class="slide-footer">
      <span>ChalaakSaathi — Live Architecture Diagram</span>
      <span>Slide 7 / 12</span>
    </div>
  </div>


  <!-- SLIDE 8: TECHNOLOGIES USED -->`;

html = html.replace(slide7Regex, slide7New);
fs.writeFileSync(path.join(__dirname, 'deck.html'), html);
console.log('Embedded visual architecture SVG into Slide 7 of deck.html!');

// Re-render PDF with Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = fs.existsSync(chromePath) ? chromePath : edgePath;

const pdfPath = path.join(__dirname, 'DhwaniFleet_Idea_Submission_Deck.pdf');
const downloadsPdf = 'C:\\Users\\Swati\\Downloads\\ChalaakSaathi_Idea_Submission_Deck.pdf';

console.log('Re-compiling submission PDF with visual architecture diagram...');
const cmd = `"${browser}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "file:///${path.join(__dirname, 'deck.html').replace(/\\/g, '/')}"`;
execSync(cmd);
fs.copyFileSync(pdfPath, downloadsPdf);

console.log('Submission PDF updated successfully with live architecture at:');
console.log('1. ', pdfPath);
console.log('2. ', downloadsPdf);
console.log('New PDF file size:', fs.statSync(pdfPath).size, 'bytes');
