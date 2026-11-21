// passport/card.js — draws the WAGO Passport as a clean 1600×900 PNG (browser only), in the Touch Grass sticker style.
// Contains the selected artwork, the display name, verified collection counts and (opt-in) Proof of Grass stats.
// It never contains a wallet address or any dashboard controls.
export const PASSPORT_W = 1600, PASSPORT_H = 900;
export const PP = { ink: "#14110d", orange: "#ff7a0a", orange2: "#ff9a2e", yellow: "#ffd60a", green: "#2fbf4f", greenD: "#1c8a35", lime: "#b6f06a", paper: "#fffaf0" };
const DISPLAY = "Fredoka,'Nunito',system-ui,sans-serif", SANS = "Nunito,system-ui,sans-serif";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight, family) {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
  return px;
}
function loadImage(src, cors = true) {
  return new Promise((res, rej) => {
    const im = new Image(); if (cors) im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => rej(new Error("image failed to load")); im.src = src;
  });
}
// outlined sticker shape with a hard offset shadow
function sticker(ctx, x, y, w, h, r, fill, lw = 7, off = 9) {
  ctx.fillStyle = PP.ink; rr(ctx, x, y + off, w, h, r); ctx.fill();
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = PP.ink; ctx.lineJoin = "round"; rr(ctx, x, y, w, h, r); ctx.stroke();
}
// white text with a thick black outline, like the logo
function outlined(ctx, text, x, y, lw, fill = "#fff") {
  ctx.lineJoin = "round"; ctx.lineWidth = lw; ctx.strokeStyle = PP.ink; ctx.strokeText(text, x, y + 5);
  ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

// WAGO is a sun with exactly 7 rays.
function sunburst(ctx, cx, cy, len, rot) {
  const step = (Math.PI * 2) / 14;
  ctx.fillStyle = "rgba(255,214,10,0.20)";
  for (let i = 0; i < 14; i += 2) {
    const a = rot + i * step; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.lineTo(cx + Math.cos(a + step) * len, cy + Math.sin(a + step) * len); ctx.closePath(); ctx.fill();
  }
}
function miniSun(ctx, cx, cy, r, color) {
  ctx.save(); ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.strokeStyle = color; ctx.lineWidth = r * 0.34;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); ctx.lineTo(Math.cos(a) * r * 2.2, Math.sin(a) * r * 2.2); ctx.stroke(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function grass(ctx) {
  const W = PASSPORT_W, H = PASSPORT_H;
  ctx.fillStyle = PP.greenD; ctx.strokeStyle = PP.ink; ctx.lineWidth = 6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 40; x += 40) { const up = 46 + ((x / 40) % 3) * 14; ctx.lineTo(x - 14, H - 26); ctx.quadraticCurveTo(x - 6, H - up, x + 4, H - up - 16); ctx.quadraticCurveTo(x + 14, H - up + 6, x + 22, H - 26); }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function tile(ctx, x, y, w, h, st, fill, icons) {
  sticker(ctx, x, y, w, h, 26, fill, 6, 8);
  const ic = 84, ix = x + 18, iy = y + (h - ic) / 2, tcx = ix + ic + (x + w - 16 - (ix + ic)) / 2;
  const im = icons[st.icon];
  if (im) ctx.drawImage(im, ix, iy, ic, ic);
  else { ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(ix + ic / 2, iy + ic / 2 + 4, ic / 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PP.yellow; ctx.beginPath(); ctx.arc(ix + ic / 2, iy + ic / 2, ic / 2, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; ctx.stroke(); miniSun(ctx, ix + ic / 2, iy + ic / 2, 11, PP.orange); }
  ctx.textAlign = "center"; ctx.fillStyle = PP.ink;
  ctx.font = `700 66px ${DISPLAY}`; ctx.fillText(String(st.value), tcx, y + 78);
  const lp = fit(ctx, st.label, x + w - 14 - (ix + ic + 8), 25, 16, 800, SANS); ctx.fillText(st.label, tcx, y + 117);
}

// piece: { name, artUrl }  stats: [{ value, label }] (max 4)
export async function renderPassport({ piece, displayName, edition, stats, grove }) {
  const W = PASSPORT_W, H = PASSPORT_H;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 80px Fredoka"), document.fonts.load("600 30px Fredoka"), document.fonts.load("800 24px Nunito")]); } catch {}
  const art = await loadImage(piece.artUrl);
  const icons = {};
  await Promise.all(["stamp-screen-toucher", "stamp-proofs", "stamp-streak", "stamp-grove"].map(async (n) => { try { icons[n] = await loadImage(`/passport/assets/${n}.png`, false); } catch {} }));
  let sunImg = null; try { sunImg = await loadImage("/passport/assets/sun.png", false); } catch {}
  let bgImg = null, frameImg = null; try { [bgImg, frameImg] = await Promise.all([loadImage("/passport/assets/bg.jpg", false), loadImage("/passport/assets/frame.png", false)]); } catch {}
  let mascot = null; try { mascot = await loadImage("/assets/brand/wago-cheer.png", false); } catch {}

  // sunrise orange + 7-ray burst
  if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H);
  else { const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, PP.orange2); bg.addColorStop(1, PP.orange); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); sunburst(ctx, 1180, 250, 1400, 0.1); }
  if (sunImg) { ctx.globalAlpha = 0.28; ctx.drawImage(sunImg, 880, 250, 600, 600); ctx.globalAlpha = 1; }
  if (!bgImg) grass(ctx);

  // artwork in a sticker frame
  const ax = 190, ay = 160, as = 580;
  sticker(ctx, ax - 18, ay - 18, as + 36, as + 36, 40, PP.paper, 8, 12);
  ctx.save(); rr(ctx, ax, ay, as, as, 26); ctx.clip();
  const s = Math.max(as / art.width, as / art.height), dw = art.width * s, dh = art.height * s;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art, ax + (as - dw) / 2, ay + (as - dh) / 2, dw, dh); ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = PP.ink; rr(ctx, ax, ay, as, as, 26); ctx.stroke();

  // name plate
  const plate = String(piece.name || "");
  ctx.textAlign = "center"; const px = fit(ctx, plate, 480, 40, 24, 700, DISPLAY);
  const pw = Math.min(600, ctx.measureText(plate).width + 90), ph = 74, plx = ax + as / 2 - pw / 2, ply = ay + as - 62;
  sticker(ctx, plx, ply, pw, ph, 22, PP.yellow, 6, 7);
  ctx.fillStyle = PP.ink; ctx.font = `700 ${px}px ${DISPLAY}`; ctx.fillText(plate, ax + as / 2, ply + ph / 2 + px * 0.34);

  // verified seal on the frame corner
  ctx.save(); ctx.translate(ax + as - 8, ay + 6); ctx.rotate(0.15);
  ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(0, 8, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PP.yellow; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = PP.ink; ctx.stroke();
  miniSun(ctx, 0, -14, 11, PP.orange);
  ctx.fillStyle = PP.ink; ctx.textAlign = "center"; ctx.font = `700 19px ${DISPLAY}`; if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
  ctx.fillText("VERIFIED", 0, 34); ctx.font = `700 14px ${DISPLAY}`; ctx.fillText(String(edition || "WAGO").split(" ")[0].toUpperCase(), 0, 52);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; ctx.restore();

  // right column
  const rx = 840, rw = 660;
  ctx.textAlign = "left"; ctx.font = `700 27px ${DISPLAY}`; if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  const label = String(edition || "").toUpperCase(), lw = ctx.measureText(label).width + 56;
  sticker(ctx, rx, 92, lw, 56, 28, PP.orange, 5, 6); ctx.fillStyle = "#fff"; ctx.fillText(label, rx + 28, 130);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  if (mascot) { const mh = 150, mw = (mascot.width / mascot.height) * mh; ctx.save(); ctx.shadowColor = "rgba(20,17,13,0.35)"; ctx.shadowOffsetY = 6; ctx.drawImage(mascot, rx + rw - mw - 40, 76, mw, mh); ctx.restore(); }

  ctx.textAlign = "left"; ctx.font = `600 32px ${DISPLAY}`; outlined(ctx, "WAGO PASSPORT", rx, 214, 8);
  const nameMax = rw - 20;
  fit(ctx, displayName, nameMax, 120, 52, 700, DISPLAY); outlined(ctx, displayName, rx, 340, 16);

  const list = (stats || []).slice(0, 4), fills = [PP.paper, PP.yellow, PP.lime, PP.paper];
  const tw = 316, th = 142, gap = 28, top = 408;
  list.forEach((st, i) => tile(ctx, rx + (i % 2) * (tw + gap), top + Math.floor(i / 2) * (th + 30), tw, th, st, fills[i], icons));

  if (grove && icons["stamp-grove"]) {
    const g = String(grove).slice(0, 28); ctx.textAlign = "left"; const gp = fit(ctx, g, 280, 30, 20, 700, DISPLAY), gw = ctx.measureText(g).width + 96;
    sticker(ctx, rx, 748, gw, 60, 30, PP.paper, 5, 6); ctx.drawImage(icons["stamp-grove"], rx + 6, 750, 52, 52);
    ctx.fillStyle = PP.ink; ctx.font = `700 ${gp}px ${DISPLAY}`; ctx.fillText(g, rx + 68, 748 + 30 + gp * 0.34);
  }
  ctx.textAlign = "center"; ctx.font = `700 26px ${DISPLAY}`; const url = "touchgrass.today/passport", uw = ctx.measureText(url).width + 56;
  sticker(ctx, ax + as / 2 - uw / 2, 770, uw, 46, 23, PP.paper, 5, 5); ctx.fillStyle = PP.ink; ctx.fillText(url, ax + as / 2, 802);
  if (frameImg) ctx.drawImage(frameImg, 0, 0, W, H);
  return c;
}

export function canvasToBlob(c) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png export failed"))), "image/png"));
}
