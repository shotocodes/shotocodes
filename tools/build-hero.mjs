/*
 * build-hero.mjs
 * Generates an isometric hero illustration as a standalone SVG.
 * Theme: "Building products" — a developer / designer workspace.
 *
 * Run: node tools/build-hero.mjs
 * Output: assets/hero-isometric.svg
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/* ----------------------------------------------------------------------- *
 * Isometric projection (2:1 dimetric)
 *   +x -> lower-right,  +y -> lower-left,  +z -> up
 * ----------------------------------------------------------------------- */
const TILE = 26;          // horizontal half-tile (px per unit on x/y)
const TILE_Y = TILE / 2;  // vertical half-tile
const UZ = 22;            // px per unit of height
const ORIGIN = { x: 600, y: 430 };

function iso(x, y, z = 0) {
  return {
    x: ORIGIN.x + (x - y) * TILE,
    y: ORIGIN.y + (x + y) * TILE_Y - z * UZ,
  };
}
const P = (p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
const poly = (pts, fill, extra = "") =>
  `<polygon points="${pts.map(P).join(" ")}" fill="${fill}"${extra ? " " + extra : ""}/>`;

/* ----------------------------------------------------------------------- *
 * Colour helpers — derive shaded faces from one base colour
 * ----------------------------------------------------------------------- */
function hexToRgb(h) {
  h = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHex(r) {
  return "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function shade(hex, f) {
  return rgbToHex(hexToRgb(hex).map((v) => v * f));
}
// top = base, left = 0.80, right = 0.62  (light comes from upper-left-ish)
function faces(base) {
  return { top: base, left: shade(base, 0.80), right: shade(base, 0.62) };
}

/* ----------------------------------------------------------------------- *
 * Box primitive — an axis-aligned cuboid
 * ----------------------------------------------------------------------- */
function box(x, y, z, dx, dy, dz, base, opts = {}) {
  const c = typeof base === "string" ? faces(base) : base;
  const x1 = x + dx, y1 = y + dy, z1 = z + dz;

  const topF = [iso(x, y, z1), iso(x1, y, z1), iso(x1, y1, z1), iso(x, y1, z1)];
  const rightF = [iso(x1, y, z), iso(x1, y1, z), iso(x1, y1, z1), iso(x1, y, z1)];
  const leftF = [iso(x, y1, z), iso(x1, y1, z), iso(x1, y1, z1), iso(x, y1, z1)];

  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw || 1}" stroke-linejoin="round"` : "";
  return (
    poly(leftF, c.left, stroke) +
    poly(rightF, c.right, stroke) +
    poly(topF, c.top, stroke)
  );
}

/* A floating shadow ellipse on the ground (z=0 plane) */
function groundShadow(cx, cy, rx, opacity = 0.18) {
  const p = iso(cx, cy, 0);
  return `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${rx}" ry="${(rx / 2).toFixed(1)}" fill="#0a0820" opacity="${opacity}"/>`;
}

/* A flat tile (rounded look via thin box) used for floating UI cards */
function card(x, y, z, dx, dy, base, accent) {
  const thick = 0.18;
  let s = box(x, y, z, dx, dy, thick, base);
  // accent strip on the top face (a thinner tile sitting just above)
  const m = 0.18;
  s += poly(
    [
      iso(x + m, y + m, z + thick + 0.001),
      iso(x + dx - m, y + m, z + thick + 0.001),
      iso(x + dx - m, y + dy * 0.5, z + thick + 0.001),
      iso(x + m, y + dy * 0.5, z + thick + 0.001),
    ],
    accent,
    'opacity="0.95"'
  );
  return s;
}

/* ----------------------------------------------------------------------- *
 * Scene
 * ----------------------------------------------------------------------- */
const parts = [];

// ---- Base platform (rounded violet slab) -------------------------------
const PLAT = "#6d5efc";
parts.push(`<g filter="url(#softShadow)">`);
parts.push(box(-7, -5, 0, 14, 11, 1.1, PLAT));
parts.push(`</g>`);
// subtle inner top highlight
parts.push(
  poly(
    [iso(-6.4, -4.4, 1.101), iso(6.4, -4.4, 1.101), iso(6.4, 4.4, 1.101), iso(-6.4, 4.4, 1.101)],
    shade(PLAT, 1.08),
    'opacity="0.35"'
  )
);

// ---- Desk slab ---------------------------------------------------------
const DESK = "#2b2456";
parts.push(box(-5, -3.2, 1.1, 9, 5.6, 0.5, DESK));

/* ===== Monitor (back of desk) ===== */
// stand
parts.push(box(-0.4, 0.4, 1.6, 0.8, 0.5, 0.5, "#1c1840"));
parts.push(box(-1.1, 0.2, 1.6, 2.2, 0.18, 0.12, "#1c1840")); // foot
// screen body — a thin slab standing up, front face toward lower-right (+x face)
const SX = -1.2, SY = 1.0, SZ = 2.1;       // origin
const SDX = 0.22, SDY = 3.4, SDZ = 2.3;    // dims (thin in x, wide in y, tall z)
parts.push(box(SX, SY, SZ, SDX, SDY, SDZ, "#15122e"));

// screen glass = the +x face (front-right). Build its plane points.
const fx = SX + SDX + 0.002;
const sface = (y, z) => iso(fx, y, z);
const inset = 0.16;
const gy0 = SY + inset, gy1 = SY + SDY - inset;
const gz0 = SZ + inset, gz1 = SZ + SDZ - inset;
parts.push(poly([sface(gy0, gz0), sface(gy1, gz0), sface(gy1, gz1), sface(gy0, gz1)], "#0e1f3a"));
// screen gradient glow
parts.push(
  `<polygon points="${[sface(gy0, gz0), sface(gy1, gz0), sface(gy1, gz1), sface(gy0, gz1)]
    .map(P)
    .join(" ")}" fill="url(#screenGlow)" opacity="0.9"/>`
);
// code lines on the screen (parallelograms aligned to the plane)
const codeColors = ["#7dd3fc", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#7dd3fc", "#94a3b8"];
let cz = gz1 - 0.32;
const lineT = 0.12;
const indents = [0, 0.5, 0.9, 0.9, 0.5, 0, 0.5];
const lens = [1.6, 2.0, 1.3, 1.7, 1.1, 2.2, 1.4];
for (let i = 0; i < 7; i++) {
  const ya = gy0 + 0.18 + indents[i];
  const yb = ya + lens[i];
  parts.push(
    poly(
      [sface(ya, cz), sface(yb, cz), sface(yb, cz + lineT), sface(ya, cz + lineT)],
      codeColors[i % codeColors.length],
      'opacity="0.92" rx="2"'
    )
  );
  cz -= 0.28;
}

/* ===== Keyboard + laptop trackpad in front ===== */
parts.push(box(-0.6, -2.4, 1.6, 2.6, 1.2, 0.12, "#3b3470"));
// keys hint
for (let r = 0; r < 3; r++) {
  for (let cc = 0; cc < 6; cc++) {
    const kx = -0.4 + cc * 0.38;
    const ky = -2.2 + r * 0.34;
    parts.push(box(kx, ky, 1.72, 0.26, 0.22, 0.05, "#524a92"));
  }
}

/* ===== Coffee mug ===== */
parts.push(box(2.6, -2.2, 1.6, 0.7, 0.7, 0.85, "#ef5d60"));
parts.push(
  `<ellipse cx="${iso(2.95, -1.85, 2.45).x.toFixed(1)}" cy="${iso(2.95, -1.85, 2.45).y.toFixed(1)}" rx="10" ry="5" fill="#3a1d1d"/>`
);
// steam
parts.push(
  `<path d="${steam(iso(2.95, -1.85, 2.45))}" stroke="#ffffff" stroke-width="2.2" fill="none" opacity="0.35" stroke-linecap="round"/>`
);
function steam(p) {
  const x = p.x, y = p.y - 6;
  return `M ${x - 4} ${y} c -5 -8 6 -12 0 -22 M ${x + 5} ${y - 2} c -5 -8 6 -12 0 -22`;
}

/* ===== Plant ===== */
parts.push(box(-4.1, -2.5, 1.6, 1.0, 1.0, 0.9, "#d98e5a")); // pot
const potTop = iso(-3.6, -2.0, 2.5);
const leaf = (dx, dy, w, h, col) =>
  `<ellipse cx="${(potTop.x + dx).toFixed(1)}" cy="${(potTop.y + dy).toFixed(1)}" rx="${w}" ry="${h}" fill="${col}" transform="rotate(${(dx * 2).toFixed(1)} ${(potTop.x + dx).toFixed(1)} ${(potTop.y + dy).toFixed(1)})"/>`;
parts.push(leaf(0, -26, 9, 20, "#2f9e6b"));
parts.push(leaf(-12, -16, 8, 18, "#37b27a"));
parts.push(leaf(12, -16, 8, 18, "#37b27a"));
parts.push(leaf(-6, -22, 7, 16, "#43c98a"));
parts.push(leaf(7, -21, 7, 16, "#43c98a"));

/* ===== Floating app cards (ENSO apps) in an arc ===== */
const appAccents = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
const appPos = [
  { x: 4.6, y: -3.6, z: 5.2 },
  { x: 5.4, y: -1.6, z: 6.4 },
  { x: 5.0, y: 0.6, z: 7.4 },
  { x: 3.8, y: 2.6, z: 6.6 },
  { x: 2.2, y: 3.8, z: 5.6 },
];
appPos.forEach((p, i) => {
  parts.push(`<g filter="url(#cardShadow)">`);
  parts.push(card(p.x, p.y, p.z, 1.5, 1.5, "#efeefb", appAccents[i]));
  parts.push(`</g>`);
});

/* ===== Floating accent solids ===== */
parts.push(`<g filter="url(#cardShadow)">`);
parts.push(box(-6.2, 2.4, 4.6, 1.1, 1.1, 1.1, "#ffb454")); // amber cube
parts.push(`</g>`);
parts.push(`<g filter="url(#cardShadow)">`);
parts.push(box(-4.6, 4.2, 6.4, 0.8, 0.8, 0.8, "#5ad1c7")); // teal cube
parts.push(`</g>`);
// sphere
const sp = iso(-6.6, -2.4, 6.2);
parts.push(
  `<circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="20" fill="url(#sphere)"/>`
);

/* ----------------------------------------------------------------------- *
 * Assemble SVG document
 * ----------------------------------------------------------------------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760" role="img" aria-label="Isometric illustration of a developer workspace building products">
  <defs>
    <radialGradient id="bg" cx="42%" cy="36%" r="85%">
      <stop offset="0%" stop-color="#2a2150"/>
      <stop offset="55%" stop-color="#1b1638"/>
      <stop offset="100%" stop-color="#100d24"/>
    </radialGradient>
    <radialGradient id="glow" cx="48%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#6d5efc" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="#6d5efc" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0e1f3a" stop-opacity="0.1"/>
    </linearGradient>
    <radialGradient id="sphere" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#f9a8d4"/>
      <stop offset="60%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#9d174d"/>
    </radialGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="26" stdDeviation="22" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="cardShadow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.30"/>
    </filter>
  </defs>

  <rect width="1200" height="760" fill="url(#bg)"/>
  <rect width="1200" height="760" fill="url(#glow)"/>

  <!-- decorative dotted grid -->
  <g fill="#6d5efc" opacity="0.10">
    ${gridDots()}
  </g>

  ${parts.join("\n  ")}
</svg>
`;

function gridDots() {
  let d = "";
  for (let i = 0; i < 70; i++) {
    const x = (i * 137) % 1200;
    const y = (i * 89) % 760;
    if (y > 120 && y < 640 && x > 220 && x < 1000) continue;
    d += `<circle cx="${x}" cy="${y}" r="2"/>`;
  }
  return d;
}

const out = "assets/hero-isometric.svg";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log("Wrote", out, `(${svg.length} bytes)`);
