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

function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

// Calm layout ("passport page"): brand sunrise background, a slightly tilted framed cover, and one stitched cream passport
// page with an orange header band, stamped stats and a row of small photos of the collector's own pieces.
async function drawCalm(ctx, { art, icons, mascot, piece, displayName, edition, stats, strip, stripTotal }) {
  const W = PASSPORT_W, H = PASSPORT_H;
  let bgImg = null; try { bgImg = await loadImage("/passport/assets/bg.jpg", false); } catch {}
  if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H); else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, PP.orange2); g.addColorStop(1, PP.orange); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); grass(ctx); }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // framed cover, tilted a touch
  const as = 540, ax = 110, ay = 150;
  ctx.save(); ctx.translate(ax + as / 2, ay + as / 2); ctx.rotate(-0.04); ctx.translate(-as / 2, -as / 2);
  sticker(ctx, -16, -16, as + 32, as + 32, 36, PP.paper, 7, 12);
  ctx.save(); rr(ctx, 0, 0, as, as, 22); ctx.clip(); cover(ctx, art, 0, 0, as, as); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; rr(ctx, 0, 0, as, as, 22); ctx.stroke();
  const plate = String(piece.name || ""); ctx.textAlign = "center"; const ppx = fit(ctx, plate, 440, 34, 22, 700, DISPLAY), pw = Math.min(520, ctx.measureText(plate).width + 70);
  sticker(ctx, as / 2 - pw / 2, as - 52, pw, 66, 24, PP.yellow, 6, 6); ctx.fillStyle = PP.ink; ctx.fillText(plate, as / 2, as - 52 + 33 + ppx * 0.34);
  // verified seal on the frame corner
  const isOrig = /origin/i.test(String(edition || "")), isGrass = /grass/i.test(String(edition || "")), seal = icons[isOrig ? "stamp-origin" : isGrass ? "seal-grass-touchers" : "seal-screen-toucher"];
  ctx.save(); ctx.translate(as - 6, 8); ctx.rotate(0.15);
  if (seal) {
    ctx.shadowColor = "rgba(20,17,13,0.35)"; ctx.shadowOffsetY = 5; ctx.drawImage(seal, -66, -66, 132, 132); ctx.shadowColor = "transparent"; ctx.textAlign = "center";
    if (isOrig) { sticker(ctx, -48, 38, 96, 32, 16, PP.yellow, 4, 4); ctx.fillStyle = PP.ink; ctx.font = `700 14px ${DISPLAY}`; spaced(ctx, 2); ctx.fillText("VERIFIED", 0, 60); }
    else { ctx.font = `700 14px ${DISPLAY}`; spaced(ctx, 2); ctx.fillStyle = PP.paper; ctx.lineWidth = 4; ctx.strokeStyle = PP.ink; ctx.lineJoin = "round"; ctx.strokeText("VERIFIED", 0, 48); ctx.fillText("VERIFIED", 0, 48); }
    spaced(ctx, 0);
  } else { ctx.fillStyle = PP.ink; ctx.beginPath(); ctx.arc(0, 6, 56, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PP.yellow; ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; ctx.stroke(); miniSun(ctx, 0, -6, 9, PP.orange); }
  ctx.restore(); ctx.restore();

  // passport page
  const px = 720, py = 70, pw2 = 800, ph = 690, ix = px + 50, ir = px + pw2 - 50, iw = ir - ix;
  sticker(ctx, px, py, pw2, ph, 30, PP.paper, 6, 10);
  ctx.save(); rr(ctx, px, py, pw2, ph, 30); ctx.clip(); ctx.fillStyle = PP.orange; ctx.fillRect(px, py, pw2, 92); ctx.fillStyle = PP.ink; ctx.fillRect(px, py + 90, pw2, 5); ctx.restore();
  ctx.setLineDash([10, 9]); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(20,17,13,0.28)"; rr(ctx, px + 14, py + 108, pw2 - 28, ph - 122, 20); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineWidth = 6; ctx.strokeStyle = PP.ink; rr(ctx, px, py, pw2, ph, 30); ctx.stroke();
  ctx.textAlign = "left"; ctx.font = `700 34px ${DISPLAY}`; spaced(ctx, 6); ctx.fillStyle = "#fff"; ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = PP.ink; ctx.strokeText("WAGO PASSPORT", ix, py + 62); ctx.fillText("WAGO PASSPORT", ix, py + 62); spaced(ctx, 0);
  const ed = String(edition || "").toUpperCase(); ctx.font = `700 20px ${DISPLAY}`; spaced(ctx, 3); const edw = ctx.measureText(ed).width + 40;
  sticker(ctx, ir - edw, py + 22, edw, 44, 22, PP.yellow, 4, 4); ctx.fillStyle = PP.ink; ctx.fillText(ed, ir - edw + 20, py + 22 + 30); spaced(ctx, 0);
  fit(ctx, displayName, iw, 100, 52, 700, DISPLAY); ctx.fillStyle = PP.ink; ctx.fillText(displayName, ix, py + 206);

  // stamped stats
  const list = (stats || []).slice(0, 6), rows = Math.ceil(list.length / 3) || 1, cols = 3, gap = 10, cw = (iw - gap * (cols - 1)) / cols, ch = rows === 1 ? 240 : 150, k = ch / 150, gy = py + 240;
  const tilt = [-0.06, 0.04, -0.03, 0.05, -0.04, 0.03], nums = ["#f26a00", PP.greenD];
  list.forEach((st, i) => {
    const cx = ix + (i % cols) * (cw + gap) + cw / 2, y = gy + Math.floor(i / cols) * (ch + gap), ic = 70 * Math.min(k, 1.35), im = icons[st.icon];
    if (im) { ctx.save(); ctx.translate(cx, y + 4 + ic / 2); ctx.rotate(tilt[i]); ctx.shadowColor = "rgba(20,17,13,0.25)"; ctx.shadowOffsetY = 4; ctx.drawImage(im, -ic / 2, -ic / 2, ic, ic); ctx.restore(); }
    ctx.textAlign = "center"; ctx.fillStyle = nums[i % 2];
    if (st.text) { fit(ctx, st.value, cw - 16, 30 * k, 16, 700, DISPLAY); ctx.fillText(st.value, cx, y + 118 * k); }
    else { ctx.font = `700 ${46 * k}px ${DISPLAY}`; ctx.fillText(String(st.value), cx, y + 118 * k); }
    ctx.fillStyle = PP.ink; fit(ctx, st.label, cw - 16, 17 * k, 12, 800, SANS); ctx.fillText(st.label, cx, y + 142 * k);
  });

  // small photos of the collector's own pieces
  const total = Math.max(stripTotal || 0, (strip || []).length), shown = (strip || []).slice(0, 7), sy = py + ph - 104;
  ctx.textAlign = "left"; ctx.font = `800 17px ${SANS}`; spaced(ctx, 3); ctx.fillStyle = "rgba(20,17,13,0.6)";
  ctx.fillText(`MY COLLECTION · ${total} ${total === 1 ? "PIECE" : "PIECES"}`, ix, sy); spaced(ctx, 0);
  const imgs = await Promise.all(shown.map((p) => loadImage(p.artUrl).catch(() => null))), sz = 58, step = 70, top = sy + 16;
  imgs.forEach((im, i) => {
    if (!im) return; ctx.save(); ctx.translate(ix + sz / 2 + i * step, top + sz / 2); ctx.rotate(i % 2 ? 0.04 : -0.04);
    ctx.fillStyle = PP.ink; rr(ctx, -sz / 2 - 1, -sz / 2 + 4, sz + 2, sz + 2, 10); ctx.fill();
    ctx.fillStyle = i === 0 ? PP.yellow : "#fff"; rr(ctx, -sz / 2, -sz / 2, sz, sz, 10); ctx.fill();
    ctx.save(); rr(ctx, -sz / 2 + 4, -sz / 2 + 4, sz - 8, sz - 8, 6); ctx.clip(); cover(ctx, im, -sz / 2 + 4, -sz / 2 + 4, sz - 8, sz - 8); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = PP.ink; rr(ctx, -sz / 2, -sz / 2, sz, sz, 10); ctx.stroke(); ctx.restore();
  });
  if (total > shown.length) { const x = ix + shown.length * step; ctx.fillStyle = PP.ink; rr(ctx, x, top + 3, sz, sz, 10); ctx.fill(); ctx.fillStyle = PP.paper; ctx.textAlign = "center"; ctx.font = `700 24px ${DISPLAY}`; ctx.fillText(`+${total - shown.length}`, x + sz / 2, top + 3 + sz / 2 + 8); }

  if (mascot) { const mh = 120, mw = (mascot.width / mascot.height) * mh; ctx.save(); ctx.shadowColor = "rgba(20,17,13,0.3)"; ctx.shadowOffsetY = 5; ctx.drawImage(mascot, px + pw2 - mw - 26, py + ph - mh + 10, mw, mh); ctx.restore(); }

  // url ribbon, bottom centre
  ctx.textAlign = "center"; ctx.font = `700 26px ${DISPLAY}`; const url = "touchgrass.today/passport", uw = ctx.measureText(url).width + 60;
  sticker(ctx, W / 2 - uw / 2, 800, uw, 52, 26, PP.paper, 5, 5); ctx.fillStyle = PP.ink; ctx.fillText(url, W / 2, 800 + 35);
}

export function canvasToBlob(c) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png export failed"))), "image/png"));
}
