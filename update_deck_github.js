const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Injecting prominent GitHub links across all slides in deck.html...');

let html = fs.readFileSync(path.join(__dirname, 'deck.html'), 'utf8');

// 1. Update Title Slide (Slide 1) with a prominent glowing GitHub banner
html = html.replace(
  'Track: Open Innovation — Real-World Voice AI',
  'Track: Open Innovation • GitHub: https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-'
);

// 2. Add clickable GitHub badge on Slide 1 hero section
if (!html.includes('id="heroGithubBadge"')) {
  html = html.replace(
    '<h1 class="text-6xl font-extrabold tracking-tight text-white leading-tight">',
    `<div id="heroGithubBadge" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold mb-2">
        <i class="fa-brands fa-github text-sm"></i> GitHub: https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-
     </div>
     <h1 class="text-6xl font-extrabold tracking-tight text-white leading-tight">`
  );
}

// 3. Update all slide footers so GitHub link is visible on EVERY page
html = html.replace(
  /<div class="slide-footer">[\s\S]*?<span>(Slide \d+ \/ 12)<\/span>[\s\S]*?<\/div>/g,
  `<div class="slide-footer">
      <span><strong>ChalaakSaathi</strong> • GitHub: <span style="color: #38bdf8; font-family: monospace; font-weight: bold;">https://github.com/swatiicfai/ChalaakSaathi-DhwaniFleet-</span></span>
      <span>$1</span>
    </div>`
);

fs.writeFileSync(path.join(__dirname, 'deck.html'), html);
console.log('deck.html updated with universal GitHub footer!');

// 4. Re-compile PDF using Chrome or Edge headless
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = fs.existsSync(chromePath) ? chromePath : edgePath;

const pdfPath = path.join(__dirname, 'DhwaniFleet_Idea_Submission_Deck.pdf');
const downloadsPdf = 'C:\\Users\\Swati\\Downloads\\ChalaakSaathi_Idea_Submission_Deck.pdf';

console.log('Compiling final submission PDF with Chrome...');
const cmd = `"${browser}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "file:///${path.join(__dirname, 'deck.html').replace(/\\/g, '/')}"`;
execSync(cmd);
fs.copyFileSync(pdfPath, downloadsPdf);

console.log('Final Submission PDF ready at:');
console.log('1. ', pdfPath);
console.log('2. ', downloadsPdf);
console.log('File size:', fs.statSync(pdfPath).size, 'bytes');
