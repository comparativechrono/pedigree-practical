/* =====================================================================
   Page shell and tutorial engine: chapters, ▶ buttons, self-ticking
   steps, questions, progress and "My answers". Content is in index.html.
   ===================================================================== */
(function () {
  'use strict';
  const PP = window.PP;
  const { h, esc, bus, toast, store, $, $$, icon } = PP;
  const CFG = PP.config;
  const params = new URLSearchParams(location.search);
  const SHOW_ANSWERS = CFG.showModelAnswers || params.has('answers') || params.has('instructor');

  PP.app = PP.app || {};
  const READY = { ready: false };
  const state = store.get('progress', null) || { tasks: {}, answers: {}, name: '' };
  state.tasks = state.tasks || {};
  state.answers = state.answers || {};
  const save = PP.debounce(() => store.set('progress', state), 250);
  PP.app.state = state;
  PP.app.save = save;

  /* ------------------------------------------------------------------
     Workbench tabs (right-hand side)
     ------------------------------------------------------------------ */
  function initWorkbench() {
    const tabs = $$('.wb-tab');
    const panes = $$('.wb-pane');
    const narrow = () => window.matchMedia('(max-width: 1000px)').matches;
    PP.app.showWorkbench = (name, opts = {}) => {
      if (narrow() && !opts.noOpen && READY.ready) document.body.classList.add('bench-open');
      tabs.forEach((t) => {
        const on = t.dataset.wb === name;
        t.classList.toggle('on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) t.classList.remove('attn');
      });
      panes.forEach((p) => (p.hidden = p.dataset.wb !== name));
      PP.app.currentBench = name;
      bus.emit('app:bench', { name });
    };
    tabs.forEach((t) => t.addEventListener('click', () => PP.app.showWorkbench(t.dataset.wb)));
    const fab = $('.bench-fab'), close = $('.bench-close');
    if (fab) fab.addEventListener('click', () => document.body.classList.add('bench-open'));
    if (close) close.addEventListener('click', () => document.body.classList.remove('bench-open'));
    PP.app.showWorkbench('pedigree', { noOpen: true });
  }

  function initSplitter() {
    const sp = $('.splitter');
    const saved = store.get('tutWidth', null);
    if (saved) document.documentElement.style.setProperty('--tut-w', saved);
    if (!sp) return;
    let drag = false;
    sp.addEventListener('pointerdown', (e) => { drag = true; sp.classList.add('drag'); sp.setPointerCapture(e.pointerId); document.body.classList.add('dragging'); });
    sp.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const w = PP.clamp((e.clientX / window.innerWidth) * 100, 25, 70);
      document.documentElement.style.setProperty('--tut-w', w.toFixed(1) + '%');
    });
    const end = () => {
      if (!drag) return;
      drag = false;
      sp.classList.remove('drag');
      document.body.classList.remove('dragging');
      store.set('tutWidth', getComputedStyle(document.documentElement).getPropertyValue('--tut-w').trim());
    };
    sp.addEventListener('pointerup', end);
    sp.addEventListener('pointercancel', end);
    sp.addEventListener('dblclick', () => { document.documentElement.style.setProperty('--tut-w', '44%'); store.remove('tutWidth'); });
    sp.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tut-w')) || 44;
      const w = PP.clamp(cur + (e.key === 'ArrowRight' ? 2 : -2), 25, 70);
      document.documentElement.style.setProperty('--tut-w', w + '%');
      store.set('tutWidth', w + '%');
    });
  }

  /* ------------------------------------------------------------------
     Chapters
     ------------------------------------------------------------------ */
  let chapters = [];
  function initChapters() {
    chapters = $$('.chapter');
    const nav = $('.ch-nav');
    chapters.forEach((ch, k) => {
      const b = h('button.ch-tab', { type: 'button', dataset: { ch: ch.id } }, h('span.num', ch.dataset.num || String(k)), h('span.ch-title', ch.dataset.title || ch.id));
      b.addEventListener('click', () => showChapter(ch.id, true));
      nav.appendChild(b);
      const row = h('div.next-row');
      const prev = chapters[k - 1], next = chapters[k + 1];
      row.appendChild(prev ? mkNav('← ' + (prev.dataset.title || ''), prev.id) : h('span'));
      row.appendChild(next ? mkNav((next.dataset.title || '') + ' →', next.id, true) : h('span'));
      ch.appendChild(row);
    });
    window.addEventListener('hashchange', () => routeHash());
    routeHash(true);
  }
  function mkNav(label, id, primary) {
    const b = h('button.btn' + (primary ? '.primary' : ''), { type: 'button' }, label);
    b.addEventListener('click', () => showChapter(id, true));
    return b;
  }
  function routeHash(initial) {
    const id = decodeURIComponent(location.hash.replace('#', ''));
    const ch = chapters.find((c) => c.id === id) || (id && document.getElementById(id) && document.getElementById(id).closest('.chapter'));
    if (ch) {
      showChapter(ch.id, false, initial);
      const el = document.getElementById(id);
      if (el && el !== ch) setTimeout(() => el.scrollIntoView({ block: 'start' }), 60);
    } else if (initial) showChapter(store.get('chapter', chapters[0] && chapters[0].id), false, true);
  }
  function showChapter(id, push, initial) {
    if (!chapters.some((c) => c.id === id)) id = chapters[0].id;
    chapters.forEach((c) => (c.hidden = c.id !== id));
    $$('.ch-tab').forEach((b) => b.classList.toggle('on', b.dataset.ch === id));
    store.set('chapter', id);
    const tut = $('.tut');
    if (push) {
      history.replaceState(null, '', '#' + id);
      tut.scrollTop = 0;
      if (window.innerWidth <= 1000) window.scrollTo(0, 0);
    }
    const ch = chapters.find((c) => c.id === id);
    if (ch && ch.dataset.bench) PP.app.showWorkbench(ch.dataset.bench, { noOpen: true });
    if (ch && ch.dataset.ped && !initial) PP.bench.open(ch.dataset.ped);
    if (PP.bench) { PP.bench.stopPick(); if (push) PP.bench.clearHighlights(); }
    bus.emit('app:chapter', { id });
    setTimeout(() => evalTasks(null, null), 60);
  }
  PP.app.showChapter = showChapter;

  /* ------------------------------------------------------------------
     ▶ buttons and links inside the tutorial
     ------------------------------------------------------------------ */
  function initActions() {
    document.addEventListener('click', async (e) => {
      const sel = ['goto', 'bench', 'ped', 'studio', 'inherit'].map((k) => `button[data-${k}],a[data-${k}]`).join(',');
      const b = e.target.closest(sel);
      if (!b || !b.closest('.tut, .modal')) return;
      if (b.closest('.q-actions')) return; // question controls handle themselves
      e.preventDefault();
      if (b.dataset.goto) {
        const t = document.getElementById(b.dataset.goto);
        if (t && t.classList.contains('chapter')) showChapter(t.id, true);
        else if (t) { showChapter(t.closest('.chapter').id, true); setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }
        return;
      }
      b.classList.add('running');
      try {
        if (b.dataset.bench) PP.app.showWorkbench(b.dataset.bench);
        if (b.dataset.ped) { PP.app.showWorkbench('pedigree'); await PP.bench.open(b.dataset.ped, { fit: true }); }
        if (b.dataset.studio) await PP.bench.run(b.dataset.studio);
        if (b.dataset.inherit) { PP.app.showWorkbench('inherit'); PP.inherit.set(b.dataset.inherit); }
      } finally {
        b.classList.remove('running');
      }
    });
  }

  /* ------------------------------------------------------------------
     Steps that tick themselves
     ------------------------------------------------------------------ */
  const taskEls = [];
  function parseSpec(spec) {
    return spec.split('||').map((one) => {
      const parts = one.trim().split(/\s+(?=[a-zA-Z_]+[=~<>])/);
      const ev = parts.shift();
      const conds = parts.map((p) => {
        const m = /^([a-zA-Z_]+)([=~<>])(.*)$/.exec(p.trim());
        return m ? { k: m[1], op: m[2], v: m[3] } : null;
      }).filter(Boolean);
      return { ev, conds };
    });
  }
  function matches(spec, type, d) {
    return spec.some((s) => s.ev === type && s.conds.every((c) => {
      const val = d[c.k];
      if (c.op === '=') return String(val).toLowerCase() === c.v.toLowerCase();
      if (c.op === '~') return String(val || '').toLowerCase().includes(c.v.toLowerCase());
      if (c.op === '>') return Number(val) > Number(c.v);
      if (c.op === '<') return Number(val) < Number(c.v);
      return false;
    }));
  }
  function initTasks() {
    $$('[data-task]').forEach((li) => {
      const id = li.dataset.task;
      const cb = h('input', { type: 'checkbox', 'aria-label': 'Mark as done' });
      const lab = h('label.task-check', { title: 'Tick when done' }, cb, h('span', 'done'));
      li.prepend(lab);
      if (li.dataset.auto || li.dataset.check) lab.title = 'Ticks itself when you do it – or tick it yourself';
      cb.addEventListener('change', () => setTask(id, cb.checked, false));
      const holder = li.closest('[data-ped]');
      const t = { id, li, cb, spec: li.dataset.auto ? parseSpec(li.dataset.auto) : null, check: li.dataset.check || null, ped: holder ? holder.dataset.ped : null };
      taskEls.push(t);
      if (state.tasks[id]) mark(t, true, state.tasks[id] === 'auto');
    });
    bus.on('*', (d, type) => { if (type !== 'app:bench') evalTasks(type, d); });
  }
  function evalTasks(type, d) {
    const active = chapters.find((c) => !c.hidden);
    taskEls.forEach((t) => {
      if (state.tasks[t.id]) return;
      if (active && !active.contains(t.li)) return;
      let ok = false;
      if (t.spec && type && matches(t.spec, type, d || {})) ok = true;
      if (!ok && t.check) {
        ok = t.check.split('||').some((one) => {
          one = one.trim();
          if (one.startsWith('inherit.')) return PP.inherit && PP.inherit.check(one.slice(8));
          return PP.bench && PP.bench.check(one, t.ped);
        });
      }
      if (ok) setTask(t.id, true, true);
    });
  }
  function mark(t, on, auto) {
    t.cb.checked = on;
    t.li.classList.toggle('task-done', on);
    const tag = t.li.querySelector('.auto-tag');
    if (auto && on && !tag) t.li.querySelector('.task-check').appendChild(h('span.auto-tag', '✓ spotted'));
    if (!on && tag) tag.remove();
  }
  function setTask(id, on, auto) {
    const t = taskEls.find((x) => x.id === id);
    if (!t) return;
    if (on) state.tasks[id] = auto ? 'auto' : true;
    else delete state.tasks[id];
    mark(t, on, auto);
    save();
    updateProgress();
  }

  /* ------------------------------------------------------------------
     Questions
     ------------------------------------------------------------------ */
  const qEls = [];
  function initQuestions() {
    $$('.q').forEach((q) => {
      const ch = q.closest('.chapter');
      const id = q.dataset.q;
      if (!id) { console.warn('Question without data-q', q); return; }
      const text = q.querySelector('.q-text');
      const model = q.querySelector('.q-model');
      if (model) model.hidden = true;
      const num = q.dataset.label || 'Q' + (ch ? (ch.dataset.num || '') + '.' : '') + (qEls.filter((x) => x.q.closest('.chapter') === ch).length + 1);
      const head = h('div.q-h', h('span.q-n', num));
      if (text) head.appendChild(text);
      q.prepend(head);
      const body = h('div.q-body');
      const actions = h('div.q-actions');
      const fb = h('span.q-feedback', { 'aria-live': 'polite' });
      const rec = { id, q, fb, model, num, type: q.dataset.type || (q.dataset.accept || q.dataset.prob ? 'short' : 'text'), body, actions };
      const saved = state.answers[id] || {};

      if (rec.type === 'mcq') {
        const opts = q.querySelector('.mcq');
        if (opts) {
          opts.querySelectorAll('input').forEach((inp, k) => {
            inp.name = 'mcq-' + id;
            inp.value = String(k);
            if (saved.choice === String(k)) inp.checked = true;
            inp.addEventListener('change', () => checkMCQ(rec, true));
          });
          body.appendChild(opts);
        }
      } else if (rec.type === 'pick') {
        buildPick(rec, saved);
      } else if (rec.type === 'pedcheck') {
        buildPedCheck(rec, saved);
      } else {
        const inp = rec.type === 'short'
          ? h('input', { type: 'text', 'aria-label': 'Your answer', placeholder: q.dataset.placeholder || 'Your answer', autocomplete: 'off' })
          : h('textarea', { 'aria-label': 'Your answer', placeholder: q.dataset.placeholder || 'Type your answer – it is saved in this browser' });
        inp.value = saved.text || '';
        rec.input = inp;
        body.appendChild(inp);
        inp.addEventListener('input', () => {
          state.answers[id] = Object.assign(state.answers[id] || {}, { text: inp.value });
          if (rec.type !== 'short') {
            state.answers[id].done = inp.value.trim().length > 3;
            q.classList.toggle('answered', state.answers[id].done);
          }
          save();
          updateProgressSoon();
        });
        if (rec.type === 'short') {
          const chk = h('button.btn.small', { type: 'button', html: icon('check') + '<span>Check</span>' });
          chk.addEventListener('click', () => checkShort(rec, true));
          inp.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), checkShort(rec, true)));
          actions.appendChild(chk);
        }
      }
      if (model && SHOW_ANSWERS && rec.type !== 'pick') {
        const sb = h('button.btn.small.ghost', { type: 'button', text: 'Show answer' });
        sb.addEventListener('click', () => toggleModel(rec, sb));
        actions.appendChild(sb);
      }
      actions.appendChild(fb);
      body.appendChild(actions);
      if (model) { model.classList.add('q-answer'); body.appendChild(model); }
      q.appendChild(body);
      qEls.push(rec);
      if (rec.type === 'short' && saved.text) checkShort(rec, false);
      if (rec.type === 'mcq' && saved.choice != null) checkMCQ(rec, false);
      if (rec.type === 'text' && saved.done) q.classList.add('answered');
    });
  }
  function toggleModel(rec, btn) {
    rec.model.hidden = !rec.model.hidden;
    btn.textContent = rec.model.hidden ? 'Show answer' : 'Hide answer';
    if (!rec.model.hidden) {
      state.answers[rec.id] = Object.assign(state.answers[rec.id] || {}, { revealed: true });
      save();
    }
    return !rec.model.hidden;
  }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim().replace(/[.!?;,]+$/, '');
  }

  /* Chances written in any of the usual ways – 1/4, 1 in 4, 2 out of 3,
     25%, 0.25, one in four, a quarter, half, 50:50 – as numbers, in the
     order they appear. Numbers above 1 that are not fractions or
     percentages are not chances, so they are skipped. */
  const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, 'twenty-five': 25, fifty: 50 };
  function chancesIn(text) {
    const t = (' ' + String(text || '').toLowerCase() + ' ')
      .replace(/\bfifty[\s-]*fifty\b|\b50\s*[:/]\s*50\b/g, ' 1/2 ')
      .replace(/\btwo[\s-]+thirds?\b/g, ' 2/3 ')
      .replace(/\b(?:a|one)[\s-]+third\b/g, ' 1/3 ')
      .replace(/\b(?:(?:a|one)[\s-]+)?quarter\b/g, ' 1/4 ')
      .replace(/\b(?:(?:a|one)[\s-]+)?half\b/g, ' 1/2 ')
      .replace(/\s*\b(?:per\s*cent|percent)\b/g, '%')
      .replace(/\b(twenty-five|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifty)\b/g, (w) => ' ' + WORDNUM[w] + ' ');
    const n = '(\\d+(?:\\.\\d+)?|\\.\\d+)';
    const re = new RegExp(n + '\\s*(?:/|\\bin\\b|\\bout of\\b)\\s*' + n + '|' + n + '\\s*%|' + n, 'g');
    const out = [];
    let m;
    while ((m = re.exec(t))) {
      if (m[1] != null) { if (+m[2]) out.push(+m[1] / +m[2]); }
      else if (m[3] != null) out.push(+m[3] / 100);
      else if (+m[4] <= 1) out.push(+m[4]);
    }
    return out;
  }
  const closeTo = (x, want) => Math.abs(x - want) <= 0.03 * Math.abs(want) + 1e-9;
  PP.app.chancesIn = chancesIn;
  function checkShort(rec, user) {
    const v = norm(rec.input.value);
    if (!v) { rec.fb.textContent = ''; return; }
    const accept = (rec.q.dataset.accept || '').split('||').map((s) => s.trim()).filter(Boolean);
    let ok = false;
    if (rec.q.dataset.prob) {
      // a chance: right if the first or the last chance in the answer is
      // within 3% of the expected value (so "2/3 × 1/25 × 1/4 = 1/150" counts)
      const want = chancesIn(rec.q.dataset.prob)[0];
      const got = chancesIn(v);
      ok = got.length > 0 && (closeTo(got[0], want) || closeTo(got[got.length - 1], want));
    }
    if (!ok) ok = accept.some((a) => { try { return new RegExp(a, 'i').test(v); } catch (e) { return v === norm(a); } });
    rec.fb.className = 'q-feedback ' + (ok ? 'ok' : 'no');
    rec.fb.textContent = ok ? '✓ Correct' : '✗ Not quite – ' + (rec.q.dataset.hint || 'check again');
    rec.q.classList.toggle('answered', ok);
    state.answers[rec.id] = Object.assign(state.answers[rec.id] || {}, { text: rec.input.value, correct: ok, done: ok });
    save();
    if (user) { updateProgress(); bus.emit('q:checked', { id: rec.id, ok }); }
  }
  function checkMCQ(rec, user) {
    const inputs = Array.from(rec.q.querySelectorAll('.mcq input'));
    const chosen = inputs.find((i) => i.checked);
    if (!chosen) return;
    const label = chosen.closest('label');
    const right = label.hasAttribute('data-correct');
    rec.q.querySelectorAll('.mcq label').forEach((l) => l.classList.remove('right', 'wrong'));
    label.classList.add(right ? 'right' : 'wrong');
    rec.fb.className = 'q-feedback ' + (right ? 'ok' : 'no');
    rec.fb.textContent = (right ? '✓ Correct. ' : '✗ Not quite. ') + (label.dataset.why || '');
    rec.q.classList.toggle('answered', right);
    state.answers[rec.id] = { choice: chosen.value, correct: right, done: right, text: label.textContent.trim() };
    save();
    if (user) { updateProgress(); bus.emit('q:checked', { id: rec.id, ok: right }); }
  }

  /* ---- "click the people on the pedigree" questions ---- */
  const labelsCache = {};
  async function labelsFor(pedId) {
    if (labelsCache[pedId]) return labelsCache[pedId];
    const scn = await PP.bench.family(pedId);
    const out = {};
    ((scn && scn.people) || []).forEach((p) => { out[p.id] = p.label || p.name || p.id; });
    labelsCache[pedId] = out;
    return out;
  }
  function buildPick(rec, saved) {
    const q = rec.q;
    const pedId = q.dataset.ped;
    const answer = (q.dataset.answer || '').split(',').map((s) => s.trim()).filter(Boolean);
    const prompt = q.dataset.prompt || (q.querySelector('.q-text') || {}).textContent || '';
    const go = h('button.btn.small.primary', { type: 'button', html: icon('hand') + '<span>Choose on the pedigree</span>' });
    const chk = h('button.btn.small', { type: 'button', html: icon('check') + '<span>Check</span>' });
    const chosen = h('div.pick-chosen');
    rec.picked = saved.picked || [];
    const showChosen = async () => {
      const L = await labelsFor(pedId);
      chosen.innerHTML = rec.picked.length ? 'Chosen: ' + rec.picked.map((id) => '<span class="chip">' + esc(L[id] || id) + '</span>').join(' ') : '<span class="muted">Nobody chosen yet.</span>';
    };
    showChosen();
    const setGo = (active) => { go.innerHTML = icon('hand') + '<span>' + (active ? 'Stop choosing' : 'Choose on the pedigree') + '</span>'; go.classList.toggle('primary', !active); q.classList.toggle('picking', active); };
    go.addEventListener('click', async () => {
      if (PP.bench.isPicking(rec.id)) { PP.bench.stopPick(); setGo(false); return; }
      qEls.forEach((r) => r.type === 'pick' && r !== rec && r.setGo && r.setGo(false));
      await PP.bench.pick(pedId, prompt, rec.picked, rec.id);
      setGo(true);
    });
    rec.setGo = setGo;
    bus.on('studio:pick', (d) => {
      if (!q.classList.contains('picking')) return; // another question is choosing
      rec.picked = d.ids.map(PP.ped.fid);
      state.answers[rec.id] = Object.assign(state.answers[rec.id] || {}, { picked: rec.picked });
      save();
      showChosen();
      if (d.active === false) setGo(false);
    });
    chk.addEventListener('click', async () => {
      if (PP.bench.isPicking(rec.id)) { rec.picked = PP.bench.picked(); PP.bench.stopPick(); setGo(false); }
      const L = await labelsFor(pedId);
      const got = new Set(rec.picked), want = new Set(answer);
      const right = [...got].filter((x) => want.has(x)).length;
      const wrong = [...got].filter((x) => !want.has(x)).length;
      const missing = [...want].filter((x) => !got.has(x)).length;
      const ok = wrong === 0 && missing === 0;
      rec.fb.className = 'q-feedback ' + (ok ? 'ok' : 'no');
      if (!got.size) rec.fb.textContent = 'Choose people on the pedigree first.';
      else if (ok) rec.fb.textContent = want.size === 1 ? '✓ Correct.' : '✓ Correct – you found all ' + want.size + '.';
      else rec.fb.textContent = '✗ Not yet: ' + right + ' of your ' + got.size + ' choices ' + (right === 1 ? 'is' : 'are') + ' right' + (missing ? ', and ' + missing + ' ' + (missing === 1 ? 'person is' : 'people are') + ' missing' : '') + (wrong ? '. ' + (wrong === 1 ? 'One person you chose does' : wrong + ' people you chose do') + ' not belong' : '') + '.';
      q.classList.toggle('answered', ok);
      state.answers[rec.id] = { picked: rec.picked, correct: ok, done: ok, text: rec.picked.map((id) => L[id] || id).join('; ') };
      save();
      updateProgress();
      bus.emit('q:checked', { id: rec.id, ok });
    });
    rec.actions.append(go, chk);
    if (rec.model && SHOW_ANSWERS) {
      const sb = h('button.btn.small.ghost', { type: 'button', text: 'Show answer' });
      sb.addEventListener('click', async () => {
        const open = toggleModel(rec, sb);
        if (open) { await PP.bench.open(pedId); PP.bench.highlight(answer, 'answer'); PP.app.showWorkbench('pedigree'); }
        else PP.bench.clearHighlights();
      });
      rec.actions.append(sb);
    }
    rec.body.appendChild(chosen);
    if (saved.done) q.classList.add('answered');
  }

  /* ---- "check my drawing" ---- */
  function buildPedCheck(rec, saved) {
    const q = rec.q;
    const pedId = q.dataset.ped, expect = q.dataset.expect;
    const out = h('div.pc-out');
    const chk = h('button.btn.small.primary', { type: 'button', html: icon('check') + '<span>Check my pedigree</span>' });
    const model = h('button.btn.small', { type: 'button', html: icon('pedigree') + '<span>Open the model pedigree</span>' });
    const render = (res) => {
      const L = res.items;
      const pct = res.total ? Math.round((res.correct / res.total) * 100) : 0;
      out.innerHTML = '';
      out.appendChild(h('div.pc-sum' + (res.ok ? '.ok' : ''), { html: res.ok ? '<b>✓ Your pedigree matches the family history.</b> Every person and relationship is there and drawn correctly.' : `<b>${res.found} of ${res.total}</b> people found, <b>${res.correct}</b> drawn completely correctly (${pct}%).` }));
      const list = h('ul.pc-list');
      L.slice(0, 14).forEach((it) => list.appendChild(h('li.pc-' + it.level, it.text)));
      if (L.length > 14) list.appendChild(h('li.pc-more', `…and ${L.length - 14} more. Fix these first and check again.`));
      if (L.length) out.appendChild(list);
      if (!res.ok && res.issueIds.length) out.appendChild(h('p.hint', 'People with something to fix are outlined in orange in the pedigree.'));
    };
    chk.addEventListener('click', async () => {
      chk.classList.add('running');
      try {
        PP.app.showWorkbench('pedigree');
        const res = await PP.bench.compare(pedId, expect);
        render(res);
        const summary = res.ok ? 'Matches the family history' : `${res.found}/${res.total} people found, ${res.correct} fully correct`;
        state.answers[rec.id] = { ok: res.ok, done: res.ok, found: res.found, total: res.total, correct: res.correct, text: summary, issues: res.items.map((i) => i.text) };
        q.classList.toggle('answered', res.ok);
        save();
        updateProgress();
        bus.emit('q:checked', { id: rec.id, ok: res.ok });
      } catch (e) {
        console.error(e);
        toast('The check could not run: ' + esc(e.message), 'error');
      } finally { chk.classList.remove('running'); }
    });
    model.addEventListener('click', () => { PP.app.showWorkbench('pedigree'); PP.bench.open(expect, { fit: true }); toast('Opened the model pedigree. Your own drawing is still in the list under <b>Your drawings</b>.'); });
    rec.actions.append(chk);
    if (SHOW_ANSWERS) rec.actions.append(model);
    rec.body.appendChild(out);
    if (saved.text) out.appendChild(h('p.hint', 'Last check: ' + saved.text + '.'));
    if (saved.done) q.classList.add('answered');
  }

  /* ------------------------------------------------------------------
     Progress
     ------------------------------------------------------------------ */
  function updateProgress() {
    let done = 0, total = 0;
    chapters.forEach((ch) => {
      let d = 0, t = 0;
      taskEls.forEach((x) => { if (ch.contains(x.li) && !x.li.closest('.optional')) { t++; if (state.tasks[x.id]) d++; } });
      qEls.forEach((x) => { if (ch.contains(x.q) && !x.q.closest('.optional')) { t++; if ((state.answers[x.id] || {}).done) d++; } });
      done += d;
      total += t;
      const tab = $(`.ch-tab[data-ch="${ch.id}"]`);
      if (tab) { tab.classList.toggle('done', t > 0 && d === t); tab.title = t ? `${d} of ${t} done` : ''; }
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = $('.progress > i');
    if (bar) bar.style.width = pct + '%';
    const lab = $('.progress-label');
    if (lab) lab.textContent = pct + '% done';
  }
  const updateProgressSoon = PP.debounce(updateProgress, 400);
  PP.app.updateProgress = updateProgress;

  /* ------------------------------------------------------------------
     My answers: download, copy, start again
     ------------------------------------------------------------------ */
  async function exportAnswers() {
    toast('Preparing your answers…');
    const name = state.name || '';
    const date = new Date().toLocaleString('en-GB');
    let html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>My answers – ${esc(CFG.courseTitle)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;max-width:860px;margin:30px auto;padding:0 16px;color:#222;line-height:1.45}h1{font-size:22px}h2{font-size:17px;border-bottom:1px solid #ccc;margin-top:28px}h3{font-size:15px;margin:18px 0 6px}
.q{margin:12px 0}.qt{font-weight:bold}.a{white-space:pre-wrap;background:#f4f7fa;border-left:3px solid #0b6b8a;padding:6px 10px;margin-top:4px}.none{color:#999;font-style:italic}.ok{color:#16794a}.meta{color:#666}.iv{font-size:14px}.iv p{margin:3px 0}.ped{border:1px solid #ddd;border-radius:6px;padding:8px;margin:8px 0;text-align:center}.ped svg{max-width:100%;height:auto}</style></head><body>
<h1>${esc(CFG.courseTitle)} – my answers</h1><p class="meta">${name ? 'Name: <b>' + esc(name) + '</b> · ' : ''}Saved ${esc(date)}</p>`;
    chapters.forEach((ch) => {
      const qs = qEls.filter((x) => ch.contains(x.q));
      const ts = taskEls.filter((x) => ch.contains(x.li));
      const ivs = $$('.interview', ch);
      if (!qs.length && !ts.length && !ivs.length) return;
      html += `<h2>${esc(ch.dataset.num ? ch.dataset.num + '. ' : '')}${esc(ch.dataset.title || '')}</h2>`;
      if (ts.length) html += `<p class="meta">Activity steps completed: ${ts.filter((t) => state.tasks[t.id]).length} of ${ts.length}</p>`;
      ivs.forEach((iv) => { if (PP.interview) html += PP.interview.exportHTML(iv.dataset.iv); });
      qs.forEach((x) => {
        const a = state.answers[x.id] || {};
        const qt = x.q.querySelector('.q-text');
        let ans = a.text ? `<div class="a">${esc(a.text)}</div>` : '<div class="a none">(no answer)</div>';
        if (x.type === 'pedcheck' && a.issues && a.issues.length && !a.ok) ans += `<div class="a">${a.issues.slice(0, 20).map(esc).join('\n')}</div>`;
        html += `<div class="q"><div class="qt">${esc(x.num)} ${esc(qt ? qt.textContent : '')}</div>${ans}${a.correct || a.ok ? '<div class="ok">✓ checked correct</div>' : ''}</div>`;
      });
    });
    const mine = (CFG.pedigrees || []).filter((d) => d.mine);
    let pics = '';
    for (const d of mine) {
      try {
        const svg = await PP.bench.svgFor(d.id);
        if (svg) pics += `<h3>${esc(d.title)}</h3><div class="ped">${svg.replace(/^<\?xml[^>]*>\s*/, '')}</div>`;
      } catch (e) { console.error(e); }
    }
    if (pics) html += '<h2>My pedigrees</h2>' + pics;
    html += '</body></html>';
    PP.downloadText(html, 'my-answers' + (name ? '-' + name.replace(/[^a-z0-9]+/gi, '-') : '') + '.html', 'text/html');
    toast('Saved <b>my-answers.html</b>. Open it in a browser, or in Word to print or hand in.');
  }
  async function copyAnswers() {
    let out = `${CFG.courseTitle} – my answers${state.name ? ' (' + state.name + ')' : ''}\n\n`;
    chapters.forEach((ch) => {
      const qs = qEls.filter((x) => ch.contains(x.q));
      if (!qs.length) return;
      out += `== ${ch.dataset.num ? ch.dataset.num + '. ' : ''}${ch.dataset.title} ==\n`;
      qs.forEach((x) => {
        const a = state.answers[x.id] || {};
        out += `${x.num} ${x.q.querySelector('.q-text') ? x.q.querySelector('.q-text').textContent : ''}\n${a.text || '(no answer)'}\n\n`;
      });
    });
    (await PP.copyText(out)) ? toast('Answers copied to the clipboard.') : toast('Could not copy.', 'error');
  }
  function resetProgress() {
    const m = PP.modal('Start again?', '<p>This clears your ticks, answers, interviews and pedigrees <b>in this browser</b>. Download your answers first if you want to keep them.</p><div class="prompt-actions"><button class="btn" data-x="no" type="button">Cancel</button><button class="btn primary" data-x="yes" type="button">Clear everything</button></div>');
    m.box.querySelector('[data-x="no"]').addEventListener('click', () => m.close());
    m.box.querySelector('[data-x="yes"]').addEventListener('click', () => {
      store.clearAll();
      location.hash = '';
      location.reload();
    });
  }
  function initMenus() {
    const btn = $('#answersBtn');
    if (btn) btn.addEventListener('click', () => PP.popmenu(btn, [
      ['download', 'Download my answers and pedigrees (.html)', exportAnswers],
      ['copy', 'Copy my answers as text', copyAnswers],
      ['reset', 'Start again (clear everything)', resetProgress]
    ]));
    $$('[data-student-name]').forEach((inp) => {
      inp.value = state.name || '';
      inp.addEventListener('input', () => { state.name = inp.value; save(); });
    });
    $$('[data-export-answers]').forEach((b) => b.addEventListener('click', exportAnswers));
    const t = $('.brand-title');
    if (t && CFG.courseTitle) t.textContent = CFG.courseTitle;
    const s = $('.brand-sub');
    if (s && CFG.courseSubtitle) s.textContent = CFG.courseSubtitle;
  }

  function initNudges() {
    bus.on('app:chapter', ({ id }) => {
      const ch = document.getElementById(id);
      if (!ch || !ch.dataset.bench) return;
      const tab = $(`.wb-tab[data-wb="${ch.dataset.bench}"]`);
      if (tab && PP.app.currentBench !== ch.dataset.bench) tab.classList.add('attn');
    });
  }

  function init() {
    initWorkbench();
    initSplitter();
    initChapters();
    initActions();
    initTasks();
    initQuestions();
    initMenus();
    initNudges();
    updateProgress();
    if (!SHOW_ANSWERS) document.body.classList.add('no-answers');
    READY.ready = true;
    bus.emit('app:ready', {});
    PP.bench.ready.then(() => {
      const ch = chapters.find((c) => !c.hidden);
      if (ch && ch.dataset.ped && !store.get('pedCurrent', null)) PP.bench.open(ch.dataset.ped);
      evalTasks(null, null);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
