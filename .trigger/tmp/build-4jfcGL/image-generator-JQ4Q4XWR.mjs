import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/lib/image-generator.ts
init_esm();
function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(escapeXml, "escapeXml");
function wrapText(text, maxCharsPerLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine && current) {
      lines.push(current.trimEnd());
      current = word + " ";
    } else {
      current += word + " ";
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines;
}
__name(wrapText, "wrapText");
async function generatePostImage(text, brandName, primaryColor, accentColor) {
  const W = 1080;
  const H = 1080;
  const FONT_SIZE = 44;
  const LINE_H = 64;
  const MAX_CHARS = 32;
  const MAX_LINES = 12;
  const truncated = text.length > 600 ? text.slice(0, 597) + "..." : text;
  const lines = wrapText(truncated, MAX_CHARS).slice(0, MAX_LINES);
  const blockH = lines.length * LINE_H;
  const startY = (H - blockH) / 2 + FONT_SIZE;
  const textSvg = lines.map(
    (line, i) => `<text x="540" y="${startY + i * LINE_H}"
          font-family="Arial, sans-serif" font-size="${FONT_SIZE}"
          fill="white" text-anchor="middle">${escapeXml(line)}</text>`
  ).join("\n");
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${primaryColor}"/>
    <rect x="60" y="60" width="960" height="960" rx="24" ry="24" fill="rgba(0,0,0,0.18)"/>
    ${textSvg}
    <text x="540" y="1024" font-family="Arial, sans-serif" font-size="30"
      fill="${accentColor}" text-anchor="middle" font-weight="700"
    >${escapeXml(brandName)}</text>
  </svg>`;
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}
__name(generatePostImage, "generatePostImage");
export {
  generatePostImage
};
//# sourceMappingURL=image-generator-JQ4Q4XWR.mjs.map
