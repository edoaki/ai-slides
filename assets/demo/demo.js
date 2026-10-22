(() => {
  const stage = document.querySelector('#stage');
  const frames = [...document.querySelectorAll('iframe')];
  let step = 0, maxStep = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer, generation = 0, ready = false;
  function resize() {
    const scale = Math.min(innerWidth / 1280, innerHeight / 720);
    Object.assign(stage.style, {transform: `scale(${scale})`, left: `${(innerWidth - 1280 * scale) / 2}px`, top: `${(innerHeight - 720 * scale) / 2}px`});
  }
  async function paint(animate) {
    const slide = document.querySelector('.slide');
    slide.querySelectorAll('[data-step]').forEach(e => e.classList.toggle('pending', Number(e.dataset.step) > step));
    slide.querySelectorAll('[data-highlight-step]').forEach(e => e.classList.toggle('is-highlighted', Number(e.dataset.highlightStep) <= step));
    await Promise.all(frames.map(f => f.contentWindow.animation.setStep(Math.min(step, f.contentWindow.animation.steps), animate)));
  }
  async function tick() {
    if (paused || document.hidden || !ready) return;
    const ticket = generation;
    step = step < maxStep ? step + 1 : 0;
    await paint(step > 0);
    if (ticket === generation && !paused) timer = setTimeout(tick, step === maxStep ? 2600 : 1100);
  }
  function setPaused(value) {
    paused = value;
    generation++;
    clearTimeout(timer);
    frames.forEach(f => f.contentWindow.animation?.setVisible?.(!paused && !document.hidden));
    if (!paused && ready && !document.hidden) timer = setTimeout(tick, 1100);
  }
  window.demo = {setPaused, get step() {return step;}, get maxStep() {return maxStep;}, get paused() {return paused;}, get ready() {return ready;}};
  addEventListener('message', e => {
    if (e.source === parent && e.origin === location.origin && e.data?.type === 'demo-pause' && typeof e.data.paused === 'boolean') setPaused(e.data.paused);
  });
  document.addEventListener('visibilitychange', () => {
    generation++; clearTimeout(timer);
    frames.forEach(f => f.contentWindow.animation?.setVisible?.(!paused && !document.hidden));
    if (!document.hidden && !paused && ready) timer = setTimeout(tick, 1100);
  });
  addEventListener('resize', resize); resize();
  Promise.all(frames.map(f => new Promise(resolve => {
    if (f.contentWindow?.animation) resolve();
    else f.addEventListener('load', resolve, {once: true});
  }))).then(async () => {
    maxStep = Math.max(0, ...frames.map(f => f.contentWindow.animation.steps), ...[...document.querySelectorAll('[data-step],[data-highlight-step]')].map(e => Number(e.dataset.step || e.dataset.highlightStep)));
    frames.forEach(f => f.contentWindow.animation.setVisible?.(!paused));
    await paint(false); ready = true;
    if (!paused) timer = setTimeout(tick, 1500);
  });
})();
