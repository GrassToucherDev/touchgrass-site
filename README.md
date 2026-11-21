# 🌱 Touch Grass — Real Impact Starts When You Log Off

A modern, high-performance crypto website for **$TOUCHGRASS** on Solana. Built with vanilla HTML, CSS, and JavaScript.

---

## ✨ What's Included

- ✅ Hero section with animated floating elements
- ✅ Mission, Ecosystem, Tokenomics, Roadmap, Community sections
- ✅ One-click CA copy button (works everywhere)
- ✅ Responsive mobile design
- ✅ Smooth scroll animations
- ✅ Zero dependencies

---

## 📁 Your Files

```
touchgrass/
├── touchgrass.html          # Website (linked to CSS + JS)
├── style.css                # All styling
├── script.js                # Copy button and animations
└── assets/                  # Your PNG icons (20+ files)
```

---

## 🚀 Deploy to Vercel (2 mins)

1. **Push your files:**
   ```bash
   git add .
   git commit -m "Deploy TouchGrass"
   git push
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

Done. Your site is live.

---

## 🔗 Critical Info to Check

**In `touchgrass.html`:**
- ✅ Solana CA: `5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump`
- ✅ Pump.fun link in "Mint Now" button
- ✅ Meteora link in "Buy" section
- ✅ X/Telegram links in Community

**In `/assets/`:**
- ✅ All 20+ PNG files present and named correctly
- ✅ All PNGs have transparent backgrounds

---

## 🎨 Quick Customizations

**Change colors?**
Edit CSS variables in `style.css`:
```css
--grass: #3a9e4f;        /* Main green */
--grass-dark: #2a7a3b;   /* Dark green */
```

**Change copy button text?**
Edit `script.js`:
```javascript
btn.textContent = 'COPIED!';  // Change this
```

**Update roadmap?**
Edit the Q3/Q4/Q1 sections in `touchgrass.html`.

---

## 📱 Fully Responsive

Works perfectly on:
- Mobile (375px+)
- Tablet (768px+)
- Desktop (any size)

All animations smooth at 60fps.

---

## ⚡ Performance

- **0 npm packages** — instant load
- **Serverless API** — scales infinitely
- **Optimized animations** — smooth on all devices
- **One HTML file** — easy to update

---

## 🐛 If Something Breaks

| Issue | Fix |
|-------|-----|
| Copy button not working | Deployed to HTTPS/Vercel (not local file) |
| Icons not showing | Check `/assets/` folder and file names match |
| Page looks weird on mobile | Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R) |

---

## 📞 Need Help?

- **Questions about code?** Check comments in the files
- **Deployment issues?** Check Vercel dashboard
- **Assets missing?** Verify PNG names are exact (case-sensitive)

---

## 👨‍💻 Developer

**Hinckley Dev** — Frontend Developer & UI/UX Designer

- **Email**: hinckleyolagunju@gmail.com
- **X (Twitter)**: [@HinckleyDev](https://x.com/HinckleyDev)
- **GitHub**: [@HighPriest19](https://github.com/HighPriest19)

---

**Go outside. Touch some grass. Make a difference.** 🌱

---

## 🛂 WAGO Passport (`/passport`)

Lives at **touchgrass.today/passport** (not on Proof of Grass). A collector connects the wallet they minted with,
sees their verified WAGO Origins and Screen Touchers, picks a cover, and downloads a 1600×900 PNG.
Static page (`passport/`) plus two Vercel functions (`api/passport/`). No framework, no `package.json`.

Set these in the Vercel project's environment variables (server-side only, never in the page):

| Variable | What it is |
| --- | --- |
| `PASSPORT_DAS_RPC_URL` | A **DAS-capable** Solana RPC (Helius, Triton, QuickNode...). Needs `getAssetsByOwner` and `getAsset`. Contains an API key, so keep it private. |
| `WAGO_ORIGINS_COLLECTION` | Verified **collection** address for WAGO Origins (the LaunchMyNFT collection), not a candy machine or mint authority. |
| `SCREEN_TOUCHERS_COLLECTION` | Verified collection address for Screen Touchers. |
| `GRASS_TOUCHERS_COLLECTION` | Verified collection address for Grass Touchers. Optional: any one of the three collection addresses is enough for the Passport to work. |
| `PASSPORT_IPFS_GATEWAY` | Optional. Default `https://ipfs.io/ipfs/`. |
| `PASSPORT_POG_URL` | Optional. `https://` URL of the Proof of Grass endpoint `/api/passport/summary` (e.g. `https://proofofgrass.app/api/passport/summary`). Turns on the "Add my Proof of Grass stats" button. |
| `PASSPORT_PARTNER_SECRET` | Optional, 16+ characters. Must be the **same value** as `PASSPORT_PARTNER_SECRET` on the Proof of Grass Vercel project. Sent only server to server. |
| `PASSPORT_HEALTH_KEY` | Optional, 16+ characters. Switches on the private health check `/api/passport/health?key=...` (see below). Without it that URL answers 404. |

Until the first three are set, the page says "Passport is almost ready". Ownership and collection membership are
checked on the server; the download contains only the art, name and counts (never a wallet address).

**Proof of Grass stats (opt-in).** If both optional variables are set, a collector can tap "Add my Proof of Grass stats", sign a free
message (no transaction) with their wallet, and this site asks Proof of Grass for the account that has verified that same wallet.
The signature is checked here first (10 minute window), and nothing is shown unless the wallet is already verified on a Proof of
Grass profile. Stats shown: Outdoor Proofs, Day Streak, Grove, and the username as the default display name.

**Launch-day health check.** Set `PASSPORT_HEALTH_KEY`, then open `/api/passport/health?key=<that value>`. It reports, without revealing any
secret, key or RPC URL: which settings are in place, whether the RPC answers, whether each collection address is found on that
network, and whether the Proof of Grass link accepts the shared secret (`ok: true` means everything is good).

**Load protection.** One wallet's lookup is cached for 12 seconds and shared between simultaneous requests, verified image
addresses are cached for 10 minutes, and each IP is rate limited, so a mint rush of refresh taps becomes few RPC calls.
Each serverless instance keeps its own cache (best effort).

**Dry run before launch (recommended).** Use a Vercel *Preview* deployment (or a separate project) so production stays untouched:
1. Create a tiny test collection on **devnet** (any tool that makes a *verified* Metaplex collection) and mint a few pieces to a test wallet.
2. In the Preview environment set `PASSPORT_DAS_RPC_URL` to a **devnet** DAS RPC, the three collection variables to the devnet collection address(es), and the Proof of Grass variables.
3. Set `PASSPORT_HEALTH_KEY` and confirm `/api/passport/health` says `ok: true`.
4. Connect the test wallet (set the wallet app to devnet) and check: pieces appear, the cover changes, the PNG downloads, the Proof of Grass opt-in works, and a freshly minted piece shows up after Refresh.
5. Switch the variables to the real mainnet values for launch and re-run the health check.

**Security and dry-run checklist.** `scripts/devnet-test/CHECKLIST.md` covers locking down keys (separate Helius key, Vercel "Sensitive" variables, commands that
prove nothing leaks), a step-by-step devnet dry run, and launch week. `scripts/devnet-test/make-test-collection.js` makes a small TEST collection on devnet
(throwaway keypair, public devnet RPC, no private keys needed). Neither is served by the site.

Tests: `node --test tests/passport.test.js`.
