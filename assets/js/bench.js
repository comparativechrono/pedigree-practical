/* =====================================================================
   The pedigree workbench: Pedigree Studio in a frame, the list of
   pedigrees, saving each one in the student's browser, checks for the
   self-ticking steps, picking people, comparing a drawing with the family
   it should show, and the ▶ commands that drive the Studio.
   ===================================================================== */
(function () {
  'use strict';
  const PP = window.PP;
  const { h, $, $$, bus, store, toast, esc, icon } = PP;
  const CFG = PP.config;
  const ped = PP.ped;

  const defs = CFG.pedigrees || [];
  const def = (id) => defs.find((d) => d.id === id);

  /* ---------------- family files ---------------- */
  const files = {};
  function family(id) {
    const d = def(id);
    if (!d || !d.file) return Promise.resolve(null);
    if (!files[id]) files[id] = PP.fetchJSON(d.file).catch((e) => { delete files[id]; throw e; });
    return files[id];
  }

  /* ---------------- the Studio frame ---------------- */
  const frame = $('#studioFrame');
  let S = null;
  const ready = new Promise((resolve) => {
    const hook = () => {
      let w = null;
      try { w = frame.contentWindow; if (w && w.PedigreeStudio) { S = w.PedigreeStudio; resolve(S); return true; } } catch (e) { blocked(); return true; }
      return false;
    };
    if (!hook()) {
      frame.addEventListener('load', () => { if (!hook()) setTimeout(hook, 100); });
      window.addEventListener('message', () => hook());
    }
  });
  function blocked() {
    const pane = frame.parentElement;
    pane.appendChild(h('div.ex-empty', { html: '<h3>The drawing tool could not start</h3><p>Browsers block this page when it is opened straight from a file. Open it through its web address, or on your own computer run <code>python3 serve.py</code> in the practical folder and go to <code>http://localhost:8000</code>.</p>' }));
    frame.hidden = true;
  }

  /* ---------------- the list of pedigrees ---------------- */
  const select = $('#pedSelect');
  const shown = new Set(store.get('pedShown', []));
  function fillSelect() {
    select.innerHTML = '';
    const groups = {};
    defs.forEach((d) => {
      if (d.hidden && !shown.has(d.id)) return;
      const g = d.group || 'Pedigrees';
      if (!groups[g]) { groups[g] = h('optgroup', { label: g }); select.appendChild(groups[g]); }
      groups[g].appendChild(h('option', { value: d.id }, d.title));
    });
    if (current) select.value = current;
  }
  function reveal(id) {
    if (!def(id) || !def(id).hidden || shown.has(id)) return;
    shown.add(id);
    store.set('pedShown', [...shown]);
    fillSelect();
  }

  /* ---------------- open, save, reset ---------------- */
  let current = null;
  let session = null;   // the current pedigree as a Studio session
  let G = null;         // ...and as people and relationships
  const savedKey = (id) => 'ped:' + id;

  async function open(id, opts = {}) {
    const d = def(id);
    if (!d) { console.warn('No pedigree', id); return; }
    await ready;
    if (current === id && !opts.reload) { if (opts.fit) S.fit(); return; }
    if (current && S) store.set(savedKey(current), S.get());
    reveal(id);
    let ses = opts.fresh ? null : store.get(savedKey(id), null);
    let fit = !!opts.fit;
    if (!ses) {
      try {
        const scn = await family(id);
        ses = scn ? ped.toSession(scn) : { persons: [] };
      } catch (e) {
        console.error(e);
        toast('Could not load <b>' + esc(d.title) + '</b>. Check your connection and try again.', 'error');
        return;
      }
      fit = true;
    }
    current = id;
    store.set('pedCurrent', id);
    S.load(ses, { fit, message: d.title });
    setCurrent(S.get());
    select.value = id;
    bus.emit('ped:open', { id });
  }

  function setCurrent(ses) {
    session = ses;
    G = ped.graph(ses);
  }

  async function reset(id) {
    id = id || current;
    const d = def(id);
    const m = PP.modal('Start this pedigree again?', `<p>This removes your changes to <b>${esc(d.title)}</b> and starts it again from the beginning. Your other pedigrees are not affected.</p><div class="prompt-actions"><button class="btn" data-x="no" type="button">Cancel</button><button class="btn primary" data-x="yes" type="button">Start again</button></div>`);
    m.box.querySelector('[data-x="no"]').addEventListener('click', () => m.close());
    m.box.querySelector('[data-x="yes"]').addEventListener('click', async () => {
      m.close();
      store.remove(savedKey(id));
      if (id === current) { current = null; await open(id, { fresh: true }); }
      toast('Started <b>' + esc(d.title) + '</b> again.');
    });
  }

  /* ---------------- Studio events -> the page ---------------- */
  ready.then((api) => {
    api.on('change', ({ session: ses }) => {
      if (!current) return;
      store.set(savedKey(current), ses);
      setCurrent(ses);
      bus.emit('ped:change', { id: current });
    });
    api.on('action', (d) => bus.emit('studio:' + d.type, Object.assign({ ped: current }, d)));
    api.on('pick', (d) => bus.emit('studio:pick', Object.assign({ ped: current }, d)));
    fillSelect();
    const start = store.get('pedCurrent', 'practice');
    open(def(start) ? start : 'practice');
  });
  select.addEventListener('change', () => open(select.value, { fit: false }));
  $('#pedReset').addEventListener('click', () => reset());

  /* ---------------- checks for self-ticking steps ---------------- */
  const PERSON_TESTS = {
    male: (p) => p.sex === 'M' && !p.loss,
    female: (p) => p.sex === 'F' && !p.loss,
    unknown: (p) => p.sex === 'U' && !p.loss,
    loss: (p) => p.loss,
    deceased: (p) => p.deceased,
    affected: (p) => p.affected,
    proband: (p) => p.proband,
    carrier: (p) => p.carrier,
    pregnancy: (p) => p.pregnancy,
    multiple: (p) => !!p.multiple,
    adopted: (p) => p.adopted,
    named: (p) => p.text.trim().length > 0
  };
  function personMatches(p, spec) {
    return spec.split('&').every((c) => {
      c = c.trim();
      if (!c) return true;
      let m = /^text~(.+)$/i.exec(c);
      if (m) return p.text.toLowerCase().includes(m[1].toLowerCase());
      m = /^not-(\w+)$/.exec(c);
      if (m) return PERSON_TESTS[m[1]] ? !PERSON_TESTS[m[1]](p) : false;
      return PERSON_TESTS[c] ? !!PERSON_TESTS[c](p) : false;
    });
  }
  const kidsOf = (c) => { const out = []; G.parentsOf.forEach((cc, k) => { if (cc === c) out.push(k); }); return out; };
  const proband = () => [...G.people.values()].find((p) => p.proband);
  const lastCompare = {};
  const CHECKS = {
    open: (arg) => !arg || current === arg,
    has: (arg) => [...G.people.values()].some((p) => personMatches(p, arg)),
    count: (arg) => G.people.size >= Number(arg || 1),
    couple: (arg) => G.couples.some((c) => !arg || arg === 'any' || (arg === 'consanguineous' ? /consanguineous/.test(c.type) : arg === 'separated' ? /separated/.test(c.type) : c.type === arg)),
    children: (arg) => G.couples.some((c) => kidsOf(c).length >= Number(arg || 1)),
    twins: (arg) => G.twins.some((t) => !arg || arg === 'any' || t.type === arg),
    dashed: () => G.dashedLine.size > 0,
    lineSymbol: () => G.lineMarks.length > 0,
    key: () => !!session.legendVisible && Object.values(session.legendLabels || {}).some((v) => v && v.trim()),
    label: () => (session.labels || []).some((l) => (l.text || '').trim().length > 2),
    generations: (arg) => new Set([...G.people.values()].map((p) => Math.round(p.y / 60))).size >= Number(arg || 3),
    probandPartner: () => { const p = proband(); return !!p && G.couples.some((c) => c.a === p.id || c.b === p.id); },
    probandParents: () => { const p = proband(); return !!p && G.parentsOf.has(p.id); },
    probandChildren: (arg) => { const p = proband(); return !!p && G.couples.filter((c) => c.a === p.id || c.b === p.id).reduce((n, c) => n + kidsOf(c).length, 0) >= Number(arg || 1); },
    probandSiblings: (arg) => { const p = proband(); const c = p && G.parentsOf.get(p.id); return !!c && kidsOf(c).length - 1 >= Number(arg || 1); },
    grandparents: () => { const p = proband(); const c = p && G.parentsOf.get(p.id); return !!c && G.parentsOf.has(c.a) && G.parentsOf.has(c.b); },
    matches: (arg) => !!(lastCompare[arg] && lastCompare[arg].ok)
  };
  /* spec "name:arg"; pedId = which pedigree it applies to */
  function check(spec, pedId) {
    if (!G || !session) return false;
    if (pedId && pedId !== current) return false;
    const i = spec.indexOf(':');
    const name = i < 0 ? spec : spec.slice(0, i);
    const arg = i < 0 ? '' : spec.slice(i + 1);
    const fn = CHECKS[name];
    try { return fn ? !!fn(arg) : false; } catch (e) { console.error(e); return false; }
  }

  /* ---------------- picking people ---------------- */
  let pickOwner = null;
  async function pick(pedId, prompt, initial, owner) {
    if (pedId) await open(pedId);
    await ready;
    pickOwner = owner || null;
    S.pickStart({ prompt, ids: (initial || []).map(ped.sid) });
    PP.app && PP.app.showWorkbench && PP.app.showWorkbench('pedigree');
  }
  function stopPick() { if (S && S.isPicking()) S.pickStop(); pickOwner = null; }
  const picked = () => (S ? S.picked().map(ped.fid) : []);
  const isPicking = (owner) => !!(S && S.isPicking() && (!owner || owner === pickOwner));

  function highlight(ids, kind) { if (S) S.highlight((ids || []).map((x) => (String(x).startsWith('p-') || String(x).startsWith('person-') ? x : ped.sid(x))), kind); }
  function clearHighlights() { if (S) S.clearHighlights(); }

  /* ---------------- comparing a drawing with a family ---------------- */
  async function compare(pedId, expectId) {
    await ready;
    if (pedId !== current) await open(pedId);
    const scn = await family(expectId);
    const res = ped.compare(scn, S.get());
    lastCompare[pedId] = res;
    S.clearHighlights();
    if (res.issueIds.length) S.highlight(res.issueIds, 'issue');
    bus.emit('ped:compared', { id: pedId, expect: expectId, ok: res.ok });
    return res;
  }

  /* ---------------- ▶ commands ---------------- */
  async function run(cmds) {
    await ready;
    for (const raw of String(cmds).split(';')) {
      const cmd = raw.trim();
      if (!cmd) continue;
      const i = cmd.indexOf(':');
      const name = i < 0 ? cmd : cmd.slice(0, i);
      const arg = i < 0 ? '' : cmd.slice(i + 1).trim();
      const target = () => {
        const sel = S.get().persons.find((p) => p.proband);
        return sel ? sel.id : null;
      };
      if (name === 'open') await open(arg, { fit: true });
      else if (name === 'add') { S.deselect(); S.addShape(arg); }
      else if (name === 'qa') {
        const [kind, who] = arg.split('@');
        let id = who === 'proband' ? target() : null;
        if (!id) id = S.selected() || target();
        if (!id) { toast('Add a person first, or select one.', 'warn'); continue; }
        S.quickAdd(kind, id);
      } else if (name === 'tool') S.setTool(arg);
      else if (name === 'select') { const id = arg === 'proband' ? target() : ped.sid(arg); if (id) S.select(id); }
      else if (name === 'flash') S.flashControl(arg);
      else if (name === 'fit') S.fit();
      else if (name === 'key') S.toggleKey();
      else if (name === 'show') highlight(arg.split(','), 'answer');
      else console.warn('Unknown studio command', cmd);
    }
    PP.app && PP.app.showWorkbench && PP.app.showWorkbench('pedigree');
  }

  /* ---------------- pictures of pedigrees for "My answers" ---------------- */
  let renderer = null;
  function getRenderer() {
    if (renderer) return renderer;
    renderer = new Promise((resolve, reject) => {
      const f = h('iframe', { src: 'studio/index.html?embed=1', title: 'renderer', 'aria-hidden': 'true', tabindex: '-1', style: { position: 'fixed', left: '-12000px', top: '0', width: '1400px', height: '900px', visibility: 'hidden', border: '0' } });
      f.addEventListener('load', () => {
        try { if (f.contentWindow.PedigreeStudio) resolve(f.contentWindow.PedigreeStudio); else setTimeout(() => resolve(f.contentWindow.PedigreeStudio), 100); } catch (e) { reject(e); }
      });
      document.body.appendChild(f);
    });
    return renderer;
  }
  async function svgFor(id) {
    if (S && id === current) store.set(savedKey(id), S.get());
    const ses = store.get(savedKey(id), null);
    if (!ses || !(ses.persons || []).length) return null;
    const R = await getRenderer();
    R.load(ses, { fit: false });
    return R.svg();
  }

  PP.bench = {
    ready, open, reset, reveal, run, check, pick, stopPick, picked, isPicking, highlight, clearHighlights,
    compare, family, svgFor,
    current: () => current,
    session: () => session,
    defs
  };
})();
