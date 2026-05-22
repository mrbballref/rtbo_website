import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '../public/assets/images/shop');

fs.mkdirSync(outDir, { recursive: true });

const orange = '#ff6a00';
const orangeLight = '#ff8a1d';
const silver = '#d6dde6';
const white = '#f8fafc';
const dark = '#050505';
const panel = '#0b0d10';

function shell(title, subtitle, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${subtitle}</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset=".5" stop-color="#050505"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
    <linearGradient id="orangeGlow" x1="0" x2="1">
      <stop offset="0" stop-color="${orange}"/>
      <stop offset="1" stop-color="${orangeLight}"/>
    </linearGradient>
    <pattern id="carbon" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="28" height="28" fill="${dark}"/>
      <rect width="13" height="28" fill="#111"/>
      <path d="M0 0h28v4H0zM0 14h28v4H0z" fill="#1f2933" opacity=".45"/>
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#carbon)" opacity=".34"/>
  <path d="M0 820C245 710 402 845 605 760c189-78 270-230 595-150v290H0z" fill="${orange}" opacity=".12"/>
  <rect x="44" y="44" width="1112" height="812" rx="34" fill="${panel}" opacity=".72" stroke="${orange}" stroke-opacity=".55" stroke-width="3"/>
  ${body}
  <text x="70" y="802" fill="${orangeLight}" font-family="Arial Black, Impact, sans-serif" font-size="34" letter-spacing="3">${title}</text>
  <text x="70" y="842" fill="${silver}" font-family="Arial, sans-serif" font-size="22">${subtitle}</text>
</svg>`;
}

function rtboMark(x, y, scale = 1) {
  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M0 14 60 0l60 14v78c0 28-27 54-60 68C27 146 0 120 0 92z" fill="#111" stroke="${silver}" stroke-width="5"/>
    <path d="M13 25h94v42H13z" fill="${orange}" opacity=".9"/>
    <text x="60" y="54" text-anchor="middle" fill="${white}" font-family="Arial Black, Impact, sans-serif" font-size="27">RTBO</text>
    <path d="M18 85h84" stroke="${silver}" stroke-width="5"/>
    <circle cx="60" cy="106" r="25" fill="${orange}" stroke="#111" stroke-width="5"/>
    <path d="M35 106h50M60 81v50M43 88c18 13 18 24 0 36M77 88c-18 13-18 24 0 36" stroke="#111" stroke-width="4" fill="none"/>
  </g>`;
}

function shirt(title, subtitle, options = {}) {
  const long = options.long ? 1 : 0;
  const zip = options.zip ? 1 : 0;
  const pocket = options.pocket ? 1 : 0;
  const body = `
  <g filter="url(#shadow)">
    <path d="M338 198 454 132h292l116 66 118 145-126 97-62-82v328H408V358l-62 82-126-97z" fill="#f3f4f6" stroke="${silver}" stroke-width="6"/>
    <path d="M454 132c28 54 70 81 146 81s118-27 146-81l-54 136H508z" fill="#111"/>
    <path d="M407 352v334h386V352c-100 34-285 34-386 0z" fill="#fafafa"/>
    <path d="M430 360c36 170 30 236 0 326h46c31-92 35-168 2-326zM520 372c25 162 24 228-4 314h44c26-88 28-157 0-314zM616 372c20 160 18 230-7 314h44c25-87 27-157 2-314zM708 360c-30 166-24 236 5 326h48c-33-92-36-168-2-326z" fill="#d1d5db"/>
    <path d="M408 632h384v54H408z" fill="url(#orangeGlow)"/>
    <path d="M408 686h384v42H408z" fill="#111"/>
    ${long ? '<path d="M220 343 139 520l102 48 105-128zM980 343l81 177-102 48-105-128z" fill="#111" stroke="#d6dde6" stroke-width="6"/>' : '<path d="M220 343 302 453l44-13-126-97zM980 343 898 453l-44-13 126-97z" fill="#111" stroke="#d6dde6" stroke-width="6"/>'}
    ${zip ? `<path d="M600 218v178" stroke="${silver}" stroke-width="7"/><rect x="587" y="300" width="26" height="58" rx="5" fill="${orange}"/>` : ''}
    ${pocket ? `<path d="M652 374h96v78c-26 17-66 17-96 0z" fill="none" stroke="#111" stroke-width="6"/>` : ''}
    ${rtboMark(528, 318, 0.74)}
  </g>`;
  return shell(title, subtitle, body);
}

function jacket(title, subtitle) {
  const body = `
  <g filter="url(#shadow)">
    <path d="M336 188 470 122h260l134 66 96 520H240z" fill="#111827" stroke="${silver}" stroke-width="7"/>
    <path d="M470 122 600 286 730 122l-25 590H495z" fill="#111"/>
    <path d="M600 286v420" stroke="${silver}" stroke-width="8"/>
    <path d="M288 476h624M316 644h568" stroke="${orange}" stroke-width="22"/>
    <path d="M328 220 216 515M872 220l112 295" stroke="${silver}" stroke-width="16" opacity=".72"/>
    ${rtboMark(528, 336, 0.74)}
  </g>`;
  return shell(title, subtitle, body);
}

function tracksuit(title, subtitle) {
  const body = `
  <g filter="url(#shadow)">
    <path d="M274 174 420 112h180l38 96-84 104v230H316V312l-84-104z" fill="#111827" stroke="${silver}" stroke-width="7"/>
    <path d="M600 112h180l146 62 42 34-84 104v230H646V312l-84-104z" fill="#111827" stroke="${silver}" stroke-width="7"/>
    <path d="M316 488h238v250H316zM646 488h238v250H646z" fill="#0b0d10" stroke="${silver}" stroke-width="7"/>
    <path d="M347 652h176M677 652h176M316 540h238M646 540h238" stroke="${orange}" stroke-width="18"/>
    ${rtboMark(386, 294, 0.56)}
    ${rtboMark(716, 294, 0.56)}
  </g>`;
  return shell(title, subtitle, body);
}

function whistle(title, subtitle) {
  const body = `
  <g filter="url(#shadow)" transform="translate(105 70) rotate(-12 500 350)">
    <path d="M276 390c0-108 88-196 196-196h242c92 0 166 74 166 166s-74 166-166 166H472c-108 0-196-28-196-136z" fill="#111" stroke="${silver}" stroke-width="12"/>
    <circle cx="714" cy="360" r="104" fill="#050505" stroke="${silver}" stroke-width="14"/>
    <circle cx="714" cy="360" r="54" fill="#0b0d10" stroke="#334155" stroke-width="8"/>
    <path d="M302 458 162 526l140 80h306l36-80H366z" fill="#111" stroke="${silver}" stroke-width="10"/>
    <rect x="372" y="248" width="244" height="90" rx="14" fill="${orange}"/>
    <text x="494" y="308" text-anchor="middle" fill="${white}" font-family="Arial Black, Impact, sans-serif" font-size="42">FOX 40</text>
    <path d="M822 202c24-70 104-92 158-44" fill="none" stroke="${silver}" stroke-width="22" stroke-linecap="round"/>
    <path d="M162 526h280" stroke="${orange}" stroke-width="12"/>
  </g>`;
  return shell(title, subtitle, body);
}

function lanyard(title, subtitle) {
  const body = `
  <g filter="url(#shadow)">
    <path d="M334 168c150-88 382-88 532 0" fill="none" stroke="${silver}" stroke-width="42" stroke-linecap="round"/>
    <path d="M334 168c150-88 382-88 532 0" fill="none" stroke="#111" stroke-width="26" stroke-linecap="round"/>
    <text x="600" y="134" text-anchor="middle" fill="${orange}" font-family="Arial Black, Impact, sans-serif" font-size="34">RAISING THE BAR OFFICIATING</text>
    <path d="M512 280h176l32 250H480z" fill="#111" stroke="${silver}" stroke-width="8"/>
    <circle cx="600" cy="284" r="34" fill="#0b0d10" stroke="${orange}" stroke-width="8"/>
    <path d="M430 530h340l-62 118H492z" fill="#111" stroke="${silver}" stroke-width="8"/>
    <rect x="516" y="354" width="168" height="68" rx="12" fill="${orange}"/>
    <text x="600" y="400" text-anchor="middle" fill="${white}" font-family="Arial Black, Impact, sans-serif" font-size="34">FOX 40</text>
  </g>`;
  return shell(title, subtitle, body);
}

function clipboard(title, subtitle) {
  const body = `
  <g filter="url(#shadow)">
    <rect x="330" y="138" width="540" height="590" rx="26" fill="#f8fafc" stroke="${silver}" stroke-width="10"/>
    <rect x="480" y="100" width="240" height="84" rx="20" fill="#111" stroke="${silver}" stroke-width="8"/>
    <rect x="382" y="218" width="436" height="398" rx="10" fill="none" stroke="#111" stroke-width="8"/>
    <path d="M600 218v398M382 417h436M494 218v398M706 218v398" stroke="#111" stroke-width="5" opacity=".6"/>
    <circle cx="600" cy="417" r="86" fill="none" stroke="${orange}" stroke-width="8"/>
    <path d="M382 330h112M706 330h112M382 504h112M706 504h112" stroke="${orange}" stroke-width="8"/>
    ${rtboMark(522, 626, 0.68)}
  </g>`;
  return shell(title, subtitle, body);
}

function hat(title, subtitle, skull = false) {
  const body = skull ? `
  <g filter="url(#shadow)">
    <path d="M286 510c20-188 140-314 314-314s294 126 314 314z" fill="#111" stroke="${silver}" stroke-width="9"/>
    <rect x="286" y="492" width="628" height="116" rx="24" fill="#0b0d10" stroke="${silver}" stroke-width="9"/>
    <path d="M350 520h500" stroke="${orange}" stroke-width="22"/>
    ${rtboMark(528, 324, 0.74)}
  </g>` : `
  <g filter="url(#shadow)">
    <path d="M296 464c68-172 192-260 376-220 116 24 186 104 232 220z" fill="#111" stroke="${silver}" stroke-width="9"/>
    <path d="M254 474c156 28 356 18 650 0 72 20 112 54 128 104-268 60-548 58-866 8 10-54 38-92 88-112z" fill="#0b0d10" stroke="${silver}" stroke-width="9"/>
    <path d="M332 486c184 22 372 18 564 0" stroke="${orange}" stroke-width="18"/>
    ${rtboMark(542, 312, 0.58)}
  </g>`;
  return shell(title, subtitle, body);
}

function scarf(title, subtitle) {
  const body = `
  <g filter="url(#shadow)" transform="translate(0 26)">
    <rect x="184" y="292" width="832" height="178" rx="24" fill="#111" stroke="${silver}" stroke-width="9"/>
    <path d="M210 330h780M210 430h780" stroke="${orange}" stroke-width="24"/>
    <path d="M218 470v94M284 470v94M916 470v94M982 470v94" stroke="${silver}" stroke-width="18" stroke-linecap="round"/>
    <text x="600" y="404" text-anchor="middle" fill="${white}" font-family="Arial Black, Impact, sans-serif" font-size="58">RAISING THE BAR</text>
    ${rtboMark(92, 304, 0.5)}
    ${rtboMark(988, 304, 0.5)}
  </g>`;
  return shell(title, subtitle, body);
}

function backpack(title, subtitle, suitcase = false, duffle = false) {
  const body = suitcase ? `
  <g filter="url(#shadow)">
    <rect x="390" y="150" width="420" height="560" rx="42" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <rect x="462" y="204" width="276" height="366" rx="26" fill="#0b0d10" stroke="#334155" stroke-width="7"/>
    <path d="M498 122h204M504 710v66M696 710v66" stroke="${silver}" stroke-width="18" stroke-linecap="round"/>
    <path d="M430 610h340" stroke="${orange}" stroke-width="22"/>
    ${rtboMark(520, 294, 0.72)}
  </g>` : duffle ? `
  <g filter="url(#shadow)">
    <path d="M254 354c40-96 116-144 226-144h240c110 0 186 48 226 144l46 260H208z" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <path d="M414 246c24-84 348-84 372 0" fill="none" stroke="${silver}" stroke-width="24" stroke-linecap="round"/>
    <rect x="314" y="410" width="572" height="150" rx="26" fill="#0b0d10" stroke="#334155" stroke-width="7"/>
    <path d="M260 612h680" stroke="${orange}" stroke-width="20"/>
    ${rtboMark(522, 408, 0.68)}
  </g>` : `
  <g filter="url(#shadow)">
    <rect x="378" y="154" width="444" height="580" rx="70" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <path d="M438 174c20-90 304-90 324 0M378 346H248M822 346h130M312 370v300M888 370v300" stroke="${silver}" stroke-width="26" stroke-linecap="round"/>
    <rect x="454" y="400" width="292" height="230" rx="28" fill="#0b0d10" stroke="#334155" stroke-width="7"/>
    <path d="M454 474h292M414 666h372" stroke="${orange}" stroke-width="18"/>
    ${rtboMark(520, 238, 0.72)}
  </g>`;
  return shell(title, subtitle, body);
}

function shoes(title, subtitle, socks = false) {
  const body = socks ? `
  <g filter="url(#shadow)">
    <path d="M390 174h184v394c0 76-62 138-138 138h-46zM626 174h184v532h-46c-76 0-138-62-138-138z" fill="#f8fafc" stroke="${silver}" stroke-width="9"/>
    <path d="M390 512h184M626 512h184M390 592h184M626 592h184" stroke="${orange}" stroke-width="22"/>
    ${rtboMark(424, 248, 0.42)}
    ${rtboMark(662, 248, 0.42)}
  </g>` : `
  <g filter="url(#shadow)">
    <path d="M178 518c118-84 210-158 284-254 78 36 142 106 192 210 116 12 210 54 276 126 14 16 8 56-20 62H230c-74 0-104-98-52-144z" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <path d="M542 488c94-48 188-44 282 0" fill="none" stroke="${orange}" stroke-width="16" stroke-linecap="round"/>
    <path d="M252 604h640" stroke="${orange}" stroke-width="18"/>
    <path d="M438 326 340 494M512 378 402 526M584 442 482 558" stroke="${silver}" stroke-width="10" stroke-linecap="round"/>
    ${rtboMark(666, 502, 0.42)}
  </g>`;
  return shell(title, subtitle, body);
}

function drinkware(title, subtitle, kind = 'mug') {
  const body = kind === 'mug' ? `
  <g filter="url(#shadow)">
    <path d="M382 260h394v318c0 82-66 148-148 148h-98c-82 0-148-66-148-148z" fill="#f8fafc" stroke="${silver}" stroke-width="9"/>
    <path d="M776 356h94c66 0 120 54 120 120s-54 120-120 120h-94v-70h86c28 0 50-22 50-50s-22-50-50-50h-86z" fill="#111" stroke="${silver}" stroke-width="9"/>
    <rect x="382" y="500" width="394" height="72" fill="${orange}"/>
    ${rtboMark(518, 320, 0.72)}
  </g>` : `
  <g filter="url(#shadow)">
    <path d="M484 142h232l-34 86H518z" fill="#111" stroke="${silver}" stroke-width="9"/>
    <path d="M438 228h324l-42 498H480z" fill="${kind === 'bottle' ? '#f8fafc' : '#111827'}" stroke="${silver}" stroke-width="9"/>
    <path d="M462 548h276" stroke="${orange}" stroke-width="34"/>
    ${rtboMark(522, 318, 0.68)}
  </g>`;
  return shell(title, subtitle, body);
}

function kit(title, subtitle) {
  const body = `
  <g filter="url(#shadow)">
    <rect x="300" y="250" width="600" height="360" rx="42" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <path d="M400 250c0-80 400-80 400 0" fill="none" stroke="${silver}" stroke-width="22" stroke-linecap="round"/>
    <path d="M300 412h600" stroke="${orange}" stroke-width="22"/>
    <rect x="402" y="462" width="76" height="112" rx="16" fill="#f8fafc"/>
    <rect x="520" y="452" width="76" height="122" rx="16" fill="#0b0d10" stroke="${silver}" stroke-width="6"/>
    <rect x="640" y="462" width="116" height="70" rx="16" fill="#f8fafc"/>
    ${rtboMark(530, 296, 0.56)}
  </g>`;
  return shell(title, subtitle, body);
}

function pass(title, subtitle, training = false) {
  const body = `
  <g filter="url(#shadow)">
    <rect x="250" y="200" width="700" height="420" rx="34" fill="#111827" stroke="${silver}" stroke-width="9"/>
    <path d="M250 292h700" stroke="${orange}" stroke-width="34"/>
    <text x="600" y="386" text-anchor="middle" fill="${white}" font-family="Arial Black, Impact, sans-serif" font-size="58">${training ? 'FILM LAB' : 'ELITE OFFICIAL'}</text>
    <text x="600" y="448" text-anchor="middle" fill="${silver}" font-family="Arial, sans-serif" font-size="30">${training ? 'TRAINING ACCESS' : 'MEMBERSHIP ACCESS'}</text>
    ${rtboMark(522, 468, 0.68)}
  </g>`;
  return shell(title, subtitle, body);
}

const assets = {
  'rtbo-jersey-pro.svg': shirt('RTBO PRO REFEREE JERSEY', 'Black, white, and orange official jersey'),
  'rtbo-performance-polo.svg': shirt('RTBO PERFORMANCE POLO', 'Professional staff and clinician polo'),
  'rtbo-quarterzip-long-pocket.svg': shirt('QUARTER ZIP LONG SLEEVE', 'Long sleeve quarter zip with pocket', { long: true, zip: true, pocket: true }),
  'rtbo-quarterzip-short.svg': shirt('QUARTER ZIP SHORT SLEEVE', 'Short sleeve quarter zip training shirt', { zip: true }),
  'rtbo-training-tshirt.svg': shirt('RTBO TRAINING T-SHIRT', 'Daily training and film lab shirt'),
  'rtbo-windbreaker.svg': jacket('RTBO WINDBREAKER', 'Lightweight travel and event jacket'),
  'rtbo-track-suit.svg': tracksuit('RTBO TRACK SUIT', 'Two-piece travel and warmup suit'),
  'fox40-classic-black.svg': whistle('FOX 40 CLASSIC WHISTLE', 'Black official whistle'),
  'fox40-rtbo-lanyard.svg': lanyard('FOX 40 RTBO LANYARD', 'Whistle lanyard with RTBO branding'),
  'rtbo-official-clipboard.svg': clipboard('OFFICIAL CLIPBOARD', 'Court board and assignment notes'),
  'rtbo-flexfit-hat.svg': hat('RTBO FLEXFIT HAT', 'Structured black official cap'),
  'rtbo-skull-cap.svg': hat('RTBO SKULL CAP', 'Cold-weather official skull cap', true),
  'rtbo-scarf.svg': scarf('RTBO SCARF', 'Black and orange supporter scarf'),
  'rtbo-official-backpack.svg': backpack('RTBO OFFICIAL BACKPACK', 'Daily gear and travel backpack'),
  'athletes-are-us-backpack.svg': backpack('ATHLETES ARE US BACKPACK', 'Structured training backpack'),
  'ironbackpack-travel.svg': backpack('IRONBACKPACK TRAVEL PACK', 'Travel-ready official backpack'),
  'rtbo-duffle-bag.svg': backpack('RTBO DUFFLE BAG', 'Officials gear duffle bag', false, true),
  'rtbo-travel-luggage.svg': backpack('RTBO TRAVEL LUGGAGE', 'Rolling tournament luggage', true),
  'official-running-shoes.svg': shoes('OFFICIAL RUNNING SHOES', 'Court movement and training shoes'),
  'rtbo-official-socks.svg': shoes('RTBO OFFICIAL SOCKS', 'Comfort socks for court work', true),
  'rtbo-coffee-mug.svg': drinkware('RTBO COFFEE MUG', 'Ceramic official-development mug'),
  'rtbo-tumbler.svg': drinkware('RTBO TUMBLER', 'Insulated travel tumbler', 'tumbler'),
  'rtbo-water-bottle.svg': drinkware('RTBO WATER BOTTLE', 'Training hydration bottle', 'bottle'),
  'rtbo-hygiene-kit.svg': kit('OFFICIAL HYGIENE KIT', 'Travel hygiene kit for officials'),
  'elite-official-membership.svg': pass('ELITE OFFICIAL MEMBERSHIP', 'Membership access and benefits'),
  'film-lab-training-pass.svg': pass('FILM LAB TRAINING PASS', 'Digital training and film access', true)
};

for (const [filename, svg] of Object.entries(assets)) {
  fs.writeFileSync(path.join(outDir, filename), svg);
}

console.log(`Generated ${Object.keys(assets).length} RTBO shop merchandise assets in ${path.relative(process.cwd(), outDir)}`);
