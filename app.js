'use strict';
/* Health Records — offline web app. All data stays on this device (IndexedDB). */
const APP_VERSION = '1.0';

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
  { c: '#5B3DF5', bg: '#EEEAFE', fg: '#5B3DF5', name: 'Purple' },
  { c: '#4FA3F7', bg: '#E2F0FE', fg: '#1565C0', name: 'Blue' },
  { c: '#111114', bg: '#111114', fg: '#FFFFFF', name: 'Black' },
  { c: '#F2B705', bg: '#FEF3C7', fg: '#92400E', name: 'Yellow' },
  { c: '#E5484D', bg: '#FDECEC', fg: '#B42318', name: 'Red' },
  { c: '#30A46C', bg: '#E6F6EC', fg: '#1E7A4D', name: 'Green' }
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

let S = { people: [], ailments: [], visits: [], readings: [], meta: {} };
function normalize(st) {
  return {
    people: Array.isArray(st?.people) ? st.people : [],
    ailments: Array.isArray(st?.ailments) ? st.ailments : [],
    visits: Array.isArray(st?.visits) ? st.visits : [],
    readings: Array.isArray(st?.readings) ? st.readings : [],
    meta: st?.meta && typeof st.meta === 'object' ? st.meta : {}
  };
}
async function save() {
  try { await DB.put('kv', 'state', S); }
  catch (e) { toast('Could not save. Your phone may be out of storage.'); throw e; }
}

/* ---------------- data queries ---------------- */
const personOf = (id) => S.people.find((p) => p.id === id);
const ailmentOf = (id) => S.ailments.find((a) => a.id === id);
const ailmentsOf = (pid) => S.ailments.filter((a) => a.personId === pid);
const byDateAsc = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0);
const visitsOf = (aid) => S.visits.filter((v) => v.ailmentId === aid).sort(byDateAsc);
const medsCost = (v) => (v.meds || []).reduce((s, m) => s + num(m.cost), 0);
const visitTotal = (v) => num(v.fee) + medsCost(v);
const ailmentTotal = (aid) => visitsOf(aid).reduce((s, v) => s + visitTotal(v), 0);
const lastDate = (a) => visitsOf(a.id).reduce((d, v) => (v.date > d ? v.date : d), a.start || '');
// "visit 3" tag for export names / badges: taken from a name like "Visit-3", else the visit's position by date
const visitNo = (v, pos) => { const m = /^visit[\s-]*(\d+)$/i.exec((v.name || '').trim()); return m ? m[1] : String(pos); };
const fileCount = (aid) => visitsOf(aid).reduce((s, v) => s + (v.files || []).length + (v.voice || []).length, 0);

/* ---------------- UI state & navigation ---------------- */
const UI = {
  locked: true, pin: null, pinMode: 'create', pinBuf: '', pinFirst: '', pinMsg: '', fails: 0, lockUntil: 0, changing: false,
  search: { person: 'all', q: '' },
  openVisit: {},
  draft: null,
  modal: null,
  ex: { person: null, ids: [], voice: false },
  ins: { tab: 'all', range: 6, bpPerson: null },
  hiddenAt: 0
};
const stack = [{ name: 'home' }];
const cur = () => stack[stack.length - 1];
function go(r) { stack.push(r); render(); window.scrollTo(0, 0); }
function back() { if (stack.length > 1) stack.pop(); render(); window.scrollTo(0, 0); }
function tab(name) { stack.length = 0; stack.push({ name }); render(); window.scrollTo(0, 0); }

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

const avatar = (p, size = 44) => { const c = pal(p.color); return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${c.bg};color:${c.fg}">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</div>`; };
const typeChip = (t) => t === 'chronic' ? '<span class="chip chronic">Chronic</span>' : '<span class="chip acute">Acute</span>';

function navBar(active) {
  const items = [['home', 'Home', ICON.home], ['export', 'Export', ICON.upload], ['insights', 'Insights', ICON.chart], ['settings', 'Backup', ICON.cloud]];
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
        <button class="icon-btn" data-act="lockNow" aria-label="Lock app">${ICON.lock}</button>
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
    </main>
    <button class="bottom-btn" data-act="newVisit" data-id="${a.id}">${ICON.plus} Add visit</button>`;
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
        <div class="field"><label class="flabel" for="v-name">Visit name</label><input class="in" id="v-name" value="${esc(d.name)}" data-bind="draft.name" style="font-weight:600"></div>
        <div class="field"><label class="flabel" for="v-date">Date</label><input class="in" id="v-date" type="date" value="${esc(d.date)}" data-bind="draft.date"></div>
      </div>
      <div class="card pad col" style="gap:8px">
        <span class="flabel">Medicines</span>
        ${d.meds.map((m, i) => `<div class="med">
          <input class="in m-name" aria-label="Medicine ${i + 1} name" placeholder="Medicine name" value="${esc(m.name)}" data-bind="draft.meds.${i}.name">
          <button class="x-btn m-x" data-act="delMed" data-i="${i}" aria-label="Remove medicine ${i + 1}">${ICON.close}</button>
          <input class="in m-dur" aria-label="Medicine ${i + 1} duration" placeholder="Duration, e.g. 5 days" value="${esc(m.dur)}" data-bind="draft.meds.${i}.dur">
          <input class="in m-cost" aria-label="Medicine ${i + 1} cost in rupees" inputmode="decimal" placeholder="Cost ₹" value="${esc(m.cost)}" data-bind="draft.meds.${i}.cost"></div>`).join('')}
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
    if (!personOf(UI.ex.person)) { UI.ex.person = S.people[0].id; UI.ex.ids = []; }
    const p = personOf(UI.ex.person);
    const ails = ailmentsOf(p.id).sort((a, b) => (a.type === 'chronic' ? 0 : 1) - (b.type === 'chronic' ? 0 : 1) || lastDate(b).localeCompare(lastDate(a)));
    const out = buildExport();
    return `<main class="screen">
      <div class="col"><h1>Export</h1><p class="sub">Choose ailments to share</p></div>
      <div class="pills">${S.people.map((x) => `<button class="pill ${x.id === p.id ? 'on' : ''}" data-act="exPerson" data-id="${x.id}" aria-pressed="${x.id === p.id}">${esc(x.name)}</button>`).join('')}</div>
      ${!ails.length ? `<div class="card empty">${esc(p.name)} has no ailments yet.</div>` : `
      <div class="card list">
        ${ails.map((a) => { const on = UI.ex.ids.includes(a.id); return `<button class="list-item" data-act="exToggle" data-id="${a.id}" aria-pressed="${on}">
          <span class="check ${on ? 'on' : ''}">${on ? ICON.check : ''}</span>
          <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted" style="font-size:12px">${a.type === 'chronic' ? 'Chronic' : 'Acute'} · ${plural(visitsOf(a.id).length, 'visit')} · ${plural(fileCount(a.id), 'file')}</span></span></button>`; }).join('')}
      </div>
      <div class="row between">
        <button class="link-btn" data-act="exAll">${UI.ex.ids.length === ails.length ? 'Clear all' : 'Select all'}</button>
        <button class="list-item" style="width:auto;padding:8px 0" data-act="exVoice" aria-pressed="${UI.ex.voice}"><span class="check ${UI.ex.voice ? 'on' : ''}">${UI.ex.voice ? ICON.check : ''}</span><span class="small">Include voice notes</span></button>
      </div>
      <div class="card pad col" style="gap:10px">
        <span class="flabel">Preview</span>
        <pre class="preview">${esc(out.text)}</pre>
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
    return `<main class="screen">
      <div class="col"><h1>Backup</h1><p class="sub">Your records are stored only on this device.</p></div>
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

function homeBody() {
  const q = UI.search.q.trim().toLowerCase();
  const pf = UI.search.person;
  if (q || pf !== 'all') {
    const res = S.ailments.filter((a) => {
      if (pf !== 'all' && a.personId !== pf) return false;
      if (!q) return true;
      if (a.name.toLowerCase().includes(q)) return true;
      return visitsOf(a.id).some((v) => (v.meds || []).some((m) => (m.name || '').toLowerCase().includes(q)) || (v.desc || '').toLowerCase().includes(q));
    }).sort((a, b) => (a.type === 'chronic' ? 0 : 1) - (b.type === 'chronic' ? 0 : 1) || lastDate(b).localeCompare(lastDate(a)));
    return `<section class="col" style="gap:10px"><h2 class="label">${res.length ? plural(res.length, 'result') : 'No results'}</h2>
      ${res.length ? `<div class="card list">${res.map((a) => `<button class="list-item" data-act="openAilment" data-id="${a.id}">
        <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted">${esc(personOf(a.personId)?.name || '')} · ${fmtDate(lastDate(a)) || 'No date'}</span></span>${typeChip(a.type)}${ICON.chev}</button>`).join('')}</div>`
      : '<div class="card empty">Nothing matches. Try another word.</div>'}</section>`;
  }
  const recent = [...S.visits].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 3);
  return `<section class="col" style="gap:12px"><h2 class="label">People</h2>
    <div class="people">
      ${S.people.map((p) => { const ails = ailmentsOf(p.id); const ch = ails.filter((a) => a.type === 'chronic').length;
        return `<button class="person-card" data-act="openPerson" data-id="${p.id}">${avatar(p)}<span class="col" style="gap:2px"><span class="t17">${esc(p.name)}</span><span class="small muted">${plural(ails.length, 'ailment')}${ch ? ` · ${ch} chronic` : ''}</span></span></button>`; }).join('')}
      ${S.people.length < MAX_PEOPLE ? `<button class="add-card" data-act="newPerson"><span style="color:#5B3DF5;display:flex">${ICON.plus}</span>Add person</button>` : ''}
    </div></section>
    ${recent.length ? `<section class="col" style="gap:12px"><h2 class="label">Recently updated</h2><div class="card list">
      ${recent.map((v) => { const a = ailmentOf(v.ailmentId); if (!a) return ''; const p = personOf(a.personId);
        return `<button class="list-item" data-act="openAilment" data-id="${a.id}"><span style="width:10px;height:10px;border-radius:5px;flex:none;background:${a.type === 'chronic' ? '#D92D20' : '#1D4ED8'}"></span>
        <span class="col grow"><span class="t15">${esc(a.name)}</span><span class="small muted">${esc(p?.name || '')} · ${esc(v.name)}</span></span><span class="small muted">${fmtDate(v.date).slice(0, 6)}</span></button>`; }).join('')}
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
      <span class="vnum">V${visitNo(v, n)}</span>
      <span class="col grow" style="gap:2px"><span class="t15">${esc(v.name)}</span><span class="small muted">${fmtDate(v.date)}</span></span>
      <span class="t15" style="font-size:14px">${rs(visitTotal(v))}</span>
      ${I('<path d="m6 9 6 6 6-6"/>', `stroke-width="2" width="18" height="18" style="color:#6B6B73;flex:none;transform:${open ? 'rotate(180deg)' : 'none'}"`)}
    </button>
    ${open ? `<div class="visit-body">
      <div class="bill">
        ${(v.meds || []).map((m) => `<div class="bill-row"><span class="col" style="gap:1px;min-width:0"><span class="t15" style="font-size:14px">${esc(m.name)}</span>${m.dur ? `<span class="small muted" style="font-size:12px">${esc(m.dur)}</span>` : ''}</span><span style="font-size:14px;font-weight:500">${rs(num(m.cost))}</span></div>`).join('')}
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
    ${bpCard()}`;
}

function bpCard() {
  if (!S.people.length) return '';
  if (!personOf(UI.ins.bpPerson)) UI.ins.bpPerson = S.people[0].id;
  const p = personOf(UI.ins.bpPerson);
  const all = S.readings.filter((r) => r.personId === p.id).sort(byDateAsc);
  const pts = all.slice(-12);
  const last = all[all.length - 1];
  let chart = '<div class="empty" style="padding:12px">No readings yet. Tap <b>Add reading</b>.</div>';
  if (pts.length) {
    const W = 300, H = 140, px = 14, pt = 10, pb = 10;
    const lo = Math.min(60, Math.min(...pts.map((r) => r.dia)) - 5), hi = Math.max(160, Math.max(...pts.map((r) => r.sys)) + 5);
    const X = (i) => pts.length === 1 ? W / 2 : px + i * (W - 2 * px) / (pts.length - 1);
    const Y = (v) => pt + (hi - v) * (H - pt - pb) / (hi - lo);
    const line = (key) => pts.map((r, i) => `${X(i).toFixed(1)},${Y(r[key]).toFixed(1)}`).join(' ');
    const dots = (key, c) => pts.map((r, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(r[key]).toFixed(1)}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');
    chart = `<div class="bp-wrap" role="img" aria-label="Blood pressure chart for ${esc(p.name)}">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <line x1="0" x2="${W}" y1="${Y(120)}" y2="${Y(120)}" stroke="#E2E2E8" stroke-dasharray="4 4"/> <text x="2" y="${Y(120) - 4}" font-size="9" fill="#8A8A93">120</text>
        <line x1="0" x2="${W}" y1="${Y(80)}" y2="${Y(80)}" stroke="#E2E2E8" stroke-dasharray="4 4"/> <text x="2" y="${Y(80) - 4}" font-size="9" fill="#8A8A93">80</text>
        <polyline points="${line('sys')}" fill="none" stroke="#D92D20" stroke-width="2.5" stroke-linejoin="round"/>
        <polyline points="${line('dia')}" fill="none" stroke="#1565C0" stroke-width="2.5" stroke-linejoin="round"/>
        ${dots('sys', '#D92D20')}${dots('dia', '#1565C0')}
      </svg></div>
      <div class="row between small muted" style="font-size:11px"><span>${fmtDate(pts[0].date)}</span><span>${pts.length > 1 ? fmtDate(pts[pts.length - 1].date) : ''}</span></div>`;
  }
  const recent = all.slice(-5).reverse();
  return `<section class="card pad col" style="gap:12px;padding:16px">
    <div class="row between" style="align-items:flex-start">
      <div class="col"><h2 class="flabel" style="margin:0;font-size:13px">Blood pressure</h2>
        ${last ? `<span style="font-size:24px;font-weight:700">${last.sys}/${last.dia} <span class="small muted" style="font-weight:500">mmHg · ${fmtDate(last.date).slice(0, 6)}</span></span>` : '<span class="small muted">—</span>'}</div>
    </div>
    <div class="pills">${S.people.map((x) => `<button class="pill ${x.id === p.id ? 'on' : ''}" style="height:34px;padding:0 12px;font-size:13px" data-act="bpPerson" data-id="${x.id}" aria-pressed="${x.id === p.id}">${esc(x.name)}</button>`).join('')}</div>
    ${chart}
    <div class="row between">
      <div class="key"><span><i style="background:#D92D20"></i>Systolic</span><span><i style="background:#1565C0"></i>Diastolic</span></div>
      <button class="btn dark" style="flex:none;height:40px;font-size:13px;padding:0 14px" data-act="newReading">${ICON.plus} Add reading</button>
    </div>
    ${recent.length ? `<div class="list" style="border-top:1px solid #EFEFF3">${recent.map((r) => `<div class="list-item" style="padding:10px 0"><span class="grow small">${fmtDate(r.date)}</span><b class="small">${r.sys}/${r.dia}</b><button class="x-btn" data-act="delReading" data-id="${r.id}" aria-label="Delete reading from ${fmtDate(r.date)}">${ICON.trash}</button></div>`).join('')}</div>` : ''}
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
  } else if (m.kind === 'reading') {
    body = `<h2>Add BP reading</h2><p class="sub" style="margin-top:-8px">${esc(personOf(d.personId)?.name || '')}</p>
      <div class="field"><label class="flabel" for="m-rdate">Date</label><input class="in" id="m-rdate" type="date" value="${esc(d.date)}" data-bind="modal.data.date"></div>
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
      const n = visitNo(v, i + 1);
      L.push(`• ${v.name} — ${fmtDate(v.date)}`);
      for (const m of v.meds || []) L.push(`   - ${m.name}${m.dur ? ` (${m.dur})` : ''}${num(m.cost) ? ` — ${rs(num(m.cost))}` : ''}`);
      if (num(v.fee)) L.push(`   Doctor fee: ${rs(num(v.fee))}`);
      if (visitTotal(v)) L.push(`   Visit total: ${rs(visitTotal(v))}`);
      if (v.desc) L.push(`   Notes: ${v.desc.replace(/\n+/g, ' ')}`);
      const names = [];
      (v.files || []).forEach((f, j) => { const name = `${safeName(a.name)} – visit ${n}-${letter(j)}.${extOf(f.type, f.name)}`; files.push({ id: f.id, name, type: f.type }); names.push(name); });
      if (UI.ex.voice) (v.voice || []).forEach((nt, j) => { const name = `${safeName(a.name)} – visit ${n} voice-${letter(j)}.${extOf(nt.type)}`; files.push({ id: nt.id, name, type: nt.type }); names.push(name); });
      if (names.length) L.push(`   Attached: ${names.join(', ')}`);
      grand += visitTotal(v);
    });
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
  if (!confirm(`Replace ALL records on this device with the backup from ${when}?\n\nThis cannot be undone.`)) return;
  try {
    await DB.clear('blobs');
    for (const b of data.blobs || []) await DB.put('blobs', b.id, { type: b.type, data: b64ToAb(b.data) });
    S = normalize(data.state); await save();
    UI.openVisit = {}; UI.ex = { person: null, ids: [], voice: false }; UI.ins.bpPerson = null;
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

/* ---------------- actions ---------------- */
function startDraft(v, aid) {
  const isNew = !v;
  UI.draft = isNew
    ? { id: uid(), ailmentId: aid, isNew, name: 'Visit-' + (visitsOf(aid).length + 1), date: today(), meds: [{ name: '', dur: '', cost: '' }], fee: '', desc: '', files: [], voice: [], added: [], removed: [], created: Date.now() }
    : { ...JSON.parse(JSON.stringify(v)), isNew, added: [], removed: [], meds: (v.meds || []).map((m) => ({ ...m, cost: m.cost === 0 || m.cost === '' ? '' : String(m.cost) })), fee: v.fee ? String(v.fee) : '' };
  if (!UI.draft.meds.length) UI.draft.meds.push({ name: '', dur: '', cost: '' });
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
    id: d.id, ailmentId: d.ailmentId, name: (d.name || '').trim() || 'Visit', date: d.date,
    meds: d.meds.filter((m) => (m.name || '').trim()).map((m) => ({ name: m.name.trim(), dur: (m.dur || '').trim(), cost: num(m.cost) })),
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
    if (!confirm('Forgot your PIN?\n\nThe only way to reset it is to ERASE all records on this device. You can restore them afterwards from a backup file.')) return;
    if (!confirm('Erase everything and set a new PIN?')) return;
    await DB.clear('blobs'); S = normalize({}); await save(); await DB.del('kv', 'pin'); UI.pin = null; UI.pinMode = 'create'; UI.pinMsg = ''; stack.length = 1; stack[0] = { name: 'home' }; render();
  },
  cancelPinChange: () => { UI.changing = false; UI.pinMode = 'unlock'; UI.pinMsg = ''; UI.pinBuf = ''; UI.locked = false; render(); },
  changePin: () => { UI.changing = true; UI.locked = true; UI.pinMode = 'verify'; UI.pinBuf = ''; UI.pinMsg = ''; render(); },
  lockNow: () => lockApp(),
  tab: (el) => tab(el.dataset.tab),
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
    S.visits = S.visits.filter((v) => v.ailmentId !== a.id); S.ailments = S.ailments.filter((x) => x.id !== a.id);
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
    if (!confirm(`Delete ${v.name} (${fmtDate(v.date)}) with its files and voice notes?`)) return;
    await deleteBlobsOfVisits([v]); S.visits = S.visits.filter((x) => x.id !== v.id); await save(); stopAudio(); render(); toast('Visit deleted');
  },
  cancelVisit: () => {
    const d = UI.draft;
    const dirty = d && (d.added.length || d.removed.length || (d.isNew && (d.desc || d.fee || d.meds.some((m) => m.name))));
    if (dirty && !confirm('Discard changes to this visit?')) return;
    cancelDraft();
  },
  saveVisit: () => saveDraft(),
  addMed: () => { UI.draft.meds.push({ name: '', dur: '', cost: '' }); render(); const ins = document.querySelectorAll('.med .m-name'); ins[ins.length - 1]?.focus(); },
  delMed: (el) => { UI.draft.meds.splice(+el.dataset.i, 1); if (!UI.draft.meds.length) UI.draft.meds.push({ name: '', dur: '', cost: '' }); render(); },
  delFile: (el) => { const d = UI.draft; const [f] = d.files.splice(+el.dataset.i, 1); if (f) { if (d.added.includes(f.id)) { d.added = d.added.filter((x) => x !== f.id); delBlobs([f.id]); } else d.removed.push(f.id); } render(); },
  delVoice: (el) => { const d = UI.draft; const [n] = d.voice.splice(+el.dataset.i, 1); if (n) { if (AUD.id === n.id) stopAudio(); if (d.added.includes(n.id)) { d.added = d.added.filter((x) => x !== n.id); delBlobs([n.id]); } else d.removed.push(n.id); } render(); },
  pick: (el) => document.getElementById(el.dataset.input).click(),
  rec: () => toggleRec(),
  playVoice: (el) => playVoice(el.dataset.id),
  openFile: (el) => openFile(el.dataset.id, el.dataset.name, el.dataset.type),
  closeViewer: () => closeViewer(),
  shareViewer: async (el) => { const b = await getBlob(el.dataset.id); if (b) shareOrDownload(new File([b], el.dataset.name, { type: el.dataset.type || b.type })); },
  exportPerson: (el) => { UI.ex.person = el.dataset.id; UI.ex.ids = []; tab('export'); },
  exPerson: (el) => { if (UI.ex.person !== el.dataset.id) { UI.ex.person = el.dataset.id; UI.ex.ids = []; } render(); },
  exToggle: (el) => { const id = el.dataset.id; UI.ex.ids = UI.ex.ids.includes(id) ? UI.ex.ids.filter((x) => x !== id) : [...UI.ex.ids, id]; render(); },
  exAll: () => { const ids = ailmentsOf(UI.ex.person).map((a) => a.id); UI.ex.ids = UI.ex.ids.length === ids.length ? [] : ids; render(); },
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
  insTab: (el) => { UI.ins.tab = el.dataset.v; render(); },
  insRange: () => { UI.ins.range = UI.ins.range === 6 ? 12 : 6; render(); },
  bpPerson: (el) => { UI.ins.bpPerson = el.dataset.id; render(); },
  newReading: () => openModal('reading', { personId: UI.ins.bpPerson, date: today(), sys: '', dia: '' }),
  mSaveReading: async () => {
    const d = UI.modal.data; const sys = Math.round(num(d.sys)), dia = Math.round(num(d.dia));
    if (!d.date) return toast('Please pick a date');
    if (sys < 60 || sys > 260 || dia < 30 || dia > 160) return toast('Check the numbers (e.g. 120 and 80)');
    if (dia >= sys) return toast('The upper number should be bigger than the lower one');
    S.readings.push({ id: uid(), personId: d.personId, date: d.date, sys, dia, created: Date.now() });
    await save(); closeModal(); render(); toast('Reading saved');
  },
  delReading: async (el) => { if (!confirm('Delete this reading?')) return; S.readings = S.readings.filter((r) => r.id !== el.dataset.id); await save(); render(); },
  backup: () => doBackup(),
  restore: () => document.getElementById('file-backup').click(),
  eraseAll: async () => {
    if (!confirm('Erase ALL people, records, files and readings from this device?')) return;
    if (!confirm('Are you sure? Make sure you have a backup. This cannot be undone.')) return;
    await DB.clear('blobs'); S = normalize({}); await save(); UI.openVisit = {}; UI.ex = { person: null, ids: [], voice: false }; tab('home'); toast('All data erased');
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
  if (path.startsWith('draft.') && (path.endsWith('.cost') || path === 'draft.fee')) updateTotals();
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
});

/* ---------------- start ---------------- */
(async function init() {
  try {
    await DB.open();
    const st = await DB.get('kv', 'state'); if (st) S = normalize(st);
    UI.pin = (await DB.get('kv', 'pin')) || null;
  } catch (e) {
    $('#app').innerHTML = '<main class="screen"><h1>Storage unavailable</h1><p class="sub">This browser blocked storage (private browsing?). Open the app normally from your home screen.</p></main>';
    return;
  }
  UI.pinMode = UI.pin ? 'unlock' : 'create';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
