# WAGO Passport: security + dry-run + launch checklist

Rule for everything below: **never paste an RPC URL, API key, secret or seed phrase into chat, a screenshot, a commit or a doc.**
Public wallet addresses and collection addresses are fine. They are public on-chain anyway.

## A. Lock down keys (do once, about 15 minutes)

- [ ] **Separate Helius key for the Passport.** In the Helius dashboard create a new API key just for this (name it `passport`). That keeps launch traffic away from your other apps' quota, and lets you rotate or delete it alone if it ever leaks.
- [ ] **Use its access controls if your plan has them** (allowed domains / IPs, rate limits). Note: this key is used by Vercel servers, not browsers, so domain limits may not fit. A usage alert or cap is the useful one.
- [ ] **Add the variables in Vercel, and tick "Sensitive"** (where Vercel offers it) for: `PASSPORT_DAS_RPC_URL`, `PASSPORT_PARTNER_SECRET`, `PASSPORT_HEALTH_KEY`. Sensitive values can't be read back after saving.
- [ ] **Make the two secrets random and long**: `PASSPORT_PARTNER_SECRET` (same value on the touchgrass-site and proofofgrass projects) and `PASSPORT_HEALTH_KEY` (different from the first). 24+ characters from a password manager. Never reuse a password.
- [ ] **Only server variables hold keys.** Nothing in Vercel should start with `NEXT_PUBLIC_` or otherwise be exposed to the browser for this feature (the static Passport page has no build step, so it can't see env vars at all).
- [ ] **Prove nothing leaks.** After deploying, from any terminal (these should print nothing / 404):
  - `curl -s https://touchgrass.today/passport/passport.js | grep -i -E "api-key|helius|secret"`
  - `curl -s https://touchgrass.today/passport/card.js | grep -i -E "api-key|helius|secret"`
  - `curl -s -o /dev/null -w "%{http_code}\n" https://touchgrass.today/api/passport/health`  (expect 404)
  - `curl -s -o /dev/null -w "%{http_code}\n" https://touchgrass.today/README.md`  (expect 404)
  - `curl -s -o /dev/null -w "%{http_code}\n" https://touchgrass.today/tests/passport.test.js`  (expect 404)
- [ ] **Look at it as a visitor.** On /passport open browser DevTools, Network tab, connect a wallet, and search the responses for `helius` and `api-key`. Nothing should match. The only requests should go to `/api/passport/...`, your own site.
- [ ] **If anything ever leaks:** delete that Helius key, make a new one, update the Vercel variable, redeploy. If a secret leaks, change it on both Vercel projects.

## B. Dry run on devnet (a week or two before launch)

Nothing here touches mainnet, your real wallet's keys or production settings.

- [ ] **1. Phantom on devnet.** Phantom, Settings, Developer Settings, turn on Testnet Mode, choose Solana Devnet. Copy that wallet's public address (this is fine to share).
- [ ] **2. Test metadata files online.** The files in `devtest/` (4 test pieces and a collection file) need to be public so devnet can read them. Easiest: ask Claude to publish the `devtest-assets` branch to touchgrass.today (temporary, removed after the dry run). Check that `https://touchgrass.today/devtest/1.json` opens in your browser.
- [ ] **3. Install and mint.** On your computer, in this repo:
  - `cd scripts/devnet-test`
  - `npm install`
  - `node make-test-collection.js mint --owner <your devnet public address> --base https://touchgrass.today/devtest/`
  - If it asks for devnet SOL, paste the public address it prints into https://faucet.solana.com (devnet) and run it again.
  - It prints the **test collection address**. Copy it.
- [ ] **4. Vercel PREVIEW environment only.** Add (scope: Preview): `PASSPORT_DAS_RPC_URL` = your Helius **devnet** URL, `WAGO_ORIGINS_COLLECTION` = the test collection address, `PASSPORT_HEALTH_KEY`, and the Proof of Grass pair if you want to test the opt-in. Redeploy the preview.
- [ ] **5. Health check.** Open `<preview url>/api/passport/health?key=<health key>`. Want: `"ok": true`, rpc `answering`, the collection `found`. (Preview protection may ask you to sign in to Vercel first. That's fine.)
- [ ] **6. Real wallet run** on the preview `/passport`, desktop and phone:
  - [ ] connect Phantom (devnet) and see your test pieces (allow a minute or two for indexing)
  - [ ] tap a piece to change the cover, then reload and confirm it's remembered
  - [ ] Sticker style: download the PNG and open it (1600 x 900, no wallet address on it)
  - [ ] Calm style: same
  - [ ] edit the display name; try pasting a wallet address as the name (it should be refused)
  - [ ] tap Refresh quickly 5 times (should stay fast and not error)
  - [ ] disconnect and connect a different wallet: nothing from the first wallet remains
  - [ ] Proof of Grass opt-in: sign the message, stats appear; cancel the signature and confirm nothing is shared
  - [ ] fonts look right (Fredoka and Nunito) on the real site
- [ ] **7. Clean up.** Delete the Preview variables, and ask Claude to remove `/devtest/` from touchgrass.today.

## C. Launch week

- [ ] Get the real **collection address** from LaunchMyNFT / Solscan after the collection exists. Check it on Solscan: it must be the verified **collection**, not a candy machine or mint authority. Double-check every character.
- [ ] Put the **Production** variables in Vercel: mainnet Helius URL (Sensitive), `WAGO_ORIGINS_COLLECTION`, the existing Screen Toucher and Grass Toucher collection addresses, the Proof of Grass link and the shared secret on both projects, the health key. Redeploy.
- [ ] Run the health check on production: `ok: true`.
- [ ] Re-run section A's "prove nothing leaks" commands against production.
- [ ] Mint one piece yourself, wait for indexing, connect and download your own Passport in both styles.

## D. Launch day and after

- [ ] Watch the Helius usage graph for the first hours (expect spikes when people refresh).
- [ ] If the passport shows "couldn't read your wallet" for many people, run the health check first. It will say whether it's the RPC, the collection address or the Proof of Grass link.
- [ ] A new mint can take a minute or two to appear. That's the collection index, not a bug. The page already says so.
