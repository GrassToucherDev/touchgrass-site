// GET /api/passport/collection?wallet=<address>
// Reads the wallet's WAGO Origins + Screen Touchers from chain (server-side) and returns only pieces whose
// verified collection matches the configured addresses. Public on-chain data, so no sign-in is needed.
const { passportConfig, fetchHoldings, pogConfig, SOLANA_ADDRESS_RE } = require("../_lib/passport");

const hits = new Map(); // best-effort per-instance rate limit: 30 requests / minute / IP
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter((t) => now - t < 60000);
  w.push(now); hits.set(ip, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 30;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const wallet = String((req.query && req.query.wallet) || "");
  if (!SOLANA_ADDRESS_RE.test(wallet)) return res.status(400).json({ error: "Invalid wallet address." });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (limited(ip)) return res.status(429).json({ error: "Too many requests. Wait a moment and try again." });

  const cfg = passportConfig();
  if (!cfg.ok) {
    console.error("[passport] not configured; missing:", cfg.missing.join(", ") || "valid collection address");
    return res.status(503).json({ status: "not_configured" });
  }
  try {
    const pieces = await fetchHoldings(wallet, cfg);
    return res.status(200).json({
      status: "ok",
      origins: pieces.filter((p) => p.collection === "origins"),
      screenTouchers: pieces.filter((p) => p.collection === "screen_touchers"),
      grassTouchers: pieces.filter((p) => p.collection === "grass_touchers"),
      pogEnabled: pogConfig().ok,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[passport] holdings lookup failed:", e && e.message);
    return res.status(502).json({ status: "lookup_failed", error: "Couldn't read this wallet right now." });
  }
};
