const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const svgLogo = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#000208"/>
    </radialGradient>

    <!-- Neon Cyan Gradient -->
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <!-- Warm Amber Accent Gradient -->
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base with Rounded App Icon Corners -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Border -->
  <rect x="4" y="4" width="504" height="504" rx="96" fill="none" stroke="#1e293b" stroke-width="6"/>
  <rect x="12" y="12" width="488" height="488" rx="88" fill="none" stroke="rgba(6,182,212,0.15)" stroke-width="2"/>

  <!-- Glowing Radar / Soundwave Concentric Rings -->
  <circle cx="256" cy="220" r="160" fill="none" stroke="rgba(56,189,248,0.12)" stroke-width="2" stroke-dasharray="8 6"/>
  <circle cx="256" cy="220" r="125" fill="none" stroke="rgba(56,189,248,0.2)" stroke-width="2.5"/>
  <circle cx="256" cy="220" r="90" fill="none" stroke="rgba(6,182,212,0.3)" stroke-width="3"/>

  <!-- Stylized Heavy-Duty Truck Cab (Geometric Minimalist) -->
  <g transform="translate(146, 120)">
    <!-- Truck Roof / Reefer Aerodynamic Fairing -->
    <path d="M 30,50 L 70,10 L 150,10 L 190,50 Z" fill="url(#cyanGrad)" opacity="0.9"/>
    
    <!-- Windshield -->
    <polygon points="40,55 180,55 168,105 52,105" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
    <!-- Windshield Reflection -->
    <polygon points="55,60 110,60 95,100 48,100" fill="rgba(56,189,248,0.25)"/>

    <!-- Cab Front Grille Body -->
    <rect x="36" y="112" width="148" height="85" rx="14" fill="#090d16" stroke="url(#cyanGrad)" stroke-width="3.5"/>

    <!-- Heavy Grille Horizontal Slats -->
    <line x1="56" y1="130" x2="164" y2="130" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    <line x1="56" y1="145" x2="164" y2="145" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    <line x1="56" y1="160" x2="164" y2="160" stroke="#334155" stroke-width="4" stroke-linecap="round"/>

    <!-- Dual LED Headlights -->
    <circle cx="48" cy="180" r="8" fill="url(#amberGrad)" filter="url(#neonGlow)"/>
    <circle cx="172" cy="180" r="8" fill="url(#amberGrad)" filter="url(#neonGlow)"/>

    <!-- Front Bumper -->
    <rect x="24" y="196" width="172" height="18" rx="8" fill="#1e293b" stroke="#0ea5e9" stroke-width="2"/>
  </g>

  <!-- Central Dynamic Voice AI Waves (Overlaying with Neon Glow) -->
  <g filter="url(#neonGlow)">
    <!-- Voice Soundbars on left and right -->
    <rect x="68" y="200" width="8" height="40" rx="4" fill="#38bdf8"/>
    <rect x="84" y="180" width="8" height="80" rx="4" fill="#38bdf8"/>
    <rect x="100" y="195" width="8" height="50" rx="4" fill="#06b6d4"/>

    <rect x="404" y="195" width="8" height="50" rx="4" fill="#06b6d4"/>
    <rect x="420" y="180" width="8" height="80" rx="4" fill="#38bdf8"/>
    <rect x="436" y="200" width="8" height="40" rx="4" fill="#38bdf8"/>
  </g>

  <!-- Cold-Chain Snowflake & Gemini Sparkle Pin -->
  <g transform="translate(256, 320)">
    <!-- Hexagonal Badge -->
    <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="#0284c7" stroke="#38bdf8" stroke-width="2.5" filter="url(#neonGlow)"/>
    <!-- Snowflake Lines -->
    <line x1="0" y1="-18" x2="0" y2="18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="-15" y1="-9" x2="15" y2="9" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="-15" y1="9" x2="15" y2="-9" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- Brand Typography -->
  <text x="256" y="405" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="2">
    CHALAAK<tspan fill="#38bdf8">SAATHI</tspan>
  </text>
  
  <text x="256" y="440" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#94a3b8" letter-spacing="4">
    VOICE AI • GEMINI 2.0 LIVE
  </text>
</svg>
`;

const svgPath = path.join(__dirname, 'public', 'logo.svg');
const htmlPath = path.join(__dirname, 'public', 'logo_render.html');
const pngPath = path.join(__dirname, 'ChalaakSaathi_Logo.png');

fs.writeFileSync(svgPath, svgLogo.trim());

// Render to clean 512x512 PNG using Chrome/Edge
const renderHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  </style>
</head>
<body>
  ${svgLogo}
</body>
</html>
`;

fs.writeFileSync(htmlPath, renderHtml);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = fs.existsSync(chromePath) ? chromePath : edgePath;

console.log('Rendering 512x512 Logo PNG...');
try {
  const cmd = `"${browser}" --headless --disable-gpu --window-size=512,512 --screenshot="${pngPath}" "file:///${htmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd);
  console.log('ChalaakSaathi_Logo.png created successfully at:', pngPath);
  console.log('File size:', fs.statSync(pngPath).size, 'bytes');
} catch (e) {
  console.error('Render error:', e.message);
}
