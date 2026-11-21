// Makes a small TEST collection on Solana DEVNET so you can dry-run the WAGO Passport end to end.
//
// SAFETY: this only ever talks to devnet, only uses a throwaway keypair it creates for itself (payer.keypair.json,
// git-ignored), and only needs the PUBLIC address of the wallet that should receive the test pieces.
// It never asks for a seed phrase, never reads your Phantom/Solflare keys and never needs a private API key
// (it uses the public devnet RPC). Do NOT point it at mainnet.
//
//   1) node make-test-collection.js prepare --base <url-where-you-will-host-the-json>/ [--image <public https image>] [--count 4]
//   2) host the files in out/metadata/ at that base URL (see the checklist), then
//   3) node make-test-collection.js mint --owner <your devnet wallet PUBLIC address> --base <same base url>/ [--count 4]
//
// Optional: DEVNET_RPC_URL to use a different devnet RPC (a devnet URL only; keep any key out of chat and git).
const fs = require("node:fs"), path = require("node:path");

const args = process.argv.slice(2), cmd = args[0];
const flag = (n, d) => { const i = args.indexOf("--" + n); return i > -1 ? args[i + 1] : d; };
const COUNT = Math.min(10, Math.max(1, Number(flag("count", 4)) || 4));
const BASE = (flag("base", "") || "").replace(/\/?$/, "/");
const IMAGE = flag("image", "https://touchgrass.today/assets/hero/wago-face.png");
const OUT = path.join(__dirname, "out", "metadata"), KEYFILE = path.join(__dirname, "payer.keypair.json");
const RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";

function die(msg) { console.error("\n" + msg + "\n"); process.exit(1); }
if (/mainnet/i.test(RPC)) die("Refusing to run: that looks like a mainnet RPC. This tool is devnet only.");

function prepare() {
  if (!/^https:\/\//.test(BASE)) die("Pass --base https://where-you-will-host-the-files/  (it must be public https).");
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2));
  write("collection.json", { name: "WAGO Origins TEST", symbol: "WTEST", description: "Devnet test collection for the WAGO Passport dry run. Not a real mint.", image: IMAGE });
  for (let n = 1; n <= COUNT; n++) write(`${n}.json`, { name: `WAGO Origins TEST #${n}`, symbol: "WTEST", description: "Devnet test piece. Not a real mint.", image: IMAGE, attributes: [{ trait_type: "Test", value: String(n) }] });
  console.log(`Wrote ${COUNT + 1} files to ${OUT}\nHost them so that  ${BASE}collection.json  and  ${BASE}1.json  open in a browser, then run the mint step.`);
}

async function mint() {
  const owner = flag("owner", "");
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(owner)) die("Pass --owner <the PUBLIC address of your devnet test wallet>. Never a seed phrase or private key.");
  if (!/^https:\/\//.test(BASE)) die("Pass the same --base https://... you used in the prepare step.");
  for (const f of ["collection.json", "1.json"]) if (!fs.existsSync(path.join(OUT, f))) die("Run the prepare step first.");
  for (const f of ["collection.json", "1.json"]) { try { const r = await fetch(BASE + f); if (!r.ok) throw new Error(r.status); } catch (e) { die(`${BASE}${f} isn't reachable yet (${e.message}). Host the files first, so the metadata can be read.`); } }

  const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
  const { mplCore, createCollection, create } = require("@metaplex-foundation/mpl-core");
  const { generateSigner, createSignerFromKeypair, keypairIdentity, publicKey, sol } = require("@metaplex-foundation/umi");
  const umi = createUmi(RPC).use(mplCore());

  let kp;
  if (fs.existsSync(KEYFILE)) kp = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYFILE, "utf8"))));
  else { kp = umi.eddsa.generateKeypair(); fs.writeFileSync(KEYFILE, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 }); }
  umi.use(keypairIdentity(createSignerFromKeypair(umi, kp)));
  console.log("Throwaway devnet payer (public address):", kp.publicKey);

  let bal = await umi.rpc.getBalance(kp.publicKey);
  if (bal.basisPoints < sol(0.1).basisPoints) {
    try { await umi.rpc.airdrop(kp.publicKey, sol(1)); } catch { /* rate limited: fall through */ }
    bal = await umi.rpc.getBalance(kp.publicKey);
  }
  if (bal.basisPoints < sol(0.05).basisPoints) die(`The payer needs devnet SOL. Paste ${kp.publicKey} into https://faucet.solana.com (choose devnet), then run this again.`);

  const collection = generateSigner(umi);
  await createCollection(umi, { collection, name: "WAGO Origins TEST", uri: BASE + "collection.json" }).sendAndConfirm(umi);
  console.log("Created test collection:", collection.publicKey);
  for (let n = 1; n <= COUNT; n++) {
    const asset = generateSigner(umi);
    await create(umi, { asset, collection: { publicKey: collection.publicKey }, name: `WAGO Origins TEST #${n}`, uri: `${BASE}${n}.json`, owner: publicKey(owner) }).sendAndConfirm(umi);
    console.log(`Minted #${n}:`, asset.publicKey);
  }
  console.log(`\nDone. Use this in the Vercel PREVIEW environment:\n  WAGO_ORIGINS_COLLECTION = ${collection.publicKey}\nIndexing can take a minute or two before the pieces show in the Passport.`);
}

(cmd === "prepare" ? Promise.resolve(prepare()) : cmd === "mint" ? mint() : Promise.reject(new Error("Use: prepare | mint")))
  .catch((e) => die(String(e && e.message || e).replace(/api[-_]?key=[^&\s"']+/gi, "api-key=[hidden]")));
