(() => {
  // メモ⇄qmd タブ
  document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = tab => tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const next = tabs[(i + d + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
  });

  // コードのコピー
  document.querySelectorAll('.code').forEach(block => {
    const label = block.querySelector('.label');
    const pre = block.querySelector('pre');
    if (!label || !pre || block.dataset.nocopy !== undefined) return;
    const btn = document.createElement('button');
    btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'コピー';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ''));
        btn.textContent = 'コピーしました';
      } catch { btn.textContent = 'コピーできません'; }
      setTimeout(() => (btn.textContent = 'コピー'), 1600);
    });
    label.append(btn);
  });

  // ループ再生のスライド（画面外では止める）
  document.querySelectorAll('.live').forEach(live => {
    const frame = live.querySelector('iframe');
    const btn = live.querySelector('[data-toggle]');
    let userPaused = false, visible = false;
    const send = () => {
      const paused = userPaused || !visible;
      live.classList.toggle('paused', paused);
      try { frame.contentWindow.postMessage({type: 'demo-pause', paused}, location.origin); } catch {}
    };
    btn?.addEventListener('click', () => {
      userPaused = !userPaused;
      btn.textContent = userPaused ? '▶ 再生' : '❚❚ 一時停止';
      send();
    });
    frame.addEventListener('load', send);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; send(); }, {threshold: .15}).observe(live);
  });

  // 修正前⇄修正後
  document.querySelectorAll('.ba').forEach(ba => {
    const stage = ba.querySelector('.ba-stage');
    const range = ba.querySelector('input[type="range"]');
    const buttons = [...ba.querySelectorAll('.ba-tabs button')];
    const set = v => {
      v = Math.max(0, Math.min(100, v));
      stage.style.setProperty('--pos', v + '%');
      range.value = v;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pos) === v)));
    };
    range.addEventListener('input', () => set(Number(range.value)));
    buttons.forEach(b => b.addEventListener('click', () => set(Number(b.dataset.pos))));
    let drag = false;
    const move = e => {
      const r = stage.getBoundingClientRect();
      set(Math.round((e.clientX - r.left) / r.width * 100));
    };
    stage.addEventListener('pointerdown', e => { drag = true; stage.setPointerCapture(e.pointerId); move(e); });
    stage.addEventListener('pointermove', e => drag && move(e));
    stage.addEventListener('pointerup', () => (drag = false));
    set(50);
  });

  // 目次の現在位置と読了バー
  const links = [...document.querySelectorAll('.sidenav a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const bar = document.querySelector('.progress');
  const onScroll = () => {
    const y = scrollY + 120;
    let current = sections[0];
    for (const s of sections) if (s.offsetTop <= y) current = s;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current?.id));
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, {passive: true});
  onScroll();
})();
