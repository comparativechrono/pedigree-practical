/* =====================================================================
   Pedigree Studio – practical edition
   Runs after engine.js. It starts the engine, wires up the toolbar and
   the inspector, adds "Add a relative", picking and highlighting people,
   and exposes window.PedigreeStudio for the practical page.

   The engine's functions and variables are globals (it is a classic
   script), so this file calls them directly. A few engine functions are
   wrapped here rather than edited in engine.js.
   ===================================================================== */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const EMBEDDED = params.has('embed');
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------
     Storage: on its own the Studio keeps one pedigree in this browser.
     Inside the practical, the practical page stores each pedigree.
     ------------------------------------------------------------------ */
  PS_SESSION_KEY = 'pedigree-practical:studio';

  /* ------------------------------------------------------------------
     Events for the practical page
     ------------------------------------------------------------------ */
  const listeners = {};
  function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); return () => off(type, fn); }
  function off(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); }
  function emit(type, detail) {
    (listeners[type] || []).slice().forEach((fn) => { try { fn(detail || {}); } catch (e) { console.error(e); } });
  }

  /* change notification replaces the engine's auto-save */
  let suppress = 0;
  let changeTimer = null;
  scheduleSave = function () {
    if (suppress) return;
    $('emptyHint').hidden = persons.size > 0 || labels.size > 0 || drawStrokes.length > 0;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      let data;
      try { data = buildSessionData(); } catch (e) { console.error(e); return; }
      if (!EMBEDDED) { try { localStorage.setItem(PS_SESSION_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ } }
      clearHighlights('issue');
      refreshChrome();
      emit('change', { session: data });
    }, 350);
  };

  function status(msg) { const s = $('statusBar'); if (s) s.textContent = msg; }

  /* ------------------------------------------------------------------
     Small helpers on top of the engine's data
     ------------------------------------------------------------------ */
  function sexOfShape(shape) {
    if (shape === 'male' || shape === 'adopted-male') return 'M';
    if (shape === 'female' || shape === 'adopted-female') return 'F';
    return 'U';
  }
  const newPersonId = () => 'person-' + (++personIdCounter);
  const parentPship = (id) => {
    const cl = childLinks.find((c) => c.childId === id);
    return cl ? partnerships.find((p) => p.id === cl.partnershipId) : null;
  };
  const pshipsOf = (id) => partnerships.filter((p) => p.fromId === id || p.toId === id);
  const kidsOf = (pid) => childLinks.filter((c) => c.partnershipId === pid).map((c) => c.childId).filter((k) => persons.has(k));

  /* Run several engine operations as one undoable step. With tidy, the
     pedigree is laid out again afterwards, in the same step: the engine's
     placement of new people on its own can leave two couples' children on
     one shared sibship line, or a generation drawn half a row out. */
  function group(fn, opts) {
    pushUndo();
    undoGroupActive = true;
    const oneAtATime = individualMoveMode;
    individualMoveMode = false; // new relatives are placed as families
    let out;
    try {
      out = fn();
      if (opts && opts.tidy && persons.size) {
        runManagedPedigreeLayout({ seedIds: Array.from(persons.keys()), reason: 'addRelative' });
      }
    } finally {
      undoGroupActive = false;
      individualMoveMode = oneAtATime;
    }
    keepInView();
    updateAllConnections();
    updateNumbering();
    updateTextWrapping();
    expandCanvasIfNeeded();
    scheduleSave();
    return out;
  }

  /* Keep everyone at positive coordinates (adding parents above the top
     row could push people above the canvas); shift the view to match. */
  function keepInView() {
    let minX = Infinity, minY = Infinity;
    persons.forEach((p) => { minX = Math.min(minX, getPersonX(p.id)); minY = Math.min(minY, getPersonY(p.id)); });
    if (!isFinite(minX)) return;
    const dx = minX < 40 ? 200 - minX : 0;
    const dy = minY < 40 ? 200 - minY : 0;
    if (!dx && !dy) return;
    persons.forEach((p) => setPersonPos(p.id, getPersonX(p.id) + dx, getPersonY(p.id) + dy));
    labels.forEach((l) => { l.el.style.left = (parseFloat(l.el.style.left) + dx) + 'px'; l.el.style.top = (parseFloat(l.el.style.top) + dy) + 'px'; });
    drawStrokes.forEach((s) => { s.points.forEach((pt) => { pt.x += dx; pt.y += dy; }); if (s.el) s.el.setAttribute('d', buildStrokePathD(s.points)); });
    if (typeof legendX === 'number') { legendX += dx; legendY += dy; const lb = $('legend-box'); if (lb) { lb.style.left = legendX + 'px'; lb.style.top = legendY + 'px'; } }
    panX -= dx * zoomLevel;
    panY -= dy * zoomLevel;
    applyTransform();
  }

  /* Where someone is on the screen, so that the view can be moved to keep
     them there after the pedigree has been laid out again. */
  const screenSpot = (id) => (persons.has(id) ? { x: getPersonX(id) * zoomLevel + panX, y: getPersonY(id) * zoomLevel + panY } : null);
  function holdOnScreen(id, spot) {
    const now = screenSpot(id);
    if (!spot || !now) return;
    panX += spot.x - now.x;
    panY += spot.y - now.y;
    applyTransform();
  }

  function flashPeople(ids) {
    ids.forEach((id) => {
      const p = persons.get(id);
      if (!p) return;
      p.el.classList.remove('hl-flash');
      void p.el.offsetWidth;
      p.el.classList.add('hl-flash');
      setTimeout(() => p.el.classList.remove('hl-flash'), 2600);
    });
  }

  /* ------------------------------------------------------------------
     Add a relative
     ------------------------------------------------------------------ */
  function addPartnerCore(id, shapeWanted) {
    const p = persons.get(id);
    if (!p) return null;
    const sex = sexOfShape(p.shape);
    const shape = shapeWanted || (sex === 'M' ? 'female' : sex === 'F' ? 'male' : 'unknown');
    // Men to the left of their partners where possible; inside a row of
    // brothers and sisters, go to the side with fewer siblings to move.
    let side = sexOfShape(shape) === 'M' ? 'left' : 'right';
    if (parentPship(id) && kidsOf(parentPship(id).id).length > 1) side = chooseSideForPartner(id);
    if (pshipsOf(id).length) {
      // a second partner goes on the other side from the first
      const other = pshipsOf(id)[0];
      const oid = other.fromId === id ? other.toId : other.fromId;
      side = getPersonX(oid) > getPersonX(id) ? 'left' : 'right';
    }
    const nid = newPersonId();
    addPerson(nid, getPersonX(id) + (side === 'left' ? -partnerGap : partnerGap), getPersonY(id), shape);
    const ps = addPartnership(id, nid, undefined, 'normal');
    return { id: nid, pship: ps };
  }

  function addChildCore(ps, shape) {
    if (!ps) return null;
    const kids = kidsOf(ps.id);
    const py = Math.min(getPersonY(ps.fromId), getPersonY(ps.toId));
    let x = (getPersonX(ps.fromId) + getPersonX(ps.toId)) / 2;
    let y = py + childHeight;
    if (kids.length) {
      x = Math.max(...kids.map(getPersonX)) + SHAPE_SIZE * 2;
      y = getPersonY(kids[0]);
    }
    const nid = newPersonId();
    addPerson(nid, x, y, shape);
    addChildLink(ps.id, nid);
    return nid;
  }

  function addParentsCore(id) {
    if (parentPship(id)) return parentPship(id);
    const x = getPersonX(id), y = getPersonY(id);
    const fid = newPersonId();
    addPerson(fid, x - partnerGap / 2, y - childHeight, 'male');
    const mid = newPersonId();
    addPerson(mid, x + partnerGap / 2, y - childHeight, 'female');
    const ps = addPartnership(fid, mid, undefined, 'normal');
    addChildLink(ps.id, id);
    return ps;
  }

  const QA_SHAPES = { son: 'male', daughter: 'female', brother: 'male', sister: 'female', child: 'unknown' };

  function quickAdd(kind, id) {
    id = id || selectedPerson;
    const p = persons.get(id);
    if (!p) { status('Select a person first'); return null; }
    if (isLineShape(p.shape) || p.shape === 'miscarriage') { status('Choose a person, not a ' + (p.shape === 'miscarriage' ? 'pregnancy loss' : 'line symbol')); return null; }
    if (kind === 'parents' && parentPship(id)) { status('This person already has parents in the pedigree'); return []; }
    let added = [];
    let msg = '';
    const spot = screenSpot(id);
    group(() => {
      if (kind === 'partner') {
        const r = addPartnerCore(id);
        if (r) { added = [r.id]; msg = 'Partner added'; }
      } else if (kind === 'son' || kind === 'daughter' || kind === 'child') {
        let ps = pshipsOf(id);
        let pship = ps[ps.length - 1];
        if (!pship) {
          const r = addPartnerCore(id);
          pship = r && r.pship;
          if (r) added.push(r.id);
        }
        const k = addChildCore(pship, QA_SHAPES[kind]);
        if (k) added.push(k);
        msg = (kind === 'son' ? 'Son' : kind === 'daughter' ? 'Daughter' : 'Child') + ' added' + (ps.length ? '' : ', with a partner to be the other parent');
      } else if (kind === 'parents') {
        const ps = addParentsCore(id);
        added = [ps.fromId, ps.toId];
        msg = 'Parents added';
      } else if (kind === 'brother' || kind === 'sister') {
        const had = !!parentPship(id);
        const ps = addParentsCore(id);
        if (!had) added.push(ps.fromId, ps.toId);
        const k = addChildCore(ps, QA_SHAPES[kind]);
        if (k) added.push(k);
        msg = (kind === 'brother' ? 'Brother' : 'Sister') + ' added' + (had ? '' : ', with parents') + '. Brothers and sisters go oldest on the left: use ◀ ▶ to change the order.';
      }
    }, { tidy: true });
    holdOnScreen(id, spot);
    if (persons.has(id)) selectPerson(id);
    flashPeople(added);
    status(msg || 'Done');
    emit('action', { type: 'quick-add', kind, added });
    return added;
  }

  function addChildToSelectedCouple(shape) {
    const ps = partnerships.find((x) => x.id === selectedPartnershipId);
    if (!ps) return null;
    let k = null;
    const spot = screenSpot(ps.fromId);
    group(() => { k = addChildCore(ps, shape); }, { tidy: true });
    holdOnScreen(ps.fromId, spot);
    flashPeople(k ? [k] : []);
    status('Child added');
    emit('action', { type: 'quick-add', kind: 'child', added: k ? [k] : [] });
    return k;
  }

  /* A couple's children in birth order (left to right), with twins and
     triplets kept together as one place in the order. */
  function birthOrderPlaces(ps) {
    const sibs = kidsOf(ps.id);
    const root = new Map(sibs.map((k) => [k, k]));
    const find = (k) => { while (root.get(k) !== k) k = root.get(k); return k; };
    twinLinks.forEach((t) => { if (root.has(t.child1Id) && root.has(t.child2Id)) root.set(find(t.child1Id), find(t.child2Id)); });
    const places = new Map();
    sibs.forEach((k) => { const r = find(k); if (!places.has(r)) places.set(r, []); places.get(r).push(k); });
    const left = (ids) => Math.min(...ids.map((k) => getPersonX(k)));
    return Array.from(places.values()).sort((a, b) => left(a) - left(b));
  }

  /* Swap a person (with their partner, descendants and twin) with the next
     brother or sister on the left or right, then lay the pedigree out again. */
  function moveInSibship(dir, id) {
    id = id || selectedPerson;
    const ps = parentPship(id);
    if (!ps) { status('This person has no brothers or sisters in the pedigree'); return; }
    const places = birthOrderPlaces(ps);
    const i = places.findIndex((pl) => pl.includes(id));
    const j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= places.length) { status(dir < 0 ? 'Already the oldest (furthest left)' : 'Already the youngest (furthest right)'); return; }
    const leftPlace = dir < 0 ? places[j] : places[i];
    const rightPlace = dir < 0 ? places[i] : places[j];
    const spot = screenSpot(id);
    group(() => {
      let A = new Set(), B = new Set();
      leftPlace.forEach((k) => getDefaultChildBlock(k, ps.id).forEach((x) => A.add(x)));
      rightPlace.forEach((k) => getDefaultChildBlock(k, ps.id).forEach((x) => B.add(x)));
      if (setsIntersect(A, B)) { A = new Set(leftPlace); B = new Set(rightPlace); }
      const a = getIdsBounds(A), b = getIdsBounds(B);
      if (!a || !b) return;
      const gap = Math.max(DEFAULT_SNAP_GAP, b.left - a.right);
      moveDefaultIds(B, a.left - b.left, 0);
      moveDefaultIds(A, (b.right - b.left) + gap, 0);
      alignConnectedPersons();
    }, { tidy: true });
    holdOnScreen(id, spot);
    selectPerson(id);
    status('Order of brothers and sisters changed');
  }

  /* ------------------------------------------------------------------
     Picking people (for "click the people who…" questions)
     ------------------------------------------------------------------ */
  let picking = false;
  const picked = new Set();
  function applyPicks() {
    persons.forEach((p, id) => p.el.classList.toggle('picked', picking && picked.has(id)));
    $('pickCount').textContent = picked.size ? picked.size + ' chosen' : '';
  }
  function pickStart(opts = {}) {
    deselectAll();
    setTool('move');
    picking = true;
    picked.clear();
    (opts.ids || []).forEach((id) => persons.has(id) && picked.add(id));
    document.body.classList.add('picking');
    $('pickText').textContent = opts.prompt || 'Click people to choose them; click again to unchoose.';
    $('pickBanner').hidden = false;
    applyPicks();
    emit('pick', { ids: [...picked], active: true });
  }
  function pickStop() {
    picking = false;
    document.body.classList.remove('picking');
    $('pickBanner').hidden = true;
    applyPicks();
    emit('pick', { ids: [...picked], active: false });
  }
  function pickToggle(id) {
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    applyPicks();
    emit('pick', { ids: [...picked], active: true });
  }
  const canvasEl = $('canvas');
  ['mousedown', 'touchstart'].forEach((t) => canvasEl.addEventListener(t, (e) => {
    if (!picking) return;
    const el = e.target.closest && e.target.closest('.person');
    if (el) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      pickToggle(el.id);
    } else if (e.target.closest && (e.target.closest('#lines-layer') || e.target.closest('.legend-box') || e.target.closest('.label'))) {
      e.stopPropagation();
    }
  }, { capture: true, passive: false }));
  canvasEl.addEventListener('click', (e) => { if (picking && e.target.closest && e.target.closest('#lines-layer')) e.stopPropagation(); }, true);

  /* ------------------------------------------------------------------
     Highlighting people (feedback from the practical)
     ------------------------------------------------------------------ */
  function highlight(ids, kind = 'issue') {
    clearHighlights(kind);
    (ids || []).forEach((id) => { const p = persons.get(id); if (p) p.el.classList.add('hl-' + kind); });
  }
  function clearHighlights(kind) {
    const kinds = kind ? [kind] : ['issue', 'answer'];
    persons.forEach((p) => kinds.forEach((k) => p.el.classList.remove('hl-' + k)));
  }

  /* Fit the pedigree into the part of the canvas the inspector does not cover. */
  fitToView = function () {
    if (persons.size === 0 && drawStrokes.length === 0 && labels.size === 0) return;
    const area = $('canvasArea').getBoundingClientRect();
    const inspOpen = $('inspector').classList.contains('show') && area.width > 620;
    const usableW = Math.max(160, area.width - (inspOpen ? 296 : 0));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    persons.forEach((p) => {
      const x = parseFloat(p.el.style.left), y = parseFloat(p.el.style.top);
      const t = p.el.querySelector('.person-text');
      const tw = t && p.text ? Math.min(220, t.offsetWidth) : 0;
      const th = t && p.text ? t.offsetHeight : 0;
      minX = Math.min(minX, x - 24 - (t && t.classList.contains('text-left') ? tw : 0));
      minY = Math.min(minY, y - 24);
      maxX = Math.max(maxX, x + SHAPE_SIZE + 10 + (t && !t.classList.contains('text-left') ? tw : 0));
      maxY = Math.max(maxY, y + 58 + th);
    });
    labels.forEach((l) => {
      const x = parseFloat(l.el.style.left), y = parseFloat(l.el.style.top);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + (l.el.offsetWidth || 120)); maxY = Math.max(maxY, y + (l.el.offsetHeight || 30));
    });
    const lb = $('legend-box');
    if (lb) {
      const x = parseFloat(lb.style.left), y = parseFloat(lb.style.top);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + lb.offsetWidth); maxY = Math.max(maxY, y + lb.offsetHeight);
    }
    drawStrokes.forEach((s) => s.points.forEach((pt) => {
      minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
    }));
    const pad = 30;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;
    zoomLevel = Math.max(0.2, Math.min(1.4, usableW / cw, (area.height - 50) / ch));
    panX = (usableW - cw * zoomLevel) / 2 - (minX - pad) * zoomLevel;
    panY = (area.height - 50 - ch * zoomLevel) / 2 - (minY - pad) * zoomLevel;
    $('zoomLabel').textContent = Math.round(zoomLevel * 100) + '%';
    applyTransform();
  };

  /* ------------------------------------------------------------------
     Loading pedigrees
     ------------------------------------------------------------------ */
  let pendingFit = false;
  function canvasHasSize() {
    const r = $('canvasArea').getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }
  function fitSoon() {
    if (canvasHasSize()) { pendingFit = false; fitToView(); } else pendingFit = true;
  }
  new ResizeObserver(() => { if (pendingFit && canvasHasSize()) fitSoon(); }).observe($('canvasArea'));

  function load(session, opts = {}) {
    if (picking) pickStop();
    suppress++;
    try {
      deselectAll();
      setTool('move');
      isRestoring = true;
      restoreSession(session || { persons: [] });
    } finally {
      isRestoring = false;
      suppress--;
      clearTimeout(changeTimer);
    }
    if (!opts.keepUndo) { undoStack.length = 0; redoStack.length = 0; updateUndoRedoUI(); }
    if (opts.fit || !(session && session.zoom)) fitSoon();
    refreshChrome();
    status(opts.message || 'Ready');
    emit('load', { session: buildSessionData() });
  }

  function clearCanvas() { load({ persons: [] }, { fit: false }); zoomLevel = 1; panX = 0; panY = 0; applyTransform(); $('zoomLabel').textContent = '100%'; }

  /* ------------------------------------------------------------------
     Toolbar, menus and inspector
     ------------------------------------------------------------------ */
  function addShape(shape) {
    if (shape === 'label') { activateLabelTool(); return; }
    selectShape(shape);
    const p = addPerson();
    if (p && !isLineShape(shape)) selectPerson(p.id);
    if (p) flashPeople([p.id]);
    if (isLineShape(shape)) status('Drag the symbol under the person or couple, then use Child to join it to their relationship line');
    emit('action', { type: 'add', shape });
  }

  function openPop(pop, anchor) {
    document.querySelectorAll('.st-pop').forEach((m) => { if (m !== pop) m.hidden = true; });
    if (!pop.hidden) { pop.hidden = true; return; }
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
    pop.style.top = (r.bottom + 4) + 'px';
  }
  document.addEventListener('pointerdown', (e) => {
    document.querySelectorAll('.st-pop').forEach((m) => {
      if (m.hidden || m.contains(e.target)) return;
      if (e.target.closest('#moreAddBtn, #fileBtn')) return;
      m.hidden = true;
    });
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.st-pop').forEach((m) => (m.hidden = true));
      $('helpOverlay').hidden = true;
      if (picking) pickStop();
    }
  });

  document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.st-pop').forEach((m) => (m.hidden = true));
    addShape(b.dataset.add);
  }));
  $('moreAddBtn').addEventListener('click', (e) => openPop($('moreMenu'), e.currentTarget));
  $('fileBtn').addEventListener('click', (e) => openPop($('fileMenu'), e.currentTarget));
  $('fileMenu').addEventListener('click', (e) => { if (e.target.closest('button') && e.target.closest('.pop-sec:first-child, .pop-sec:last-child')) $('fileMenu').hidden = true; });
  $('keyBtn').addEventListener('click', () => { toggleLegend(); refreshChrome(); emit('action', { type: 'key', visible: legendVisible }); });
  $('tidyBtn').addEventListener('click', () => { redistributePedigreeWithWarning(); setTimeout(fitToView, 30); emit('action', { type: 'tidy' }); });
  $('helpBtn').addEventListener('click', () => { $('helpOverlay').hidden = false; $('helpClose').focus(); });
  $('helpClose').addEventListener('click', () => { $('helpOverlay').hidden = true; });
  $('helpOverlay').addEventListener('click', (e) => { if (e.target === $('helpOverlay')) $('helpOverlay').hidden = true; });

  document.querySelectorAll('[data-qa]').forEach((b) => b.addEventListener('click', () => quickAdd(b.dataset.qa)));
  document.querySelectorAll('[data-qp]').forEach((b) => b.addEventListener('click', () => addChildToSelectedCouple(b.dataset.qp)));
  $('deletePersonBtn').addEventListener('click', () => { if (selectedPerson) removePerson(selectedPerson); });
  $('inspClose').addEventListener('click', () => { deselectAll(); if (currentTool !== 'move') setTool('move'); });

  /* move within the row of brothers and sisters */
  const qaBox = document.querySelector('#propsPanel .qa');
  const moveRow = document.createElement('div');
  moveRow.className = 'sib-move';
  moveRow.innerHTML = '<span>Order among brothers and sisters</span><button class="pbtn" type="button" data-mv="-1" title="Move left (older)">◀ Older</button><button class="pbtn" type="button" data-mv="1" title="Move right (younger)">Younger ▶</button>';
  qaBox.appendChild(moveRow);
  moveRow.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (b) moveInSibship(Number(b.dataset.mv)); });

  /* several people in one symbol: a number (or n) inside */
  function applyNumber() {
    const v = $('ctNumber').value.trim();
    if (!/^(\d{1,2}|n)$/i.test(v)) { status('Type a number (or n if you do not know how many)'); $('ctNumber').focus(); return; }
    setCenterText(v.toLowerCase() === 'n' ? 'n' : v);
    refreshChrome();
  }
  $('ctNumberBtn').addEventListener('click', applyNumber);
  $('ctNumber').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyNumber(); } });

  /* wrap a few engine functions */
  const _setTool = setTool;
  setTool = function (tool) {
    _setTool(tool);
    $('twinPanel').classList.toggle('visible', tool === 'twin');
    syncInspector();
  };
  const _setPartnershipType = setPartnershipType;
  setPartnershipType = function (t) {
    _setPartnershipType(t);
    // the engine remembers the last type for new lines; new lines should start as ordinary partners
    if (selectedPartnershipId) currentPartnershipType = 'normal';
  };
  const _showProps = showProps;
  showProps = function (p) {
    _showProps(p);
    const num = p && p.el.querySelector('.person-number');
    $('inspNum').textContent = num ? num.textContent : '';
    const ct = (p && p.centerText) || '';
    $('ctNumber').value = /^(\d{1,2}|n|S)$/.test(ct) ? ct : '';
    $('ctNumberBtn').classList.toggle('active', /^(\d{1,2}|n|S)$/.test(ct));
    const hasSibs = !!(p && parentPship(p.id) && birthOrderPlaces(parentPship(p.id)).length > 1);
    moveRow.hidden = !hasSibs;
    syncInspector();
  };
  const _setCenterText = setCenterText;
  setCenterText = function (ct) {
    _setCenterText(ct);
    const p = persons.get(selectedPerson);
    if (p) { $('ctNumber').value = /^(\d{1,2}|n|S)$/.test(ct) ? ct : ''; $('ctNumberBtn').classList.toggle('active', /^(\d{1,2}|n|S)$/.test(ct)); }
  };

  /* show the inspector whenever one of its panels is in use */
  const insp = $('inspector');
  function syncInspector() {
    const any = Array.from(insp.querySelectorAll(':scope > .panel-section')).some((s) => {
      if (s.id === 'drawPanel') return s.style.display !== 'none';
      return s.classList.contains('visible');
    });
    insp.classList.toggle('show', any && !picking);
  }
  new MutationObserver(syncInspector).observe(insp, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

  function refreshChrome() {
    $('emptyHint').hidden = persons.size > 0 || labels.size > 0 || drawStrokes.length > 0;
    $('keyBtn').classList.toggle('on', !!legendVisible);
    if (selectedPerson && persons.get(selectedPerson)) {
      const num = persons.get(selectedPerson).el.querySelector('.person-number');
      $('inspNum').textContent = num ? num.textContent : '';
    }
  }

  /* ------------------------------------------------------------------
     Start the engine (the original start-up sequence)
     ------------------------------------------------------------------ */
  applyCanvasSize();
  initColorPickers();
  initMultiColorPickers();
  initDrawColorPicker();
  if (!EMBEDDED) {
    if (tryAutoRestore()) fitSoon();
  }
  updateStatus();
  updateUndoRedoUI();
  refreshChrome();
  if (EMBEDDED) document.body.classList.add('embedded');

  /* ------------------------------------------------------------------
     API for the practical page
     ------------------------------------------------------------------ */
  window.PedigreeStudio = {
    version: '5.1.5-practical.1',
    embedded: EMBEDDED,
    on, off,
    load,
    clear: clearCanvas,
    get: () => buildSessionData(),
    svg: () => buildPedigreeSVG(),
    fit: () => fitSoon(),
    setTool: (t) => setTool(t),
    select: (id) => { if (persons.has(id)) selectPerson(id); },
    deselect: () => deselectAll(),
    quickAdd,
    addChildToCouple: (pshipId, shape) => { selectedPartnershipId = pshipId; return addChildToSelectedCouple(shape); },
    pickStart, pickStop,
    picked: () => [...picked],
    isPicking: () => picking,
    highlight, clearHighlights,
    flash: flashPeople,
    setReadOnly: (on) => document.body.classList.toggle('readonly', !!on),
    selected: () => selectedPerson,
    addShape,
    toggleKey: () => $('keyBtn').click(),
    flashControl: (sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const det = el.closest('details');
      if (det) det.open = true;
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      el.classList.remove('flash-ctl');
      void el.offsetWidth;
      el.classList.add('flash-ctl');
      setTimeout(() => el.classList.remove('flash-ctl'), 2600);
    },
    status
  };
  emit('ready', {});
  try { window.dispatchEvent(new CustomEvent('pedigreestudio:ready')); } catch (e) { /* old browsers */ }
})();
