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

  // qmd の書き方：書いた分だけスライドに反映されるデモ（ループ）
  const qmd = document.getElementById('qmd-demo');
  if (qmd) {
    const code = qmd.querySelector('.qmd-code');
    const state = qmd.querySelector('.build-state');
    const frame = qmd.querySelector('iframe');
    const legend = [...qmd.querySelectorAll('.qmd-legend li')];
    // [テキスト, 色分けのクラス]。段階ごとに書き足し、書き終えたらスライドをその段階にする。
    const chunks = [
      {level: 1, parts: [['## 研究背景', 'tok-k'], ['\n']]},
      {level: 2, hold: 1800, parts: [['\n配送の順番や作業の順番など、社会には組合せを考えて決める問題が多くある。\n']]},
      {level: 3, hold: 6500, parts: [['\n```{=html}\n', 'tok-c'], ['<iframe src="../../html/social-problems/index.html"></iframe>', 'tok-s'], ['\n```\n', 'tok-c']]},
      {level: 4, hold: 4500, parts: [['\n制約を満たす組合せから、目的関数が最もよいものを選ぶ問題を**組合せ最適化**と呼ぶ。'], ['[@dantzig1954; @jobshop]', 'tok-k'], ['\n']]},
    ];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let level = 1, visible = false;
    const post = msg => { try { frame.contentWindow.postMessage(msg, location.origin); } catch {} };
    const setLevel = n => {
      level = n;
      legend.forEach(li => li.classList.toggle('on', Number(li.dataset.level) <= n));
      post({type: 'demo-build', level: n});
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // 画面外にある間は止めて待つ
    const wait = async ms => {
      while (ms > 0) {
        while (!visible) await sleep(200);
        const d = Math.min(ms, 200);
        await sleep(d); ms -= d;
      }
    };
    const caret = document.createElement('span');
    caret.className = 'caret';
    const write = async ([text, cls], fast) => {
      const span = document.createElement('span');
      if (cls) span.className = cls;
      code.insertBefore(span, caret);
      for (const ch of text) {
        span.textContent += ch;
        code.scrollTop = code.scrollHeight;
        if (!reduce) await wait(ch === '\n' ? 120 : fast ? 14 : 45);
      }
    };
    const reset = () => { code.replaceChildren(caret); };
    const run = async () => {
      if (reduce) {
        reset();
        for (const c of chunks) for (const p of c.parts) await write(p);
        setLevel(4);
        return;
      }
      for (;;) {
        reset();
        for (const p of chunks[0].parts) await write(p, true);
        setLevel(1);
        state.textContent = '保存済み';
        await wait(1400);
        for (const c of chunks.slice(1)) {
          state.textContent = '編集中…';
          qmd.classList.add('typing');
          for (const p of c.parts) await write(p, c.level === 3);
          qmd.classList.remove('typing');
          state.textContent = '保存 → 再ビルド';
          await wait(500);
          setLevel(c.level);
          state.textContent = '保存済み';
          await wait(c.hold);
        }
      }
    };
    frame.addEventListener('load', () => post({type: 'demo-build', level}));
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      post({type: 'demo-pause', paused: !visible});
    }, {threshold: .15}).observe(qmd);
    run();
  }

  // ヘッダーの目次メニュー
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  const setMenu = open => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.hidden); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  // 目次の現在位置と読了バー
  const links = [...menu.querySelectorAll('a')];
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
