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

// Grass click counter
const grassPatch = document.getElementById('grassPatch');
const grassCount = document.getElementById('grassClickCount');
const grassReset = document.getElementById('grassReset');
const grassStorageKey = 'touchGrassClickCount';

function getGrassClicks() {
  try {
    const saved = Number.parseInt(localStorage.getItem(grassStorageKey), 10);
    return Number.isFinite(saved) ? saved : 0;
  } catch {
    return Number.parseInt(grassCount?.dataset.count || '0', 10) || 0;
  }
}

function setGrassClicks(value) {
  try {
    localStorage.setItem(grassStorageKey, String(value));
  } catch {
    // Keep the counter working even when browser storage is blocked.
  }

  if (grassCount) {
    grassCount.dataset.count = String(value);
    grassCount.textContent = value.toLocaleString();
  }
}

function showTouchPop(event) {
  if (!grassPatch) return;

  const rect = grassPatch.getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = 'touch-pop';
  pop.textContent = '+1';
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
  pop.style.setProperty('--x', `${x}px`);
  pop.style.setProperty('--y', `${y}px`);
  grassPatch.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove(), { once: true });
}

setGrassClicks(getGrassClicks());

grassPatch?.addEventListener('click', (event) => {
  setGrassClicks(getGrassClicks() + 1);
  showTouchPop(event);
  grassPatch.classList.add('is-pressed');
  window.setTimeout(() => grassPatch.classList.remove('is-pressed'), 130);
});

grassReset?.addEventListener('click', () => {
  setGrassClicks(0);
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
