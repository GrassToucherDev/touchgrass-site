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

function grassIcon(ctx, cx, cy, r) {
  ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(cx, cy + 4, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PP.green; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = Math.max(4, r * 0.14); ctx.strokeStyle = PP.ink; ctx.stroke();
  ctx.strokeStyle = PP.paper; ctx.lineWidth = r * 0.17; ctx.lineCap = "round"; const u = r / 16;
  [[-9, -9, -6, 2], [0, -13, 0, 0], [9, -9, 6, 2]].forEach(([tx, ty, cx1, cy1]) => { ctx.beginPath(); ctx.moveTo(cx, cy + 10 * u); ctx.quadraticCurveTo(cx + cx1 * u, cy + cy1 * u, cx + tx * u, cy + ty * u); ctx.stroke(); });
  ctx.lineCap = "butt";
}
function tile(ctx, x, y, w, h, st, fill, icons) {
  sticker(ctx, x, y, w, h, 26, fill, 6, 8);
  const small = h < 130, ic = small ? 66 : 84, ix = x + 16, iy = y + (h - ic) / 2, tcx = ix + ic + (x + w - 14 - (ix + ic)) / 2, tw = x + w - 14 - (ix + ic + 6);
  const im = icons[st.icon];
  if (im) ctx.drawImage(im, ix, iy, ic, ic); else grassIcon(ctx, ix + ic / 2, iy + ic / 2, ic / 2);
  ctx.textAlign = "center"; ctx.fillStyle = PP.ink;
  if (st.text) { fit(ctx, st.value, tw, 40, 20, 700, DISPLAY); ctx.fillText(st.value, tcx, y + (small ? 52 : 70)); }
  else { ctx.font = `700 ${small ? 52 : 66}px ${DISPLAY}`; ctx.fillText(String(st.value), tcx, y + (small ? 56 : 78)); }
  fit(ctx, st.label, tw, small ? 22 : 25, 14, 800, SANS); ctx.fillText(st.label, tcx, y + (small ? 90 : 117));
}

// piece: { name, artUrl }  stats: [{ value, label }] (max 4)
export async function renderPassport({ piece, displayName, edition, stats, layout, strip, stripTotal }) {
  const W = PASSPORT_W, H = PASSPORT_H;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 80px Fredoka"), document.fonts.load("600 30px Fredoka"), document.fonts.load("800 24px Nunito")]); } catch {}
  const art = await loadImage(piece.artUrl);
  const icons = {};
  await Promise.all(["seal-origins", "seal-screen-toucher", "seal-grass-touchers", "stamp-grass", "stamp-origin", "stamp-screen-toucher", "stamp-proofs", "stamp-streak", "stamp-grove"].map(async (n) => { try { icons[n] = await loadImage(`/passport/assets/${n}.png`, false); } catch {} }));
  let sunImg = null; try { sunImg = await loadImage("/passport/assets/sun.png", false); } catch {}
  let bgImg = null, frameImg = null; try { [bgImg, frameImg] = await Promise.all([loadImage("/passport/assets/bg.jpg", false), loadImage("/passport/assets/frame.png", false)]); } catch {}
  let mascot = null; try { mascot = await loadImage("/assets/brand/wago-cheer.png", false); } catch {}

  if (layout === "calm") { await drawCalm(ctx, { art, icons, mascot, piece, displayName, edition, stats, strip, stripTotal }); return c; }

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

  // verified seal on the frame corner (brand art for Screen Touchers, drawn badge for Origins until its art exists)
  const isOrig = /origin/i.test(String(edition || "")), isGrass = /grass/i.test(String(edition || "")), sealImg = icons[isOrig ? "stamp-origin" : isGrass ? "seal-grass-touchers" : "seal-screen-toucher"];
  ctx.save(); ctx.translate(ax + as - 8, ay + 6); ctx.rotate(0.15);
  if (sealImg) {
    ctx.shadowColor = "rgba(20,17,13,0.35)"; ctx.shadowOffsetY = 6; ctx.drawImage(sealImg, -80, -80, 160, 160); ctx.shadowColor = "transparent";
    if (isOrig) { sticker(ctx, -58, 46, 116, 38, 19, PP.yellow, 5, 4); ctx.textAlign = "center"; ctx.fillStyle = PP.ink; ctx.font = `700 17px ${DISPLAY}`; if ("letterSpacing" in ctx) ctx.letterSpacing = "2px"; ctx.fillText("VERIFIED", 0, 72); if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; }
    else {
    ctx.textAlign = "center"; ctx.font = `700 16px ${DISPLAY}`; if ("letterSpacing" in ctx) ctx.letterSpacing = "2px"; ctx.fillStyle = PP.paper; ctx.lineWidth = 4; ctx.strokeStyle = PP.ink; ctx.lineJoin = "round";
    ctx.strokeText("VERIFIED", 0, 58); ctx.fillText("VERIFIED", 0, 58); if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    }
  } else {
    ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(0, 8, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PP.yellow; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = PP.ink; ctx.stroke();
    miniSun(ctx, 0, -14, 11, PP.orange);
    ctx.fillStyle = PP.ink; ctx.textAlign = "center"; ctx.font = `700 19px ${DISPLAY}`; if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
    ctx.fillText("VERIFIED", 0, 34); ctx.font = `700 14px ${DISPLAY}`; ctx.fillText(String(edition || "WAGO").split(" ")[0].toUpperCase(), 0, 52);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }
  ctx.restore();

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

  const list = (stats || []).slice(0, 6), rows = Math.ceil(list.length / 2), compact = rows > 2, fills = [PP.paper, PP.yellow, PP.lime, PP.paper, PP.yellow, PP.paper];
  const tw = 316, th = compact ? 106 : 142, gap = 28, top = compact ? 388 : 408, rgap = compact ? 18 : 30;
  list.forEach((st, i) => tile(ctx, rx + (i % 2) * (tw + gap), top + Math.floor(i / 2) * (th + rgap), tw, th, st, fills[i], icons));

  ctx.textAlign = "center"; ctx.font = `700 26px ${DISPLAY}`; const url = "touchgrass.today/passport", uw = ctx.measureText(url).width + 56;
  sticker(ctx, ax + as / 2 - uw / 2, 770, uw, 46, 23, PP.paper, 5, 5); ctx.fillStyle = PP.ink; ctx.fillText(url, ax + as / 2, 802);
  if (frameImg) ctx.drawImage(frameImg, 0, 0, W, H);
  return c;
}

// Dominant colour around the artwork's edge, so a flat background can melt into the art. A busy edge (several
// colours, no clear winner) falls back to brand sunrise orange.
export function edgeColor(img) {
  try {
    const n = 32, c = document.createElement("canvas"); c.width = c.height = n;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data, bins = new Map(); let k = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i > 1 && i < n - 2 && j > 1 && j < n - 2) continue;
      const o = (i * n + j) * 4; if (d[o + 3] < 200) continue; k++;
      const key = ((d[o] >> 4) << 8) | ((d[o + 1] >> 4) << 4) | (d[o + 2] >> 4), e = bins.get(key) || [0, 0, 0, 0];
      e[0]++; e[1] += d[o]; e[2] += d[o + 1]; e[3] += d[o + 2]; bins.set(key, e);
    }
    let best = null; for (const e of bins.values()) if (!best || e[0] > best[0]) best = e;
    if (!best || best[0] / k < 0.4) return PP.orange2;
    return `rgb(${Math.round(best[1] / best[0])},${Math.round(best[2] / best[0])},${Math.round(best[3] / best[0])})`;
  } catch { return PP.orange2; }
}
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

// Calm layout: flat colour matched to the art, big bleeding art, one cream info panel, quiet stat grid, owned-pieces strip.
async function drawCalm(ctx, { art, icons, mascot, piece, displayName, edition, stats, strip, stripTotal }) {
  const W = PASSPORT_W, H = PASSPORT_H;
  ctx.fillStyle = edgeColor(art); ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // art bleeds off the left, top and bottom
  ctx.save(); rr(ctx, -80, 0, 900, H, 56); ctx.clip(); cover(ctx, art, -80, 0, 900, H); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; rr(ctx, -80, 0, 900, H, 56); ctx.stroke();

  // token name (top-left) and url (bottom-left) pills
  const plate = String(piece.name || ""); ctx.textAlign = "center";
  const ppx = fit(ctx, plate, 520, 34, 22, 700, DISPLAY), pw = Math.min(620, ctx.measureText(plate).width + 70);
  sticker(ctx, 44, 44, pw, 62, 31, PP.yellow, 5, 6); ctx.fillStyle = PP.ink; ctx.fillText(plate, 44 + pw / 2, 44 + 31 + ppx * 0.34);
  ctx.font = `700 24px ${DISPLAY}`; const url = "touchgrass.today/passport", uw = ctx.measureText(url).width + 50;
  sticker(ctx, 44, H - 44 - 50, uw, 50, 25, PP.paper, 5, 5); ctx.fillStyle = PP.ink; ctx.fillText(url, 44 + uw / 2, H - 44 - 50 + 34);

  // info panel
  const px = 760, py = 70, pw2 = 780, ph = 760, ix = px + 52, ir = px + pw2 - 52, iw = ir - ix;
  sticker(ctx, px, py, pw2, ph, 44, PP.paper, 6, 10);
  ctx.textAlign = "left"; ctx.font = `700 24px ${DISPLAY}`; spaced(ctx, 5); ctx.fillStyle = "#e8650a"; ctx.fillText("WAGO PASSPORT", ix, py + 86); spaced(ctx, 0);
  ctx.font = `600 32px ${DISPLAY}`; fit(ctx, displayName, iw, 112, 54, 700, DISPLAY); outlined(ctx, displayName, ix, py + 214, 14, PP.orange);
  const ed = String(edition || "").toUpperCase(); ctx.font = `700 22px ${DISPLAY}`; spaced(ctx, 3);
  const edw = ctx.measureText(ed).width + 48; sticker(ctx, ix, py + 244, edw, 46, 23, PP.yellow, 4, 4); ctx.fillStyle = PP.ink; ctx.fillText(ed, ix + 24, py + 244 + 32); spaced(ctx, 0);

  // stat grid
  const list = (stats || []).slice(0, 6), rows = Math.ceil(list.length / 3) || 1, cols = 3, gap = 16, cw = (iw - gap * (cols - 1)) / cols, ch = rows === 1 ? 200 : 134, k = ch / 140, gy = py + 318;
  const nums = ["#f26a00", PP.greenD];
  list.forEach((st, i) => {
    const x = ix + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap);
    ctx.fillStyle = "#fff0d2"; rr(ctx, x, y, cw, ch, 26); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(20,17,13,0.14)"; rr(ctx, x, y, cw, ch, 26); ctx.stroke();
    const ic = 52 * k, im = icons[st.icon]; if (im) ctx.drawImage(im, x + cw - ic - 12, y + 12, ic, ic);
    ctx.textAlign = "left"; ctx.fillStyle = nums[i % 2];
    if (st.text) { fit(ctx, st.value, cw - 40, 34 * k, 18, 700, DISPLAY); ctx.fillText(st.value, x + 22, y + 98 * k); }
    else { fit(ctx, String(st.value), cw - 44 - ic, 62 * k, 30, 700, DISPLAY); ctx.fillText(String(st.value), x + 22, y + 98 * k); }
    ctx.fillStyle = PP.ink; fit(ctx, st.label, cw - 36, 19 * k, 13, 800, SANS); ctx.fillText(st.label, x + 22, y + 128 * k);
  });

  // owned-pieces strip
  const total = Math.max(stripTotal || 0, (strip || []).length), shown = (strip || []).slice(0, 7), sy = py + ph - 112;
  ctx.textAlign = "left"; ctx.font = `800 18px ${SANS}`; spaced(ctx, 3); ctx.fillStyle = "rgba(20,17,13,0.6)";
  ctx.fillText(`MY COLLECTION · ${total} ${total === 1 ? "PIECE" : "PIECES"}`, ix, sy); spaced(ctx, 0);
  const imgs = await Promise.all(shown.map((p) => loadImage(p.artUrl).catch(() => null))), r = 33, step = 56, cy = sy + 20 + r;
  imgs.forEach((im, i) => {
    const cx = ix + r + i * step; if (!im) return;
    ctx.fillStyle = i === 0 ? PP.yellow : PP.ink; ctx.beginPath(); ctx.arc(cx, cy, r + (i === 0 ? 7 : 4), 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); cover(ctx, im, cx - r, cy - r, r * 2, r * 2); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = PP.ink; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  });
  if (total > shown.length) {
    const cx = ix + r + shown.length * step + 6; ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PP.paper; ctx.textAlign = "center"; ctx.font = `700 26px ${DISPLAY}`; ctx.fillText(`+${total - shown.length}`, cx, cy + 9);
  }

  // verified seal on the panel corner, small mascot peeking from the bottom corner
  const isOrig = /origin/i.test(String(edition || "")), isGrass = /grass/i.test(String(edition || "")), seal = icons[isOrig ? "stamp-origin" : isGrass ? "seal-grass-touchers" : "seal-screen-toucher"];
  ctx.save(); ctx.translate(px + pw2 - 62, py + 40); ctx.rotate(0.15);
  if (seal) {
    ctx.shadowColor = "rgba(20,17,13,0.3)"; ctx.shadowOffsetY = 5; ctx.drawImage(seal, -72, -72, 144, 144); ctx.shadowColor = "transparent"; ctx.textAlign = "center";
    if (isOrig) { sticker(ctx, -52, 42, 104, 34, 17, PP.yellow, 4, 4); ctx.fillStyle = PP.ink; ctx.font = `700 15px ${DISPLAY}`; spaced(ctx, 2); ctx.fillText("VERIFIED", 0, 65); }
    else { ctx.font = `700 15px ${DISPLAY}`; spaced(ctx, 2); ctx.fillStyle = PP.paper; ctx.lineWidth = 4; ctx.strokeStyle = PP.ink; ctx.lineJoin = "round"; ctx.strokeText("VERIFIED", 0, 52); ctx.fillText("VERIFIED", 0, 52); }
    spaced(ctx, 0);
  } else { ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(0, 6, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PP.yellow; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; ctx.stroke(); miniSun(ctx, 0, -8, 9, PP.orange); }
  ctx.restore();
  if (mascot) { const mh = 128, mw = (mascot.width / mascot.height) * mh; ctx.save(); ctx.shadowColor = "rgba(20,17,13,0.3)"; ctx.shadowOffsetY = 5; ctx.drawImage(mascot, px + pw2 - mw - 28, py + ph - mh + 8, mw, mh); ctx.restore(); }
}

export function canvasToBlob(c) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png export failed"))), "image/png"));
}
