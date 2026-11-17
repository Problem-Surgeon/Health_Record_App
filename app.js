'use strict';
/* Health Records — offline web app. All data stays on this device (IndexedDB). */
const APP_VERSION = '2.5';

/* ---------------- helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };
const rs = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => isoOf(new Date());
const nowTime = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const byDateTime = (a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')) || (a.created || 0) - (b.created || 0);
const when = (r) => fmtDate(r.date) + (r.time ? ', ' + r.time : '');
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${pad2(d)} ${MON[m - 1]} ${y}`; };
const fmtMonth = (iso) => { if (!iso) return ''; const [y, m] = iso.split('-').map(Number); return `${MON[m - 1]} ${y}`; };
const fmtDur = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const letter = (i) => (i < 26 ? String.fromCharCode(97 + i) : 'z' + (i - 25));
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '').trim() || 'Ailment';
const extOf = (type, name) => {
  const map = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg' };
  const base = String(type || '').split(';')[0];
  if (map[base]) return map[base];
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : 'bin';
};
const hashStr = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

const PALETTE = [
  { c: '#5B3DF5', bg: '#EEEAFE', tint: '#F1EDFF', fg: '#5B3DF5', name: 'Purple' },
  { c: '#4FA3F7', bg: '#E2F0FE', tint: '#E8F3FE', fg: '#1565C0', name: 'Blue' },
  { c: '#111114', bg: '#111114', tint: '#ECECEF', fg: '#FFFFFF', name: 'Black' },
  { c: '#F2B705', bg: '#FEF3C7', tint: '#FEF6D8', fg: '#92400E', name: 'Yellow' },
  { c: '#E5484D', bg: '#FDECEC', tint: '#FDEBEB', fg: '#B42318', name: 'Red' },
  { c: '#30A46C', bg: '#E6F6EC', tint: '#E7F6EC', fg: '#1E7A4D', name: 'Green' }
];
const pal = (c) => PALETTE.find((p) => p.c === c) || PALETTE[0];
const MAX_PEOPLE = 6;

const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'width="18" height="18" style="color:#6B6B73;flex:none"'),
  plus: I('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2"'),
  back: I('<path d="M15 18 9 12l6-6"/>', 'stroke-width="2"'),
  close: I('<path d="M18 6 6 18M6 6l12 12"/>', 'stroke-width="2"'),
  edit: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  upload: I('<path d="M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
  chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  cloud: I('<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/><path d="M12 12v6M9.5 14.5 12 12l2.5 2.5"/>'),
  home: I('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  file: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', 'style="color:#5B3DF5"'),
  pdf: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
  image: I('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>'),
  mic: I('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', 'stroke-width="2.2"'),
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>',
  check: I('<path d="m5 12 5 5L20 7"/>', 'stroke-width="3"'),
  refill: I('<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="m8.5 8.5 7 7"/>'),
  dash: I('<path d="M6 12h12"/>', 'stroke-width="3"'),
  chev: I('<path d="m9 18 6-6-6-6"/>', 'stroke-width="2" class="chev"'),
  down: I('<path d="m6 9 6 6 6-6"/>', 'stroke-width="2" width="18" height="18" style="color:#6B6B73;flex:none"'),
  pin: I('<path d="M12 17v5M9 3h6l-1 7 4 3H6l4-3z"/>', 'width="14" height="14" stroke-width="2" style="color:#B42318"'),
  trash: I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', 'width="16" height="16"'),
  share: I('<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  copy: I('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  download: I('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  send: I('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', 'stroke-width="2"'),
  lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  del: I('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m17 9-6 6M11 9l6 6"/>'),
  heart: I('<path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.7 0 6 4 4.5 7.7C19.5 16.4 12 21 12 21z"/><path d="M8 12h2l1.5-3 2 6 1.5-3h1"/>', 'stroke-width="2"')
};

/* ---------------- storage (IndexedDB) ---------------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('health-records', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('blobs'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Storage write failed'));
    });
  },
  get(store, k) { return this.tx(store, 'readonly', (s) => s.get(k)); },
  put(store, k, v) { return this.tx(store, 'readwrite', (s) => s.put(v, k)); },
  del(store, k) { return this.tx(store, 'readwrite', (s) => s.delete(k)); },
  clear(store) { return this.tx(store, 'readwrite', (s) => s.clear()); },
  keys(store) { return this.tx(store, 'readonly', (s) => s.getAllKeys()); }
};
async function putBlob(id, blob) { const data = await blob.arrayBuffer(); await DB.put('blobs', id, { type: blob.type || '', data }); }
async function getBlob(id) { const r = await DB.get('blobs', id); return r ? new Blob([r.data], { type: r.type }) : null; }
async function delBlobs(ids) { for (const id of ids) { try { await DB.del('blobs', id); } catch (e) { /* ignore */ } } }

const AUTO_NAME = /^visit[\s_-]*\d*$/i;
let S = { people: [], ailments: [], visits: [], refills: [], readings: [], sugar: [], meta: {} };
function normalize(st) {
  return {
    people: Array.isArray(st?.people) ? st.people : [],
    ailments: Array.isArray(st?.ailments) ? st.ailments : [],
    visits: Array.isArray(st?.visits) ? st.visits.map((v) => (AUTO_NAME.test((v.name || '').trim()) ? { ...v, name: '' } : v)) : [],
    refills: Array.isArray(st?.refills) ? st.refills : [],
    readings: Array.isArray(st?.readings) ? st.readings : [],
    sugar: Array.isArray(st?.sugar) ? st.sugar : [],
    meta: st?.meta && typeof st.meta === 'object' ? st.meta : {}
  };
}
/* Change tracking for sync: every record gets an "updated" time when its content changes,
   and deleted records leave a tombstone in S.meta.deleted so other devices delete them too. */
const COLLS = ['people', 'ailments', 'visits', 'refills', 'readings', 'sugar'];
let HASH = {}; let SAVE_N = 0;
function recHash(r) {
  const { updated, ...rest } = r; const str = JSON.stringify(rest);
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + '.' + str.length;
}
function rebuildHashes() { HASH = {}; for (const c of COLLS) for (const r of S[c]) HASH[r.id] = recHash(r); }
function stamp() {
  const now = Date.now(); const seen = {}; S.meta.deleted = S.meta.deleted || {};
  for (const c of COLLS) for (const r of S[c]) {
    const h = recHash(r); seen[r.id] = h;
    if (HASH[r.id] !== h) r.updated = Math.max(now, (r.updated || 0) + 1);
  }
  for (const id of Object.keys(HASH)) if (!(id in seen)) S.meta.deleted[id] = now;
  HASH = seen;
}
async function save() {
  stamp(); SAVE_N++;
  try { await DB.put('kv', 'state', S); await DB.put('kv', 'hashes', HASH); }
  catch (e) { toast('Could not save. Your phone may be out of storage.'); throw e; }
  if (SY.cfg?.on && !SY.dirty) { SY.dirty = true; DB.put('kv', 'syncDirty', true).catch(() => {}); updateSyncDot(); }
  scheduleSync();
}

/* ---------------- data queries ---------------- */
const personOf = (id) => S.people.find((p) => p.id === id);
const ailmentOf = (id) => S.ailments.find((a) => a.id === id);
const ailmentsOf = (pid) => S.ailments.filter((a) => a.personId === pid);
const byDateAsc = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0);
const visitsOf = (aid) => S.visits.filter((v) => v.ailmentId === aid).sort(byDateAsc);
const qtyOf = (m) => num(m.qty) || 1;
const lineCost = (m) => num(m.cost) * qtyOf(m);
const medsCost = (v) => (v.meds || []).reduce((s, m) => s + lineCost(m), 0);
const visitTotal = (v) => num(v.fee) + medsCost(v);
const refillsOf = (aid) => S.refills.filter((r) => r.ailmentId === aid).sort(byDateAsc);
const refillTotal = (r) => (r.meds || []).reduce((s, m) => s + lineCost(m), 0);
// quantity in grey, medicine name darker
const medHtml = (m) => ((m.qty || '').toString().trim() ? `<span style="color:#8A8A93">${esc(String(m.qty).trim())} ×</span> ` : '') + `<span style="color:#26262C;font-weight:500">${esc(m.name || '')}</span>`;
const priceNote = (m) => num(m.cost) && num(m.qty) > 1 ? `${rs(num(m.cost))} each` : '';
const medLabel = (m) => ((m.qty || '').toString().trim() ? `${String(m.qty).trim()} × ` : '') + (m.name || '');
const ailmentTotal = (aid) => visitsOf(aid).reduce((s, v) => s + visitTotal(v), 0) + refillsOf(aid).reduce((s, r) => s + refillTotal(r), 0);
const lastDate = (a) => visitsOf(a.id).reduce((d, v) => (v.date > d ? v.date : d), a.start || '');
// Visits are numbered by date: Visit-1 is the oldest. A custom name replaces the "Visit-N" label.
const visitPos = (v) => { const vs = visitsOf(v.ailmentId); const i = vs.findIndex((x) => x.id === v.id); return i < 0 ? vs.length + 1 : i + 1; };
const vName = (v, pos) => (v.name || '').trim() || 'Visit-' + (pos ?? visitPos(v));
const fileCount = (aid) => visitsOf(aid).reduce((s, v) => s + (v.files || []).length + (v.voice || []).length, 0);

/* ---------------- UI state & navigation ---------------- */
const UI = {
  locked: true, pin: null, pinMode: 'create', pinBuf: '', pinFirst: '', pinMsg: '', fails: 0, lockUntil: 0, changing: false,
  search: { person: 'all', q: '' },
  openVisit: {},
  draft: null,
  modal: null,
  ex: { person: null, ids: [], voice: false, refills: true, excl: [], open: [] },
  ins: { tab: 'all', range: 6, bpPerson: null, sugarTab: 'avg' },
  showAllRefills: {},
  hiddenAt: 0
};
const stack = [{ name: 'home' }];
const cur = () => stack[stack.length - 1];
const toTop = () => { const a = document.getElementById('app'); if (a) a.scrollTop = 0; };
function go(r) { stack.push(r); render(); toTop(); }
function back() { if (stack.length > 1) stack.pop(); render(); toTop(); }
function tab(name) { stack.length = 0; stack.push({ name }); render(); toTop(); }

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- rendering ---------------- */
function render() {
  const app = $('#app');
  if (UI.locked) { app.innerHTML = lockView(); $('#modal-root').innerHTML = ''; closeViewer(); return; }
  const r = cur();
  const view = VIEWS[r.name] || VIEWS.home;
  app.innerHTML = view(r);
  renderModal();
  if (r.name === 'settings') fillStorageInfo();
}
function renderModal() { $('#modal-root').innerHTML = UI.modal && !UI.locked ? modalView() : ''; }

const avatar = (p, size = 44, onTint = false) => { const c = pal(p.color); const bg = onTint && c.c !== '#111114' ? '#FFFFFF' : c.bg; return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${bg};color:${c.fg}">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</div>`; };
const typeChip = (t) => t === 'chronic' ? '<span class="chip chronic">Chronic</span>' : '<span class="chip acute">Acute</span>';

function navBar(active) {
  const items = [['home', 'Home', ICON.home], ['insights', 'Insights', ICON.chart], ['export', 'Export', ICON.upload], ['settings', 'Backup', ICON.cloud]];
  return `<nav class="nav" aria-label="Main">${items.map(([k, label, ic]) =>
    `<button data-act="tab" data-tab="${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : `aria-label="${label}"`}>${ic}${k === active ? label : ''}</button>`).join('')}</nav>`;
}

/* ----- lock screen ----- */
function lockView() {
  const titles = { create: 'Create a 4-digit PIN', confirm: 'Confirm your PIN', unlock: 'Enter PIN', verify: 'Enter current PIN' };
  const subs = { create: 'You will enter it every time you open the app.', confirm: 'Type the same PIN again.', unlock: 'Health Records', verify: 'To change your PIN' };
  const waiting = UI.lockUntil > Date.now();
  const dots = [0, 1, 2, 3].map((i) => `<i class="${i < UI.pinBuf.length ? 'on' : ''}"></i>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<button data-act="key" data-k="${k}" ${waiting ? 'disabled' : ''}>${k}</button>`).join('');
  const left = UI.pinMode === 'unlock' ? '<button class="blank" style="font-size:13px;font-weight:600;color:#6B6B73" data-act="forgotPin">Forgot?</button>'
    : UI.changing ? '<button class="blank" style="font-size:13px;font-weight:600;color:#6B6B73" data-act="cancelPinChange">Cancel</button>' : '<span></span>';
  return `<main class="lock">
    <div class="lock-logo">${ICON.heart}</div>
    <div class="col" style="align-items:center;gap:6px"><h1 class="sm">${titles[UI.pinMode]}</h1><p class="sub">${subs[UI.pinMode]}</p></div>
    <div class="dots" id="dots" aria-label="${UI.pinBuf.length} of 4 digits entered">${dots}</div>
    <div class="lock-msg" role="alert">${esc(waiting ? 'Too many tries. Wait 30 seconds.' : UI.pinMsg)}</div>
    <div class="keypad">${keys}${left}<button data-act="key" data-k="0" ${waiting ? 'disabled' : ''}>0</button><button class="blank del" data-act="keyDel" aria-label="Delete digit">${ICON.del}</button></div>
  </main>`;
}

/* ----- views ----- */
const VIEWS = {
  home() {
    const nA = S.ailments.length;
    return `<main class="screen">
      <div class="row between">
        <div class="col"><h1>Health Records</h1><p class="sub">${plural(S.people.length, 'person').replace('persons', 'people')} · ${plural(nA, 'ailment')}</p></div>
        <span class="row" style="gap:8px">${SY.cfg?.on ? `<button class="icon-btn" data-act="syncNow" aria-label="${SY.dirty ? 'Sync now (changes not synced yet)' : 'Sync now'}" id="sync-btn">${ICON.cloud}${SY.dirty ? '<span class="sync-dot" aria-hidden="true"></span>' : ''}</button>` : ''}<button class="icon-btn" data-act="lockNow" aria-label="Lock app">${ICON.lock}</button></span>
      </div>
      <div class="search" role="search">
        <label class="sr" for="s-person">Person</label>
        <select id="s-person" data-bind="search.person">
          <option value="all">Everyone</option>
          ${S.people.map((p) => `<option value="${p.id}" ${UI.search.person === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        <div class="q">${ICON.search}<label class="sr" for="s-q">Search ailment or medicine</label>
          <input id="s-q" type="search" placeholder="Search ailment or medicine…" value="${esc(UI.search.q)}" data-bind="search.q" autocomplete="off"></div>
      </div>
      <div id="home-body">${homeBody()}</div>
    </main>${navBar('home')}`;
  },

  person(r) {
    const p = personOf(r.id); if (!p) return VIEWS.home();
    const ails = ailmentsOf(p.id);
    const chronic = ails.filter((a) => a.type === 'chronic').sort((a, b) => lastDate(b).localeCompare(lastDate(a)));
    const acute = ails.filter((a) => a.type !== 'chronic').sort((a, b) => lastDate(b).localeCompare(lastDate(a)));
    return `<main class="screen no-nav">
      <div class="row">
        <button class="icon-btn" data-act="back" aria-label="Back">${ICON.back}</button>
        <div class="row grow">${avatar(p)}<div class="col grow"><h1 class="sm">${esc(p.name)}</h1><span class="small muted">${plural(ails.length, 'ailment')}${chronic.length ? ` · ${chronic.length} chronic` : ''}</span></div></div>
        <button class="icon-btn" data-act="editPerson" data-id="${p.id}" aria-label="Edit person">${ICON.edit}</button>
        <button class="icon-btn" data-act="exportPerson" data-id="${p.id}" aria-label="Export ${esc(p.name)}'s records">${ICON.upload}</button>
      </div>
      ${!ails.length ? `<div class="card empty">No ailments yet.<br>Tap <b>Add ailment</b> to start ${esc(p.name)}'s history.</div>` : ''}
      ${chronic.length ? `<section class="col" style="gap:10px"><h2 class="label row" style="gap:8px">${ICON.pin} Chronic · pinned</h2>
        ${chronic.map((a) => `<button class="card pad col" style="gap:10px;text-align:left;width:100%" data-act="openAilment" data-id="${a.id}">
          <span class="row between"><span class="t17">${esc(a.name)}</span>${typeChip('chronic')}</span>
          <span class="row small muted" style="gap:16px"><span>Since ${fmtMonth(a.start) || '—'}</span><span>${plural(visitsOf(a.id).length, 'visit')} · ${rs(ailmentTotal(a.id))}</span></span>
        </button>`).join('')}</section>` : ''}
      ${acute.length ? `<section class="col" style="gap:10px"><h2 class="label">History · newest first</h2>
        <div class="card list">${acute.map((a) => `<button class="list-item" data-act="openAilment" data-id="${a.id}">
          <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted">${fmtDate(lastDate(a)) || 'No date'} · ${plural(visitsOf(a.id).length, 'visit')}</span></span>
          ${typeChip(a.type)}${ICON.chev}</button>`).join('')}</div></section>` : ''}
    </main>
    <button class="fab" data-act="newAilment" data-id="${p.id}">${ICON.plus} Add ailment</button>`;
  },

  ailment(r) {
    const a = ailmentOf(r.id); if (!a) return VIEWS.home();
    const p = personOf(a.personId);
    const vs = visitsOf(a.id);
    if (!(a.id in UI.openVisit)) UI.openVisit[a.id] = vs.length ? vs[vs.length - 1].id : null;
    const openId = UI.openVisit[a.id];
    const desc = vs.map((v, i) => ({ v, n: i + 1 })).reverse();
    return `<main class="screen no-nav">
      <div class="row between">
        <button class="icon-btn" data-act="back" aria-label="Back">${ICON.back}</button>
        <button class="icon-btn" data-act="editAilment" data-id="${a.id}" aria-label="Edit ailment">${ICON.edit}</button>
      </div>
      <div class="col" style="gap:8px">
        <span class="small muted">${esc(p?.name || '')}</span>
        <h1 style="font-size:26px">${esc(a.name)}</h1>
        <div class="row" style="gap:8px">${typeChip(a.type)}<span class="small muted">${a.start ? 'Started ' + fmtDate(a.start) : ''}</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${vs.length}</b><span>Visits</span></div>
        <div class="stat"><b>${fileCount(a.id)}</b><span>Files &amp; notes</span></div>
        <div class="stat"><b>${rs(ailmentTotal(a.id))}</b><span>Total spent</span></div>
      </div>
      <div class="col" style="gap:10px">
        ${!vs.length ? '<div class="card empty">No visits yet. Tap <b>Add visit</b>.</div>' : ''}
        ${desc.map(({ v, n }) => visitCard(v, n, v.id === openId, a)).join('')}
      </div>
      ${refillSection(a)}
    </main>
    ${a.type === 'chronic' ? `<div class="bottom-pair"><button class="btn" data-act="newRefill" data-id="${a.id}">${ICON.refill} Restock</button><button class="btn primary" data-act="newVisit" data-id="${a.id}">${ICON.plus} Add visit</button></div>`
      : `<button class="bottom-btn" data-act="newVisit" data-id="${a.id}">${ICON.plus} Add visit</button>`}`;
  },

  visitEdit() {
    const d = UI.draft; if (!d) return VIEWS.home();
    const a = ailmentOf(d.ailmentId); const p = a && personOf(a.personId);
    const recOn = !!REC.mr;
    return `<main class="screen no-nav">
      <div class="row between">
        <button class="icon-btn" data-act="cancelVisit" aria-label="Close without saving">${ICON.close}</button>
        <div class="col" style="align-items:center;gap:2px"><h1 style="font-size:18px">${d.isNew ? 'New visit' : 'Edit visit'}</h1><span class="small muted" style="font-size:12px">${esc(a?.name || '')} · ${esc(p?.name || '')}</span></div>
        <span style="width:44px"></span>
      </div>
      <div class="card pad grid2">
        <div class="field"><label class="flabel" for="v-name">Visit name</label><input class="in" id="v-name" value="${esc(d.name)}" data-bind="draft.name" placeholder="Auto (by date)" style="font-weight:600"></div>
        <div class="field"><label class="flabel" for="v-date">Date</label><input class="in" id="v-date" type="date" value="${esc(d.date)}" data-bind="draft.date"></div>
      </div>
      <div class="card pad col" style="gap:8px">
        <span class="flabel">Medicines</span>
        ${d.meds.map((m, i) => `<div class="med">
          <input class="in m-name" aria-label="Medicine ${i + 1} name" placeholder="Medicine name" value="${esc(m.name)}" data-bind="draft.meds.${i}.name">
          <button class="x-btn m-x" data-act="delMed" data-i="${i}" aria-label="Remove medicine ${i + 1}">${ICON.close}</button>
          <input class="in m-dur" aria-label="Medicine ${i + 1} duration" placeholder="Duration" value="${esc(m.dur)}" data-bind="draft.meds.${i}.dur">
          <input class="in m-qty" aria-label="Medicine ${i + 1} quantity" inputmode="numeric" placeholder="Qty" value="${esc(m.qty)}" data-bind="draft.meds.${i}.qty">
          <input class="in m-cost" aria-label="Medicine ${i + 1} price per unit in rupees" inputmode="decimal" placeholder="₹ each" value="${esc(m.cost)}" data-bind="draft.meds.${i}.cost"></div>`).join('')}
        <button class="link-btn" data-act="addMed">${ICON.plus} Add medicine</button>
      </div>
      <div class="card pad col" style="gap:12px">
        <div class="row"><label class="grow t15" for="v-fee" style="font-size:14px">Doctor consultation fee</label>
          <input class="in" id="v-fee" inputmode="decimal" placeholder="₹ 0" value="${esc(d.fee)}" data-bind="draft.fee" style="width:120px"></div>
        <div class="totals">
          <div><span>Medicines</span><span id="t-meds">${rs(medsCost(d))}</span></div>
          <div><span>Doctor fee</span><span id="t-fee">${rs(num(d.fee))}</span></div>
          <div class="big"><span>Visit total</span><span id="t-total">${rs(visitTotal(d))}</span></div>
        </div>
      </div>
      <div class="card pad field"><label class="flabel" for="v-desc">Description</label>
        <textarea class="in" id="v-desc" placeholder="What the doctor said, tests advised…" data-bind="draft.desc">${esc(d.desc)}</textarea></div>
      <div class="card pad col" style="gap:10px">
        <span class="flabel">Attachments &amp; voice notes</span>
        ${d.files.length ? `<div class="files">${d.files.map((f, i) => `<span class="file-chip">${f.type.startsWith('image') ? ICON.image : ICON.pdf}<span>${esc(f.name)}</span><button class="x-btn" style="width:24px;height:24px" data-act="delFile" data-i="${i}" aria-label="Remove ${esc(f.name)}">${ICON.close}</button></span>`).join('')}</div>` : ''}
        <div class="grid2">
          <button class="dashed" data-act="pick" data-input="file-pdf">${ICON.pdf} Add PDF</button>
          <button class="dashed" data-act="pick" data-input="file-img">${ICON.image} Add photo</button>
        </div>
        ${d.voice.map((n, i) => `<div class="voice"><button class="play" data-act="playVoice" data-id="${n.id}" aria-label="Play voice note ${i + 1}">${ICON.play}</button>${wave(n.id)}<span class="small muted">${fmtDur(n.dur)}</span><button class="x-btn" data-act="delVoice" data-i="${i}" aria-label="Remove voice note ${i + 1}">${ICON.close}</button></div>`).join('')}
        <button class="rec ${recOn ? 'on' : ''}" data-act="rec" aria-pressed="${recOn}"><span class="dot">${recOn ? ICON.stop : ICON.mic}</span><span id="rec-label">${recOn ? 'Recording… ' + fmtDur((Date.now() - REC.start) / 1000) + ' · tap to stop' : 'Record voice note'}</span></button>
      </div>
    </main>
    <button class="bottom-btn dark" data-act="saveVisit" ${recOn ? 'disabled' : ''}>Save visit</button>`;
  },

  export() {
    if (!S.people.length) return `<main class="screen"><h1>Export</h1><div class="card empty">Add a person and some records first.</div></main>${navBar('export')}`;
    if (!personOf(UI.ex.person)) { UI.ex.person = S.people[0].id; UI.ex.ids = []; UI.ex.excl = []; UI.ex.open = []; }
    const p = personOf(UI.ex.person);
    const ails = ailmentsOf(p.id).sort((a, b) => (a.type === 'chronic' ? 0 : 1) - (b.type === 'chronic' ? 0 : 1) || lastDate(b).localeCompare(lastDate(a)));
    const out = buildExport();
    return `<main class="screen">
      <div class="col"><h1>Export</h1><p class="sub">Choose ailments to share</p></div>
      <div class="pills">${S.people.map((x) => `<button class="pill ${x.id === p.id ? 'on' : ''}" data-act="exPerson" data-id="${x.id}" aria-pressed="${x.id === p.id}">${esc(x.name)}</button>`).join('')}</div>
      ${!ails.length ? `<div class="card empty">${esc(p.name)} has no ailments yet.</div>` : `
      <div class="card list">
        ${ails.map((a) => exRow(a)).join('')}
      </div>
      <div class="row between">
        <button class="link-btn" data-act="exAll">${UI.ex.ids.length === ails.length ? 'Clear all' : 'Select all'}</button>
        <span class="row" style="gap:14px"><button class="list-item" style="width:auto;padding:8px 0" data-act="exVoice" aria-pressed="${UI.ex.voice}"><span class="check ${UI.ex.voice ? 'on' : ''}">${UI.ex.voice ? ICON.check : ''}</span><span class="small">Voice notes</span></button><button class="list-item" style="width:auto;padding:8px 0" data-act="exRefills" aria-pressed="${UI.ex.refills}"><span class="check ${UI.ex.refills ? 'on' : ''}">${UI.ex.refills ? ICON.check : ''}</span><span class="small">Restocks</span></button></span>
      </div>
      <div class="card pad col" style="gap:10px">
        <span class="flabel">Preview</span>
        <div class="preview-box"><pre class="preview">${esc(out.text)}</pre></div>
        <span class="small" style="color:#3A3A42">${out.files.length ? `${plural(out.files.length, 'file')}: ${esc(out.files.slice(0, 3).map((f) => f.name).join(', '))}${out.files.length > 3 ? '…' : ''}` : 'No files attached'}</span>
      </div>
      <div class="btn-row">
        <button class="btn primary" data-act="shareText" ${UI.ex.ids.length ? '' : 'disabled'}>${ICON.send} Share summary</button>
        <button class="btn" data-act="shareFiles" ${out.files.length ? '' : 'disabled'}>${ICON.share} Files (${out.files.length})</button>
      </div>
      <div class="btn-row">
        <button class="btn" style="height:44px;font-size:14px" data-act="copyText" ${UI.ex.ids.length ? '' : 'disabled'}>${ICON.copy} Copy text</button>
        <button class="btn" style="height:44px;font-size:14px" data-act="saveTxt" ${UI.ex.ids.length ? '' : 'disabled'}>${ICON.download} Save .txt</button>
      </div>
      <p class="small muted" style="margin:0">Tip: WhatsApp may drop the text when you send files with it, so send the summary first, then the files.</p>`}
    </main>${navBar('export')}`;
  },

  insights() { return `<main class="screen">${insightsBody()}</main>${navBar('insights')}`; },

  settings() {
    const lb = S.meta.lastBackup;
    loadGis();
    return `<main class="screen">
      <div class="col"><h1>Backup &amp; sync</h1><p class="sub">${SY.cfg?.on ? 'Records are on this device and, locked with your sync password, in your Google Drive.' : 'Your records are stored only on this device.'}</p></div>
      ${syncSection()}
      <section class="card pad col" style="gap:12px">
        <span class="t15">Backup file</span>
        <p class="small muted" style="margin:0;line-height:1.5">Save a backup now and then, for example to Files or Google Drive. If you delete the app from your home screen or change phones, you can restore everything from it.</p>
        <span class="small" style="color:${lb ? '#3A3A42' : '#B42318'}">${lb ? 'Last backup: ' + fmtDate(lb) : 'No backup saved yet'}</span>
        <div class="btn-row"><button class="btn primary" data-act="backup">${ICON.download} Save backup</button><button class="btn" data-act="restore">${ICON.upload} Restore</button></div>
      </section>
      <section class="card pad col" style="gap:8px">
        <span class="t15">Storage</span>
        <span class="small muted" id="storage-info">Checking…</span>
      </section>
      <section class="card list">
        <button class="list-item" data-act="changePin"><span class="grow t15">Change PIN</span>${ICON.chev}</button>
        <button class="list-item" data-act="lockNow"><span class="grow t15">Lock now</span>${ICON.chev}</button>
        <button class="list-item" data-act="eraseAll"><span class="grow t15" style="color:#B42318">Erase all data</span>${ICON.chev}</button>
      </section>
      <p class="small muted" style="margin:0;text-align:center">Health Records v${APP_VERSION} · works offline</p>
    </main>${navBar('settings')}`;
  }
};

// A restock belongs to the latest visit on or before its date: "V1" if it is between Visit-1 and Visit-2.
function visitTag(r) {
  const vs = visitsOf(r.ailmentId); let n = 0;
  vs.forEach((v, i) => { if ((v.date || '') <= r.date) n = i + 1; });
  return n ? `<span class="chip" style="background:#EEEAFE;color:#5B3DF5;padding:3px 8px">V${n}</span>` : '';
}
function refillSection(a) {
  const rf = refillsOf(a.id).slice().reverse();
  if (a.type !== 'chronic' && !rf.length) return '';
  const tot = rf.reduce((s, r) => s + refillTotal(r), 0);
  const showAll = UI.showAllRefills[a.id]; const list = showAll ? rf : rf.slice(0, 4);
  return `<section class="col" style="gap:10px">
    <div class="row between"><h2 class="label">Medicine restocks</h2>${rf.length ? `<span class="small muted">${plural(rf.length, 'restock')} · ${rs(tot)}</span>` : ''}</div>
    ${!rf.length ? '<div class="card empty" style="padding:18px">No restocks yet. Tap <b>Restock</b> each time you buy the medicines again.</div>'
      : `<div class="card list">${list.map((r) => `<button class="list-item" data-act="editRefill" data-id="${r.id}" style="align-items:flex-start">
        <span class="col grow" style="gap:3px"><span class="row" style="gap:8px">${visitTag(r)}<span class="t15">${fmtDate(r.date)}</span></span><span class="small">${(r.meds || []).map(medHtml).join('<span style="color:#8A8A93">, </span>')}${r.note ? `<span style="color:#8A8A93"> · ${esc(r.note)}</span>` : ''}</span></span>
        <span class="t15" style="font-size:14px">${rs(refillTotal(r))}</span></button>`).join('')}</div>
      ${rf.length > 4 ? `<button class="link-btn" data-act="refillsAll" data-id="${a.id}">${showAll ? 'Show fewer' : `Show all ${rf.length}`}</button>` : ''}`}
  </section>`;
}

function exRow(a) {
  const vs = visitsOf(a.id);
  const on = UI.ex.ids.includes(a.id);
  const sel = on ? vs.filter((v) => !UI.ex.excl.includes(v.id)) : [];
  const partial = on && vs.length > 0 && sel.length < vs.length;
  const open = UI.ex.open.includes(a.id);
  const box = on ? `<span class="check on">${partial ? ICON.dash : ICON.check}</span>` : '<span class="check"></span>';
  const nr = refillsOf(a.id).length;
  const meta = `${a.type === 'chronic' ? 'Chronic' : 'Acute'} · ${partial ? `${sel.length} of ${vs.length} visits` : plural(vs.length, 'visit')}${nr ? ' · ' + plural(nr, 'restock') : ''} · ${plural(fileCount(a.id), 'file')}`;
  return `<div class="ex-ail">
    <div class="ex-row">
      <button class="list-item" data-act="exToggle" data-id="${a.id}" aria-pressed="${on ? (partial ? 'mixed' : 'true') : 'false'}">${box}<span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted" style="font-size:12px">${meta}</span></span></button>
      ${vs.length ? `<button class="ex-chev" data-act="exExpand" data-id="${a.id}" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Choose'} visits of ${esc(a.name)}">${I('<path d="m6 9 6 6 6-6"/>', `stroke-width="2" style="transform:${open ? 'rotate(180deg)' : 'none'}"`)}</button>` : ''}
    </div>
    ${open ? `<div class="ex-visits">${vs.map((v, i) => { const von = on && !UI.ex.excl.includes(v.id);
      return `<button class="list-item" data-act="exVisit" data-id="${v.id}" data-aid="${a.id}" aria-pressed="${von}"><span class="check ${von ? 'on' : ''}">${von ? ICON.check : ''}</span><span class="col grow"><span style="font-size:14px;font-weight:600">${esc(vName(v, i + 1))}</span><span class="small muted" style="font-size:12px">${fmtDate(v.date)} · ${rs(visitTotal(v))}</span></span></button>`; }).join('')}</div>` : ''}
  </div>`;
}

function homeBody() {
  const q = UI.search.q.trim().toLowerCase();
  const pf = UI.search.person;
  if (q || pf !== 'all') {
    const res = S.ailments.filter((a) => {
      if (pf !== 'all' && a.personId !== pf) return false;
      if (!q) return true;
      if (a.name.toLowerCase().includes(q)) return true;
      return refillsOf(a.id).some((r) => (r.meds || []).some((m) => (m.name || '').toLowerCase().includes(q))) || visitsOf(a.id).some((v) => (v.meds || []).some((m) => (m.name || '').toLowerCase().includes(q)) || (v.desc || '').toLowerCase().includes(q));
    }).sort((a, b) => (a.type === 'chronic' ? 0 : 1) - (b.type === 'chronic' ? 0 : 1) || lastDate(b).localeCompare(lastDate(a)));
    return `<section class="col" style="gap:10px"><div class="row between"><h2 class="label">${res.length ? plural(res.length, 'result') : 'No results'}</h2><button class="ghost" data-act="clearSearch">${I('<path d="M15 18 9 12l6-6"/>', 'width="16" height="16" stroke-width="2.2"')} Go back</button></div>
      ${res.length ? `<div class="card list">${res.map((a) => `<button class="list-item" data-act="openAilment" data-id="${a.id}">
        <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted">${esc(personOf(a.personId)?.name || '')} · ${fmtDate(lastDate(a)) || 'No date'}</span></span>${typeChip(a.type)}${ICON.chev}</button>`).join('')}</div>`
      : '<div class="card empty">Nothing matches. Try another word.</div>'}</section>`;
  }
  const recent = [...S.visits].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 3);
  return `<section class="col" style="gap:12px"><h2 class="label">People</h2>
    <div class="people">
      ${S.people.map((p) => { const ails = ailmentsOf(p.id); const ch = ails.filter((a) => a.type === 'chronic').length;
        const pc = pal(p.color);
        return `<button class="person-card" data-act="openPerson" data-id="${p.id}" style="background:${pc.tint};border-color:${pc.c}40">${avatar(p, 44, true)}<span class="col" style="gap:2px"><span class="t17">${esc(p.name)}</span><span class="small muted">${plural(ails.length, 'ailment')}${ch ? ` · ${ch} chronic` : ''}</span></span></button>`; }).join('')}
      ${S.people.length < MAX_PEOPLE ? `<button class="add-card" data-act="newPerson"><span style="color:#5B3DF5;display:flex">${ICON.plus}</span>Add person</button>` : ''}
    </div></section>
    ${recent.length ? `<section class="col" style="gap:12px"><h2 class="label">Recently updated</h2><div class="col" style="gap:8px">
      ${recent.map((v) => { const a = ailmentOf(v.ailmentId); if (!a) return ''; const p = personOf(a.personId);
        const pc = pal(p?.color);
        return `<button class="list-item card" data-act="openAilment" data-id="${a.id}" style="background:${pc.tint};border:1px solid ${pc.c}40;border-radius:20px"><span style="width:10px;height:10px;border-radius:5px;flex:none;background:${a.type === 'chronic' ? '#D92D20' : '#1D4ED8'}"></span>
        <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted">${esc(p?.name || '')} · ${esc(vName(v))}</span></span><span class="small muted">${fmtDate(v.date).slice(0, 6)}</span></button>`; }).join('')}
    </div></section>` : ''}`;
}

function wave(id) {
  let h = hashStr(id); const bars = [];
  for (let i = 0; i < 26; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; bars.push(6 + (h % 19)); }
  return `<div class="wave" aria-hidden="true">${bars.map((b) => `<i style="height:${b}px"></i>`).join('')}</div>`;
}

function visitCard(v, n, open, a) {
  return `<div class="card visit ${open ? 'open' : ''}">
    <button class="visit-head" data-act="toggleVisit" data-id="${v.id}" data-aid="${a.id}" aria-expanded="${open}">
      <span class="vnum">V${n}</span>
      <span class="col grow" style="gap:2px"><span class="t15">${esc(vName(v, n))}</span><span class="small muted">${fmtDate(v.date)}</span></span>
      <span class="t15" style="font-size:14px">${rs(visitTotal(v))}</span>
      ${I('<path d="m6 9 6 6 6-6"/>', `stroke-width="2" width="18" height="18" style="color:#6B6B73;flex:none;transform:${open ? 'rotate(180deg)' : 'none'}"`)}
    </button>
    ${open ? `<div class="visit-body">
      <div class="bill">
        ${(v.meds || []).map((m) => `<div class="bill-row"><span class="col" style="gap:1px;min-width:0"><span style="font-size:14px">${medHtml(m)}</span>${m.dur || priceNote(m) ? `<span class="small muted" style="font-size:12px">${esc([m.dur, priceNote(m)].filter(Boolean).join(' · '))}</span>` : ''}</span><span style="font-size:14px;font-weight:500">${rs(lineCost(m))}</span></div>`).join('')}
        <div class="bill-row"><span class="t15" style="font-size:14px">Doctor fee</span><span style="font-size:14px;font-weight:500">${rs(num(v.fee))}</span></div>
        <div class="bill-row"><span style="font-size:14px;font-weight:700">Visit total</span><span style="font-size:15px;font-weight:700;color:#5B3DF5">${rs(visitTotal(v))}</span></div>
      </div>
      ${v.desc ? `<p class="desc">${esc(v.desc)}</p>` : ''}
      ${(v.files || []).length ? `<div class="files">${v.files.map((f) => `<button class="file-chip" data-act="openFile" data-id="${f.id}" data-name="${esc(f.name)}" data-type="${esc(f.type)}">${f.type.startsWith('image') ? ICON.image : ICON.file}<span>${esc(f.name)}</span></button>`).join('')}</div>` : ''}
      ${(v.voice || []).map((nt, i) => `<div class="voice"><button class="play" data-act="playVoice" data-id="${nt.id}" aria-label="Play voice note ${i + 1}">${ICON.play}</button>${wave(nt.id)}<span class="small muted">${fmtDur(nt.dur)}</span></div>`).join('')}
      <div class="visit-actions"><button class="ghost" data-act="editVisit" data-id="${v.id}">${I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 'width="16" height="16"')} Edit</button><button class="ghost danger" data-act="deleteVisit" data-id="${v.id}">${ICON.trash} Delete</button></div>
    </div>` : ''}
  </div>`;
}

/* ----- insights ----- */
function niceMax(v) { if (v <= 0) return 1000; const p = 10 ** Math.floor(Math.log10(v)); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
const fmtK = (n) => n >= 1000 ? '₹' + (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'k' : '₹' + Math.round(n);

function insightsBody() {
  const N = UI.ins.range;
  const now = new Date();
  const months = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, m: d.getMonth(), y: d.getFullYear() }); }
  const keys = new Set(months.map((m) => m.key));
  const tabSel = UI.ins.tab;
  const grid = {}; let totMeds = 0, totFees = 0;
  for (const v of S.visits) {
    const k = (v.date || '').slice(0, 7); if (!keys.has(k)) continue;
    const a = ailmentOf(v.ailmentId); if (!a) continue;
    const mc = medsCost(v), fc = num(v.fee);
    totMeds += mc; totFees += fc;
    const val = tabSel === 'meds' ? mc : tabSel === 'fees' ? fc : mc + fc;
    grid[k] = grid[k] || {}; grid[k][a.personId] = (grid[k][a.personId] || 0) + val;
  }
  for (const r of S.refills) {
    const k = (r.date || '').slice(0, 7); if (!keys.has(k)) continue;
    const a = ailmentOf(r.ailmentId); if (!a) continue;
    const mc = refillTotal(r); totMeds += mc; if (tabSel === 'fees') continue;
    grid[k] = grid[k] || {}; grid[k][a.personId] = (grid[k][a.personId] || 0) + mc;
  }
  const monthTotals = months.map((m) => Object.values(grid[m.key] || {}).reduce((s, x) => s + x, 0));
  const max = niceMax(Math.max(0, ...monthTotals));
  const k = 140 / max;
  const barW = N > 6 ? 14 : 22;
  const bars = months.map((m) => {
    const segs = S.people.map((p) => ({ v: (grid[m.key] || {})[p.id] || 0, c: p.color })).filter((s) => s.v > 0).reverse();
    return `<div class="bar" style="width:${barW}px">${segs.map((s) => `<i style="height:${Math.max(3, Math.round(s.v * k))}px;background:${s.c}"></i>`).join('')}</div>`;
  }).join('');
  const xl = months.map((m) => `<span style="width:${barW}px">${N > 6 ? MON[m.m].charAt(0) : MON[m.m]}</span>`).join('');
  const legend = S.people.map((p) => { const t = months.reduce((s, m) => s + ((grid[m.key] || {})[p.id] || 0), 0); return `<div><i style="background:${p.color}"></i><b>${esc(p.name)}</b><span style="color:#3A3A42">${rs(t)}</span></div>`; }).join('');
  const range = `${MON[months[0].m]}–${MON[months[N - 1].m]} ${months[N - 1].y}`;
  const tabs = [['all', 'All'], ['meds', 'Medicines'], ['fees', 'Doctor fees']].map(([id, l]) => `<button class="${tabSel === id ? 'on' : ''}" data-act="insTab" data-v="${id}" aria-pressed="${tabSel === id}">${l}</button>`).join('');
  const anyCost = monthTotals.some((x) => x > 0);

  return `<div class="row between"><h1>Insights</h1>
      <button class="ghost" data-act="insRange">Last ${N} months ${ICON.down}</button></div>
    <section class="card pad col" style="gap:14px;padding:16px">
      <div class="col"><h2 class="flabel" style="margin:0;font-size:13px">Total spent · ${range}</h2>
        <span style="font-size:30px;font-weight:700;letter-spacing:-.02em">${rs(totMeds + totFees)}</span>
        <div class="row small" style="gap:14px;color:#3A3A42"><span>Medicines <b>${rs(totMeds)}</b></span><span>Doctor fees <b>${rs(totFees)}</b></span></div></div>
      <div class="seg">${tabs}</div>
      ${anyCost ? `<div class="chart" role="img" aria-label="Stacked bar chart of monthly spending by person">
        <div class="yax"><span style="transform:translateY(-6px)">${fmtK(max)}</span><span>${fmtK(max / 2)}</span><span style="transform:translateY(6px)">₹0</span></div>
        <div class="grow"><div class="plot"><div class="gl" style="top:0"></div><div class="gl" style="top:70px"></div><div class="gl" style="bottom:0;border-top-style:solid;border-color:#D5D5DC"></div><div class="bars">${bars}</div></div><div class="xax">${xl}</div></div>
      </div>
      <div class="legend">${legend}</div>` : '<div class="empty" style="padding:16px">No costs in this period yet. Add medicine costs and doctor fees to visits to see them here.</div>'}
    </section>
    ${bpCard()}${sugarCard()}`;
}

// Group readings by day and average them: one point per day on the charts.
function dailyAvg(list, keys) {
  const by = {};
  for (const r of list) { (by[r.date] = by[r.date] || []).push(r); }
  return Object.keys(by).sort().map((date) => {
    const rs_ = by[date]; const o = { date, n: rs_.length };
    for (const k of keys) o[k] = rs_.reduce((t, r) => t + Number(r[k]), 0) / rs_.length;
    return o;
  });
}
function lineChart(days, series, refs, label) {
  if (!days.length) return '';
  const W = 300, H = 140, px = 16, pt = 12, pb = 12;
  const vals = series.flatMap((x) => x.vals).concat(refs.map((r) => r.v));
  let lo = Math.min(...vals), hi = Math.max(...vals); const pv = (hi - lo) * 0.12 || 5; lo -= pv; hi += pv;
  const X = (i) => days.length === 1 ? W / 2 : px + i * (W - 2 * px) / (days.length - 1);
  const Y = (v) => pt + (hi - v) * (H - pt - pb) / (hi - lo);
  const refSvg = refs.map((r) => `<line x1="0" x2="${W}" y1="${Y(r.v).toFixed(1)}" y2="${Y(r.v).toFixed(1)}" stroke="#E2E2E8" stroke-dasharray="4 4"/><text x="2" y="${(Y(r.v) - 4).toFixed(1)}" font-size="9" fill="#8A8A93">${esc(r.label)}</text>`).join('');
  const lines = series.map((x) => `<polyline points="${x.vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${x.color}" stroke-width="2.5" stroke-linejoin="round"/>` +
    x.vals.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${days[i].n > 1 ? 4.5 : 3.5}" fill="${days[i].n > 1 ? x.color : '#fff'}" stroke="${x.color}" stroke-width="2"/>`).join('')).join('');
  const multi = days.some((d) => d.n > 1);
  return `<div class="bp-wrap" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${refSvg}${lines}</svg></div>
    <div class="row between small muted" style="font-size:11px"><span>${fmtDate(days[0].date)}</span><span>${days.length > 1 ? fmtDate(days[days.length - 1].date) : ''}</span></div>
    ${multi ? '<p class="small muted" style="margin:0;font-size:12px">Each point is that day’s average. Filled dots = more than one reading.</p>' : ''}`;
}
function personPills() {
  if (!personOf(UI.ins.bpPerson)) UI.ins.bpPerson = S.people[0].id;
  return `<div class="pills">${S.people.map((x) => `<button class="pill ${x.id === UI.ins.bpPerson ? 'on' : ''}" style="height:34px;padding:0 12px;font-size:13px" data-act="bpPerson" data-id="${x.id}" aria-pressed="${x.id === UI.ins.bpPerson}">${esc(x.name)}</button>`).join('')}</div>`;
}

function bpCard() {
  if (!S.people.length) return '';
  const pills = personPills();
  const p = personOf(UI.ins.bpPerson);
  const all = S.readings.filter((r) => r.personId === p.id).sort(byDateTime);
  const days = dailyAvg(all, ['sys', 'dia']).slice(-12);
  const lastDay = days[days.length - 1];
  const chart = days.length ? lineChart(days, [{ color: '#D92D20', vals: days.map((d) => d.sys) }, { color: '#1565C0', vals: days.map((d) => d.dia) }], [{ v: 120, label: '120' }, { v: 80, label: '80' }], `Daily average blood pressure for ${p.name}`)
    : '<div class="empty" style="padding:12px">No readings yet. Tap <b>Add reading</b>.</div>';
  const recent = all.slice(-6).reverse();
  return `<section class="card pad col" style="gap:12px;padding:16px">
    <div class="col"><h2 class="flabel" style="margin:0;font-size:13px">Blood pressure</h2>
      ${lastDay ? `<span style="font-size:24px;font-weight:700">${Math.round(lastDay.sys)}/${Math.round(lastDay.dia)} <span class="small muted" style="font-weight:500">mmHg · ${lastDay.n > 1 ? `avg of ${lastDay.n} · ` : ''}${fmtDate(lastDay.date).slice(0, 6)}</span></span>` : '<span class="small muted">—</span>'}</div>
    ${pills}
    ${chart}
    <div class="row between">
      <div class="key"><span><i style="background:#D92D20"></i>Systolic</span><span><i style="background:#1565C0"></i>Diastolic</span></div>
      <button class="btn dark" style="flex:none;height:40px;font-size:13px;padding:0 14px" data-act="newReading">${ICON.plus} Add reading</button>
    </div>
    ${recent.length ? `<div class="list" style="border-top:1px solid #EFEFF3">${recent.map((r) => `<div class="list-item" style="padding:10px 0"><span class="grow small">${when(r)}</span><b class="small">${r.sys}/${r.dia}</b><button class="x-btn" data-act="delReading" data-id="${r.id}" aria-label="Delete reading from ${when(r)}">${ICON.trash}</button></div>`).join('')}</div>` : ''}
  </section>`;
}

const SUGAR = {
  fasting: { label: 'Fasting', unit: 'mg/dL', color: '#5B3DF5', refs: [{ v: 100, label: '100' }, { v: 126, label: '126' }] },
  pp: { label: 'PPBS', unit: 'mg/dL', color: '#E5484D', refs: [{ v: 140, label: '140' }, { v: 200, label: '200' }] },
  random: { label: 'Random', unit: 'mg/dL', color: '#30A46C', refs: [] },
  hba1c: { label: 'HbA1c', unit: '%', color: '#F2B705', refs: [{ v: 5.7, label: '5.7%' }, { v: 6.5, label: '6.5%' }] }
};
const sugarVal = (kind, v) => kind === 'hba1c' ? Number(v).toFixed(1) : String(Math.round(v));

// Estimated HbA1c from home sugar readings, using the ADAG formula (eAG = 28.7 × A1c − 46.7),
// i.e. A1c ≈ (average glucose + 46.7) / 28.7, over the 90 days before each day.
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
const eA1c = (avg) => (avg + 46.7) / 28.7;
function a1cSeries(glucose) {
  const days = dailyAvg(glucose, ['value']);
  return days.map((d) => {
    const from = addDays(d.date, -89);
    const win = days.filter((x) => x.date >= from && x.date <= d.date);
    const avg = win.reduce((t, x) => t + x.value, 0) / win.length;
    return { date: d.date, n: 1, value: eA1c(avg), avg, span: win.length };
  });
}

function sugarCard() {
  if (!S.people.length) return '';
  const pills = personPills();
  const p = personOf(UI.ins.bpPerson);
  const t = UI.ins.sugarTab;
  const glucose = S.sugar.filter((r) => r.personId === p.id && r.kind !== 'hba1c').sort(byDateTime);
  const isA1c = t === 'hba1c';
  const sel = t === 'avg' || isA1c ? glucose : glucose.filter((r) => r.kind === t);
  const days = (isA1c ? a1cSeries(glucose) : dailyAvg(sel, ['value'])).slice(-12);
  const unit = isA1c ? '%' : 'mg/dL';
  const color = t === 'avg' ? '#111114' : SUGAR[t].color;
  const refs = t === 'avg' ? [{ v: 100, label: '100' }, { v: 140, label: '140' }] : SUGAR[t].refs;
  const last = days[days.length - 1];
  const tabs = [['avg', 'Average'], ['fasting', 'Fasting'], ['pp', 'PPBS'], ['hba1c', 'HbA1c']].map(([id, l]) => `<button class="${t === id ? 'on' : ''}" data-act="sugarTab" data-v="${id}" aria-pressed="${t === id}">${l}</button>`).join('');
  const chart = days.length ? lineChart(days, [{ color, vals: days.map((d) => d.value) }], refs, `${isA1c ? 'Estimated HbA1c' : t === 'avg' ? 'Average blood sugar' : SUGAR[t].label + ' blood sugar'} for ${p.name}`)
    : `<div class="empty" style="padding:12px">No ${t === 'avg' || isA1c ? 'sugar' : SUGAR[t].label} readings yet.</div>`;
  const head = !last ? '<span class="small muted">—</span>'
    : isA1c ? `<span style="font-size:24px;font-weight:700">${last.value.toFixed(1)} <span class="small muted" style="font-weight:500">% · from ${plural(last.span, 'day')} of readings, avg ${Math.round(last.avg)} mg/dL</span></span>`
    : `<span style="font-size:24px;font-weight:700">${sugarVal(t, last.value)} <span class="small muted" style="font-weight:500">${unit} · ${last.n > 1 ? `avg of ${last.n} · ` : ''}${fmtDate(last.date).slice(0, 6)}</span></span>`;
  const recent = isA1c ? [] : sel.slice(-6).reverse();
  return `<section class="card pad col" style="gap:12px;padding:16px">
    <div class="col"><h2 class="flabel" style="margin:0;font-size:13px">${isA1c ? 'Estimated HbA1c · worked out from your sugar readings' : 'Blood sugar' + (t === 'avg' ? ' · average of fasting, PPBS & random' : '')}</h2>${head}</div>
    ${pills}
    <div class="seg">${tabs}</div>
    ${chart}
    ${isA1c ? `<p class="small muted" style="margin:0;line-height:1.5">Each point uses the average of all sugar readings in the 90 days before it: HbA1c ≈ (average sugar + 46.7) ÷ 28.7.${last && last.span < 14 ? ' <b style="color:#B42318">Needs about 2 weeks of readings to be meaningful.</b>' : ''} Fasting and after-meal checks don’t capture the whole day, so a lab HbA1c test can differ.</p>` : ''}
    <div class="row" style="justify-content:flex-end"><button class="btn dark" style="flex:none;height:40px;font-size:13px;padding:0 14px" data-act="newSugar">${ICON.plus} Add reading</button></div>
    ${recent.length ? `<div class="list" style="border-top:1px solid #EFEFF3">${recent.map((r) => `<div class="list-item" style="padding:10px 0"><span class="col grow" style="gap:1px"><span class="small">${when(r)}</span><span class="small muted" style="font-size:12px">${SUGAR[r.kind]?.label || ''}</span></span><b class="small">${sugarVal(r.kind, r.value)} ${SUGAR[r.kind]?.unit || ''}</b><button class="x-btn" data-act="delSugar" data-id="${r.id}" aria-label="Delete sugar reading from ${when(r)}">${ICON.trash}</button></div>`).join('')}</div>` : ''}
  </section>`;
}

/* ----- modals ----- */
function modalView() {
  const m = UI.modal; const d = m.data;
  let body = '';
  if (m.kind === 'person') {
    body = `<h2>${d.id ? 'Edit person' : 'Add person'}</h2>
      <div class="field"><label class="flabel" for="m-name">Name</label><input class="in" id="m-name" value="${esc(d.name)}" data-bind="modal.data.name" placeholder="e.g. Mom" maxlength="30"></div>
      <div class="field"><span class="flabel">Colour (used in charts)</span><div class="swatches">${PALETTE.map((c) => `<button class="sw ${d.color === c.c ? 'on' : ''}" style="background:${c.c}" data-act="mColor" data-v="${c.c}" aria-label="${c.name}" aria-pressed="${d.color === c.c}"></button>`).join('')}</div></div>
      <div class="btn-row">${d.id ? '<button class="btn danger" data-act="mDeletePerson">Delete</button>' : '<button class="btn" data-act="closeModal">Cancel</button>'}<button class="btn dark" data-act="mSavePerson">Save</button></div>`;
  } else if (m.kind === 'ailment') {
    body = `<h2>${d.id ? 'Edit ailment' : 'New ailment'}</h2>
      <div class="field"><label class="flabel" for="m-aname">Ailment name</label><input class="in" id="m-aname" value="${esc(d.name)}" data-bind="modal.data.name" placeholder="e.g. Diabetes" maxlength="60"></div>
      <div class="field"><span class="flabel">Type</span><div class="typepick">
        <button class="chronic ${d.type === 'chronic' ? 'on' : ''}" data-act="mType" data-v="chronic" aria-pressed="${d.type === 'chronic'}">Chronic</button>
        <button class="acute ${d.type === 'acute' ? 'on' : ''}" data-act="mType" data-v="acute" aria-pressed="${d.type === 'acute'}">Acute</button></div></div>
      <div class="field"><label class="flabel" for="m-start">Starting date</label><input class="in" id="m-start" type="date" value="${esc(d.start)}" data-bind="modal.data.start"></div>
      <div class="btn-row">${d.id ? '<button class="btn danger" data-act="mDeleteAilment">Delete</button>' : '<button class="btn" data-act="closeModal">Cancel</button>'}<button class="btn dark" data-act="mSaveAilment">Save</button></div>`;
  } else if (m.kind === 'refill') {
    const sum = d.meds.reduce((t, x) => t + lineCost(x), 0);
    body = `<h2>${d.id ? 'Edit restock' : 'Restock medicines'}</h2><p class="sub" style="margin-top:-8px">${esc(ailmentOf(d.ailmentId)?.name || '')}${d.prefilled ? ' · filled in from last time, change anything' : ''}</p>
      <div class="field"><label class="flabel" for="m-rfdate">Date bought</label><input class="in" id="m-rfdate" type="date" value="${esc(d.date)}" data-bind="modal.data.date"></div>
      <div class="card pad col" style="gap:8px"><span class="flabel">Medicines</span>
        ${d.meds.map((x, i) => `<div class="med rf">
          <input class="in m-name" aria-label="Medicine ${i + 1} name" placeholder="Medicine name" value="${esc(x.name)}" data-bind="modal.data.meds.${i}.name">
          <button class="x-btn m-x" data-act="rDelMed" data-i="${i}" aria-label="Remove medicine ${i + 1}">${ICON.close}</button>
          <input class="in m-qty" aria-label="Medicine ${i + 1} quantity" inputmode="numeric" placeholder="Qty" value="${esc(x.qty)}" data-bind="modal.data.meds.${i}.qty">
          <input class="in m-cost" aria-label="Medicine ${i + 1} price per unit in rupees" inputmode="decimal" placeholder="₹ each" value="${esc(x.cost)}" data-bind="modal.data.meds.${i}.cost"></div>`).join('')}
        <button class="link-btn" data-act="rAddMed">${ICON.plus} Add medicine</button>
        <div class="totals"><div class="big"><span>Total</span><span id="r-total">${rs(sum)}</span></div></div>
      </div>
      <div class="field"><label class="flabel" for="m-rnote">Note (optional)</label><input class="in" id="m-rnote" value="${esc(d.note)}" data-bind="modal.data.note" placeholder="e.g. Apollo Pharmacy"></div>
      <div class="btn-row">${d.id ? '<button class="btn danger" data-act="mDeleteRefill">Delete</button>' : '<button class="btn" data-act="closeModal">Cancel</button>'}<button class="btn dark" data-act="mSaveRefill">Save</button></div>`;
  } else if (m.kind === 'syncpw') {
    const create = d.mode === 'create';
    body = `<h2>${create ? 'Create a sync password' : 'Enter your sync password'}</h2>
      <p class="sub" style="margin-top:-6px;line-height:1.5">${create ? 'Your records are locked with this password <b>before</b> they leave this phone. Google can’t read them. You’ll need it on your PC or another phone. <b>If you forget it, the cloud copy can’t be opened.</b>' : 'Use the password you created on your other device.'}</p>
      <div class="field"><label class="flabel" for="m-pw">Password${create ? ' (at least 8 characters)' : ''}</label><input class="in" id="m-pw" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" value="${esc(d.pw)}" data-bind="modal.data.pw"></div>
      ${create ? `<div class="field"><label class="flabel" for="m-pw2">Type it again</label><input class="in" id="m-pw2" type="password" autocomplete="new-password" value="${esc(d.pw2)}" data-bind="modal.data.pw2"></div>` : ''}
      <div class="btn-row"><button class="btn" data-act="closeModal">Cancel</button><button class="btn dark" data-act="mSyncPw">${create ? 'Turn on sync' : 'Unlock'}</button></div>`;
  } else if (m.kind === 'sugar') {
    const k = SUGAR[d.kind];
    body = `<h2>Add sugar reading</h2><p class="sub" style="margin-top:-8px">${esc(personOf(d.personId)?.name || '')}</p>
      <div class="field"><span class="flabel">Type</span><div class="seg">${Object.entries(SUGAR).filter(([id]) => id !== 'hba1c').map(([id, x]) => `<button class="${d.kind === id ? 'on' : ''}" data-act="mSugarKind" data-v="${id}" aria-pressed="${d.kind === id}">${x.label}</button>`).join('')}</div></div>
      <div class="grid2"><div class="field"><label class="flabel" for="m-sdate">Date</label><input class="in" id="m-sdate" type="date" value="${esc(d.date)}" data-bind="modal.data.date"></div>
      <div class="field"><label class="flabel" for="m-stime">Time</label><input class="in" id="m-stime" type="time" value="${esc(d.time)}" data-bind="modal.data.time"></div></div>
      <div class="field"><label class="flabel" for="m-sval">${k.label} (${k.unit})</label><input class="in" id="m-sval" inputmode="decimal" placeholder="${d.kind === 'hba1c' ? 'e.g. 6.8' : 'e.g. 110'}" value="${esc(d.value)}" data-bind="modal.data.value"></div>
      <div class="btn-row"><button class="btn" data-act="closeModal">Cancel</button><button class="btn dark" data-act="mSaveSugar">Save</button></div>`;
  } else if (m.kind === 'reading') {
    body = `<h2>Add BP reading</h2><p class="sub" style="margin-top:-8px">${esc(personOf(d.personId)?.name || '')}</p>
      <div class="grid2"><div class="field"><label class="flabel" for="m-rdate">Date</label><input class="in" id="m-rdate" type="date" value="${esc(d.date)}" data-bind="modal.data.date"></div>
      <div class="field"><label class="flabel" for="m-rtime">Time</label><input class="in" id="m-rtime" type="time" value="${esc(d.time)}" data-bind="modal.data.time"></div></div>
      <div class="grid2"><div class="field"><label class="flabel" for="m-sys">Systolic (upper)</label><input class="in" id="m-sys" inputmode="numeric" placeholder="120" value="${esc(d.sys)}" data-bind="modal.data.sys"></div>
      <div class="field"><label class="flabel" for="m-dia">Diastolic (lower)</label><input class="in" id="m-dia" inputmode="numeric" placeholder="80" value="${esc(d.dia)}" data-bind="modal.data.dia"></div></div>
      <div class="btn-row"><button class="btn" data-act="closeModal">Cancel</button><button class="btn dark" data-act="mSaveReading">Save</button></div>`;
  }
  return `<div class="backdrop" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
}
function openModal(kind, data) { UI.modal = { kind, data }; renderModal(); const f = $('#modal-root input'); if (f && !f.value) setTimeout(() => f.focus(), 50); }
function closeModal() { UI.modal = null; renderModal(); }

/* ---------------- export builder ---------------- */
function buildExport() {
  const p = personOf(UI.ex.person);
  const files = [];
  if (!p || !UI.ex.ids.length) return { text: 'Select at least one ailment.', files };
  const ails = ailmentsOf(p.id).filter((a) => UI.ex.ids.includes(a.id))
    .sort((a, b) => (a.type === 'chronic' ? 0 : 1) - (b.type === 'chronic' ? 0 : 1) || lastDate(b).localeCompare(lastDate(a)));
  const L = [`${p.name.toUpperCase()} — Medical summary`, `Prepared ${fmtDate(today())}`, ''];
  let grand = 0;
  for (const a of ails) {
    const vs = visitsOf(a.id);
    L.push(`${a.name} (${a.type === 'chronic' ? 'Chronic' : 'Acute'}${a.start ? `, ${a.type === 'chronic' ? 'since' : 'started'} ${fmtDate(a.start)}` : ''})`);
    if (!vs.length) L.push('  No visits recorded.');
    vs.forEach((v, i) => {
      const n = i + 1;
      if (UI.ex.excl.includes(v.id)) return;
      L.push(`• ${vName(v, n)} — ${fmtDate(v.date)}`);
      for (const m of v.meds || []) L.push(`   - ${medLabel(m)}${m.dur ? ` (${m.dur})` : ''}${num(m.cost) ? ` — ${rs(lineCost(m))}${priceNote(m) ? ` (${priceNote(m)})` : ''}` : ''}`);
      if (num(v.fee)) L.push(`   Doctor fee: ${rs(num(v.fee))}`);
      if (visitTotal(v)) L.push(`   Visit total: ${rs(visitTotal(v))}`);
      if (v.desc) L.push(`   Notes: ${v.desc.replace(/\n+/g, ' ')}`);
      const names = [];
      (v.files || []).forEach((f, j) => { const name = `${safeName(a.name)} – visit ${n}-${letter(j)}.${extOf(f.type, f.name)}`; files.push({ id: f.id, name, type: f.type }); names.push(name); });
      if (UI.ex.voice) (v.voice || []).forEach((nt, j) => { const name = `${safeName(a.name)} – visit ${n} voice-${letter(j)}.${extOf(nt.type)}`; files.push({ id: nt.id, name, type: nt.type }); names.push(name); });
      if (names.length) L.push(`   Attached: ${names.join(', ')}`);
      grand += visitTotal(v);
    });
    const rf = UI.ex.refills ? refillsOf(a.id) : [];
    if (rf.length) {
      L.push('Medicine restocks:');
      for (const r of rf) { const t = refillTotal(r); grand += t; L.push(`• ${fmtDate(r.date)}: ${(r.meds || []).map((m) => medLabel(m) + (priceNote(m) ? ` @ ${priceNote(m)}` : '')).join(', ')}${t ? ` — ${rs(t)}` : ''}${r.note ? ` (${r.note})` : ''}`); }
    }
    L.push('');
  }
  if (grand) L.push(`Total spent (selected): ${rs(grand)}`);
  return { text: L.join('\n').trim(), files };
}

async function shareOrDownload(file) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: file.name }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copied'); }
}

/* ---------------- files, viewer, audio ---------------- */
async function compressImage(file) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 2000; const w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    if (blob && blob.size < file.size) return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg' };
  } catch (e) { /* fall through */ }
  return { blob: file, name: file.name, type: file.type || 'image/jpeg' };
}
async function addFiles(list, isImage) {
  const d = UI.draft; if (!d || !list || !list.length) return;
  toast('Adding…');
  for (const f of list) {
    try {
      const r = isImage ? await compressImage(f) : { blob: f, name: f.name, type: f.type || 'application/pdf' };
      const id = uid(); await putBlob(id, r.blob);
      d.files.push({ id, name: r.name, type: r.type, size: r.blob.size }); d.added.push(id);
    } catch (e) { toast('Could not add ' + f.name); }
  }
  if (cur().name === 'visitEdit') render();
}

let viewerUrl = null;
function closeViewer() { const v = $('#viewer'); if (v) v.remove(); if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; } }
async function openFile(id, name, type) {
  const b = await getBlob(id); if (!b) return toast('File not found');
  closeViewer(); viewerUrl = URL.createObjectURL(b);
  const isImg = (type || '').startsWith('image');
  const el = document.createElement('div'); el.id = 'viewer'; el.className = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', name);
  el.innerHTML = `<div class="viewer-top"><button data-act="closeViewer">Close</button><span class="t">${esc(name)}</span><button data-act="shareViewer" data-id="${id}" data-name="${esc(name)}" data-type="${esc(type)}">Share</button></div>
    <div class="viewer-body">${isImg ? `<img src="${viewerUrl}" alt="${esc(name)}">` : `<iframe src="${viewerUrl}" title="${esc(name)}"></iframe>`}</div>`;
  document.body.appendChild(el);
}

const AUD = { el: null, id: null, url: null };
function stopAudio() { if (AUD.el) { AUD.el.pause(); URL.revokeObjectURL(AUD.url); } AUD.el = null; AUD.id = null; AUD.url = null; refreshPlayIcons(); }
function refreshPlayIcons() { document.querySelectorAll('[data-act="playVoice"]').forEach((b) => { b.innerHTML = b.dataset.id === AUD.id ? ICON.pause : ICON.play; }); }
async function playVoice(id) {
  if (AUD.id === id) return stopAudio();
  stopAudio();
  const b = await getBlob(id); if (!b) return toast('Voice note missing');
  AUD.url = URL.createObjectURL(b); AUD.el = new Audio(AUD.url); AUD.id = id;
  AUD.el.onended = stopAudio;
  AUD.el.play().catch(() => { toast('Could not play this note'); stopAudio(); });
  refreshPlayIcons();
}

const REC = { mr: null, start: 0, timer: null };
async function toggleRec() {
  if (REC.mr) { REC.mr.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Voice recording is not supported in this browser');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { return toast('Microphone access was blocked. Allow it in Settings › Safari › Microphone.'); }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  let mr;
  try { mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined); }
  catch (e) { mr = new MediaRecorder(stream); }
  const chunks = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop()); clearInterval(REC.timer);
    const dur = (Date.now() - REC.start) / 1000; REC.mr = null;
    const blob = new Blob(chunks, { type: (mr.mimeType || type || 'audio/mp4').split(';')[0] });
    if (blob.size && UI.draft) { const id = uid(); await putBlob(id, blob); UI.draft.voice.push({ id, dur: Math.round(dur), type: blob.type }); UI.draft.added.push(id); }
    if (cur().name === 'visitEdit' && !UI.locked) render();
  };
  REC.mr = mr; REC.start = Date.now(); mr.start();
  REC.timer = setInterval(() => { const el = $('#rec-label'); if (el) el.textContent = 'Recording… ' + fmtDur((Date.now() - REC.start) / 1000) + ' · tap to stop'; }, 500);
  render();
}

/* ---------------- PIN ---------------- */
async function hashPin(pin, salt) {
  if (!crypto.subtle) return 'plain:' + salt + pin;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function shakeDots() { const d = $('#dots'); if (d) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); } }
async function pinComplete() {
  const pin = UI.pinBuf; UI.pinBuf = '';
  if (UI.pinMode === 'create') { UI.pinFirst = pin; UI.pinMode = 'confirm'; UI.pinMsg = ''; return render(); }
  if (UI.pinMode === 'confirm') {
    if (pin !== UI.pinFirst) { UI.pinMode = 'create'; UI.pinMsg = 'PINs did not match. Try again.'; render(); return shakeDots(); }
    const salt = uid(); UI.pin = { salt, hash: await hashPin(pin, salt) };
    await DB.put('kv', 'pin', UI.pin);
    const wasChange = UI.changing; UI.changing = false; UI.pinMsg = ''; UI.pinFirst = '';
    unlock(); if (wasChange) toast('PIN changed');
    return;
  }
  const ok = (await hashPin(pin, UI.pin.salt)) === UI.pin.hash;
  if (UI.pinMode === 'unlock') {
    if (ok) { UI.fails = 0; UI.pinMsg = ''; return unlock(); }
    UI.fails++; UI.pinMsg = 'Wrong PIN';
    if (UI.fails >= 5) { UI.fails = 0; UI.lockUntil = Date.now() + 30000; setTimeout(() => { if (UI.locked) render(); }, 30100); }
    render(); return shakeDots();
  }
  if (UI.pinMode === 'verify') {
    if (ok) { UI.pinMode = 'create'; UI.pinMsg = ''; return render(); }
    UI.pinMsg = 'Wrong PIN'; render(); return shakeDots();
  }
}
function unlock() {
  UI.locked = false; UI.pinMode = 'unlock'; render();
  if (SY.cfg?.on) { loadGis(); if (tokenOk()) runSync(); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
function lockApp() {
  if (!UI.pin) return;
  stopAudio(); UI.locked = true; UI.pinMode = 'unlock'; UI.pinBuf = ''; UI.pinMsg = ''; render();
}
function pressKey(k) {
  if (UI.lockUntil > Date.now() || UI.pinBuf.length >= 4) return;
  UI.pinBuf += k; render();
  if (UI.pinBuf.length === 4) setTimeout(pinComplete, 120);
}

/* ---------------- backup ---------------- */
function abToB64(buf) { const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function b64ToAb(b64) { const s = atob(b64); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out.buffer; }
async function doBackup() {
  toast('Preparing backup…');
  const ids = await DB.keys('blobs'); const blobs = [];
  for (const id of ids) { const r = await DB.get('blobs', id); if (r) blobs.push({ id, type: r.type, data: abToB64(r.data) }); }
  const json = JSON.stringify({ app: 'health-records', v: 1, exported: new Date().toISOString(), state: S, blobs });
  const file = new File([json], `health-backup-${today()}.json`, { type: 'application/json' });
  const ok = await shareOrDownload(file);
  if (ok) { S.meta.lastBackup = today(); await save(); if (cur().name === 'settings') render(); toast('Backup saved'); }
}
async function doRestore(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { return toast('That file is not a valid backup'); }
  if (!data || data.app !== 'health-records' || !data.state) return toast('That file is not a Health Records backup');
  const when = data.exported ? fmtDate(isoOf(new Date(data.exported))) : 'unknown date';
  if (!confirm(`Replace ALL records on this device with the backup from ${when}?${SY.cfg?.on ? '\n\nSync is on, so your other devices will get the same change.' : ''}\n\nThis cannot be undone.`)) return;
  try {
    await DB.clear('blobs');
    for (const b of data.blobs || []) await DB.put('blobs', b.id, { type: b.type, data: b64ToAb(b.data) });
    S = normalize(data.state); await save();
    UI.openVisit = {}; UI.ex = { person: null, ids: [], voice: false, refills: true, excl: [], open: [] }; UI.ins.bpPerson = null;
    tab('home'); toast('Backup restored');
  } catch (e) { toast('Restore failed: ' + (e.message || 'storage error')); }
}
async function fillStorageInfo() {
  const el = $('#storage-info'); if (!el) return;
  let txt = `${plural(S.people.length, 'person').replace('persons', 'people')} · ${plural(S.ailments.length, 'ailment')} · ${plural(S.visits.length, 'visit')}`;
  try {
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); txt += ` · using ${(e.usage / 1048576).toFixed(1)} MB`; }
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) txt += '. Keep the app on your home screen so the phone does not clear it.';
  } catch (e) { /* ignore */ }
  if ($('#storage-info')) $('#storage-info').textContent = txt;
}

/* ---------------- encrypted Google Drive sync ---------------- */
const SYNC_FILE = 'health-sync.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const SY = { dirty: false, cfg: null, key: null, token: null, exp: 0, gis: null, tokenClient: null, pending: null, busy: false, msg: '', timer: null };
const clientId = () => String(window.GOOGLE_CLIENT_ID || '').trim();

async function deriveKey(pw, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(b64ToAb(saltB64)), iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function enc(key, buf) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  const out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12); return out;
}
async function dec(key, buf) { const u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12)); }

function loadGis() {
  if (SY.gis || !clientId() || !navigator.onLine) return;
  SY.gis = 'loading';
  const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
  sc.onload = () => {
    try {
      SY.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId(), scope: SCOPE, callback: onToken,
        error_callback: (e) => { SY.pending = null; setSyncMsg(e && e.type === 'popup_closed' ? 'Google sign-in was closed' : 'Google sign-in failed'); }
      });
      SY.gis = 'ready';
    } catch (e) { SY.gis = null; }
  };
  sc.onerror = () => { SY.gis = null; };
  document.head.appendChild(sc);
}
function onToken(resp) {
  if (!resp || resp.error) { SY.pending = null; return setSyncMsg('Google sign-in failed' + (resp?.error ? ': ' + resp.error : '')); }
  SY.token = resp.access_token; SY.exp = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000;
  DB.put('kv', 'syncToken', { t: SY.token, exp: SY.exp }).catch(() => {});
  if (SY.cfg) { SY.cfg.consented = true; DB.put('kv', 'syncCfg', SY.cfg).catch(() => {}); }
  const p = SY.pending; SY.pending = null; if (p) Promise.resolve(p()).catch(syncError);
}
const tokenOk = () => !!SY.token && SY.exp > Date.now();
// Must be called directly from a tap, so that iPhone allows the Google sign-in window.
function withToken(fn) {
  if (!clientId()) return toast('Sync is not set up yet (see SYNC-SETUP.md)');
  if (tokenOk()) return Promise.resolve(fn()).catch(syncError);
  if (!navigator.onLine) return toast('You are offline');
  if (!SY.tokenClient) { loadGis(); return toast('Connecting to Google… tap again in a moment'); }
  SY.pending = fn;
  SY.tokenClient.requestAccessToken({ prompt: SY.cfg?.consented ? '' : 'consent' });
}
function updateSyncDot() {
  const b = document.getElementById('sync-btn'); if (!b) return;
  b.querySelector('.sync-dot')?.remove();
  if (SY.dirty) b.insertAdjacentHTML('beforeend', '<span class="sync-dot" aria-hidden="true"></span>');
  b.setAttribute('aria-label', SY.dirty ? 'Sync now (changes not synced yet)' : 'Sync now');
}
function setSyncMsg(m) { SY.msg = m; const el = $('#sync-status'); if (el) el.textContent = m; }
function syncError(e) {
  console.error(e);
  const m = e?.message === 'AUTH' ? 'Google sign-in expired. Tap Sync now.' : e?.message === 'PWCHANGED' ? 'The sync password was changed on another device. Turn sync off and on again here.'
    : !navigator.onLine ? 'Offline. Will sync later.' : 'Sync failed: ' + (e?.message || 'unknown error');
  setSyncMsg(m); return m;
}

async function gfetch(url, opts = {}) {
  const r = await fetch(url.startsWith('http') ? url : 'https://www.googleapis.com/drive/v3/' + url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + SY.token } });
  if (r.status === 401) { SY.token = null; SY.exp = 0; DB.del('kv', 'syncToken').catch(() => {}); throw new Error('AUTH'); }
  if (!r.ok) throw new Error('Google Drive error ' + r.status);
  return r;
}
async function listFiles() {
  let files = [], pt = '';
  do {
    const j = await (await gfetch(`files?spaces=appDataFolder&pageSize=1000&fields=nextPageToken,files(id,name)${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`)).json();
    files = files.concat(j.files || []); pt = j.nextPageToken;
  } while (pt);
  return files;
}
const downloadFile = async (id) => (await gfetch(`files/${id}?alt=media`)).arrayBuffer();
async function uploadNew(name, body, type) {
  const meta = JSON.stringify({ name, parents: ['appDataFolder'] });
  if (body.size > 4.5 * 1048576) {
    const r = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type }, body: meta });
    const loc = r.headers.get('Location'); if (!loc) throw new Error('large file upload was blocked');
    return (await gfetch(loc, { method: 'PUT', headers: { 'Content-Type': type }, body })).json();
  }
  const b = 'hr' + uid();
  const blob = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: ${type}\r\n\r\n`, body, `\r\n--${b}--`]);
  return (await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body: blob })).json();
}
const updateFile = (id, body, type) => gfetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': type }, body });
const deleteFile = (id) => gfetch(`files/${id}`, { method: 'DELETE' });

function blobRefs(st) {
  const m = new Map();
  for (const v of st.visits) { for (const f of v.files || []) m.set(f.id, f.type || ''); for (const n of v.voice || []) m.set(n.id, n.type || ''); }
  return m;
}
const tOf = (r) => r.updated || r.created || 0;
function mergeStates(a, b) {
  const del = { ...(a.meta?.deleted || {}) };
  for (const [k, v] of Object.entries(b.meta?.deleted || {})) del[k] = Math.max(del[k] || 0, v);
  const cutoff = Date.now() - 400 * 86400000;
  for (const k of Object.keys(del)) if (del[k] < cutoff) delete del[k];
  const out = { meta: { ...(a.meta || {}), deleted: del } };
  for (const c of COLLS) {
    const m = new Map();
    for (const r of [...(a[c] || []), ...(b[c] || [])]) { const cur = m.get(r.id); if (!cur || tOf(r) > tOf(cur)) m.set(r.id, r); }
    out[c] = [...m.values()].filter((r) => !(del[r.id] && del[r.id] >= tOf(r)));
  }
  return normalize(JSON.parse(JSON.stringify(out)));
}
async function readRemote(files) {
  const f = files.find((x) => x.name === SYNC_FILE); if (!f) return { id: null, wrap: null };
  return { id: f.id, wrap: JSON.parse(new TextDecoder().decode(await downloadFile(f.id))) };
}

async function runSync() {
  if (SY.busy || !SY.cfg?.on || !SY.key) return;
  if (cur().name === 'visitEdit' || REC.mr) return;
  if (!tokenOk()) { setSyncMsg('Tap Sync now to continue'); return; }
  SY.busy = true; setSyncMsg('Syncing…'); document.getElementById('sync-btn')?.classList.add('spin');
  try {
    const startN = SAVE_N;
    const files = await listFiles(); const byName = new Map(files.map((f) => [f.name, f.id]));
    const { id: fid, wrap } = await readRemote(files);
    let remote = null;
    if (wrap) {
      if (wrap.salt !== SY.cfg.salt) throw new Error('PWCHANGED');
      remote = JSON.parse(new TextDecoder().decode(await dec(SY.key, b64ToAb(wrap.data))));
    }
    const merged = remote ? mergeStates(S, remote.state) : normalize(JSON.parse(JSON.stringify(S)));
    const refs = blobRefs(merged); let missing = 0;
    for (const [id, type] of refs) {
      const local = await DB.get('blobs', id); const rid = byName.get('b_' + id);
      if (!local && rid) await DB.put('blobs', id, { type, data: await dec(SY.key, await downloadFile(rid)) });
      else if (!local) missing++;
      else if (!rid) { const r = await uploadNew('b_' + id, new Blob([await enc(SY.key, local.data)]), 'application/octet-stream'); byName.set('b_' + id, r.id); }
    }
    const payload = { state: { ...merged, meta: { deleted: merged.meta.deleted || {} } }, updated: Date.now() };
    const out = { app: 'health-records-sync', v: 1, salt: SY.cfg.salt, iter: SY.cfg.iter, data: abToB64(await enc(SY.key, new TextEncoder().encode(JSON.stringify(payload)))) };
    const body = new Blob([JSON.stringify(out)], { type: 'application/json' });
    if (fid) await updateFile(fid, body, 'application/json'); else await uploadNew(SYNC_FILE, body, 'application/json');
    for (const f of files) if (f.name.startsWith('b_') && !refs.has(f.name.slice(2))) { try { await deleteFile(f.id); } catch (e) { /* ignore */ } }
    // Apply. If something was edited on this device while syncing, keep those edits too.
    const keepMeta = { ...S.meta };
    S = SAVE_N === startN ? merged : mergeStates(S, merged);
    S.meta = { ...keepMeta, deleted: S.meta.deleted };
    rebuildHashes(); await DB.put('kv', 'state', S); await DB.put('kv', 'hashes', HASH);
    SY.cfg.lastSync = Date.now(); await DB.put('kv', 'syncCfg', SY.cfg);
    if (SAVE_N === startN) { SY.dirty = false; await DB.put('kv', 'syncDirty', false); }
    updateSyncDot();
    setSyncMsg(missing ? `Synced, but ${plural(missing, 'file')} haven’t arrived yet. Sync again on the other device.` : 'Synced');
    if (SAVE_N !== startN) scheduleSync();
    if (!UI.locked && !UI.modal && cur().name !== 'visitEdit') render();
  } catch (e) { syncError(e); }
  finally { SY.busy = false; document.getElementById('sync-btn')?.classList.remove('spin'); }
}
function scheduleSync(ms = 6000) {
  if (!SY.cfg?.on || !tokenOk()) return;
  clearTimeout(SY.timer); SY.timer = setTimeout(runSync, ms);
}
async function syncForget() {
  SY.cfg = null; SY.key = null; SY.token = null; SY.exp = 0; SY.msg = ''; SY.dirty = false;
  for (const k of ['syncCfg', 'syncKey', 'syncToken', 'syncDirty']) await DB.del('kv', k).catch(() => {});
}
async function wipeLocal() {
  await DB.clear('blobs'); S = normalize({}); HASH = {}; await syncForget(); await save();
}
const agoText = (t) => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return fmtDate(isoOf(new Date(t))); };
function syncSection() {
  if (!clientId()) return `<section class="card pad col" style="gap:8px"><span class="t15">Sync</span>
    <p class="small muted" style="margin:0;line-height:1.5">Sync needs a one-time Google setup. Follow <b>SYNC-SETUP.md</b> in your app’s files, then paste the Client ID into <b>config.js</b>.</p></section>`;
  if (!SY.cfg?.on) return `<section class="card pad col" style="gap:12px"><span class="t15">Sync with Google Drive</span>
    <p class="small muted" style="margin:0;line-height:1.5">Use the same records on your PC or another phone. Everything is locked with a password on this device first, so Google can’t read it. It’s kept in a hidden app folder in your Drive.</p>
    <button class="btn primary" data-act="syncOn">${ICON.cloud} Turn on sync</button>
    <span class="small muted" id="sync-status">${esc(SY.msg)}</span></section>`;
  return `<section class="card pad col" style="gap:12px">
    <div class="row between"><span class="t15">Sync with Google Drive</span><span class="chip" style="background:#E6F6EC;color:#1E7A4D">On</span></div>
    <span class="small" style="color:#3A3A42">Last synced: ${agoText(SY.cfg.lastSync)}${SY.dirty ? ' · <b style="color:#B42318">changes not synced yet</b>' : ''}</span>
    <span class="small muted" id="sync-status">${esc(SY.msg)}</span>
    <button class="btn primary" data-act="syncNow">${ICON.cloud} Sync now</button>
    <p class="small muted" style="margin:0;line-height:1.5">Changes sync by themselves for about an hour after you tap Sync now. After that, tap it again (Google asks you to sign in again every hour).</p>
    <div class="btn-row"><button class="btn" style="height:44px;font-size:14px" data-act="syncOff">Turn off here</button><button class="btn danger" style="height:44px;font-size:14px" data-act="syncDeleteCloud">Delete cloud copy</button></div>
  </section>`;
}

/* ---------------- actions ---------------- */
function startDraft(v, aid) {
  const isNew = !v;
  UI.draft = isNew
    ? { id: uid(), ailmentId: aid, isNew, name: '', date: today(), meds: [{ name: '', qty: '', dur: '', cost: '' }], fee: '', desc: '', files: [], voice: [], added: [], removed: [], created: Date.now() }
    : { ...JSON.parse(JSON.stringify(v)), isNew, added: [], removed: [], meds: (v.meds || []).map((m) => ({ ...m, cost: m.cost === 0 || m.cost === '' ? '' : String(m.cost) })), fee: v.fee ? String(v.fee) : '' };
  if (!UI.draft.meds.length) UI.draft.meds.push({ name: '', qty: '', dur: '', cost: '' });
  go({ name: 'visitEdit' });
}
async function cancelDraft() {
  if (REC.mr) { REC.mr.onstop = null; try { REC.mr.stop(); REC.mr.stream?.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ } clearInterval(REC.timer); REC.mr = null; }
  const d = UI.draft; UI.draft = null;
  if (d) await delBlobs(d.added);
  stopAudio(); back();
}
async function saveDraft() {
  const d = UI.draft; if (!d) return;
  if (!d.date) return toast('Please pick a date');
  const v = {
    id: d.id, ailmentId: d.ailmentId, name: AUTO_NAME.test((d.name || '').trim()) ? '' : d.name.trim(), date: d.date,
    meds: d.meds.filter((m) => (m.name || '').trim()).map((m) => ({ name: m.name.trim(), qty: String(m.qty || '').trim(), dur: (m.dur || '').trim(), cost: num(m.cost) })),
    fee: num(d.fee), desc: (d.desc || '').trim(), files: d.files, voice: d.voice, created: d.created || Date.now(), updated: Date.now()
  };
  const i = S.visits.findIndex((x) => x.id === v.id);
  if (i >= 0) S.visits[i] = v; else S.visits.push(v);
  await save();
  await delBlobs(d.removed);
  UI.draft = null; UI.openVisit[v.ailmentId] = v.id; stopAudio();
  back(); toast('Visit saved');
}
function updateTotals() {
  const d = UI.draft; if (!d) return;
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  set('t-meds', rs(medsCost(d))); set('t-fee', rs(num(d.fee))); set('t-total', rs(visitTotal(d)));
}
async function deleteBlobsOfVisits(vs) { const ids = []; for (const v of vs) { (v.files || []).forEach((f) => ids.push(f.id)); (v.voice || []).forEach((n) => ids.push(n.id)); } await delBlobs(ids); }

const ACTIONS = {
  key: (el) => pressKey(el.dataset.k),
  keyDel: () => { UI.pinBuf = UI.pinBuf.slice(0, -1); render(); },
  forgotPin: async () => {
    if (!confirm('Forgot your PIN?\n\nThe only way to reset it is to ERASE all records on this device. You can get them back afterwards from a backup file, or by turning sync on again with your sync password.')) return;
    if (!confirm('Erase everything and set a new PIN?')) return;
    await wipeLocal(); await DB.del('kv', 'pin'); UI.pin = null; UI.pinMode = 'create'; UI.pinMsg = ''; stack.length = 1; stack[0] = { name: 'home' }; render();
  },
  cancelPinChange: () => { UI.changing = false; UI.pinMode = 'unlock'; UI.pinMsg = ''; UI.pinBuf = ''; UI.locked = false; render(); },
  changePin: () => { UI.changing = true; UI.locked = true; UI.pinMode = 'verify'; UI.pinBuf = ''; UI.pinMsg = ''; render(); },
  lockNow: () => lockApp(),
  tab: (el) => { if (el.dataset.tab === 'home') UI.search = { person: 'all', q: '' }; tab(el.dataset.tab); },
  clearSearch: () => { UI.search = { person: 'all', q: '' }; render(); },
  back: () => back(),
  openPerson: (el) => go({ name: 'person', id: el.dataset.id }),
  openAilment: (el) => go({ name: 'ailment', id: el.dataset.id }),
  newPerson: () => {
    if (S.people.length >= MAX_PEOPLE) return toast(`You can add up to ${MAX_PEOPLE} people`);
    const used = new Set(S.people.map((p) => p.color));
    openModal('person', { name: '', color: (PALETTE.find((c) => !used.has(c.c)) || PALETTE[0]).c });
  },
  editPerson: (el) => { const p = personOf(el.dataset.id); if (p) openModal('person', { ...p }); },
  mColor: (el) => { UI.modal.data.color = el.dataset.v; renderModal(); },
  mSavePerson: async () => {
    const d = UI.modal.data; const name = (d.name || '').trim(); if (!name) return toast('Please enter a name');
    if (d.id) Object.assign(personOf(d.id), { name, color: d.color });
    else S.people.push({ id: uid(), name, color: d.color, created: Date.now() });
    await save(); closeModal(); render();
  },
  mDeletePerson: async () => {
    const d = UI.modal.data; const p = personOf(d.id); if (!p) return;
    if (!confirm(`Delete ${p.name} and ALL their ailments, visits, files and BP readings?\n\nThis cannot be undone.`)) return;
    const aids = ailmentsOf(p.id).map((a) => a.id);
    await deleteBlobsOfVisits(S.visits.filter((v) => aids.includes(v.ailmentId)));
    S.visits = S.visits.filter((v) => !aids.includes(v.ailmentId));
    S.ailments = S.ailments.filter((a) => a.personId !== p.id);
    S.readings = S.readings.filter((r) => r.personId !== p.id);
    S.sugar = S.sugar.filter((r) => r.personId !== p.id);
    S.refills = S.refills.filter((r) => !aids.includes(r.ailmentId));
    S.people = S.people.filter((x) => x.id !== p.id);
    await save(); UI.modal = null; tab('home'); toast('Deleted');
  },
  newAilment: (el) => openModal('ailment', { personId: el.dataset.id, name: '', type: 'acute', start: today() }),
  editAilment: (el) => { const a = ailmentOf(el.dataset.id); if (a) openModal('ailment', { ...a }); },
  mType: (el) => { UI.modal.data.type = el.dataset.v; renderModal(); },
  mSaveAilment: async () => {
    const d = UI.modal.data; const name = (d.name || '').trim(); if (!name) return toast('Please enter the ailment name');
    if (d.id) { Object.assign(ailmentOf(d.id), { name, type: d.type, start: d.start }); await save(); closeModal(); render(); }
    else { const a = { id: uid(), personId: d.personId, name, type: d.type, start: d.start, created: Date.now() }; S.ailments.push(a); await save(); UI.modal = null; go({ name: 'ailment', id: a.id }); }
  },
  mDeleteAilment: async () => {
    const a = ailmentOf(UI.modal.data.id); if (!a) return;
    if (!confirm(`Delete "${a.name}" and all its visits and files?\n\nThis cannot be undone.`)) return;
    const vs = S.visits.filter((v) => v.ailmentId === a.id);
    await deleteBlobsOfVisits(vs);
    S.refills = S.refills.filter((r) => r.ailmentId !== a.id); S.visits = S.visits.filter((v) => v.ailmentId !== a.id); S.ailments = S.ailments.filter((x) => x.id !== a.id);
    UI.ex.ids = UI.ex.ids.filter((x) => x !== a.id);
    await save(); UI.modal = null; back(); toast('Deleted');
  },
  closeModal: () => closeModal(),
  backdrop: (el, ev) => { if (ev.target === el) closeModal(); },
  toggleVisit: (el) => { const aid = el.dataset.aid; UI.openVisit[aid] = UI.openVisit[aid] === el.dataset.id ? null : el.dataset.id; stopAudio(); render(); },
  newVisit: (el) => startDraft(null, el.dataset.id),
  editVisit: (el) => { const v = S.visits.find((x) => x.id === el.dataset.id); if (v) startDraft(v, v.ailmentId); },
  deleteVisit: async (el) => {
    const v = S.visits.find((x) => x.id === el.dataset.id); if (!v) return;
    if (!confirm(`Delete ${vName(v)} (${fmtDate(v.date)}) with its files and voice notes?`)) return;
    await deleteBlobsOfVisits([v]); S.visits = S.visits.filter((x) => x.id !== v.id); await save(); stopAudio(); render(); toast('Visit deleted');
  },
  cancelVisit: () => {
    const d = UI.draft;
    const dirty = d && (d.added.length || d.removed.length || (d.isNew && (d.desc || d.fee || d.meds.some((m) => m.name))));
    if (dirty && !confirm('Discard changes to this visit?')) return;
    cancelDraft();
  },
  saveVisit: () => saveDraft(),
  addMed: () => { UI.draft.meds.push({ name: '', qty: '', dur: '', cost: '' }); render(); const ins = document.querySelectorAll('.med .m-name'); ins[ins.length - 1]?.focus(); },
  delMed: (el) => { UI.draft.meds.splice(+el.dataset.i, 1); if (!UI.draft.meds.length) UI.draft.meds.push({ name: '', qty: '', dur: '', cost: '' }); render(); },
  delFile: (el) => { const d = UI.draft; const [f] = d.files.splice(+el.dataset.i, 1); if (f) { if (d.added.includes(f.id)) { d.added = d.added.filter((x) => x !== f.id); delBlobs([f.id]); } else d.removed.push(f.id); } render(); },
  delVoice: (el) => { const d = UI.draft; const [n] = d.voice.splice(+el.dataset.i, 1); if (n) { if (AUD.id === n.id) stopAudio(); if (d.added.includes(n.id)) { d.added = d.added.filter((x) => x !== n.id); delBlobs([n.id]); } else d.removed.push(n.id); } render(); },
  pick: (el) => document.getElementById(el.dataset.input).click(),
  rec: () => toggleRec(),
  playVoice: (el) => playVoice(el.dataset.id),
  openFile: (el) => openFile(el.dataset.id, el.dataset.name, el.dataset.type),
  closeViewer: () => closeViewer(),
  shareViewer: async (el) => { const b = await getBlob(el.dataset.id); if (b) shareOrDownload(new File([b], el.dataset.name, { type: el.dataset.type || b.type })); },
  exportPerson: (el) => { UI.ex.person = el.dataset.id; UI.ex.ids = []; UI.ex.excl = []; UI.ex.open = []; tab('export'); },
  exPerson: (el) => { if (UI.ex.person !== el.dataset.id) { UI.ex.person = el.dataset.id; UI.ex.ids = []; UI.ex.excl = []; UI.ex.open = []; } render(); },
  exToggle: (el) => {
    const id = el.dataset.id; const vids = visitsOf(id).map((v) => v.id); const on = UI.ex.ids.includes(id);
    const partial = on && vids.some((x) => UI.ex.excl.includes(x));
    UI.ex.excl = UI.ex.excl.filter((x) => !vids.includes(x));
    if (!on) UI.ex.ids = [...UI.ex.ids, id]; else if (!partial) UI.ex.ids = UI.ex.ids.filter((x) => x !== id);
    render();
  },
  exExpand: (el) => { const id = el.dataset.id; UI.ex.open = UI.ex.open.includes(id) ? UI.ex.open.filter((x) => x !== id) : [...UI.ex.open, id]; render(); },
  exVisit: (el) => {
    const vid = el.dataset.id, aid = el.dataset.aid; const vids = visitsOf(aid).map((v) => v.id);
    if (!UI.ex.ids.includes(aid)) { UI.ex.ids = [...UI.ex.ids, aid]; UI.ex.excl = [...UI.ex.excl.filter((x) => !vids.includes(x)), ...vids.filter((x) => x !== vid)]; }
    else if (UI.ex.excl.includes(vid)) UI.ex.excl = UI.ex.excl.filter((x) => x !== vid);
    else {
      UI.ex.excl = [...UI.ex.excl, vid];
      if (vids.every((x) => UI.ex.excl.includes(x))) { UI.ex.ids = UI.ex.ids.filter((x) => x !== aid); UI.ex.excl = UI.ex.excl.filter((x) => !vids.includes(x)); }
    }
    render();
  },
  exAll: () => { const ids = ailmentsOf(UI.ex.person).map((a) => a.id); UI.ex.ids = UI.ex.ids.length === ids.length ? [] : ids; UI.ex.excl = []; render(); },
  exVoice: () => { UI.ex.voice = !UI.ex.voice; render(); },
  shareText: async () => { const t = buildExport().text; try { if (navigator.share) await navigator.share({ text: t }); else copyText(t); } catch (e) { if (e.name !== 'AbortError') copyText(t); } },
  copyText: () => copyText(buildExport().text),
  saveTxt: () => { const p = personOf(UI.ex.person); shareOrDownload(new File([buildExport().text], `${safeName(p?.name || 'Medical')} summary ${today()}.txt`, { type: 'text/plain' })); },
  shareFiles: async () => {
    const out = buildExport(); const files = [];
    for (const f of out.files) { const b = await getBlob(f.id); if (b) files.push(new File([b], f.name, { type: f.type || b.type })); }
    if (!files.length) return toast('No files to share');
    try {
      if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); return; }
    } catch (e) { if (e.name === 'AbortError') return; toast('Sharing failed. Try fewer files at once.'); return; }
    for (const f of files) await shareOrDownload(f);
  },
  newRefill: (el) => {
    const aid = el.dataset.id; const last = refillsOf(aid).slice(-1)[0]; const lv = visitsOf(aid).slice(-1)[0];
    const src = ((last?.meds?.length ? last.meds : lv?.meds) || []).map((m) => ({ name: m.name, qty: m.qty || '', cost: m.cost ? String(m.cost) : '' }));
    openModal('refill', { ailmentId: aid, date: today(), meds: src.length ? src : [{ name: '', qty: '', cost: '' }], note: '', prefilled: src.length > 0 });
  },
  editRefill: (el) => { const r = S.refills.find((x) => x.id === el.dataset.id); if (r) openModal('refill', { ...r, meds: (r.meds || []).map((m) => ({ ...m, qty: m.qty || '', cost: m.cost ? String(m.cost) : '' })) }); },
  rAddMed: () => { UI.modal.data.meds.push({ name: '', qty: '', cost: '' }); renderModal(); },
  rDelMed: (el) => { const ms = UI.modal.data.meds; ms.splice(+el.dataset.i, 1); if (!ms.length) ms.push({ name: '', qty: '', cost: '' }); renderModal(); },
  mSaveRefill: async () => {
    const d = UI.modal.data; if (!d.date) return toast('Please pick a date');
    const meds = d.meds.filter((m) => (m.name || '').trim()).map((m) => ({ name: m.name.trim(), qty: String(m.qty || '').trim(), cost: num(m.cost) }));
    if (!meds.length) return toast('Add at least one medicine');
    const r = { id: d.id || uid(), ailmentId: d.ailmentId, date: d.date, meds, note: (d.note || '').trim(), created: d.created || Date.now(), updated: Date.now() };
    const i = S.refills.findIndex((x) => x.id === r.id); if (i >= 0) S.refills[i] = r; else S.refills.push(r);
    await save(); closeModal(); render(); toast('Restock saved');
  },
  mDeleteRefill: async () => { if (!confirm('Delete this restock?')) return; S.refills = S.refills.filter((x) => x.id !== UI.modal.data.id); await save(); closeModal(); render(); },
  refillsAll: (el) => { UI.showAllRefills[el.dataset.id] = !UI.showAllRefills[el.dataset.id]; render(); },
  exRefills: () => { UI.ex.refills = !UI.ex.refills; render(); },
  insTab: (el) => { UI.ins.tab = el.dataset.v; render(); },
  insRange: () => { UI.ins.range = UI.ins.range === 6 ? 12 : 6; render(); },
  bpPerson: (el) => { UI.ins.bpPerson = el.dataset.id; render(); },
  newReading: () => openModal('reading', { personId: UI.ins.bpPerson, date: today(), time: nowTime(), sys: '', dia: '' }),
  mSaveReading: async () => {
    const d = UI.modal.data; const sys = Math.round(num(d.sys)), dia = Math.round(num(d.dia));
    if (!d.date) return toast('Please pick a date');
    if (sys < 60 || sys > 260 || dia < 30 || dia > 160) return toast('Check the numbers (e.g. 120 and 80)');
    if (dia >= sys) return toast('The upper number should be bigger than the lower one');
    S.readings.push({ id: uid(), personId: d.personId, date: d.date, time: d.time || '', sys, dia, created: Date.now() });
    await save(); closeModal(); render(); toast('Reading saved');
  },
  delReading: async (el) => { if (!confirm('Delete this reading?')) return; S.readings = S.readings.filter((r) => r.id !== el.dataset.id); await save(); render(); },
  sugarTab: (el) => { UI.ins.sugarTab = el.dataset.v; render(); },
  newSugar: () => { const t = UI.ins.sugarTab; openModal('sugar', { personId: UI.ins.bpPerson, kind: t === 'avg' || t === 'hba1c' ? 'fasting' : t, date: today(), time: nowTime(), value: '' }); setTimeout(() => $('#m-sval')?.focus(), 60); },
  mSugarKind: (el) => { UI.modal.data.kind = el.dataset.v; renderModal(); },
  mSaveSugar: async () => {
    const d = UI.modal.data; const v = num(d.value);
    if (!d.date) return toast('Please pick a date');
    if (d.kind === 'hba1c' ? (v < 3 || v > 20) : (v < 20 || v > 700)) return toast(d.kind === 'hba1c' ? 'HbA1c is usually between 4 and 15 %' : 'Check the number (mg/dL)');
    S.sugar.push({ id: uid(), personId: d.personId, kind: d.kind, date: d.date, time: d.time || '', value: d.kind === 'hba1c' ? Math.round(v * 10) / 10 : Math.round(v), created: Date.now() });
    if (!['avg', 'hba1c'].includes(UI.ins.sugarTab)) UI.ins.sugarTab = d.kind === 'random' ? 'avg' : d.kind;
    await save(); closeModal(); render(); toast('Reading saved');
  },
  delSugar: async (el) => { if (!confirm('Delete this reading?')) return; S.sugar = S.sugar.filter((r) => r.id !== el.dataset.id); await save(); render(); },
  syncOn: () => withToken(async () => {
    setSyncMsg('Checking your Google Drive…');
    const { wrap } = await readRemote(await listFiles());
    SY.remoteWrap = wrap; setSyncMsg('');
    openModal('syncpw', { mode: wrap ? 'enter' : 'create', pw: '', pw2: '' });
  }),
  mSyncPw: async () => {
    const d = UI.modal.data; const pw = d.pw || '';
    if (d.mode === 'create') {
      if (pw.length < 8) return toast('Use at least 8 characters');
      if (pw !== d.pw2) return toast('The two passwords don’t match');
    } else if (!pw) return toast('Enter the password');
    toast('Unlocking…');
    const w = SY.remoteWrap;
    const salt = d.mode === 'create' ? abToB64(crypto.getRandomValues(new Uint8Array(16)).buffer) : w.salt;
    const iter = d.mode === 'create' ? 310000 : (w.iter || 310000);
    const key = await deriveKey(pw, salt, iter);
    if (d.mode === 'enter') { try { await dec(key, b64ToAb(w.data)); } catch (e) { return toast('Wrong sync password'); } }
    SY.key = key; SY.cfg = { on: true, salt, iter, consented: true, lastSync: 0 };
    await DB.put('kv', 'syncCfg', SY.cfg);
    try { await DB.put('kv', 'syncKey', key); } catch (e) { /* key stays in memory for this session */ }
    closeModal(); render();
    await runSync(); render(); toast(SY.msg || 'Sync is on');
  },
  syncNow: () => {
    if (!SY.cfg?.on) return tab('settings');
    if (!SY.key) return toast('Turn sync off and on again on this device');
    return withToken(async () => { await runSync(); toast(SY.msg || 'Synced'); });
  },
  syncOff: async () => {
    if (!confirm('Turn off sync on this device?\n\nYour records stay on this phone and in Google Drive.')) return;
    await syncForget(); render(); toast('Sync turned off here');
  },
  syncDeleteCloud: () => withToken(async () => {
    if (!confirm('Delete the encrypted copy from Google Drive?\n\nRecords on this device are kept. Other devices will stop syncing.')) return;
    for (const f of await listFiles()) await deleteFile(f.id);
    await syncForget(); render(); toast('Cloud copy deleted');
  }),
  backup: () => doBackup(),
  restore: () => document.getElementById('file-backup').click(),
  eraseAll: async () => {
    if (!confirm(`Erase ALL people, records, files and readings from this device?${SY.cfg?.on ? '\n\nSync will be turned off on this device. Your Google Drive copy and other devices are NOT erased.' : ''}`)) return;
    if (!confirm('Are you sure? Make sure you have a backup. This cannot be undone.')) return;
    await wipeLocal(); UI.openVisit = {}; UI.ex = { person: null, ids: [], voice: false, refills: true, excl: [], open: [] }; tab('home'); toast('All data erased');
  }
};

/* ---------------- events ---------------- */
function setPath(path, value) {
  const parts = path.split('.'); let o = UI;
  for (let i = 0; i < parts.length - 1; i++) { o = o?.[parts[i]]; if (o == null) return; }
  o[parts[parts.length - 1]] = value;
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act]; if (!fn) return;
  if (el.dataset.act !== 'backdrop') ev.preventDefault();
  Promise.resolve(fn(el, ev)).catch((e) => { console.error(e); toast('Something went wrong'); });
});
function onBind(ev) {
  const el = ev.target; const path = el.dataset && el.dataset.bind; if (!path) return;
  setPath(path, el.value);
  if (path.startsWith('search.')) { const hb = $('#home-body'); if (hb) hb.innerHTML = homeBody(); }
  if (path.startsWith('draft.') && (path.endsWith('.cost') || path.endsWith('.qty') || path === 'draft.fee')) updateTotals();
  if (path.startsWith('modal.data.meds') && (path.endsWith('.cost') || path.endsWith('.qty'))) { const el2 = document.getElementById('r-total'); if (el2) el2.textContent = rs(UI.modal.data.meds.reduce((t, x) => t + lineCost(x), 0)); }
}
document.addEventListener('input', onBind);
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.id === 'file-pdf' || el.id === 'file-img') { const files = [...el.files]; el.value = ''; addFiles(files, el.id === 'file-img'); return; }
  if (el.id === 'file-backup') { const f = el.files[0]; el.value = ''; if (f) doRestore(f); return; }
  onBind(ev);
});
document.addEventListener('keydown', (ev) => {
  if (!UI.locked) { if (ev.key === 'Escape' && UI.modal) closeModal(); return; }
  if (/^[0-9]$/.test(ev.key)) pressKey(ev.key);
  else if (ev.key === 'Backspace') { UI.pinBuf = UI.pinBuf.slice(0, -1); render(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { UI.hiddenAt = Date.now(); return; }
  if (UI.pin && !UI.locked && UI.hiddenAt && Date.now() - UI.hiddenAt > 120000 && !REC.mr) lockApp();
  else if (!UI.locked && SY.cfg?.on && tokenOk() && Date.now() - (SY.cfg.lastSync || 0) > 60000) runSync();
});

/* Keep pop-up sheets above the iPhone keyboard: size them to the visible part of the screen. */
function syncViewport() {
  const vv = window.visualViewport; if (!vv) return;
  const r = document.documentElement.style;
  r.setProperty('--vvh', vv.height + 'px'); r.setProperty('--vvtop', vv.offsetTop + 'px');
}
if (window.visualViewport) { visualViewport.addEventListener('resize', syncViewport); visualViewport.addEventListener('scroll', syncViewport); syncViewport(); }
document.addEventListener('focusin', (ev) => {
  const el = ev.target; if (!el.matches || !el.matches('input, textarea, select')) return;
  setTimeout(() => { syncViewport(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 350);
});
document.addEventListener('focusout', () => { setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input, textarea, select')) { window.scrollTo(0, 0); syncViewport(); } }, 100); });

/* ---------------- start ---------------- */
(async function init() {
  try {
    await DB.open();
    const st = await DB.get('kv', 'state'); if (st) S = normalize(st);
    UI.pin = (await DB.get('kv', 'pin')) || null;
    const hs = await DB.get('kv', 'hashes'); if (hs) HASH = hs; else rebuildHashes();
    SY.cfg = (await DB.get('kv', 'syncCfg')) || null;
    SY.dirty = !!(SY.cfg?.on && (await DB.get('kv', 'syncDirty')));
    try { SY.key = (await DB.get('kv', 'syncKey')) || null; } catch (e) { SY.key = null; }
    const tk = await DB.get('kv', 'syncToken'); if (tk && tk.exp > Date.now()) { SY.token = tk.t; SY.exp = tk.exp; }
  } catch (e) {
    $('#app').innerHTML = '<main class="screen"><h1>Storage unavailable</h1><p class="sub">This browser blocked storage (private browsing?). Open the app normally from your home screen.</p></main>';
    return;
  }
  UI.pinMode = UI.pin ? 'unlock' : 'create';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
