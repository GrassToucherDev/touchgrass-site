// Run with: node --test tests/passport.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../api/_lib/passport");

const W = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", OTHER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const ORI = "BjEWJWPEeZPkmQTKHz8oXtRtE82yqp1TrKzq7GmYgA2N", ST = "8kDqxcvuiGhTA1qDfa9v4rsuxFHQwuQhwWWaauNZy2BT", FOREIGN = "FoReignCo11ect1on11111111111111111111111111", GT = "GrassTouchersTestCo11ect1on1111111111111";
const cfg = { rpc: "https://rpc.example/?api-key=SECRET123", origins: ORI, screenTouchers: ST, grassTouchers: GT, ok: true };
const asset = (id, col, owner = W, o = {}) => ({ id, ownership: { owner }, grouping: col ? [{ group_key: "collection", group_value: col }] : [], content: { metadata: { name: o.name || `WAGO Origins #${id.slice(-3)}` }, links: { image: o.image || `https://cdn.example/${id}.png` } }, ...(o.extra || {}) });
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

test("config reports missing env vars and never guesses addresses", () => {
  const c = P.passportConfig({});
  assert.equal(c.ok, false);
  assert.deepEqual(c.missing, ["PASSPORT_DAS_RPC_URL", "WAGO_ORIGINS_COLLECTION", "SCREEN_TOUCHERS_COLLECTION", "GRASS_TOUCHERS_COLLECTION"]);
  assert.equal(c.origins, ""); assert.equal(c.screenTouchers, "");
  assert.equal(P.passportConfig({ PASSPORT_DAS_RPC_URL: "https://r", WAGO_ORIGINS_COLLECTION: ORI }).ok, true);
  assert.equal(P.passportConfig({ PASSPORT_DAS_RPC_URL: "https://r", WAGO_ORIGINS_COLLECTION: "not-an-address" }).ok, false);
});

test("only verified, owned, unburnt members of the configured collections count", () => {
  const out = P.classify([asset("aaa111", ORI), asset("bbb222", ST), asset("ccc333", FOREIGN), asset("ddd444", null), asset("eee555", ORI, OTHER), asset("fff666", ORI, W, { extra: { burnt: true } })], W, cfg);
  assert.deepEqual(out.map((p) => [p.id, p.collection]), [["aaa111", "origins"], ["bbb222", "screen_touchers"]]);
});

test("Origins sort first by token number, so the first Origin is the default cover", () => {
  const out = P.classify([asset("s1", ST, W, { name: "Screen Toucher #5" }), asset("o9", ORI, W, { name: "WAGO Origins #204" }), asset("o2", ORI, W, { name: "WAGO Origins #12" })], W, cfg);
  assert.deepEqual(out.map((p) => p.id), ["o2", "o9", "s1"]);
});

test("image links: http is dropped, ipfs becomes https", () => {
  assert.deepEqual(P.classify([asset("a1", ORI, W, { image: "http://insecure/a.png" })], W, cfg), []);
  assert.equal(P.toHttps("ipfs://bafy/1.png", {}), "https://ipfs.io/ipfs/bafy/1.png");
});

test("holdings lookup pages through results and scrubs the RPC key from errors", async () => {
  const page1 = Array.from({ length: 1000 }, (_, i) => asset("n" + i, FOREIGN));
  let n = 0;
  const f = async () => ok({ result: { items: ++n === 1 ? page1 : [asset("last01", ORI)] } });
  const out = await P.fetchHoldings(W, cfg, { fetchImpl: f });
  assert.equal(n, 2); assert.deepEqual(out.map((p) => p.id), ["last01"]);
  const bad = async () => { throw new Error("boom https://rpc.example/?api-key=SECRET123"); };
  await assert.rejects(P.fetchHoldings(W, cfg, { fetchImpl: bad }), (e) => /\[rpc\]/.test(e.message) && !/SECRET123/.test(e.message));
  assert.deepEqual(await P.fetchHoldings(W, cfg, { fetchImpl: async () => ok({ result: { items: [] } }) }), []);
});

test("image route only resolves verified collection members", async () => {
  const f = (a) => async () => ok({ result: a });
  assert.equal(await P.verifiedImageFor(W, cfg, { fetchImpl: f(asset("x", ORI)) }), "https://cdn.example/x.png");
  assert.equal(await P.verifiedImageFor(W, cfg, { fetchImpl: f(asset("x", FOREIGN)) }), null);
  assert.equal(await P.verifiedImageFor("bad!", cfg, { fetchImpl: f(asset("x", ORI)) }), null);
});

test("image fetch blocks private targets, non-https, non-images and unsafe redirects", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.9", "169.254.169.254", "172.20.0.1", "::1", "fd00::1"]) assert.equal(P.isPrivateIp(ip), true, ip);
  assert.equal(P.isPrivateIp("93.184.216.34"), false);
  await assert.rejects(P.fetchImageSafe("http://93.184.216.34/a.png", { fetchImpl: async () => { throw new Error("should not fetch"); } }), /https only/);
  await assert.rejects(P.fetchImageSafe("https://169.254.169.254/latest", { fetchImpl: async () => { throw new Error("should not fetch"); } }), /blocked/);
  const png = new Uint8Array([137, 80, 78, 71]);
  const img = async () => ({ ok: true, status: 200, headers: new Headers({ "content-type": "image/png" }), arrayBuffer: async () => png.buffer });
  assert.equal((await P.fetchImageSafe("https://93.184.216.34/a.png", { fetchImpl: img })).type, "image/png");
  const html = async () => ({ ok: true, status: 200, headers: new Headers({ "content-type": "text/html" }), arrayBuffer: async () => png.buffer });
  await assert.rejects(P.fetchImageSafe("https://93.184.216.34/a", { fetchImpl: html }), /not an image/);
  const redir = async () => ({ ok: false, status: 302, headers: new Headers({ location: "https://127.0.0.1/x" }) });
  await assert.rejects(P.fetchImageSafe("https://93.184.216.34/a", { fetchImpl: redir }), /blocked/);
});

// ── Proof of Grass opt-in ───────────────────────────────────────────────────────────────────────────
const crypto = require("node:crypto");
const A58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function newWallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  let n = BigInt("0x" + publicKey.export({ format: "der", type: "spki" }).slice(-32).toString("hex")), s = "";
  while (n > 0n) { s = A58[Number(n % 58n)] + s; n /= 58n; }
  return { address: s, sign: (m) => crypto.sign(null, Buffer.from(m), privateKey).toString("base64") };
}
const call = async (handler, req) => {
  const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
  await handler({ headers: {}, socket: { remoteAddress: "9.9.9.9" }, query: {}, ...req }, res); return res;
};

test("signature check accepts the wallet's own signature only", () => {
  const w = newWallet(), o = newWallet();
  const m = P.buildPogMessage({ wallet: w.address, issuedAt: "2026-11-20T10:00:00.000Z" });
  assert.equal(P.verifyWalletSignature({ wallet: w.address, message: m, signatureB64: w.sign(m) }), true);
  assert.equal(P.verifyWalletSignature({ wallet: o.address, message: m, signatureB64: w.sign(m) }), false);
  assert.equal(P.verifyWalletSignature({ wallet: w.address, message: m + "x", signatureB64: w.sign(m) }), false);
  assert.match(m, /touchgrass\.today/); assert.ok(m.includes(w.address));
});

test("pog route: not configured, signed flow, expired, forged, not linked, secret sent", async () => {
  const pog = require("../api/passport/pog");
  const saved = { ...process.env }, realFetch = global.fetch;
  try {
    delete process.env.PASSPORT_POG_URL; delete process.env.PASSPORT_PARTNER_SECRET;
    assert.equal((await call(pog, { method: "GET", query: { wallet: W } })).code, 503);
    process.env.PASSPORT_POG_URL = "https://pog.example/api/passport/summary"; process.env.PASSPORT_PARTNER_SECRET = "a-long-shared-secret-1234";
    const w = newWallet();
    const ch = await call(pog, { method: "GET", query: { wallet: w.address } });
    assert.equal(ch.code, 200); assert.ok(ch.body.message.includes(w.address));
    const sig = w.sign(ch.body.message);
    let sent;
    global.fetch = async (u, o) => { sent = { u, o }; return { ok: true, json: async () => ({ linked: true, username: "trailtess", streak: 12, best: 30, proofs: 41, grove: "Trail Crew", secretish: "no" }) }; };
    const good = await call(pog, { method: "POST", body: { wallet: w.address, signature: sig, issuedAt: ch.body.issuedAt } });
    assert.deepEqual(good.body, { linked: true, username: "trailtess", streak: 12, best: 30, proofs: 41, grove: "Trail Crew" });
    assert.equal(sent.o.headers["x-passport-secret"], "a-long-shared-secret-1234");
    assert.equal(JSON.parse(sent.o.body).wallet, w.address);
    sent = null;
    const forged = await call(pog, { method: "POST", body: { wallet: w.address, signature: newWallet().sign(ch.body.message), issuedAt: ch.body.issuedAt } });
    assert.equal(forged.code, 400); assert.equal(sent, null, "must not call Proof of Grass without a valid signature");
    const old = new Date(Date.now() - 20 * 60000).toISOString();
    const expired = await call(pog, { method: "POST", body: { wallet: w.address, signature: w.sign(P.buildPogMessage({ wallet: w.address, issuedAt: old })), issuedAt: old } });
    assert.equal(expired.code, 400); assert.equal(sent, null);
    global.fetch = async () => ({ ok: true, json: async () => ({ linked: false }) });
    assert.deepEqual((await call(pog, { method: "POST", body: { wallet: w.address, signature: sig, issuedAt: ch.body.issuedAt } })).body, { linked: false });
    global.fetch = async () => ({ ok: false, status: 500 });
    assert.equal((await call(pog, { method: "POST", body: { wallet: w.address, signature: sig, issuedAt: ch.body.issuedAt } })).code, 502);
  } finally { global.fetch = realFetch; for (const k of ["PASSPORT_POG_URL", "PASSPORT_PARTNER_SECRET"]) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
});

test("Grass Touchers are classified, sorted after Screen Touchers, and optional", () => {
  const out = P.classify([asset("g1", GT, W, { name: "Grass Toucher #3" }), asset("s1", ST, W, { name: "Screen Toucher #5" }), asset("o1", ORI)], W, cfg);
  assert.deepEqual(out.map((p) => [p.id, p.collection]), [["o1", "origins"], ["s1", "screen_touchers"], ["g1", "grass_touchers"]]);
  assert.equal(P.passportConfig({ PASSPORT_DAS_RPC_URL: "https://r", GRASS_TOUCHERS_COLLECTION: GT }).ok, true);
  assert.equal(P.passportConfig({ PASSPORT_DAS_RPC_URL: "https://r", GRASS_TOUCHERS_COLLECTION: "bad" }).ok, false);
});
