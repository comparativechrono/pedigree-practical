/* =====================================================================
   The Inheritance tab: what each child of a couple can inherit
   (autosomal recessive, autosomal dominant, X-linked recessive), drawn
   as chromosomes, and a calculator that chains
   probabilities into the chance a baby is affected.
   ===================================================================== */
(function () {
  'use strict';
  const PP = window.PP;
  const { h, esc, bus, store } = PP;

  const root = document.getElementById('inheritRoot');
  if (!root) return;

  const st = Object.assign({ pattern: 'ar', mother: 1, father: 1, unaffected: false, calc: { mode: 'ar', p1: '2/3', p2: '1/25', p: '1/2' } }, store.get('inherit', {}));
  const save = PP.debounce(() => store.set('inherit', st), 200);

  const PATTERNS = {
    ar: { name: 'Autosomal recessive', desc: 'A person is affected only if they inherit two faulty copies of the gene, one from each parent. Someone with one faulty copy is a carrier and is not affected.' },
    ad: { name: 'Autosomal dominant', desc: 'One faulty copy is enough to be affected or at risk. Each child of a parent with one faulty copy has a 1 in 2 chance of inheriting it, whatever their sex.' },
    xl: { name: 'X-linked recessive', desc: 'The gene is on the X chromosome. Males have one X, so one faulty copy affects them; females have two X chromosomes, so with one faulty copy they are usually carriers.' }
  };
  const OPTIONS = {
    ar: { mother: [['0', 'Not a carrier'], ['1', 'Carrier'], ['2', 'Affected']], father: [['0', 'Not a carrier'], ['1', 'Carrier'], ['2', 'Affected']] },
    ad: { mother: [['0', 'Unaffected'], ['1', 'Affected (one faulty copy)']], father: [['0', 'Unaffected'], ['1', 'Affected (one faulty copy)']] },
    xl: { mother: [['0', 'Not a carrier'], ['1', 'Carrier'], ['2', 'Affected (two faulty X)']], father: [['0', 'Unaffected'], ['1', 'Affected']] }
  };

  /* ---------- chromosome drawings ---------- */
  function chrom(x, faulty, kind) {
    const tall = kind !== 'Y';
    const hgt = tall ? 46 : 26, y = tall ? 4 : 24, w = 11;
    const notch = y + hgt * 0.4;
    const band = faulty ? `<rect x="${x + 1}" y="${y + hgt * 0.18}" width="${w - 2}" height="6" fill="#d62828"/>` : `<rect x="${x + 1}" y="${y + hgt * 0.18}" width="${w - 2}" height="6" fill="#fff" stroke="#8a99ad" stroke-width="0.6"/>`;
    return `<g><path d="M${x} ${y + 5} a5.5 5.5 0 0 1 ${w} 0 V${notch - 2} l-2 2 l2 2 V${y + hgt - 5} a5.5 5.5 0 0 1 -${w} 0 V${notch + 2} l2 -2 l-2 -2 Z" fill="#f4f7fb" stroke="#33465c" stroke-width="1.3"/>${band}${kind === 'X' || kind === 'Y' ? `<text x="${x + w / 2}" y="${y + hgt + 10}" font-size="8" text-anchor="middle" fill="#647086" font-family="system-ui,sans-serif">${kind}</text>` : ''}</g>`;
  }
  /* a cell with two chromosomes: [{faulty, kind}, {faulty, kind}] */
  function pairSVG(pair, label, cls) {
    const w = 44;
    return `<svg class="inh-pair ${cls || ''}" viewBox="0 0 ${w} 62" width="${w}" height="62" aria-hidden="true">${chrom(8, pair[0].faulty, pair[0].kind)}${chrom(25, pair[1].faulty, pair[1].kind)}</svg>`;
  }
  function oneSVG(c) {
    return `<svg class="inh-one" viewBox="0 0 22 62" width="22" height="62" aria-hidden="true">${chrom(5, c.faulty, c.kind)}</svg>`;
  }

  /* ---------- genetics ---------- */
  function parentChroms(pattern, who, n) {
    if (pattern === 'xl') {
      if (who === 'mother') return [{ faulty: n >= 1, kind: 'X' }, { faulty: n >= 2, kind: 'X' }];
      return [{ faulty: n >= 1, kind: 'X' }, { faulty: false, kind: 'Y' }];
    }
    return [{ faulty: n >= 1, kind: 'A' }, { faulty: n >= 2, kind: 'A' }];
  }
  function childStatus(pattern, pair) {
    const f = pair.filter((c) => c.faulty).length;
    if (pattern === 'xl') {
      const son = pair.some((c) => c.kind === 'Y');
      if (son) return { sex: 'son', status: f ? 'affected' : 'unaffected' };
      return { sex: 'daughter', status: f === 2 ? 'affected' : f === 1 ? 'carrier' : 'unaffected' };
    }
    if (pattern === 'ad') return { status: f ? 'affected' : 'unaffected' };
    return { status: f === 2 ? 'affected' : f === 1 ? 'carrier' : 'unaffected' };
  }
  const WORD = { affected: 'Affected', carrier: 'Carrier', unaffected: 'Unaffected' };

  function cross() {
    const m = parentChroms(st.pattern, 'mother', st.mother);
    const f = parentChroms(st.pattern, 'father', st.father);
    const kids = [];
    m.forEach((mc, i) => f.forEach((fc, j) => {
      const pair = [mc, fc];
      kids.push(Object.assign({ i, j, pair }, childStatus(st.pattern, pair)));
    }));
    return { m, f, kids };
  }

  /* ---------- fractions ---------- */
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  function frac(n, d) { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  function parseFrac(s) {
    s = String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    let m = /^(\d+)\s*\/\s*(\d+)$/.exec(s) || /^(\d+) in (\d+)$/.exec(s);
    if (m && +m[2] > 0 && +m[1] <= +m[2]) return frac(+m[1], +m[2]);
    m = /^(\d*\.?\d+)\s*%$/.exec(s);
    if (m) { const v = parseFloat(m[1]) / 100; return v >= 0 && v <= 1 ? decimal(v) : null; }
    m = /^(\d*\.?\d+)$/.exec(s);
    if (m) { const v = parseFloat(m[1]); return v >= 0 && v <= 1 ? decimal(v) : null; }
    return null;
  }
  function decimal(v) { const d = 10000; return frac(Math.round(v * d), d); }
  const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
  function show(fr) {
    if (!fr || !fr.d) return '–';
    if (fr.n === 0) return '0';
    const pct = (100 * fr.n) / fr.d;
    const oneIn = fr.d / fr.n;
    const oneInTxt = Number.isInteger(oneIn) ? `1 in ${oneIn}` : `about 1 in ${Math.round(oneIn)}`;
    return `<b>${fr.n}/${fr.d}</b> = ${oneInTxt} (${pct >= 1 ? pct.toFixed(pct < 10 ? 1 : 0) : pct.toPrecision(2)}%)`;
  }

  /* ---------- rendering ---------- */
  function render() {
    const P = PATTERNS[st.pattern];
    const opts = OPTIONS[st.pattern];
    if (!opts.mother.some((o) => +o[0] === st.mother)) st.mother = 1;
    if (!opts.father.some((o) => +o[0] === st.father)) st.father = 0;
    const { m, f, kids } = cross();
    const canCondition = st.pattern === 'ar' && kids.some((k) => k.status === 'affected') && kids.some((k) => k.status !== 'affected');
    if (!canCondition) st.unaffected = false;

    const modeBtns = Object.entries(PATTERNS).map(([k, v]) => `<button type="button" class="seg-btn${k === st.pattern ? ' on' : ''}" data-pattern="${k}">${v.name}</button>`).join('');
    const sel = (who) => `<select data-who="${who}" aria-label="${who === 'mother' ? 'Mother' : 'Father'}">${opts[who].map(([v, t]) => `<option value="${v}"${+v === st[who] ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    const gam = (list, who) => list.map((c) => `<div class="inh-gam">${oneSVG(c)}<span>${who === 'mother' ? 'egg' : 'sperm'}</span></div>`).join('');

    let grid = '<table class="inh-grid"><tr><th></th>' + f.map((c) => `<th>${oneSVG(c)}</th>`).join('') + '</tr>';
    m.forEach((mc, i) => {
      grid += `<tr><th>${oneSVG(mc)}</th>`;
      f.forEach((fc, j) => {
        const k = kids.find((x) => x.i === i && x.j === j);
        const out = st.unaffected && k.status === 'affected';
        grid += `<td class="inh-kid ${k.status}${out ? ' out' : ''}">${pairSVG(k.pair)}<span class="inh-lab">${k.sex ? (k.sex === 'son' ? 'Son: ' : 'Daughter: ') : ''}${WORD[k.status]}</span></td>`;
      });
      grid += '</tr>';
    });
    grid += '</table>';

    root.innerHTML = `
      <div class="inh">
        <div class="seg" role="group" aria-label="Pattern of inheritance">${modeBtns}</div>
        <p class="inh-desc">${esc(P.desc)}</p>
        <div class="inh-parents">
          <div class="inh-parent"><div class="inh-ptitle">Mother</div>${pairSVG(m)}${sel('mother')}</div>
          <div class="inh-x">×</div>
          <div class="inh-parent"><div class="inh-ptitle">Father</div>${pairSVG(f)}${sel('father')}</div>
        </div>
        <div class="inh-gametes"><div><div class="inh-gt">Her eggs</div><div class="inh-gl">${gam(m, 'mother')}</div></div><div><div class="inh-gt">His sperm</div><div class="inh-gl">${gam(f, 'father')}</div></div></div>
        <div class="inh-gridwrap"><div class="inh-gt">Each pregnancy is one of these four, equally likely</div>${grid}</div>
        ${canCondition ? `<label class="inh-cond"><input type="checkbox" data-unaffected${st.unaffected ? ' checked' : ''}> We already know this child is <b>unaffected</b></label>` : ''}
        <div class="inh-sum">${summary(kids)}</div>
        <p class="inh-key"><span class="sw red"></span>faulty copy of the gene <span class="sw white"></span>working copy</p>
      </div>
      <div class="inh inh-calc">
        <h3>Chance that a baby is affected</h3>
        <div class="seg" role="group" aria-label="Calculator">
          <button type="button" class="seg-btn${st.calc.mode === 'ar' ? ' on' : ''}" data-calc="ar">Recessive</button>
          <button type="button" class="seg-btn${st.calc.mode === 'ad' ? ' on' : ''}" data-calc="ad">Dominant</button>
        </div>
        ${calcHTML()}
      </div>`;
    bindEvents();
  }

  function summary(kids) {
    const pick = st.unaffected ? kids.filter((k) => k.status !== 'affected') : kids;
    const n = pick.length;
    const cnt = (filter) => pick.filter(filter).length;
    const fr = (a, b) => { if (!a) return 'no'; const g = gcd(a, b); return `${a / g} in ${b / g}`; };
    if (st.pattern === 'xl') {
      const sons = pick.filter((k) => k.sex === 'son'), dau = pick.filter((k) => k.sex === 'daughter');
      const s = (list, status) => fr(list.filter((k) => k.status === status).length, list.length);
      return `<p><b>Each son</b>: ${s(sons, 'affected')} chance of being affected.</p><p><b>Each daughter</b>: ${s(dau, 'affected')} chance of being affected, ${s(dau, 'carrier')} of being a carrier.</p>`;
    }
    if (st.pattern === 'ad') return `<p><b>Each child</b>, son or daughter: ${fr(cnt((k) => k.status === 'affected'), n)} chance of inheriting a faulty copy.</p>`;
    if (st.unaffected) return `<p>Of the <b>three</b> ways to be unaffected, <b>two</b> are carriers. So an unaffected child has a <b>${fr(cnt((k) => k.status === 'carrier'), n)}</b> chance of being a carrier – not 1 in 2.</p>`;
    return `<p><b>Each child</b>: ${fr(cnt((k) => k.status === 'affected'), n)} affected, ${fr(cnt((k) => k.status === 'carrier'), n)} a carrier, ${fr(cnt((k) => k.status === 'unaffected'), n)} neither.</p>`;
  }

  const PRESETS_AR = [['1', '1 – known carrier (e.g. tested)'], ['2/3', '2/3 – unaffected brother or sister of someone affected'], ['1/2', '1/2 – child of a known carrier'], ['1/25', '1/25 – CF carrier chance, Northern European population'], ['custom', 'Something else…']];
  const PRESETS_AD = [['1', '1 – has the variant'], ['1/2', '1/2 – child of someone with the variant'], ['1/4', '1/4 – grandchild, parent untested'], ['custom', 'Something else…']];
  function presetSel(key, val, presets) {
    const isPreset = presets.some((p) => p[0] === val);
    return `<select data-pkey="${key}">${presets.map(([v, t]) => `<option value="${v}"${(isPreset ? v === val : v === 'custom') ? ' selected' : ''}>${t}</option>`).join('')}</select><input type="text" data-pin="${key}" value="${esc(val)}" ${isPreset ? 'hidden' : ''} placeholder="e.g. 1/4" aria-label="Probability as a fraction">`;
  }
  function calcHTML() {
    const c = st.calc;
    if (c.mode === 'ad') {
      const p = parseFrac(c.p);
      const r = p ? mul(p, frac(1, 2)) : null;
      return `<div class="calc-row"><span>Chance the parent has the variant</span>${presetSel('p', c.p, PRESETS_AD)}</div>
        <div class="calc-row"><span>× chance of passing it on</span><b>1/2</b></div>
        <div class="calc-res">= ${show(r)}</div>`;
    }
    const a = parseFrac(c.p1), b = parseFrac(c.p2);
    const r = a && b ? mul(mul(a, b), frac(1, 4)) : null;
    return `<div class="calc-row"><span>Chance parent 1 is a carrier</span>${presetSel('p1', c.p1, PRESETS_AR)}</div>
      <div class="calc-row"><span>× chance parent 2 is a carrier</span>${presetSel('p2', c.p2, PRESETS_AR)}</div>
      <div class="calc-row"><span>× chance two carriers have an affected child</span><b>1/4</b></div>
      <div class="calc-res">= ${show(r)}</div>`;
  }

  function bindEvents() {
    root.querySelectorAll('[data-pattern]').forEach((b) => b.addEventListener('click', () => { st.pattern = b.dataset.pattern; changed(); }));
    root.querySelectorAll('select[data-who]').forEach((s) => s.addEventListener('change', () => { st[s.dataset.who] = +s.value; changed(); }));
    const u = root.querySelector('[data-unaffected]');
    if (u) u.addEventListener('change', () => { st.unaffected = u.checked; changed(); });
    root.querySelectorAll('[data-calc]').forEach((b) => b.addEventListener('click', () => { st.calc.mode = b.dataset.calc; changed(true); }));
    root.querySelectorAll('select[data-pkey]').forEach((s) => s.addEventListener('change', () => {
      const k = s.dataset.pkey;
      const inp = root.querySelector(`[data-pin="${k}"]`);
      if (s.value === 'custom') { inp.hidden = false; inp.focus(); return; }
      st.calc[k] = s.value;
      changed(true);
    }));
    root.querySelectorAll('input[data-pin]').forEach((inp) => {
      const apply = () => { if (parseFrac(inp.value)) { st.calc[inp.dataset.pin] = inp.value.trim(); changed(true); } else inp.classList.add('bad'); };
      inp.addEventListener('change', apply);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    });
  }

  function result() {
    const c = st.calc;
    if (c.mode === 'ad') { const p = parseFrac(c.p); return p ? mul(p, frac(1, 2)) : null; }
    const a = parseFrac(c.p1), b = parseFrac(c.p2);
    return a && b ? mul(mul(a, b), frac(1, 4)) : null;
  }
  function changed(calc) {
    save();
    render();
    if (calc) { const r = result(); bus.emit('inherit:calc', { mode: st.calc.mode, p1: st.calc.p1, p2: st.calc.p2, p: st.calc.p, result: r ? r.n + '/' + r.d : '' }); }
    else bus.emit('inherit:cross', { pattern: st.pattern, mother: st.mother, father: st.father, unaffected: st.unaffected });
  }

  /* "▶ show me" buttons: data-inherit="ar 1 1", "xl 1 0", "ar 1 1 unaffected", "calc ar 2/3 1/25", "calc ad 1/2" */
  function set(spec) {
    const p = String(spec).trim().split(/\s+/);
    if (p[0] === 'calc') {
      st.calc.mode = p[1] === 'ad' ? 'ad' : 'ar';
      if (st.calc.mode === 'ad') { if (p[2]) st.calc.p = p[2]; } else { if (p[2]) st.calc.p1 = p[2]; if (p[3]) st.calc.p2 = p[3]; }
      changed(true);
      setTimeout(() => { const el = root.querySelector('.inh-calc'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50);
      return;
    }
    if (PATTERNS[p[0]]) st.pattern = p[0];
    if (p[1] != null) st.mother = +p[1];
    if (p[2] != null) st.father = +p[2];
    st.unaffected = p.includes('unaffected');
    changed();
    (root.closest('.wb-pane') || root).scrollTop = 0;
  }
  /* checks for self-ticking steps: "cross:ar,1,1", "cross:ar,1,1,unaffected", "calc:1/150" */
  function check(spec) {
    const i = spec.indexOf(':');
    const name = spec.slice(0, i), arg = spec.slice(i + 1).split(',');
    if (name === 'cross') return st.pattern === arg[0] && st.mother === +arg[1] && st.father === +arg[2] && (!arg[3] || (arg[3] === 'unaffected') === !!st.unaffected);
    if (name === 'calc') { const r = result(); return !!r && r.n + '/' + r.d === arg[0]; }
    return false;
  }

  PP.inherit = { set, check, parseFrac };
  render();
})();
