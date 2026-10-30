/* =====================================================================
   Pedigree helpers for the practical
   - toSession(): turn a family file from data/pedigrees/ into a Pedigree
     Studio session that the Studio can load
   - graph(): read a Studio session as people and relationships
   - compare(): check a student's drawing against the family it should show
   Plain JavaScript with no dependencies; also loads in Node for testing.
   ===================================================================== */
(function (root) {
  'use strict';

  const UNIT = 52;          // one grid unit = one symbol width (px)
  const ROW = 130;          // one generation = 2.5 symbol heights (px)
  const X0 = 200, Y0 = 160; // keep away from the canvas edge
  const PREFIX = 'p-';      // Studio ids for people from family files
  const BLACK = '#1a2332';

  const sid = (id) => PREFIX + id;                       // family-file id -> Studio id
  const fid = (id) => (String(id).startsWith(PREFIX) ? String(id).slice(PREFIX.length) : String(id)); // and back

  /* ------------------------------------------------------------------
     Family file -> Studio session
     ------------------------------------------------------------------ */
  function shapeOf(p) {
    if (p.line === 'none') return 'no-offspring';
    if (p.line === 'infertile') return 'infertile';
    if (p.loss) return 'miscarriage';
    const s = p.sex === 'M' ? 'male' : p.sex === 'F' ? 'female' : 'unknown';
    return p.adopted ? 'adopted-' + s : s;
  }

  function fillOf(p, colours) {
    const colour = (key) => (key === true ? BLACK : (colours && colours[key]) || key || BLACK);
    const out = { fillMode: 'none', fillColor: BLACK, quarters: [null, null, null, null], halves: [null, null], shadingPattern: 'stripes', shadingCoverage: 'full' };
    if (!p.affected) return out;
    if (Array.isArray(p.affected)) {
      const cs = p.affected.map(colour);
      if (cs.length === 1) { out.fillMode = 'solid'; out.fillColor = cs[0]; }
      else if (cs.length === 2) { out.fillMode = 'half'; out.halves = [cs[0], cs[1]]; }
      else { out.fillMode = 'quartered'; out.quarters = [cs[0] || null, cs[1] || null, cs[2] || null, cs[3] || null]; }
      return out;
    }
    out.fillMode = 'solid';
    out.fillColor = colour(p.affected);
    return out;
  }

  function centreOf(p) {
    if (p.carrier) return 'dot';
    if (p.pregnancy) return 'P';
    if (p.donor) return 'D';
    if (p.multiple != null) return String(p.multiple);
    return '';
  }

  function toSession(scn) {
    const unit = scn.unit || UNIT, row = scn.row || ROW;
    const persons = (scn.people || []).map((p) => Object.assign({
      id: sid(p.id),
      shape: shapeOf(p),
      x: X0 + (p.x || 0) * unit,
      y: Y0 + (p.gen || 0) * row + (p.dy || 0),
      text: p.text || '',
      deceased: !!p.deceased,
      proband: !!p.proband,
      centerText: centreOf(p),
      miscarriageSex: p.loss ? (p.sex === 'M' ? 'male' : p.sex === 'F' ? 'female' : 'unknown') : 'unknown',
      noSnap: !!p.noSnap,
      siblingFixed: false,
      customLabel: p.tag || 'Lbl'
    }, fillOf(p, scn.colours)));
    let n = 0;
    const partnerships = [];
    const coupleId = {};
    (scn.couples || []).forEach((c) => {
      const a = Array.isArray(c) ? c[0] : c.a, b = Array.isArray(c) ? c[1] : c.b;
      const type = (!Array.isArray(c) && c.type) || 'normal';
      const id = 'pship-' + (++n);
      partnerships.push({ id, fromId: sid(a), toId: sid(b), type });
      coupleId[a + '+' + b] = id;
      coupleId[b + '+' + a] = id;
    });
    const childLinks = [];
    const twinLinks = [];
    (scn.children || []).forEach((f) => {
      const pid = coupleId[f.of[0] + '+' + f.of[1]];
      if (!pid) throw new Error('No couple for children of ' + f.of.join(' and ') + ' in ' + scn.id);
      f.kids.forEach((k) => childLinks.push({ id: 'child-' + (++n), partnershipId: pid, childId: sid(k), branchYOffset: 0, dashed: (f.adoptedIn || []).includes(k) }));
    });
    (scn.twins || []).forEach((t) => {
      const cl = childLinks.find((c) => c.childId === sid(t.a));
      twinLinks.push({ id: 'twin-' + (++n), child1Id: sid(t.a), child2Id: sid(t.b), type: t.type || 'identical', partnershipId: cl ? cl.partnershipId : null });
    });
    const legendLabels = {};
    Object.entries(scn.key || {}).forEach(([k, label]) => { legendLabels[(scn.colours && scn.colours[k]) || k] = label; });
    return {
      version: 4,
      personIdCounter: 0, labelIdCounter: 0, lineIdCounter: n,
      persons,
      labels: (scn.labels || []).map((l, i) => ({ id: 'label-' + (i + 1), x: X0 + l.x * unit, y: Y0 + l.gen * row, text: l.text, size: l.size || 13, bordered: !!l.bordered })),
      partnerships, childLinks, twinLinks,
      legendLabels,
      legendVisible: !!scn.key && Object.keys(scn.key).length > 0,
      legendX: X0 + ((scn.keyAt && scn.keyAt[0]) || 0) * unit,
      legendY: Y0 + ((scn.keyAt && scn.keyAt[1]) || 0) * row,
      numberingMode: scn.numbering || 'numbers',
      partnerGapMultiplier: 2, childHeightMultiplier: 2.5,
      drawStrokes: []
    };
  }

  /* ------------------------------------------------------------------
     Reading people and relationships
     ------------------------------------------------------------------ */
  const isLine = (shape) => shape === 'no-offspring' || shape === 'infertile';
  function sexOfShape(shape, lossSex) {
    if (shape === 'male' || shape === 'adopted-male') return 'M';
    if (shape === 'female' || shape === 'adopted-female') return 'F';
    if (shape === 'miscarriage') return lossSex === 'male' ? 'M' : lossSex === 'female' ? 'F' : 'U';
    return 'U';
  }
  function isFilled(p) {
    if (!p.fillMode || p.fillMode === 'none') return false;
    if (p.fillMode === 'solid') return !!p.fillColor;
    if (p.fillMode === 'half') return (p.halves || []).some((c) => c && !/^#?f{3,6}$/i.test(c));
    if (p.fillMode === 'quartered') return (p.quarters || []).some((c) => c && !/^#?f{3,6}$/i.test(c));
    return true; // shading pattern
  }
  const MULTI = /^(\d{1,2}|n|S)$/i;

  /* Graph of a Studio session: people (without line symbols), couples,
     each child's parents, twins. */
  function graph(session) {
    const people = new Map();
    const lineMarks = [];
    (session.persons || []).forEach((p) => {
      if (isLine(p.shape)) { lineMarks.push(p.id); return; }
      const ct = p.centerText || '';
      people.set(p.id, {
        id: p.id,
        sex: sexOfShape(p.shape, p.miscarriageSex),
        loss: p.shape === 'miscarriage',
        adopted: /^adopted-/.test(p.shape || ''),
        affected: isFilled(p),
        deceased: !!p.deceased,
        proband: !!p.proband,
        carrier: ct === 'dot',
        pregnancy: ct === 'P',
        multiple: MULTI.test(ct) ? ct.toLowerCase() : null,
        text: p.text || '',
        x: p.x, y: p.y
      });
    });
    const couples = (session.partnerships || []).filter((c) => people.has(c.fromId) && people.has(c.toId))
      .map((c) => ({ id: c.id, a: c.fromId, b: c.toId, type: c.type || 'normal' }));
    const parentsOf = new Map();   // child -> couple
    const dashedLine = new Set();
    (session.childLinks || []).forEach((cl) => {
      const c = couples.find((x) => x.id === cl.partnershipId);
      if (c && people.has(cl.childId)) { parentsOf.set(cl.childId, c); if (cl.dashed) dashedLine.add(cl.childId); }
    });
    const twins = (session.twinLinks || []).map((t) => ({ a: t.child1Id, b: t.child2Id, type: t.type || 'identical' }));
    return { people, couples, parentsOf, dashedLine, twins, lineMarks };
  }

  /* Graph of a family file, using the same shape as graph(). */
  function expectedGraph(scn) {
    return graph(toSession(scn));
  }

  function partnersOf(G, id) {
    return G.couples.filter((c) => c.a === id || c.b === id).map((c) => ({ couple: c, partner: c.a === id ? c.b : c.a }));
  }
  function childrenOfCouple(G, c) {
    const out = [];
    G.parentsOf.forEach((cc, kid) => { if (cc === c) out.push(kid); });
    return out;
  }
  function parentsList(G, id) {
    const c = G.parentsOf.get(id);
    return c ? [c.a, c.b] : [];
  }

  /* ------------------------------------------------------------------
     Compare a drawing with the family it should show
     ------------------------------------------------------------------ */
  const SEX_WORD = { M: 'a square (male)', F: 'a circle (female)', U: 'a diamond (sex unknown)' };

  function nameIn(text, name) {
    if (!name || !text) return false;
    const n = String(name).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z])' + n + '([^a-z]|$)', 'i').test(text);
  }

  function score(e, s, info) {
    let sc = 0;
    if (e.loss !== s.loss) sc -= 3;
    if (e.sex === s.sex) sc += 3;
    else if (e.sex === 'U' || s.sex === 'U') sc += 1;
    ['affected', 'deceased', 'pregnancy', 'carrier'].forEach((k) => { if (!!e[k] === !!s[k]) sc += 1; });
    if (!!e.multiple === !!s.multiple) sc += 1;
    if (info && info.name && nameIn(s.text, info.name)) sc += 6;
    return sc;
  }

  /**
   * compare(scn, session, opts)
   * scn: the family file (with people[].label / name for feedback)
   * session: the student's Studio session
   * Returns { ok, total, found, correct, items: [{level, text, ids}], extraIds, issueIds, noProband }
   */
  function compare(scn, session, opts = {}) {
    const E = expectedGraph(scn);
    const S = graph(session);
    const info = {};
    (scn.people || []).forEach((p) => { info[sid(p.id)] = p; });
    const label = (eid) => (info[eid] && (info[eid].label || info[eid].name)) || fid(eid);
    const ignore = new Set((scn.check && scn.check.ignore) || []);
    const items = [];
    const match = new Map();    // expected id -> student id
    const used = new Set();

    // 1. the proband
    const eProband = [...E.people.values()].find((p) => p.proband);
    let sProband = [...S.people.values()].find((p) => p.proband);
    let noProband = false;
    if (!sProband && eProband) {
      noProband = true;
      const nm = info[eProband.id] && info[eProband.id].name;
      sProband = [...S.people.values()].find((p) => nameIn(p.text, nm));
    }
    if (eProband && sProband) { match.set(eProband.id, sProband.id); used.add(sProband.id); }

    // 2. spread out from matched people along parents, partners and children
    const bestPairs = (eIds, sIds) => {
      const cand = sIds.filter((x) => !used.has(x));
      const pairs = [];
      eIds.filter((e) => !match.has(e)).forEach((e) => cand.forEach((s) => pairs.push({ e, s, sc: score(E.people.get(e), S.people.get(s), info[e]) })));
      pairs.sort((p, q) => q.sc - p.sc);
      const got = [];
      pairs.forEach(({ e, s, sc }) => {
        if (match.has(e) || used.has(s) || sc < 2) return;
        match.set(e, s); used.add(s); got.push(e);
      });
      return got;
    };
    const queue = [...match.keys()];
    while (queue.length) {
      const e = queue.shift();
      const s = match.get(e);
      // parents
      const eP = parentsList(E, e), sP = parentsList(S, s);
      if (eP.length && sP.length) queue.push(...bestPairs(eP, sP));
      // partners, then the children of each matched couple
      const ePart = partnersOf(E, e), sPart = partnersOf(S, s);
      queue.push(...bestPairs(ePart.map((x) => x.partner), sPart.map((x) => x.partner)));
      ePart.forEach(({ couple: ec, partner: ep }) => {
        const sp = match.get(ep);
        const sc = sp ? sPart.find((x) => x.partner === sp) : null;
        const eKids = childrenOfCouple(E, ec);
        let sKids = sc ? childrenOfCouple(S, sc.couple) : [];
        if (!sc) sPart.forEach((x) => { sKids = sKids.concat(childrenOfCouple(S, x.couple)); });
        queue.push(...bestPairs(eKids, sKids));
      });
    }
    // 3. anyone left: match by the name written under the symbol
    [...E.people.keys()].filter((e) => !match.has(e)).forEach((e) => {
      const nm = info[e] && info[e].name;
      if (!nm) return;
      const s = [...S.people.values()].find((p) => !used.has(p.id) && nameIn(p.text, nm));
      if (s) {
        match.set(e, s.id); used.add(s.id);
        items.push({ level: 'wrong', text: `${label(e)} is in your drawing but is not joined to the right relatives. Check the lines above and beside them.`, ids: [s.id], e });
      }
    });

    // 4. compare what is drawn for each person
    const issueIds = new Set();
    let correct = 0;
    E.people.forEach((ep, e) => {
      const s = match.get(e);
      const name = label(e);
      if (!s) { items.push({ level: 'miss', text: `Missing: ${name}.`, ids: [], e }); return; }
      const sp = S.people.get(s);
      const probs = [];
      const chk = (k) => !ignore.has(fid(e) + '.' + k) && !ignore.has('*.' + k);
      if (chk('sex') && ep.loss !== sp.loss) probs.push(ep.loss ? 'should be a pregnancy loss (a small triangle)' : 'should not be a pregnancy loss triangle');
      else if (chk('sex') && !ep.loss && ep.sex !== sp.sex && !(ep.sex === 'U' && ep.pregnancy)) probs.push(`should be ${SEX_WORD[ep.sex]}`);
      if (chk('affected') && ep.affected !== sp.affected) probs.push(ep.affected ? 'should be shaded as affected' : 'is not affected, so should not be shaded');
      if (chk('deceased') && ep.deceased !== sp.deceased) probs.push(ep.deceased ? 'has died, so needs a diagonal line through the symbol' : 'is alive, so should not have a diagonal line');
      if (chk('pregnancy') && ep.pregnancy !== sp.pregnancy) probs.push(ep.pregnancy ? 'is a current pregnancy, so needs a P inside the symbol' : 'should not have a P inside');
      if (chk('carrier') && ep.carrier && !sp.carrier) probs.push('carries the variant without being affected: put a dot inside the symbol');
      if (chk('carrier') && !ep.carrier && sp.carrier) probs.push('should not have a carrier dot');
      if (chk('multiple') && ep.multiple && !sp.multiple) probs.push(`stands for ${ep.multiple === 'n' ? 'several' : ep.multiple} people: write ${ep.multiple === 'n' ? 'n' : 'the number'} inside one symbol`);
      else if (chk('multiple') && ep.multiple && sp.multiple && ep.multiple !== 'n' && sp.multiple !== ep.multiple && sp.multiple !== 'n' && sp.multiple !== 's') probs.push(`should have ${ep.multiple} inside`);
      if (chk('adopted') && ep.adopted !== sp.adopted) probs.push(ep.adopted ? 'was adopted: use the adopted symbol (in brackets)' : 'was not adopted, so should not be in brackets');
      if (chk('adopted') && E.dashedLine.has(e) && !S.dashedLine.has(s)) probs.push('was adopted into the family: make the line to their adoptive parents dashed');
      if (chk('proband') && ep.proband !== sp.proband) probs.push(ep.proband ? 'is the proband, so needs the arrow with its P' : 'is not the proband');
      if (probs.length) {
        items.push({ level: 'wrong', text: `${name} ${joinList(probs)}.`, ids: [s], e });
        issueIds.add(s);
      } else correct++;
    });

    // 5. relationships between matched people
    E.couples.forEach((ec) => {
      const a = match.get(ec.a), b = match.get(ec.b);
      if (!a || !b) return;
      const sc = S.couples.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
      const names = `${label(ec.a)} and ${label(ec.b)}`;
      if (!sc) { items.push({ level: 'wrong', text: `${names} should be joined by a relationship line.`, ids: [a, b] }); return; }
      const eCon = /consanguineous/.test(ec.type), sCon = /consanguineous/.test(sc.type);
      const eSep = /separated/.test(ec.type), sSep = /separated/.test(sc.type);
      if (eCon && !sCon && !ignore.has('couple.consanguineous')) items.push({ level: 'wrong', text: `${names} are related to each other: their relationship line should be double.`, ids: [a, b] });
      if (!eCon && sCon) items.push({ level: 'wrong', text: `${names} are not related to each other, so their line should be single.`, ids: [a, b] });
      if (eSep && !sSep) items.push({ level: 'wrong', text: `${names} have separated: click their relationship line and choose Separated, which adds two short slashes.`, ids: [a, b] });
      if (!eSep && sSep) items.push({ level: 'wrong', text: `${names} are still together, so their line should not be crossed through.`, ids: [a, b] });
    });
    E.twins.forEach((t) => {
      const a = match.get(t.a), b = match.get(t.b);
      if (!a || !b) return;
      const st = S.twins.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      const names = `${label(t.a)} and ${label(t.b)}`;
      if (!st) items.push({ level: 'wrong', text: `${names} are ${t.type === 'identical' ? 'identical' : 'non-identical'} twins: join them with the Twins tool.`, ids: [a, b] });
      else if (st.type !== t.type) items.push({ level: 'wrong', text: `${names} are ${t.type === 'identical' ? 'identical twins: they need the bar between the twin lines' : 'non-identical twins: their lines meet at one point with no bar or question mark between them'}.`, ids: [a, b] });
    });

    // 6. people drawn who are not in this family
    const extraIds = [...S.people.keys()].filter((s) => !used.has(s));
    if (extraIds.length) items.push({ level: 'extra', text: `${extraIds.length === 1 ? 'One person' : extraIds.length + ' people'} in your drawing ${extraIds.length === 1 ? 'does' : 'do'} not match anyone in this family (outlined in orange). Check who they are and which couple they belong to.`, ids: extraIds });
    if (noProband && eProband) items.unshift({ level: 'wrong', text: `Mark ${label(eProband.id)} as the proband: select them and turn on Proband.`, ids: sProband ? [sProband.id] : [] });

    const total = E.people.size;
    const found = [...match.keys()].length;
    const problems = items.filter((i) => i.level !== 'ok').length;
    return {
      ok: problems === 0 && found === total,
      total, found, correct,
      items,
      extraIds,
      issueIds: [...issueIds, ...extraIds],
      noProband,
      match: Object.fromEntries([...match.entries()].map(([e, s]) => [fid(e), s]))
    };
  }

  function joinList(xs) {
    if (xs.length <= 1) return xs.join('');
    return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  }

  const api = { toSession, graph, expectedGraph, compare, sid, fid, UNIT, ROW, X0, Y0 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PP = root.PP || {}; root.PP.ped = api; }
})(typeof window !== 'undefined' ? window : globalThis);
