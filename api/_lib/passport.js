// api/_lib/passport.js (server only; the leading underscore keeps Vercel from exposing it as a route).
// Reads a wallet's WAGO Origins + Screen Touchers from a DAS-capable Solana RPC and verifies collection
// membership. Configuration comes only from environment variables set on this Vercel project:
//   PASSPORT_DAS_RPC_URL        DAS-capable RPC (Helius, Triton, QuickNode...). Contains an API key: server only.
//   WAGO_ORIGINS_COLLECTION     verified collection address for WAGO Origins
//   SCREEN_TOUCHERS_COLLECTION  verified collection address for Screen Touchers
//   PASSPORT_IPFS_GATEWAY       optional, default https://ipfs.io/ipfs/
// The RPC URL never leaves the server and is scrubbed from error messages.
const dns = require("node:dns/promises");
const net = require("node:net");

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BUDGET_MS = 8500; // stay inside the default 10s function limit

function passportConfig(env = process.env) {
  const rpc = (env.PASSPORT_DAS_RPC_URL || "").trim();
  const origins = (env.WAGO_ORIGINS_COLLECTION || "").trim();
  const screenTouchers = (env.SCREEN_TOUCHERS_COLLECTION || "").trim();
  const missing = [];
  if (!rpc) missing.push("PASSPORT_DAS_RPC_URL");
  if (!origins) missing.push("WAGO_ORIGINS_COLLECTION");
  if (!screenTouchers) missing.push("SCREEN_TOUCHERS_COLLECTION");
  const bad = [origins, screenTouchers].filter((a) => a && !SOLANA_ADDRESS_RE.test(a));
  return { rpc, origins, screenTouchers, missing, ok: !!rpc && !!(origins || screenTouchers) && bad.length === 0 };
}

const scrub = (msg, rpc) => String(msg || "").split(rpc || "\u0000").join("[rpc]").replace(/api[-_]?key=[^&\s"']+/gi, "api-key=[hidden]");

async function das(cfg, method, params, { fetchImpl = fetch, deadline = Date.now() + BUDGET_MS } = {}) {
  const left = deadline - Date.now();
  if (left < 500) throw new Error("RPC timed out");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.min(8000, left));
  try {
    const r = await fetchImpl(cfg.rpc, {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ jsonrpc: "2.0", id: "passport", method, params }),
    });
    if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(`RPC ${j.error.code}: ${j.error.message}`);
    return j.result;
  } catch (e) {
    throw new Error(scrub(e && e.name === "AbortError" ? "RPC timed out" : e && e.message, cfg.rpc));
  } finally { clearTimeout(timer); }
}

// ipfs:// and ar:// links become https gateway links; everything else must already be https.
function toHttps(uri, env = process.env) {
  const u = String(uri || "").trim();
  if (!u) return null;
  const ipfs = (env.PASSPORT_IPFS_GATEWAY || "https://ipfs.io/ipfs/").replace(/\/?$/, "/");
  if (u.startsWith("ipfs://")) return ipfs + u.slice(7).replace(/^ipfs\//, "");
  if (u.startsWith("ar://")) return "https://arweave.net/" + u.slice(5);
  return u.startsWith("https://") ? u : null;
}

function imageOf(asset, env) {
  const c = (asset && asset.content) || {};
  const files = Array.isArray(c.files) ? c.files : [];
  const f = files.find((x) => /^image\//.test((x && x.mime) || "") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test((x && x.uri) || ""));
  return toHttps((c.links && c.links.image) || (f && (f.cdn_uri || f.uri)), env);
}

function collectionOf(asset) {
  const g = ((asset && asset.grouping) || []).find((x) => x && x.group_key === "collection");
  return (g && g.group_value) || null;
}

function tokenNumber(name) {
  const m = /#\s*(\d+)/.exec(String(name == null ? "" : name));
  return m ? Number(m[1]) : null;
}

// Origins first, then by token number, then name/id. Stable, so the "first Origin" is predictable.
function sortPieces(list) {
  const rank = (p) => (p.collection === "origins" ? 0 : 1);
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const na = tokenNumber(a.name), nb = tokenNumber(b.name);
    if (na != null && nb != null && na !== nb) return na - nb;
    if (na != null && nb == null) return -1;
    if (na == null && nb != null) return 1;
    return String(a.name || a.id).localeCompare(String(b.name || b.id)) || String(a.id).localeCompare(String(b.id));
  });
}

// Keep only assets owned by this wallet, not burnt, and in a *verified* configured collection.
function classify(items, wallet, cfg, env) {
  const out = [];
  for (const a of items || []) {
    if (!a || a.burnt || !a.ownership || a.ownership.owner !== wallet) continue;
    const col = collectionOf(a);
    const kind = col && col === cfg.origins ? "origins" : col && col === cfg.screenTouchers ? "screen_touchers" : null;
    if (!kind) continue;
    const image = imageOf(a, env);
    if (!image) continue;
    const name = String((a.content && a.content.metadata && a.content.metadata.name) || "").slice(0, 80);
    out.push({ id: a.id, collection: kind, name: name || (kind === "origins" ? "WAGO Origin" : "Screen Toucher"), image });
  }
  return sortPieces(out);
}

async function fetchHoldings(wallet, cfg, { fetchImpl = fetch, env = process.env } = {}) {
  const deadline = Date.now() + BUDGET_MS;
  const items = [];
  for (let page = 1; page <= 5; page++) {
    const r = await das(cfg, "getAssetsByOwner", { ownerAddress: wallet, page, limit: 1000, options: { showUnverifiedCollections: false } }, { fetchImpl, deadline });
    items.push(...((r && r.items) || []));
    if (((r && r.items) || []).length < 1000) break;
  }
  return classify(items, wallet, cfg, env);
}

// For the image route: is this mint a verified member of one of our collections? Returns its image URL or null.
async function verifiedImageFor(mint, cfg, { fetchImpl = fetch, env = process.env } = {}) {
  if (!SOLANA_ADDRESS_RE.test(mint || "")) return null;
  const a = await das(cfg, "getAsset", { id: mint }, { fetchImpl });
  const col = collectionOf(a);
  if (!a || a.burnt || !col || (col !== cfg.origins && col !== cfg.screenTouchers)) return null;
  return imageOf(a, env);
}

// ── Safe image fetch (SSRF guard) ──────────────────────────────────────────────────────────────────────
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
    return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80");
  }
  return true;
}

async function assertPublicHost(url) {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("https only");
  if (net.isIP(u.hostname)) { if (isPrivateIp(u.hostname)) throw new Error("blocked host"); return; }
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("blocked host");
}

async function fetchImageSafe(url, { maxBytes = 8 * 1024 * 1024, fetchImpl = fetch } = {}) {
  let cur = url;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(cur);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetchImpl(cur, { redirect: "manual", signal: ctrl.signal, headers: { accept: "image/*" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).toString(); continue; }
      if (!r.ok) throw new Error(`image HTTP ${r.status}`);
      const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error("not an image");
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > maxBytes) throw new Error("image too large");
      return { buf, type };
    } finally { clearTimeout(timer); }
  }
  throw new Error("too many redirects");
}

module.exports = { SOLANA_ADDRESS_RE, passportConfig, toHttps, imageOf, collectionOf, tokenNumber, sortPieces, classify, fetchHoldings, verifiedImageFor, isPrivateIp, fetchImageSafe };
