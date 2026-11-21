// GET /api/passport/health?key=<PASSPORT_HEALTH_KEY>
// Private launch-day check: which Passport settings are in place and whether the RPC, each collection and the
// Proof of Grass link actually answer. Does nothing unless PASSPORT_HEALTH_KEY is set, and answers 404 without the
// right key, so it can't be used to probe the site or burn RPC quota. Never returns a secret, key or RPC URL.
const crypto = require("node:crypto");
const { healthReport } = require("../_lib/passport");

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const key = (process.env.PASSPORT_HEALTH_KEY || "").trim(), given = String((req.query && req.query.key) || "");
  if (key.length < 16 || !same(given, key)) return res.status(404).json({ error: "Not found" });
  try { return res.status(200).json(await healthReport()); }
  catch (e) { console.error("[passport/health] failed:", e && e.message); return res.status(500).json({ error: "Health check failed." }); }
};
