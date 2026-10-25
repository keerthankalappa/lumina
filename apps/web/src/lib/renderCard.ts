import { STUDIO_PALETTES, STUDIO_TYPE, type StudioAura, type StudioPalette, type StudioTypography } from "./palettes";

export type CardSpec = {
  text: string;
  attribution?: string;
  palette: StudioPalette;
  aura: StudioAura;
  typography: StudioTypography;
  footer?: string;
};

/** Mulberry32 — deterministic randomness so the same mantra always renders the same art. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7);

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders a print-ready 4:5 mantra card (1600×2000 by default) to a PNG blob. */
export async function renderCard(spec: CardSpec, width = 1600, height = 2000): Promise<Blob> {
  const p = STUDIO_PALETTES[spec.palette];
  const type = STUDIO_TYPE[spec.typography];
  const font = (size: number, italic = type.italic, weight = type.weight, family = type.family) =>
    `${italic ? "italic " : ""}${weight} ${size}px "${family}"`;
  await Promise.all([
    document.fonts.load(font(80)),
    document.fonts.load(`600 30px "Plus Jakarta Sans"`),
    document.fonts.load(`italic 400 40px "Playfair Display"`),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(hash(spec.text + spec.palette + spec.aura));

  const bg = ctx.createLinearGradient(0, 0, width * 0.4, height);
  bg.addColorStop(0, p.from);
  bg.addColorStop(1, p.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Aura layer
  ctx.save();
  if (spec.aura === "luminous-glow") {
    for (let i = 0; i < 4; i++) {
      const x = width * (0.2 + rand() * 0.6);
      const y = height * (0.15 + rand() * 0.7);
      const r = width * (0.35 + rand() * 0.3);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (spec.aura === "petal-waves") {
    ctx.strokeStyle = p.accent;
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = 0.06 + i * 0.006;
      ctx.lineWidth = 3 + i * 0.6;
      ctx.beginPath();
      const base = height * 0.6 + i * 34;
      for (let x = 0; x <= width; x += 20) {
        const y = base + Math.sin(x / 180 + i * 0.6) * 60 + Math.cos(x / 90 + i) * 18;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (spec.aura === "starlight") {
    for (let i = 0; i < 220; i++) {
      ctx.globalAlpha = 0.15 + rand() * 0.6;
      ctx.fillStyle = spec.palette === "midnight" ? "#ffe9c4" : "#ffffff";
      ctx.beginPath();
      ctx.arc(rand() * width, rand() * height, rand() * 3.2 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * 22;
      img.data[i]! += n;
      img.data[i + 1]! += n;
      img.data[i + 2]! += n;
    }
    ctx.putImageData(img, 0, 0);
  }
  ctx.restore();

  const pad = width * 0.1;
  ctx.fillStyle = p.ink;
  ctx.textBaseline = "alphabetic";

  // Header
  ctx.font = `700 ${width * 0.018}px "Plus Jakarta Sans"`;
  ctx.globalAlpha = 0.75;
  ctx.letterSpacing = "6px";
  ctx.fillText("LUMINA MINDFULNESS", pad, pad);
  ctx.globalAlpha = 1;
  ctx.letterSpacing = "0px";

  // Quote mark
  ctx.font = font(width * 0.16, false, 600, "Playfair Display");
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.25;
  ctx.textAlign = "center";
  ctx.fillText("“", width / 2, height * 0.3);
  ctx.globalAlpha = 1;

  // Body text — shrink to fit
  ctx.fillStyle = p.ink;
  let size = width * 0.064;
  let lines: string[] = [];
  for (; size > width * 0.03; size -= 4) {
    ctx.font = font(size);
    lines = wrap(ctx, spec.text, width - pad * 2);
    if (lines.length * size * 1.35 < height * 0.45) break;
  }
  const lineHeight = size * 1.35;
  const blockTop = height * 0.5 - (lines.length * lineHeight) / 2 + size * 0.4;
  lines.forEach((l, i) => ctx.fillText(l, width / 2, blockTop + i * lineHeight));

  if (spec.attribution) {
    ctx.font = `italic 400 ${width * 0.026}px "Playfair Display"`;
    ctx.fillStyle = p.accent;
    ctx.fillText(`— ${spec.attribution} —`, width / 2, blockTop + lines.length * lineHeight + size * 0.6);
  }

  // Footer
  ctx.textAlign = "left";
  ctx.font = `600 ${width * 0.016}px "Plus Jakarta Sans"`;
  ctx.fillStyle = p.ink;
  ctx.globalAlpha = 0.65;
  ctx.fillText(spec.footer ?? "Daily Sanctuary Grounding", pad, height - pad * 0.8);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }), width - pad, height - pad * 0.8);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Render failed"))), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "mantra";
