function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

function finishPreload() {
  document.body.classList.remove('is-loading');
}

const heroImage = window.matchMedia('(max-width: 900px)').matches
  ? '/assets/hero-grass-background-mobile.png'
  : '/assets/hero-grass-background.png';

Promise.race([
  Promise.all([
    preloadImage(heroImage),
    preloadImage('/assets/touchgrass-logo.png'),
    preloadImage('/assets/solana-icon-small.png')
  ]),
  new Promise((resolve) => setTimeout(resolve, 3500))
]).then(finishPreload);

// Copy CA
function copyCa() {
  const ca = document.getElementById('ca-text').textContent;
  navigator.clipboard.writeText(ca).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

document.getElementById('copyBtn')?.addEventListener('click', copyCa);

// ── Grass clicker: WAGO reacts to every touch ──
const grassPatch = document.getElementById('grassPatch');
const grassCount = document.getElementById('grassClickCount');
const grassReset = document.getElementById('grassReset');
const wagoPose = document.getElementById('wagoPose');
const clickerBubble = document.getElementById('clickerBubble');
const clickerCombo = document.getElementById('clickerCombo');
const clickerRank = document.getElementById('clickerRank');
const clickerProgress = document.getElementById('clickerProgress');
const clickerNext = document.getElementById('clickerNext');
const grassStorageKey = 'touchGrassClickCount';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RANKS = [
  { at: 0, name: 'Indoor Kid' },
  { at: 10, name: 'Curious Sprout' },
  { at: 50, name: 'Grass Toucher' },
  { at: 100, name: 'Meadow Walker' },
  { at: 250, name: 'Field Hero' },
  { at: 500, name: 'Harvest Legend' },
  { at: 1000, name: 'Touch Grass Master' }
];

const POSES = {
  wave: '/assets/brand/wago-wave.png',
  cheer: '/assets/brand/wago-cheer.png',
  sleep: '/assets/brand/wago-sleep.png',
  salute: '/assets/brand/wago-salute.png',
  camera: '/assets/brand/wago-camera.png',
  shrug: '/assets/brand/wago-shrug.png',
  touch: '/assets/brand/wago-touch.png',
  dizzy: '/assets/brand/wago-dizzy.png'
};
Object.values(POSES).forEach((src) => { const i = new Image(); i.src = src; });

const TAP_LINES = ['Nice touch!', 'Grassy!', 'Keep going!', 'Feel that grass!', 'Outdoorsy!', 'Yes!'];

function getGrassClicks() {
  try {
    const saved = Number.parseInt(localStorage.getItem(grassStorageKey), 10);
    return Number.isFinite(saved) ? saved : 0;
  } catch {
    return Number.parseInt(grassCount?.dataset.count || '0', 10) || 0;
  }
}

function rankFor(n) {
  let idx = 0;
  RANKS.forEach((r, i) => { if (n >= r.at) idx = i; });
  return idx;
}

function renderGrassState(value) {
  if (grassCount) {
    grassCount.dataset.count = String(value);
    grassCount.textContent = value.toLocaleString();
  }
  const idx = rankFor(value);
  const cur = RANKS[idx];
  const next = RANKS[idx + 1];
  if (clickerRank) clickerRank.textContent = cur.name;
  if (next) {
    const pct = Math.min(100, ((value - cur.at) / (next.at - cur.at)) * 100);
    if (clickerProgress) clickerProgress.style.width = pct + '%';
    if (clickerNext) clickerNext.textContent = (next.at - value).toLocaleString() + ' more to reach ' + next.name;
  } else {
    if (clickerProgress) clickerProgress.style.width = '100%';
    if (clickerNext) clickerNext.textContent = 'Max rank. You are the grass now.';
  }
}

function setGrassClicks(value) {
  try {
    localStorage.setItem(grassStorageKey, String(value));
  } catch {
    // Keep the counter working even when browser storage is blocked.
  }
  renderGrassState(value);
}

// Poses
let poseTimer = null;
let sleeping = false;
let combo = 0;
let comboTimer = null;
let idleTimer = null;

function basePose() {
  if (sleeping) return 'sleep';
  return combo >= 10 ? 'cheer' : 'wave';
}

function setPose(name, holdMs) {
  if (!wagoPose) return;
  wagoPose.src = POSES[name];
  clearTimeout(poseTimer);
  if (holdMs) {
    poseTimer = setTimeout(() => { wagoPose.src = POSES[basePose()]; }, holdMs);
  }
}

function restartAnim(el, cls) {
  if (!el || reduceMotion) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

let bubbleTimer = null;
function say(text, ms = 2200) {
  if (!clickerBubble) return;
  clickerBubble.textContent = text;
  clickerBubble.hidden = false;
  restartAnim(clickerBubble, 'is-pop');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { clickerBubble.hidden = true; }, ms);
}

function sleepSoon() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    sleeping = true;
    grassPatch?.classList.add('is-sleeping');
    setPose('sleep');
  }, 8000);
}

function wakeUp() {
  if (!sleeping) return false;
  sleeping = false;
  grassPatch?.classList.remove('is-sleeping');
  say('Huh? Oh, hi! 👋', 1600);
  return true;
}

// Particles: leaves on every touch, coins on milestones
function burst(x, y, src, count, spread) {
  if (!grassPatch || reduceMotion) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('img');
    p.src = src; p.alt = ''; p.className = 'touch-fx';
    const ang = (Math.random() * Math.PI) + Math.PI; // upward fan
    const dist = spread * (0.5 + Math.random() * 0.8);
    p.style.setProperty('--x', x + 'px');
    p.style.setProperty('--y', y + 'px');
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    p.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
    grassPatch.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}

function showTouchPop(x, y, text) {
  if (!grassPatch) return;
  const pop = document.createElement('span');
  pop.className = 'touch-pop';
  pop.textContent = text;
  pop.style.setProperty('--x', `${x}px`);
  pop.style.setProperty('--y', `${y}px`);
  grassPatch.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove(), { once: true });
}

function bumpCombo() {
  combo += 1;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    combo = 0;
    if (clickerCombo) clickerCombo.classList.remove('is-on', 'is-hot');
    if (!sleeping) setPose('wave');
  }, 1300);
  if (clickerCombo) {
    if (combo >= 3) {
      clickerCombo.textContent = 'x' + combo + (combo >= 10 ? ' 🔥' : '');
      clickerCombo.classList.add('is-on');
      clickerCombo.classList.toggle('is-hot', combo >= 10);
      restartAnim(clickerCombo, 'is-bump');
    }
  }
  if (combo === 10) say('COMBO! WAGO is hyped! 🎉', 1800);
}

function celebrate(prev, next, x, y) {
  if (rankFor(next) > rankFor(prev)) {
    const r = RANKS[rankFor(next)];
    setPose('salute', 2600);
    say('Rank up: ' + r.name + '! 🌱', 2800);
    burst(x, y, '/assets/coin-gold-3d.png', 10, 120);
    restartAnim(grassPatch, 'is-shake');
    return true;
  }
  if (next % 100 === 0 || next === 25) {
    setPose('camera', 2400);
    say(next.toLocaleString() + ' touches! Selfie time 📸', 2600);
    burst(x, y, '/assets/coin-gold-3d.png', 8, 110);
    return true;
  }
  return false;
}

renderGrassState(getGrassClicks());
sleepSoon();

grassPatch?.addEventListener('click', (event) => {
  const rect = grassPatch.getBoundingClientRect();
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;

  const woke = wakeUp();
  const prev = getGrassClicks();
  const next = prev + 1;
  setGrassClicks(next);
  bumpCombo();

  restartAnim(wagoPose, 'is-squash');
  restartAnim(grassPatch, 'is-pressed');
  showTouchPop(x, y, combo >= 5 ? '+1 ×' + combo : '+1');
  burst(x, y, '/assets/leaf-green-3d.png', combo >= 10 ? 5 : 3, 90);
  if (navigator.vibrate) navigator.vibrate(8);

  const special = celebrate(prev, next, x, y);
  if (!special && !woke) {
    setPose(combo >= 10 ? 'dizzy' : combo >= 3 ? 'cheer' : 'touch', combo >= 3 ? 500 : 320);
    if (next % 7 === 0) say(TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)], 1400);
  }
  sleepSoon();
});

grassReset?.addEventListener('click', () => {
  setGrassClicks(0);
  combo = 0;
  if (clickerCombo) clickerCombo.classList.remove('is-on', 'is-hot');
  setPose('shrug', 1800);
  say('Fresh start! Back to the grass 🌿', 2000);
  sleepSoon();
});

// ── Phone carousels: dots (or a counter for long lists) that follow the swipe ──
document.querySelectorAll('.mission-grid, .eco-grid, .community-cards, .app-banners, .buy-options, .roadmap-track').forEach((track) => {
  const cards = Array.from(track.children);
  if (cards.length < 2) return;
  const nav = document.createElement('div');
  nav.className = 'carousel-dots';
  nav.setAttribute('aria-hidden', 'true');
  const useCounter = cards.length > 6;
  let counter = null;
  let dots = [];
  if (useCounter) {
    counter = document.createElement('span');
    counter.className = 'carousel-count';
    nav.appendChild(counter);
  } else {
    dots = cards.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.tabIndex = -1;
      b.addEventListener('click', () => track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: 'smooth' }));
      nav.appendChild(b);
      return b;
    });
  }
  track.after(nav);

  // One-time "swipe" hint under the track; fades out as soon as the user scrolls it.
  const hint = document.createElement('p');
  hint.className = 'swipe-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.innerHTML = '<span>Swipe</span><i>&rarr;</i>';
  nav.before(hint);
  const dismissHint = () => hint.classList.add('is-gone');
  track.addEventListener('scroll', () => { if (track.scrollLeft > 24) dismissHint(); }, { passive: true, once: false });
  track.addEventListener('touchstart', dismissHint, { passive: true, once: true });

  let ticking = false;
  function update() {
    ticking = false;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    let idx = step > 0 ? Math.round(track.scrollLeft / step) : 0;
    const max = track.scrollWidth - track.clientWidth;
    if (max > 0 && track.scrollLeft >= max - 4) idx = cards.length - 1;
    idx = Math.max(0, Math.min(cards.length - 1, idx));
    if (counter) counter.textContent = (idx + 1) + ' / ' + cards.length;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }
  track.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
});

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal, .rm-item').forEach(el => observer.observe(el));
