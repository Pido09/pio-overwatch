/* PIO Overwatch · data.js · loaded in order by index.html (core, views, events, documents, data, app). */
/* ---------- Settings in tabs instead of one long page ---------- */
var SET_TABS = [['rules', 'Office rules'], ['holidays', 'Holidays'], ['tev', 'TEV forms'], ['backup', 'Backup']];
(function(){
  var V = viewSettings;
  viewSettings = function(){
    var v = V(), cur = S.setTab || 'rules', b = v.body, re = /<(section|form) class="panel /g, idx = [], m;
    while ((m = re.exec(b))) idx.push(m.index);
    if (!idx.length) return v;
    var out = b.slice(0, idx[0]);
    idx.forEach(function(st, i){
      var seg = b.slice(st, i + 1 < idx.length ? idx[i + 1] : b.length);
      var tab = /data-form="settings"/.test(seg) ? 'rules' : /data-form="tevSetup"/.test(seg) ? 'tev' : /data-form="holiday"/.test(seg) ? 'holidays' : /exportJson|Backup/.test(seg) ? 'backup' : 'rules';
      out += seg.replace(/^<(section|form) class="panel span-6/, '<$1 class="panel span-12').replace(/^<(section|form) /, '<$1 data-tab="' + tab + '" ');
    });
    v.body = out.replace('<div class="grid">', '<div class="grid settabs st-' + cur + '"><div class="tabs span-12" role="group" aria-label="Settings sections">' +
      SET_TABS.map(function(t){ return '<button data-act="setTab" data-t="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>');
    return v;
  };
})();
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="setTab"]'); if (!t) return; S.setTab = t.dataset.t; render(); });
(function(){
  var st = document.createElement('style');
  st.textContent = '.settabs>[data-tab]{display:none}' + SET_TABS.map(function(t){ return '.settabs.st-' + t[0] + '>[data-tab=' + t[0] + ']{display:block}'; }).join('') + '.settabs>.tabs{justify-self:start;width:max-content;max-width:100%;overflow-x:auto}';
  document.head.appendChild(st);
})();

/* =====================================================================
   Follow-up: "Since your last visit" and how long things have waited
   ===================================================================== */
var SEEN = { prev: null, key: null };
function seenKey(){ return S.me ? 'pio_seen_' + S.me.username : null; }
function seenStart(){
  var k = seenKey(); if (!k || SEEN.key === k) return;
  SEEN.key = k;
  // first time on this device: show the last 3 days
  SEEN.prev = lGet(k) || new Date(Date.now() - 3 * 864e5).toISOString();
}
function seenMark(){ var k = seenKey(); if (k) lSet(k, new Date().toISOString()); }
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') seenMark(); });
window.addEventListener('pagehide', seenMark);

function daysSince(iso){ if (!iso) return 0; var a = pd(String(iso).slice(0, 10)), b = pd(today()); return Math.max(0, Math.round((b - a) / 864e5)); }
/* A small tag that turns amber, then red, as an item waits. The day count is always written, so colour is never the only signal. */
function ageTag(iso, warn, bad, label){
  var d = daysSince(iso); if (d < 1) return '';
  var lvl = d >= bad ? 'red' : d >= warn ? 'amber' : '';
  return ' <span class="age ' + lvl + '" title="' + esc(label) + '">' + (lvl === 'red' ? ic('clock') : '') + esc(label) + ' ' + d + (d === 1 ? ' day' : ' days') + '</span>';
}
var AGE = { review: [3, 7], toPrep: [2, 5], tevFile: [14, 25], tevCheque: [14, 30] };
function addToMeta(h, tag){ return tag ? h.replace('</div></div>', tag + '</div></div>') : h; }

(function(){
  var E = entryRow;
  entryRow = function(e, opts){ var h = E(e, opts); return e.status === 'Pending' && !e._saving ? addToMeta(h, ageTag(e.createdAt, AGE.review[0], AGE.review[1], 'Waiting')) : h; };
  var T = toRow;
  toRow = function(t){ var h = T(t); return t.status === 'Filed' && !t._saving ? h.replace('>Filed</span>', '>Filed</span>' + ageTag(t.createdAt, AGE.toPrep[0], AGE.toPrep[1], 'Waiting')) : h; };
  var TM = toMini;
  toMini = function(t){ var h = TM(t); return t.status === 'Filed' && !t._saving ? addToMeta(h, ageTag(t.createdAt, AGE.toPrep[0], AGE.toPrep[1], 'Waiting')) : h; };
  var V = tevRow;
  tevRow = function(v){
    var h = V(v), t = toOf(v.toId), tag = '';
    if (v._saving) return h;
    if (v.status === 'To prepare' && t) tag = ageTag(t.dateTo || t.dateFrom, AGE.tevFile[0], AGE.tevFile[1], 'Trip ended');
    else if (v.status === 'Pending' && v.submittedOn) tag = ageTag(v.submittedOn, AGE.tevCheque[0], AGE.tevCheque[1], 'Waiting for cheque');
    return addToMeta(h, tag);
  };
})();

/* What changed for me since I last opened the app */
function newsItems(){
  seenStart();
  var me = S.me.username, prev = SEEN.prev, out = [];
  function after(x){ return x && x > prev; }
  S.entries.forEach(function(e){
    if (e.username !== me || !after(e.reviewedAt) || e.reviewedBy === me) return;
    var ok = e.status === 'Confirmed', use = e.type === 'USE';
    out.push({ at: e.reviewedAt, k: ok ? 'ok' : 'del', ic: ok ? 'check' : 'x', go: 'data-entry="' + e.id + '"',
      t: (use ? 'Your day off on ' + fDate(e.date) : 'Your offset “' + (e.event || e.category) + '”') + (ok ? (use ? ' was approved' : ' was confirmed') : ' was rejected' + (e.note ? ': ' + e.note : '')) });
  });
  S.travelOrders.forEach(function(t){
    if (!after(t.statusAt) || !(t.usernames || []).concat([t.createdBy]).some(function(u){ return u === me; }) || isAdmin()) return;
    out.push({ at: t.statusAt, k: t.status === 'Cancelled' ? 'del' : 'ok', ic: 'route', go: 'data-act="toView" data-id="' + t.id + '"', t: 'Travel order “' + t.event + '” is ' + t.status.toLowerCase() + (t.status === 'Prepared' && t.tev === 'Yes' ? ' · TEV will be made' : '') });
  });
  (S.tevs || []).forEach(function(v){
    if (v.username !== me || !after(v.statusAt) || isAdmin()) return;
    var t = toOf(v.toId) || {};
    out.push({ at: v.statusAt, k: v.status === 'Claimed' ? 'ok' : 'add', ic: 'peso', go: 'data-go="tev"', t: 'Your TEV for “' + (t.event || 'travel') + '” ' + (v.status === 'Claimed' ? 'is released · ' + peso(v.total) : v.status === 'Pending' ? 'was submitted · waiting for the cheque' : 'is being prepared') });
  });
  S.leaves.forEach(function(l){
    if (l.username !== me || !after(l.createdAt) || l.createdBy === me || /^ADJ/.test(l.type)) return;
    out.push({ at: l.createdAt, k: 'add', ic: 'plane', go: 'data-go="leaves"', t: leaveName(l.type) + ' recorded: ' + fRange(l.dateFrom, l.dateTo, { month:'short', day:'numeric' }) });
  });
  if (isAdmin()){
    var nr = S.entries.filter(function(e){ return e.status === 'Pending' && after(e.createdAt) && e.createdBy !== me; }).length;
    if (nr) out.push({ at: '9', k: 'add', ic: 'clock', go: 'data-go="approvals"', t: nr + ' new ' + (nr === 1 ? 'entry' : 'entries') + ' to review' });
    var nt = S.travelOrders.filter(function(t){ return t.status === 'Filed' && after(t.createdAt) && t.createdBy !== me; }).length;
    if (nt) out.push({ at: '9', k: 'add', ic: 'route', go: 'data-act="newsTO" data-t="Filed"', t: nt + ' new travel order' + (nt === 1 ? '' : 's') + ' to prepare' });
  }
  return out.sort(function(a, b){ return a.at < b.at ? 1 : -1; });
}
function newsStrip(){
  var list = newsItems(); if (!list.length) return '';
  var show = list.slice(0, 5);
  return '<section class="panel span-12 news" aria-label="Since your last visit"><div class="panel-h"><h2>' + ic('star') + 'Since your last visit</h2><button class="btn btn-sm btn-ghost" data-act="newsDone">' + ic('check') + 'Got it</button></div>' +
    '<ul class="list">' + show.map(function(x){ return '<li class="row tap" ' + x.go + ' tabindex="0"><span class="mark ak-' + x.k + '">' + ic(x.ic) + '</span><div class="body"><div class="t">' + esc(x.t) + '</div>' + (x.at.length > 2 ? '<div class="m">' + ago(x.at) + '</div>' : '') + '</div><span class="go-i">' + ic('right') + '</span></li>'; }).join('') + '</ul>' +
    (list.length > show.length ? '<div class="panel-b hint">and ' + (list.length - show.length) + ' more</div>' : '') + '</section>';
}
(function(){
  var D = viewDashboard;
  viewDashboard = function(){ var v = D(), n = newsStrip(); if (n) v.body = v.body.replace('<div class="grid dash">', '<div class="grid dash">' + n); return v; };
})();
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  if (t.dataset.act === 'newsDone'){ seenMark(); SEEN.prev = new Date().toISOString(); render(); }
  else if (t.dataset.act === 'newsTO'){ S.view = 'travel'; S.toFilter = t.dataset.t; render(); window.scrollTo(0, 0); }
});
(function(){
  var st = document.createElement('style');
  st.textContent = '.age{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;line-height:1.5;padding:0 8px;border-radius:999px;background:var(--surface-2);color:var(--muted);white-space:nowrap;vertical-align:1px}' +
    '.age.amber{background:var(--gold-soft);color:var(--gold)}.age.red{background:var(--red-soft);color:var(--red)}.age svg{width:12px;height:12px}' +
    '.news{border:1px solid var(--brand-strong)}.news .go-i{color:var(--muted);display:flex}.news .go-i svg{width:16px;height:16px}';
  document.head.appendChild(st);
})();

/* =====================================================================
   Instant saving. Forms close and the new item shows right away, marked
   "Saving…". The real save runs in the background, one at a time, in order.
   If the server refuses, the change is undone and a sheet explains why,
   with Try again. Checks run before sending, so refusals are rare.
   ===================================================================== */
var Q = { ops: [], n: 0, busy: false, wait: 0, timer: null, loaded: false, offline: false };
function tmpId(){ return 'tmp' + (++Q.n) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* What the screen shows while a save is on its way. Kept as plain data so it survives a closed tab. */
function applySpec(sp){
  statsReset();   // data is changing: balances must be worked out again
  var arr = S[sp.arr], key = sp.key || 'id';
  if (!arr) return;
  if (sp.item){ if (!arr.some(function(x){ return x[key] === sp.item[key]; })) arr.push(Object.assign({}, sp.item)); }
  else arr.forEach(function(x){ if (x[key] === sp.id || (sp.ids && sp.ids.indexOf(x[key]) >= 0)) Object.assign(x, sp.patch, { _saving: true }); });
}
function reapply(){ Q.ops.forEach(function(op){ try { applySpec(op.spec); } catch(e){} }); }
function qKey(){ return S.me ? 'pio_q_' + S.me.username : null; }
function persist(){ var k = qKey(); if (k) lSet(k, Q.ops.length ? JSON.stringify(Q.ops) : null); }
function savedBadge(){
  var b = document.getElementById('syncPill'); if (!b) return;
  b.innerHTML = ic('check') + 'Saved'; b.className = 'sync-pill done'; b.hidden = false;
  clearTimeout(Q.doneT); Q.doneT = setTimeout(function(){ if (!Q.ops.length) b.hidden = true; }, 1400);
}
function syncBadge(){
  var b = document.getElementById('syncPill');
  if (!b){ b = document.createElement('div'); b.id = 'syncPill'; b.className = 'sync-pill'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
  var n = Q.ops.length; if (n) clearTimeout(Q.doneT);
  b.innerHTML = !n ? '' : Q.offline ? ic('clock') + 'No connection · ' + n + ' waiting, will send automatically' : '<span class="spin" aria-hidden="true"></span>Saving ' + n + '…';
  b.className = 'sync-pill' + (Q.offline ? ' off' : '');
  b.hidden = !n;
}
/* After fresh data arrives: pick up saves left from last time, and keep unsent changes on screen. */
var _apply = apply;
apply = function(d){
  _apply(d);
  if (!Q.loaded && S.me){ Q.loaded = true; try { Q.ops = JSON.parse(lGet(qKey()) || '[]'); } catch(e){ Q.ops = []; } if (Q.ops.length){ setTimeout(pump, 0); setTimeout(syncBadge, 0); } }
  reapply();
};
window.addEventListener('beforeunload', function(e){ if (Q.ops.length && !Q.offline){ e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('online', function(){ Q.wait = 0; pump(); });

function cleanup(op){
  ['entries','travelOrders','leaves','tevs'].forEach(function(k){ if (!S[k]) return; S[k] = S[k].filter(function(x){ return x.id !== op.tmp; }); S[k].forEach(function(x){ delete x._saving; }); });
  S.users.forEach(function(x){ delete x._saving; });
}
/* Problems worth retrying: no signal, or Google being busy. Anything else is a real refusal. */
function transient(err){ return err.net || /lock|timed? ?out|too many|try again later|service (error|unavailable)|internal error|rate/i.test(err.message || ''); }

function bg(action, payload, spec, done, label, tmp){
  var op = { action: action, payload: payload, spec: spec, label: label, tmp: tmp || tmpId() };
  Q.ops.push(op); persist(); applySpec(spec); closeModal(); render(); syncBadge();
  toast(done + (navigator.onLine === false ? ' · will send when back online' : ''));
  pump();
}
function pump(){
  if (Q.busy || !Q.ops.length || !S.me) return;
  var op = Q.ops[0]; Q.busy = true;
  call(op.action, Object.assign({}, op.payload, { _op: op.tmp })).then(function(){
    Q.busy = false; Q.wait = 0; Q.offline = false;
    Q.ops.shift(); persist(); cleanup(op); reapply(); render(); syncBadge();
    if (!Q.ops.length) savedBadge(); pump();
  }, function(err){
    Q.busy = false;
    if (!S.me) return;                                     // signed out: the queue waits for the next sign-in
    if (transient(err)){                                   // try again by itself: 2 s, 4 s, 8 s … up to 1 minute
      Q.offline = true; Q.wait = Math.min(60, Q.wait ? Q.wait * 2 : 2); syncBadge();
      clearTimeout(Q.timer); Q.timer = setTimeout(pump, Q.wait * 1000); return;
    }
    Q.ops.shift(); persist(); syncBadge();
    refresh().catch(function(){}).then(function(){ failSheet(op, err); pump(); });
  });
}
function failSheet(op, err){
  M = { retry: op };
  modal('Not saved', '<div class="warn-note" style="background:var(--red-soft);color:var(--red)">' + ic('x') + '<span>' + esc(op.label) + ' was not saved. ' + esc(err.message) + '</span></div><p class="hint" style="margin:0">Your other changes were saved. Fix the problem and try again, or discard this one.</p>',
    '<button type="button" class="btn btn-ghost" data-act="close">Discard</button><button type="button" class="btn btn-primary" data-act="retrySave">' + ic('refresh') + 'Try again</button>');
}
document.addEventListener('click', function(ev){
  if (ev.target.closest('[data-act=retrySave]') && M.retry){ var op = M.retry; bg(op.action, op.payload, op.spec, 'Trying again', op.label); return; }
  // Signing out with unsent changes would strand them, so wait.
  if (ev.target.closest('[data-act=logout]') && Q.ops.length){ ev.stopImmediatePropagation(); toast('Wait a moment: ' + Q.ops.length + ' change(s) are still saving.'); }
}, true);

/* ---------- checks done before sending ---------- */
function bad(errId, msg){ var el = document.getElementById(errId); if (el) el.textContent = msg; else toast(msg); return true; }
function earnCheck(d, errId, ignoreId){
  var who = d.username || S.me.username;
  if (!d.event || !d.event.trim()) return bad(errId, 'Event name is required.');
  if (!d.venue || !d.venue.trim()) return bad(errId, 'Venue is required.');
  if (!d.date || d.date > today()) return bad(errId, 'You cannot log an offset for a future date.');
  if (d.category === 'Travel order'){ if (!d.toId) return bad(errId, 'Pick the travel order you were on that day. File it first if it is missing.'); if (!d.notInPayroll) return bad(errId, 'Confirm that this travel order day is not charged to payroll.'); }
  else if (!d.noTravelOrder) return bad(errId, 'Confirm that this work was not under a travel order.');
  if (d.category === 'After 5 PM'){ var t = d.endTime || ''; if (!/^\d\d:\d\d$/.test(t)) return bad(errId, 'Enter the time the event ended.'); if (t >= '17:00' && t < '19:00') return bad(errId, 'Events that end before 7:00 PM are not counted as offset.'); }
  if (S.entries.some(function(e){ return e.id !== ignoreId && e.username === who && e.type === 'EARN' && e.date === d.date && e.category === d.category && e.status !== 'Rejected'; })) return bad(errId, 'An offset for this date and type is already logged.');
  return false;
}
function earnDays(d){ if (d.category === 'After 5 PM'){ var t = d.endTime; return (t >= '01:00' && t < '12:00') ? 1 : 0.5; } return Number(d.days) || 1; }

/* ---------- forms that now save instantly ---------- */
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form]'); if (!f) return;
  var kind = f.dataset.form, handled = { earn: 1, requestUse: 1, recordUse: 1, reject: 1, addUser: 1, saveTO: 1, toStatus: 1, recordLeave: 1, toDays: 1 };
  if (!handled[kind]) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var d = {}; new FormData(f).forEach(function(v, k){ if (typeof v === 'string') d[k] = v; });
  var errId = f.closest('#modal') ? 'merr' : 'err', err = document.getElementById(errId); if (err) err.textContent = '';
  var now = new Date().toISOString(), me = S.me.username, adm = isAdmin(), id = tmpId();
  // back from "which days use offset?": continue preparing with the days that were ticked
  if (kind === 'toDays'){ var picked = [].map.call(f.querySelectorAll('input[name=pick]:checked'), function(x){ return x.value; });
    d = Object.assign({}, M.toStatusD, { dayoffDays: JSON.stringify(picked), override: d.override ? '1' : '' }); M.id = d.id; kind = 'toStatus'; closeModal(); M.id = d.id; }

  if (kind === 'earn'){
    d.noTravelOrder = !!d.noTravelOrder; d.notInPayroll = !!d.notInPayroll;
    if (earnCheck(d, errId)) return;
    var who = adm && d.username ? d.username : me, auto = adm && (who !== me || otherAdmins() === 0);
    var e = { id: id, username: who, type: 'EARN', date: d.date, category: d.category, days: earnDays(d), event: d.event.trim(), venue: d.venue.trim(), endTime: d.category === 'After 5 PM' ? d.endTime : '', toId: d.category === 'Travel order' ? d.toId : '',
              status: auto ? 'Confirmed' : 'Pending', note: '', createdBy: me, createdAt: now, reviewedBy: auto ? me : '', reviewedAt: auto ? now : '', _saving: true };
    S.view = 'dashboard'; window.scrollTo(0, 0);
    return bg('logEarn', d, { arr: 'entries', item: e }, auto ? 'Offset added' : 'Sent for confirmation', 'The offset “' + e.event + '”', id);
  }
  if (kind === 'requestUse'){
    var st = stats(me), days = Number(d.days), early = !!d.early, free = st.free + (early ? st.month : 0);
    if (!(days >= 0.5) || days * 2 !== Math.round(days * 2)) return bad(errId, 'Days must be in half-day steps.');
    if (days > free + 1e-9) return bad(errId, 'You have ' + fD(Math.max(free, 0)) + ' available to request.' + (!early && st.month ? ' Tick “Use offsets earned this month” to include this month’s.' : ''));
    var au = adm && otherAdmins() === 0, r = { id: id, username: me, type: 'USE', date: d.date, category: 'Used', days: days, event: '', venue: '', endTime: '', status: au ? 'Confirmed' : 'Pending', note: early ? 'Uses offsets earned this month' : '', early: early, createdBy: me, createdAt: now, reviewedBy: au ? me : '', reviewedAt: au ? now : '', _saving: true };
    return bg('requestUse', d, { arr: 'entries', item: r }, au ? 'Day off recorded' : 'Request sent', 'Your day-off request for ' + fDate(d.date), id);
  }
  if (kind === 'recordUse'){
    var s2 = stats(d.username), days2 = Number(d.days), early2 = !!d.early, over = !!d.override, avail = s2.avail + (early2 ? s2.month : 0);
    if (!over && days2 > avail + 1e-9) return bad(errId, userName(d.username) + ' has only ' + fD(Math.max(avail, 0)) + ' available. Tick Override to record it anyway.');
    var u1 = { id: id, username: d.username, type: 'USE', date: d.date, category: 'Used', days: days2, event: '', venue: '', endTime: '', status: 'Confirmed', note: over && days2 > avail + 1e-9 ? 'Recorded without enough offset (override)' : early2 ? 'Uses offsets earned this month' : '', early: early2, createdBy: me, createdAt: now, reviewedBy: me, reviewedAt: now, _saving: true };
    var rbg = bg('recordUse', d, { arr: 'entries', item: u1 }, 'Offset use recorded', 'Offset use for ' + userName(d.username), id);
    offsetPromptFor(d.username, d.date);   // weekday day off: pick its event, then prepare its travel order
    return rbg;
  }
  if (kind === 'reject'){
    var rid = M.id, note = d.note;
    return bg('review', { id: rid, decision: 'Rejected', note: note }, { arr: 'entries', id: rid, patch: { status: 'Rejected', note: note, reviewedBy: me, reviewedAt: now } }, 'Rejected', 'The rejection');
  }
  if (kind === 'addUser'){
    var un = String(d.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(un)) return bad(errId, 'Usernames use 3–30 letters, numbers, dots or dashes.');
    if (S.users.some(function(x){ return x.username === un; })) return bad(errId, 'That username is taken.');
    if (!/^\d{4}$/.test(d.pin || '')) return bad(errId, 'PIN must be exactly 4 digits.');
    if (!String(d.name || '').trim()) return bad(errId, 'Full name is required.');
    var nu = { username: un, name: d.name.trim(), role: d.role === 'admin' ? 'admin' : d.role === 'scheduler' ? 'scheduler' : 'employee', division: d.division || '', active: true, empType: d.empType || 'JO', _saving: true };
    f.reset(); if (errId === 'merr') closeModal();
    return bg('addUser', d, { arr: 'users', key: 'username', item: nu }, nu.name + ' added', 'The account for ' + nu.name);
  }
  if (kind === 'saveTO'){
    var pend = document.getElementById('tp').value.trim(); if (pend) addName(pend);
    d.names = TO.names.join('\n'); d.id = TO.id;
    if (!d.dateFrom) return bad(errId, 'Pick a date.');
    if (d.dateTo && d.dateTo < d.dateFrom) return bad(errId, 'The end date is before the start date.');
    if (!String(d.event || '').trim()) return bad(errId, 'Purpose is required.');
    if (!String(d.destination || '').trim()) return bad(errId, 'Location is required.');
    if (!TO.names.length) return bad(errId, 'Add at least one person.');
    var names = TO.names.slice(), usernames = names.map(function(n){ var x = S.users.filter(function(u){ return u.name.toUpperCase() === n; })[0]; return x ? x.username : null; }).filter(Boolean);
    var fields = { dateFrom: d.dateFrom, dateTo: d.dateTo || d.dateFrom, event: d.event.trim(), destination: (d.destination || '').trim(), names: names, usernames: usernames, toType: d.toType === 'dayoff' ? 'dayoff' : 'regular', eventId: d.eventId === '__new' ? '' : (d.eventId || ''), updatedBy: me, updatedAt: now, _saving: true };
    if (TO.id){ return bg('saveTO', d, { arr: 'travelOrders', id: TO.id, patch: fields }, 'Travel order saved', 'The travel order “' + fields.event + '”'); }
    var nt = Object.assign({ id: id, toNo: '', status: 'Filed', tev: '', createdBy: me, createdAt: now }, fields);
    return bg('saveTO', d, { arr: 'travelOrders', item: nt }, 'Travel order filed', 'The travel order “' + fields.event + '”', id);
  }
  if (kind === 'toStatus'){
    var tid = d.id || M.id; d.id = tid;
    var tOld = S.travelOrders.filter(function(x){ return x.id === tid; })[0] || {}, startTev = d.tev === 'Yes' && d.status !== 'Cancelled';
    // a day-off travel order uses offset when it is prepared: never guess how many days, ask
    if (d.status === 'Prepared' && tOld.status !== 'Prepared' && tOld.toType === 'dayoff' && !tOld.offsetDone && !tOld.useEntryId && d.dayoffDays == null){ M.toStatusD = d; return toDaysModal(tOld); }
    bg('setTOStatus', d, { arr: 'travelOrders', id: tid, patch: { status: d.status, tev: d.tev || '', toNo: d.toNo || '', datePrepared: d.datePrepared || tOld.datePrepared || '' } }, 'Travel order updated', 'The travel order update');
    if (!startTev && d.status === 'Prepared' && !tOld.printedAt) setTimeout(function(){ prepPrompt(tOld, false, true); }, 300);
    if (startTev){
      // Show the new TEVs right away; the server makes the real ones.
      var have = (S.tevs || []).filter(function(v){ return v.toId === tid; }).map(function(v){ return v.name; }), made = 0;
      (tOld.names || []).forEach(function(n){ if (have.indexOf(n) >= 0) return; var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0];
        S.tevs.push({ id: tmpId(), toId: tid, name: n, username: u ? u.username : '', status: 'To prepare', transpo: 0, food: 0, lodging: 0, other: 0, total: 0, _saving: true }); made++; });
      prepPrompt(tOld, !!(made || tOld.tev !== 'Yes'), d.status === 'Prepared' && !tOld.printedAt);
    }
    return;
  }
  if (kind === 'recordLeave'){
    d.override = !!d.override;
    var lt = LEAVE_TYPES[d.type], b = leaveBal(d.username, (d.dateFrom || '').slice(0, 4)), ld = Number(d.days), short = '';
    if (!d.dateFrom || !d.dateTo || d.dateTo < d.dateFrom) return bad(errId, 'Check the dates.');
    if (!(ld >= 0.5) || ld * 2 !== Math.round(ld * 2)) return bad(errId, 'Days must be in half-day steps.');
    if (lt.pool === 'VL' && ld > b.vl + 1e-9) short = 'Only ' + fD(b.vl) + ' of vacation leave left.';
    if (lt.pool === 'SL' && ld > b.sl + 1e-9) short = 'Only ' + fD(b.sl) + ' of sick leave left.';
    var cap = d.type === 'WL' ? wellCap() : lt.year; if (cap && (b.used[d.type] || 0) + ld > cap + 1e-9) short = lt.name + ': only ' + fD(Math.max(cap - (b.used[d.type] || 0), 0)) + ' left this year.';
    if (d.type === 'WL' && ld > 3) short = 'Wellness leave can be taken up to 3 days in a row.';
    if (short && !d.override) return bad(errId, short + ' Record the rest as Leave Without Pay, or tick “Record anyway”.');
    var nl = { id: id, username: d.username, type: d.type, dateFrom: d.dateFrom, dateTo: d.dateTo, days: ld, note: d.note || '', createdBy: me, createdAt: now, _saving: true };
    return bg('recordLeave', d, { arr: 'leaves', item: nl }, 'Leave recorded', lt.name + ' for ' + userName(d.username), id);
  }
}, true);

/* Approve buttons save instantly too. */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act=review]'); if (!t) return;
  ev.stopImmediatePropagation();
  var id = t.dataset.id, dec = t.dataset.d, me = S.me.username, now = new Date().toISOString(), ovr = t.dataset.override === '1';
  var e = S.entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  // "Approve anyway" (override) needs a second tap
  if (ovr && t.dataset.sure !== '1'){ t.dataset.sure = '1'; t.innerHTML = ic('check') + 'Tap again to approve'; return; }
  // offsets earned this month count when the request asked for them
  var s = stats(e.username), lim = s.avail + (e.early ? s.month : 0), short = e.type === 'USE' && dec === 'Confirmed' && e.days > lim + 1e-9;
  if (short && !ovr) return toast(userName(e.username) + ' has only ' + fD(Math.max(lim, 0)) + ' available. Use Approve anyway to approve it below zero.');
  var patch = { status: dec, reviewedBy: me, reviewedAt: now }; if (short) patch.note = 'Approved without enough offset (override)';
  var save = function(){
    bg('review', { id: id, decision: dec, override: ovr ? '1' : '' }, { arr: 'entries', id: id, patch: patch }, dec === 'Confirmed' ? (short ? 'Approved (override)' : 'Approved') : 'Rejected', 'The approval for ' + userName(e.username));
    if (e.type === 'USE' && dec === 'Confirmed') offsetPromptFor(e.username, e.date);   // weekday day off: pick its event, then prepare
  };
  // a row in a list slides out first, so it is clear it left the queue (skipped with reduce motion, and in pop-ups)
  var row = t.closest('li.row'); if (row && !t.closest('#modal') && !lessMotion() && row.animate){
    row.style.overflow = 'hidden'; t.disabled = true;
    var ra = row.animate([{ opacity: 1, transform: 'none', height: row.offsetHeight + 'px' }, { opacity: 0, transform: 'translateX(' + (dec === 'Confirmed' ? 24 : -24) + 'px)', height: '0px' }], { duration: MOTION.outMs + 40, easing: MOTION.easeIn, fill: 'forwards' });
    // after saving, drop the animation: the page update may reuse this same row for the next entry
    settle(ra, MOTION.outMs + 40, function(){ save(); setTimeout(function(){ ra.cancel(); row.style.overflow = ''; t.disabled = false; }, 30); }); return;
  }
  save();
}, true);

/* ---------- "New updates" prompt ----------
   Every minute (while the app is open and visible) it asks the server when anyone last saved.
   If it is newer than what is on screen, a bar offers to refresh. The page never reloads by itself,
   so nobody loses a form they are filling in. */
var W = { timer: null, shown: false };
function updateBar(on){
  var b = document.getElementById('newBar');
  if (!b){ b = document.createElement('div'); b.id = 'newBar'; b.className = 'new-bar'; b.setAttribute('role', 'status');
    b.innerHTML = ic('refresh') + '<span>New entries from the office.</span><button type="button" class="btn btn-sm btn-sun" data-act="loadNew">Refresh</button><button type="button" class="icon-btn" data-act="hideNew" aria-label="Dismiss">' + ic('x') + '</button>';
    document.body.appendChild(b); }
  b.hidden = !on; W.shown = on;
}
function checkNew(){
  if (!S.me || document.visibilityState !== 'visible' || Q.ops.length || W.shown) return;
  call('ping').then(function(r){ if (r && r.lastWrite && S.lastWrite && r.lastWrite > S.lastWrite + 1000) updateBar(true); }, function(){});
}
setInterval(checkNew, 60000);
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') setTimeout(checkNew, 1500); });
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act=loadNew],[data-act=hideNew]'); if (!t) return;
  if (t.dataset.act === 'hideNew'){ updateBar(false); W.shown = true; setTimeout(function(){ W.shown = false; }, 5 * 60000); return; }
  if (document.querySelector('#modal .scrim')) return toast('Finish or close the open form first, then refresh.');
  busy(t, refresh().then(function(){ updateBar(false); toast('Up to date'); }));
});

/* Swipe the menu in from the left edge, or swipe it away (phones and tablets). */
(function(){
  var mq = window.matchMedia('(max-width:1100px)'), t = null;
  function side(){ return document.querySelector('.side'); }
  function scrim(){ return document.querySelector('.drawer-scrim'); }
  function setOpen(on){
    document.body.classList.toggle('drawer-open', on);
    document.querySelectorAll('[data-act=drawer]').forEach(function(b){ b.setAttribute('aria-expanded', String(on)); });
  }
  function clear(){ var s = side(), c = scrim(); if (s) s.style.transform = ''; if (c) c.style.opacity = ''; document.body.classList.remove('drawer-drag'); }
  document.addEventListener('touchstart', function(e){
    if (!mq.matches || e.touches.length !== 1 || !side() || document.getElementById('modal') && document.getElementById('modal').childElementCount) return;
    var x = e.touches[0].clientX, y = e.touches[0].clientY, open = document.body.classList.contains('drawer-open');
    if (!open && x > 28) return;
    if (open && !(e.target.closest && e.target.closest('.side,.drawer-scrim'))) return;
    t = { x0: x, y0: y, open: open, w: side().offsetWidth, dx: 0, t0: Date.now(), live: false };
  }, { passive: true });
  document.addEventListener('touchmove', function(e){
    if (!t) return;
    var dx = e.touches[0].clientX - t.x0, dy = e.touches[0].clientY - t.y0;
    if (!t.live){
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { t = null; return; }   // vertical scroll wins
      t.live = true; document.body.classList.add('drawer-drag');
    }
    t.dx = dx;
    var pos = Math.max(0, Math.min(t.w, (t.open ? t.w : 0) + dx));
    side().style.transform = 'translateX(' + (pos - t.w) + 'px)';
    var c = scrim(); if (c) c.style.opacity = String(pos / t.w);
  }, { passive: true });
  document.addEventListener('touchend', function(){
    if (!t) return;
    var g = t; t = null;
    if (!g.live) return;
    var fast = Math.abs(g.dx) / Math.max(1, Date.now() - g.t0) > 0.45;
    var on = g.open ? !(g.dx < -g.w * 0.3 || (fast && g.dx < 0)) : (g.dx > g.w * 0.3 || (fast && g.dx > 0));
    clear(); setOpen(on);
  });
  document.addEventListener('touchcancel', function(){ if (t){ t = null; clear(); } });
})();

/* =====================================================================
   PIO Overwatch: Firebase backend (used when config.js has PIO_FIREBASE)
   - Sign-in: Firebase Authentication (username + PIN, padded behind the scenes).
   - Data: Cloud Firestore. The same rules the preview uses run in the browser
     (Mock.engine), and the changed records are written to Firestore in one batch.
   - Security: firestore.rules (who can read and write what).
   - Each device keeps a copy and only downloads what changed since last time,
     so the free plan's daily reads go a long way.
   ===================================================================== */
var Fire = (function(){
  var CFG = window.PIO_FIREBASE || {}, F = null, app = null, auth = null, db = null, booting = null;
  var me = null, member = null, unsub = [], store = null, timer = null, syncing = null, DEF = null;
  var DOMAIN = 'pio-overwatch.local';
  var COLS = { users: 'username', entries: 'id', travelOrders: 'id', events: 'id', inventory: 'id', tasks: 'id', pubs: 'id', pubItems: 'id', pubVotes: 'id', leaves: 'id', tevs: 'id', divisions: 'id', holidays: 'date', credits: 'username', settings: 'id', board: 'id' };
  var PRIVATE = { entries: 1, leaves: 1, credits: 1, tevs: 1 };
  var ENGINE = { users: 'users', entries: 'entries', travelOrders: 'tos', events: 'events', inventory: 'inventory', tasks: 'tasks', pubs: 'pubs', pubItems: 'pubItems', pubVotes: 'pubVotes', leaves: 'leaves', tevs: 'tevs', divisions: 'divisions', holidays: 'holidays', credits: 'credits' };
  var PH_CAL = 'en.philippines#holiday@group.v.calendar.google.com';

  function email(u, k){ return u + (k ? '.' + k : '') + '@' + DOMAIN; }
  function pw(pin){ return 'pio#' + pin + '#ow'; }          // Firebase needs 6+ characters; staff still type their 4-6 digit PIN
  function ok(d, fresh){ return { ok: true, data: d === undefined ? true : d, fresh: fresh }; }
  function fail(m, extra){ return Object.assign({ ok: false, error: m }, extra || {}); }
  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function nowIso(){ return new Date().toISOString(); }
  function rid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function authMsg(e){
    var c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'Wrong username or PIN.';
    if (/too-many-requests/.test(c)) return 'Too many tries. Wait a few minutes, then try again.';
    if (/network-request-failed|unavailable|deadline-exceeded/.test(c) || /client is offline/i.test((e && e.message) || '')) return 'Could not reach the server. Check your internet connection and try again.';
    if (/permission-denied/.test(c)) return 'You don’t have permission to do that.';
    return (e && e.message) || 'Something went wrong. Please try again.';
  }
  function netErr(e){ var er = new Error(authMsg(e)); er.net = /network|unavailable|deadline/.test((e && e.code) || '') || /client is offline/i.test((e && e.message) || ''); return er; }

  /* ---------- start-up ---------- */
  function script(src){ return new Promise(function(res, rej){ var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function(){ rej(new Error('Could not load ' + src + '. Check your internet connection.')); }; document.head.appendChild(s); }); }
  function init(){
    if (booting) return booting;
    booting = (window.FB ? Promise.resolve() : script('firebase.js')).then(function(){
      F = window.FB;
      if (!DEF){ var d0 = Mock.engine.dump(); DEF = { divisions: clone(d0.divisions), holidays: clone(d0.holidays), settings: clone(d0.settings) }; }
      app = F.initializeApp(CFG);
      auth = F.getAuth(app);
      db = F.initializeFirestore(app, { localCache: F.memoryLocalCache() });
      if (CFG.emulator){ F.connectAuthEmulator(auth, 'http://' + CFG.emulator + ':9099', { disableWarnings: true }); F.connectFirestoreEmulator(db, CFG.emulator, 8080); }
      return new Promise(function(res){ var off = F.onAuthStateChanged(auth, function(){ off(); res(); }); });
    });
    return booting;
  }
  function D(path){ return F.doc.apply(null, [db].concat(path.split('/'))); }

  /* ---------- local copy ---------- */
  function key(){ return 'pio_fs_' + (CFG.projectId || 'x') + '_' + me; }
  function emptyStore(){ var s = {}; Object.keys(COLS).forEach(function(c){ s[c] = { since: 0, docs: {} }; }); s.activity = { docs: {} }; return s; }
  function loadStore(){ store = emptyStore(); try { var x = JSON.parse(lGet(key()) || 'null'); if (x && x.v === 2) Object.keys(COLS).forEach(function(c){ if (x[c]) store[c] = x[c]; }); } catch(e){} }
  function saveStore(){ try { var x = { v: 2 }; Object.keys(COLS).forEach(function(c){ x[c] = store[c]; }); lSet(key(), JSON.stringify(x)); } catch(e){} }
  function arrays(){
    function vals(c){ return Object.keys(store[c].docs).map(function(id){ return clone(store[c].docs[id]); }); }
    var settings = store.settings.docs.app ? clone(store.settings.docs.app) : clone(DEF.settings); delete settings.id;
    return { users: vals('users'), entries: vals('entries'), tos: vals('travelOrders'), events: vals('events'), inventory: vals('inventory'), tasks: vals('tasks'), pubs: vals('pubs'), pubItems: vals('pubItems'), pubVotes: vals('pubVotes'), leaves: vals('leaves'), tevs: vals('tevs'), divisions: vals('divisions').sort(function(a, b){ return (a.order || 0) - (b.order || 0); }),
      holidays: vals('holidays').sort(function(a, b){ return a.date < b.date ? -1 : 1; }), credits: vals('credits'), settings: settings,
      activity: Object.keys(store.activity.docs).map(function(id){ return store.activity.docs[id]; }).sort(function(a, b){ return a.at < b.at ? 1 : -1; }), board: vals('board') };
  }
  function strip(d){ var o = {}; Object.keys(d).forEach(function(k){ if (k !== '_t' && k !== '_del') o[k] = d[k]; }); return o; }

  /* ---------- live sync: only what changed since this device last looked ---------- */
  function stopSync(){ unsub.forEach(function(u){ try { u(); } catch(e){} }); unsub = []; syncing = null; }
  function startSync(){
    if (syncing) return syncing;
    loadStore();
    var adm = member.role === 'admin';
    var jobs = Object.keys(COLS).map(function(c){
      return new Promise(function(res){
        var q, own = PRIVATE[c] && !adm, first = true;
        if (own) q = F.query(F.collection(db, c), F.where('username', '==', me));
        else q = F.query(F.collection(db, c), F.where('_t', '>', F.Timestamp.fromMillis(Math.max(0, (store[c].since || 0) - 5000))));
        unsub.push(F.onSnapshot(q, function(snap){
          if (own && first) store[c].docs = {};
          snap.docChanges().forEach(function(ch){
            var d = ch.doc.data(), id = ch.doc.id, t = d._t && d._t.toMillis ? d._t.toMillis() : 0;
            if (ch.type === 'removed'){ if (own) delete store[c].docs[id]; return; }
            if (d._del) delete store[c].docs[id]; else store[c].docs[id] = strip(d);
            if (t > (store[c].since || 0)) store[c].since = t;
          });
          saveStore();
          if (first){ first = false; res(); } else changed();
        }, function(err){ console.warn('sync ' + c, err); if (first){ first = false; res(); } }));
      });
    });
    if (adm) jobs.push(new Promise(function(res){
      var first = true;
      unsub.push(F.onSnapshot(F.query(F.collection(db, 'activity'), F.orderBy('_t', 'desc'), F.limit(200)), function(snap){
        snap.docChanges().forEach(function(ch){ if (ch.type === 'removed') return; store.activity.docs[ch.doc.id] = strip(ch.doc.data()); });
        if (first){ first = false; res(); } else changed();
      }, function(){ if (first){ first = false; res(); } }));
    }));
    syncing = Promise.all(jobs).then(function(){ Mock.engine.load(arrays()); if (adm) autoHolidays(); });
    return syncing;
  }
  /* Someone else saved something: show it (what you are typing is kept). */
  function changed(){
    clearTimeout(timer);
    timer = setTimeout(function(){
      if (!S.me || !member) return;
      Mock.engine.load(arrays());
      var d = Mock.engine.data(me); if (!d) return;
      apply(d); if (typeof reapply === 'function') reapply(); render();
    }, 250);
  }

  /* ---------- session ---------- */
  function session(){
    var u = auth.currentUser;
    if (!u) return Promise.resolve(null);
    if (member && member.uid === u.uid) return Promise.resolve(member);
    return F.getDoc(D('members/' + u.uid)).then(function(s){
      if (!s.exists() || s.data().active === false){ return F.signOut(auth).then(function(){ return null; }); }
      member = Object.assign({ uid: u.uid }, s.data()); me = member.username; return member;
    });
  }
  function needSession(fn){
    return session().then(function(m){ if (!m) return fail('Your session has ended. Please sign in again.', { expired: true }); return startSync().then(fn); });
  }
  function fresh(){ return Mock.engine.data(me); }

  /* ---------- writing: run the action, then save what changed ---------- */
  function diff(before, after, extra){
    var w = [];
    function cmp(c, list, keyName){
      var seen = {};
      list.forEach(function(x){
        var id = String(x[keyName]); seen[id] = 1;
        var data = clone(x); delete data.pin; delete data._saving;
        if (c === 'travelOrders' || c === 'events' || c === 'inventory' || c === 'tasks' || c === 'pubs' || c === 'pubItems' || c === 'pubVotes' || c === 'entries' || c === 'leaves' || c === 'tevs' || c === 'divisions') data.id = id;
        var old = before[c].docs[id];
        if (!old || JSON.stringify(old) !== JSON.stringify(data)) w.push({ c: c, id: id, data: data });
      });
      Object.keys(before[c].docs).forEach(function(id){ if (!seen[id]) w.push({ c: c, id: id, data: before[c].docs[id], del: true }); });
    }
    Object.keys(ENGINE).forEach(function(c){ cmp(c, after[ENGINE[c]], COLS[c]); });
    var st = clone(after.settings); st.id = 'app'; var olds = before.settings.docs.app;
    if (!olds || JSON.stringify(olds) !== JSON.stringify(st)) w.push({ c: 'settings', id: 'app', data: st });
    var known = {}; Object.keys(before.activity.docs).forEach(function(id){ known[before.activity.docs[id].at + '|' + before.activity.docs[id].action + '|' + before.activity.docs[id].target] = 1; });
    after.activity.forEach(function(a){ if (!a.id && !known[a.at + '|' + a.action + '|' + a.target]){ var id = rid(); w.push({ c: 'activity', id: id, data: Object.assign({ id: id }, a) }); } });
    if (member.role === 'admin') cmp('board', Mock.engine.board(), 'id');
    return w.concat(extra || []);
  }
  function commit(w){
    if (!w.length) return Promise.resolve();
    // members, logins and meta are plain records; everything else carries a server time so other devices can catch up
    w.forEach(function(x){
      if (x.c === 'members' || x.c === 'logins' || x.c === 'meta') return;
      if (x.c === 'activity'){ store.activity.docs[x.id] = x.data; return; }
      if (x.del) delete store[x.c].docs[x.id]; else store[x.c].docs[x.id] = clone(x.data);
    });
    saveStore();
    var chunks = []; for (var i = 0; i < w.length; i += 400) chunks.push(w.slice(i, i + 400));
    return chunks.reduce(function(p, ch){
      return p.then(function(){
        var b = F.writeBatch(db);
        ch.forEach(function(x){
          var ref = D(x.c + '/' + x.id);
          if (x.hard) b.delete(ref);
          else if (x.c === 'members' || x.c === 'logins' || x.c === 'meta') b.set(ref, x.data, x.merge ? { merge: true } : undefined);
          else b.set(ref, Object.assign({}, x.data, x.del ? { _del: true } : {}, { _t: F.serverTimestamp() }));
        });
        return b.commit();
      });
    }, Promise.resolve()).catch(function(e){ throw netErr(e); });
  }
  function membersFor(w){
    // keep members/{uid} (what the security rules check) in step with role and active
    var extra = [];
    w.forEach(function(x){
      if (x.c !== 'users' || !x.data.uid) return;
      if (x.del) extra.push({ c: 'members', id: x.data.uid, hard: true }, { c: 'logins', id: x.id, hard: true });
      else extra.push({ c: 'members', id: x.data.uid, data: { username: x.id, role: x.data.role, active: x.data.active !== false } });
    });
    return extra;
  }
  /* Staff may only save their own entries, their own unprepared travel orders and the activity log (the rules enforce the same). */
  function staffMay(x){
    if (x.c === 'activity') return true;
    if (x.c === 'entries') return x.data.username === me;
    if (x.c === 'events'){ if (member.role === 'scheduler') return true; var oe = store.events.docs[x.id];
      if (oe && !x.del) return Object.keys(Object.assign({}, oe, x.data)).every(function(k){ return ['gear', 'gearHolder', 'gearBy', 'gearAt', '_t'].indexOf(k) >= 0 || JSON.stringify(oe[k]) === JSON.stringify(x.data[k]); });
      return !oe && !x.del && x.data.status === 'Pending' && x.data.createdBy === me; }   // staff: new unconfirmed event from a travel order
    if (x.c === 'inventory') return true;
    /* Bantayog Publication: leaders run issues; editorial board members add articles and save their own scores */
    if (x.c === 'pubs' || x.c === 'pubItems' || x.c === 'pubVotes'){
      var mu = store.users.docs[me] || {}, md = store.divisions.docs[mu.division] || {}, bantLead = member.role === 'scheduler' && /bantayog/i.test((md.name || '') + ' ' + (md.short || '')), board = mu.board === true;
      if (x.c === 'pubs'){
        if (bantLead) return true;
        if (!board || x.del) return false;
        var op = store.pubs.docs[x.id], np = x.data;
        if (!op) return /^md{4}-dd$/.test(x.id) && np.auto === true && np.stage === 'collect';
        return op.auto === true && op.stage === 'collect' && np.stage === 'vote' && Object.keys(Object.assign({}, op, np)).every(function(k){ return ['stage', 'autoVoted', 'updatedBy', 'updatedAt', '_t'].indexOf(k) >= 0 || JSON.stringify(op[k]) === JSON.stringify(np[k]); });
      }
      if (x.c === 'pubItems') return bantLead || board;
      return board && x.data && x.data.username === me;
    }
    if (x.c === 'tasks'){ if (member.role === 'scheduler') return true;   // leaders give tasks to anyone
      var ot = store.tasks.docs[x.id], nt = x.data, selfT = function(t){ return !!t && t.createdBy === me && Array.isArray(t.assignees) && t.assignees.length === 1 && t.assignees[0] === me; };
      if (!ot) return !x.del && selfT(nt);                 // a task for yourself
      if (selfT(ot) && selfT(nt)) return true;              // ...which you may change, finish or remove
      var only = function(keys){ return Object.keys(Object.assign({}, ot, nt)).every(function(k){ return keys.indexOf(k) >= 0 || JSON.stringify(ot[k]) === JSON.stringify(nt[k]); }); };
      if (x.del) return false;
      // moving a task along: finishing a step, proofreading (anyone but the writer), sending back, undoing a step
      return only(['steps', 'status', 'doneBy', 'doneAt', 'sentBack', 'caption', 'flow', 'stage', 'updatedBy', 'updatedAt', '_t']);
      }
    if (x.c === 'logins') return x.id === me && !x.hard && Object.keys(x.data || {}).every(function(k){ return k === 'photo'; });
    if (x.c === 'users' && x.id === me && !x.del){ var ou0 = store.users.docs[x.id]; if (ou0 && Object.keys(Object.assign({}, ou0, x.data)).every(function(k){ return k === 'photo' || k === '_t' || JSON.stringify(ou0[k]) === JSON.stringify(x.data[k]); })) return true; }
    if (x.c === 'users'){ if (member.role !== 'scheduler' || x.del) return false; var ou = store.users.docs[x.id]; if (!ou) return false;   // leaders: skills only
      return Object.keys(Object.assign({}, ou, x.data)).every(function(k){ return k === 'skills' || k === '_t' || JSON.stringify(ou[k]) === JSON.stringify(x.data[k]); }); }
    if (x.c === 'travelOrders'){ var old = store.travelOrders.docs[x.id];
      if (member.role === 'scheduler') return false;   // leaders: assign people to events only; admins file and prepare travel orders
      return old ? old.createdBy === me && old.status === 'Filed' && x.data.status === 'Filed' : x.data.createdBy === me && x.data.status === 'Filed'; }
    return false;
  }
  function run(action, p, extra, patch){
    Mock.engine.load(arrays());
    var r = Mock.engine.run(me, action, p);
    if (!r.ok){
      var op = p && p._op && String(p._op).replace(/[^A-Za-z0-9_-]/g, '');
      if (op && Object.keys(COLS).some(function(c){ return Object.keys(store[c].docs).some(function(id){ return id.indexOf(op + '-') === 0; }); })) return Promise.resolve(ok(true, fresh()));
      return Promise.resolve(r);
    }
    if (patch) patch(Mock.engine.dump());
    var w = diff(store, Mock.engine.dump(), extra);
    if (member.role !== 'admin') w = w.filter(staffMay);
    w = w.concat(membersFor(w));
    return commit(w).then(function(){ return ok(r.data, fresh()); });
  }

  /* ---------- accounts ---------- */
  var sec = null;
  function secondAuth(){
    // a second, invisible sign-in so an admin can create accounts without being signed out
    if (!sec){ var a2 = F.initializeApp(CFG, 'accounts'); sec = F.getAuth(a2); if (CFG.emulator) F.connectAuthEmulator(sec, 'http://' + CFG.emulator + ':9099', { disableWarnings: true }); }
    return F.setPersistence(sec, F.inMemoryPersistence).then(function(){ return sec; });
  }
  function makeAccount(username, pin, startK){
    return secondAuth().then(function(a){
      function attempt(k){
        if (k > startK + 20) throw new Error('Could not create the sign-in for ' + username + '.');
        return F.createUserWithEmailAndPassword(a, email(username, k), pw(pin)).then(function(c){ var uid = c.user.uid; return F.signOut(a).then(function(){ return { uid: uid, k: k, email: email(username, k) }; }); },
          function(e){ if (/email-already-in-use/.test(e.code || '')) return attempt(k + 1); throw netErr(e); });
      }
      return attempt(startK || 0);
    });
  }
  /* the sign-in page shows names, divisions and photos from the login list, which anyone can read; an admin's app keeps it current */
  function syncProfiles(){
    if (!member || member.role !== 'admin') return Promise.resolve(ok());
    return F.getDocs(F.collection(db, 'logins')).then(function(snap){
      var have = {}, w = []; snap.forEach(function(x){ have[x.id] = x.data(); });
      Object.keys(store.users.docs).forEach(function(un){ var u = store.users.docs[un], l = have[un]; if (!u || u._del || !l) return;
        var want = { name: u.name || un, division: u.division || '', active: u.active !== false, photo: u.photo || '' };
        if (l.name !== want.name || (l.division || '') !== want.division || (l.active !== false) !== want.active || (l.photo || '') !== want.photo) w.push({ c: 'logins', id: un, data: want, merge: true }); });
      return commit(w).then(function(){ return ok({ updated: w.length }); });
    });
  }
  function loginOf(username){ return F.getDoc(D('logins/' + username)).then(function(s){ return s.exists() ? s.data() : null; }); }
  function setPin(username, pin){
    if (!/^\d{4}$/.test(String(pin || ''))) return Promise.resolve(fail('PIN must be exactly 4 digits.'));
    var u = store.users.docs[username]; if (!u) return Promise.resolve(fail('Employee not found.'));
    return loginOf(username).then(function(l){
      return makeAccount(username, pin, l ? (l.k || 0) + 1 : 0).then(function(acct){
        var extra = [{ c: 'logins', id: username, data: { email: acct.email, uid: acct.uid, k: acct.k } }];
        if (u.uid) extra.push({ c: 'members', id: u.uid, hard: true });
        return run('resetPin', { username: username, pin: pin }, extra, function(dump){ dump.users.forEach(function(x){ if (x.username === username) x.uid = acct.uid; }); });
      });
    });
  }

  /* ---------- holidays from Google's Philippine holiday calendar ---------- */
  function fetchHolidays(){
    var y = +today().slice(0, 4), url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(PH_CAL) + '/events?key=' + encodeURIComponent(CFG.apiKey) +
      '&singleEvents=true&maxResults=250&timeMin=' + y + '-01-01T00:00:00Z&timeMax=' + (y + 2) + '-01-01T00:00:00Z';
    return fetch(url).then(function(r){ return r.json(); }).then(function(j){
      if (j.error) throw new Error('Google Calendar: ' + j.error.message + ' Turn on the Google Calendar API for this Firebase project (see README).');
      return (j.items || []).filter(function(e){ return e.start && e.start.date && !/observance/i.test(e.description || ''); })
        .map(function(e){ return { date: e.start.date, name: e.summary, kind: /special/i.test(e.description || '') ? 'Special' : 'Regular' }; });
    });
  }
  function syncHolidays(){
    return fetchHolidays().then(function(list){
      var have = store.holidays.docs, add = list.filter(function(h){ return !have[h.date]; });
      var w = add.map(function(h){ return { c: 'holidays', id: h.date, data: h }; });
      w.push({ c: 'meta', id: 'app', data: { holidaysAt: Date.now() }, merge: true });
      if (add.length) w.push({ c: 'activity', id: rid(), data: { at: nowIso(), actor: me, action: 'Updated holidays', target: '', details: add.length + ' added from the Philippine holiday calendar' } });
      return commit(w).then(function(){ Mock.engine.load(arrays()); return ok({ added: add.length }, fresh()); });
    });
  }
  function autoHolidays(){
    F.getDoc(D('meta/app')).then(function(s){ var t = s.exists() && s.data().holidaysAt; if (!t || Date.now() - t > 7 * 864e5) return syncHolidays().then(function(r){ if (r.data && r.data.added) changed(); }); }).catch(function(){});
  }

  /* ---------- moving data from the old Google Sheet (Backup .json) ---------- */
  function importBackup(p){
    var j = p.json || {}, a = arrays(), mine = a.users.filter(function(u){ return u.username === me; })[0], n = {};
    function merge(cur, inc, k){ var m = {}; cur.forEach(function(x){ m[x[k]] = x; }); (inc || []).forEach(function(x){ if (x && x[k] != null && x[k] !== '') m[x[k]] = Object.assign({}, m[x[k]] || {}, x); }); return Object.keys(m).map(function(id){ return m[id]; }); }
    if (!j.users || !j.entries) return Promise.resolve(fail('This is not a PIO Overwatch backup file. In the old app, use Settings > Backup (.json).'));
    var users = merge(a.users, j.users.map(function(u){ var x = clone(u); x.uid = ''; delete x.pin; return x; }), 'username').map(function(u){ var cur = a.users.filter(function(x){ return x.username === u.username; })[0]; if (cur && cur.uid){ u.uid = cur.uid; u.role = cur.role; u.active = cur.active; } if (u.uid == null) u.uid = ''; return u; });
    var dump = { users: users, entries: merge(a.entries, j.entries, 'id'), tos: merge(a.tos, j.travelOrders, 'id'), leaves: merge(a.leaves, j.leaves, 'id'), tevs: merge(a.tevs, j.tevs, 'id'),
                 divisions: merge(a.divisions, j.divisions, 'id'), holidays: merge(a.holidays, j.holidays, 'date'), credits: merge(a.credits, j.credits, 'username'),
                 settings: Object.assign({}, a.settings, j.settings || {}), activity: a.activity.concat((j.activity || []).slice(0, 1500).map(function(x){ return { at: x.at, actor: x.actor, action: x.action, target: x.target || '', details: x.details || '' }; })) };
    dump.activity.push({ at: nowIso(), actor: me, action: 'Imported data', target: '', details: 'From the Google Sheet backup' + (j.exportedAt ? ' of ' + String(j.exportedAt).slice(0, 10) : '') });
    Mock.engine.load(dump);
    var w = diff(store, Mock.engine.dump());
    w.forEach(function(x){ n[x.c] = (n[x.c] || 0) + 1; });
    return commit(w.concat(membersFor(w))).then(function(){ Mock.engine.load(arrays()); return ok({ counts: n, noPin: users.filter(function(u){ return !u.uid; }).length }, fresh()); });
  }

  /* ---------- the API the app calls ---------- */
  function api(action, p){
    p = p || {};
    return init().then(function(){
      if (action === 'status') return Promise.all([F.getDoc(D('meta/app')), F.getDocs(F.collection(db, 'divisions')), F.getDocs(F.collection(db, 'logins')).catch(function(){ return null; })]).then(function(r){
        var divs = []; r[1].forEach(function(s){ var d = s.data(); if (!d._del) divs.push(strip(d)); });
        divs.sort(function(a, b){ return (a.order || 0) - (b.order || 0); });
        var profs = []; if (r[2]) r[2].forEach(function(s){ var d = s.data(); if (d.name) profs.push({ username: s.id, name: d.name, division: d.division || '', photo: d.photo || '', active: d.active !== false }); });
        return ok({ needsSetup: !r[0].exists(), divisions: divs.length ? divs : DEF.divisions, profiles: profs });
      });
      if (action === 'setup') return setup(p);
      if (action === 'login') return login(p);
      if (action === 'logout'){ stopSync(); member = null; me = null; return F.signOut(auth).then(function(){ return ok(); }); }
      if (action === 'ping') return ok({ lastWrite: S.lastWrite || 0 });
      return needSession(function(){
        if (action === 'data'){
          // changes arrive live; Refresh just redraws from this device's copy
          Mock.engine.load(arrays()); return ok(fresh());
        }
        if (action === 'changePin') return changePin(p);
        if (action === 'syncProfiles') return syncProfiles();
        if (action === 'setPhoto') return run('setPhoto', p, [{ c: 'logins', id: String(p.username || ''), data: { photo: String(p.photo || '') }, merge: true }]);
        if (action === 'backupToDrive') return fail('With Firebase, use Download a backup file (.json) instead.');
        var adm = member.role === 'admin';
        if (!adm && ['addUser', 'resetPin', 'setPins', 'removeUser', 'syncHolidays', 'importBackup'].indexOf(action) >= 0) return fail('Only admins can do that.');
        if (action === 'addUser') return addUser(p);
        if (action === 'resetPin') return setPin(p.username, p.pin);
        if (action === 'setPins') return (p.usernames || []).reduce(function(pr, u){ return pr.then(function(r){ return r && !r.ok ? r : setPin(u, p.pin); }); }, Promise.resolve(null)).then(function(r){ return r || ok(); });
        if (action === 'removeUser'){ var ru = store.users.docs[p.username]; return run('removeUser', p, ru && ru.uid ? [{ c: 'members', id: ru.uid, hard: true }, { c: 'logins', id: p.username, hard: true }] : []); }
        if (action === 'syncHolidays') return syncHolidays();
        if (action === 'importBackup') return importBackup(p);
        if (action === 'exportAll'){ Mock.engine.load(arrays()); return Mock.engine.run(me, 'exportAll', p); }
        return run(action, p);
      });
    }).catch(function(e){ var er = e && e.net != null ? e : netErr(e); return fail(er.message, er.net ? { net: true } : {}); });
  }
  function login(p){
    var u = String(p.username || '').trim().toLowerCase();
    return loginOf(u).then(function(l){
      if (!l) return fail('Wrong username or PIN.');
      return F.setPersistence(auth, p.remember ? F.browserLocalPersistence : F.browserSessionPersistence)
        .then(function(){ return F.signInWithEmailAndPassword(auth, l.email, pw(p.pin)); })
        .then(function(){ member = null; stopSync(); return session(); })
        .then(function(m){
          if (!m) return fail('This account is turned off. Ask an admin.');
          return startSync().then(function(){
            var cur = store.users.docs[u];
            if (p.division && cur && cur.division !== p.division && store.divisions.docs[p.division])
              return commit([{ c: 'users', id: u, data: Object.assign({}, cur, { division: p.division }) }]).catch(function(){}).then(function(){ Mock.engine.load(arrays()); });
          }).then(function(){ return ok({ token: 'fb' }, fresh()); });
        }, function(e){ return fail(authMsg(e)); });
    });
  }
  function setup(p){
    var u = String(p.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) return Promise.resolve(fail('Usernames use 3–30 letters, numbers, dots or dashes.'));
    if (!/^\d{4}$/.test(String(p.pin || ''))) return Promise.resolve(fail('PIN must be exactly 4 digits.'));
    if (!String(p.name || '').trim()) return Promise.resolve(fail('Full name is required.'));
    return F.getDoc(D('meta/app')).then(function(m){
      if (m.exists()) return fail('The admin account already exists. Sign in instead.');
      return F.setPersistence(auth, p.remember ? F.browserLocalPersistence : F.browserSessionPersistence)
        .then(function(){ return F.createUserWithEmailAndPassword(auth, email(u, 0), pw(p.pin)); })
        .then(function(c){
          var uid = c.user.uid, now = nowIso(), b = F.writeBatch(db), t = F.serverTimestamp();
          b.set(D('meta/app'), { owner: uid, createdAt: now });
          b.set(D('members/' + uid), { username: u, role: 'admin', active: true });
          b.set(D('logins/' + u), { email: email(u, 0), uid: uid, k: 0 });
          b.set(D('users/' + u), { username: u, name: p.name.trim(), role: 'admin', division: p.division || '', active: true, empType: 'Regular', uid: uid, _t: t });
          DEF.divisions.forEach(function(d){ b.set(D('divisions/' + d.id), Object.assign({}, d, { _t: t })); });
          DEF.holidays.forEach(function(h){ b.set(D('holidays/' + h.date), Object.assign({}, h, { _t: t })); });
          b.set(D('settings/app'), Object.assign({ id: 'app' }, DEF.settings, { tevBudget: 0, _t: t }));
          b.set(D('activity/' + rid()), { at: now, actor: u, action: 'Created the admin account', target: u, details: 'First setup', _t: t });
          return b.commit().then(function(){ member = null; return session(); }).then(function(){ return startSync(); }).then(function(){ return ok({ token: 'fb' }, fresh()); });
        }, function(e){ return fail(authMsg(e)); });
    });
  }
  function addUser(p){
    var u = String(p.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) return Promise.resolve(fail('Usernames use 3–30 letters, numbers, dots or dashes.'));
    if (store.users.docs[u]) return Promise.resolve(fail('That username is taken.'));
    if (!/^\d{4}$/.test(String(p.pin || ''))) return Promise.resolve(fail('PIN must be exactly 4 digits.'));
    if (!String(p.name || '').trim()) return Promise.resolve(fail('Full name is required.'));
    return loginOf(u).then(function(l){
      return makeAccount(u, p.pin, l ? (l.k || 0) + 1 : 0).then(function(acct){
        return run('addUser', Object.assign({}, p, { username: u }), [{ c: 'logins', id: u, data: { email: acct.email, uid: acct.uid, k: acct.k } }],
          function(dump){ dump.users.forEach(function(x){ if (x.username === u) x.uid = acct.uid; }); });
      });
    });
  }
  function changePin(p){
    if (!/^\d{4}$/.test(String(p.newPin || ''))) return Promise.resolve(fail('PIN must be exactly 4 digits.'));
    return loginOf(me).then(function(l){
      var cred = F.EmailAuthProvider.credential(l.email, pw(p.oldPin));
      return F.reauthenticateWithCredential(auth.currentUser, cred).then(function(){ return F.updatePassword(auth.currentUser, pw(p.newPin)); })
        .then(function(){ return commit([{ c: 'activity', id: rid(), data: { at: nowIso(), actor: me, action: 'Changed own PIN', target: me, details: '' } }]); })
        .then(function(){ return ok(true, fresh()); }, function(e){ return fail(/invalid-credential|wrong-password/.test(e.code || '') ? 'Current PIN is wrong.' : authMsg(e)); });
    });
  }
  // the person's sign-in token, so the phone alerts worker knows who is asking
  function idToken(){ return auth && auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(''); }
  return { api: api, idToken: idToken };
})();

/* ---------- Firebase-only screens: import and starting PINs ---------- */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="setPins"]'); if (!t) return;
  var list = S.users.filter(function(u){ return u.noPin; });
  modal('Set starting PINs', '<p style="margin:0">These ' + list.length + ' people came from the Google Sheet and cannot sign in yet. Give them one starting PIN; each can change it after signing in.</p>' +
    '<ul class="list boxed">' + list.map(function(u){ return '<li class="row"><span class="avatar">' + esc(initials(u.name)) + '</span><div class="body"><div class="t">' + esc(u.name) + '</div><div class="m">@' + esc(u.username) + '</div></div></li>'; }).join('') + '</ul>' +
    '<div class="field"><label for="spn">Starting PIN</label><input class="input pin" id="spn" name="pin" inputmode="numeric" maxlength="4" placeholder="4 digits" required></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + ic('key') + 'Set PINs</button>', 'setPins');
});
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form="setPins"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var pin = f.querySelector('#spn').value, names = S.users.filter(function(u){ return u.noPin; }).map(function(u){ return u.username; });
  if (!/^\d{4}$/.test(pin)) return bad('merr', 'PIN must be exactly 4 digits.');
  busy(f.querySelector('[type=submit]'), act('setPins', { usernames: names, pin: pin }, 'PINs set. They can sign in now.').then(closeModal), 'merr');
}, true);
document.addEventListener('change', function(ev){
  var inp = ev.target; if (inp.id !== 'importJson' || !inp.files[0]) return;
  var file = inp.files[0], rd = new FileReader();
  rd.onload = function(){
    var j; try { j = JSON.parse(rd.result); } catch(e){ return toast('That file is not a backup (.json).'); }
    if (!j || !j.users || !j.entries) return toast('That file is not a PIO Overwatch backup.');
    M = { importJson: j };
    modal('Import from the Google Sheet', '<p style="margin:0">Backup from <b>' + esc(String(j.exportedAt || '').slice(0, 10) || 'unknown date') + '</b>:</p>' +
      '<div class="mini-tiles"><div><span>Staff</span><b>' + j.users.length + '</b></div><div><span>Offset entries</span><b>' + j.entries.length + '</b></div><div><span>Travel orders</span><b>' + (j.travelOrders || []).length + '</b></div><div><span>Leaves</span><b>' + (j.leaves || []).length + '</b></div><div><span>TEVs</span><b>' + (j.tevs || []).length + '</b></div><div><span>Holidays</span><b>' + (j.holidays || []).length + '</b></div></div>' +
      '<p class="hint" style="margin:0">Records with the same ID are updated; nothing here is deleted. Run it once. PINs do not carry over.</p>',
      '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button type="button" class="btn btn-primary" data-act="doImport">' + ic('upload') + 'Import</button>');
  };
  rd.readAsText(file); inp.value = '';
});
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="doImport"]'); if (!t || !M.importJson) return;
  busy(t, act('importBackup', { json: M.importJson }, function(r){ return 'Imported. ' + (r && r.noPin ? r.noPin + ' people need a starting PIN (Staff page).' : ''); }).then(closeModal), 'merr');
});

/* ---------- preview backend (used only when config.js has no API URL) ---------- */
var Mock = (function(){
  var divisions = [
    { id:'smpd', name:'Social Media and Production Division', short:'Social Media & Production', color:'#C8202A', icon:'camera', logo:'', order:1 },
    { id:'bantayog', name:'Bantayog Division', short:'Bantayog', color:'#0B2C6E', icon:'monument', logo:'', order:2 },
    { id:'asd', name:'Admin and Support Division', short:'Admin & Support', color:'#FFFFFF', icon:'folder', logo:'', order:3 }
  ];
  var users = [
    { username:'admin', name:'Maria Santos', role:'admin', division:'asd', pin:'1234', active:true, empType:'Regular' },
    { username:'rmendoza', name:'Ramon Mendoza', role:'admin', division:'bantayog', pin:'1234', active:true, empType:'Regular' },
    { username:'jdelacruz', name:'Juan Dela Cruz', role:'employee', division:'smpd', pin:'1234', active:true, empType:'JO' },
    { username:'areyes', name:'Ana Reyes', role:'employee', division:'bantayog', pin:'1234', active:true, empType:'Casual', board:true },
    { username:'mbautista', name:'Mark Bautista', role:'employee', division:'smpd', pin:'1234', active:true, empType:'COS' },
    { username:'cvillanueva', name:'Carlo Villanueva', role:'employee', division:'asd', pin:'1234', active:true, empType:'Regular' },
    { username:'lgarcia', name:'Liza Garcia', role:'employee', division:'bantayog', pin:'1234', active:false, empType:'Casual' }
  ];
  var holidays = [['2026-01-01',"New Year's Day",'Regular'],['2026-02-17','Chinese New Year','Special'],['2026-04-02','Maundy Thursday','Regular'],['2026-04-03','Good Friday','Regular'],['2026-04-04','Black Saturday','Special'],['2026-04-09','Araw ng Kagitingan','Regular'],['2026-05-01','Labor Day','Regular'],['2026-06-12','Independence Day','Regular'],['2026-08-21','Ninoy Aquino Day','Special'],['2026-08-31','National Heroes Day','Regular'],['2026-09-28','Wenceslao Vinzons Day (Camarines Norte)','Local'],['2026-11-01',"All Saints' Day",'Special'],['2026-11-02',"All Souls' Day",'Special'],['2026-11-30','Bonifacio Day','Regular'],['2026-12-08','Immaculate Conception','Special'],['2026-12-24','Christmas Eve','Special'],['2026-12-25','Christmas Day','Regular'],['2026-12-30','Rizal Day','Regular'],['2026-12-31','Last Day of the Year','Special']]
    .map(function(h){ return { date:h[0], name:h[1], kind:h[2] }; });
  var settings = { workdays: 22, carryCap: 0, wellnessDays: 5, tevBudget: 250000 }, lastWrite = Date.now(), tevs = [];
  var LT = { VL:'VL', FL:'VL', SL:'SL' }, tos = [], events = [], inventory = [], leaves = [], credits = [], tasks = [], pubs = [], pubItems = [], pubVotes = [];
  pubs.push({ id: 'pb1', title: 'Bantayog, November 2026', from: today().slice(0, 7) + '-01', to: today(), due: addDays(today(), 3), stage: 'vote', note: '', createdBy: 'rmendoza', createdAt: new Date().toISOString() });
  pubItems.push({ id: 'pi1', issueId: 'pb1', title: 'Livelihood caravan reaches 120 families in Labo', link: 'https://www.facebook.com/', postedOn: addDays(today(), -9), summary: '', pick: 'in', addedBy: 'areyes', addedAt: new Date().toISOString() },
                { id: 'pi2', issueId: 'pb1', title: 'Coastal clean-up in Mercedes gathers 300 volunteers', link: '', postedOn: addDays(today(), -5), summary: '', pick: '', addedBy: 'areyes', addedAt: new Date().toISOString() },
                { id: 'pi3', issueId: 'pb1', title: 'Provincial Board approves the 2027 budget', link: '', postedOn: addDays(today(), -2), summary: '', pick: '', addedBy: 'rmendoza', addedAt: new Date().toISOString() });
  pubVotes.push({ id: 'pi1_areyes', itemId: 'pi1', issueId: 'pb1', username: 'areyes', score: 5, note: '', at: new Date().toISOString() }, { id: 'pi2_areyes', itemId: 'pi2', issueId: 'pb1', username: 'areyes', score: 3, note: '', at: new Date().toISOString() });
  (function(){ var at = function(h){ return new Date(Date.now() - h * 36e5).toISOString(); }, mk = function(id, title, tpl, who, done, extra){
      var T = taskTpl(tpl), st = T.steps.map(function(x, i){ var d = i < done.length ? done[i] : null; return { id: 's' + (i + 1), name: x[0], skill: x[1], type: x[2], who: who[i] || [], doneBy: d ? d[0] : '', doneAt: d ? at(d[1]) : '', edits: !!(d && d[2]), note: d && d[3] || '' }; });
      var all = []; st.forEach(function(x){ x.who.forEach(function(u){ if (all.indexOf(u) < 0) all.push(u); }); });
      var fin = st.every(function(x){ return x.doneAt; });
      tasks.push(Object.assign({ id: id, title: title, template: T.id, kind: T.name, note: '', steps: st, assignees: all, due: today(), eventId: '', status: fin ? 'Done' : 'Open', doneBy: fin ? st[st.length - 1].doneBy : '', doneAt: fin ? st[st.length - 1].doneAt : '', sentBack: null, createdBy: 'admin', createdAt: at(30) }, extra || {})); };
    mk('k1', 'Congratulatory pubmat: board exam passers', 'pubmat', [['mbautista'], ['jdelacruz'], ['areyes'], ['admin']], [['mbautista', 5], ['jdelacruz', 2]], { due: addDays(today(), 1) });
    mk('k2', 'Photos: Bantayog Festival parade', 'photo', [['mbautista'], ['jdelacruz'], []], [], {});
    mk('k3', 'Press release: livelihood caravan', 'release', [['mbautista'], ['areyes'], ['jdelacruz'], ['rmendoza']], [['mbautista', 32], ['areyes', 30], ['jdelacruz', 26, true, 'Fixed the names of the speakers'], ['rmendoza', 24]], { due: addDays(today(), -1), caption: 'The Provincial Government brought its Livelihood Caravan to Labo today, with starter kits for 120 families.' });
  })();
  function to(fromOff, toOff, event, dest, names, status, tev, by){ var f = addDays(today(), fromOff); tos.push({ id:'t' + (tos.length + 1), toNo: status === 'Prepared' ? 'PIO-2026-' + (100 + tos.length) : '', dateFrom:f, dateTo:addDays(today(), toOff), event:event, destination:dest, names:names.map(function(n){ return n.toUpperCase(); }), usernames:[], status:status, tev:tev, createdBy:by, createdAt:new Date(Date.now() - 3*864e5).toISOString(), updatedBy:'', updatedAt:'' }); }
  to(0, 0, 'Provincial Board regular session coverage', 'Sangguniang Panlalawigan Hall, Daet', ['Juan Dela Cruz','Mark Bautista'], 'Prepared', 'No', 'jdelacruz');
  to(3, 4, 'Livelihood caravan', 'Labo, Camarines Norte', ['Ana Reyes','Juan Dela Cruz','Pedro Ramos'], 'Filed', '', 'areyes');
  to(9, 9, 'Mining governance forum', 'Jose Panganiban', ['Mark Bautista'], 'Prepared', 'Yes', 'mbautista');
  to(-12, -12, 'Bantayog Festival documentation', 'Daet Town Plaza', ['Juan Dela Cruz','Ana Reyes'], 'Prepared', 'Yes', 'jdelacruz');
  tevs.push({ id:'v1', toId:'t4', name:'JUAN DELA CRUZ', username:'jdelacruz', status:'Claimed', transpo:600, food:450, lodging:0, other:0, total:1050, submittedOn:addDays(today(), -10), releasedOn:addDays(today(), -2), chequeNo:'0012345', note:'' },
            { id:'v2', toId:'t4', name:'ANA REYES', username:'areyes', status:'Pending', transpo:600, food:450, lodging:0, other:0, total:1050, submittedOn:addDays(today(), -10), releasedOn:'', chequeNo:'', note:'' },
            { id:'v3', toId:'t3', name:'MARK BAUTISTA', username:'mbautista', status:'To prepare', transpo:0, food:0, lodging:0, other:0, total:0, submittedOn:'', releasedOn:'', chequeNo:'', note:'' });
  credits.push({ username:'admin', vl:12.5, sl:20.25, asOf:shiftMonth(curMonth(), -3) }, { username:'rmendoza', vl:30, sl:41.5, asOf:shiftMonth(curMonth(), -1) }, { username:'areyes', vl:4.25, sl:6, asOf:shiftMonth(curMonth(), -2) }, { username:'cvillanueva', vl:18, sl:22.75, asOf:shiftMonth(curMonth(), -1) });
  leaves.push({ id:'l1', username:'cvillanueva', type:'SL', dateFrom:today(), dateTo:today(), days:1, note:'', createdBy:'admin', createdAt:new Date().toISOString() },
              { id:'l2', username:'areyes', type:'WL', dateFrom:addDays(today(), 6), dateTo:addDays(today(), 6), days:1, note:'', createdBy:'admin', createdAt:new Date().toISOString() },
              { id:'l3', username:'admin', type:'SPL', dateFrom:addDays(today(), -20), dateTo:addDays(today(), -20), days:1, note:'', createdBy:'rmendoza', createdAt:new Date().toISOString() });
  function linkTO(t){ t.usernames = t.names.map(function(n){ var u = users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; return u ? u.username : null; }).filter(Boolean); }
  var entries = [], activity = [], sessions = {}, n = 0;
  function off(days){ return addDays(today(), -days); }
  function add(u, type, days, cat, amt, ev, venue, status, end){ var at = new Date(Date.now() - days*864e5).toISOString();
    entries.push({ id:'e' + (++n), username:u, type:type, date:off(days), category:cat, days:amt, event:ev||'', venue:venue||'', endTime:end||'', status:status, note:'', createdBy: type === 'USE' && status === 'Confirmed' ? 'admin' : u, createdAt:at, reviewedBy: status === 'Pending' ? '' : 'admin', reviewedAt: status === 'Pending' ? '' : at }); }
  add('jdelacruz','EARN',160,'Weekend',1,'Provincial sports meet','Camarines Norte Sports Complex','Confirmed');
  add('jdelacruz','EARN',130,'After 5 PM',1,'Bantayog Festival night parade','Daet Town Plaza','Confirmed','01:30');
  add('areyes','EARN',125,'Holiday',1,'Independence Day rites','Rizal Monument, Daet','Confirmed');
  add('mbautista','EARN',100,'Weekend',1,'Coastal clean-up','Bagasbas Beach, Daet','Confirmed');
  add('jdelacruz','USE',90,'Used',1,'','','Confirmed');
  add('areyes','EARN',72,'Weekend',1,'Medical mission','Brgy. Tulay na Lupa, Labo','Confirmed');
  add('cvillanueva','EARN',66,'Weekend',1,'Year-end inventory','PIO Supply Room','Confirmed');
  add('jdelacruz','EARN',41,'Weekend',1,'Barangay assembly coverage','Brgy. Lag-on, Daet','Confirmed');
  add('jdelacruz','EARN',34,'After 5 PM',0.5,'Provincial Board session','Sangguniang Panlalawigan Hall','Confirmed','21:30');
  add('jdelacruz','EARN',27,'Weekend',1,'Bayanihan clean-up drive','Bagasbas Beach, Daet','Confirmed');
  add('areyes','EARN',31,'Weekend',1,'Livelihood caravan','Labo Municipal Gym','Confirmed');
  add('mbautista','EARN',22,'Weekend',1,'Bantayog Festival street dance','Daet Town Plaza','Confirmed');
  add('mbautista','EARN',10,'After 5 PM',0.5,"Governor's town hall",'Jose Panganiban Covered Court','Confirmed','22:00');
  add('admin','EARN',38,'Weekend',1,'Provincial press conference','Capitol Session Hall','Confirmed');
  add('mbautista','USE',6,'Used',0.5,'','','Confirmed');
  add('jdelacruz','EARN',4,'After 5 PM',1,'Typhoon advisory livestream','PIO Studio, Capitol','Pending','02:00');
  add('areyes','EARN',3,'Weekend',1,'Coastal clean-up','Mercedes Fish Port','Pending');
  add('mbautista','EARN',2,'After 5 PM',0.5,'PDRRMO briefing','PDRRMO Operations Center','Pending','20:30');
  add('admin','EARN',2,'After 5 PM',0.5,'Media briefing on typhoon response','PDRRMO Operations Center','Pending','21:00');
  add('jdelacruz','EARN',1,'Holiday',1,'Undas road monitoring','Camambugan Cemetery, Daet','Confirmed');
  add('areyes','USE',-6,'Used',1,'','','Pending');
  add('mbautista','USE',-9,'Used',0.5,'','','Confirmed');
  entries.forEach(function(e){ activity.unshift({ at: e.createdAt, actor: e.createdBy, action: e.type === 'USE' ? (e.status === 'Pending' ? 'Requested a day off' : 'Recorded offset use') : 'Logged an offset', target: e.username, details: (e.event ? e.event + ' · ' : '') + e.date + ' · ' + e.days + ' day(s)' }); });
  activity.sort(function(a,b){ return a.at < b.at ? 1 : -1; });
  function pub(u){ return { username:u.username, name:u.name, role:u.role, division:u.division, active:u.active, photo: u.photo || '', empType:u.empType || 'JO', noPin: u.uid === '', position: u.position || '', skills: Array.isArray(u.skills) ? u.skills.slice() : [], board: u.board === true }; }
  function find(u){ return users.filter(function(x){ return x.username === String(u||'').toLowerCase(); })[0]; }
  function canInv(u){ if (u.role === 'admin') return true; var d = divisions.filter(function(x){ return x.id === u.division; })[0]; return !!(d && /production/i.test(d.name)); }
  // Approved weekday offsets (work) and weekday days off both need a travel order to be valid, so one is
  // started at "To prepare". COS staff do not need travel orders for either.
  // A day-off travel order made here is marked as already deducted (the day off itself was approved), so
  // preparing it does not take the offset twice.
  function autoTO(e, me, now){
    if (e.status !== 'Confirmed' || (e.type !== 'EARN' && e.type !== 'USE') || e.autoToId || e.toId) return;
    var w = new Date(e.date + 'T00:00:00').getDay(); if (w < 1 || w > 5) return;
    if (holidays.some(function(h){ return (h.date || h[0]) === e.date; })) return;
    var u = find(e.username); if (!u || u.empType === 'COS') return;
    var nm = String(u.name).toUpperCase();
    if (e.type === 'USE'){
      var end = e.date; for (var k = 1; k < Math.ceil(e.days); k++) end = addDays(end, 1);
      // a day-off travel order for this person already covering the date counts
      if (tos.some(function(t){ return t.status !== 'Cancelled' && t.toType === 'dayoff' && t.names.indexOf(nm) >= 0 && t.dateFrom <= e.date && t.dateTo >= e.date; })) return;
      var id2 = 't' + nid(); e.autoToId = id2;
      tos.push({ id: id2, toNo: '', status: 'Filed', tev: '', createdBy: me.username, createdAt: now, usernames: [u.username], dateFrom: e.date, dateTo: end, event: 'Day off (offset use)', destination: 'Day off', names: [nm], toType: 'dayoff', offsetDone: true, useEntryId: e.id, eventId: '', auto: true, updatedBy: me.username, updatedAt: now });
      log(me, 'Started a day-off travel order for an approved weekday day off', e.username, e.date);
      return;
    }
    var id = 't' + nid(); e.autoToId = id;
    tos.push({ id: id, toNo: '', status: 'Filed', tev: '', createdBy: me.username, createdAt: now, usernames: [u.username], dateFrom: e.date, dateTo: e.date, event: 'After-hours work: ' + (e.event || 'offset'), destination: e.venue || 'PIO', names: [nm], toType: 'regular', eventId: '', entryId: e.id, auto: true, updatedBy: me.username, updatedAt: now });
    log(me, 'Started a travel order for an approved weekday offset', e.username, e.date);
  }
  function bal(u){ return ledgerFor(entries, u, settings.carryCap).avail; }
/* offsets confirmed this month: normally usable from the 1st of next month, but can be used early when asked */
function earnedNow(u){ var m = today().slice(0, 7); return entries.filter(function(e){ return e.username === u && e.type === 'EARN' && e.status === 'Confirmed' && e.date.slice(0, 7) === m; }).reduce(function(s, e){ return s + e.days; }, 0); }
function yes(v){ return v === true || v === 'on' || v === '1' || v === 'true'; }
  function fail(m){ return { ok:false, error:m }; }
  function copy(x){ return JSON.parse(JSON.stringify(x)); }
  function others(me){ return users.filter(function(u){ return u.role === 'admin' && u.active && u.username !== me.username; }).length; }
  function log(me, action, target, details){ activity.unshift({ at: new Date().toISOString(), actor: me.username, action: action, target: target || '', details: details || '' }); }
  function data(me){ var adm = me.role === 'admin'; tos.forEach(linkTO);
    if (extBoard && !adm){ var own = leaves.filter(function(l){ return l.username === me.username && !/^ADJ/.test(l.type); }).map(function(l){ return { username:l.username, from:l.dateFrom, to:l.dateTo, kind:'leave', label:l.type }; });
      return Object.assign(data0(me), { board: extBoard.filter(function(x){ return x.username !== me.username || x.kind !== 'leave'; }).map(function(x){ return { username:x.username, from:x.from, to:x.to, kind:x.kind, label:'' }; }).concat(own) }); }
    return data0(me);
  }
  function data0(me){ var adm = me.role === 'admin';
    var board = leaves.filter(function(l){ return !/^ADJ/.test(l.type); }).map(function(l){ return { username:l.username, from:l.dateFrom, to:l.dateTo, kind:'leave', label: adm || l.username === me.username ? l.type : '' }; });
    if (!adm) entries.forEach(function(e){ if (e.type === 'USE' && e.status === 'Confirmed' && e.username !== me.username) board.push({ username:e.username, from:e.date, to:e.date, kind:'off', label:'' }); });
    return { me:pub(me), users: users.map(pub), divisions:copy(divisions), holidays:copy(holidays), settings:copy(settings), activity: adm ? copy(activity) : [], entries: copy(entries.filter(function(e){ return adm || e.username === me.username; })),
      lastWrite: lastWrite, travelOrders: copy(tos), events: copy(events), inventory: (canInv(me) ? copy(inventory) : []), tasks: copy(tasks), pubs: copy(pubs), pubItems: copy(pubItems), pubVotes: copy(pubVotes), tevs: copy(tevs.filter(function(v){ return adm || v.username === me.username; })), leaves: copy(leaves.filter(function(l){ return adm || l.username === me.username; })), credits: copy(credits.filter(function(c){ return adm || c.username === me.username; })), board: board }; }
  /* Shared with the Firebase layer: the same rules run in the browser, and the changes are written to Firestore. */
  var OP = '', K = 0, extBoard = null;
  function nid(){ return OP ? OP.replace(/[^A-Za-z0-9_-]/g, '') + '-' + (++K) : Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (++K); }
  function boardOf(){
    var b = leaves.filter(function(l){ return !/^ADJ/.test(l.type); }).map(function(l){ return { id: 'lv_' + l.id, username: l.username, from: l.dateFrom, to: l.dateTo, kind: 'leave', label: '' }; });
    entries.forEach(function(e){ if (e.type === 'USE' && e.status === 'Confirmed') b.push({ id: 'off_' + e.id, username: e.username, from: e.date, to: e.date, kind: 'off', label: '' }); });
    return b;
  }
  function ok(me, d){ lastWrite = Date.now(); return { ok:true, data:d === undefined ? true : d, fresh: data(me) }; }
  function earn(p){
    if (!String(p.event||'').trim()) throw 'Event name is required.';
    var isTO = p.category === 'Travel order';
    if (isTO){ var tt = tos.filter(function(t){ return t.id === p.toId && t.status !== 'Cancelled' && t.dateFrom <= p.date && t.dateTo >= p.date; })[0]; if (!tt) throw 'Pick the travel order you were on that day.'; if (!p.notInPayroll) throw 'Confirm that this travel order day is not charged to payroll.'; }
    if (!String(p.venue||'').trim()) throw 'Venue is required.';
    if (!p.date || p.date > today()) throw 'You cannot log an offset for a future date.';
    if (!isTO && !p.noTravelOrder) throw 'Confirm that this work was not under a travel order.';
    var days = Number(p.days), end = '';
    if (p.category === 'After 5 PM'){ end = String(p.endTime||''); if (!/^\d\d:\d\d$/.test(end)) throw 'Enter the time the event ended.'; if (end >= '17:00' && end < '19:00') throw 'Events that end before 7:00 PM are not counted as offset.'; days = (end >= '01:00' && end < '12:00') ? 1 : 0.5; }
    else if (days !== 0.5 && days !== 1) throw 'Pick ½ day or 1 day.';
    return { date:p.date, category:p.category, days:days, event:p.event.trim(), venue:p.venue.trim(), endTime:end, toId: isTO ? p.toId : '' };
  }
  return { bump: function(){ lastWrite = Date.now(); },
    engine: {
      load: function(o){ users = o.users; entries = o.entries; divisions = o.divisions; holidays = o.holidays; settings = o.settings; activity = o.activity; tos = o.tos; events = o.events || []; inventory = o.inventory || []; tasks = o.tasks || []; pubs = o.pubs || []; pubItems = o.pubItems || []; pubVotes = o.pubVotes || []; leaves = o.leaves; credits = o.credits; tevs = o.tevs; extBoard = o.board || null; sessions = {}; },
      dump: function(){ return { users: users, entries: entries, divisions: divisions, holidays: holidays, settings: settings, activity: activity, tos: tos, events: events, inventory: inventory, tasks: tasks, pubs: pubs, pubItems: pubItems, pubVotes: pubVotes, leaves: leaves, credits: credits, tevs: tevs }; },
      board: boardOf,
      run: function(username, a, p){ sessions.fb = username; return Mock.api(a, p, 'fb'); },
      data: function(username){ var me = find(username); return me ? data(me) : null; }
    },
    api: function(a, p, tok){
    OP = (p && p._op) || ''; K = 0;
    try {
    var me = sessions[tok] && find(sessions[tok]);
    if (a === 'ping') return { ok:true, data:{ lastWrite: lastWrite } };
    if (a === 'status') return { ok:true, data:{ needsSetup:false, divisions:copy(divisions), profiles: users.filter(function(u){ return u.active; }).map(function(u){ return { username: u.username, name: u.name, division: u.division || '', photo: u.photo || '', active: true }; }) } };
    if (a === 'login'){ var u = find(p.username); if (!u || !u.active || u.pin !== p.pin) return fail('Wrong username or PIN.'); if (p.division && divisions.some(function(d){ return d.id === p.division; })) u.division = p.division; var t = 't' + Math.random(); sessions[t] = u.username; return ok(u, { token:t }); }
    if (!me) return { ok:false, error:'Your session has ended. Please sign in again.', expired:true };
    var adm = me.role === 'admin', now = new Date().toISOString();
    if (a === 'logout'){ delete sessions[tok]; return { ok:true }; }
    if (a === 'data') return { ok:true, data: data(me) };
    if (a === 'logEarn'){
      var who = adm && p.username ? p.username : me.username, f = earn(p);
      if (entries.some(function(e){ return e.username === who && e.type === 'EARN' && e.date === f.date && e.category === f.category && e.status !== 'Rejected'; })) return fail('An offset for this date and type is already logged.');
      var auto = adm && (who !== me.username || others(me) === 0);
      entries.push(Object.assign({ id:'e' + nid(), username:who, type:'EARN', status: auto ? 'Confirmed' : 'Pending', note:'', createdBy:me.username, createdAt:now, reviewedBy: auto ? me.username : '', reviewedAt: auto ? now : '' }, f)); if (auto) autoTO(entries[entries.length - 1], me, now);
      log(me, auto ? 'Added a confirmed offset' : 'Logged an offset', who, f.event + ' · ' + f.date + ' · ' + f.days + ' day(s)'); return ok(me);
    }
    if (a === 'editEntry'){ var x = entries.filter(function(e){ return e.id === p.id; })[0]; if (!x || x.status !== 'Pending') return fail('Only entries waiting for review can be edited.'); if (!adm && x.username !== me.username) return fail('You can only edit your own entries.');
      if (x.type === 'EARN') Object.assign(x, earn(p)); else { x.date = p.date; x.days = Number(p.days); } log(me, 'Edited an entry', x.username, x.date); return ok(me); }
    if (a === 'requestUse'){ var held = entries.filter(function(e){ return e.username === me.username && e.type === 'USE' && e.status === 'Pending'; }).reduce(function(s,e){ return s + e.days; }, 0), early = yes(p.early), free = bal(me.username) - held + (early ? earnedNow(me.username) : 0), dd = Number(p.days);
      if (!(dd >= 0.5) || dd * 2 !== Math.round(dd * 2)) return fail('Days must be in half-day steps.'); if (dd > free + 1e-9) return fail('You have ' + fD(Math.max(free,0)) + ' available to request.' + (!early && earnedNow(me.username) ? ' Tick "Use offsets earned this month" to include this month’s.' : ''));
      var au = adm && others(me) === 0; entries.push({ id:'e' + nid(), username:me.username, type:'USE', date:p.date, category:'Used', days:dd, event:'', venue:'', endTime:'', status: au ? 'Confirmed' : 'Pending', note: early ? 'Uses offsets earned this month' : '', early: early, createdBy:me.username, createdAt:now, reviewedBy: au ? me.username : '', reviewedAt: au ? now : '' }); if (au) autoTO(entries[entries.length - 1], me, now);
      log(me, 'Requested a day off', me.username, p.date + ' · ' + dd + ' day(s)' + (early ? ' · uses this month’s offsets' : '')); return ok(me); }
    if (a === 'deleteEntry'){ var i = entries.findIndex(function(e){ return e.id === p.id; }); if (i < 0) return fail('Entry not found.'); var e = entries[i]; if (!adm && !(e.username === me.username && e.status === 'Pending')) return fail('You can only remove your own pending entries.'); entries.splice(i,1); log(me, 'Removed an entry', e.username, e.date + ' · ' + e.days + ' day(s)'); return ok(me); }
    if (a === 'changePin'){ if (p.oldPin !== me.pin) return fail('Current PIN is wrong.'); if (!/^\d{4}$/.test(p.newPin)) return fail('PIN must be exactly 4 digits.'); me.pin = p.newPin; log(me, 'Changed own PIN', me.username); return ok(me); }
    /* tasks: admins and division leaders give tasks to anyone; everyone may give themselves a task.
       A task follows a template: a chain of steps, each with its own people (layout, caption, proofreading, posting...).
       Steps are done in order; who did each one (and any proofreading edits) is recorded. */
    /* ---------- Bantayog Publication: issues, articles, the editorial board's 1–5 scores, the leader's final lineup ---------- */
    if (/^(setBoard|savePub|pubStage|deletePub|savePubItem|deletePubItem|pubUnskip|scorePub|pubPick|ensurePubMonth|pubAutoVote)$/.test(a)){
      var bantOf = function(u){ var dv = divisions.filter(function(x){ return x.id === u.division; })[0]; return !!(dv && /bantayog/i.test(dv.name + ' ' + (dv.short || ''))); };
      var pubMgr = adm || (me.role === 'scheduler' && bantOf(me)), onBoard = me.board === true;
      var dateOk = function(d){ return /^\d{4}-\d\d-\d\d$/.test(d || ''); };
      if (a === 'setBoard'){
        if (!adm) return fail('Only an admin can choose the editorial board.');
        var bl = (Array.isArray(p.usernames) ? p.usernames : []).map(String);
        users.forEach(function(u){ var on = bl.indexOf(u.username) >= 0; if (!!u.board !== on){ if (on) u.board = true; else delete u.board; } });
        log(me, 'Updated the editorial board', '', bl.length + ' member(s)'); return ok(me);
      }
      if (a === 'savePub'){
        if (!pubMgr) return fail('Only the Bantayog division leader or an admin can set up an issue.');
        var pT = String(p.title || '').trim(); if (pT.length < 3) return fail('Name the issue, for example “Bantayog, December 2026”.');
        if (!dateOk(p.from) || !dateOk(p.to) || p.from > p.to) return fail('Pick the dates the issue covers.');
        var pX = p.id ? pubs.filter(function(x){ return x.id === p.id; })[0] : null; if (p.id && !pX) return fail('That issue was not found.');
        var pF = { title: pT.slice(0, 120), from: p.from, to: p.to, due: dateOk(p.due) ? p.due : '', note: String(p.note || '').trim().slice(0, 400), updatedBy: me.username, updatedAt: now };
        if (pX){ Object.assign(pX, pF); log(me, 'Edited a publication issue', '', pF.title); return ok(me, { id: pX.id }); }
        var pN = Object.assign({ id: 'pb' + nid(), stage: 'collect', createdBy: me.username, createdAt: now }, pF); pubs.push(pN);
        log(me, 'Started a publication issue', '', pF.title); return ok(me, { id: pN.id });
      }
      if (a === 'ensurePubMonth'){
        // one issue per month, named and dated by itself (fixed id, so two people opening at once can't make two)
        if (!(pubMgr || onBoard)) return fail('Only board members, the Bantayog leader or an admin open the monthly issue.');
        var ym = String(p.ym || ''); if (!/^\d{4}-\d\d$/.test(ym)) return fail('Bad month.');
        var mFrom = ym + '-01', mTo = ymd(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0)), mId = 'm' + ym;
        if (pubs.some(function(x){ return x.id === mId || (x.from === mFrom && x.to === mTo); })) return ok(me, { id: mId });
        pubs.push({ id: mId, title: 'Bantayog, ' + fMonth(ym), from: mFrom, to: mTo, due: '', note: '', stage: 'collect', auto: true, createdBy: me.username, createdAt: now, updatedBy: me.username, updatedAt: now });
        log(me, 'Opened the monthly publication issue', '', fMonth(ym)); return ok(me, { id: mId });
      }
      if (a === 'pubAutoVote'){
        // a monthly issue whose month is over opens for scoring by itself
        var av = pubs.filter(function(x){ return x.id === p.id; })[0]; if (!av) return fail('That issue was not found.');
        if (!(pubMgr || onBoard)) return fail('Only board members, the Bantayog leader or an admin can do that.');
        if (!av.auto || av.stage !== 'collect' || today() <= av.to) return ok(me);
        av.stage = 'vote'; av.autoVoted = true; av.updatedBy = me.username; av.updatedAt = now;
        log(me, 'Opened publication voting (month ended)', '', av.title); return ok(me);
      }
      if (a === 'pubStage' || a === 'deletePub'){
        var pS = pubs.filter(function(x){ return x.id === p.id; })[0]; if (!pS) return fail('That issue was not found.');
        if (a === 'deletePub'){ if (!adm) return fail('Only an admin can delete an issue.');
          var gone = pubItems.filter(function(x){ return x.issueId === pS.id; }).map(function(x){ return x.id; });
          pubItems = pubItems.filter(function(x){ return x.issueId !== pS.id; }); pubVotes = pubVotes.filter(function(v){ return gone.indexOf(v.itemId) < 0; });
          pubs.splice(pubs.indexOf(pS), 1); log(me, 'Deleted a publication issue', '', pS.title); return ok(me); }
        if (!pubMgr) return fail('Only the Bantayog division leader or an admin can move an issue along.');
        if (['collect', 'vote', 'final'].indexOf(p.stage) < 0) return fail('Unknown stage.');
        if (p.stage === 'final' && !pubItems.some(function(x){ return x.issueId === pS.id && x.pick === 'in'; })) return fail('Pick at least one article to include before locking the lineup.');
        pS.stage = p.stage; pS.updatedBy = me.username; pS.updatedAt = now;
        if (p.stage === 'final'){ pS.finalBy = me.username; pS.finalAt = now; } else { pS.finalBy = ''; pS.finalAt = ''; }
        log(me, p.stage === 'final' ? 'Locked a publication lineup' : p.stage === 'vote' ? 'Opened publication voting' : 'Reopened a publication for articles', '', pS.title); return ok(me);
      }
      if (a === 'savePubItem' || a === 'deletePubItem' || a === 'pubPick' || a === 'pubUnskip'){
        var iX = p.id ? pubItems.filter(function(x){ return x.id === p.id; })[0] : null; if (p.id && !iX) return fail('That article was not found.');
        var iss = pubs.filter(function(x){ return x.id === (iX ? iX.issueId : p.issueId); })[0]; if (!iss) return fail('That issue was not found.');
        if (iss.stage === 'final') return fail('This lineup is locked. Reopen it to make changes.');
        if (a === 'pubPick'){
          if (!pubMgr) return fail('Only the Bantayog division leader or an admin decides the lineup.');
          if (['in', 'out', ''].indexOf(p.pick) < 0) return fail('Pick in or out.');
          iX.pick = p.pick; iX.pickBy = me.username; iX.pickAt = now; return ok(me);
        }
        if (a === 'pubUnskip'){
          if (!(pubMgr || onBoard)) return fail('Only board members, the leader or an admin can bring a post back.');
          iX.skip = false; iX.updatedBy = me.username; iX.updatedAt = now; return ok(me);
        }
        if (a === 'deletePubItem'){
          if (iX.fbId){   // from the Facebook Page: set aside as "not news" instead of deleting
            if (!(pubMgr || onBoard)) return fail('Only board members, the leader or an admin can skip a post.');
            iX.skip = true; iX.pick = ''; iX.updatedBy = me.username; iX.updatedAt = now; pubVotes = pubVotes.filter(function(v){ return v.itemId !== iX.id; });
            log(me, 'Skipped a Facebook post for the publication', '', iX.title); return ok(me);
          }
          if (!(pubMgr || (iX.addedBy === me.username && iss.stage === 'collect'))) return fail('Only the person who added it (while collecting), the leader or an admin can remove it.');
          pubItems.splice(pubItems.indexOf(iX), 1); pubVotes = pubVotes.filter(function(v){ return v.itemId !== iX.id; });
          log(me, 'Removed a publication article', '', iX.title); return ok(me);
        }
        if (!(pubMgr || onBoard)) return fail('Only editorial board members, the Bantayog leader or an admin can add articles.');
        if (iX && !(pubMgr || iX.addedBy === me.username)) return fail('Only the person who added it, the leader or an admin can change it.');
        var aT = String(p.title || '').trim(); if (aT.length < 3) return fail('Write the article’s title or headline.');
        var aL = String(p.link || '').trim(); if (aL && !/^https?:\/\/\S+$/i.test(aL)) return fail('The link should start with https://');
        var aF = { title: aT.slice(0, 200), link: aL.slice(0, 500), postedOn: dateOk(p.postedOn) ? p.postedOn : '', summary: String(p.summary || '').trim().slice(0, 1200), updatedBy: me.username, updatedAt: now };
        var img = String(p.image || ''); if (/^https:\/\/\S+$/i.test(img)) aF.image = img.slice(0, 1000);
        if (iX){ Object.assign(iX, aF); return ok(me, { id: iX.id }); }
        var fbId = String(p.fbId || '').replace(/[^0-9_]/g, '').slice(0, 60);
        if (fbId && pubItems.some(function(x){ return x.issueId === iss.id && x.fbId === fbId; })) return fail('That post is already in this issue.');
        if (aL && pubItems.some(function(x){ return x.issueId === iss.id && x.link && x.link === aL; })) return fail('That post is already in this issue.');
        if (fbId) aF.fbId = fbId;
        var iN = Object.assign({ id: 'pi' + nid(), issueId: iss.id, pick: '', addedBy: me.username, addedAt: now }, aF); pubItems.push(iN);
        log(me, 'Added a publication article', '', aT); return ok(me, { id: iN.id });
      }
      // scorePub: one score per board member per article (its own record, so scores never overwrite each other)
      if (!onBoard) return fail('Only editorial board members can score articles.');
      var sI = pubItems.filter(function(x){ return x.id === p.itemId; })[0]; if (!sI) return fail('That article was not found.');
      var sIss = pubs.filter(function(x){ return x.id === sI.issueId; })[0]; if (!sIss || sIss.stage !== 'vote') return fail('Scoring is open only while the issue is in voting.');
      var sc = Number(p.score), vid = sI.id + '_' + me.username, ex = pubVotes.filter(function(v){ return v.id === vid; })[0];
      if (sc === 0){ if (ex) pubVotes.splice(pubVotes.indexOf(ex), 1); return ok(me); }
      if (!(sc >= 1 && sc <= 5 && Math.round(sc) === sc)) return fail('Score from 1 to 5.');
      var vF = { id: vid, itemId: sI.id, issueId: sI.issueId, username: me.username, score: sc, note: String(p.note || '').trim().slice(0, 300), at: now };
      if (ex) Object.assign(ex, vF); else pubVotes.push(vF);
      return ok(me);
    }
    if (a === 'saveTask' || a === 'setTaskDone' || a === 'deleteTask' || a === 'taskStep'){
      var lead = adm || me.role === 'scheduler', selfOf = function(t){ return t.createdBy === me.username && t.assignees.length === 1 && t.assignees[0] === me.username; };
      var canPostU = function(u){ var x = find(u); return !!x && divCanPost(x.division, divisions); };
      var uniq = function(list){ return list.map(function(u){ return String(u).trim(); }).filter(function(u, i, arr){ return u && arr.indexOf(u) === i; }); };
      if (a === 'saveTask'){
        var tkT = String(p.title || '').trim(); if (tkT.length < 3) return fail('Write what needs to be done.');
        var tkX = p.id ? tasks.filter(function(x){ return x.id === p.id; })[0] : null; if (p.id && !tkX) return fail('That task was not found.');
        if (tkX && !lead && !selfOf(tkX)) return fail('Only the person who gave this task, a division leader or an admin can change it.');
        var tpl = taskTpl(p.template || (tkX && tkX.template) || 'other');
        var who = Array.isArray(p.who) ? p.who : [];
        var started = tkX && taskStepsOf(tkX).some(function(s){ return s.doneAt; });
        var base = started && tkX.template === tpl.id ? taskStepsOf(tkX) : tpl.steps.map(function(s, i){ return { id: 's' + (i + 1), name: s[0], skill: s[1], type: s[2], who: [], doneBy: '', doneAt: '' }; });
        if (started && tkX.template !== tpl.id) return fail('Work has started, so the type of output can’t change now.');
        var steps = base.map(function(s, i){
          var w = s.doneAt ? s.who : uniq(Array.isArray(who[i]) ? who[i] : String(who[i] || '').split(','));
          if (!lead && !s.doneAt) w = s.type === 'proof' ? [] : s.type === 'post' ? (canPostU(me.username) ? [me.username] : []) : [me.username];     // staff: a task for themselves (someone else proofreads)
          return Object.assign({}, s, { who: w });
        });
        // posting: only Bantayog, Social Media and Special Projects staff; left empty, it goes to whoever did the first step (the designer has the file)
        steps.forEach(function(s){ if (s.type === 'post' && !s.doneAt && !s.who.length && steps[0].type === 'work') s.who = steps[0].who.filter(canPostU); });
        if (steps.some(function(s){ return s.type === 'post' && !s.doneAt && s.who.some(function(u){ return !canPostU(u); }); })) return fail('Only Bantayog, Social Media and Special Projects staff can post.');
        var bad = steps.filter(function(s){ return s.type === 'work' && !s.who.length; })[0]; if (bad) return fail('Pick who does “' + bad.name + '”.');
        var all = uniq([].concat.apply([], steps.map(function(s){ return s.who; })));
        if (all.some(function(u){ var x = find(u); return !x || !x.active; })) return fail('Pick people from the list.');
        var tkF = { title: tkT.slice(0, 140), template: tpl.id, kind: tpl.name, note: String(p.note || '').trim().slice(0, 600), steps: steps, assignees: all,
          due: /^\d{4}-\d\d-\d\d$/.test(p.due || '') ? p.due : '', eventId: String(p.eventId || ''), updatedBy: me.username, updatedAt: now };
        if (tkX){ delete tkX.flow; delete tkX.stage; Object.assign(tkX, tkF); log(me, 'Edited a task', all.join(', '), tkF.title); return ok(me, { id: tkX.id }); }
        var tkN = Object.assign({ id: 'k' + nid(), status: 'Open', doneBy: '', doneAt: '', sentBack: null, createdBy: me.username, createdAt: now }, tkF); tasks.push(tkN);
        log(me, all.length === 1 && all[0] === me.username ? 'Added a task for themselves' : 'Gave a task', all.join(', '), tkF.title); return ok(me, { id: tkN.id });
      }
      var tkO = tasks.filter(function(x){ return x.id === p.id; })[0]; if (!tkO) return fail('That task was not found.');
      var st = taskStepsOf(tkO), cur = st.filter(function(s){ return !s.doneAt; })[0], ci = cur ? st.indexOf(cur) : st.length;
      var finish = function(){ tkO.steps = st; var last = !st.some(function(s){ return !s.doneAt; }); tkO.status = last ? 'Done' : 'Open'; tkO.doneBy = last ? me.username : ''; tkO.doneAt = last ? now : ''; tkO.updatedBy = me.username; tkO.updatedAt = now; delete tkO.flow; delete tkO.stage; };
      var mayDo = function(s){ if (s.type === 'post' && !canPostU(me.username)) return false; if (lead) return true; if (s.who.length) return s.who.indexOf(me.username) >= 0; return s.type === 'proof' || s.type === 'post' || tkO.assignees.indexOf(me.username) >= 0; };
      if (a === 'setTaskDone'){   // one-step tasks: the round check
        if (st.length !== 1) return fail('This task has steps. Finish them one at a time.');
        if (!mayDo(st[0])) return fail('Only the people on this task can mark it done.');
        var dn = yes(p.done); st[0] = Object.assign({}, st[0], { doneBy: dn ? me.username : '', doneAt: dn ? now : '' }); finish();
        log(me, dn ? 'Finished a task' : 'Reopened a task', tkO.assignees.join(', '), tkO.title); return ok(me);
      }
      if (a === 'taskStep'){
        var note = String(p.note || '').trim().slice(0, 400);
        if (p.step === 'done'){
          if (!cur) return fail('Every step of this task is done.');
          if (cur.type === 'post' && !canPostU(me.username)) return fail('Only Bantayog, Social Media and Special Projects staff can post.');
          if (!mayDo(cur)) return fail('This step is for ' + cur.who.map(function(u){ var x = find(u); return x ? x.name.split(' ')[0] : u; }).join(', ') + '.');
          if (cur.type === 'proof'){
            // proofreading is done by someone other than the person who wrote what is being read
            var prevW = st.slice(0, ci).filter(function(s){ return s.type === 'work'; }).pop();
            if (prevW && prevW.doneBy === me.username) return fail('Someone other than the writer should proofread it.');
            // the proofreader may fix the caption right here; a changed caption counts as edits
            var pText = p.text == null ? null : String(p.text).trim().slice(0, 5000), changed = pText != null && pText !== (tkO.caption || '');
            if (pText != null && tkO.caption != null && !pText) return fail('The caption can’t be empty.');
            if (changed) tkO.caption = pText;
            st[ci] = Object.assign({}, cur, { doneBy: me.username, doneAt: now, edits: yes(p.edits) || changed, note: note }, tkO.caption ? { text: tkO.caption } : {});
          } else if (isCaptionStep(cur)){
            // the caption itself is kept on the task, so the proofreader can read it and whoever posts can copy it
            var cText = String(p.text || '').trim().slice(0, 5000); if (!cText) return fail('Write or paste the caption.');
            tkO.caption = cText; st[ci] = Object.assign({}, cur, { doneBy: me.username, doneAt: now, note: note, text: cText });
          } else st[ci] = Object.assign({}, cur, { doneBy: me.username, doneAt: now, note: note });
          tkO.sentBack = null; finish();
          log(me, cur.type === 'proof' ? (yes(p.edits) ? 'Proofread a task and made edits' : 'Proofread a task') : cur.type === 'post' ? 'Posted a task' : 'Finished a task step', tkO.assignees.join(', '), tkO.title + ' · ' + cur.name);
          return ok(me);
        }
        if (p.step === 'back'){
          if (!cur || cur.type !== 'proof') return fail('Only a task in proofreading can be sent back.');
          if (!mayDo(cur)) return fail('Only the proofreaders can send it back.');
          if (!note) return fail('Write what needs to change.');
          var wi = -1; for (var k = ci - 1; k >= 0; k--){ if (st[k].type === 'work'){ wi = k; break; } } if (wi < 0) return fail('There is no earlier step to send it back to.');
          for (var j = wi; j < st.length; j++) st[j] = Object.assign({}, st[j], { doneBy: '', doneAt: '', edits: false, note: '' });
          tkO.sentBack = { by: me.username, at: now, note: note, step: st[wi].name }; finish();
          log(me, 'Sent a task back for changes', tkO.assignees.join(', '), tkO.title + ' · ' + st[wi].name); return ok(me);
        }
        if (p.step === 'undo'){
          var li = -1; st.forEach(function(s, i){ if (s.doneAt) li = i; }); if (li < 0) return fail('No step is done yet.');
          if (!lead && st[li].doneBy !== me.username) return fail('Only the person who finished that step can undo it.');
          st[li] = Object.assign({}, st[li], { doneBy: '', doneAt: '', edits: false, note: '' }); finish();
          log(me, 'Undid a task step', tkO.assignees.join(', '), tkO.title + ' · ' + st[li].name); return ok(me);
        }
        return fail('Unknown step.');
      }
      if (!lead && !selfOf(tkO)) return fail('Only the person who gave this task, a division leader or an admin can remove it.');
      tasks.splice(tasks.indexOf(tkO), 1); log(me, 'Removed a task', tkO.assignees.join(', '), tkO.title); return ok(me);
    }
    if (a === 'saveItem' || a === 'checkoutItem' || a === 'checkinItem' || a === 'setItemStatus' || a === 'deleteItem'){
      if (!canInv(me)) return fail('Inventory is for the Production team and admins.');
      if (a === 'saveItem'){
        var itN = String(p.name || '').trim(); if (itN.length < 2) return fail('Write the item name.');
        var itX = p.id ? inventory.filter(function(x){ return x.id === p.id; })[0] : null; if (p.id && !itX) return fail('That item was not found.');
        var itF = { name: itN, category: String(p.category || 'Other').slice(0, 40), tag: String(p.tag || '').trim().slice(0, 40), serial: String(p.serial || '').trim().slice(0, 60), note: String(p.note || '').trim().slice(0, 300), updatedBy: me.username, updatedAt: now };
        if (itX){ Object.assign(itX, itF); log(me, 'Edited equipment', itN); return ok(me, { id: itX.id }); }
        var itNew = Object.assign({ id: 'i' + nid(), status: 'Available', holder: '', eventId: '', dueBack: '', outAt: '', history: [], createdBy: me.username, createdAt: now }, itF);
        inventory.push(itNew); log(me, 'Added equipment', itN); return ok(me, { id: itNew.id });
      }
      var itO = inventory.filter(function(x){ return x.id === p.id; })[0]; if (!itO) return fail('That item was not found.');
      var itH = function(act, who, note){ itO.history = [{ at: now, by: me.username, act: act, who: who || '', note: String(note || '').slice(0, 200) }].concat(itO.history || []).slice(0, 20); itO.updatedBy = me.username; itO.updatedAt = now; };
      if (a === 'deleteItem'){ if (me.role !== 'admin') return fail('Only an admin can delete equipment.'); inventory.splice(inventory.indexOf(itO), 1); log(me, 'Deleted equipment', itO.name); return ok(me); }
      if (a === 'checkoutItem'){ if (itO.status !== 'Available') return fail('This item is not available.'); var itU = find(p.holder); if (!itU) return fail('Pick who is borrowing it.');
        itO.status = 'Out'; itO.holder = itU.username; itO.eventId = String(p.eventId || ''); itO.dueBack = /^\d{4}-\d\d-\d\d$/.test(p.dueBack || '') ? p.dueBack : ''; itO.outAt = now; itH('Checked out', itU.username, p.note); log(me, 'Checked out equipment', itO.name, itU.username); return ok(me); }
      if (a === 'checkinItem'){ if (itO.status !== 'Out') return fail('This item is not checked out.'); var itB = itO.holder; itO.status = 'Available'; itO.holder = ''; itO.eventId = ''; itO.dueBack = ''; itO.outAt = ''; itH('Returned', itB, p.note); log(me, 'Returned equipment', itO.name, itB); return ok(me); }
      if (['Available', 'Repair', 'Missing'].indexOf(p.status) < 0) return fail('Unknown status.');
      itO.status = p.status; itO.holder = ''; itO.eventId = ''; itO.dueBack = ''; itO.outAt = ''; itH(p.status === 'Available' ? 'Marked available' : p.status === 'Repair' ? 'Sent for repair' : 'Marked missing', '', p.note); log(me, 'Updated equipment', itO.name, p.status); return ok(me);
    }
    if (a === 'saveEvent' || a === 'setEventStatus' || a === 'deleteEvent' || a === 'assignEvent' || a === 'rescheduleEvent' || a === 'mergeEvent' || a === 'markNotDup'){
      if (!(adm || me.role === 'scheduler')) return fail('Only a division leader or an admin can do that.');
      if (a === 'saveEvent'){
        var evT = String(p.title || '').trim(), evV = String(p.venue || '').trim(), ev1 = String(p.date || ''), ev2 = String(p.dateTo || '') || ev1;
        if (evT.length < 3) return fail('Write the event name.');
        if (!/^\d{4}-\d\d-\d\d$/.test(ev1)) return fail('Pick the event date.');
        if (ev2 < ev1) return fail('The end date is before the start date.');
        var evX = p.id ? events.filter(function(x){ return x.id === p.id; })[0] : null;
        if (p.id && !evX) return fail('That event was not found.');
        var evF = { title: evT, venue: evV, date: ev1, dateTo: ev2, time: /^\d\d:\d\d$/.test(p.time || '') ? p.time : '', requester: String(p.requester || '').trim().slice(0, 120), needs: (Array.isArray(p.needs) ? p.needs : []).map(String).filter(Boolean).slice(0, 12), note: String(p.note || '').trim().slice(0, 400), timeEnd: /^\d\d:\d\d$/.test(p.timeEnd || '') ? p.timeEnd : '', kind: p.kind === 'tasking' && !(function(){ for (var d = ev1; d <= (ev2 || ev1); d = addDays(d, 1)){ var w = new Date(d + 'T00:00:00').getDay(); if (w === 0 || w === 6) return true; if (d > addDays(ev1, 31)) break; } return false; })() ? 'tasking' : 'travel', contact: String(p.contact || '').trim().slice(0, 120), needOther: String(p.needOther || '').trim().slice(0, 120), updatedBy: me.username, updatedAt: now };
        if (evF.time && evF.timeEnd && ev1 === ev2 && evF.timeEnd <= evF.time) return fail('The end time is before the start time.');
        if (evX){ Object.assign(evX, evF); if (!adm && evX.status === 'Confirmed'){ evX.status = 'Pending'; evX.confirmedBy = ''; evX.confirmedAt = ''; } log(me, 'Edited an event', evT, ev1); return ok(me, { id: evX.id }); }
        var evN = Object.assign({ id: 'ev' + nid(), status: adm ? 'Confirmed' : 'Pending', createdBy: me.username, createdAt: now, confirmedBy: adm ? me.username : '', confirmedAt: adm ? now : '' }, evF);
        // the person looked at the likely duplicates and said this one is different: do not flag that pair again
        var nd = String(p.notDupIds || '').split(',').filter(function(x){ return x && events.some(function(y){ return y.id === x; }); });
        if (nd.length && p.notDupOk) evN.notDup = nd;
        events.push(evN); log(me, 'Added an event', evT, ev1 + ' · ' + evV); return ok(me, { id: evN.id });
      }
      var evO = events.filter(function(x){ return x.id === p.id; })[0]; if (!evO) return fail('That event was not found.');
      if (a === 'assignEvent'){ if (evO.status === 'Cancelled') return fail('This event is cancelled.');
        var evW = (Array.isArray(p.users) ? p.users : []).map(String).filter(function(u, i, arr){ return arr.indexOf(u) === i && users.some(function(x){ return x.username === u && x.active; }); });
        evO.assigned = evW; evO.crewOpen = p.open === '1' && evW.length < 2; evO.assignedBy = me.username; evO.assignedAt = now; evO.updatedBy = me.username; evO.updatedAt = now;
        var adIn = {}; try { adIn = p.days ? JSON.parse(p.days) : {}; } catch(e9){ adIn = {}; }
        var adOut = {}, adE2 = evO.dateTo || evO.date;
        evW.forEach(function(u){ var ds = (Array.isArray(adIn[u]) ? adIn[u] : []).map(String).filter(function(d, i, arr){ return /^\d{4}-\d\d-\d\d$/.test(d) && d >= evO.date && d <= adE2 && arr.indexOf(d) === i; }).sort(); if (ds.length) adOut[u] = ds; });
        if (Object.keys(adOut).length) evO.assignDays = adOut; else delete evO.assignDays;
        log(me, 'Updated a dispatch order', evO.title, evW.length + ' person(s)'); return ok(me, { id: evO.id }); }
      if (a === 'rescheduleEvent'){
        var rd1 = String(p.date || ''), rd2 = String(p.dateTo || '') || rd1;
        if (!/^\d{4}-\d\d-\d\d$/.test(rd1)) return fail('Pick the new date.');
        if (rd2 < rd1) return fail('The end date is before the start date.');
        if (rd1 === evO.date && rd2 === (evO.dateTo || evO.date)) return fail('That is the same date. Pick the new one.');
        var span = function(x, y){ return x === y ? x : x + ' to ' + y; };
        evO.moves = (evO.moves || []).concat([{ from: span(evO.date, evO.dateTo || evO.date), to: span(rd1, rd2), note: String(p.note || '').trim().slice(0, 200), by: me.username, at: now }]).slice(-10);
        evO.date = rd1; evO.dateTo = rd2; evO.updatedBy = me.username; evO.updatedAt = now;
        if (!adm && evO.status === 'Confirmed'){ evO.status = 'Pending'; evO.confirmedBy = ''; evO.confirmedAt = ''; }
        log(me, 'Rescheduled an event', evO.title, evO.moves[evO.moves.length - 1].from + ' → ' + evO.moves[evO.moves.length - 1].to); return ok(me, { id: evO.id }); }
      if (a === 'markNotDup'){
        var evB = events.filter(function(x){ return x.id === p.other; })[0]; if (!evB) return fail('That event was not found.');
        evO.notDup = (evO.notDup || []).filter(function(x){ return x !== evB.id; }).concat([evB.id]); evB.notDup = (evB.notDup || []).filter(function(x){ return x !== evO.id; }).concat([evO.id]);
        evO.updatedBy = evB.updatedBy = me.username; evO.updatedAt = evB.updatedAt = now;
        log(me, 'Marked two events as different', evO.title, evB.title); return ok(me); }
      if (a === 'mergeEvent'){
        // remove a duplicate entry; its people and travel orders move to the event that is kept
        var keep = p.into ? events.filter(function(x){ return x.id === p.into && x.id !== evO.id; })[0] : null;
        if (p.into && !keep) return fail('The event to keep was not found.');
        var its = tos.filter(function(t){ return t.eventId === evO.id; });
        if (its.length && !adm) return fail('This event has travel orders. Ask an admin to remove the duplicate.');
        if (!keep && its.length) return fail('Pick the event to keep, so its travel orders are not left without one.');
        if (keep){
          its.forEach(function(t){ t.eventId = keep.id; t.updatedBy = me.username; t.updatedAt = now; });
          (evO.assigned || []).forEach(function(u){ keep.assigned = keep.assigned || []; if (keep.assigned.indexOf(u) < 0) keep.assigned.push(u); });
          (evO.needs || []).forEach(function(n){ keep.needs = keep.needs || []; if (keep.needs.indexOf(n) < 0) keep.needs.push(n); });
          ['venue', 'time', 'timeEnd', 'requester', 'contact'].forEach(function(k){ if (!keep[k] && evO[k]) keep[k] = evO[k]; });
          keep.notDup = (keep.notDup || []).filter(function(x){ return x !== evO.id; });
          keep.updatedBy = me.username; keep.updatedAt = now;
        }
        events.splice(events.indexOf(evO), 1);
        log(me, 'Removed a duplicate event', evO.title, evO.date + (keep ? ' · kept ' + keep.title : '') + (p.note ? ' · ' + String(p.note).slice(0, 200) : ''));
        return ok(me, { id: keep ? keep.id : '' }); }
      if (a === 'deleteEvent'){ if (!adm && evO.status !== 'Pending') return fail('Only an admin can delete a confirmed event.'); events.splice(events.indexOf(evO), 1); log(me, 'Deleted an event', evO.title, evO.date); return ok(me); }
      if (['Confirmed', 'Pending', 'Cancelled'].indexOf(p.status) < 0) return fail('Unknown status.');
      if (p.status === 'Confirmed' && !adm) return fail('Only an admin can confirm an event.');
      evO.status = p.status; evO.updatedBy = me.username; evO.updatedAt = now; if (p.status === 'Confirmed'){ evO.confirmedBy = me.username; evO.confirmedAt = now; }
      if (p.status === 'Cancelled'){ evO.removeReason = 'Cancelled'; evO.removeNote = String(p.note || '').trim().slice(0, 200); } else { delete evO.removeReason; delete evO.removeNote; }
      log(me, p.status === 'Confirmed' ? 'Confirmed an event' : p.status === 'Cancelled' ? 'Cancelled an event' : 'Reopened an event', evO.title, evO.date); return ok(me);
    }
    if (a === 'moveUse'){ var mu = entries.filter(function(e){ return e.id === p.id; })[0];
      if (!mu || mu.type !== 'USE' || mu.status !== 'Confirmed') return fail('Only approved days off can be rescheduled.');
      if (mu.toId) return fail('This day off came from a travel order. Edit the travel order instead.');
      if (!adm && mu.username !== me.username) return fail('You can only reschedule your own day off.');
      if (mu.date < today()) return fail('A day off that already passed cannot be moved.');
      if (!p.date || p.date < today()) return fail('Pick a date from today onward.');
      if (p.date === mu.date) return fail('Pick a different date.');
      if (entries.some(function(e){ return e !== mu && e.username === mu.username && e.type === 'USE' && e.date === p.date; })) return fail('That date already has a day off.');
      var was = mu.date; mu.movedFrom = was; mu.movedAt = now; mu.date = p.date;
      // its day-off travel order moves with it while not yet prepared; a prepared one is cancelled and a new one started
      // (only when an admin reschedules: staff cannot change travel orders, so theirs is left for an admin to fix)
      var mt = adm && mu.autoToId && tos.filter(function(t){ return t.id === mu.autoToId; })[0];
      if (!adm){}
      else if (mt && mt.status === 'Filed'){ var me2 = p.date; for (var k2 = 1; k2 < Math.ceil(mu.days); k2++) me2 = addDays(me2, 1); mt.dateFrom = p.date; mt.dateTo = me2; mt.updatedAt = now; }
      else { if (mt){ mt.status = 'Cancelled'; mt.statusAt = now; } mu.autoToId = ''; autoTO(mu, me, now); }
      log(me, 'Rescheduled a day off', mu.username, was + ' to ' + p.date); return ok(me); }
    // Division leaders assign people to events; only admins and the staff themselves file travel orders.
    if ((a === 'saveTO' || a === 'deleteTO') && me.role === 'scheduler') return fail('Division leaders assign people to the event. An admin files and prepares the travel order.');
    if (a === 'saveTO'){ var nm = String(p.names||'').split('\n').map(function(s){ return s.trim().toUpperCase(); }).filter(Boolean); if (!nm.length) return fail('Add at least one person.'); if (!String(p.event||'').trim()) return fail('Purpose is required.'); if (!String(p.destination||'').trim()) return fail('Location is required.'); if (!p.dateFrom) return fail('Pick a valid date.');
      var tf = { dateFrom:p.dateFrom, dateTo:p.dateTo || p.dateFrom, event:p.event.trim(), destination:(p.destination||'').trim(), names:nm, toType:(p.toType === 'dayoff' ? 'dayoff' : 'regular'), eventId:String(p.eventId || ''), updatedBy:me.username, updatedAt:now };
      if (tf.dateTo < tf.dateFrom) return fail('The end date is before the start date.');
      if (tf.eventId === '__new'){
        tf.eventId = '';
        if (tf.toType === 'regular'){
          var evTitle = tf.event.replace(/^to\s+(cover|document|livestream|attend|join|assist( in)?|serve as emcee (for|of)|emcee|facilitate|support)\s+(the\s+)?/i, '');
          evTitle = evTitle.charAt(0).toUpperCase() + evTitle.slice(1);
          var evM = { id: 'ev' + nid(), title: evTitle.slice(0, 160), venue: tf.destination, date: tf.dateFrom, dateTo: tf.dateTo, time: '', timeEnd: '', kind: 'travel', requester: '', contact: '', needs: [], needOther: '', note: 'Made from a travel order.', status: adm ? 'Confirmed' : 'Pending', createdBy: me.username, createdAt: now, confirmedBy: adm ? me.username : '', confirmedAt: adm ? now : '', updatedBy: me.username, updatedAt: now };
          events.push(evM); tf.eventId = evM.id; log(me, 'Added an event from a travel order', evM.title, evM.date);
        }
      }
      if (tf.eventId && !events.some(function(e){ return e.id === tf.eventId; })) tf.eventId = '';
      if (p.id){ var ex1 = tos.filter(function(t){ return t.id === p.id; })[0]; if (!adm && me.role !== 'scheduler' && (ex1.createdBy !== me.username || ex1.status !== 'Filed')) return fail('Only admins and division leaders can edit someone else’s travel order or one that is prepared.'); Object.assign(ex1, tf); log(me, 'Edited a travel order', tf.event); }
      else { tos.push(Object.assign({ id:'t' + nid(), toNo:'', status:'Filed', tev:'', createdBy:me.username, createdAt:now, usernames:[] }, tf)); log(me, 'Filed a travel order', tf.event, tf.dateFrom + ' · ' + nm.join(', ')); }
      return ok(me); }
    if (a === 'deleteTO'){ var dt = tos.filter(function(t){ return t.id === p.id; })[0]; if (!adm && (dt.createdBy !== me.username || dt.status !== 'Filed')) return fail('You can only delete your own travel orders that are not yet prepared.'); if (dt.offsetDone){ entries = entries.filter(function(e){ return !(e.toId === dt.id && e.type === 'USE'); }); log(me, 'Returned offset for a deleted day-off travel order', dt.event); } tos = tos.filter(function(t){ return t !== dt; }); log(me, 'Deleted a travel order', dt.event); return ok(me); }
    if (a === 'setPhoto'){ var phu = find(p.username); if (!phu) return fail('Employee not found.'); if (!adm && phu.username !== me.username) return fail('You can only change your own photo.');
      var ph = String(p.photo || ''); if (ph && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(ph) || ph.length > 140000)) return fail('That picture could not be used. Try another one.');
      phu.photo = ph; log(me, ph ? 'Changed a profile photo' : 'Removed a profile photo', phu.username); return ok(me); }
    if (a === 'setSkills'){ if (!(adm || me.role === 'scheduler')) return fail('Only admins and division leaders can change skills.'); var sk = find(p.username); if (!sk) return fail('Employee not found.'); sk.skills = (Array.isArray(p.skills) ? p.skills : []).map(String).filter(function(x, i, arr){ return SKILLS.indexOf(x) >= 0 && arr.indexOf(x) === i; }); log(me, 'Changed skills', p.username, sk.skills.join(', ') || 'none'); return ok(me); }
    if (a === 'planGear'){ var gp = events.filter(function(x){ return x.id === p.id; })[0]; if (!gp) return fail('Event not found.');
      var prodDiv = divisions.some(function(d){ return d.id === me.division && /production/i.test(d.name || ''); });
      if (!(adm || me.role === 'scheduler' || prodDiv)) return fail('Only Social Media and Production, division leaders or admins can plan equipment.');
      gp.gear = (Array.isArray(p.items) ? p.items : []).map(String).filter(function(id, i, arr){ return arr.indexOf(id) === i && inventory.some(function(x){ return x.id === id; }); });
      gp.gearHolder = String(p.holder || ''); gp.gearBy = me.username; gp.gearAt = now;
      log(me, 'Planned equipment for an event', gp.title, gp.gear.length + ' item(s)'); return ok(me, { id: gp.id }); }
    if (!adm) return fail('Only admins can do that.');
    if (a === 'markTOPrinted'){ (p.ids || []).forEach(function(i9){ var t9 = tos.filter(function(t){ return t.id === i9; })[0]; if (t9 && t9.status === 'Prepared' && !t9.printedAt){ t9.printedAt = now; t9.printedBy = me.username; } }); log(me, 'Printed travel orders', String((p.ids || []).length)); return ok(me); }
    if (a === 'setTOStatus'){ var st2 = tos.filter(function(t){ return t.id === p.id; })[0]; if (st2.status !== p.status) st2.statusAt = now; st2.status = p.status; st2.tev = p.tev; st2.toNo = p.toNo || ''; st2.datePrepared = p.datePrepared || st2.datePrepared || (p.status === 'Prepared' ? today() : ''); log(me, 'Updated a travel order', st2.event, 'Status: ' + p.status + ' · TEV: ' + (p.tev || 'not set'));
      if (p.status === 'Cancelled' && st2.offsetDone && !st2.useEntryId){ var gone = entries.filter(function(e){ return e.toId === st2.id && e.type === 'USE'; }).length;
        // a request that was approved through this travel order goes back to waiting; days it made are removed
        entries.forEach(function(e){ if (e.toId === st2.id && e.type === 'USE' && e.fromRequest){ e.status = 'Pending'; delete e.toId; delete e.fromRequest; e.reviewedBy = ''; e.reviewedAt = ''; } });
        entries = entries.filter(function(e){ return !(e.toId === st2.id && e.type === 'USE'); }); st2.offsetDone = false; log(me, 'Returned offset for a cancelled day-off travel order', st2.event, gone + ' day(s)'); }
      var cut = 0; if (p.status === 'Prepared' && st2.toType === 'dayoff' && !st2.offsetDone && !st2.useEntryId){
        // the days to take: exactly the ones ticked when preparing (older apps send none: then every day, as before)
        var pick = null; try { pick = p.dayoffDays != null ? JSON.parse(p.dayoffDays) : null; } catch(e9){ pick = null; }
        st2.names.forEach(function(nm3){ var u3 = users.filter(function(x){ return x.name.toUpperCase() === nm3; })[0]; if (!u3) return;
          for (var dd = st2.dateFrom; dd <= st2.dateTo; dd = addDays(dd, 1)){
            if (pick && pick.indexOf(u3.username + '|' + dd) < 0) continue;
            var had = entries.filter(function(e){ return e.username === u3.username && e.type === 'USE' && e.date === dd && e.status !== 'Rejected' && !e._del; })[0];
            if (had && had.status === 'Confirmed') continue;                 // already a day off: never taken twice
            if (bal(u3.username) < (had ? had.days : 1) && !yes(p.override)) break;
            if (had){ had.status = 'Confirmed'; had.toId = st2.id; had.fromRequest = true; had.reviewedBy = me.username; had.reviewedAt = now; cut += had.days; continue; }   // their own request
            entries.push({ id:'e' + nid(), username:u3.username, type:'USE', date:dd, category:'Used', days:1, event:'', venue:'', endTime:'', toId:st2.id, status:'Confirmed', note:'Day-off travel order', createdBy:me.username, createdAt:now, reviewedBy:me.username, reviewedAt:now }); cut++; } });
        st2.offsetDone = true; st2.offsetDays = cut; log(me, 'Deducted offset for a day-off travel order', st2.event, cut + ' day(s)'); }
      var made = 0; if (p.tev === 'Yes' && p.status !== 'Cancelled') st2.names.forEach(function(nm2){ if (tevs.some(function(v){ return v.toId === st2.id && v.name === nm2; })) return; var u2 = users.filter(function(x){ return x.name.toUpperCase() === nm2; })[0]; if (u2 && u2.empType === 'COS') return; tevs.push({ id:'v' + nid(), toId:st2.id, name:nm2, username:u2 ? u2.username : '', status:'To prepare', transpo:0, food:0, lodging:0, other:0, total:0, submittedOn:'', releasedOn:'', chequeNo:'', note:'' }); made++; });
      return ok(me, { tevsMade: made, offsetUsed: cut }); }
    if (a === 'saveTEV'){ var am = function(k){ return Math.round((Number(p[k]) || 0) * 100) / 100; }, td3 = new Date().toISOString().slice(0,10);
      var vf = { status: p.status, transpo: am('transpo'), food: am('food'), lodging: am('lodging'), other: am('other'), chequeNo: p.chequeNo || '', note: p.note || '', submittedOn: p.submittedOn || (p.status !== 'To prepare' ? td3 : ''), releasedOn: p.releasedOn || (p.status === 'Claimed' ? td3 : '') };
      vf.total = Math.round((vf.transpo + vf.food + vf.lodging + vf.other) * 100) / 100;
      if (Array.isArray(p.days)) vf.days = p.days.map(function(d){ return { date: String(d.date), b: !!d.b, l: !!d.l, d: !!d.d, lodge: !!d.lodge, inc: !!d.inc }; });
      if (p.trip && p.toId0){ var tt0 = tos.filter(function(t){ return t.id === p.toId0; })[0]; if (tt0) tt0.trip = { scope: String(p.trip.scope || ''), far: !!p.trip.far, gov: !!p.trip.gov, dep: String(p.trip.dep || ''), arr: String(p.trip.arr || '') }; }
      if (p.id){ var ev2 = tevs.filter(function(v){ return v.id === p.id; })[0]; if (!ev2) return fail('TEV not found.'); if (ev2.status !== vf.status) vf.statusAt = now; Object.assign(ev2, vf); }
      else { var tt = tos.filter(function(t){ return t.id === p.toId; })[0]; if (!tt) return fail('Pick a travel order.'); var u3 = users.filter(function(x){ return x.name.toUpperCase() === String(p.name).toUpperCase(); })[0]; tevs.push(Object.assign({ id:'v' + nid(), toId:tt.id, name:String(p.name).toUpperCase(), username:u3 ? u3.username : '' }, vf)); }
      log(me, p.id ? 'Updated a TEV' : 'Added a TEV', p.name || '', vf.status + ' · ₱' + vf.total); return ok(me); }
    if (a === 'setTEVStatus'){ var td4 = new Date().toISOString().slice(0,10), nn = 0; tevs.forEach(function(v){ if ((p.ids||[]).indexOf(v.id) < 0) return; if (v.status !== p.status) v.statusAt = now; v.status = p.status; if (!v.submittedOn) v.submittedOn = td4; if (p.status === 'Claimed' && !v.releasedOn) v.releasedOn = td4; nn++; }); log(me, 'Claimed TEVs', '', nn + ' TEV(s)'); return ok(me, { updated: nn }); }
    if (a === 'saveTevSetup'){ settings = Object.assign({}, settings, { tev: p.tev || {} }); log(me, 'Changed TEV rates and signatories', ''); return ok(me); }
    if (a === 'renameUser'){ if (!adm) return fail('Only admins can rename staff.'); var ru2 = find(p.username); if (!ru2) return fail('Employee not found.');
      var nn2 = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (nn2.length < 2) return fail('Type the full name.');
      if (users.some(function(x){ return x !== ru2 && x.name.toUpperCase() === nn2.toUpperCase(); })) return fail('Someone else already has that name.');
      var o2 = ru2.name.toUpperCase(), n2 = nn2.toUpperCase(), fixed = 0; ru2.name = nn2;
      // travel orders and TEVs keep the name in capitals; fix those too
      tos.forEach(function(t){ var hit = false; t.names = (t.names || []).map(function(x){ if (x === o2){ hit = true; return n2; } return x; }); if (hit){ fixed++; linkTO(t); } });
      tevs.forEach(function(v){ if (v.name === o2 || (v.username === ru2.username && v.name !== n2)){ v.name = n2; v.username = ru2.username; } });
      log(me, 'Renamed an employee', p.username, o2 + ' → ' + n2 + (fixed ? ' · ' + fixed + ' travel order(s) updated' : '')); return ok(me); }
    if (a === 'setPosition'){ var pu = find(p.username); if (!pu) return fail('Employee not found.'); pu.position = String(p.position || '').trim().slice(0, 60); log(me, 'Changed a position', p.username, pu.position); return ok(me); }
    if (a === 'deleteTEV'){ tevs = tevs.filter(function(v){ return v.id !== p.id; }); log(me, 'Deleted a TEV', ''); return ok(me); }
    if (a === 'syncHolidays') return ok(me, { added: 0 });
    if (a === 'setEmpType'){ find(p.username).empType = p.empType; log(me, 'Changed employment type', p.username, p.empType); return ok(me); }
    if (a === 'recordLeave'){ var lu = find(p.username), b = (function(){ var L0 = S.leaves, C0 = S.credits; S.leaves = leaves; S.credits = credits; var r0 = leaveBal(lu.username, p.dateFrom.slice(0,4)); S.leaves = L0; S.credits = C0; return r0; })(), r = LEAVE_TYPES[p.type], dd2 = Number(p.days), sh = '';
      if (r.pool === 'VL' && dd2 > b.vl) sh = 'Only ' + fD(b.vl) + ' of vacation leave left.'; if (r.pool === 'SL' && dd2 > b.sl) sh = 'Only ' + fD(b.sl) + ' of sick leave left.';
      var cp = p.type === 'WL' ? settings.wellnessDays : r.year; if (cp && (b.used[p.type] || 0) + dd2 > cp) sh = r.name + ': only ' + fD(Math.max(cp - (b.used[p.type] || 0), 0)) + ' left this year.';
      if (sh && !p.override) return fail(sh + ' Record the rest as Leave Without Pay.');
      leaves.push({ id:'l' + nid(), username:lu.username, type:p.type, dateFrom:p.dateFrom, dateTo:p.dateTo || p.dateFrom, days:dd2, note:p.note || '', createdBy:me.username, createdAt:now }); log(me, 'Recorded a leave', lu.username, r.name + ' · ' + p.dateFrom + ' · ' + dd2 + ' day(s)'); return ok(me); }
    if (a === 'deleteLeave'){ leaves = leaves.filter(function(l){ return l.id !== p.id; }); log(me, 'Removed a leave record', ''); return ok(me); }
    if (a === 'setCredits'){ credits = credits.filter(function(c){ return c.username !== p.username; }); credits.push({ username:p.username, vl:Number(p.vl), sl:Number(p.sl), asOf:p.asOf }); log(me, 'Set leave balances', p.username, 'VL ' + p.vl + ' · SL ' + p.sl); return ok(me); }
    if (a === 'adjustLeave'){ if (!Number(p.days)) return fail('Enter the number of days to add (or a negative number to deduct).'); if (!String(p.note||'').trim()) return fail('Reason is required.'); leaves.push({ id:'l' + nid(), username:p.username, type:'ADJ-' + p.pool, dateFrom:today(), dateTo:today(), days:Number(p.days), note:p.note, createdBy:me.username, createdAt:now }); log(me, 'Adjusted leave credits', p.username, p.pool + ' ' + p.days); return ok(me); }
    if (a === 'review' || a === 'reviewMany'){ var ids = a === 'review' ? [p.id] : p.ids, c = 0, skippedShort = false;
      if (a === 'review' && entries.some(function(e){ return e.id === p.id && e.username === me.username; }) && others(me)) return fail('Another admin needs to review your own entry.');
      entries.forEach(function(e){ if (ids.indexOf(e.id) < 0 || e.status !== 'Pending' || (e.username === me.username && others(me))) return; var shortU = e.type === 'USE' && p.decision === 'Confirmed' && e.days > bal(e.username) + (e.early ? earnedNow(e.username) : 0) + 1e-9; if (shortU && !yes(p.override)){ skippedShort = true; return; }
        if (shortU) e.note = 'Approved without enough offset (override)';
        e.status = p.decision; e.reviewedBy = me.username; e.reviewedAt = now; if (p.decision === 'Rejected') e.note = p.note || ''; autoTO(e, me, now); c++; log(me, (p.decision === 'Confirmed' ? 'Approved ' : 'Rejected ') + (e.type === 'USE' ? 'a day-off request' : 'an offset'), e.username, e.date + (p.note ? ' · Reason: ' + p.note : '')); });
      return c ? ok(me, c) : fail(skippedShort ? 'Not enough offset to approve this. Use Approve anyway to approve it below zero.' : 'Nothing was reviewed.'); }
    // admin: the travel order that makes a weekday day off valid, tied to an event of that day (or a new one, or none).
    // It is a day-off travel order: the people on it are not dispatched to the event, and it never deducts again.
    if (a === 'offsetTO'){ if (!adm) return fail('Only an admin can do that.');
      var oe = entries.filter(function(e){ return e.id === p.id && e.type === 'USE' && e.status === 'Confirmed'; })[0]; if (!oe) return fail('That day off was not found.');
      var ou = find(oe.username); if (!ou) return fail('That person was not found.');
      var oev = null;
      if (p.eventId){ oev = events.filter(function(x){ return x.id === p.eventId && x.status !== 'Cancelled'; })[0]; if (!oev) return fail('That event was not found.'); }
      else if (String(p.newTitle || '').trim()){
        var nT = String(p.newTitle).trim().slice(0, 160); if (nT.length < 3) return fail('Write the event name.');
        oev = { id: 'ev' + nid(), status: 'Confirmed', createdBy: me.username, createdAt: now, confirmedBy: me.username, confirmedAt: now, title: nT, venue: String(p.newVenue || '').trim().slice(0, 160), date: oe.date, dateTo: oe.date, time: '', timeEnd: '', requester: '', needs: [], note: '', kind: 'travel', offsetOnly: true };
        events.push(oev); log(me, 'Added an event', nT, oe.date + ' · ' + oev.venue);
      }
      var oEnd = oe.date; for (var k3 = 1; k3 < Math.ceil(oe.days); k3++) oEnd = addDays(oEnd, 1);
      var ot = oe.autoToId && tos.filter(function(t){ return t.id === oe.autoToId && t.status !== 'Cancelled'; })[0];
      if (!ot){ ot = { id: 't' + nid(), toNo: '', status: 'Filed', tev: '', createdBy: me.username, createdAt: now, toType: 'dayoff', offsetDone: true, useEntryId: oe.id, auto: true }; tos.push(ot); oe.autoToId = ot.id; }
      Object.assign(ot, { names: [String(ou.name).toUpperCase()], usernames: [ou.username], dateFrom: oe.date, dateTo: oEnd, event: oev ? 'To cover ' + oev.title : 'Day off (offset use)', destination: oev ? (oev.venue || 'PIO') : 'Day off', eventId: oev ? oev.id : '', toType: 'dayoff', forOffset: true, useEntryId: oe.id, offsetDone: true, updatedBy: me.username, updatedAt: now });
      log(me, 'Set the travel order for a day off', oe.username, oe.date + (oev ? ' · ' + oev.title : ' · no event'));
      return ok(me, { id: ot.id }); }
    // admin: start the missing travel order for an older weekday offset or day off
    if (a === 'startEntryTO'){ if (!adm) return fail('Only an admin can do that.'); var se = entries.filter(function(e){ return e.id === p.id; })[0]; if (!se) return fail('Entry not found.');
      var hadTO = se.autoToId; autoTO(se, me, now); return se.autoToId && se.autoToId !== hadTO ? ok(me) : fail('This one does not need a new travel order (COS, weekend, holiday, or one already covers it).'); }
    if (a === 'recordUse'){ var dy = Number(p.days), early2 = yes(p.early), over = adm && yes(p.override), b = bal(p.username) + (early2 ? earnedNow(p.username) : 0); if (!(dy >= 0.5) || dy > 30 || dy * 2 !== Math.round(dy * 2)) return fail('Days must be in half-day steps, from ½ to 30.'); if (!over && dy > b + 1e-9) return fail(find(p.username).name + ' has only ' + fD(Math.max(b, 0)) + ' available. Tick Override to record it anyway.');
      var rn = over && dy > b + 1e-9 ? 'Recorded without enough offset (override)' : early2 ? 'Uses offsets earned this month' : '';
      entries.push({ id:'e' + nid(), username:p.username, type:'USE', date:p.date, category:'Used', days:dy, event:'', venue:'', endTime:'', status:'Confirmed', note:rn, early: early2, createdBy:me.username, createdAt:now, reviewedBy:me.username, reviewedAt:now }); autoTO(entries[entries.length - 1], me, now); log(me, 'Recorded offset use', p.username, p.date + ' · ' + dy + ' day(s)' + (rn ? ' · ' + rn : '')); return ok(me); }
    if (a === 'addUser'){ var nu = String(p.username||'').trim().toLowerCase(); if (!/^[a-z0-9._-]{3,30}$/.test(nu)) return fail('Usernames use 3–30 letters, numbers, dots or dashes.'); if (find(nu)) return fail('That username is taken.'); if (!/^\d{4}$/.test(p.pin)) return fail('PIN must be exactly 4 digits.'); users.push({ username:nu, name:p.name, role:(['admin','scheduler'].indexOf(p.role) >= 0 ? p.role : 'employee'), division:p.division||'', pin:p.pin, active:true, empType:p.empType || 'JO' }); log(me, 'Added an account', nu, p.role); return ok(me); }
    if (a === 'resetPin'){ if (!/^\d{4}$/.test(p.pin)) return fail('PIN must be exactly 4 digits.'); find(p.username).pin = p.pin; log(me, 'Reset a PIN', p.username); return ok(me); }
    if (a === 'setActive'){ find(p.username).active = p.active; log(me, p.active ? 'Activated an account' : 'Deactivated an account', p.username); return ok(me); }
    if (a === 'setRole'){ if (['admin','employee','scheduler'].indexOf(p.role) < 0) return fail('Unknown role.'); find(p.username).role = p.role; log(me, 'Changed a role', p.username, 'Now ' + p.role); return ok(me); }
    if (a === 'setDivision'){ find(p.username).division = p.division || ''; log(me, 'Changed a division', p.username); return ok(me); }
    if (a === 'removeUser'){ var ru = find(p.username); if (!ru) return fail('User not found.'); if (ru.username === me.username) return fail('You cannot remove your own account. Ask another admin.'); if (ru.role === 'admin' && users.filter(function(u){ return u.role === 'admin' && u.active; }).length <= 1) return fail('This is the only admin. Make someone else an admin first.');
      log(me, 'Removed an account', ru.username, ru.name + ' · balance left: ' + fD(bal(ru.username))); users = users.filter(function(u){ return u !== ru; }); return ok(me); }
    if (a === 'saveDivision'){ if (!String(p.name||'').trim()) return fail('Division name is required.'); var fd2 = { name:p.name.trim(), short:(p.short||'').trim() || p.name.trim(), color:p.color, icon:p.icon, logo:p.logo||'' }, ex = divisions.filter(function(d){ return d.id === p.id; })[0];
      if (ex) Object.assign(ex, fd2); else divisions.push(Object.assign({ id:'d' + nid(), order:divisions.length + 1 }, fd2)); log(me, ex ? 'Edited a division' : 'Added a division', fd2.name); return ok(me); }
    if (a === 'deleteDivision'){ var cc = users.filter(function(u){ return u.division === p.id; }).length; if (cc) return fail('Move the ' + cc + ' staff in this division to another division first.'); divisions = divisions.filter(function(d){ return d.id !== p.id; }); log(me, 'Deleted a division', p.id); return ok(me); }
    if (a === 'saveHoliday'){ if (!p.date || !String(p.name||'').trim()) return fail('Enter a date and a name.'); holidays = holidays.filter(function(h){ return h.date !== p.date; }); holidays.push({ date:p.date, name:p.name.trim(), kind:p.kind }); holidays.sort(function(x,y){ return x.date < y.date ? -1 : 1; }); log(me, 'Added a holiday', p.date, p.name); return ok(me); }
    if (a === 'deleteHoliday'){ holidays = holidays.filter(function(h){ return h.date !== p.date; }); log(me, 'Deleted a holiday', p.date); return ok(me); }
    if (a === 'saveSettings'){ var cap = Number(p.carryCap), wd = Number(p.workdays); if (!(cap >= 0)) return fail('Carry-over cap must be 0 (no limit) or a number of days.'); if (!(wd >= 15 && wd <= 26)) return fail('Workdays must be a whole number from 15 to 26.'); settings = Object.assign({}, settings, { workdays: wd, carryCap: cap, wellnessDays: p.wellnessDays == null ? settings.wellnessDays : Number(p.wellnessDays), tevBudget: p.tevBudget == null ? settings.tevBudget : Number(p.tevBudget) || 0 }); log(me, 'Changed settings', '', 'Carry-over cap: ' + (cap || 'no limit') + ' · Workdays: ' + wd); return ok(me); }
    if (a === 'backupToDrive'){ log(me, 'Saved a backup to Google Drive', 'Preview'); return ok(me, { url: 'https://drive.google.com/', name: 'PIO Overwatch — backup (preview)' }); }
    if (a === 'exportAll') return { ok:true, data: { exportedAt: now, exportedBy: me.username, users: users.map(pub), entries: copy(entries), divisions: copy(divisions), holidays: copy(holidays), settings: copy(settings), activity: copy(activity), travelOrders: copy(tos), leaves: copy(leaves), credits: copy(credits), tevs: copy(tevs) } };
    return fail('Unknown action.');
    } catch(err){ return fail(typeof err === 'string' ? err : 'Something went wrong.'); }
  } };
})();

