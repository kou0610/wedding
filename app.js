/* ── Wedding Dashboard ── app.js ── */

const WEDDING_DATE = new Date('2027-04-24T16:30:00+09:00');

// ─────────────────────────────────────
//  ROUTER
// ─────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById(page);
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  location.hash = page;
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

window.addEventListener('hashchange', () => {
  navigate(location.hash.replace('#', '') || 'home');
});

// ─────────────────────────────────────
//  COUNTDOWN
// ─────────────────────────────────────
function tick() {
  const diff = WEDDING_DATE - new Date();
  if (diff <= 0) return;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  setText('cd-days',  pad(d));
  setText('cd-hours', pad(h));
  setText('cd-mins',  pad(m));
  setText('cd-secs',  pad(s));
}
setInterval(tick, 1000);
tick();

// ─────────────────────────────────────
//  FIREBASE / LOCALSTORAGE
// ─────────────────────────────────────
let _db = null, _storage = null;

function initFirebase(config) {
  firebase.initializeApp(config);
  _db      = firebase.database();
  _storage = firebase.storage();
  loadAll();
  hideLoading();
}

function initLocalFallback() {
  loadAll();
  hideLoading();
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (!el) return;
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 700);
}

function dbGet(key, cb) {
  if (_db) {
    _db.ref(key).on('value', snap => cb(snap.val() || {}));
  } else {
    cb(JSON.parse(localStorage.getItem(key) || '{}'));
  }
}

function dbSet(key, id, val) {
  if (_db) {
    _db.ref(`${key}/${id}`).set(val);
  } else {
    const d = JSON.parse(localStorage.getItem(key) || '{}');
    d[id] = val;
    localStorage.setItem(key, JSON.stringify(d));
    loadAll();
  }
}

function dbDel(key, id) {
  if (_db) {
    _db.ref(`${key}/${id}`).remove();
  } else {
    const d = JSON.parse(localStorage.getItem(key) || '{}');
    delete d[id];
    localStorage.setItem(key, JSON.stringify(d));
    loadAll();
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─────────────────────────────────────
//  TODO
// ─────────────────────────────────────
let todos = {};
const TODO_CATS      = ['会場', '衣装', '料理', '招待状', '演出', 'その他'];
const TODO_ASSIGNEES = ['弘', '凜', '二人'];

function loadTodos() {
  dbGet('todos', data => {
    todos = data;
    renderTodos();
    renderHomeStats();
  });
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!list) return;
  const fc = val('filter-todo-cat');
  const fa = val('filter-todo-assign');
  const fs = val('filter-todo-status');

  let items = Object.entries(todos);
  if (fc) items = items.filter(([, t]) => t.category  === fc);
  if (fa) items = items.filter(([, t]) => t.assignee  === fa);
  if (fs === 'done')    items = items.filter(([, t]) =>  t.done);
  if (fs === 'pending') items = items.filter(([, t]) => !t.done);

  items.sort(([, a], [, b]) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return a.dueDate ? -1 : b.dueDate ? 1 : 0;
  });

  if (!items.length) {
    list.innerHTML = emptyState('✓', 'タスクはありません');
    return;
  }

  list.innerHTML = items.map(([id, t]) => {
    const soon = t.dueDate && !t.done && (new Date(t.dueDate) - new Date()) < 7 * 86400000;
    return `
    <div class="todo-item ${t.done ? 'done' : ''}">
      <div class="todo-check ${t.done ? 'checked' : ''}" onclick="toggleTodo('${id}')"></div>
      <div class="todo-body">
        <div class="todo-title">${esc(t.title)}</div>
        <div class="todo-meta">
          ${t.category  ? `<span class="tag tag-cat">${esc(t.category)}</span>` : ''}
          ${t.assignee  ? `<span class="tag tag-assign">${esc(t.assignee)}</span>` : ''}
          ${t.dueDate   ? `<span class="tag tag-due ${soon ? 'soon' : ''}">📅 ${fmtDate(t.dueDate)}</span>` : ''}
        </div>
      </div>
      <div class="todo-actions">
        <button class="btn btn-ghost btn-sm" onclick="openTodoModal('${id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="delTodo('${id}')">削除</button>
      </div>
    </div>`;
  }).join('');
}

function toggleTodo(id) {
  const t = todos[id];
  if (t) dbSet('todos', id, { ...t, done: !t.done });
}

function delTodo(id) {
  if (confirm('このタスクを削除しますか？')) dbDel('todos', id);
}

function openTodoModal(id = null) {
  const t = id ? todos[id] : null;
  showModal('タスクを' + (id ? '編集' : '追加'), [
    { id: 'f-title',    label: 'タスク名', type: 'text',   value: t?.title    || '' },
    { id: 'f-cat',      label: 'カテゴリ', type: 'select', value: t?.category || '', opts: TODO_CATS },
    { id: 'f-assign',   label: '担当者',   type: 'select', value: t?.assignee || '', opts: TODO_ASSIGNEES },
    { id: 'f-due',      label: '期限',     type: 'date',   value: t?.dueDate  || '' },
  ], () => {
    const title = document.getElementById('f-title').value.trim();
    if (!title) return;
    dbSet('todos', id || genId(), {
      title,
      category:  document.getElementById('f-cat').value,
      assignee:  document.getElementById('f-assign').value,
      dueDate:   document.getElementById('f-due').value,
      done:      t?.done || false,
      createdAt: t?.createdAt || Date.now(),
    });
    closeModal();
  });
}

on('add-todo-btn', 'click', () => openTodoModal());
on('filter-todo-cat',    'change', renderTodos);
on('filter-todo-assign', 'change', renderTodos);
on('filter-todo-status', 'change', renderTodos);

// ─────────────────────────────────────
//  GUESTS
// ─────────────────────────────────────
let guests = {};
const GUEST_GROUPS  = ['学科同期（共通）', 'bestiee（弘）', 'GS（凜）', '家族（弘）', '家族（凜）', 'その他'];
const ATTEND_OPTS   = ['未確認', '出席', '欠席'];

function loadGuests() {
  dbGet('guests', data => {
    guests = data;
    renderGuests();
    renderGuestStats();
    renderHomeStats();
  });
}

function renderGuests() {
  const tbody = document.getElementById('guest-tbody');
  if (!tbody) return;
  const q  = (document.getElementById('guest-search')?.value || '').toLowerCase();
  const fg = val('filter-guest-group');
  const fa = val('filter-guest-attend');

  let items = Object.entries(guests);
  if (q)  items = items.filter(([, g]) => (g.name || '').toLowerCase().includes(q));
  if (fg) items = items.filter(([, g]) => g.group === fg);
  if (fa) items = items.filter(([, g]) => g.attendance === fa);

  items.sort(([, a], [, b]) =>
    (a.group || '').localeCompare(b.group || '') || (a.name || '').localeCompare(b.name || '')
  );

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted);font-family:'Cormorant Garamond',serif;font-style:italic">見つかりません</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(([id, g]) => {
    const ac = g.attendance === '出席' ? 'attend-yes' : g.attendance === '欠席' ? 'attend-no' : 'attend-pending';
    return `<tr>
      <td style="color:var(--cream)">${esc(g.name || '')}</td>
      <td><span class="tag tag-cat" style="font-size:9px">${esc(g.group || '')}</span></td>
      <td style="text-align:center"><span class="invite-dot ${g.invitationSent ? 'dot-sent' : 'dot-unsent'}" title="${g.invitationSent ? '送付済み' : '未送付'}"></span></td>
      <td><span class="attend-badge ${ac}">${esc(g.attendance || '未確認')}</span></td>
      <td style="font-size:12px">${esc(g.mealRestriction || '—')}</td>
      <td style="font-size:12px">${g.tableNumber ? 'Table ' + g.tableNumber : '—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openGuestModal('${id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="delGuest('${id}')">削除</button>
      </td>
    </tr>`;
  }).join('');
}

function renderGuestStats() {
  const all = Object.values(guests);
  setText('gs-total',     all.length);
  setText('gs-confirmed', all.filter(g => g.attendance === '出席').length);
  setText('gs-declined',  all.filter(g => g.attendance === '欠席').length);
  setText('gs-pending',   all.filter(g => !g.attendance || g.attendance === '未確認').length);
}

function delGuest(id) {
  if (confirm('このゲストを削除しますか？')) dbDel('guests', id);
}

function openGuestModal(id = null) {
  const g = id ? guests[id] : null;
  showModal('ゲストを' + (id ? '編集' : '追加'), [
    { id: 'g-name',   label: 'お名前',             type: 'text',   value: g?.name            || '' },
    { id: 'g-group',  label: 'グループ',           type: 'select', value: g?.group           || '', opts: GUEST_GROUPS },
    { id: 'g-invite', label: '招待状',             type: 'select', value: g?.invitationSent ? '送付済み' : '未送付', opts: ['未送付', '送付済み'] },
    { id: 'g-attend', label: '出欠',               type: 'select', value: g?.attendance      || '未確認', opts: ATTEND_OPTS },
    { id: 'g-meal',   label: '食事制限・アレルギー', type: 'text',   value: g?.mealRestriction || '' },
    { id: 'g-table',  label: 'テーブル番号',       type: 'number', value: g?.tableNumber     || '' },
  ], () => {
    const name = document.getElementById('g-name').value.trim();
    if (!name) return;
    dbSet('guests', id || genId(), {
      name,
      group:            document.getElementById('g-group').value,
      invitationSent:   document.getElementById('g-invite').value === '送付済み',
      attendance:       document.getElementById('g-attend').value,
      mealRestriction:  document.getElementById('g-meal').value.trim(),
      tableNumber:      document.getElementById('g-table').value || null,
      createdAt: g?.createdAt || Date.now(),
    });
    closeModal();
  });
}

on('add-guest-btn',        'click',  () => openGuestModal());
on('guest-search',         'input',  renderGuests);
on('filter-guest-group',   'change', renderGuests);
on('filter-guest-attend',  'change', renderGuests);

// ─────────────────────────────────────
//  DECISIONS
// ─────────────────────────────────────
let decisions = {};
const DEC_CATS = ['会場', '衣装', '料理', '演出', '写真・映像', 'その他'];

function loadDecisions() {
  dbGet('decisions', data => {
    decisions = data;
    renderDecisions();
  });
}

function renderDecisions() {
  const container = document.getElementById('decisions-grid');
  if (!container) return;

  const grouped = {};
  DEC_CATS.forEach(c => { grouped[c] = []; });
  Object.entries(decisions).forEach(([id, d]) => {
    const c = d.category || 'その他';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push([id, d]);
  });

  if (!Object.values(decisions).length) {
    container.innerHTML = `<div style="grid-column:span 2">${emptyState('📋', 'まだ決定事項はありません')}</div>`;
    return;
  }

  container.innerHTML = DEC_CATS.map(cat => `
    <div>
      <div class="decision-group-title">${cat}</div>
      ${grouped[cat].length
        ? grouped[cat]
            .sort(([, a], [, b]) => (b.decidedAt || '').localeCompare(a.decidedAt || ''))
            .map(([id, d]) => `
              <div class="decision-item">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
                  <div class="decision-title">${esc(d.title)}</div>
                  <div style="display:flex;gap:4px;flex-shrink:0">
                    <button class="btn btn-ghost btn-sm" onclick="openDecModal('${id}')">編集</button>
                    <button class="btn btn-danger btn-sm" onclick="delDec('${id}')">削除</button>
                  </div>
                </div>
                ${d.content  ? `<div class="decision-content">${esc(d.content)}</div>` : ''}
                ${d.decidedAt ? `<div class="decision-date">${fmtDate(d.decidedAt)}</div>` : ''}
              </div>`)
            .join('')
        : `<div style="color:var(--muted);font-size:12px;padding:6px 0">まだありません</div>`
      }
    </div>`).join('');
}

function delDec(id) {
  if (confirm('削除しますか？')) dbDel('decisions', id);
}

function openDecModal(id = null) {
  const d = id ? decisions[id] : null;
  showModal('決定事項を' + (id ? '編集' : '追加'), [
    { id: 'd-cat',     label: 'カテゴリ', type: 'select',   value: d?.category  || '', opts: DEC_CATS },
    { id: 'd-title',   label: 'タイトル', type: 'text',     value: d?.title     || '' },
    { id: 'd-content', label: '内容',     type: 'textarea', value: d?.content   || '' },
    { id: 'd-date',    label: '決定日',   type: 'date',     value: d?.decidedAt || today() },
  ], () => {
    const title = document.getElementById('d-title').value.trim();
    if (!title) return;
    dbSet('decisions', id || genId(), {
      category:  document.getElementById('d-cat').value,
      title,
      content:   document.getElementById('d-content').value.trim(),
      decidedAt: document.getElementById('d-date').value,
      createdAt: d?.createdAt || Date.now(),
    });
    closeModal();
  });
}

on('add-dec-btn', 'click', () => openDecModal());

// ─────────────────────────────────────
//  TIMELINE
// ─────────────────────────────────────
let timeline = {};

function loadTimeline() {
  dbGet('timeline', data => {
    timeline = data;
    renderTimeline();
  });
}

function renderTimeline() {
  const wrap = document.getElementById('timeline-wrap');
  if (!wrap) return;
  const items = Object.entries(timeline).sort(([, a], [, b]) =>
    (a.time || '').localeCompare(b.time || '')
  );
  if (!items.length) {
    wrap.innerHTML = emptyState('🕐', 'タイムラインを追加しましょう');
    return;
  }
  wrap.innerHTML = items.map(([id, t]) => `
    <div class="timeline-item">
      <div class="timeline-time">${esc(t.time || '')}</div>
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div class="timeline-event">${esc(t.event || '')}</div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="openTlModal('${id}')">編集</button>
            <button class="btn btn-danger btn-sm" onclick="delTl('${id}')">削除</button>
          </div>
        </div>
        ${t.note ? `<div class="timeline-note">${esc(t.note)}</div>` : ''}
      </div>
    </div>`).join('');
}

function delTl(id) {
  if (confirm('削除しますか？')) dbDel('timeline', id);
}

function openTlModal(id = null) {
  const t = id ? timeline[id] : null;
  showModal((id ? '編集' : 'タイムライン追加'), [
    { id: 'tl-time',  label: '時刻',     type: 'time',     value: t?.time  || '' },
    { id: 'tl-event', label: 'イベント', type: 'text',     value: t?.event || '' },
    { id: 'tl-note',  label: 'メモ',     type: 'textarea', value: t?.note  || '' },
  ], () => {
    const event = document.getElementById('tl-event').value.trim();
    if (!event) return;
    dbSet('timeline', id || genId(), {
      time:  document.getElementById('tl-time').value,
      event,
      note:  document.getElementById('tl-note').value.trim(),
      createdAt: t?.createdAt || Date.now(),
    });
    closeModal();
  });
}

on('add-tl-btn', 'click', () => openTlModal());

// ─────────────────────────────────────
//  PHOTOS
// ─────────────────────────────────────
let photos = {};
const PHOTO_CATS = ['ドレス', '装花', '会場', '料理', 'その他'];

function loadPhotos() {
  dbGet('photos', data => {
    photos = data;
    renderPhotos();
  });
}

function renderPhotos() {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  const fc = val('filter-photo-cat');
  let items = Object.entries(photos);
  if (fc) items = items.filter(([, p]) => p.category === fc);
  items.sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0));

  if (!items.length) {
    grid.innerHTML = emptyState('🖼', '写真を追加しましょう');
    return;
  }
  grid.innerHTML = items.map(([id, p]) => `
    <div class="photo-card">
      <img class="photo-img" src="${esc(p.url)}" alt="${esc(p.note || '')}">
      <div class="photo-info">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="photo-cat">${esc(p.category || '')}</div>
          <button class="btn btn-danger btn-sm" onclick="delPhoto('${id}')">削除</button>
        </div>
        ${p.note ? `<div class="photo-note">${esc(p.note)}</div>` : ''}
      </div>
    </div>`).join('');
}

function delPhoto(id) {
  if (confirm('削除しますか？')) dbDel('photos', id);
}

on('filter-photo-cat', 'change', renderPhotos);

on('photo-upload', 'change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const cat  = val('photo-cat-select') || 'その他';
  const note = document.getElementById('photo-note-input')?.value || '';

  if (_storage) {
    const ref = _storage.ref(`photos/${genId()}_${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    dbSet('photos', genId(), { url, category: cat, note, createdAt: Date.now() });
  } else {
    const reader = new FileReader();
    reader.onload = ev => dbSet('photos', genId(), { url: ev.target.result, category: cat, note, createdAt: Date.now() });
    reader.readAsDataURL(file);
  }
  e.target.value = '';
  if (document.getElementById('photo-note-input')) document.getElementById('photo-note-input').value = '';
});

// ─────────────────────────────────────
//  HOME STATS
// ─────────────────────────────────────
function renderHomeStats() {
  const tArr = Object.values(todos);
  const gArr = Object.values(guests);
  setText('home-todo-count',      `${tArr.filter(t => t.done).length}/${tArr.length}`);
  setText('home-guest-count',     gArr.length);
  setText('home-confirmed-count', gArr.filter(g => g.attendance === '出席').length);
}

// ─────────────────────────────────────
//  MODAL ENGINE
// ─────────────────────────────────────
let _onSave = null;

function showModal(title, fields, onSave) {
  _onSave = onSave;
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-title">${title}</div>
    ${fields.map(f => {
      if (f.type === 'select') {
        return `<div class="form-group">
          <label class="form-label">${f.label}</label>
          <select id="${f.id}" class="form-select">
            ${(f.opts || []).map(o => `<option value="${esc(o)}" ${o === f.value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
          </select></div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="form-group">
          <label class="form-label">${f.label}</label>
          <textarea id="${f.id}" class="form-textarea">${esc(f.value)}</textarea></div>`;
      }
      return `<div class="form-group">
        <label class="form-label">${f.label}</label>
        <input id="${f.id}" type="${f.type}" class="form-input" value="${esc(f.value)}"></div>`;
    }).join('')}
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-gold"  onclick="_onSave && _onSave()">保存</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  _onSave = null;
}

document.getElementById('modal-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ─────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────
function loadAll() {
  loadTodos();
  loadGuests();
  loadDecisions();
  loadTimeline();
  loadPhotos();
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function val(id) {
  return document.getElementById(id)?.value || '';
}

function on(id, ev, fn) {
  document.getElementById(id)?.addEventListener(ev, fn);
}

function pad(n) { return String(n).padStart(2, '0'); }

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

// ─────────────────────────────────────
//  INIT
// ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  navigate(location.hash.replace('#', '') || 'home');
});
