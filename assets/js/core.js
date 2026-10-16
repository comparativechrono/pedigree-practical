/* =====================================================================
   Shared helpers: namespace, DOM, events, storage, downloads, toasts,
   modal dialogs, pop-up menus and icons. Plain browser JavaScript.
   ===================================================================== */
(function () {
  'use strict';

  const PP = (window.PP = window.PP || {});
  const CFG = (PP.config = Object.assign({ showModelAnswers: true, storePrefix: 'pedprac1:', pedigrees: [] }, window.PP_CONFIG || {}));

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** h('div.cls#id', {attr}, children...) – minimal hyperscript */
  function h(tag, attrs, ...kids) {
    const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') el.classList.add(v); else el.id = v; });
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    const add = (k) => {
      if (k == null || k === false) return;
      if (Array.isArray(k)) k.forEach(add);
      else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    };
    kids.forEach(add);
    return el;
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* event bus */
  const listeners = {};
  const bus = {
    on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); return () => bus.off(type, fn); },
    off(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    emit(type, detail) {
      (listeners[type] || []).slice().forEach((fn) => { try { fn(detail || {}, type); } catch (e) { console.error('listener error', type, e); } });
      (listeners['*'] || []).slice().forEach((fn) => { try { fn(detail || {}, type); } catch (e) { console.error(e); } });
    }
  };

  /* storage that never throws (private windows, blocked storage) */
  const PREFIX = CFG.storePrefix;
  const memory = {};
  const store = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem(PREFIX + key);
        return v == null ? (key in memory ? memory[key] : fallback) : JSON.parse(v);
      } catch (e) { return key in memory ? memory[key] : fallback; }
    },
    set(key, value) {
      memory[key] = value;
      try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) {
      delete memory[key];
      try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    },
    clearAll() {
      Object.keys(memory).forEach((k) => delete memory[k]);
      try { Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => window.localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    }
  };

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
    return r.json();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }
  const downloadText = (text, filename, type) => downloadBlob(new Blob([text], { type: type || 'text/plain' }), filename);
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', left: '-9999px' } }, text);
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  let toastBox;
  function toast(msg, kind, ms) {
    if (!toastBox) { toastBox = h('div.toasts', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastBox); }
    const t = h('div.toast' + (kind ? '.' + kind : ''), { html: msg });
    toastBox.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms || (kind === 'error' ? 6000 : 3400));
  }

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* icons (24×24 stroke) */
  const ICONS = {
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 2-2.8 2.6-2.8 4"/><path d="M12 17.5h.01"/>',
    pedigree: '<rect x="2.5" y="3" width="6" height="6"/><circle cx="18.5" cy="6" r="3.2"/><path d="M8.5 6h6.8M12 6v7M6 13h12M6 13v4M18 13v4"/><rect x="3" y="17" width="6" height="5"/><circle cx="18" cy="19.5" r="2.5"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12s-10 3-10 6M17 3c0 6-10 6-10 12s10 3 10 6M8 7h8M8 17h8M9.5 12h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    external: '<path d="M14 4h6v6M10 14L20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-3 0-4.6-1.4-6-4l-2-3.6a1.5 1.5 0 0 1 2.5-1.6L8 15"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    warning: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>'
  };
  function icon(name, cls) {
    return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.info}</svg>`;
  }

  /* modal dialog */
  function modal(title, html, opts = {}) {
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
    const onKey = (e) => e.key === 'Escape' && close();
    const x = h('button.icon-btn.modal-x', { type: 'button', 'aria-label': 'Close', html: icon('x') });
    x.addEventListener('click', close);
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div.modal-h', h('h3', title), x), h('div.modal-b', { html }));
    const back = h('div.modal-back', box);
    back.addEventListener('click', (e) => e.target === back && close());
    document.body.appendChild(back);
    document.addEventListener('keydown', onKey);
    setTimeout(() => x.focus(), 10);
    return { close, box };
  }

  /* pop-up menu under a button */
  function popmenu(anchor, items) {
    document.querySelectorAll('.popmenu').forEach((m) => m.remove());
    const m = h('div.popmenu', { role: 'menu' });
    items.forEach(([ic, label, fn]) => {
      const b = h('button', { type: 'button', role: 'menuitem', html: icon(ic) + '<span>' + esc(label) + '</span>' });
      b.addEventListener('click', () => { m.remove(); fn(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.left)) + 'px';
    m.style.top = r.bottom + 4 + 'px';
    const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    const first = m.querySelector('button');
    if (first) first.focus();
  }

  Object.assign(PP, { esc, h, $, $$, bus, store, fetchJSON, downloadBlob, downloadText, copyText, toast, debounce, clamp, icon, modal, popmenu });
})();
