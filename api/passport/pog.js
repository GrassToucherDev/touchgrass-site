// WAGO Passport: opt-in Proof of Grass stats.
//   GET  /api/passport/pog?wallet=<address>                      -> { message, issuedAt }  (what to sign)
//   POST /api/passport/pog  { wallet, signature(base64), issuedAt } -> { linked, ... }
// The collector signs a message with their wallet (free, no transaction). We verify the signature here, then ask
// Proof of Grass (server to server, with a shared secret) for the summary of the account that already has that
// wallet verified. Nothing is returned for a wallet that isn't linked there, and the wallet itself is never echoed.
const { SOLANA_ADDRESS_RE, buildPogMessage, verifyWalletSignature, pogConfig, POG_TTL_MS } = require("../_lib/passport");

const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter((t) => now - t < 60000);
  w.push(now); hits.set(ip, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 12;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cfg = pogConfig();
  if (!cfg.ok) return res.status(503).json({ status: "not_configured" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (limited(ip)) return res.status(429).json({ error: "Too many requests. Wait a moment and try again." });

  if (req.method === "GET") {
    const wallet = String((req.query && req.query.wallet) || "");
    if (!SOLANA_ADDRESS_RE.test(wallet)) return res.status(400).json({ error: "Invalid wallet address." });
    const issuedAt = new Date().toISOString();
    return res.status(200).json({ issuedAt, message: buildPogMessage({ wallet, issuedAt }) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { wallet, signature, issuedAt } = req.body || {};
  if (!SOLANA_ADDRESS_RE.test(String(wallet || ""))) return res.status(400).json({ error: "Invalid wallet address." });
  const age = Date.now() - new Date(issuedAt).getTime();
  if (!issuedAt || !(age >= -60000 && age <= POG_TTL_MS)) return res.status(400).json({ error: "That signature request expired. Please try again." });
  if (!verifyWalletSignature({ wallet, message: buildPogMessage({ wallet, issuedAt }), signatureB64: signature })) {
    return res.status(400).json({ error: "Couldn't verify that wallet signature." });
  }
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(cfg.url, { method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json", "x-passport-secret": cfg.secret }, body: JSON.stringify({ wallet }) }).finally(() => clearTimeout(timer));
    if (!r.ok) throw new Error(`Proof of Grass HTTP ${r.status}`);
    const j = await r.json();
    if (!j.linked) return res.status(200).json({ linked: false });
    return res.status(200).json({ linked: true, username: String(j.username || "").slice(0, 40), streak: Number(j.streak) || 0, best: Number(j.best) || 0, proofs: Number(j.proofs) || 0, grove: j.grove ? String(j.grove).slice(0, 40) : null });
  } catch (e) {
    console.error("[passport/pog] summary failed:", e && e.message);
    return res.status(502).json({ status: "lookup_failed", error: "Couldn't reach Proof of Grass right now." });
  }
};
