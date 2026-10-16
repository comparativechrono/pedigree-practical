/* =====================================================================
   Family-history interviews. The student chooses questions to ask a
   patient and draws the family in the workbench as the answers come in.
   Some questions are worded badly on purpose: the patient's reply and a
   short note show why. Scripts are in data/interviews/*.json.
   ===================================================================== */
(function () {
  'use strict';
  const PP = window.PP;
  const { h, esc, bus, $, $$, icon } = PP;

  const scripts = {};
  const load = (id) => (scripts[id] = scripts[id] || PP.fetchJSON('data/interviews/' + id + '.json'));

  function stateOf(id) {
    const s = PP.app.state.answers;
    const key = 'iv-' + id;
    s[key] = s[key] || { asked: [] };
    return s[key];
  }

  async function mount(el) {
    const id = el.dataset.iv;
    let scn;
    try { scn = await load(id); } catch (e) {
      el.innerHTML = '<p class="muted">The interview could not be loaded. Check your connection and reload the page.</p>';
      return;
    }
    const st = stateOf(id);
    const qs = scn.questions;
    const byId = Object.fromEntries(qs.map((q) => [q.id, q]));
    const keyTotal = qs.filter((q) => q.key).length;

    el.innerHTML = '';
    const head = h('div.iv-head', h('div.iv-avatar', { 'aria-hidden': 'true' }, scn.initials || scn.patient.split(' ').map((w) => w[0]).join('')),
      h('div', h('div.iv-name', scn.patient), h('div.iv-sub', scn.subtitle || '')));
    const log = h('div.iv-log', { role: 'log', 'aria-live': 'polite', tabindex: '0', 'aria-label': 'Conversation' });
    const topics = h('div.iv-topics', { role: 'tablist', 'aria-label': 'Ask about' });
    const chips = h('div.iv-chips');
    const foot = h('div.iv-foot');
    const prog = h('span.iv-prog');
    const restart = h('button.linkbtn', { type: 'button', html: icon('reset') + 'Start the interview again' });
    foot.append(prog, restart);
    el.append(head, log, h('div.iv-ask', h('div.iv-asklabel', 'Ask about'), topics, chips), foot);

    let topic = (scn.topics[0] || {}).id;
    const asked = () => new Set(st.asked);
    const available = (q) => !asked().has(q.id) && (!q.after || [].concat(q.after).every((a) => asked().has(a)));

    function bubble(q, animate) {
      log.appendChild(h('div.iv-msg.me', h('div.iv-who', 'You'), h('div.iv-text', q.q)));
      const reply = h('div.iv-msg.them', h('div.iv-who', scn.patient.split(' ')[0]), h('div.iv-text', { html: esc(q.a).replace(/\n/g, '<br>') }));
      log.appendChild(reply);
      if (q.poor) log.appendChild(h('div.iv-coach', { html: '<b>A better way to ask:</b> ' + esc(q.poor) }));
      if (q.note) log.appendChild(h('div.iv-note', { html: icon('info') + '<span>' + esc(q.note) + '</span>' }));
      if (animate) { reply.classList.add('typing'); setTimeout(() => reply.classList.remove('typing'), 450); }
    }
    function renderLog() {
      log.innerHTML = '';
      log.appendChild(h('div.iv-msg.them', h('div.iv-who', scn.patient.split(' ')[0]), h('div.iv-text', scn.opening)));
      st.asked.forEach((qid) => byId[qid] && bubble(byId[qid], false));
      log.scrollTop = log.scrollHeight;
    }
    function renderTopics() {
      topics.innerHTML = '';
      scn.topics.forEach((t) => {
        const left = qs.filter((q) => q.topic === t.id && available(q)).length;
        const b = h('button.iv-topic' + (t.id === topic ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': t.id === topic ? 'true' : 'false' }, t.title, left ? h('span.iv-count', String(left)) : h('span.iv-count.none', '✓'));
        b.addEventListener('click', () => { topic = t.id; renderTopics(); renderChips(); });
        topics.appendChild(b);
      });
    }
    function renderChips() {
      chips.innerHTML = '';
      const list = qs.filter((q) => q.topic === topic && available(q));
      if (!list.length) chips.appendChild(h('p.iv-empty', 'Nothing more to ask about this. Try another topic.'));
      list.forEach((q) => {
        const b = h('button.iv-q', { type: 'button' }, q.q);
        b.addEventListener('click', () => ask(q));
        chips.appendChild(b);
      });
      const n = st.asked.filter((x) => byId[x] && byId[x].key).length;
      prog.innerHTML = `<b>${n}</b> of ${keyTotal} important questions asked`;
    }
    function ask(q) {
      st.asked.push(q.id);
      PP.app.save();
      bubble(q, true);
      log.scrollTop = log.scrollHeight;
      renderTopics();
      renderChips();
      const keyAsked = st.asked.filter((x) => byId[x] && byId[x].key).length;
      bus.emit('iv:asked', { iv: id, id: q.id, topic: q.topic, key: !!q.key, poor: !!q.poor, count: keyAsked });
      if (keyAsked === keyTotal) bus.emit('iv:done', { iv: id });
    }
    restart.addEventListener('click', () => {
      st.asked = [];
      PP.app.save();
      topic = (scn.topics[0] || {}).id;
      renderLog(); renderTopics(); renderChips();
    });
    renderLog(); renderTopics(); renderChips();
  }

  function exportHTML(id) {
    const st = PP.app.state.answers['iv-' + id];
    if (!st || !st.asked.length) return '';
    const S = cache[id];
    if (!S) return '';
    const byId = Object.fromEntries(S.questions.map((q) => [q.id, q]));
    return `<h3>Interview: ${esc(S.patient)}</h3><div class="iv">` + st.asked.map((qid) => byId[qid] ? `<p><b>You:</b> ${esc(byId[qid].q)}<br><b>${esc(S.patient.split(' ')[0])}:</b> ${esc(byId[qid].a)}</p>` : '').join('') + '</div>';
  }
  const cache = {};

  function init() {
    $$('.interview').forEach((el) => {
      mount(el);
      load(el.dataset.iv).then((s) => { cache[el.dataset.iv] = s; }).catch(() => {});
    });
  }
  PP.interview = { exportHTML };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  else setTimeout(init, 0);
})();
