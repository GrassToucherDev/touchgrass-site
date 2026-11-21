// passport/passport.js — WAGO Passport (touchgrass.today/passport).
// Connect the wallet you minted with, see your verified WAGO Origins and Screen Touchers, pick a cover and
// download a 1600×900 PNG. Ownership is verified server-side (/api/passport/collection); this page never
// trusts NFT data from the browser. Plain JavaScript, no framework. NFT names come from chain data, so they
// are only ever written with textContent / attributes, never innerHTML.
import { renderPassport, canvasToBlob } from "./card.js";

const NAME_MAX = 24, DEFAULT_NAME = "WAGO Collector";
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ── tiny DOM helper ─────────────────────────────────────────────────────────────────────────────────
function grassBadge() {
  const NS = "http://www.w3.org/2000/svg", d = h("span", { class: "pp-stat-ic pp-grassbadge", "aria-hidden": "true" }), svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-16 -16 32 32"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2.8"); svg.setAttribute("stroke-linecap", "round");
  ["M0 10 Q-6 2 -9 -9", "M0 10 Q0 0 0 -13", "M0 10 Q6 2 9 -9"].forEach((dd) => { const pa = document.createElementNS(NS, "path"); pa.setAttribute("d", dd); svg.appendChild(pa); });
  d.appendChild(svg); return d;
}
function sunBadge() { const d = h("span", { class: "pp-stat-ic pp-sunbadge", "aria-hidden": "true" }); d.appendChild(sunIcon()); return d; }
function sunIcon() {
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-16 -16 32 32"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "3"); svg.setAttribute("stroke-linecap", "round");
  const c = document.createElementNS(NS, "circle"); c.setAttribute("r", "6"); svg.appendChild(c);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, l = document.createElementNS(NS, "line"); l.setAttribute("x1", (Math.cos(a) * 9.5).toFixed(2)); l.setAttribute("y1", (Math.sin(a) * 9.5).toFixed(2)); l.setAttribute("x2", (Math.cos(a) * 14).toFixed(2)); l.setAttribute("y2", (Math.sin(a) * 14).toFixed(2)); svg.appendChild(l); }
  return svg;
}
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

// ── pure helpers (same rules as the server) ─────────────────────────────────────────────────────────
const looksLikeAddress = (s) => /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(String(s ?? "").replace(/\s/g, ""));
function cleanDisplayName(v) {
  const raw = String(v ?? "");
  if (looksLikeAddress(raw)) return "";
  return raw.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
}
const tokenNumber = (n) => { const m = /#\s*(\d+)/.exec(String(n ?? "")); return m ? Number(m[1]) : null; };
function sortPieces(list) {
  const rank = (p) => (p.collection === "origins" ? 0 : p.collection === "screen_touchers" ? 1 : 2);
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const na = tokenNumber(a.name), nb = tokenNumber(b.name);
    if (na != null && nb != null && na !== nb) return na - nb;
    if (na != null && nb == null) return -1;
    if (na == null && nb != null) return 1;
    return String(a.name || a.id).localeCompare(String(b.name || b.id)) || String(a.id).localeCompare(String(b.id));
  });
}
const pickCover = (pieces, id) => (pieces.length ? pieces.find((p) => p.id === id) || pieces[0] : null);
const artUrl = (id) => `/api/passport/image?mint=${encodeURIComponent(id)}`;
const safeImg = (u) => (typeof u === "string" && u.startsWith("https://") ? u : "");

// ── wallets (injected providers: Phantom, Solflare) ─────────────────────────────────────────────────
const WALLETS = [
  { id: "phantom", name: "Phantom", get: () => (window.phantom?.solana?.isPhantom ? window.phantom.solana : window.solana?.isPhantom ? window.solana : null),
    install: "https://phantom.app/download", open: (u) => `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
  { id: "solflare", name: "Solflare", get: () => (window.solflare?.isSolflare ? window.solflare : null),
    install: "https://solflare.com/download", open: (u) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
];
const detected = () => WALLETS.filter((w) => w.get());
const hooked = new Set();

const S = { pog: null, pogEnabled: false, pogBusy: false, pogNote: "", wallet: null, walletId: null, status: "idle", origins: [], screenTouchers: [], grassTouchers: [], coverId: null, name: "", editing: false, busy: false, note: "", refreshing: false, refreshError: false, checkedOnce: false };
let reqId = 0;

function setWallet(addr, walletId) {
  if (addr === S.wallet) { S.walletId = walletId || S.walletId; return; }
  reqId++;                                       // older answers are now ignored
  Object.assign(S, { pog: null, pogEnabled: false, pogBusy: false, pogNote: "", wallet: addr, walletId: walletId || S.walletId, status: addr ? "loading" : "idle", origins: [], screenTouchers: [], grassTouchers: [], coverId: null, name: "", editing: false, note: "", refreshing: false, refreshError: false, checkedOnce: false });
  if (addr) {
    S.coverId = store.get(`passport_cover:${addr}`);
    S.name = cleanDisplayName(store.get(`passport_name:${addr}`));
    load(addr);
  }
  render();
}

function hook(w, p) {
  if (hooked.has(w.id) || typeof p.on !== "function") return;
  hooked.add(w.id);
  p.on("disconnect", () => { if (S.walletId === w.id) { store.del("passport_wallet"); setWallet(null); } });
  p.on("accountChanged", (pk) => {
    if (S.walletId !== w.id) return;
    if (pk) setWallet(pk.toString(), w.id);
    else p.connect({ onlyIfTrusted: true }).then((r) => setWallet((r?.publicKey || p.publicKey).toString(), w.id)).catch(() => { store.del("passport_wallet"); setWallet(null); });
  });
}

async function connectWith(w) {
  const p = w.get(); if (!p) return;
  closePicker(); hook(w, p);
  try {
    const r = await p.connect();
    const pk = (r && r.publicKey) || p.publicKey;
    if (!pk) throw new Error("no key");
    store.set("passport_wallet", w.id);
    setWallet(pk.toString(), w.id);
  } catch { S.note = "Wallet connection was cancelled."; render(); }
}

function connectClick() {
  const found = detected();
  if (found.length === 1) return connectWith(found[0]);
  openPicker(found);
}

async function disconnect() {
  const w = WALLETS.find((x) => x.id === S.walletId), p = w && w.get();
  store.del("passport_wallet");
  setWallet(null);
  try { if (p && p.disconnect) await p.disconnect(); } catch {}
}

// Quietly reconnect a wallet this browser already approved (no prompt).
async function autoConnect() {
  const w = WALLETS.find((x) => x.id === store.get("passport_wallet")), p = w && w.get();
  if (!p) return;
  hook(w, p);
  try {
    const r = await p.connect({ onlyIfTrusted: true });
    const pk = (r && r.publicKey) || p.publicKey;
    if (pk) setWallet(pk.toString(), w.id);
  } catch { /* not approved for this site: stay disconnected */ }
}

// ── data ────────────────────────────────────────────────────────────────────────────────────────────
// One lookup per wallet. A newer request (wallet switch, refresh) makes any older answer ignored.
async function load(wallet, { quiet = false } = {}) {
  const id = ++reqId;
  if (quiet) { S.refreshing = true; S.refreshError = false; } else S.status = "loading";
  render();
  const fail = () => { if (quiet && S.status === "ok") S.refreshError = true; else S.status = "lookup_failed"; };
  try {
    const r = await fetch(`/api/passport/collection?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (id !== reqId) return;
    if (r.ok && j.status === "ok") { S.status = "ok"; S.origins = j.origins || []; S.screenTouchers = j.screenTouchers || []; S.grassTouchers = j.grassTouchers || []; S.pogEnabled = !!j.pogEnabled; }
    else if (j.status === "not_configured") S.status = "not_configured";
    else fail();
  } catch { if (id !== reqId) return; fail(); }
  S.refreshing = false; S.checkedOnce = true;
  render();
}

const pieces = () => (S.status === "ok" ? sortPieces([...S.origins, ...S.screenTouchers, ...S.grassTouchers]) : []);
const displayName = () => S.name || S.pog?.username || DEFAULT_NAME;
function stats() {
  const t = [
    { value: S.origins.length, label: "Origins", icon: "seal-origins" },
    { value: S.screenTouchers.length, label: "Screen Touchers", icon: "stamp-screen-toucher" },
    { value: S.grassTouchers.length, label: "Grass Touchers", icon: "stamp-grass" },
  ];
  if (S.pog) {
    t.push({ value: S.pog.proofs, label: "Outdoor Proofs", icon: "stamp-proofs" }, { value: S.pog.streak, label: "Day Streak", icon: "stamp-streak" });
    if (S.pog.grove) t.push({ value: String(S.pog.grove).slice(0, 28), label: "Grove", icon: "stamp-grove", text: true });
  }
  return t;
}

// Opt-in: sign a free message with the wallet, then ask the server for the Proof of Grass account linked to it.
const toB64 = (u8) => { let t = ""; u8.forEach((b) => { t += String.fromCharCode(b); }); return btoa(t); };
async function addPog() {
  const w = WALLETS.find((x) => x.id === S.walletId), p = w && w.get(), wallet = S.wallet;
  if (!p || !wallet || S.pogBusy) return;
  S.pogBusy = true; S.pogNote = ""; render();
  const same = () => S.wallet === wallet;
  try {
    if (typeof p.signMessage !== "function") throw new Error(`${w.name} can\u2019t sign messages. Try Phantom or Solflare.`);
    const c = await (await fetch(`/api/passport/pog?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" })).json();
    if (!c.message) throw new Error("Couldn\u2019t start. Try again in a moment.");
    let signed;
    try { signed = await p.signMessage(new TextEncoder().encode(c.message), "utf8"); } catch { throw new Error("Signature cancelled. Nothing was shared."); }
    const sig = signed && signed.signature ? signed.signature : signed;
    const r = await fetch("/api/passport/pog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet, signature: toB64(sig), issuedAt: c.issuedAt }) });
    const j = await r.json().catch(() => ({}));
    if (!same()) return;
    if (r.ok && j.linked) S.pog = j;
    else if (r.ok) S.pogNote = "No Proof of Grass account has this wallet verified yet. Verify it on your Proof of Grass profile, then try again.";
    else throw new Error(j.error || "Couldn\u2019t reach Proof of Grass right now.");
  } catch (e) { if (same()) S.pogNote = e.message || "Something went wrong."; }
  if (same()) { S.pogBusy = false; render(); }
}

async function download() {
  const cover = pickCover(pieces(), S.coverId);
  if (!cover || S.busy) return;
  S.busy = true; S.note = ""; render();
  try {
    const canvas = await renderPassport({ piece: { name: cover.name, artUrl: artUrl(cover.id) }, displayName: displayName(), edition: cover.collection === "origins" ? "Origins Edition" : "Screen Touchers", stats: stats() });
    const blob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: "wago-passport.png" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { S.note = "Couldn't build the image. Check your connection and try again."; }
  S.busy = false; render();
}

// ── view ────────────────────────────────────────────────────────────────────────────────────────────
function dlButton(cls) {
  return h("button", { class: `pp-btn ${cls || ""}`, "data-testid": cls ? null : "download", onclick: download, disabled: S.busy }, S.busy ? "Building…" : "Download Passport");
}

function render() {
  // header: wallet state
  const wa = $("wallet-area"); wa.replaceChildren();
  if (S.wallet) wa.append(h("span", { class: "pp-pill", "data-testid": "wallet-pill" }, h("i", { class: "pp-dot" }), h("span", null, h("span", { class: "pp-w" }, "Wallet "), "connected")), h("button", { class: "pp-link", onclick: disconnect }, "Disconnect"));
  else wa.append(h("button", { class: "pp-btn pp-btn-sm", onclick: connectClick }, "Connect wallet"));

  const ps = pieces(), cover = pickCover(ps, S.coverId), ready = S.status === "ok", empty = ready && ps.length === 0;
  const hb = $("head-btns"), dock = $("dock"); hb.replaceChildren(); dock.replaceChildren();
  hb.hidden = dock.hidden = !(ready && !empty && cover);
  if (!hb.hidden) {
    hb.append(h("button", { class: "pp-btn pp-btn-ghost", onclick: () => { S.editing = !S.editing; render(); } }, "Edit name"), dlButton());
    dock.append(dlButton("pp-btn-wide"));
  }

  const v = $("view"); v.replaceChildren();
  if (!S.wallet) {
    v.append(h("section", { class: "pp-panel pp-welcome", "data-testid": "state-disconnected" },
      h("img", { src: "/assets/brand/wago-camera.png", alt: "", class: "pp-welcome-img" }),
      h("div", null,
        h("h2", { class: "pp-h2" }, "Connect the wallet you minted with"),
        h("p", { class: "pp-p" }, "Mint a WAGO Origin on LaunchMyNFT, then come back and connect the same Solana wallet. Your art shows up right after the mint, with no reveal wait."),
        h("button", { class: "pp-btn", onclick: connectClick }, "Connect wallet"),
        S.note && h("p", { class: "pp-fine pp-err", role: "alert" }, S.note),
        h("p", { class: "pp-fine" }, "On a phone, tap Connect wallet and choose Open in Phantom or Solflare if your browser has no wallet."))));
    return;
  }
  if (S.status === "loading") { v.append(h("section", { class: "pp-panel pp-skel", "data-testid": "state-loading", "aria-busy": "true" }, h("div", { class: "pp-skel-art" }), h("div", { class: "pp-skel-lines" }, h("i"), h("i"), h("i")))); return; }
  if (S.status === "not_configured") { v.append(h("section", { class: "pp-panel", "data-testid": "state-not-configured" }, h("h2", { class: "pp-h2" }, "Passport is almost ready"), h("p", { class: "pp-p" }, "The collection connection isn’t switched on yet. Check back soon."))); return; }
  if (S.status === "lookup_failed") { v.append(h("section", { class: "pp-panel", "data-testid": "state-error" }, h("h2", { class: "pp-h2" }, "Couldn’t read your wallet"), h("p", { class: "pp-p" }, "The collection lookup didn’t go through. Your wallet is still connected."), h("button", { class: "pp-btn", onclick: () => load(S.wallet) }, "Try again"))); return; }
  if (empty) {
    v.append(h("section", { class: "pp-panel", "data-testid": "state-empty" },
      h("h2", { class: "pp-h2" }, "No WAGO Origins or Screen Touchers in this wallet yet"),
      h("p", { class: "pp-p" }, "Just minted? A brand-new NFT can take a minute or two to show up in the collection index. Your mint is safe, we just can’t see it yet. Tap Refresh collection and it will appear when it’s indexed. You don’t need to reconnect."),
      h("button", { class: "pp-btn", "data-testid": "refresh", onclick: () => load(S.wallet, { quiet: true }), disabled: S.refreshing }, S.refreshing ? "Checking…" : "Refresh collection"),
      S.checkedOnce && !S.refreshing && h("p", { class: "pp-fine" }, "Checked the connected wallet just now. If you minted with a different wallet, switch wallets in your wallet app."),
      S.refreshError && h("p", { class: "pp-fine pp-err" }, "That refresh didn’t go through. Try again in a moment.")));
    return;
  }

  // owned
  const edition = cover.collection === "origins" ? "Origins Edition" : cover.collection === "grass_touchers" ? "Grass Touchers" : "Screen Touchers";
  const nameEl = S.editing
    ? h("form", { class: "pp-edit", onsubmit: (e) => { e.preventDefault(); const n = cleanDisplayName(e.currentTarget.elements.n.value); S.name = n; store.set(`passport_name:${S.wallet}`, n); S.editing = false; render(); } },
        h("input", { name: "n", value: S.name, maxlength: NAME_MAX, placeholder: DEFAULT_NAME, "aria-label": "Display name", autofocus: true }), h("button", { class: "pp-btn pp-btn-sm", type: "submit" }, "Save"))
    : h("h2", { class: "pp-name", "data-testid": "display-name" }, displayName());
  v.append(
    h("section", { class: "pp-card", "data-testid": "passport-card" },
      h("div", { class: "pp-art-wrap" },
        h("div", { class: "pp-art" }, h("img", { src: artUrl(cover.id), alt: cover.name, "data-testid": "cover-art" }), h("div", { class: "pp-plate" }, cover.name)),
        cover.collection === "grass_touchers" ? h("div", { class: "pp-seal", "aria-hidden": "true" }, sunIcon(), h("span", null, "VERIFIED"), h("span", null, "GRASS")) : h("div", { class: "pp-seal-img" + (cover.collection === "origins" ? " pp-seal-pill" : ""), "aria-hidden": "true" }, h("img", { src: cover.collection === "origins" ? "/passport/assets/stamp-origin.png" : "/passport/assets/seal-screen-toucher.png", alt: "" }), h("span", null, "VERIFIED"))),
      h("div", { class: "pp-info" },
        h("img", { class: "pp-mascot", src: "/assets/brand/wago-cheer.png", alt: "", "aria-hidden": "true" }),
        h("div", { class: "pp-eyebrow" }, h("i"), edition, h("i")),
        nameEl,
        h("div", { class: "pp-stats" }, stats().map((s) => h("div", { class: "pp-stat" }, s.icon === "stamp-grass" ? grassBadge() : h("img", { class: "pp-stat-ic", src: `/passport/assets/${s.icon}.png`, alt: "", width: 56, height: 56 }), h("div", { class: "pp-stat-tx" }, h("b", { class: s.text ? "pp-stat-txt" : "" }, s.value), h("span", null, s.label))))),
        S.pog && h("p", { class: "pp-fine pp-pogline", "data-testid": "pog-line" }, `Best streak ${S.pog.best}`),
        S.pogEnabled && !S.pog && h("div", { class: "pp-pogask" },
          h("button", { class: "pp-btn pp-btn-ghost pp-btn-sm", "data-testid": "add-pog", onclick: addPog, disabled: S.pogBusy }, S.pogBusy ? "Waiting for your wallet\u2026" : "Add my Proof of Grass stats"),
          h("p", { class: "pp-fine" }, "Optional. You\u2019ll sign a free message to prove this is your wallet. No transaction.")),
        S.pogNote && h("p", { class: "pp-fine pp-err", role: "alert", "data-testid": "pog-note" }, S.pogNote),
        !S.editing && h("button", { class: "pp-link pp-edit-m", onclick: () => { S.editing = true; render(); } }, "Edit name"),
        S.note && h("p", { class: "pp-fine pp-err", role: "alert" }, S.note))),
    h("section", { class: "pp-coll", "data-testid": "collection" },
      h("div", { class: "pp-coll-h" }, h("h3", null, "My Collection"), h("button", { class: "pp-link", "data-testid": "refresh-small", onclick: () => load(S.wallet, { quiet: true }), disabled: S.refreshing }, S.refreshing ? "Checking…" : "Refresh collection")),
      S.refreshError && h("p", { class: "pp-fine pp-err" }, "That refresh didn’t go through. Try again in a moment."),
      h("div", { class: "pp-thumbs" }, ps.map((p) => h("button", { class: "pp-thumb" + (p.id === cover.id ? " on" : ""), "aria-pressed": String(p.id === cover.id), "aria-label": `Use ${p.name} as cover`, onclick: () => { S.coverId = p.id; store.set(`passport_cover:${S.wallet}`, p.id); render(); } },
        h("img", { src: safeImg(p.image), alt: "", loading: "lazy", referrerpolicy: "no-referrer" }),
        p.id === cover.id && h("em", null, "Cover"),
        h("span", null, p.name), h("small", null, p.collection === "origins" ? "WAGO Origins" : p.collection === "grass_touchers" ? "Grass Toucher" : "Screen Toucher")))),
      h("p", { class: "pp-fine" }, "Verified on-chain for the connected wallet. Tap a piece to make it your cover.")));
}

// ── wallet picker ───────────────────────────────────────────────────────────────────────────────────
function openPicker(found) {
  const pk = $("picker"); pk.replaceChildren();
  const here = location.origin + location.pathname;
  const sheet = h("div", { class: "pp-sheet" }, h("h2", { id: "picker-title" }, "Connect a wallet"));
  if (found.length) {
    sheet.append(h("p", null, "Choose the wallet you minted with."));
    found.forEach((w) => sheet.append(h("button", { class: "pp-pick", onclick: () => connectWith(w) }, w.name, h("small", null, "Detected"))));
  } else {
    sheet.append(h("p", null, "No wallet found in this browser. On a phone, open this page inside your wallet app."));
    WALLETS.forEach((w) => sheet.append(h("a", { class: "pp-pick", href: w.open(here) }, `Open in ${w.name}`, h("small", null, "Mobile"))));
    WALLETS.forEach((w) => sheet.append(h("a", { class: "pp-pick", href: w.install, target: "_blank", rel: "noopener" }, `Get ${w.name}`, h("small", null, "Desktop"))));
  }
  sheet.append(h("button", { class: "pp-btn pp-btn-ghost pp-close", onclick: closePicker }, "Cancel"));
  pk.append(sheet); pk.hidden = false;
  const first = sheet.querySelector("button, a"); first && first.focus();
}
function closePicker() { $("picker").hidden = true; }
$("picker").addEventListener("click", (e) => { if (e.target === $("picker")) closePicker(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePicker(); });

render();
// Wallet extensions inject a moment after load, so try the quiet reconnect now and once more shortly after.
autoConnect(); setTimeout(() => { if (!S.wallet) autoConnect(); }, 800);
