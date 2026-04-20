import fs from 'fs';

const width = 800;
const height = 500;

const faces = [];

// 17 faces. Let's position them manually or semi-randomly but nicely distributed.
const positions = [
  [120, 150], [220, 120], [340, 160], [450, 110], [580, 140], [690, 170],
  [160, 260], [280, 240], [390, 280], [500, 250], [620, 270],
  [130, 380], [240, 390], [360, 360], [470, 380], [590, 370], [700, 350]
];

// Add some jitter
const jitter = () => (Math.random() - 0.5) * 40;

for (let i = 0; i < 17; i++) {
    let [x, y] = positions[i];
    x += jitter();
    y += jitter();
    
    const isRed = Math.random() > 0.75; 
    const color = isRed ? '#d42b2b' : '#0a0a0a';
    
    const isHappy = Math.random() > 0.5;
    const hasLeftBrow = Math.random() > 0.3;
    const hasRightBrow = Math.random() > 0.3;
    
    let mouth = isHappy 
        ? `M -16 12 Q 0 24 16 12` 
        : `M -16 20 Q 0 10 16 20`;
        
    let eyebrows = '';
    if (hasLeftBrow) {
        eyebrows += isHappy
            ? `<path d="M -22 -14 Q -14 -22 -6 -14" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" />`
            : `<path d="M -22 -18 Q -14 -14 -6 -8" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    }
    if (hasRightBrow) {
        eyebrows += isHappy
            ? `<path d="M 6 -14 Q 14 -22 22 -14" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" />`
            : `<path d="M 6 -8 Q 14 -14 22 -18" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    }
    
    faces.push(`
    <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="38" fill="none" stroke="${color}" stroke-width="2.5" />
        <circle cx="-14" cy="-4" r="4.5" fill="${color}" />
        <circle cx="14" cy="-4" r="4.5" fill="${color}" />
        <path d="${mouth}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        ${eyebrows}
    </g>
    `);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #f0ebe0;">
    <!-- Background large number 17 -->
    <text x="400" y="410" font-family="Bebas Neue, sans-serif" font-size="450" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="4" text-anchor="middle" font-weight="normal" letter-spacing="-0.02em">17</text>
    
    <!-- Dashed lines -->
    <line x1="266" y1="40" x2="266" y2="460" stroke="#0a0a0a" stroke-width="1" stroke-dasharray="4 4" opacity="0.2" />
    <line x1="533" y1="40" x2="533" y2="460" stroke="#0a0a0a" stroke-width="1" stroke-dasharray="4 4" opacity="0.2" />
    <line x1="80" y1="250" x2="720" y2="250" stroke="#0a0a0a" stroke-width="1" stroke-dasharray="4 4" opacity="0.2" />
    
    ${faces.join('\n')}
</svg>`;

fs.writeFileSync('public/group-placeholder.svg', svg);
console.log('SVG generated at public/group-placeholder.svg');
