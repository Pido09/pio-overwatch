/* PIO Overwatch · events.js · loaded in order by index.html (core, views, events, documents, data, app). */
/* ---------- events ---------- */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-go],[data-act],[data-day],[data-d],[data-rec],[data-entry],[data-person],[data-reason],[data-calday],[data-div]');
  if (!t) return;
  if (t.dataset.go){ closeModal(); var toV = t.dataset.go, goV = function(){ S.view = toV; S.selDay = null; render(); window.scrollTo(0,0); };
    // a smooth hand-over between pages where the browser can do it; otherwise the short fade-in
    if (document.startViewTransition && !lessMotion() && toV !== S.view){ document.documentElement.classList.add('vt-page'); var vt = document.startViewTransition(goV);
      setTimeout(function(){ document.documentElement.classList.remove('vt-page'); }, 1500); vt.finished.finally(function(){ document.documentElement.classList.remove('vt-page'); var m = document.querySelector('main'); if (m) try { m.focus({ preventScroll: true }); } catch(e){} }); }
    else { goV(); pgIn(); }
    return; }
  if (t.dataset.rec){ var kv = t.dataset.rec.split(':'), o = {}; o[kv[0]] = kv[1]; goRecords(o); return; }
  if (t.dataset.calday){ var cd = pd(t.dataset.calday); S.cal = { y: cd.getFullYear(), m: cd.getMonth() }; S.selDay = t.dataset.calday; S.view = 'calendar'; render(); window.scrollTo(0,0); return; }
  if (t.dataset.div && !t.dataset.act){ S.dashDiv = t.dataset.div; render(); return; }
  if (t.dataset.day){ S.selDay = S.selDay === t.dataset.day ? null : t.dataset.day; render(); var dp = document.getElementById('daypanel'); if (dp && S.selDay) dp.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  if (t.dataset.reason){ var rn = document.getElementById('rn'); if (rn) rn.value = t.dataset.reason; return; }
  if (t.dataset.d && !t.dataset.act){ var md = document.getElementById('md'); if (md) md.value = t.dataset.d; return; }
  if (t.dataset.entry && !t.dataset.act) return entryModal(t.dataset.entry);
  if (t.dataset.person && !t.dataset.act) return personModal(t.dataset.person);
  var a = t.dataset.act;
  if (a === 'closeScrim'){ if (ev.target === t) closeModal(); return; }
  if (a === 'close') return closeModal();
  if (a === 'showPin'){ var pi = document.getElementById('lp'), on = pi.type === 'password'; pi.type = on ? 'text' : 'password'; t.setAttribute('aria-pressed', String(on)); t.setAttribute('aria-label', on ? 'Hide PIN' : 'Show PIN'); return; }
  if (a === 'refresh'){ busy(t, refresh(true).then(function(){ toast('Up to date'); })); return; }
  if (a === 'logout'){ var bye = call('logout').catch(function(){}); clearSession(); S.token = null; S.me = null; S.view = 'dashboard'; S.authManual = false; S.authUser = null; S.authDiv = null;
    if ((S.profiles || []).length) render(); else document.getElementById('app').innerHTML = '<div class="loading"><img src="pio-logo.webp" alt="Signing out"></div>';
    bye.then(function(){ return loadSignIn(); }).catch(function(){ if (!S.me) render(); }); return; }
  if (a === 'drawer'){ var on3 = !document.body.classList.contains('drawer-open'); document.body.classList.toggle('drawer-open', on3); document.querySelectorAll('[data-act=drawer]').forEach(function(b){ b.setAttribute('aria-expanded', String(on3)); }); if (on3){ var f3 = document.querySelector('.side .nav button'); if (f3) f3.focus(); } return; }
  if (a === 'drawerClose'){ document.body.classList.remove('drawer-open'); return; }
  if (a === 'moreNav'){ var rest = isAdmin() ? navItems().slice(4) : navItems().filter(function(n){ return !navMain(n); }); return modal('More', '<div class="wlist">' + rest.map(function(n){ return '<button type="button" class="btn btn-ghost btn-lg" style="justify-content:flex-start" data-go="' + n[0] + '">' + ic(n[1]) + n[2] + '</button>'; }).join('') + '</div>'); }
  if (a === 'calPrev' || a === 'calNext'){ var n = new Date(S.cal.y, S.cal.m + (a === 'calNext' ? 1 : -1), 1); S.cal = { y: n.getFullYear(), m: n.getMonth() }; S.selDay = null; render(); return; }
  if (a === 'calToday'){ S.cal = null; S.selDay = today(); render(); return; }
  if (a === 'monPrev' || a === 'monNext'){ S.mon = shiftMonth(S.mon || curMonth(), a === 'monNext' ? 1 : -1); if (S.mon > curMonth()) S.mon = curMonth(); render(); return; }
  if (a === 'recTab'){ S.recTab = t.dataset.t; render(); return; }
  if (a === 'openActivity'){ S.recTab = 'activity'; S.view = 'records'; render(); window.scrollTo(0,0); return; }
  if (a === 'clearFilters'){ goRecords({}); return; }
  if (a === 'logOn'){ S.prefill = {}; S.view = 'log'; render(); var fd = document.getElementById('fd'); if (fd){ fd.value = t.dataset.date; checkEarnForm(document, true); } window.scrollTo(0,0); return; }
  if (a === 'focusAdd') return addStaffModal();
  if (a === 'print'){ window.print(); return; }
  if (a === 'exportMonth'){
    var mm = S.mon || curMonth();
    if (isAdmin()) download('offsets-' + mm + (S.dashDiv !== 'all' ? '-' + S.dashDiv : '') + '.csv', csv([['Employee','Username','Division','Carried over','Forfeited','Earned','Used','Balance on ' + nextMonthStart(mm),'Pending']].concat(monthRows(mm).map(function(r){ var d = divOf(r.u.division); return [r.u.name, r.u.username, d ? d.name : '', r.s.open, r.s.forfeit, r.s.earned, r.s.used, r.s.close, r.s.pending]; }))), 'text/csv');
    else download('my-offsets-' + mm + '.csv', entriesCsv(S.entries.filter(function(e){ return e.date.slice(0,7) === mm; })), 'text/csv');
    return toast('Report downloaded');
  }
  if (a === 'exportRecords'){ download('offset-records-' + today() + '.csv', entriesCsv(filteredRecords()), 'text/csv'); return toast('Records downloaded'); }
  if (a === 'exportActivity'){ download('activity-log-' + today() + '.csv', csv([['When','By','Action','About','Details']].concat(S.activity.map(function(x){ return [x.at, userName(x.actor), x.action, userOf(x.target) ? userName(x.target) : x.target, x.details]; }))), 'text/csv'); return toast('Activity log downloaded'); }
  if (a === 'exportAllCsv'){ busy(t, call('exportAll').then(function(d){ download('all-offset-entries-' + today() + '.csv', entriesCsv(d.entries), 'text/csv'); toast('All entries downloaded'); })); return; }
  if (a === 'exportJson'){ busy(t, call('exportAll').then(function(d){ download('pio-offsets-backup-' + today() + '.json', JSON.stringify(d, null, 2), 'application/json'); toast('Backup downloaded'); })); return; }
  if (a === 'backupDrive'){ busy(t, call('backupToDrive').then(function(r){ modal('Backup saved', '<p style="margin:0">A copy named <b>' + esc(r.name) + '</b> was saved to the admin’s Google Drive.</p><a class="btn btn-ghost" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ic('drive') + 'Open in Google Drive</a>', '<button type="button" class="btn btn-primary" data-act="close">Done</button>'); render(); })); return; }
  if (a === 'customize'){ document.body.classList.remove('drawer-open'); return customizeModal(); }
  if (a === 'wUp' || a === 'wDown'){ var i = +t.dataset.i, j = a === 'wUp' ? i - 1 : i + 1, tmp = M.order[i]; M.order[i] = M.order[j]; M.order[j] = tmp; M.draw(); return; }
  if (a === 'wFold'){ var fl = wFolded(), fw = t.dataset.w, fi = fl.indexOf(fw), opening = fi >= 0; if (fi < 0) fl.push(fw); else fl.splice(fi, 1); lSet('pio_fold_' + wRole(), JSON.stringify(fl));
    var sec0 = document.querySelector('[data-w="' + fw + '"]'), fh0 = sec0 ? sec0.getBoundingClientRect().height : 0;
    render(); var fb = document.getElementById('wf-' + fw); if (fb) fb.focus({ preventScroll: true });
    // the section grows or shrinks to its new size, and its content fades in when it opens
    var sec1 = document.querySelector('[data-w="' + fw + '"]');
    if (sec1 && fh0 && !lessMotion() && sec1.animate){ var fh1 = sec1.getBoundingClientRect().height; sec1.style.overflow = 'hidden';
      var fa = sec1.animate([{ height: fh0 + 'px' }, { height: fh1 + 'px' }], { duration: opening ? MOTION.inMs : MOTION.outMs, easing: opening ? MOTION.easeOut : MOTION.easeIn });
      fa.oncancel = function(){ sec1.style.overflow = ''; }; settle(fa, opening ? MOTION.inMs : MOTION.outMs, function(){ sec1.style.overflow = ''; });
      if (opening) staggerIn(Array.prototype.filter.call(sec1.children, function(c){ return !c.classList.contains('panel-h'); })); }
    return; }
  if (a === 'wReset'){ lSet('pio_w_' + M.role, null); lSet('pio_fold_' + M.role, null); closeModal(); render(); toast('Dashboard reset'); return; }
  if (a === 'wSave'){ M.hidden = []; document.querySelectorAll('#wl input[data-w]').forEach(function(x){ if (!x.checked) M.hidden.push(x.dataset.w); }); lSet('pio_w_' + M.role, JSON.stringify({ order: M.order, hidden: M.hidden })); closeModal(); render(); toast('Layout saved'); return; }
  if (a === 'useModal') return useModal(t.dataset.u, t.dataset.date);
  if (a === 'requestModal') return requestModal(t.dataset.date);
  if (a === 'rejectModal') return rejectModal(t.dataset.id);
  if (a === 'editEntry') return editModal(t.dataset.id);
  if (a === 'moveUse') return moveModal(t.dataset.id);
  if (a === 'personRecords'){ closeModal(); goRecords({ user: t.dataset.u }); return; }
  if (a === 'personAdd'){ closeModal(); S.prefill = { username: t.dataset.u }; S.view = 'log'; render(); window.scrollTo(0,0); return; }
  if (a === 'divModal') return divModal(t.dataset.id);
  if (a === 'divColor'){ M.color = t.dataset.c; document.getElementById('dcol').value = M.color; divPreview(); return; }
  if (a === 'divIcon'){ M.icon = t.dataset.n; divPreview(); return; }
  if (a === 'divNoLogo'){ M.logo = ''; divPreview(); return; }
  if (a === 'divDelete'){ if (!sure(t, 'Tap again to delete')) return; busy(t, act('deleteDivision', { id: M.id }, 'Division deleted').then(closeModal), 'merr'); return; }
  if (a === 'delHoliday'){ busy(t, act('deleteHoliday', { date: t.dataset.date }, 'Holiday deleted')); return; }
  if (a === 'changePin') return modal('Change your PIN', '<div class="field"><label for="op">Current PIN</label><input class="input pin" id="op" name="oldPin" type="password" inputmode="numeric" maxlength="6" required></div><div class="field"><label for="np">New PIN</label><input class="input pin" id="np" name="newPin" type="password" inputmode="numeric" maxlength="4" required><span class="hint">4 to 6 digits. Other devices will be signed out.</span></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save PIN</button>', 'changePin');
  if (a === 'pinModal') return modal('Reset PIN for ' + esc(userName(t.dataset.u)), '<input type="hidden" name="username" value="' + esc(t.dataset.u) + '"><div class="field"><label for="rp">New PIN</label><input class="input pin" id="rp" name="pin" inputmode="numeric" maxlength="4" required><span class="hint">They will be signed out on all devices. Tell them the new PIN in person.</span></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Reset PIN</button>', 'resetPin');
  if (a === 'del'){ busy(t, act('deleteEntry', { id: t.dataset.id }, 'Entry removed').then(closeModal), 'merr'); return; }
  if (a === 'startEntryTO'){ busy(t, act('startEntryTO', { id: t.dataset.id }, 'Travel order started. Prepare it in Travel orders.').then(closeModal), 'merr'); return; }
  if (a === 'review'){ var d = t.dataset.d, ovr = t.dataset.override === '1';
    if (ovr && t.dataset.sure !== '1'){ t.dataset.sure = '1'; t.innerHTML = ic('check') + 'Tap again to approve'; return; }   // a second tap confirms the override
    var rvE = S.entries.filter(function(x){ return x.id === t.dataset.id; })[0];
    busy(t, act('review', { id: t.dataset.id, decision: d, override: ovr ? '1' : '' }, d === 'Confirmed' ? (ovr ? 'Approved (override)' : 'Approved') : 'Rejected').then(function(){ closeModal(); if (rvE && rvE.type === 'USE' && d === 'Confirmed') offsetPromptFor(rvE.username, rvE.date); }), document.querySelector('#modal .scrim') ? 'merr' : null); return; }
  if (a === 'confirmAll'){ if (t.dataset.sure !== '1'){ t.dataset.sure = '1'; t.innerHTML = ic('check') + 'Tap again to approve all'; return; }
    busy(t, act('reviewMany', { ids: pending(t.dataset.k).filter(canReview).map(function(e){ return e.id; }), decision: 'Confirmed' }, function(n){ return n + ' approved'; })); return; }
  if (a === 'toggleActive'){ var on2 = t.dataset.a === '1', tu = t.dataset.u; busy(t, act('setActive', { username: tu, active: on2 }, on2 ? 'Account activated' : 'Account deactivated').then(function(){ personModal(tu); }), 'merr'); return; }
  if (a === 'setRole'){ var tu2 = t.dataset.u, r = t.dataset.r; busy(t, act('setRole', { username: tu2, role: r }, firstName(tu2) + ' is now ' + (r === 'admin' ? 'an admin' : r === 'scheduler' ? 'a division leader' : 'an employee')).then(function(){ personModal(tu2); }), 'merr'); return; }
  if (a === 'removeUser'){ if (!sure(t, 'Tap again to remove ' + esc(firstName(t.dataset.u)))) return; var nm2 = userName(t.dataset.u); busy(t, act('removeUser', { username: t.dataset.u }, nm2 + ' was removed').then(closeModal), 'merr'); return; }
});
document.addEventListener('keydown', function(ev){
  if (ev.key === 'Escape' && document.querySelector('#modal .scrim')) closeModal();
  if (ev.key === 'Escape' && document.body.classList.contains('drawer-open')){ document.body.classList.remove('drawer-open'); var dbtn = document.querySelector('.topbar [data-act=drawer]'); if (dbtn) dbtn.focus(); }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('.tap[tabindex]')){ ev.preventDefault(); ev.target.click(); }
  if (ev.key === 'Tab' && document.querySelector('#modal .scrim')){
    var f = Array.prototype.filter.call(document.querySelectorAll('#modal button, #modal a[href], #modal input:not([type=hidden]):not(.sr), #modal select, #modal label[for=dlogo], #modal [tabindex]'), function(x){ return !x.disabled && x.offsetParent !== null; });
    if (f.length){ var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first){ ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last){ ev.preventDefault(); first.focus(); } }
  }
});
/* Required or badly filled fields: instead of the browser's own bubble, show a message in the app's
   style under the field, mark it for screen readers, and move to the first one that needs fixing.
   Nothing is sent while a field is invalid; the browser still blocks the form. */
var fieldErrFirst = null;
function fieldName(el){
  var l = el.labels && el.labels[0], g = el.closest('fieldset'), lg = g && g.querySelector('legend');
  var t = (el.type === 'radio' && lg ? lg.textContent : l ? l.textContent : el.getAttribute('aria-label') || '') || '';
  return t.replace(/\*/g, '').replace(/\(.*?\)/g, '').trim();
}
function fieldErrMsg(el){
  var v = el.validity, n = fieldName(el);
  if (v.valueMissing) return el.type === 'radio' ? 'Pick one.' : el.type === 'checkbox' ? 'Tick this to continue.' : el.tagName === 'SELECT' ? 'Choose an option.' : (n ? n + ' is required.' : 'This is required.');
  if (v.rangeUnderflow) return 'Must be at least ' + el.min + '.';
  if (v.rangeOverflow) return 'Must be at most ' + el.max + '.';
  if (v.tooShort) return 'Use at least ' + el.minLength + ' characters.';
  return el.validationMessage || 'Check this field.';
}
function fieldErrBox(el){ return (el.type === 'radio' || el.type === 'checkbox') && el.closest('fieldset, [role=radiogroup], .field') || el.closest('.field') || el.parentElement; }
function clearFieldErr(el){
  var box = fieldErrBox(el), p = box && box.querySelector(':scope > .ferr'); if (p) p.remove();
  (box || document).querySelectorAll('[aria-invalid="true"]').forEach(function(x){ if (x.name === el.name || x === el){ x.removeAttribute('aria-invalid'); var d = (x.getAttribute('aria-describedby') || '').split(' ').filter(function(s){ return s && s.indexOf('ferr-') !== 0; }).join(' '); if (d) x.setAttribute('aria-describedby', d); else x.removeAttribute('aria-describedby'); } });
}
document.addEventListener('invalid', function(ev){
  var el = ev.target; if (!el.form) return;
  ev.preventDefault();
  var box = fieldErrBox(el), id = 'ferr-' + (el.id || el.name || Math.random().toString(36).slice(2));
  var p = box.querySelector(':scope > .ferr');
  if (!p){ p = document.createElement('p'); p.className = 'ferr'; p.id = id; box.appendChild(p); }
  p.textContent = fieldErrMsg(el);
  el.setAttribute('aria-invalid', 'true');
  if ((el.getAttribute('aria-describedby') || '').indexOf(p.id) < 0) el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + p.id).trim());
  if (!fieldErrFirst){ fieldErrFirst = el; setTimeout(function(){ var f = fieldErrFirst; fieldErrFirst = null; if (f && document.body.contains(f)){ f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 0); }
}, true);
function fieldFixed(ev){ var el = ev.target; if (el.getAttribute && el.getAttribute('aria-invalid') === 'true' && el.checkValidity()) clearFieldErr(el); }
document.addEventListener('input', fieldFixed, true);
document.addEventListener('change', fieldFixed, true);
/* Records search: filters as you type (after a short pause, so typing stays smooth). */
document.addEventListener('input', function(ev){
  if (ev.target.id !== 'rfQ') return;
  var v = ev.target.value; clearTimeout(rfQTimer);
  rfQTimer = setTimeout(function(){ S.rf.q = v; S.recLimit = 0; render(); }, 180);
});
var rfQTimer = null;
document.addEventListener('change', function(ev){
  var el = ev.target, id = el.id;
  if (id === 'mu'){ var mo = document.getElementById('muOpts'); if (mo) mo.innerHTML = useOpts(el.value); }
  if (id === 'calUser'){ S.calUser = el.value; render(); }
  if (id === 'dashDiv'){ S.dashDiv = el.value; render(); }
  if (id === 'holYear'){ S.holYear = el.value; render(); }
  if (id === 'rfUser' || id === 'rfType' || id === 'rfStatus' || id === 'rfDiv'){ S.rf[{ rfUser:'user', rfType:'type', rfStatus:'status', rfDiv:'div' }[id]] = el.value; S.recLimit = 0; render(); }
  if (el.name === 'category' || id === 'fd' || id === 'ft' || id === 'fu' || id === 'fto'){ checkEarnForm(el.closest('form') || document, id === 'fd'); }
  if (id === 'dcol'){ M.color = el.value.toUpperCase(); divPreview(); }
  if (id === 'dlogo' && el.files[0]){ readLogo(el.files[0]).then(function(u){ M.logo = u; divPreview(); }).catch(function(e){ document.getElementById('merr').textContent = e.message; }); }
  if (el.dataset.setdiv){ el.disabled = true; act('setDivision', { username: el.dataset.setdiv, division: el.value }, 'Division updated').then(function(){ if (document.getElementById('pdiv')) personModal(el.dataset.setdiv); }).catch(function(e){ toast(e.message); el.disabled = false; }); }
});
document.addEventListener('input', function(ev){ if (ev.target.id === 'ft') checkEarnForm(ev.target.closest('form') || document); });
document.addEventListener('click', function(ev){ if (ev.target.closest('[data-setdiv],[data-setemp],#calUser,#dashDiv')) ev.stopPropagation(); }, true);

function busy(btn, p, errId){
  btn.disabled = true; btn.classList.add('is-busy');
  // Big buttons say what is happening, so nobody taps twice.
  var label = btn.innerHTML, big = btn.type === 'submit' || btn.classList.contains('btn-primary');
  if (big) btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Saving…';
  p = p.then(function(r){ if (big && document.body.contains(btn)) btn.innerHTML = label; return r; }, function(e){ if (big && document.body.contains(btn)) btn.innerHTML = label; throw e; });
  return p.catch(function(e){ var el = errId && document.getElementById(errId); if (el) el.textContent = e.message; else toast(e.message); })
    .then(function(){ if (document.body.contains(btn)){ btn.disabled = false; btn.classList.remove('is-busy'); } });
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form]'); if (!f) return;
  ev.preventDefault();
  var d = {}; new FormData(f).forEach(function(v, k){ if (typeof v === 'string') d[k] = v; });
  var kind = f.dataset.form, btn = (ev.submitter && ev.submitter.type === 'submit' ? ev.submitter : null) || f.querySelector('[type=submit]'), again = !!(ev.submitter && ev.submitter.dataset.again), inModal = !!f.closest('#modal'), errId = kind === 'holiday' ? 'herr' : (inModal ? 'merr' : 'err');
  var err = document.getElementById(errId); if (err) err.textContent = '';
  var p;
  if (kind === 'login' || kind === 'setup'){
    if (kind === 'setup' && d.pin !== d.pin2){ err.textContent = 'The two PINs do not match.'; return; }
    var remember = !!d.remember; d.remember = remember;
    if (d.division) lSet('pio_div', d.division);
    p = call(kind, d).then(function(r){ S.needsSetup = false; S.token = r.token; saveSession(r.token, remember); S.view = 'dashboard'; S.welcome = true; if (!S.me) return refresh().then(function(){ window.scrollTo(0,0); }); if (remember) lSet('pio_cache', JSON.stringify({ me:S.me, users:S.users, entries:S.entries, divisions:S.divisions, holidays:S.holidays, settings:S.settings, activity:S.activity })); render(); window.scrollTo(0,0); });
  }
  else if (kind === 'earn'){ d.noTravelOrder = !!d.noTravelOrder; d.notInPayroll = !!d.notInPayroll; var selfLog = !isAdmin() || !d.username || d.username === S.me.username;
    p = act('logEarn', d, isAdmin() && !(selfLog && otherAdmins()) ? 'Offset saved and confirmed' : 'Sent for confirmation').then(function(){ S.view = 'dashboard'; render(); window.scrollTo(0,0); }); }
  else if (kind === 'editEntry'){ d.id = M.id; d.noTravelOrder = d.noTravelOrder !== undefined || !f.querySelector('input[name=noTravelOrder]'); d.notInPayroll = d.notInPayroll !== undefined; p = act('editEntry', d, 'Changes saved').then(closeModal); }
  else if (kind === 'requestUse') p = act('requestUse', d, isAdmin() && !otherAdmins() ? 'Day off recorded' : 'Request sent').then(closeModal);
  else if (kind === 'recordUse') p = act('recordUse', d, 'Offset use recorded').then(function(){ closeModal(); offsetPromptFor(d.username, d.date); });
  else if (kind === 'offsetTO' && (d.ev === '__new' && String(d.newTitle || '').trim().length < 3)){ var ofErr = document.getElementById('merr'); if (ofErr) ofErr.textContent = 'Write the new event’s name.'; var ofT = document.getElementById('ofT'); if (ofT) ofT.focus(); return; }
  else if (kind === 'offsetTO'){ var ofe = M.offsetEntry, pick = d.ev || '';
    p = act('offsetTO', { id: ofe, eventId: pick.indexOf('__') === 0 ? '' : pick, newTitle: pick === '__new' ? d.newTitle : '', newVenue: pick === '__new' ? d.newVenue : '' }, 'Travel order ready. Prepare it now.')
      .then(function(r){ closeModal(); var tid = r && (r.id || (r.data && r.data.id)); if (tid) setTimeout(function(){ if (S.travelOrders.some(function(t){ return t.id === tid; })) toManageModal(tid); }, 200); }); }
  else if (kind === 'evRemove'){ var rmId = M.id, back = function(){ if (S.pop) dayPop(S.pop); else closeModal(); };
    if (d.why === 'resched'){ if (!d.date){ err.textContent = 'Pick the new date.'; return; } p = act('rescheduleEvent', { id: rmId, date: d.date, dateTo: d.dateTo, note: d.note }, 'Event moved to ' + fDate(d.date)).then(back); }
    else if (d.why === 'cancel') p = act('setEventStatus', { id: rmId, status: 'Cancelled', note: d.note }, 'Event cancelled').then(back);
    else if (d.why === 'dup') p = act('mergeEvent', { id: rmId, into: d.into === '__none' ? '' : d.into, note: d.note }, 'Duplicate removed').then(back);
    else { err.textContent = 'Pick a reason.'; return; } }
  else if (kind === 'moveUse'){ d.id = M.id; p = act('moveUse', d, 'Day off rescheduled').then(closeModal); }
  else if (kind === 'saveEvent'){ d.needs = [].map.call(f.querySelectorAll('input[name=need]:checked'), function(x){ return x.value; }); var wasNew = !d.id;
    p = act('saveEvent', d, wasNew ? 'Event added' : 'Event saved').then(function(r){ closeModal(); var ne = S.events.filter(function(x){ return x.id === (r && r.id); })[0];
      if (ne){ var dd = pd(ne.date); S.cal = { y: dd.getFullYear(), m: dd.getMonth() }; S.selDay = ''; S.pop = ''; render(); if (wasNew) setTimeout(function(){ evPrompt(ne); }, 250); } }); }
  else if (kind === 'assignEvent'){ d.users = [].map.call(f.querySelectorAll('input[name=user]:checked'), function(x){ return x.value; }); d.id = M.id;
    // multi-day: the days each person goes (only sent for people not going every day)
    var adEv = S.events.filter(function(x){ return x.id === M.id; })[0], adAll = adEv ? evDays(adEv) : [], adMap = {};
    if (adAll.length > 1 && f.querySelector('#asDays')){ var noDay = '';
      d.users.forEach(function(u){ var ds = [].map.call(f.querySelectorAll('input[data-ad="' + u + '"]:checked'), function(x){ return x.value; });
        if (!ds.length){ noDay = noDay || u; return; } if (ds.length < adAll.length) adMap[u] = ds; });
      if (noDay){ var adErr = document.getElementById('merr'); if (adErr) adErr.textContent = 'Pick at least one day for ' + firstName(noDay) + ', or untick them.'; return; }
      d.days = JSON.stringify(adMap); } p = act('assignEvent', d, (S.events.filter(function(x){ return x.id === M.id; })[0] && evKind(S.events.filter(function(x){ return x.id === M.id; })[0]) !== 'tasking') ? 'People assigned' : 'Dispatch order saved').then(function(){ closeModal(); }); }
  else if (kind === 'saveItem'){ if (d.category) lSet('pio_inv_cat', d.category);
    p = act('saveItem', d, d.id ? 'Equipment saved' : d.name + ' added').then(function(){ if (again && !d.id) invNext(f); else closeModal(); }); }
  else if (kind === 'checkoutItem') p = act('checkoutItem', d, 'Checked out').then(closeModal);
  else if (kind === 'reject') p = act('review', { id: M.id, decision: 'Rejected', note: d.note }, 'Rejected').then(closeModal);
  else if (kind === 'addUser') p = act('addUser', d, d.name + ' can now sign in');
  else if (kind === 'resetPin') p = act('resetPin', d, 'PIN reset').then(closeModal);
  else if (kind === 'changePin') p = act('changePin', d, 'Your PIN was changed').then(closeModal);
  else if (kind === 'settings') p = act('saveSettings', d, 'Rules saved');
  else if (kind === 'holiday') p = act('saveHoliday', d, 'Holiday saved');
  else if (kind === 'saveDivision'){ d.id = M.id; d.color = M.color; d.icon = M.icon; d.logo = M.logo || ''; p = act('saveDivision', d, 'Division saved').then(closeModal); }
  if (p) busy(btn, p, errId);
});
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && S.me && !document.querySelector('#modal .scrim') && Date.now() - S.loadedAt > 60000) refresh().catch(function(){}); });
window.addEventListener('afterprint', function(){});

/* =====================================================================
   PIO Overwatch: travel orders, leaves and availability
   ===================================================================== */
var LEAVE_TYPES = {
  VL: { name: 'Vacation Leave', pool: 'VL' }, FL: { name: 'Mandatory/Forced Leave', pool: 'VL', year: 5 }, SL: { name: 'Sick Leave', pool: 'SL' },
  SPL: { name: 'Special Privilege Leave', year: 3 }, WL: { name: 'Wellness Leave', year: 5 }, SOLO: { name: 'Solo Parent Leave', year: 7 },
  SEL: { name: 'Special Emergency (Calamity) Leave', year: 5 }, ML: { name: 'Maternity Leave', once: 105, calendar: true }, PL: { name: 'Paternity Leave', once: 7 },
  VAWC: { name: '10-Day VAWC Leave', once: 10 }, SLBW: { name: 'Special Leave Benefits for Women', once: 60 }, RL: { name: 'Rehabilitation Privilege' },
  STL: { name: 'Study Leave' }, AL: { name: 'Adoption Leave', once: 60 }, LWOP: { name: 'Leave Without Pay' }
};
function leaveName(t){ return t === 'ADJ-VL' ? 'VL adjustment' : t === 'ADJ-SL' ? 'SL adjustment' : (LEAVE_TYPES[t] || { name: t || 'Leave' }).name; }
function hasLeaves(u){ u = u || S.me; return u && (u.empType === 'Regular' || u.empType === 'Casual'); }
/* CSC MC No. 1, s. 2026: job order and contract of service workers also get the yearly wellness leave. */
function wlOnly(u){ u = u || S.me; return !!u && !hasLeaves(u) && (u.empType === 'JO' || u.empType === 'COS' || !u.empType); }
function canLeave(u){ return hasLeaves(u) || wlOnly(u); }
function wellCap(){ return S.settings.wellnessDays == null ? 5 : S.settings.wellnessDays; }

/* Vacation and sick leave balances: same calculation as leaveBal_ in Code.gs. */
function leaveBal(u, year){
  year = year || today().slice(0,4);
  var c = S.credits.filter(function(x){ return x.username === u; })[0], cur = curMonth(), months = 0;
  if (c && c.asOf){ var m = shiftMonth(c.asOf, 1); while (m < cur){ months++; m = shiftMonth(m, 1); } }
  var o = { set: !!c, asOf: c ? c.asOf : '', vl: (c ? c.vl : 0) + 1.25 * months, sl: (c ? c.sl : 0) + 1.25 * months, used: {}, accrued: 1.25 * months };
  S.leaves.forEach(function(l){
    if (l.username !== u) return;
    if (l.type === 'ADJ-VL') o.vl += l.days; else if (l.type === 'ADJ-SL') o.sl += l.days;
    else { var after = !c || !c.asOf || l.dateFrom.slice(0,7) > c.asOf, r = LEAVE_TYPES[l.type] || {};
      if (after && r.pool === 'VL') o.vl -= l.days; if (after && r.pool === 'SL') o.sl -= l.days;
      if (l.dateFrom.slice(0,4) === year) o.used[l.type] = (o.used[l.type] || 0) + l.days; }
  });
  o.left = function(t){ var cap = t === 'WL' ? wellCap() : (LEAVE_TYPES[t] || {}).year; return cap == null ? null : Math.max(cap - (o.used[t] || 0), 0); };
  return o;
}
function workdaysBetween(a, b, calendar){
  if (!a) return 0; b = b || a; var n = 0;
  for (var d = a; d <= b; d = addDays(d, 1)){ if (calendar || (!isWeekend(d) && !holidayOn(d))) n++; if (n > 400) break; }
  return n;
}
function fRange(a, b, opt){
  opt = opt || { month:'long', day:'numeric', year:'numeric' };
  if (!b || a === b) return fDate(a, opt);
  var A = pd(a), B = pd(b);
  if (A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth()) return fDate(a, { month: opt.month }) + ' ' + A.getDate() + '–' + B.getDate() + ', ' + A.getFullYear();
  return fDate(a, opt) + ' – ' + fDate(b, opt);
}
function activeTOs(){ return S.travelOrders.filter(function(t){ return t.status !== 'Cancelled'; }); }
function toOn(u, d){ return activeTOs().filter(function(t){ return t.usernames.indexOf(u) >= 0 && t.dateFrom <= d && t.dateTo >= d; })[0]; }
/* What a person is doing on a date: travel order, leave, day off (offset), or nothing. */
function statusOn(u, d){
  // a travel order made only for an offset or day off is not travel: the day off below shows instead
  var t = activeTOs().filter(function(x){ return !isOffsetTO(x) && (x.usernames || []).indexOf(u) >= 0 && x.dateFrom <= d && x.dateTo >= d; })[0]; if (t) return { kind: 'to', label: t.event, ref: t };
  var adm = isAdmin() || u === S.me.username;
  var l = (adm ? S.leaves : []).filter(function(x){ return x.username === u && !/^ADJ/.test(x.type) && x.dateFrom <= d && x.dateTo >= d; })[0];
  if (l) return { kind: 'leave', label: leaveName(l.type), ref: l };
  var b = S.board.filter(function(x){ return x.username === u && x.from <= d && x.to >= d; })[0];
  if (b && !adm) return { kind: b.kind, label: b.kind === 'leave' ? 'On leave' : 'Day off' };
  if (b && b.kind === 'leave' && !l) return { kind: 'leave', label: b.label ? leaveName(b.label) : 'On leave' };
  var o = S.entries.filter(function(e){ return e.username === u && e.type === 'USE' && e.status === 'Confirmed' && e.date === d; })[0];
  if (o) return { kind: 'off', label: 'Day off (offset)', ref: o };
  // a day-off travel order not prepared yet: the days off are planned but not recorded yet
  var dt = activeTOs().filter(function(x){ return isOffsetTO(x) && !x.offsetDone && !x.useEntryId && (x.usernames || []).indexOf(u) >= 0 && x.dateFrom <= d && x.dateTo >= d; })[0];
  if (dt) return { kind: 'off', label: 'Day off (planned)', ref: dt };
  return null;
}
var KIND = { to: ['Travel order', 'route', 'to'], leave: ['On leave', 'plane', 'lv'], off: ['Day off', 'sun', 'off'] };
/* Puts a division heading above each group of rows marked with data-div (tables and lists). */
/* Tab strips wider than the screen fade at whichever edge has more tabs, so people know to swipe. */
function tabFade(el){
  var max = el.scrollWidth - el.clientWidth;
  el.classList.toggle('fade-l', max > 1 && el.scrollLeft > 1);
  el.classList.toggle('fade-r', max > 1 && el.scrollLeft < max - 1);
}
function tabFades(root){ (root || document).querySelectorAll('.tabs').forEach(tabFade); }
/* segmented tabs: the highlight glides from the old choice to the new one instead of jumping.
   Runs before the page redraws (capture), measures again on the next frame, and animates a stand-in. */
document.addEventListener('click', function(ev){
  var b = ev.target.closest('.tabs button'); if (!b || lessMotion() || b.getAttribute('aria-pressed') === 'true') return;
  var tabs = b.parentElement, old = tabs.querySelector('button[aria-pressed="true"]'); if (!old) return;
  var x0 = old.offsetLeft, w0 = old.offsetWidth, label = tabs.getAttribute('aria-label') || '';
  requestAnimationFrame(function(){
    var t2 = document.body.contains(tabs) ? tabs : (label ? document.querySelector('.tabs[aria-label="' + label.replace(/"/g, '') + '"]') : null);
    var nb = t2 && t2.querySelector('button[aria-pressed="true"]'); if (!nb || !nb.offsetWidth) return;
    var x1 = nb.offsetLeft, w1 = nb.offsetWidth; if (Math.abs(x1 - x0) < 1) return;
    var g = document.createElement('span'); g.className = 'tab-ghost'; g.setAttribute('aria-hidden', 'true');
    g.style.cssText = 'left:' + x1 + 'px;top:' + nb.offsetTop + 'px;width:' + w1 + 'px;height:' + nb.offsetHeight + 'px';
    t2.appendChild(g); nb.classList.add('tab-gliding');
    settle(g.animate([{ transform: 'translateX(' + (x0 - x1) + 'px) scaleX(' + (w0 / w1) + ')' }, { transform: 'none' }], { duration: 280, easing: MOTION.easeOut }), 280,
      function(){ g.remove(); nb.classList.remove('tab-gliding'); });
  });
}, true);
document.addEventListener('scroll', function(ev){ var el = ev.target; if (el && el.classList && el.classList.contains('tabs')) tabFade(el); }, true);
window.addEventListener('resize', function(){ tabFades(); });
/* the calendar fits more events per day on phones: redraw it when the screen crosses phone size (rotating, resizing) */
var calNarrow = window.innerWidth <= 640;
window.addEventListener('resize', function(){ var n = window.innerWidth <= 640; if (n !== calNarrow){ calNarrow = n; if (S.me && S.view === 'calendar') render(); } });
/* Wide tables marked "cards" turn each row into a small card on phones.
   Each cell is given its column name, which the phone styles show as a label. */
function cardLabels(root){
  (root || document).querySelectorAll('table.cards').forEach(function(t){
    var heads = Array.prototype.map.call(t.querySelectorAll('thead th'), function(th){ return th.textContent.trim(); });
    t.querySelectorAll('tbody tr:not(.grp)').forEach(function(tr){
      Array.prototype.forEach.call(tr.children, function(td, i){ if (heads[i]) td.setAttribute('data-label', heads[i]); else td.removeAttribute('data-label'); });
    });
  });
}
function groupify(root){
  var seen = [];
  (root || document).querySelectorAll('[data-grp]').forEach(function(el){ if (seen.indexOf(el.parentElement) < 0) seen.push(el.parentElement); });
  seen.forEach(function(box){
    if (box.dataset.grouped) return; box.dataset.grouped = '1';
    var last = null, rows = Array.prototype.slice.call(box.children).filter(function(c){ return c.hasAttribute('data-grp'); });
    if (rows.length < 2 && S.dashDiv !== 'all') return;
    rows.forEach(function(el){
      var dv = el.getAttribute('data-grp'); if (dv === last) return; last = dv;
      var d = divOf(dv), label = d ? '<span class="dchip" style="--dc:' + esc(d.color) + '"><i></i>' + esc(d.name) + '</span>' : '<span class="dchip hint">No division</span>', h;
      if (el.tagName === 'TR'){ h = document.createElement('tr'); h.className = 'grp'; h.innerHTML = '<td colspan="' + el.children.length + '">' + label + '</td>'; }
      else { h = document.createElement('li'); h.className = 'grp'; h.innerHTML = label; }
      box.insertBefore(h, el);
    });
  });
}
function statusPill(s){ return s ? '<span class="pill st-' + KIND[s.kind][2] + '" title="' + esc(s.kind === 'to' ? 'In the field · ' + s.label : s.label) + '">' + esc(s.kind === 'to' ? 'In the field' : s.label) + '</span>' : '<span class="pill Confirmed">Available</span>'; }

/* ----- availability ----- */
function toWhen(t){
  var o = { month:'long', day:'numeric', year:'numeric' }, a = t.dateFrom, b = t.dateTo;
  if (!b || b === a) return 'on ' + fDate(a, o);
  if (a.slice(0, 7) === b.slice(0, 7)) return 'from ' + fDate(a, { month:'long', day:'numeric' }) + ' to ' + pd(b).getDate() + ', ' + a.slice(0, 4);
  if (a.slice(0, 4) === b.slice(0, 4)) return 'from ' + fDate(a, { month:'long', day:'numeric' }) + ' to ' + fDate(b, o);
  return 'from ' + fDate(a, o) + ' to ' + fDate(b, o);
}
function toText(t){
  var p = String(t.event || '').trim().replace(/[.\s]+$/, '');
  return [fDate(t.dateFrom, { month:'long', day:'numeric', year:'numeric' }), p + (t.destination ? ' in ' + t.destination : '') + ' ' + toWhen(t), ''].concat(sortNames(t.names)).join('\n');
}
/* names are kept in capitals for the printed forms; on screen they read normally */
function dispName(n){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; return u ? u.name : sentenceName(n); }
/* dashboard version: a summary that opens the Travel orders page; only "Prepare" stays as a shortcut */
function toMini(t){
  var prep = isAdmin() && t.status === 'Filed' && !t._saving;
  return '<li class="row tap to-mini" data-act="toView" data-id="' + t.id + '" tabindex="0"><div class="to-date"><b>' + fDate(t.dateFrom, { month:'short' }).toUpperCase() + '</b><span class="num">' + pd(t.dateFrom).getDate() + (t.dateTo !== t.dateFrom ? '–' + pd(t.dateTo).getDate() : '') + '</span></div>' +
    '<div class="body"><div class="t">' + esc(t.event) + '</div><div class="m">' + (t.destination ? esc(t.destination) + ' · ' : '') + esc(sortNames(t.names).map(dispName).join(', ')) + '</div></div>' +
    (prep ? '<button class="btn btn-sm btn-primary" data-act="toManage" data-id="' + t.id + '">' + ic('shield') + 'Prepare</button>' : '<span class="pill ' + (t.status === 'Prepared' ? 'Confirmed' : t.status === 'Cancelled' ? 'Rejected' : 'Pending') + '">' + t.status + '</span>') + '</li>';
}
/* ---------- links between records ----------
   Anything that names another record opens it: a travel order, an offset or day off, an event, a person (admins). */
function nameToUser(n){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; return u ? u.username : ''; }
function fullNamesOn(){ return lGet('pio_names') === 'full'; }
function shortName(u){
  u = typeof u === 'string' ? userOf(u) : u; if (!u || !u.name) return '';
  if (fullNamesOn()) return u.name;
  var parts = String(u.name).trim().split(/\s+/), f = parts[0];
  var dup = S.users.some(function(x){ return x.active && x.username !== u.username && String(x.name || '').trim().split(/\s+/)[0].toLowerCase() === f.toLowerCase(); });
  return dup && parts.length > 1 ? f + ' ' + parts[parts.length - 1].charAt(0) + '.' : f;
}
/* a person as a picture bubble: photo (or initials), short name, optional status; full name on hover and for screen readers */
function personBubble(username, fallbackName, opts){
  opts = opts || {}; var u = userOf(username) || { username: username || fallbackName, name: fallbackName || username };
  var lbl = shortName(u) || fallbackName || username, full = u.name || fallbackName || username;
  var name = isAdmin() && u.username && userOf(u.username) ? '<button type="button" class="lnk" data-person="' + esc(u.username) + '" aria-label="' + esc(full) + '">' + esc(lbl) + '</button>' : '<span aria-label="' + esc(full) + '">' + esc(lbl) + '</span>';
  return '<span class="pbub ' + (opts.cls || '') + '" data-tip="' + esc(full + (opts.tip ? '\n' + opts.tip : '')) + '">' + avatarHtml(u, opts.size || 28) + '<span class="pbub-t">' + name + (opts.sub ? '<small>' + opts.sub + '</small>' : '') + '</span></span>';
}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="nameMode"]'); if (!t) return;
  lSet('pio_names', fullNamesOn() ? null : 'full'); render(); if (S.pop && document.querySelector('#modal .dcard, #modal .dsec')) dayPop(S.pop, true); });
function nameToggle(){ return '<button type="button" class="chip name-tog" data-act="nameMode" aria-pressed="' + fullNamesOn() + '">' + ic('users') + 'Full names</button>'; }
function linkPerson(u, label){ return isAdmin() && u ? '<button type="button" class="lnk" data-person="' + esc(u) + '">' + esc(label) + '</button>' : esc(label); }
function linkTO(t, label){ return t ? '<button type="button" class="lnk" data-act="toView" data-id="' + esc(t.id) + '">' + esc(label || t.event) + '</button>' : ''; }
function toStatusPill(t){ return '<span class="pill ' + (t.status === 'Prepared' ? 'Confirmed' : t.status === 'Cancelled' ? 'Rejected' : 'Pending') + '">' + (t.status === 'Filed' ? 'To prepare' : t.status) + '</span>'; }
/* the offsets and days off a travel order makes valid */
/* which days of a day-off travel order use offset, per person. Days they asked for are ticked; if they asked for
   none in this range, every weekday is ticked. Days already recorded as a day off are not taken twice. */
function toDaysModal(t){
  var hol = function(d){ return typeof holidayOn === 'function' && holidayOn(d); };
  var days = []; for (var d = t.dateFrom; d <= (t.dateTo || t.dateFrom); d = addDays(d, 1)){ days.push(d); if (days.length > 31) break; }
  var people = (t.names || []).map(function(n, i){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; return u || null; }).filter(Boolean);
  var body = '<p class="hint" style="margin:0 0 10px">Preparing this day-off travel order takes offset days. Tick only the days each person is really off.</p>';
  var total = 0;
  people.forEach(function(u){
    var mine = S.entries.filter(function(e){ return e.username === u.username && e.type === 'USE' && e.status !== 'Rejected' && !e._del && e.date >= t.dateFrom && e.date <= (t.dateTo || t.dateFrom); });
    var asked = mine.filter(function(e){ return e.status === 'Pending'; }).map(function(e){ return e.date; }), done = mine.filter(function(e){ return e.status === 'Confirmed'; }).map(function(e){ return e.date; });
    body += '<fieldset class="field tod-p" style="border:0;padding:0;margin:0 0 12px"><legend class="label" style="margin-bottom:6px">' + esc(u.name) + ' <span class="hint">· ' + fD(Math.max(bal2(u.username), 0)) + ' available</span></legend>' +
      days.map(function(d){
        var wk = [0, 6].indexOf(pd(d).getDay()) >= 0, h = hol(d), isDone = done.indexOf(d) >= 0, isAsked = asked.indexOf(d) >= 0;
        var on = !isDone && (asked.length || done.length ? isAsked : !wk && !h);
        if (on) total++;
        var tag = isDone ? 'already recorded as a day off' : isAsked ? 'requested' : wk ? 'weekend' : h ? esc(h.name) : '';
        return '<label class="check opt"><input type="checkbox" name="pick" value="' + esc(u.username + '|' + d) + '"' + (on ? ' checked' : '') + (isDone ? ' disabled' : '') + '><span><b>' + esc(fDate(d, { weekday: 'short', month: 'short', day: 'numeric' })) + '</b>' + (tag ? '<small>' + tag + '</small>' : '') + '</span></label>';
      }).join('') + '</fieldset>';
  });
  M.id = t.id;
  modal('Which days use offset?', body + '<label class="check" style="margin-top:4px"><input type="checkbox" name="override">Allow even if someone does not have enough offset</label>',
    '<button type="button" class="btn btn-ghost" data-act="close">Back</button><button class="btn btn-primary" type="submit" id="todGo">' + todLabel(total) + '</button>', 'toDays');
}
function bal2(u){ try { return stats(u).avail || 0; } catch(e){ return 0; } }
function todLabel(n){ return n ? 'Prepare · use ' + n + ' day' + (n > 1 ? 's' : '') : 'Prepare · no offset used'; }
document.addEventListener('change', function(ev){ var f = ev.target.closest && ev.target.closest('form[data-form="toDays"]'); if (!f) return;
  var b = document.getElementById('todGo'); if (b) b.textContent = todLabel(f.querySelectorAll('input[name=pick]:checked').length); });
function toEntries(t){ var seen = {}; return S.entries.filter(function(e){ var hit = e.autoToId === t.id || e.toId === t.id || e.id === t.entryId || e.id === t.useEntryId; if (hit && !seen[e.id]){ seen[e.id] = 1; return true; } return false; }); }
/* a person's travel orders from the last month on, newest first, each opening its quick view */
function personTOs(u){
  var from = addDays(today(), -30), ts = S.travelOrders.filter(function(t){ return t.status !== 'Cancelled' && (t.usernames || []).indexOf(u) >= 0 && t.dateTo >= from; }).sort(function(a, b){ return a.dateFrom < b.dateFrom ? 1 : -1; }).slice(0, 5);
  if (!ts.length) return '';
  return '<div class="label" style="margin-top:12px">Travel orders</div><ul class="list boxed">' + ts.map(function(t){
    return '<li class="row tap" data-act="toView" data-id="' + t.id + '" tabindex="0"><span class="mark ' + (isOffsetTO(t) ? 'use' : 'earn') + '">' + ic(isOffsetTO(t) ? 'plane' : 'route') + '</span><div class="body"><div class="t">' + esc(t.event) + '</div><div class="m">' + fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric' }) + (t.destination ? ' · ' + esc(t.destination) : '') + '</div></div>' + toStatusPill(t) + '</li>'; }).join('') + '</ul>';
}
/* one travel order with everything around it, each part tappable */
function toView(id){
  var t = S.travelOrders.filter(function(x){ return x.id === id; })[0]; if (!t) return toast('That travel order was not found.');
  var adm = isAdmin(), mine = t.createdBy === S.me.username, canEdit = adm || (mine && t.status === 'Filed' && !isLeader());
  var ev = t.eventId && S.events.filter(function(x){ return x.id === t.eventId; })[0], cl = toDayOffClash(t).map(function(c){ return c.name; }), ents = toEntries(t);
  var row = function(k, v){ return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; };
  var body = '<div class="sumbox"><b>' + esc(t.event) + '</b><span>' + fRange(t.dateFrom, t.dateTo, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + (t.destination ? ' · ' + esc(t.destination) : '') + '</span></div>' +
    (isOffsetTO(t) ? '<div class="info-note">' + ic('plane') + '<span>Made for an offset or day off. The people on it are not dispatched' + (ev ? ' to the event' : '') + '.</span></div>' : '') + clashNote(t) +
    '<dl class="kvs tov">' + row('Status', toStatusPill(t) + (t.printedAt ? ' <span class="pill Confirmed">Printed ' + fDate(String(t.printedAt).slice(0, 10), { month:'short', day:'numeric' }) + '</span>' : '')) +
      row('Type', t.toType === 'dayoff' ? 'Day off (uses offset)' : 'Regular') + (t.toNo ? row('TO No.', esc(t.toNo)) : '') +
      (ev ? row('Event', '<button type="button" class="lnk" data-act="evPick" data-id="' + esc(ev.id) + '">' + esc(ev.title) + '</button>') : '') +
      (adm || t.tev ? row('TEV', esc(t.tev || 'Not set')) : '') + row('Filed by', linkPerson(t.createdBy, userName(t.createdBy)) + ' · ' + ago(t.createdAt)) + '</dl>' +
    '<div class="dsec">People</div><div class="to-names">' + sortNames(t.names).map(function(n){ var u = nameToUser(n), lab = dispName(n) + (cl.indexOf(n) >= 0 ? ' · day off' : '');
      return '<span' + (cl.indexOf(n) >= 0 ? ' class="dayoff"' : '') + '>' + linkPerson(u, lab) + '</span>'; }).join('') + '</div>' +
    (ents.length ? '<div class="dsec">' + (ents.some(function(e){ return e.type === 'USE'; }) ? 'Makes these valid' : 'Offset it covers') + '</div><ul class="list">' + ents.map(function(e){ return entryRow(e, { showName: true }); }).join('') + '</ul>' : '');
  modal('Travel order', body,
    '<button type="button" class="btn btn-ghost" data-act="toCopy" data-id="' + t.id + '">' + ic('list') + 'Copy</button>' +
    (canEdit ? '<button type="button" class="btn btn-ghost" data-act="toEdit" data-id="' + t.id + '">' + ic('edit') + 'Edit</button>' : '') +
    (adm ? '<button type="button" class="btn ' + (t.status === 'Filed' ? 'btn-primary' : 'btn-ghost') + '" data-act="toManage" data-id="' + t.id + '">' + ic('shield') + (t.status === 'Filed' ? 'Prepare' : 'Update') + '</button>' : '') +
    '<button type="button" class="btn ' + (adm && t.status === 'Filed' ? 'btn-ghost' : 'btn-primary') + '" data-act="close">Close</button>');
}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act]'); if (t && t.dataset.act === 'toView'){ ev.stopPropagation(); toView(t.dataset.id); } }, true);
/* Records: 100 more rows per tap; the new rows fade in */
document.addEventListener('click', function(ev){ var a = ev.target.closest('[data-act="recMore"]'); if (!a) return;
  var had = document.querySelectorAll('main tbody tr').length; S.recLimit = (S.recLimit || 100) + 100; render();
  staggerIn(Array.prototype.slice.call(document.querySelectorAll('main tbody tr'), had, had + 12)); });
document.addEventListener('click', function(ev){ var a = ev.target.closest('[data-act="needAll"]'); if (a){ S.needAll = !S.needAll; render(); if (S.needAll) staggerIn(Array.prototype.slice.call(document.querySelectorAll('main .nday'), 4)); } });
/* dashboard sections: a tap anywhere on the title bar (not on its buttons or menus) folds or unfolds it */
document.addEventListener('click', function(ev){
  var h = ev.target.closest('.grid.dash > section.panel[data-w] > .panel-h'); if (!h || !rowTap(ev)) return;
  var b = h.querySelector('.fold-t'); if (b) b.click();
});
/* TEV groups: tap a travel order's header to show or hide its people */
document.addEventListener('click', function(ev){
  var a = ev.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'tevAllOpen'){ S.tevAllOpen = !S.tevAllOpen; S.tevOpen = {}; render(); return; }
  if (a.dataset.act !== 'tevGrp') return;
  var id = a.dataset.id, on = !a.classList.contains('open'), rows = document.querySelectorAll('li.tevmem[data-g="' + id + '"]');
  a.classList.toggle('open', on); a.setAttribute('aria-expanded', String(on)); S.tevOpen[id] = on;
  if (on){ rows.forEach(function(r){ r.classList.remove('shut'); }); staggerIn(rows); return; }
  // closing: the people fade out quickly, then hide
  if (lessMotion()){ rows.forEach(function(r){ r.classList.add('shut'); }); return; }
  var left = rows.length; rows.forEach(function(r){ var an = r.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: MOTION.outMs, easing: MOTION.easeIn });
    settle(an, MOTION.outMs, function(){ if (!a.classList.contains('open')) r.classList.add('shut'); }); });
});
/* ---------- motion ----------
   Same rhythm as the pop-ups: things arrive in 0.24s easing out, leave in 0.17s easing in. JavaScript
   animations check "reduce motion" themselves (the CSS rule only stops CSS animations). */
var MOTION = { inMs: 240, outMs: 170, easeOut: 'cubic-bezier(.22,1,.36,1)', easeIn: 'cubic-bezier(.55,0,1,.45)' };
function lessMotion(){ return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
/* open or close a block smoothly: its height follows, and what appears fades in one after another.
   setOpen(bool) applies the real state; a new tap cancels a running animation, so it never gets stuck. */
function smoothToggle(el, setOpen, open, reveal){
  if (lessMotion() || !el.animate){ setOpen(open); return; }
  if (el._anim){ el._anim.cancel(); }
  var h0 = el.getBoundingClientRect().height;
  setOpen(open); var h1 = el.getBoundingClientRect().height;
  if (!open) setOpen(true);                       // keep the content visible while it closes
  el.style.overflow = 'hidden';
  var a = el._anim = el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: open ? MOTION.inMs : MOTION.outMs, easing: open ? MOTION.easeOut : MOTION.easeIn });
  var done = function(){ if (el._anim !== a) return; el._anim = null; el.style.overflow = ''; if (!open) setOpen(false); };
  a.oncancel = function(){ if (el._anim === a){ el._anim = null; el.style.overflow = ''; } };
  settle(a, open ? MOTION.inMs : MOTION.outMs, done);
  if (open && reveal) Array.prototype.forEach.call(el.querySelectorAll(reveal), function(c, i){
    settle(c.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.inMs, delay: Math.min(i, 6) * 35, easing: MOTION.easeOut, fill: 'backwards' }), MOTION.inMs + 210); });
}
/* safety net: if the page stops drawing (app in the background), jump the animation to its end so nothing stays half-open or invisible */
/* settle(an, ms, then): `then` runs exactly once, when the animation ends, or from the timer if the page never draws the end */
function settle(an, ms, then){
  var ran = false, go = function(){ if (ran) return; ran = true; if (then) then(); };
  an.addEventListener('finish', go);
  setTimeout(function(){ try { if (an.playState !== 'finished' && an.playState !== 'idle') an.finish(); } catch(e){} go(); }, ms + 200);
  return an;
}
/* fade rows in one after another (a list that just appeared) */
function staggerIn(nodes){ if (lessMotion()) return; Array.prototype.forEach.call(nodes, function(c, i){ if (c.animate) settle(c.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.inMs, delay: Math.min(i, 8) * 30, easing: MOTION.easeOut, fill: 'backwards' }), MOTION.inMs + Math.min(i, 8) * 30); }); }
/* a tap on the row itself, not on a link, button or field inside it, and not while selecting text */
function rowTap(ev){ var c = ev.target.closest('a,button,input,select,textarea,label,[data-person],[data-entry],[data-act]:not(.to-head):not(.tev-grp)'); if (c) return false; var s = window.getSelection && String(window.getSelection()); return !s; }

/* travel order rows start compact (one summary line); tap anywhere on the row to open the names, tags and buttons */
S.toOpen = S.toOpen || {};
function toSetOpen(li, on){ li.classList.toggle('open', on); var h = li.querySelector('.to-head'); if (h) h.setAttribute('aria-expanded', String(on)); S.toOpen[li.dataset.to] = on; }
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="toAll"]');
  if (t){ S.toAllOpen = !S.toAllOpen; S.toOpen = {}; render(); if (S.toAllOpen) staggerIn(document.querySelectorAll('main .to-card')); return; }
  var head = ev.target.closest('.to-head'), li = ev.target.closest('.to-card'); if (!li) return;
  if (!head && !rowTap(ev)) return;
  // follow the last tap, not the in-between state of a row that is still closing
  var cur = li._want != null ? li._want : li.classList.contains('open'), on = !cur; li._want = on;
  smoothToggle(li, function(b){ toSetOpen(li, b); }, on, '.to-names,.to-body>.row-btns,.to-body>.clash,.to-acts');
});
function toSummary(t){
  var names = sortNames(t.names), q = (S.toQ || '').toLowerCase(), hit = q ? names.filter(function(n){ return n.toLowerCase().indexOf(q) >= 0; }) : [];
  var show = hit.concat(names.filter(function(n){ return hit.indexOf(n) < 0; })).slice(0, 2).map(dispName), more = names.length - show.length, clash = toDayOffClash(t).length;
  return '<span class="to-sum">' + toStatusPill(t) + (t.toType === 'dayoff' ? '<span class="pill off">Day off</span>' : '') + (clash ? '<span class="pill Pending" title="Someone on it has a day off">' + ic('plane') + clash + ' day off</span>' : '') +
    '<span class="to-who">' + ic('users') + esc(show.join(', ')) + (more > 0 ? ' +' + more : '') + '</span></span>';
}
function toRow(t){
  var adm = isAdmin(), mine = t.createdBy === S.me.username, canEdit = adm || (mine && t.status === 'Filed' && !isLeader()), open = !!(S.toOpen[t.id] || S.toAllOpen);
  return '<li class="to-card' + (open ? ' open' : '') + '" data-to="' + t.id + '"><div class="to-date"><b>' + fDate(t.dateFrom, { month:'short' }).toUpperCase() + '</b><span class="num">' + pd(t.dateFrom).getDate() + (t.dateTo !== t.dateFrom ? '–' + pd(t.dateTo).getDate() : '') + '</span></div>' +
    '<div class="to-body"><button type="button" class="to-head" data-act="toToggle" data-id="' + t.id + '" aria-expanded="' + open + '"><span class="t">' + esc(t.event) + '</span><span class="to-chev" aria-hidden="true">' + ic('right') + '</span></button>' +
      '<div class="m">' + fRange(t.dateFrom, t.dateTo, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + (t.destination ? ' · ' + esc(t.destination) : '') + (t.toNo ? ' · TO No. ' + esc(t.toNo) : '') + '</div>' + toSummary(t) +
      '<div class="to-names">' + (function(){ var cl = toDayOffClash(t).map(function(c){ return c.name; });
        return sortNames(t.names).map(function(n){ var lab = dispName(n) + (cl.indexOf(n) >= 0 ? ' · day off' : ''); return '<span' + (cl.indexOf(n) >= 0 ? ' class="dayoff" title="Has a day off on these dates"' : '') + '>' + linkPerson(nameToUser(n), lab) + '</span>'; }).join(''); })() + '</div>' +
      clashNote(t) +
      '<div class="row-btns"><span class="pill ' + (t.status === 'Prepared' ? 'Confirmed' : t.status === 'Cancelled' ? 'Rejected' : 'Pending') + '">' + t.status + '</span>' + (adm || t.tev ? '<span class="pill ' + (t.tev === 'Yes' ? 'hol' : 'off') + '">TEV: ' + (t.tev || 'not set') + '</span>' : '') + (t._saving ? '<span class="pill off">Saving…</span>' : '') + evChip(t) + (t.auto ? '<span class="pill off">From an approved offset</span>' : '') + (t.toType === 'dayoff' ? '<span class="pill off">Day off · uses offset</span>' : '') + (adm && t.status === 'Prepared' && !t.printedAt ? '<span class="pill Pending">Not printed</span>' : '') + (t.printedAt ? '<span class="pill Confirmed">Printed ' + fDate(String(t.printedAt).slice(0, 10), { month:'short', day:'numeric' }) + '</span>' : '') + '<span class="hint">Filed by ' + esc(userName(t.createdBy)) + ' · ' + ago(t.createdAt) + '</span></div></div>' +
    '<div class="to-acts' + (t._saving ? ' is-saving' : '') + '">' + (adm ? '<button class="btn btn-sm ' + (t.status === 'Filed' ? 'btn-primary' : 'btn-ghost') + '" data-act="toManage" data-id="' + t.id + '">' + ic('shield') + (t.status === 'Filed' ? 'Prepare' : 'Update') + '</button>' : '') +
      '<button class="btn btn-sm btn-ghost" data-act="toView" data-id="' + t.id + '">' + ic('right') + 'Details</button>' +
      '<div class="to-icons"><button class="btn btn-sm btn-ghost" data-act="toCopy" data-id="' + t.id + '" title="Copy the text for the document">' + ic('list') + 'Copy</button>' + (adm && t.status === 'Prepared' && !t.printedAt ? '<button class="btn btn-sm btn-ghost" data-act="toMarkPrinted" data-id="' + t.id + '">' + ic('check') + 'Mark printed</button>' : '') + (canEdit ? '<button class="btn btn-sm btn-ghost" data-act="toEdit" data-id="' + t.id + '">' + ic('edit') + 'Edit</button>' : '') + '</div></div>' + '</li>';
}
function moveModal(id){
  var e = S.entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  M = { id: id };
  modal('Reschedule day off', '<div class="sumbox"><b>' + esc(userName(e.username)) + '</b><span>Now on ' + fDate(e.date, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + ' · ' + fD(e.days) + '</span></div>' +
    '<div class="field"><label for="mvd">New date</label><input class="input" id="mvd" name="date" type="date" min="' + today() + '" required><span class="hint">The approval stays and the offset balance does not change.</span></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Reschedule</button>', 'moveUse');
}
function prepPrompt(t, tev, pr){
  if (!tev && !pr) return;
  var n = (t.names || []).length;
  modal('Travel order prepared', '<p style="margin:0">' + (pr ? 'Print <b>' + esc(t.event) + '</b> now so it is ready to sign. ' : '') + (tev ? 'A TEV was started for each of the ' + n + ' ' + (n === 1 ? 'person' : 'people') + '. Fill in the amounts now or later from <b>TEVs</b> under Field work.' : '') + '</p>',
    '<button type="button" class="btn btn-ghost" data-act="close">Later</button>' + (tev ? '<button type="button" class="btn ' + (pr ? 'btn-ghost' : 'btn-primary') + '" data-act="tevGo" data-id="' + t.id + '">' + ic('peso') + 'Make TEVs</button>' : '') + (pr ? '<button type="button" class="btn btn-primary" data-act="toPrint" data-id="' + t.id + '">' + ic('print') + 'Print now</button>' : ''));
}
/* ----- Events, dispatch orders and the shared calendar ----- */
var EV_NEEDS = ['Photo Documentation', 'Video Documentation', 'Livestreaming', 'News and Write-up', 'Emcee or Hosting', 'Other'];
var EV_LABEL = { need: 'Incomplete', wait: 'Waiting for TO', ok: 'Ready', off: 'Cancelled', dayoff: 'Day off only' };
/* An event is incomplete until it has a place and the people who will cover it. It can be saved incomplete. */
function evMissing(e){ var m = []; if (!String(e.venue || '').trim()) m.push('place'); if (!evPeople(e).length) m.push('people'); else if (evKind(e) === 'tasking' && e.crewOpen) m.push('more people'); return m; }
function inProd(){ if (!S.me) return false; if (isAdmin()) return true; var d = divOf(S.me.division); return !!(d && /production/i.test(d.name)); }
function dayDiff(a, b){ return Math.round((pd(a) - pd(b)) / 864e5); }
function evKind(e){ return e.kind === 'tasking' ? 'tasking' : 'travel'; }
/* Travel orders made only to make an offset or day off valid (day-off travel orders and the ones started for
   offsets) can name an event, but the people on them were NOT dispatched to it. They never count as dispatch. */
function isOffsetTO(t){ return t.toType === 'dayoff' || !!t.forOffset || !!t.entryId || !!t.useEntryId; }
function evLinked(e){ return S.travelOrders.filter(function(t){ return t.eventId === e.id && t.status !== 'Cancelled' && !isOffsetTO(t); }); }
function evOffsetTOs(e){ return S.travelOrders.filter(function(t){ return t.eventId === e.id && t.status !== 'Cancelled' && isOffsetTO(t); }); }
/* someone on a dispatch travel order who has a day off on the event date is not really dispatched either */
function evOffAll(u, t, e){ if (!u) return false; var a = t.dateFrom > e.date ? t.dateFrom : e.date, b = t.dateTo < (e.dateTo || e.date) ? t.dateTo : (e.dateTo || e.date);
  for (var d = a; d <= b; d = addDays(d, 1)){ if (!dayOffOn(u, d)) return false; } return true; }
function evOnDayOff(u, e){ if (!u) return false; for (var d = e.date; d <= (e.dateTo || e.date); d = addDays(d, 1)){ if (dayOffOn(u, d)) return true; } return false; }
/* An event added only to carry someone's day-off travel order: nobody is dispatched to it and nobody needs to be,
   so it is not "incomplete". Marked offsetOnly when added from the day-off flow; older ones are recognised by
   being added in the same step as their day-off travel order. Once real travel orders or assignments exist,
   it is an ordinary event again. */
function evDayOffOnly(e){
  if (evKind(e) === 'tasking' || (e.assigned || []).length || evLinked(e).length) return false;
  var offs = evOffsetTOs(e); if (!offs.length) return false;
  if (e.offsetOnly) return true;
  return !e.requester && !(e.needs || []).length && offs.some(function(t){ return e.createdAt && (t.updatedAt === e.createdAt || t.createdAt === e.createdAt); });
}
function evState(e){
  if (e.status === 'Cancelled') return 'off';
  if (evDayOffOnly(e)) return 'dayoff';
  if (!String(e.venue || '').trim()) return 'need';
  if (evKind(e) === 'tasking') return (e.assigned || []).length && !e.crewOpen ? 'ok' : 'need';
  var real = evPeople(e).filter(function(p){ return p.st === 'Prepared' || p.st === 'To prepare'; });
  if (!real.length) return evUnfiled(e).length ? 'wait' : 'need';
  return real.some(function(p){ return p.st === 'Prepared'; }) && !evUnfiled(e).length ? 'ok' : 'wait';
}
/* people a division leader assigned to a travel event who are not on a travel order for it yet */
function assignedOn(e, u, d){
  if ((e.assigned || []).indexOf(u) < 0) return false;
  var ad = e.assignDays && e.assignDays[u];
  return !d || !ad || !ad.length || ad.indexOf(d) >= 0;
}
/* "Nov 24 only" / "Nov 23–24 only" for someone assigned on some days of a multi-day event */
function assignPart(e, u){
  var ad = e.assignDays && e.assignDays[u]; if (!ad || !ad.length) return '';
  var f = function(d){ return fDate(d, { month: 'short', day: 'numeric' }); }, x = ad.slice().sort();
  return x.length === 1 ? f(x[0]) + ' only' : x.map(f).join(', ') + ' only';
}
function evDays(e){ var out = []; for (var d = e.date; d <= (e.dateTo || e.date) && out.length < 62; d = addDays(d, 1)) out.push(d); return out; }
function evUnfiled(e, day){
  if (evKind(e) === 'tasking') return [];
  var onTO = {}; evLinked(e).forEach(function(t){ (t.usernames || []).forEach(function(u){ onTO[u] = 1; }); (t.names || []).forEach(function(n){ onTO['#' + n] = 1; }); });
  return (e.assigned || []).filter(function(u){ var x = userOf(u); return !onTO[u] && !(x && onTO['#' + x.name.toUpperCase()]) && (!day || assignedOn(e, u, day)); });
}
/* the day an event card is drawn for (inside a day pop-up), so people show only on the days their travel order covers */
var EV_DAY = '';
function evDayFor(e){ return EV_DAY && e.date <= EV_DAY && (e.dateTo || e.date) >= EV_DAY ? EV_DAY : ''; }
/* a travel order that covers only part of a multi-day event: which days, e.g. "Nov 19 only" */
function toPartOf(t, e){
  var a = t.dateFrom > e.date ? t.dateFrom : e.date, b = t.dateTo < (e.dateTo || e.date) ? t.dateTo : (e.dateTo || e.date);
  if (a === e.date && b === (e.dateTo || e.date)) return '';
  var f = function(d){ return fDate(d, { month: 'short', day: 'numeric' }); };
  return a === b ? f(a) + ' only' : f(a) + '–' + f(b) + ' only';
}
function evPeople(e, day){
  if (evKind(e) === 'tasking') return (e.assigned || []).filter(function(u){ return !day || assignedOn(e, u, day); }).filter(function(u){ return !(day && dayOffOn(u, day)); })
    .map(function(u){ var x = userOf(u); return { name: x ? x.name : u, u: u, st: '', part: day ? '' : assignPart(e, u) }; });
  var out = [], seen = {}, e2 = e.dateTo || e.date;
  evLinked(e).forEach(function(t){
    if (day && !(t.dateFrom <= day && t.dateTo >= day)) return;          // their travel order does not cover this day
    if (t.dateTo < e.date || t.dateFrom > e2) return;                     // or any day of the event
    (t.names || []).forEach(function(n, i){ if (seen[n]) return;
    var u = (t.usernames || [])[i] || ((S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]) || {}).username || '';
    // on a day off on that day (or on every day their order covers): not dispatched
    if (day ? (u && dayOffOn(u, day)) : evOffAll(u, t, e)) return;
    seen[n] = 1;
    out.push({ name: dispName(n), u: u, st: t.status === 'Prepared' ? 'Prepared' : 'To prepare', part: day ? '' : toPartOf(t, e) }); }); });
  evUnfiled(e, day).forEach(function(u){ var x = userOf(u); out.push({ name: x ? x.name : u, u: u, st: 'Assigned', part: day ? '' : assignPart(e, u) }); });
  return out;
}
function evMine(e, u, d){ return evKind(e) === 'tasking' ? assignedOn(e, u, d) : evPeople(e, d).some(function(p){ return p.u === u; }); }
function evTime(h){ var p = String(h).split(':'), n = Number(p[0]); return (n % 12 || 12) + ':' + p[1] + ' ' + (n < 12 ? 'AM' : 'PM'); }
function evTimes(e){ return e.time ? evTime(e.time) + (e.timeEnd ? ' to ' + evTime(e.timeEnd) : '') : (e.timeEnd ? 'Until ' + evTime(e.timeEnd) : ''); }
function evDates(e){
  var o = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
  if (!e.dateTo || e.dateTo === e.date) return fDate(e.date, o);
  return fDate(e.date, { weekday:'short', month:'short', day:'numeric' }) + ' to ' + fDate(e.dateTo, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + ' (' + (dayDiff(e.dateTo, e.date) + 1) + ' days)';
}
function evShort(e){ return e.dateTo && e.dateTo !== e.date ? fRange(e.date, e.dateTo, { month:'short', day:'numeric' }) : fDate(e.date, { weekday:'short', month:'short', day:'numeric' }); }
function evRelText(e){ var td = today(); if (e.dateTo < td) return 'past'; if (e.date <= td) return e.date === td ? 'today' : 'happening now'; var n = dayDiff(e.date, td); return n === 1 ? 'tomorrow' : n < 14 ? 'in ' + n + ' days' : 'in ' + Math.round(n / 7) + ' weeks'; }
function evSort(a, b){ return a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.time || '') !== (b.time || '') ? ((a.time || '') < (b.time || '') ? -1 : 1) : (a.title < b.title ? -1 : 1); }
function evNeedsText(e){ return (e.needs || []).map(function(n){ return n === 'Other' && e.needOther ? 'Other: ' + e.needOther : n; }); }
function evLinkHtml(t){
  if (!t.eventId) return '';
  var e = S.events.filter(function(x){ return x.id === t.eventId; })[0];
  return '<input type="hidden" name="eventId" value="' + esc(t.eventId) + '">' + (e ? '<div class="info-note">' + ic('megaphone') + '<span>For the event <b>' + esc(e.title) + '</b> · ' + esc(e.venue) + ' · ' + esc(evDates(e)) + (evNeedsText(e).length ? '<br>Needed: ' + esc(evNeedsText(e).join(', ')) : '') + '</span></div>' : '');
}
function evChip(t){ var e = t.eventId && S.events.filter(function(x){ return x.id === t.eventId; })[0]; return e ? '<button type="button" class="pill off evlink" data-act="evPick" data-id="' + esc(e.id) + '" title="Open this event">' + ic('megaphone') + esc(e.title) + '</button>' : ''; }
/* "Cancel this event?" in the app's own pop-up (it replaces the day pop-up; Keep event goes back to it). */
function evCancelAsk(id){
  var e = S.events.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  modal('Cancel this event?', '<p style="margin:0"><b>' + esc(e.title) + '</b> · ' + fDate(e.date) + '</p><p class="hint" style="margin:8px 0 0">Travel orders already filed for it stay as they are.</p>',
    '<button type="button" class="btn btn-ghost" data-act="evBack">Keep event</button><button type="button" class="btn btn-danger" data-act="evCancelYes" data-id="' + esc(e.id) + '">' + ic('x') + 'Cancel event</button>');
}
/* ---------- duplicate events ----------
   Two events are likely the same when their names share most of their meaningful words (common words, years
   and "to cover / to document" are ignored; short forms like PB or SP are expanded) and their dates overlap or
   are a day or two apart. A matching place and time make it more likely. Pairs marked "not the same" are left alone. */
var DUP_STOP = {};
('the a an of and or to for in on at by with from into ng sa mga at ang para kay ni ng event events activity activities ' +
 'cover covering coverage document documentation documenting livestream livestreaming emcee hosting serve photo video ' +
 'pio camarines norte camnorte daet capitol province provincial office').split(' ').forEach(function(w){ DUP_STOP[w] = 1; });
var DUP_SYN = { pb: 'board', sp: 'sangguniang panlalawigan', sb: 'sangguniang bayan', gov: 'governor', vgov: 'vice governor', vg: 'vice governor',
  mtg: 'meeting', mtng: 'meeting', conf: 'conference', sem: 'seminar', orient: 'orientation', ceremony: 'ceremony', ceremonies: 'ceremony',
  '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', bday: 'birthday', anniv: 'anniversary', dept: 'department',
  doj: 'department justice', dilg: 'interior local government', deped: 'education', dswd: 'social welfare development', doh: 'health',
  dti: 'trade industry', da: 'agriculture', denr: 'environment natural resource', dict: 'information communication technology',
  pnp: 'police', bfp: 'fire protection', lgu: 'local government', ched: 'higher education', tesda: 'technical skill' };
function dupWords(str){
  var out = {}, n = 0;
  String(str || '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').split(' ').forEach(function(w){
    (DUP_SYN[w] || w).split(' ').forEach(function(x){
      if (x.length < 2 || DUP_STOP[x] || /^(19|20)\d\d$/.test(x)) return;
      if (x.length > 4 && /s$/.test(x) && !/ss$/.test(x)) x = x.slice(0, -1);
      if (!out[x]){ out[x] = 1; n++; } }); });
  out._n = n; return out;
}
function dupSim(a, b){
  var A = dupWords(a), B = dupWords(b); if (!A._n || !B._n) return 0;
  var inter = 0; for (var k in A) if (k !== '_n' && B[k]) inter++;
  var jac = inter / (A._n + B._n - inter), cont = inter / Math.min(A._n, B._n);
  return Math.max(jac, cont * (Math.min(A._n, B._n) >= 2 ? 0.9 : 0.7));   // "Media Appreciation Day" inside a longer name still counts
}
function dupDateSim(a, b){
  var a2 = a.dateTo || a.date, b2 = b.dateTo || b.date, gap = a.date > b2 ? dayDiff(a.date, b2) : b.date > a2 ? dayDiff(b.date, a2) : 0;
  return gap <= 0 ? 1 : gap === 1 ? 0.6 : gap === 2 ? 0.3 : 0;
}
function evDupScore(a, b){
  if (!a.date || !b.date) return 0;
  var d = dupDateSim(a, b); if (!d) return 0;
  var t = dupSim(a.title, b.title); if (t < 0.34) return 0;
  var v = a.venue && b.venue ? dupSim(a.venue, b.venue) : 0.5, sc = t * 0.6 + d * 0.25 + v * 0.15;
  if (a.time && b.time && Math.abs(parseInt(a.time) * 60 + parseInt(a.time.slice(3)) - parseInt(b.time) * 60 - parseInt(b.time.slice(3))) > 180) sc *= 0.85;
  return Math.round(sc * 100) / 100;
}
function notDupPair(a, b){ return (a.notDup || []).indexOf(b.id) >= 0 || (b.notDup || []).indexOf(a.id) >= 0; }
/* events that look like e (e may be an unsaved form), best match first */
function evDupes(e, min){
  return S.events.filter(function(x){ return x.id !== e.id && x.status !== 'Cancelled' && !notDupPair(e, x); })
    .map(function(x){ return { e: x, s: evDupScore(e, x) }; }).filter(function(m){ return m.s >= (min || 0.55); })
    .sort(function(a, b){ return b.s - a.s; });
}
function dupLikely(sc){ return sc >= 0.75 ? 'Very likely the same' : 'Possibly the same'; }
/* pairs among recent and upcoming events (from two weeks ago on) */
function dupPairs(){
  var from = addDays(today(), -14), evs = S.events.filter(function(e){ return e.status !== 'Cancelled' && (e.dateTo || e.date) >= from; }).sort(evSort), out = [];
  for (var i = 0; i < evs.length; i++) for (var j = i + 1; j < evs.length; j++){
    if (notDupPair(evs[i], evs[j])) continue; var sc = evDupScore(evs[i], evs[j]); if (sc >= 0.55) out.push({ a: evs[i], b: evs[j], s: sc }); }
  return out.sort(function(x, y){ return y.s - x.s; });
}
function dupMini(e){
  var tos = evLinked(e).length + evOffsetTOs(e).length, ppl = evPeople(e).length;
  return '<div class="dup-ev"><b>' + esc(e.title) + '</b><span>' + esc(evDates(e)) + (evTimes(e) ? ' · ' + esc(evTimes(e)) : '') + '</span>' +
    '<span>' + (e.venue ? esc(e.venue) : '<i>No place yet</i>') + '</span>' +
    '<span class="hint">' + (ppl ? ppl + ' ' + (ppl === 1 ? 'person' : 'people') : 'Nobody dispatched') + (tos ? ' · ' + tos + ' travel order' + (tos > 1 ? 's' : '') : '') + ' · added by ' + esc(firstName(e.createdBy) || e.createdBy || '—') + '</span></div>';
}
/* review all likely duplicates: keep one of each pair (the other is merged into it) or mark them as different */
function dupReview(){
  var pairs = dupPairs();
  if (!pairs.length){ if (document.querySelector('#modal .dup-pair, #modal [data-form=evRemove]')) closeModal(); toast('No likely duplicates left'); return; }
  modal('Possible duplicate events',
    '<p class="hint" style="margin:0 0 4px">Keep the right one: the other is removed, and its people and travel orders move to the one you keep.</p>' +
    pairs.map(function(x){
      return '<div class="dup-pair"><div class="dup-top"><span class="pill ' + (x.s >= 0.75 ? 'e-need' : 'e-wait') + '">' + dupLikely(x.s) + ' · ' + Math.round(x.s * 100) + '%</span>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="dupNot" data-a="' + esc(x.a.id) + '" data-b="' + esc(x.b.id) + '">Not the same</button></div>' +
        '<div class="dup-two">' + [[x.a, x.b], [x.b, x.a]].map(function(k){ return '<div class="dup-col">' + dupMini(k[0]) +
          '<button type="button" class="btn btn-sm btn-primary" data-act="dupKeep" data-keep="' + esc(k[0].id) + '" data-drop="' + esc(k[1].id) + '">' + ic('check') + 'Keep this one</button></div>'; }).join('') + '</div></div>';
    }).join(''),
    '<button type="button" class="btn btn-ghost" data-act="close">Done</button>');
}
var RM_WHY = [
  ['resched', 'Rescheduled', 'It is moving to another date. The event stays, with its people.'],
  ['cancel', 'Cancelled', 'It will not happen. It stays on the calendar, crossed out.'],
  ['dup', 'Duplicate entry', 'It was added twice. Pick the copy to keep; this one is removed.']];
/* remove an event, always with a reason */
function evRemoveAsk(id, pre){
  var e = S.events.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  var why = RM_WHY.filter(function(r){ return !(r[0] === 'cancel' && e.status === 'Cancelled'); });
  pre = pre && why.some(function(r){ return r[0] === pre; }) ? pre : '';
  var cands = evDupes(e, 0.3).slice(0, 5), near = cands.length ? [] : S.events.filter(function(x){ return x.id !== e.id && x.status !== 'Cancelled' && Math.abs(dayDiff(x.date, e.date)) <= 3; }).sort(evSort).slice(0, 6);
  var pick = function(x, i, sc){ return '<label class="check opt"><input type="radio" name="into" value="' + esc(x.id) + '"' + (i === 0 && sc >= 0.55 ? ' checked' : '') + '><span><b>' + esc(x.title) + '</b><small>' + esc(evShort(x)) + (x.venue ? ' · ' + esc(x.venue) : '') + (sc ? ' · ' + dupLikely(sc).toLowerCase() + ' (' + Math.round(sc * 100) + '%)' : '') + '</small></span></label>'; };
  M = { id: e.id };
  modal('Remove this event?',
    '<div class="sumbox"><b>' + esc(e.title) + '</b><span>' + esc([evDates(e), e.venue].filter(Boolean).join(' · ')) + '</span></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Why?</legend>' +
      why.map(function(r){ return '<label class="check opt"><input type="radio" name="why" value="' + r[0] + '"' + (pre === r[0] ? ' checked' : '') + ' required><span><b>' + r[1] + '</b><small>' + r[2] + '</small></span></label>'; }).join('') + '</fieldset>' +
    '<div class="rm-part" data-for="resched"' + (pre === 'resched' ? '' : ' hidden') + '><div class="two"><div class="field"><label for="rmD1">New date</label><input class="input" id="rmD1" name="date" type="date" value="' + esc(e.date) + '"></div>' +
      '<div class="field"><label for="rmD2">Until <span class="hint">(if more than one day)</span></label><input class="input" id="rmD2" name="dateTo" type="date" value="' + (e.dateTo && e.dateTo !== e.date ? esc(e.dateTo) : '') + '"></div></div>' +
      '<p class="hint" style="margin:0 0 8px">Travel orders already made for it keep their dates. Update them if they need to change.</p></div>' +
    '<div class="rm-part" data-for="dup"' + (pre === 'dup' ? '' : ' hidden') + '><fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Keep which event?</legend>' +
      (cands.length ? cands.map(function(m, i){ return pick(m.e, i, m.s); }).join('') : near.map(function(x, i){ return pick(x, i, 0); }).join('') + (near.length ? '' : '<p class="hint" style="margin:0 0 6px">No similar events found nearby.</p>')) +
      '<label class="check opt"><input type="radio" name="into" value="__none"' + (cands.length && cands[0].s >= 0.55 ? '' : ' checked') + '><span><b>None of these</b><small>Just remove this entry.</small></span></label>' +
      ((evLinked(e).length + evOffsetTOs(e).length + (e.assigned || []).length) ? '<p class="hint" style="margin:6px 0 0">Its people and travel orders move to the event you keep.</p>' : '') + '</fieldset></div>' +
    '<div class="field rm-part" data-for="resched cancel dup"' + (pre ? '' : ' hidden') + '><label for="rmN">Note <span class="hint">(optional)</span></label><input class="input" id="rmN" name="note" maxlength="200" placeholder="e.g. moved by the organizer, per letter"></div>',
    '<button type="button" class="btn btn-ghost" data-act="evBack">Keep event</button><button class="btn btn-danger" type="submit" id="rmGo">' + rmLabel(pre) + '</button>', 'evRemove');
}
function rmLabel(w){ return w === 'resched' ? ic('month') + 'Move event' : w === 'dup' ? ic('trash') + 'Remove duplicate' : w === 'cancel' ? ic('x') + 'Cancel event' : 'Remove event'; }
document.addEventListener('change', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="evRemove"]'); if (!f || ev.target.name !== 'why') return;
  var w = ev.target.value;
  f.querySelectorAll('.rm-part').forEach(function(x){ x.hidden = x.dataset.for.split(' ').indexOf(w) < 0; });
  var go = document.getElementById('rmGo'); if (go){ go.innerHTML = rmLabel(w); go.className = 'btn ' + (w === 'resched' ? 'btn-primary' : 'btn-danger'); }
});
/* the event form warns while you type when the event looks like one already on the calendar */
var dupT = null;
document.addEventListener('input', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveEvent"]'); if (!f || ['title', 'venue', 'date', 'dateTo', 'time'].indexOf(ev.target.name) < 0) return;
  clearTimeout(dupT); dupT = setTimeout(function(){ evFormDupes(f); }, 250);
});
function evFormDupes(f){
  var box = f.querySelector('#evDup'); if (!box) return;
  var g = function(n){ var x = f.querySelector('[name="' + n + '"]'); return x ? x.value : ''; };
  var cand = { id: g('id'), title: g('title'), venue: g('venue'), date: g('date'), dateTo: g('dateTo') || g('date'), time: g('time') };
  var cur = S.events.filter(function(x){ return x.id === cand.id; })[0]; if (cur) cand.notDup = cur.notDup;
  var m = String(cand.title).trim().length >= 3 ? evDupes(cand, 0.55).slice(0, 3) : [];
  var was = box.dataset.ids || '', ids = m.map(function(x){ return x.e.id; }).join(',');
  if (ids === was) return;
  box.dataset.ids = ids; box.hidden = !m.length;
  var strong = !cand.id && m.some(function(x){ return x.s >= 0.75; });
  box.innerHTML = m.length ? '<div class="dup-h">' + ic('flag') + '<b>Is this already on the calendar?</b></div>' +
    m.map(function(x){ return '<div class="dup-row"><span><b>' + esc(x.e.title) + '</b><small>' + esc(evShort(x.e)) + (x.e.venue ? ' · ' + esc(x.e.venue) : '') + ' · ' + dupLikely(x.s).toLowerCase() + ' (' + Math.round(x.s * 100) + '%)</small></span>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="dupOpen" data-id="' + esc(x.e.id) + '">Open it</button></div>'; }).join('') +
    '<input type="hidden" name="notDupIds" value="' + esc(ids) + '">' +
    (strong ? '<label class="check" style="margin-top:8px"><input type="checkbox" name="notDupOk" required>It’s a different event. Add it anyway.</label>' : '') : '';
  if (m.length && !lessMotion()) settle(box.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.inMs, easing: MOTION.easeOut }), MOTION.inMs);
}
function evBackToDay(){ if (S.pop) dayPop(S.pop); else closeModal(); }
function evDispatch(e){
  var n0 = (e.needs || [])[0] || '', pre = /^Photo|^Video/.test(n0) ? 'To document ' : n0 === 'Livestreaming' ? 'To livestream ' : n0 === 'Emcee or Hosting' ? 'To serve as emcee for ' : 'To cover ';
  // people the division leader assigned are filled in, so the admin only prepares the paper
  var un = evUnfiled(e), names = un.map(function(u){ var x = userOf(u); return x ? x.name.toUpperCase() : ''; }).filter(Boolean);
  // people going only some days: the travel order covers just those days
  var dd = []; un.forEach(function(u){ evDays(e).forEach(function(d){ if (assignedOn(e, u, d) && dd.indexOf(d) < 0) dd.push(d); }); }); dd.sort();
  var d1 = dd[0] || e.date, d2 = dd[dd.length - 1] || e.dateTo || e.date;
  toModal('', { event: pre + e.title, destination: e.venue, dateFrom: d1, dateTo: d2 !== d1 ? d2 : '', eventId: e.id, names: names });
}
function evPrompt(e){
  var tasking = evKind(e) === 'tasking';
  modal('Event added', '<div class="sumbox"><b>' + esc(e.title) + '</b><span>' + esc(e.venue) + ' · ' + esc(evDates(e)) + '</span></div>' +
    '<div class="field"><span class="label">What is needed</span><div>' + esc(evNeedsText(e).join(', ') || 'Not specified yet') + '</div></div>' +
    '<p style="margin:0">Nobody is dispatched yet. ' + (tasking ? 'Assign the people who will cover it so it shows on their dashboards.' : 'Prepare the travel order now so the event is covered.') + (e.status === 'Pending' ? ' An admin still needs to confirm the event.' : '') + '</p>',
    '<button type="button" class="btn btn-ghost" data-act="close">Later</button>' + (tasking || isLeader() ? (canSched() ? '<button type="button" class="btn btn-primary" data-act="evAssign" data-id="' + e.id + '">' + ic('users') + 'Assign people</button>' : '') : '<button type="button" class="btn btn-primary" data-act="evDispatch" data-id="' + e.id + '">' + ic('route') + 'Prepare travel order</button>'));
}
function evModal(id){
  var e = S.events.filter(function(x){ return x.id === id; })[0] || { title: '', venue: '', date: S.selDay || today(), dateTo: '', time: '', timeEnd: '', kind: 'travel', requester: '', contact: '', needs: [], needOther: '', note: '' }, adm = isAdmin();
  var kinds = [['travel', 'Travel order', 'Outside the Capitol'], ['tasking', 'Dispatch order', 'Within the Capitol and office hours']];
  modal(e.id ? 'Edit event' : 'Add an event',
    '<input type="hidden" name="id" value="' + esc(e.id || '') + '">' +
    '<div class="field"><label for="evt">Event name</label><input class="input" id="evt" name="title" maxlength="160" value="' + esc(e.title) + '" placeholder="e.g. Provincial Board regular session" required></div><div class="dupwarn" id="evDup" hidden></div>' +
    '<div class="field"><label for="evv">Location <span class="hint">(you can add it later)</span></label><input class="input" id="evv" name="venue" maxlength="160" value="' + esc(e.venue) + '" placeholder="e.g. Capitol Gym, Daet"></div>' +
    '<div class="two"><div class="field"><label for="evd1">When</label><input class="input" id="evd1" name="date" type="date" value="' + esc(e.date) + '" required></div><div class="field"><label for="evd2">Until when <span class="hint">(if more than one day)</span></label><input class="input" id="evd2" name="dateTo" type="date" value="' + (e.dateTo && e.dateTo !== e.date ? esc(e.dateTo) : '') + '"></div></div>' +
    '<div class="field"><label for="evtm">Time of the event</label><input class="input" id="evtm" name="time" type="time" value="' + esc(e.time || '') + '"><input type="hidden" name="timeEnd" value="' + esc(e.timeEnd || '') + '"></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0 0 12px"><legend class="label" style="margin-bottom:6px">How will staff be sent?</legend><div class="seg">' + kinds.map(function(o, i){ return '<input type="radio" name="kind" id="evk' + i + '" value="' + o[0] + '"' + (evKind(e) === o[0] ? ' checked' : '') + '><label for="evk' + i + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></label>'; }).join('') + '</div></fieldset>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0 0 12px"><legend class="label" style="margin-bottom:6px">What is needed?</legend><div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' + EV_NEEDS.map(function(n){ return '<label class="check" style="padding:10px 12px"><input type="checkbox" name="need" value="' + esc(n) + '"' + ((e.needs || []).indexOf(n) >= 0 ? ' checked' : '') + '><span>' + esc(n) + '</span></label>'; }).join('') + '</div><input class="input" name="needOther" maxlength="120" value="' + esc(e.needOther || '') + '" placeholder="If Other, what is needed?" aria-label="Other, what is needed" style="margin-top:8px"></fieldset>' +
    '<div class="field"><label for="evr">Requested by <span class="hint">(optional)</span></label><input class="input" id="evr" name="requester" maxlength="120" value="' + esc(e.requester || '') + '" placeholder="Office or group on the request letter"></div>' +
    '<div class="field"><label for="evn">Notes <span class="hint">(optional)</span></label><textarea class="input" id="evn" name="note" maxlength="400" rows="2">' + esc(e.note || '') + '</textarea></div>' +
    '<div class="field"><label for="evc">Contact person <span class="hint">(optional)</span></label><input class="input" id="evc" name="contact" maxlength="120" value="' + esc(e.contact || '') + '" placeholder="Name and number"></div>' +
    '<div class="info-note">' + ic('shield') + '<span>' + (adm ? 'Events you add are confirmed right away.' : 'An admin confirms the event. Editing a confirmed event asks for confirmation again.') + '</span></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (e.id ? 'Save event' : 'Add event') + '</button>', 'saveEvent');
  var ef = document.querySelector('#modal form[data-form="saveEvent"]'); if (ef) evFormDupes(ef);
}
function assignModal(id){
  var e = S.events.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  M = { id: id };
  var cur = e.assigned || [], staff = S.users.filter(function(u){ return u.active; }), seen = {};
  var group = function(title, us){ return us.length ? '<div class="dsec">' + esc(title) + '</div><div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' + us.map(function(u){ var s = statusOn(u.username, e.date); return '<label class="check" style="padding:10px 12px"><input type="checkbox" name="user" value="' + esc(u.username) + '"' + (cur.indexOf(u.username) >= 0 ? ' checked' : '') + '><span>' + esc(u.name) + (s ? ' <small class="hint">' + esc(KIND[s.kind][0]) + '</small>' : '') + '</span></label>'; }).join('') + '</div>' : ''; };
  var body = '<div class="sumbox"><b>' + esc(e.title) + '</b><span>' + esc(evDates(e)) + (evTimes(e) ? ' · ' + esc(evTimes(e)) : '') + ' · ' + esc(e.venue) + '</span></div>' +
    S.divisions.map(function(d){ var us = staff.filter(function(u){ return u.division === d.id; }); us.forEach(function(u){ seen[u.username] = 1; }); return group(d.short || d.name, us); }).join('') + group('Others', staff.filter(function(u){ return !seen[u.username]; })) +
    '<div class="info-note" style="margin-top:12px">' + ic('megaphone') + '<span>People you assign see this on their dashboard and in Notifications.' + (evKind(e) === 'tasking' ? '' : ' An admin prepares the travel order with them filled in.') + '</span></div>';
  var tasking = evKind(e) === 'tasking';
  modal(tasking ? 'Dispatch order' : 'Assign people', body, '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (tasking ? 'Save dispatch order' : 'Save people') + '</button>', 'assignEvent');
}
function evCard(e){
  var st = evState(e), cs = canSched(), adm = isAdmin(), tasking = evKind(e) === 'tasking', ppl = evPeople(e, evDayFor(e)), mine = evMine(e, S.me.username), ts = evLinked(e);
  var row = function(k, v){ return '<dt>' + k + '</dt><dd>' + v + '</dd>'; };
  var people = ppl.length ? '<div class="pp pbubs">' + ppl.map(function(p){ return personBubble(p.u, p.name, { cls: p.st === 'To prepare' || p.st === 'Assigned' ? 'wait' : p.st ? 'ok' : '', sub: esc([p.st, p.part].filter(Boolean).join(' · ')), tip: [p.st, p.part].filter(Boolean).join(' · ') }); }).join('') + '</div>' : (e.status === 'Cancelled' ? '<span class="hint">None</span>' : st === 'dayoff' ? '<span class="hint">No one needed: this event only carries a day-off travel order</span>' : '<span class="pill e-need">No one dispatched yet</span>');
  // people whose day-off travel order names this event: shown apart, never as dispatched
  var offN = []; evOffsetTOs(e).forEach(function(t){ (t.names || []).forEach(function(n){ if (offN.indexOf(n) < 0) offN.push(n); }); });
  if (offN.length) people += '<div class="hint" style="margin-top:6px">' + ic('plane') + ' Day off only, not dispatched: ' + offN.map(function(n){ return linkPerson(nameToUser(n), dispName(n)); }).join(', ') + '</div>';
  var gear = inProd() ? S.inventory.filter(function(i){ return i.eventId === e.id && i.status === 'Out'; }) : [];
  var acts = '';
  if (e.status !== 'Cancelled'){
    if (tasking){ if (cs) acts += '<button type="button" class="btn btn-sm ' + (st === 'need' ? 'btn-primary' : 'btn-ghost') + '" data-act="evAssign" data-id="' + e.id + '">' + ic('users') + (ppl.length ? 'Change dispatch order' : 'Assign people') + '</button>'; }
    // travel events: leaders assign the people; admins (and staff for themselves) prepare the travel order with them filled in
    else if (isLeader()) acts += '<button type="button" class="btn btn-sm ' + (st === 'need' ? 'btn-primary' : 'btn-ghost') + '" data-act="evAssign" data-id="' + e.id + '">' + ic('users') + ((e.assigned || []).length ? 'Change people' : 'Assign people') + '</button>';
    else acts += '<button type="button" class="btn btn-sm ' + (st === 'need' || evUnfiled(e).length ? 'btn-primary' : 'btn-ghost') + '" data-act="evDispatch" data-id="' + e.id + '">' + ic('route') + (evUnfiled(e).length ? 'Prepare travel order for ' + evUnfiled(e).length : ppl.length ? 'Add another travel order' : 'Prepare travel order') + '</button>';
    if (adm && e.status === 'Pending') acts += '<button type="button" class="btn btn-sm btn-ghost" data-act="evConfirm" data-id="' + e.id + '">' + ic('check') + 'Confirm event</button>';
  }
  // each travel order for this event opens directly (dispatch ones first, then day-off ones)
  var allTs = ts.concat(evOffsetTOs(e));
  if (allTs.length) people += '<div class="ev-tos">' + ic('route') + allTs.map(function(t){ return linkTO(t, (isOffsetTO(t) ? 'Day off: ' : '') + sortNames(t.names).map(dispName).slice(0, 2).join(', ') + (t.names.length > 2 ? ' +' + (t.names.length - 2) : '')) + ' ' + toStatusPill(t); }).join('<span class="sep" aria-hidden="true">·</span>') + '</div>';
  if (cs){
    acts += '<button type="button" class="btn btn-sm btn-ghost" data-act="evEdit" data-id="' + e.id + '">' + ic('edit') + 'Edit</button>';
    if (e.status === 'Cancelled' && adm) acts += '<button type="button" class="btn btn-sm btn-ghost" data-act="evReopen" data-id="' + e.id + '">Reopen</button>';
    acts += '<button type="button" class="btn btn-sm btn-ghost btn-rm" data-act="evRemove" data-id="' + e.id + '">' + ic('trash') + 'Remove</button>';
  }
  return '<article class="dcard ' + st + '" data-ev="' + esc(e.id) + '"><h4>' + esc(e.title) + ' <span class="pill e-' + st + '">' + EV_LABEL[st] + '</span>' + (e.status === 'Pending' ? '<span class="pill Pending">Unconfirmed</span>' : '') + (mine ? '<span class="pill Confirmed">You</span>' : '') +
    (cs && e.status !== 'Cancelled' && evDupes(e, 0.55).length ? '<button type="button" class="pill e-wait dup-chip" data-act="dupReview">' + ic('flag') + 'Possible duplicate</button>' : '') + '</h4><dl>' +
    (e.status === 'Cancelled' ? row('Removed', 'Cancelled' + (e.removeNote ? ' · ' + esc(e.removeNote) : '') + (e.updatedBy ? ' <span class="hint">by ' + esc(firstName(e.updatedBy)) + '</span>' : '')) : '') +
    ((e.moves || []).length ? row('Moved', (function(m){ var f = function(x){ return String(x).split(' to ').map(function(d){ return fDate(d, { month: 'short', day: 'numeric' }); }).join('–'); }; return 'From ' + esc(f(m.from)) + ' to ' + esc(f(m.to)) + (m.note ? ' · ' + esc(m.note) : ''); })(e.moves.slice(-1)[0])) :'') +
    row('Date', esc(evDates(e))) + (evTimes(e) ? row('Time', esc(evTimes(e))) : '') + row('Place', e.venue ? esc(e.venue) : '<span class="pill e-need">Not set yet</span>') +
    row('Sent by', tasking ? 'Dispatch order <span class="hint">(within the Capitol)</span>' : 'Travel order') + row('Dispatched', people) +
    row('Needed', evNeedsText(e).length ? evNeedsText(e).map(function(n){ return '<span class="pill off">' + esc(n) + '</span>'; }).join(' ') : '<span class="hint">Not specified</span>') +
    (e.requester ? row('Requested by', esc(e.requester)) : '') + (e.contact ? row('Contact', esc(e.contact)) : '') + (e.note ? row('Notes', esc(e.note)) : '') +
    (gear.length ? row('Gear', esc(gear.map(function(i){ return i.name; }).join(', '))) : '') +
    row('Status', e.status === 'Confirmed' ? 'Confirmed' + (e.confirmedBy ? ' by ' + esc(firstName(e.confirmedBy)) : '') : e.status === 'Pending' ? 'Waiting for an admin to confirm' : 'Cancelled') + '</dl>' +
    (acts ? '<div class="acts-row">' + acts + '</div>' : '') + '</article>';
}
function evLine(e){
  var st = evState(e), mine = evMine(e, S.me.username), soon = st === 'need' && e.date >= today() && dayDiff(e.date, today()) <= 7;
  return '<li class="evr ' + st + '"><button type="button" class="evh" data-act="evPick" data-id="' + e.id + '"><span class="evbar" aria-hidden="true"></span><span class="evm"><b>' + esc(e.title) + '</b><small>' + esc(evShort(e)) + (evTimes(e) ? ' · ' + esc(evTimes(e)) : '') + ' · ' + esc(e.venue) + ' · <span class="' + (soon ? 'evsoon' : '') + '">' + esc(evRelText(e)) + '</span></small></span><span class="pills"><span class="pill e-' + st + '">' + EV_LABEL[st] + '</span>' + (mine ? '<span class="pill Confirmed">You</span>' : '') + (e.status === 'Pending' ? '<span class="pill Pending">Unconfirmed</span>' : '') + '</span><span class="evx">' + ic('right') + '</span></button></li>';
}
function dayPop(k, inPlace){
  if (!inPlace) S.popF = null;          // a freshly opened day shows all its events
  S.pop = k;
  var td = today(), adm = isAdmin(), cs = canSched(), h = holidayOn(k), future = k >= td;
  // events sorted by status: the ones that still need people come first (red, then amber, then green),
  // or ready first, or simply by time
  var popSort = S.popSort || 'need', RANK = popSort === 'ok' ? { ok: 0, wait: 1, need: 2, off: 3 } : { need: 0, wait: 1, ok: 2, off: 3 };
  var evs = S.events.filter(function(e){ return e.date <= k && e.dateTo >= k; }).sort(function(a, b){
    if (popSort !== 'time'){ var r = (RANK[evState(a)] || 0) - (RANK[evState(b)] || 0); if (r) return r; } return evSort(a, b); });
  var cnt = { need: 0, wait: 0, ok: 0 }; evs.forEach(function(e){ var s = evState(e); if (cnt[s] != null) cnt[s]++; });
  // tapping a count shows only those events; tapping it again shows all
  var popF = S.popF && cnt[S.popF] ? S.popF : null, total = evs.length;
  if (popF) evs = evs.filter(function(e){ return evState(e) === popF; });
  var sortBar = total > 1 ? '<div class="popsort"><div class="pop-cnt" role="group" aria-label="Show only">' + [['need', 'Need people'], ['wait', 'Waiting for TO'], ['ok', 'Ready']].filter(function(x){ return cnt[x[0]]; }).map(function(x){ return '<button type="button" class="pcnt" data-act="popF" data-f="' + x[0] + '" aria-pressed="' + (popF === x[0]) + '"><i class="lg b-' + x[0] + '" aria-hidden="true"></i><b>' + cnt[x[0]] + '</b> ' + x[1] + (popF === x[0] ? ic('x') : '') + '</button>'; }).join('') + '</div>' +
    nameToggle() + '<div class="tabs" role="group" aria-label="Sort events">' + [['need', 'Needs people first'], ['ok', 'Ready first'], ['time', 'By time']].map(function(x){ return '<button type="button" data-act="popSort" data-s="' + x[0] + '" aria-pressed="' + (popSort === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' : '';
  var away = []; S.users.filter(function(u){ return u.active; }).forEach(function(u){ var s = statusOn(u.username, k); if (s) away.push({ u: u, s: s }); });
  var ents = S.entries.filter(function(e){ return e.date === k && e.status !== 'Rejected' && (adm || e.username === S.me.username); });
  var body = (h ? '<div class="info-note">' + ic('flag') + '<span>' + esc(h.name) + ' · ' + esc(h.kind) + ' holiday</span></div>' : '') +
    '<div class="dlay"><div class="dmain"><div class="dsec">Events' + (total ? ' <span class="hint">· ' + (popF ? evs.length + ' of ' + total : total) + '</span>' : '') + '</div>' + sortBar + (evs.length ? '<div class="agenda">' + (EV_DAY = k, evs.map(function(e){ return agRow(e, k); }).join('') + (EV_DAY = '')) + '</div>' : '<p class="hint" style="margin:0 0 8px">No events on this day.</p>') +
    '</div><aside class="dside"><div class="dsec">Out of the office</div>' + (away.length ? '<div class="pp">' + away.map(function(x){ return '<span class="pill st-' + (x.s.kind === 'to' ? 'to' : 'lv') + ' pill-av">' + avatarHtml(x.u, 20) + esc(shortName(x.u) || firstName(x.u.username)) + ' · ' + esc(x.s.kind === 'to' ? 'Travel: ' + x.s.label : x.s.label) + '</span>'; }).join('') + '</div>' : '<p class="hint" style="margin:0">Everyone is in.</p>') +
    (ents.length ? '<div class="dsec">Offsets</div><ul class="list">' + ents.map(function(e){ return entryRow(e, { showName: adm }); }).join('') + '</ul>' : '') + '</aside></div>';
  var foot = '<button type="button" class="btn btn-ghost" data-act="close">Close</button>' + (cs ? '<button type="button" class="btn btn-primary" data-act="evNew" data-d="' + k + '">' + ic('plus') + 'Add event</button>' : '') +
    (adm ? '<button type="button" class="btn btn-ghost" data-act="useModal" data-date="' + k + '">' + ic('minus') + 'Record use</button>' : '') +
    (future ? '<button type="button" class="btn btn-ghost" data-act="requestModal" data-date="' + k + '">' + ic('plane') + 'Use offset</button>' : '<button type="button" class="btn btn-ghost" data-act="logOn" data-date="' + k + '">' + ic('plus') + 'Log offset</button>');
  if (inPlace && document.querySelector('#modal .panel-b')) return popSwap(body);
  modal(fDate(k, { weekday:'long', month:'long', day:'numeric', year:'numeric' }), body, foot);
  var md = document.querySelector('#modal .modal'); if (md) md.classList.add('day-wide');
}
/* change the pop-up's contents without reopening it: cards that stay glide to their new place,
   cards that come back fade in, so sorting and filtering read as a reorder, not a reload */
function agRow(e, k){
  var st = evState(e), t = String(e.time || ''), h = +t.slice(0, 2), m = t.slice(3, 5);
  var time = /^\d\d:\d\d$/.test(t) ? '<b>' + ((h % 12) || 12) + ':' + m + '</b><small>' + (h < 12 ? 'AM' : 'PM') + '</small>' : '<b class="ag-all">All day</b>';
  var e2 = e.dateTo || e.date, n = dayDiff(e2, e.date) + 1, at = dayDiff(k, e.date) + 1;
  return '<div class="ag-row" data-ag="' + esc(e.id) + '"><div class="ag-time ' + st + '">' + time + (n > 1 ? '<small class="ag-day">Day ' + at + ' of ' + n + '</small>' : '') + '<i class="ag-dot" aria-hidden="true"></i></div>' + evCard(e) + '</div>';
}
function popSwap(body){
  var sc = document.querySelector('#modal .panel-b'), old = {}, top = sc.scrollTop;
  sc.querySelectorAll('.ag-row[data-ag]').forEach(function(c){ var r0 = c.getBoundingClientRect(); old[c.dataset.ag] = { t: r0.top, l: r0.left }; });
  var foc = document.activeElement && document.activeElement.closest('#modal [data-act]'), fsel = foc && (foc.dataset.act === 'popF' ? '[data-act="popF"][data-f="' + foc.dataset.f + '"]' : foc.dataset.act === 'popSort' ? '[data-act="popSort"][data-s="' + foc.dataset.s + '"]' : null);
  sc.innerHTML = body + '<p class="error" id="merr" role="alert"></p>'; sc.scrollTop = top;
  var nf = fsel && sc.querySelector(fsel); if (nf) nf.focus({ preventScroll: true });
  if (lessMotion()) return;
  var i = 0, dur = 340;
  sc.querySelectorAll('.ag-row[data-ag]').forEach(function(c){
    var o = old[c.dataset.ag];
    if (o != null){ var r1 = c.getBoundingClientRect(), dy = o.t - r1.top, dx = o.l - r1.left; if (Math.abs(dy) > 1 || Math.abs(dx) > 1) settle(c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: dur, easing: MOTION.easeOut }), dur); }
    else { var d = Math.min(i++, 6) * 40; settle(c.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.inMs, delay: d, easing: MOTION.easeOut, fill: 'backwards' }), MOTION.inMs + d); }
  });
}
function refreshPop(){ if (S.pop && document.getElementById('modal') && document.querySelector('#modal .dcard, #modal .dsec')) dayPop(S.pop, true); }
/* sorting in the day pop-up; the choice is remembered on this device */
try { S.popSort = localStorage.getItem('pio_popsort') || 'need'; } catch(e){}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="popSort"]'); if (!t) return;
  if (t.getAttribute('aria-pressed') === 'true') return;
  S.popSort = t.dataset.s; lSet('pio_popsort', S.popSort); dayPop(S.pop, true); });
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="popF"]'); if (!t) return;
  S.popF = S.popF === t.dataset.f ? null : t.dataset.f; dayPop(S.pop, true); });
function evTileModal(f){
  var td = today(), up = S.events.filter(function(e){ return e.status !== 'Cancelled' && e.dateTo >= td; }).sort(evSort);
  var list = f === 'upcoming' ? up : up.filter(function(e){ return evState(e) === f; });
  modal(f === 'upcoming' ? 'Upcoming events' : EV_LABEL[f], list.length ? '<ul class="evlist">' + list.map(evLine).join('') + '</ul>' : '<p class="hint" style="margin:0">Nothing here right now.</p>', '<button type="button" class="btn btn-ghost" data-act="close">Close</button>');
}
function calItems(mine){
  var me = S.me.username, adm = isAdmin(), items = [], live = {};
  S.events.forEach(function(e){ if (e.status === 'Cancelled') return; live[e.id] = 1; var mm = evMine(e, me); if (mine && !mm) return; var st = evState(e); items.push({ s: e.date, e: e.dateTo, gap: evGaps(e), cls: 'b-' + st, t: e.title, un: e.status === 'Pending', mine: mm, pr: st === 'need' ? 0 : st === 'wait' ? 1 : 2 }); });
  activeTOs().forEach(function(t){ if ((t.eventId && live[t.eventId]) || isOffsetTO(t)) return; var mm = (t.usernames || []).indexOf(me) >= 0; if (mine && !mm) return; items.push({ s: t.dateFrom, e: t.dateTo, cls: 'b-to', t: 'TO · ' + t.event, mine: mm, pr: 3 }); });
  S.leaves.forEach(function(l){ if (/^ADJ/.test(l.type)) return; var mm = l.username === me; if (mine && !mm) return; items.push({ s: l.dateFrom, e: l.dateTo, cls: 'b-lv', t: (adm && !mm ? firstName(l.username) + ' · ' : '') + leaveName(l.type), mine: mm, pr: 4 }); });
  S.entries.forEach(function(e){ if (e.type !== 'USE' || e.status === 'Rejected') return; var mm = e.username === me; if (mine && !mm) return; items.push({ s: e.date, e: e.date, cls: 'b-lv', t: (adm && !mm ? firstName(e.username) + ' · ' : '') + 'Day off', un: e.status === 'Pending', mine: mm, pr: 4 }); });
  if (!adm) S.board.forEach(function(b){ if (b.username === me || mine) return; items.push({ s: b.from, e: b.to, cls: 'b-lv', t: firstName(b.username) + ' · ' + (b.kind === 'leave' ? 'On leave' : 'Day off'), pr: 4 }); });
  return items;
}
/* days of a multi-day event that nobody covers, when somebody covers other days of it (null otherwise) */
function evGaps(e){
  var e2 = e.dateTo || e.date; if (e2 === e.date || !(evLinked(e).length || (e.assigned || []).length)) return null;
  var out = [], n = 0; for (var d = e.date; d <= e2 && n < 62; d = addDays(d, 1), n++){ if (!evPeople(e, d).length) out.push(d); }
  return out.length && out.length < n ? out : null;
}
function calWeek(ws, items, m){
  // events per day before "+N more": 6 on desktop and tablet; 8 on phones, where each event is a thin strip.
  // A week is only as tall as its busiest day, so quiet weeks stay compact.
  var narrow = window.innerWidth <= 640, we = addDays(ws, 6), td = today(), MAXL = narrow ? 8 : 6;
  var segs = items.filter(function(it){ return it.e >= ws && it.s <= we; }).map(function(it){ return { it: it, c0: Math.max(0, dayDiff(it.s, ws)), c1: Math.min(6, dayDiff(it.e, ws)), cl: it.s < ws, cr: it.e > we }; });
  segs.sort(function(a, b){ return a.c0 - b.c0 || a.it.pr - b.it.pr || (b.c1 - b.c0) - (a.c1 - a.c0); });
  var ends = []; segs.forEach(function(sg){ var l = 0; while (l < ends.length && ends[l] >= sg.c0) l++; ends[l] = sg.c1; sg.l = l; });
  var more = [0, 0, 0, 0, 0, 0, 0]; segs.forEach(function(sg){ if (sg.l >= MAXL) for (var c = sg.c0; c <= sg.c1; c++) more[c]++; });
  var cells = '';
  for (var c = 0; c < 7; c++){
    var k = addDays(ws, c), d = pd(k), h = holidayOn(k), col = c, names = segs.filter(function(sg){ return sg.c0 <= col && sg.c1 >= col; }).map(function(sg){ return sg.it.t + (sg.it.gap && sg.it.gap.indexOf(k) >= 0 ? ' (no one on this day)' : ''); });
    var cls = 'mc-day' + (d.getMonth() !== m ? ' out' : '') + (h ? ' hol' : '') + (k === td ? ' today' : '');
    var aria = fDate(k, { weekday:'long', month:'long', day:'numeric' }) + (h ? ', ' + h.name : '') + (names.length ? ': ' + names.join('; ') : ', nothing scheduled');
    cells += '<button type="button" class="' + cls + '" data-act="dayPop" data-d="' + k + '" aria-label="' + esc(aria) + '"><span class="mc-n">' + d.getDate() + '</span>' + (h ? '<span class="mc-hl">' + esc(h.name) + '</span>' : '') + (more[c] ? '<span class="mc-more">+' + more[c] + (narrow ? '' : ' more') + '</span>' : '') + '</button>';
  }
  var bars = segs.filter(function(sg){ return sg.l < MAXL; }).map(function(sg){ var it = sg.it; return '<span class="mc-bar ' + it.cls + (it.un ? ' b-un' : '') + (it.mine ? ' b-mine' : '') + (sg.cl ? ' cl' : '') + (sg.cr ? ' cr' : '') + '" style="--c0:' + sg.c0 + ';--c1:' + sg.c1 + ';--l:' + sg.l + ';--il:' + (sg.cl ? 0 : 4) + 'px;--ir:' + (sg.cr ? 0 : 4) + 'px">' + (it.gap ? '<span class="mc-t">' + esc(it.t) + '</span>' : esc(it.t)) + gapMarks(it, sg, ws) + '</span>'; }).join('');
  return '<div class="mc-wk" style="--lanes:' + Math.max(1, Math.min(MAXL, ends.length)) + '"><div class="mc-days">' + cells + '</div><div class="mc-bars" aria-hidden="true">' + bars + '</div></div>';
}
function gapMarks(it, sg, ws){
  if (!it.gap) return ''; var out = '', n = sg.c1 - sg.c0 + 1;
  for (var c = sg.c0; c <= sg.c1; c++){ var d = addDays(ws, c); if (it.gap.indexOf(d) < 0) continue;
    var prevGap = c > sg.c0 && it.gap.indexOf(addDays(ws, c - 1)) >= 0, edge = c > sg.c0 || sg.cl;
    out += '<i class="mc-gap' + (edge && !prevGap && c > sg.c0 ? ' gl' : '') + (c < sg.c1 && it.gap.indexOf(addDays(ws, c + 1)) < 0 ? ' gr' : '') + '" style="--g0:' + (c - sg.c0) + ';--gn:' + n + '"></i>'; }
  return out;
}
function dupNotice(){ if (!canSched()) return ''; var n = dupPairs().length; return n ? '<div class="dup-note"><span>' + ic('flag') + '<b>' + n + '</b> possible duplicate event' + (n > 1 ? 's' : '') + ' on the calendar</span><button type="button" class="btn btn-sm btn-ghost" data-act="dupReview">Review</button></div>' : ''; }
function viewCalendar(){
  if (!S.cal){ var t0 = pd(today()); S.cal = { y: t0.getFullYear(), m: t0.getMonth() }; }
  var y = S.cal.y, m = S.cal.m, first = new Date(y, m, 1), td = today(), cs = canSched();
  var gs = ymd(new Date(y, m, 1 - first.getDay())), mEnd = ymd(new Date(y, m + 1, 0)), items = calItems(!!S.calMine), weeks = '';
  for (var w = 0; w < 6; w++){ var ws = addDays(gs, w * 7); if (ws > mEnd) break; weeks += calWeek(ws, items, m); }
  var up = S.events.filter(function(e){ return e.status !== 'Cancelled' && e.dateTo >= td; }).sort(evSort), cnt = { need: 0, wait: 0, ok: 0 };
  up.forEach(function(e){ var s = evState(e); if (cnt[s] != null) cnt[s]++; });
  var unconf = up.filter(function(e){ return e.status === 'Pending'; }).length, nx = up[0], nn = up.filter(function(e){ return evState(e) === 'need'; })[0];
  var tiles = '<div class="tiles cal4" style="margin-bottom:16px">' + [
    ['upcoming', 'Upcoming', 'cal', String(up.length), (nx ? 'Next: ' + evRelText(nx) : 'Nothing scheduled') + (cs && unconf ? ' · ' + unconf + ' unconfirmed' : ''), ''],
    ['need', 'Incomplete', 'megaphone', String(cnt.need), cnt.need ? 'No place or people yet · next ' + evRelText(nn) : 'Nothing missing', cnt.need ? 'bad' : ''],
    ['wait', 'Waiting for TO', 'clock', String(cnt.wait), 'People named, travel order not prepared', cnt.wait ? 'warn' : ''],
    ['ok', 'Ready', 'check', String(cnt.ok), 'People assigned, papers done', 'ok']
  ].map(function(x){ return tile(x[1], x[3], x[4], x[5], x[2], 'data-act="evTile" data-f="' + x[0] + '"'); }).join('') + '</div>';
  var st = { to: 0, leave: 0, off: 0 }, act = S.users.filter(function(u){ return u.active; }); act.forEach(function(u){ var s = statusOn(u.username, td); if (s) st[s.kind === 'off' ? 'off' : s.kind]++; });
  var strip = '<div class="mcstrip"><span><b>' + (act.length - st.to - st.leave - st.off) + '</b> in the office today</span><span><b>' + st.to + '</b> on travel</span><span><b>' + (st.leave + st.off) + '</b> on leave or day off</span><button type="button" class="btn btn-sm btn-ghost" data-act="dayPop" data-d="' + td + '">See who</button></div>';
  var legend = '<div class="legend lgscroll" style="padding:0"><b class="lgh">Events</b><span><i class="lg b-need"></i>! Incomplete</span><span><i class="lg b-wait"></i>… Waiting for TO</span><span><i class="lg b-ok"></i>✓ Ready</span><span class="lgsep" aria-hidden="true"></span><b class="lgh">People</b><span><i class="lg b-to"></i>Travel order (no event)</span><span><i class="lg b-lv"></i>Leave or day off</span><span class="lgsep" aria-hidden="true"></span><span><i class="lg b-un"></i>Not yet confirmed</span><span><i class="lg lg-gap"></i>No one that day</span><span>★ Yours</span></div>';
  return { eyebrow: 'Calendar', title: first.toLocaleDateString('en-PH', { month:'long', year:'numeric' }), sub: 'Events, travel and days off. Tap a day for details.',
    actions: '<button type="button" class="btn btn-glass" data-act="calPrev" aria-label="Previous month">' + ic('left') + '</button><button type="button" class="btn btn-glass" data-act="calToday">Today</button><button type="button" class="btn btn-glass" data-act="calNext" aria-label="Next month">' + ic('right') + '</button>' + (cs ? '<button type="button" class="btn btn-sun" data-act="evNew">' + ic('plus') + 'Add event</button>' : ''),
    body: tiles + '<section class="panel"><div class="mcbar">' + strip + '<label class="keep" style="font-size:13.5px"><input type="checkbox" id="calMine"' + (S.calMine ? ' checked' : '') + '>Only mine</label></div>' + dupNotice() + '<div class="mcbar" style="padding-top:0">' + legend + '</div>' +
      '<div class="mc"><div class="mc-dow">' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(d){ return '<div>' + d + '</div>'; }).join('') + '</div>' + weeks + '</div></section>' };
}
/* ----- Notifications ----- */
function nGet(k){ try { return JSON.parse(lGet('pio_' + k + '_' + S.me.username) || '[]'); } catch(e){ return []; } }
function nSet(k, v){ lSet('pio_' + k + '_' + S.me.username, JSON.stringify(v)); }
function myAlerts(){
  var me = S.me.username, td = today(), out = [];
  S.events.forEach(function(e){
    if (e.status === 'Cancelled' || e.dateTo < td) return;
    if (evMine(e, me)){ out.push({ id: 'asg:' + e.id, e: e, kind: 'assigned', text: 'You are dispatched: ' + e.title }); var n = dayDiff(e.date, td); if (n >= 0 && n <= 1) out.push({ id: 'rem:' + e.id + ':' + td, e: e, kind: 'reminder', text: (n === 0 ? 'Today: ' : 'Tomorrow: ') + e.title }); }
    else if (canSched() && evState(e) === 'need' && dayDiff(e.date, td) <= 7) out.push({ id: 'need:' + e.id, e: e, kind: 'need', text: 'Incomplete event ' + evRelText(e) + ': ' + e.title });
  });
  S.travelOrders.forEach(function(t){ if (t.status === 'Prepared' && t.dateTo >= td && (t.usernames || []).indexOf(me) >= 0) out.push({ id: 'to:' + t.id, kind: 'to', text: 'Travel order ready: ' + t.event }); });
  return out;
}
function unreadCount(){ if (!S.me) return 0; var seen = nGet('seen'); return myAlerts().filter(function(a){ return seen.indexOf(a.id) < 0; }).length; }
function devNotifState(){ if (typeof Notification === 'undefined') return 'none'; if (Notification.permission === 'denied') return 'denied'; return Notification.permission === 'granted' && lGet('pio_dn_' + S.me.username) === '1' ? 'on' : 'off'; }
function showSys(title, body, tag){
  try {
    var o = { body: body, tag: tag, icon: 'icon-192.png', badge: 'icon-192.png' };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function(r){ if (r && r.showNotification) r.showNotification(title, o); else new Notification(title, o); });
    else new Notification(title, o);
  } catch(e){}
}
function checkNotify(){
  if (!S.me || devNotifState() !== 'on') return;
  var done = nGet('notified'), fresh = myAlerts().filter(function(a){ return done.indexOf(a.id) < 0; });
  if (!fresh.length) return;
  nSet('notified', done.concat(fresh.map(function(a){ return a.id; })).slice(-200));
  fresh.slice(0, 3).forEach(function(a){ showSys(a.kind === 'assigned' ? 'New dispatch' : a.kind === 'reminder' ? 'Reminder' : a.kind === 'need' ? 'Incomplete event' : 'Travel order ready', a.text, a.id); });
}
function notifModal(){
  var al = myAlerts(), seen = nGet('seen'), ds = devNotifState();
  al.sort(function(a, b){ var ua = seen.indexOf(a.id) < 0, ub = seen.indexOf(b.id) < 0; return ua === ub ? 0 : ua ? -1 : 1; });
  var rows = al.map(function(a){ var un = seen.indexOf(a.id) < 0; return '<li class="nrow' + (un ? ' unread' : '') + '"><button type="button" class="nbtn" ' + (a.e ? 'data-act="evPick" data-id="' + a.e.id + '"' : 'data-go="travel"') + '><span><b>' + esc(a.text) + '</b><small class="hint" style="display:block">' + (a.e ? esc(evShort(a.e) + (evTimes(a.e) ? ' · ' + evTimes(a.e) : '') + ' · ' + a.e.venue) : 'Open Travel orders') + '</small></span></button></li>'; }).join('');
  var dev = ds === 'none' ? '<p class="hint" style="margin:0">This browser cannot show device notifications.</p>' : ds === 'denied' ? '<p class="hint" style="margin:0">Notifications are blocked for this site. Allow them in your browser settings to turn them on.</p>' : ds === 'on' ? '<button type="button" class="btn btn-ghost" data-act="notifOff">Turn off device notifications</button>' : '<button type="button" class="btn btn-primary" data-act="notifOn">' + ic('bell') + 'Turn on device notifications</button>';
  modal('Notifications', (rows ? '<ul style="margin:0;padding:0">' + rows + '</ul>' : '<p class="hint" style="margin:0">Nothing new. Dispatches, reminders and ready travel orders show up here.</p>') + '<div class="dsec">On this device</div>' + dev + '<p class="hint" style="margin:8px 0 0">You get a notice when the app is open or when you open it. Alerts while the app is closed need an extra server setup.</p>', '<button type="button" class="btn btn-ghost" data-act="close">Close</button>');
  nSet('seen', al.map(function(a){ return a.id; })); var b = document.querySelector('.badge.bad[data-n]'); 
}
function bellBtn(side){ var n = unreadCount(); return side ? '<button data-act="notifs">' + ic('bell') + '<span>Notifications</span>' + (n ? '<span class="badge bad">' + n + '<span class="sr"> new</span></span>' : '') + '</button>' : '<button data-act="notifs" class="bellb" aria-label="Notifications' + (n ? ', ' + n + ' new' : '') + '">' + ic('bell') + (n ? '<span class="badge bad">' + n + '</span>' : '') + '</button>'; }
function needSoon(){ var td = today(), lim = addDays(td, 7); return S.events.filter(function(e){ return e.status !== 'Cancelled' && e.dateTo >= td && e.date <= lim && evState(e) === 'need'; }).length; }
function navBadge(id, pc){
  if (id === 'approvals') return pc ? '<span class="badge">' + pc + '</span>' : '';
  if (id === 'calendar' && canSched()){ var n = needSoon(); return n ? '<span class="badge bad">' + n + '<span class="sr"> events are incomplete</span></span>' : ''; }
  if (id === 'travel' && isAdmin()){ var k = S.travelOrders.filter(function(t){ return t.status === 'Filed'; }).length; return k ? '<span class="badge">' + k + '<span class="sr"> travel orders to prepare</span></span>' : ''; }
  return '';
}
/* ---------- your dispatches: what you are sent to, next one first ----------
   Travel orders with your name (day-off ones left out), dispatch orders you are on (only your days), and
   events a division leader assigned you to whose travel order is still to come. Next 45 days. */
function myTrips(){ return tripsFor(S.me.username, today(), addDays(today(), 45), true); }
function tripsFor(me, from, lim, clip){
  var td = clip ? from : '', seen = {}, list = [];
  var who = function(us){ return (us || []).filter(function(u, i, a){ return u && u !== me && a.indexOf(u) === i; }); };
  activeTOs().forEach(function(t){
    if (t._del || isOffsetTO(t) || (t.usernames || []).indexOf(me) < 0 || t.dateTo < from || t.dateFrom > lim) return;
    var e = t.eventId && S.events.filter(function(x){ return x.id === t.eventId; })[0], k = e ? 'e' + e.id : 't' + t.id; if (seen[k]) return; seen[k] = 1;
    list.push({ d1: td && t.dateFrom < td ? td : t.dateFrom, s1: t.dateFrom, d2: t.dateTo, title: e ? e.title : String(t.event || '').replace(/^to\s+(cover|document|livestream|attend|join)\s+(the\s+)?/i, ''),
      place: (e && e.venue) || t.destination || '', time: e ? evTimes(e) : '', ok: t.status === 'Prepared', st: t.status === 'Prepared' ? 'Travel order ready' : 'Travel order being prepared', with: who(t.usernames) });
  });
  S.events.forEach(function(e){
    if (e.status === 'Cancelled' || seen['e' + e.id] || (e.dateTo || e.date) < from || e.date > lim) return;
    var days = evDays(e).filter(function(d){ return d >= from && d <= lim && assignedOn(e, me, d); }); if (!days.length) return;
    var task = evKind(e) === 'tasking';
    list.push({ d1: days[0], s1: days[0], d2: days[days.length - 1], title: e.title, place: e.venue || '', time: evTimes(e), ok: task,
      st: task ? 'Dispatch order' : 'Assigned · travel order to follow', with: who((e.assigned || []).filter(function(u){ return assignedOn(e, u, days[0]); })) });
  });
  return list.sort(function(a, b){ return a.d1 < b.d1 ? -1 : a.d1 > b.d1 ? 1 : 0; });
}
/* this month at a glance: days at work so far (office and field) and the trips planned this month */
/* one working day of the month, the way the "days at work" count sees it */
function dayKindFor(u, d){
  var wk = [0, 6].indexOf(pd(d).getDay()) < 0 && !holidayOn(d), s = statusOn(u, d);
  if (s && s.kind === 'to') return 'field';
  if (!wk) return '';
  return s ? 'off' : 'office';
}
/* a tick for every working day this month: field, office, off, or still to come */
function monthTicks(u, ym){
  var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, last = new Date(y, m + 1, 0).getDate(), td = today(), out = '';
  for (var i = 1; i <= last; i++){
    var d = ymd(new Date(y, m, i)), k = d > td ? ([0, 6].indexOf(pd(d).getDay()) < 0 && !holidayOn(d) ? 'later' : '') : dayKindFor(u, d);
    if (!k) continue;
    out += '<i class="tk tk-' + k + (d === td ? ' now' : '') + '"></i>';
  }
  return '<span class="mt-ticks" aria-hidden="true">' + out + '</span>';
}
/* greeting card: who is out in the field today, as a stack of faces */
function fieldCrew(){
  var td = today(), crew = (S.users || []).filter(function(u){ var s = u.active && statusOn(u.username, td); return s && s.kind === 'to'; });
  if (!crew.length) return '';
  var names = crew.map(function(u){ return shortName(u); });
  return '<button type="button" class="crew" data-act="dayPop" data-d="' + td + '" aria-label="' + esc(crew.length + ' in the field today: ' + names.join(', ') + '. Open today.') + '">' +
    '<span class="crew-f">' + crew.slice(0, 5).map(function(u){ return avatarHtml(u, 28); }).join('') + (crew.length > 5 ? '<span class="crew-more">+' + (crew.length - 5) + '</span>' : '') + '</span>' +
    '<span class="crew-t"><b>' + crew.length + '</b> in the field today</span></button>';
}
function monthStrip(){
  var me = S.me.username, td = today(), ym = td.slice(0, 7), so = staffDays(me, ym, td);
  var mEnd = ymd(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0)), trips = tripsFor(me, ym + '-01', mEnd).length;
  var stat = function(n, l, c){ return '<span class="mt-stat ' + (c || '') + '"><b data-count="' + n + '">' + n + '</b><small>' + l + '</small></span>'; };
  return '<button type="button" class="mt-month" data-act="monthTrips" data-m="' + ym + '" aria-label="' + esc(fMonth(ym) + ': ' + (so.office + so.field) + ' days at work so far, ' + so.office + ' office, ' + so.field + ' field, ' + trips + ' travel orders this month. Open the list.') + '">' +
    '<span class="mt-mk">' + esc(fDate(ym + '-01', { month: 'long' })) + ' so far</span>' +
    stat(so.office + so.field, 'days at work', 'tot') + stat(so.office, 'office', 'off') + stat(so.field, 'field', 'fld') + stat(trips, trips === 1 ? 'trip this month' : 'trips this month', 'trp') +
    '<span class="mt-go" aria-hidden="true">' + ic('right') + '</span>' + monthTicks(me, ym) + '</button>';
}
function monthTripsModal(ym, who){
  who = who || S.me.username; ym = ym || today().slice(0, 7);
  var td = today(), y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, mEnd = ymd(new Date(y, m + 1, 0)), cur = ym === td.slice(0, 7), past = ym < td.slice(0, 7);
  var so = staffDays(who, ym, cur ? td : ''), full = staffDays(who, ym), L = tripsFor(who, ym + '-01', mEnd);
  var tile = function(n, l, c){ return '<div class="mm-t ' + (c || '') + '"><b>' + n + '</b><span>' + l + '</span></div>'; };
  var rows = L.length ? '<ul class="mm-list">' + L.map(function(x){
    var done = x.d2 < td, now = x.s1 <= td && x.d2 >= td, n = Math.max(1, dayDiff(x.d2, x.d1) + 1);
    return '<li><button type="button" class="mm-row' + (done ? ' done' : '') + '" data-act="dayPop" data-d="' + x.d1 + '"><span class="mm-d"><b>' + pd(x.d1).getDate() + '</b><small>' + esc(fDate(x.d1, { weekday: 'short' })) + '</small></span>' +
      '<span class="mm-b"><b>' + esc(x.title) + '</b><small>' + esc([n > 1 ? n + ' days, until ' + fDate(x.d2, { month: 'short', day: 'numeric' }) : '', x.place, x.st].filter(Boolean).join(' · ')) + '</small></span>' +
      '<span class="pill ' + (done ? 'off' : now ? 'Pending' : x.ok ? 'Confirmed' : 'Pending') + '">' + (done ? 'Done' : now ? 'Today' : x.ok ? 'Ready' : 'To follow') + '</span></button></li>'; }).join('') + '</ul>'
    : '<p class="hint" style="margin:10px 0">No travel orders or dispatch orders ' + (past ? 'in ' : 'for ') + esc(fMonth(ym)) + '.</p>';
  var nav = function(d){ var x = new Date(y, m + d, 1); return ymd(x).slice(0, 7); };
  modal((who === S.me.username ? 'Your ' : esc(firstName(who)) + '’s ') + esc(fMonth(ym)),
    '<div class="mm-nav"><button type="button" class="icon-btn" data-act="monthTrips" data-m="' + nav(-1) + '" data-u="' + esc(who) + '" aria-label="Previous month">' + ic('left') + '</button><b>' + esc(fMonth(ym)) + '</b><button type="button" class="icon-btn" data-act="monthTrips" data-m="' + nav(1) + '" data-u="' + esc(who) + '" aria-label="Next month">' + ic('right') + '</button></div>' +
    '<div class="mm-tiles">' + tile(so.office + so.field, cur ? 'Days at work so far' : 'Days at work', 'tot') + tile(so.office, 'Office', 'off') + tile(so.field, 'Field', 'fld') + tile(so.off, 'Off or leave', 'lv') + '</div>' +
    '<p class="hint" style="margin:0 0 6px">' + full.work + ' working days in ' + esc(fMonth(ym)) + ', counting weekdays and leaving out holidays. Field days are travel orders; dispatch orders count as office days.' + (cur ? ' By the end of the month: ' + full.field + ' field day' + (full.field === 1 ? '' : 's') + ' expected.' : '') + '</p>' +
    '<div class="dsec">Travel orders and dispatches · ' + L.length + '</div>' + rows,
    '<button type="button" class="btn btn-ghost" data-act="close">Close</button><button type="button" class="btn btn-primary" data-go="calendar">' + ic('cal') + 'Open calendar</button>');
}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="monthTrips"]'); if (!t) return; monthTripsModal(t.dataset.m, t.dataset.u); });
/* numbers count up once when the card first appears (secondary motion; skipped with reduced motion) */
function countUp(root){ if (lessMotion() || S._counted) return; S._counted = true;
  (root || document).querySelectorAll('.mt-month [data-count]').forEach(function(b, i){ var to = +b.dataset.count, t0 = null; if (!to) return;
    var step = function(ts){ if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 700), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); };
    b.textContent = '0'; setTimeout(function(){ requestAnimationFrame(step); }, 120 + i * 60); }); }
function tripWhen(x){
  var td = today(), n = dayDiff(x.d1, td);
  if (x.s1 <= td && x.d2 >= td) return x.d2 > x.s1 ? 'Today · day ' + (dayDiff(td, x.s1) + 1) + ' of ' + (dayDiff(x.d2, x.s1) + 1) : 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return 'In ' + n + ' days · ' + fDate(x.d1, { weekday: 'long' });
  return fDate(x.d1, { weekday: 'short', month: 'short', day: 'numeric' });
}
function tripWith(us){
  if (!us.length) return '<span class="mt-with solo">Just you</span>';
  return '<span class="mt-with"><span class="mt-faces">' + us.slice(0, 4).map(function(u){ return avatarHtml(userOf(u) || { username: u, name: u }, 26); }).join('') + '</span>' +
    esc(us.slice(0, 2).map(function(u){ return firstName(u); }).join(', ') + (us.length > 2 ? ' +' + (us.length - 2) : '')) + '</span>';
}
function myTripsWidget(n){
  var L = myTrips();
  setTimeout(countUp, 0);
  if (!L.length) return panel('Your dispatches', 'route', monthStrip() + '<div class="mt-empty"><span class="mt-ic">' + ic('route') + '</span><div><b>No dispatches coming up</b><span>When you are sent to an event, it shows here first.</span></div></div>', '', span(n) + ' mt-panel');
  var x = L[0], now = x.s1 <= today(), d = pd(x.d1);
  var hero = '<button type="button" class="mt-next' + (now ? ' now' : '') + '" data-act="dayPop" data-d="' + x.d1 + '" aria-label="' + esc(tripWhen(x) + ': ' + x.title) + '">' +
    '<span class="mt-date"><small>' + esc(fDate(x.d1, { month: 'short' })) + '</small><b>' + d.getDate() + '</b><small>' + esc(fDate(x.d1, { weekday: 'short' })) + '</small></span>' +
    '<span class="mt-body"><span class="mt-when">' + (now ? '<i class="mt-live" aria-hidden="true"></i>' : '') + esc(tripWhen(x)) + '</span><b class="mt-title">' + esc(x.title) + '</b>' +
      '<span class="mt-meta">' + (x.time ? '<span>' + ic('clock') + esc(x.time) + '</span>' : '') + (x.place ? '<span>' + ic('route') + esc(x.place) + '</span>' : '') + (x.d2 > x.d1 ? '<span>' + ic('cal') + 'Until ' + esc(fDate(x.d2, { month: 'short', day: 'numeric' })) + '</span>' : '') + '</span>' +
      '<span class="mt-foot"><span class="pill ' + (x.ok ? 'Confirmed' : 'Pending') + '">' + esc(x.st) + '</span>' + tripWith(x.with) + '</span></span>' +
    '<span class="mt-go" aria-hidden="true">' + ic('right') + '</span></button>';
  var rest = L.slice(1, 5).map(function(y){
    return '<li><button type="button" class="mt-row" data-act="dayPop" data-d="' + y.d1 + '"><span class="mt-d">' + esc(fDate(y.d1, { month: 'short', day: 'numeric' })) + '</span><span class="mt-rb"><b>' + esc(y.title) + '</b><small>' + esc(tripWhen(y)) + (y.place ? ' · ' + esc(y.place) : '') + '</small></span><span class="pill ' + (y.ok ? 'Confirmed' : 'Pending') + '">' + esc(y.ok ? 'Ready' : 'To follow') + '</span></button></li>'; }).join('');
  var more = L.length > 5 ? '<p class="hint" style="margin:8px 18px 14px">+' + (L.length - 5) + ' more in the calendar</p>' : '';
  return panel('Your dispatches <span class="pill Confirmed mt-count">' + L.length + '</span>', 'route', monthStrip() + '<div class="mt-wrap">' + hero + (rest ? '<ul class="mt-list">' + rest + '</ul>' : '') + more + '</div>',
    '<button type="button" class="btn btn-sm btn-ghost" data-go="calendar">' + ic('cal') + 'Calendar</button>', span(n) + ' mt-panel');
}
function comingWidget(n){
  var td = today(), me = S.me.username, cs = canSched(), horizon = addDays(td, 14);
  var up = S.events.filter(function(e){ return e.status !== 'Cancelled' && e.dateTo >= td; }).sort(evSort);
  var mine = up.filter(function(e){ return evMine(e, me); }), need = up.filter(function(e){ return evState(e) === 'need'; });
  var win = up.filter(function(e){ return e.date <= horizon; }), covered = win.filter(function(e){ return evState(e) !== 'need'; }).length;
  var body = '';
  if (cs && win.length) body += '<div class="mcbar" style="padding-bottom:4px"><span class="mcstrip"><span><b>' + covered + ' of ' + win.length + '</b> events in the next 2 weeks have people assigned</span>' + (win.length - covered ? '<span class="pill e-need">' + (win.length - covered) + ' still need dispatching</span>' : '<span class="pill e-ok">All covered</span>') + '</span></div>';
  if (mine.length) body += '<div class="dsec" style="padding:0 16px">My taskings</div><ul class="evlist">' + mine.slice(0, 5).map(evLine).join('') + '</ul>';
  if (cs && need.length) body += '<div class="dsec" style="padding:0 16px">Incomplete</div><ul class="evlist">' + need.slice(0, 4).map(evLine).join('') + '</ul>';
  if (!cs && !mine.length && up.length) body += '<div class="dsec" style="padding:0 16px">Coming up in the office</div><ul class="evlist">' + up.slice(0, 4).map(evLine).join('') + '</ul>';
  if (!body && !cs) return '';
  if (!body) body = empty('megaphone', 'No events or taskings coming up', cs ? 'Add events from request letters so the office sees them early.' : 'You have nothing assigned right now.', cs ? '<button class="btn btn-primary" data-act="evNew">' + ic('plus') + 'Add event</button>' : '');
  return panel('Coming up', 'megaphone', body, '<div class="row-btns"><button class="btn btn-sm btn-ghost" data-go="calendar">Open calendar</button>' + (cs ? '<button class="btn btn-sm btn-ghost" data-act="evNew">' + ic('plus') + 'Add event</button>' : '') + '</div>', span(n));
}
/* ----- Inventory (Production team and admins) ----- */
var INV_CATS = ['Camera', 'Lens', 'Audio', 'Lighting', 'Drone', 'Computer', 'Tripod and Support', 'Storage and Cards', 'Accessory', 'Other'];
var INV_ST = { Available: ['Available', 'e-ok'], Out: ['Checked out', 'e-wait'], Repair: ['In repair', 'e-need'], Missing: ['Missing', 'e-need'] };
function invOverdue(i){ return i.status === 'Out' && i.dueBack && i.dueBack < today(); }
function invRow(i){
  var st = INV_ST[i.status] || INV_ST.Available, u = i.holder && userOf(i.holder), ev = i.eventId && S.events.filter(function(x){ return x.id === i.eventId; })[0], b = '';
  if (i.status === 'Available') b += '<button type="button" class="btn btn-sm btn-primary" data-act="invOut" data-id="' + i.id + '">Check out</button>';
  else if (i.status === 'Out') b += '<button type="button" class="btn btn-sm btn-primary" data-act="invIn" data-id="' + i.id + '">Return</button>';
  else b += '<button type="button" class="btn btn-sm btn-ghost" data-act="invStatus" data-id="' + i.id + '" data-s="Available">Mark available</button>';
  b += '<button type="button" class="btn btn-sm btn-ghost" data-act="invEdit" data-id="' + i.id + '" aria-label="Edit ' + esc(i.name) + '">' + ic('edit') + '</button>';
  return '<li class="invr"><div class="grow"><b>' + esc(i.name) + '</b><div class="hint">' + esc(i.category) + (i.tag ? ' · ' + esc(i.tag) : '') + (i.serial ? ' · S/N ' + esc(i.serial) : '') + '</div>' +
    (i.status === 'Out' ? '<div class="hint">With ' + esc(u ? u.name : i.holder) + (i.dueBack ? ' · due ' + esc(fDate(i.dueBack, { month:'short', day:'numeric' })) : '') + (ev ? ' · for ' + esc(ev.title) : '') + '</div>' : '') + (i.note ? '<div class="hint">' + esc(i.note) + '</div>' : '') + '</div>' +
    '<div class="row-btns"><span class="pill ' + st[1] + '">' + st[0] + '</span>' + (invOverdue(i) ? '<span class="pill e-need">Overdue</span>' : '') + b + '</div></li>';
}
function viewInventory(){
  var F = S.invF || 'all', Q = (S.invQ || '').toLowerCase(), all = S.inventory.slice().sort(function(a, b){ return a.name < b.name ? -1 : 1; });
  var n = { Available: 0, Out: 0, bad: 0, over: 0 }; all.forEach(function(i){ if (i.status === 'Available') n.Available++; else if (i.status === 'Out') n.Out++; else n.bad++; if (invOverdue(i)) n.over++; });
  var list = all.filter(function(i){
    if ((F === 'Available' || F === 'Out') && i.status !== F) return false;
    if (F === 'attention' && !(i.status === 'Repair' || i.status === 'Missing' || invOverdue(i))) return false;
    if (Q){ var u = i.holder && userOf(i.holder); if ((i.name + ' ' + i.category + ' ' + i.tag + ' ' + i.serial + ' ' + (u ? u.name : '')).toLowerCase().indexOf(Q) < 0) return false; }
    return true; });
  var tiles = '<div class="tiles cal4" style="margin-bottom:16px">' + [
    ['all', 'Equipment', 'camera', String(all.length), 'Items on the list', ''],
    ['Available', 'Available', 'check', String(n.Available), 'Ready to use', 'ok'],
    ['Out', 'Checked out', 'clock', String(n.Out), n.over ? n.over + ' overdue' : 'None overdue', n.over ? 'warn' : ''],
    ['attention', 'Needs attention', 'flag', String(n.bad + n.over), 'Repair, missing or overdue', n.bad + n.over ? 'bad' : '']
  ].map(function(x){ return tile(x[1], x[3], x[4], x[5], x[2], 'data-act="invF" data-f="' + x[0] + '" aria-pressed="' + (F === x[0]) + '"'); }).join('') + '</div>';
  var body = '<div class="mcbar"><input class="input" id="invQ" type="search" value="' + esc(S.invQ || '') + '" placeholder="Search name, tag, serial or person" aria-label="Search equipment" style="max-width:340px;margin:0"></div>' +
    (list.length ? '<ul style="list-style:none;margin:0;padding:0">' + list.map(invRow).join('') + '</ul>' : empty('camera', all.length ? 'No equipment matches' : 'No equipment yet', all.length ? 'Try another filter or search.' : 'Add the cameras, lenses, mics and other gear so everyone knows who has what.', '<button type="button" class="btn btn-primary" data-act="invNew">' + ic('plus') + 'Add equipment</button>'));
  return { eyebrow: 'Production', title: 'Inventory', sub: 'Cameras, lenses, audio and other gear. Check equipment out so everyone knows who has it.', actions: '<button type="button" class="btn btn-sun" data-act="invNew">' + ic('plus') + 'Add equipment</button>', body: tiles + panel('Equipment', 'camera', body, '', '') };
}
function invModal(id){
  var i = S.inventory.filter(function(x){ return x.id === id; })[0] || { name: '', category: 'Camera', tag: '', serial: '', note: '' };
  var hist = (i.history || []).slice(0, 5).map(function(h){ var u = h.who && userOf(h.who); return '<li class="hint">' + esc(fDate(String(h.at).slice(0, 10), { month:'short', day:'numeric' })) + ' · ' + esc(h.act) + (u ? ' · ' + esc(u.name) : '') + (h.note ? ' · ' + esc(h.note) : '') + '</li>'; }).join('');
  modal(i.id ? 'Edit equipment' : 'Add equipment',
    '<input type="hidden" name="id" value="' + esc(i.id || '') + '"><div class="field"><label for="ivn">Name</label><input class="input" id="ivn" name="name" maxlength="120" value="' + esc(i.name) + '" placeholder="e.g. Sony A7 III" required></div>' +
    '<div class="two"><div class="field"><label for="ivc">Category</label><select class="input" id="ivc" name="category">' + INV_CATS.map(function(c){ return '<option' + (i.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div><div class="field"><label for="ivt">Asset tag <span class="hint">(optional)</span></label><input class="input" id="ivt" name="tag" maxlength="40" value="' + esc(i.tag || '') + '"></div></div>' +
    '<div class="field"><label for="ivs">Serial number <span class="hint">(optional)</span></label><input class="input" id="ivs" name="serial" maxlength="60" value="' + esc(i.serial || '') + '"></div>' +
    '<div class="field"><label for="ivo">Notes <span class="hint">(optional)</span></label><input class="input" id="ivo" name="note" maxlength="300" value="' + esc(i.note || '') + '" placeholder="Condition, what is in the bag, etc."></div>' + (hist ? '<div class="dsec">Recent history</div><ul style="margin:0;padding-left:18px">' + hist + '</ul>' : ''),
    (i.id && isAdmin() ? '<button type="button" class="btn btn-danger" data-act="invDel" data-id="' + i.id + '">' + ic('trash') + 'Delete</button>' : '') + '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (i.id ? 'Save' : 'Add equipment') + '</button>', 'saveItem');
}
function invOutModal(id){
  var i = S.inventory.filter(function(x){ return x.id === id; })[0]; if (!i) return;
  var td = today(), evs = S.events.filter(function(e){ return e.status !== 'Cancelled' && e.dateTo >= td; }).sort(evSort).slice(0, 30);
  modal('Check out ' + i.name,
    '<input type="hidden" name="id" value="' + esc(i.id) + '"><div class="field"><label for="iho">Who is borrowing it?</label><select class="input" id="iho" name="holder">' + S.users.filter(function(u){ return u.active; }).sort(function(a, b){ return a.name < b.name ? -1 : 1; }).map(function(u){ return '<option value="' + esc(u.username) + '"' + (u.username === S.me.username ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="two"><div class="field"><label for="ihd">Due back</label><input class="input" id="ihd" name="dueBack" type="date" value="' + addDays(td, 3) + '" min="' + td + '"></div><div class="field"><label for="ihe">For the event <span class="hint">(optional)</span></label><select class="input" id="ihe" name="eventId"><option value="">No event</option>' + evs.map(function(e){ return '<option value="' + esc(e.id) + '">' + esc(e.title + ' · ' + evShort(e)) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="ihn">Note <span class="hint">(optional)</span></label><input class="input" id="ihn" name="note" maxlength="200" placeholder="Condition when it leaves"></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Check out</button>', 'checkoutItem');
}
var _nav0 = navItems; navItems = function(){ var a = _nav0(); if (inProd()) a.push(['inventory', 'camera', 'Inventory', 'Production']); return a; };
var _render0 = render; render = function(){ _render0.apply(this, arguments); if (S.welcome && S.me){ S.welcome = false; welcome(); } try { checkNotify(); } catch(e){} if (S.me && !S._profSync) profSync(); };
function pgIn(){ var m = document.querySelector('main'); if (!m) return; m.setAttribute('tabindex', '-1'); try { m.focus({ preventScroll: true }); } catch(e){} if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; m.classList.remove('pgin'); void m.offsetWidth; m.classList.add('pgin'); }

function dayoffHint(t){
  if (t.toType !== 'dayoff') return '';
  var n = 0, d0 = t.dateFrom; for (; d0 <= t.dateTo; d0 = addDays(d0, 1)) n++;
  var low = (t.names || []).map(function(nm){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === nm; })[0]; return u && stats(u.username).avail < n - 1e-9 ? dispName(nm) + ' has only ' + fD(stats(u.username).avail) : ''; }).filter(Boolean);
  return '<div class="warn-note">' + ic('clock') + '<span>Day-off travel order: preparing it deducts ' + fD(n) + ' of offset from each person.' + (low.length ? ' Not enough offset: ' + low.map(esc).join('; ') + '. Those days are skipped unless you tick Deduct anyway.' : '') + '</span></div>' +
    (low.length && isAdmin() ? '<label class="check opt warnopt"><input type="checkbox" name="override" value="1"><span><b>Deduct anyway</b><small>Deduct every day even without enough offset. Their balance goes below zero; offsets they earn later pay it back.</small></span></label>' : '');
}
function markPrinted(list){
  var ids = list.filter(function(t){ return t && t.status === 'Prepared' && !t.printedAt; }).map(function(t){ return t.id; });
  if (ids.length) bg('markTOPrinted', { ids: ids }, { arr: 'travelOrders', ids: ids, patch: { printedAt: new Date().toISOString() } }, 'Moved to Printed', 'Marked as printed');
}
function toRange(){
  var p = S.toPer || 'week', a = S.toAnchor || today();
  if (p === 'week'){ var s0 = addDays(a, -((pd(a).getDay() + 6) % 7)); return { s: s0, e: addDays(s0, 6), p: p }; }
  if (p === 'month'){ var d0 = pd(a); return { s: ymd(new Date(d0.getFullYear(), d0.getMonth(), 1)), e: ymd(new Date(d0.getFullYear(), d0.getMonth() + 1, 0)), p: p }; }
  return null;
}
function viewTravel(){
  var f = S.toFilter || 'upcoming', td = today(), mine = S.toMine, rg = toRange();
  var dir = S.toSort || (f === 'past' ? 'desc' : 'asc');
  var list = S.travelOrders.filter(function(t){
    if (mine && t.createdBy !== S.me.username && t.usernames.indexOf(S.me.username) < 0) return false;
    if (rg && !(t.dateTo >= rg.s && t.dateFrom <= rg.e)) return false;
    if (S.toType && S.toType !== 'all' && (t.toType || 'regular') !== S.toType) return false;
    if (S.toQ && (t.event + ' ' + t.destination + ' ' + (t.toNo || '') + ' ' + (t.names || []).join(' ')).toLowerCase().indexOf(S.toQ.toLowerCase()) < 0) return false;
    if (f === 'upcoming') return t.dateTo >= td && t.status !== 'Cancelled';
    if (f === 'past') return t.dateTo < td && t.status !== 'Cancelled';
    if (f === 'Prepared') return t.status === 'Prepared';
    return t.status === f;
  }).sort(function(a,b){ var r = a.dateFrom < b.dateFrom ? -1 : a.dateFrom > b.dateFrom ? 1 : 0; return dir === 'desc' ? -r : r; });
  var toPrep = S.travelOrders.filter(function(t){ return t.status === 'Filed'; }).length, toPrint = S.travelOrders.filter(function(t){ return t.status === 'Prepared' && !t.printedAt; }).length;
  var tabs = [['upcoming','Upcoming'],['Filed','To prepare' + (isAdmin() && toPrep ? ' (' + toPrep + ')' : '')],['Prepared','Prepared' + (isAdmin() && toPrint ? ' (' + toPrint + ' to print)' : '')],['past','Past'],['Cancelled','Cancelled']];
  var per = [['week','Week'],['month','Month'],['all','All']];
  var base = S.travelOrders.filter(function(t){ return !mine || t.createdBy === S.me.username || t.usernames.indexOf(S.me.username) >= 0; }), adm = isAdmin();
  var cnt = function(k){ return base.filter(function(t){ return k === 'upcoming' ? t.dateTo >= td && t.status !== 'Cancelled' : k === 'past' ? t.dateTo < td && t.status !== 'Cancelled' : t.status === k; }).length; };
  var tp = base.filter(function(t){ return t.status === 'Prepared' && !t.printedAt; }).length;
  var tiles = '<div class="tiles five">' + [
    ['upcoming', 'Upcoming', 'route', 'Still to come', ''],
    ['Filed', 'To prepare', 'edit', cnt('Filed') ? 'Waiting to be prepared' : 'All caught up', adm && cnt('Filed') ? 'warn' : ''],
    ['Prepared', 'Prepared', 'check', tp ? tp + ' to print' : 'All printed', adm && tp ? 'warn' : ''],
    ['past', 'Past', 'clock', 'Already done', ''],
    ['Cancelled', 'Cancelled', 'x', 'Dropped events', '']
  ].map(function(x){ return tile(x[1], String(cnt(x[0])), x[3], x[4], x[2], 'data-act="toTab" data-t="' + x[0] + '" aria-pressed="' + (f === x[0]) + '"'); }).join('') + '</div>';
  var lab = !rg ? 'All dates' : rg.p === 'month' ? fDate(rg.s, { month:'long', year:'numeric' }) : fRange(rg.s, rg.e, { month:'short', day:'numeric', year:'numeric' });
  return { eyebrow: 'Field work', title: 'Travel orders', sub: 'File, prepare and print travel orders.',
    actions: canFileTO() ? '<button class="btn btn-sun" data-act="toNew">' + ic('plus') + 'New travel order</button>' : '',
    body: tiles + '<section class="panel"><div class="panel-h"><b>' + esc(tabs.filter(function(x){ return x[0] === f; }).map(function(x){ return x[1].replace(/ \(.*$/, ''); })[0] || '') + '</b>' +
      '<label class="keep" style="font-size:13.5px"><input type="checkbox" id="toMine"' + (mine ? ' checked' : '') + '>Only mine</label></div>' +
      '<div class="panel-h totools"><div class="to-per"><div class="tabs" role="group" aria-label="Period">' + per.map(function(x){ return '<button data-act="toPer" data-p="' + x[0] + '" aria-pressed="' + ((S.toPer || 'week') === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (rg ? '<div class="row-btns to-nav"><button type="button" class="icon-btn" data-act="toNav" data-d="-1" aria-label="Previous ' + rg.p + '">' + ic('left') + '</button><b>' + esc(lab) + '</b><button type="button" class="icon-btn" data-act="toNav" data-d="1" aria-label="Next ' + rg.p + '">' + ic('right') + '</button></div>' : '') + '</div>' +
      '<input class="input" id="toQ" type="search" value="' + esc(S.toQ || '') + '" placeholder="Search purpose, place or name" aria-label="Search travel orders">' +
      '<div class="to-opts"><button type="button" class="btn btn-sm btn-ghost" data-act="toAll" aria-pressed="' + !!S.toAllOpen + '">' + ic(S.toAllOpen ? 'minus' : 'plus') + (S.toAllOpen ? 'Close all' : 'Open all') + '</button>' + '<select class="input" id="toTy" aria-label="Type">' + [['all','All types'],['regular','Regular'],['dayoff','Day off']].map(function(o){ return '<option value="' + o[0] + '"' + ((S.toType || 'all') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + '<button class="btn btn-sm btn-ghost" data-act="toSort" aria-label="' + (dir === 'desc' ? 'Newest first. Change order' : 'Oldest first. Change order') + '">' + (dir === 'desc' ? 'Newest' : 'Oldest') + '<span class="to-sfx"> first</span></button></div></div>' +
      (list.length ? '<ul class="list">' + list.map(toRow).join('') + '</ul>' : empty('route', 'No travel orders here', 'Try another period, type or tab.', (canFileTO() ? '<button class="btn btn-primary" data-act="toNew">' + ic('plus') + 'New travel order</button>' : ''))) + '</section>' };
}
var TO = { names: [] };
function toModal(id, pre){
  var t = S.travelOrders.filter(function(x){ return x.id === id; })[0] || Object.assign({ dateFrom: today(), dateTo: '', event: '', destination: '', names: [] }, pre || {});
  TO = { id: t.id || '', names: t.names.slice() };
  modal(t.id ? 'Edit travel order' : 'New travel order',
    evLinkHtml(t) + '<div class="two"><div class="field"><label for="tf">Date</label><input class="input" id="tf" name="dateFrom" type="date" value="' + t.dateFrom + '" required></div><div class="field"><label for="tt">Until <span class="hint">(if more than one day)</span></label><input class="input" id="tt" name="dateTo" type="date" value="' + (t.dateTo !== t.dateFrom ? t.dateTo : '') + '"></div></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Type of travel order</legend><div class="seg">' + [['regular','Regular','Official work or event'],['dayoff','Day off','Uses offset']].map(function(o, i){ return '<input type="radio" name="toType" id="tty' + i + '" value="' + o[0] + '"' + ((t.toType || 'regular') === o[0] ? ' checked' : '') + '><label for="tty' + i + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></label>'; }).join('') + '</div><span class="hint">A day-off travel order is the paper for using offset. Preparing it deducts 1 day per person for each date.</span></fieldset>' +
    '<div class="field"><label for="te">Purpose</label><input class="input" id="te" name="event" maxlength="200" value="' + esc(t.event) + '" placeholder="e.g. To cover the Provincial Board regular session" required><span class="hint">Copied exactly as you type it.</span></div>' +
    '<div class="field"><label for="tdst">Location</label><input class="input" id="tdst" name="destination" maxlength="120" value="' + esc(t.destination) + '" placeholder="e.g. Brgy. Gubat, Daet, Camarines Norte" required><span class="hint">Copied as: Purpose in Location on Date.</span></div>' +
    '<div class="field"><label for="tp">People to be dispatched</label><div class="picker"><div class="chips" id="toChips"></div><input class="input" id="tp" autocomplete="off" placeholder="Type a name, then pick or press Enter" aria-autocomplete="list" aria-controls="toSug"><ul class="sug" id="toSug" role="listbox" hidden></ul></div>' +
      '<div class="row-btns"><button type="button" class="btn btn-sm btn-ghost" data-act="toAddMe">' + ic('plus') + 'Add me</button><span class="hint">Names are saved in capital letters, ready to paste into the document.</span></div></div><div id="toWarn"></div>',
    (t.id ? '<button type="button" class="btn btn-danger" data-act="toDelete" data-id="' + t.id + '" style="margin-right:auto">' + ic('trash') + 'Delete</button>' : '') + '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (t.id ? 'Save changes' : 'File travel order') + '</button>', 'saveTO');
  drawChips();
}
function drawChips(){
  var box = document.getElementById('toChips'); if (!box) return;
  box.innerHTML = TO.names.map(function(n, i){ return '<span class="chip on">' + esc(n) + '<button type="button" data-act="toDrop" data-i="' + i + '" aria-label="Remove ' + esc(n) + '">' + ic('x') + '</button></span>'; }).join('');
  var from = (document.getElementById('tf') || {}).value, to = (document.getElementById('tt') || {}).value || from, warn = [];
  TO.names.forEach(function(n){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; if (!u || !from) return;
    for (var d = from; d <= to; d = addDays(d, 1)){ var s = statusOn(u.username, d); if (s && !(s.kind === 'to' && s.ref.id === TO.id)){ warn.push(n + ' is ' + (s.kind === 'to' ? 'on another travel order (' + s.label + ')' : s.kind === 'leave' ? 'on leave' : 'on a day off') + ' on ' + fDate(d, { month:'short', day:'numeric' })); break; } } });
  document.getElementById('toWarn').innerHTML = warn.length ? '<div class="warn-note">' + ic('clock') + '<span>' + warn.map(esc).join('<br>') + '</span></div>' : '';
}
function addName(n){ n = String(n || '').trim().replace(/\s+/g, ' ').toUpperCase(); if (n && TO.names.indexOf(n) < 0) TO.names.push(n); var i = document.getElementById('tp'); if (i){ i.value = ''; i.focus(); } showSug(''); drawChips(); }
function showSug(q){
  var ul = document.getElementById('toSug'); if (!ul) return;
  q = q.trim().toLowerCase();
  var list = q ? S.users.filter(function(u){ return u.active && TO.names.indexOf(u.name.toUpperCase()) < 0 && (u.name.toLowerCase().indexOf(q) >= 0 || u.username.indexOf(q) >= 0); }).slice(0, 6) : [];
  ul.innerHTML = list.map(function(u, i){ return '<li role="option" data-pick="' + esc(u.name) + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><b>' + esc(u.name.toUpperCase()) + '</b><span class="hint">' + esc((divOf(u.division) || {}).short || '') + '</span></li>'; }).join('') +
    (q && !list.some(function(u){ return u.name.toLowerCase() === q; }) ? '<li role="option" data-pick="' + esc(q) + '"' + (list.length ? '' : ' aria-selected="true"') + '>Add “' + esc(q.toUpperCase()) + '”<span class="hint">not in the staff list</span></li>' : '');
  ul.hidden = !ul.innerHTML;
}
function toManageModal(id){
  var t = S.travelOrders.filter(function(x){ return x.id === id; })[0]; if (!t) return;
  M = { id: id };
  modal('Prepare travel order', clashNote(t) + '<div class="copybox" id="toCopyText">' + esc(toText(t)).replace(/\n/g, '<br>') + '</div><button type="button" class="btn btn-sm btn-ghost" data-act="toCopy" data-id="' + id + '">' + ic('list') + 'Copy for the document</button>' + dayoffHint(t) +
    '<div class="field"><label for="tno">TO number <span class="hint">(optional)</span></label><input class="input" id="tno" name="toNo" value="' + esc(t.toNo) + '" maxlength="40" placeholder="e.g. PIO-2026-11-014"></div>' +
    '<div class="field"><label for="tdp">Date prepared</label><input class="input" id="tdp" name="datePrepared" type="date" value="' + esc(t.datePrepared || today()) + '"><span class="hint">Printed at the top of the travel order.</span></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Will a TEV (Travel Expense Voucher) be made?</legend><div class="seg">' +
      [['Yes','Yes','Prepare a TEV'],['No','No','No TEV needed'],['','Not yet','Decide later']].map(function(o, i){ return '<input type="radio" name="tev" id="tv' + i + '" value="' + o[0] + '"' + ((t.toType === 'dayoff' && !t.tev ? 'No' : t.tev) === o[0] ? ' checked' : '') + '><label for="tv' + i + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></label>'; }).join('') + '</div></fieldset>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Status</legend><div class="seg">' +
      [['Prepared','Prepared','Document is done'],['Cancelled','Cancelled','Event dropped']].map(function(o, i){ return '<input type="radio" name="status" id="ts' + i + '" value="' + o[0] + '"' + ((t.status === 'Cancelled' ? 'Cancelled' : 'Prepared') === o[0] ? ' checked' : '') + '><label for="ts' + i + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></label>'; }).join('') + '</div></fieldset>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (t.status === 'Filed' ? ic('check') + 'Prepare' : 'Save') + '</button>', 'toStatus');
}
function copyText(text){
  var done = function(){ toast('Copied. Paste it into the document.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  function fallback(){ var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(e){ toast('Select the text and copy it.'); } ta.remove(); }
}

/* ----- leaves ----- */
function creditCells(u){
  var b = leaveBal(u.username);
  return { b: b, html: '<td class="r num"><b>' + (b.set ? fD(b.vl) : '—') + '</b></td><td class="r num"><b>' + (b.set ? fD(b.sl) : '—') + '</b></td><td class="r num">' + fD(b.left('SPL')) + '</td><td class="r num">' + fD(b.left('WL')) + '</td><td class="r num">' + frac(b.used.FL || 0) + ' / 5</td>' };
}
function viewLeaves(){
  var adm = isAdmin(), yr = today().slice(0,4);
  if (!adm){
    if (!hasLeaves()){
      var bw = leaveBal(S.me.username), mw = S.leaves.filter(function(l){ return l.username === S.me.username; }).sort(function(x,y){ return x.dateFrom < y.dateFrom ? 1 : -1; });
      return { eyebrow: 'Leaves · ' + esc(S.me.empType || 'JO'), title: 'My wellness leave', sub: 'Job order and COS workers get ' + wellCap() + ' days of wellness leave a year (up to 3 days in a row). The admin records them here.',
        body: '<div class="grid"><div class="tiles span-12">' + tile('Wellness left', fD(bw.left('WL')), 'In ' + yr + ' (' + wellCap() + ' a year)', '', 'plane') + tile('Wellness used', fD(bw.used.WL || 0), 'In ' + yr, '', 'history') + '</div>' +
          panel('Leave history', 'history', mw.length ? '<ul class="list">' + mw.map(leaveRow).join('') + '</ul>' : empty('plane', 'No wellness leave recorded', 'Leaves the admin records will show here.'), '', 'span-12') + '</div>' };
    }
    var b = leaveBal(S.me.username), mine = S.leaves.filter(function(l){ return l.username === S.me.username; }).sort(function(x,y){ return x.dateFrom < y.dateFrom ? 1 : -1; });
    return { eyebrow: 'Leaves · ' + esc(S.me.empType), title: 'My leave credits', sub: b.set ? 'Balances as of today. Vacation and sick leave grow by 1.25 days each month.' : 'An admin has not set your starting balances yet.',
      body: '<div class="grid"><div class="tiles span-12">' + tile('Vacation leave', b.set ? fD(b.vl) : '—', 'Includes forced leave', '', 'sun') + tile('Sick leave', b.set ? fD(b.sl) : '—', '+1.25 days a month', '', 'shield') +
        tile('Special privilege', fD(b.left('SPL')), 'Left in ' + yr + ' (3 a year)', '', 'star') + tile('Wellness', fD(b.left('WL')), 'Left in ' + yr + ' (' + wellCap() + ' a year)', '', 'plane') + '</div>' +
        '<div class="span-12 info-note">' + ic('flag') + '<span>Mandatory/forced leave taken this year: ' + frac(b.used.FL || 0) + ' of 5 days. Leaves are filed on CS Form No. 6 as usual; the admin records them here.</span></div>' +
        panel('Leave history', 'history', mine.length ? '<ul class="list">' + mine.map(leaveRow).join('') + '</ul>' : empty('plane', 'No leaves recorded', 'Leaves the admin records will show here.'), '', 'span-12') + '</div>' };
  }
  var staff = S.users.filter(function(u){ return u.active && hasLeaves(u) && (S.dashDiv === 'all' || u.division === S.dashDiv); }).sort(byDiv);
  var wl = S.users.filter(function(u){ return u.active && wlOnly(u) && (S.dashDiv === 'all' || u.division === S.dashDiv); }).sort(byDiv);
  var recent = S.leaves.slice().sort(function(x,y){ return x.createdAt < y.createdAt ? 1 : -1; }).slice(0, 30);
  return { eyebrow: 'Leaves', title: 'Leave credits', sub: 'Leave credits for regular and casual staff. Vacation and sick leave grow 1.25 days a month.',
    actions: '<button class="btn btn-sun" data-act="leaveNew">' + ic('plus') + 'Record leave</button>',
    body: '<div class="grid">' + panel('Balances', 'shield', staff.length ? '<div class="table-wrap"><table class="cards"><thead><tr><th>Employee</th><th class="r">Vacation</th><th class="r">Sick</th><th class="r">SPL left</th><th class="r">Wellness left</th><th class="r">Forced taken</th><th></th></tr></thead><tbody>' +
        staff.map(function(u){ var c = creditCells(u); return '<tr data-grp="' + esc(u.division) + '"><td><b>' + esc(u.name) + '</b><div class="hint">' + esc(u.empType) + (c.b.set ? ' · as of ' + mShort(c.b.asOf) + ' ' + c.b.asOf.slice(0,4) : ' · <b style="color:var(--gold)">balances not set</b>') + '</div></td>' + c.html +
          '<td class="r"><div class="row-btns" style="justify-content:flex-end"><button class="btn btn-sm btn-ghost" data-act="leaveNew" data-u="' + esc(u.username) + '">' + ic('plus') + 'Leave</button><button class="btn btn-sm btn-ghost" data-act="credits" data-u="' + esc(u.username) + '">' + ic('edit') + 'Balances</button></div></td></tr>'; }).join('') + '</tbody></table></div>'
        : empty('users', 'No regular or casual staff', 'Set each person’s employment type in Staff. Leave credits apply to regular and casual employees.'), divSelect('dashDiv', S.dashDiv, 'Filter by division', true), 'span-12') +
      panel('Wellness leave · Job order and COS', 'plane', wl.length ? '<div class="table-wrap"><table class="cards"><thead><tr><th>Employee</th><th class="r">Used in ' + yr + '</th><th class="r">Left</th><th></th></tr></thead><tbody>' +
        wl.map(function(u){ var b = leaveBal(u.username); return '<tr data-grp="' + esc(u.division) + '"><td><b>' + esc(u.name) + '</b><div class="hint">' + esc(u.empType || 'JO') + '</div></td><td class="r num">' + fD(b.used.WL || 0) + '</td><td class="r num"><b>' + fD(b.left('WL')) + '</b> / ' + wellCap() + '</td>' +
          '<td class="r"><button class="btn btn-sm btn-ghost" data-act="leaveNew" data-u="' + esc(u.username) + '">' + ic('plus') + 'Wellness</button></td></tr>'; }).join('') + '</tbody></table></div>'
        : empty('users', 'No job order or COS staff', 'Wellness leave for JO and COS shows here.'), '', 'span-12') +
      panel('Recently recorded', 'history', recent.length ? '<ul class="list">' + recent.map(function(l){ return leaveRow(l, true); }).join('') + '</ul>' : empty('plane', 'No leaves recorded yet', 'Use Record leave after a leave is approved.'), '<button class="btn btn-sm btn-ghost" data-act="exportLeaves">' + ic('download') + 'CSV</button>', 'span-12') + '</div>' };
}
function leaveRow(l, showName){
  var adj = /^ADJ/.test(l.type);
  return '<li class="row"><span class="mark ' + (adj ? 'act' : 'use') + '">' + ic(adj ? 'edit' : 'plane') + '</span><div class="body"><div class="t">' + (showName ? esc(userName(l.username)) + ' · ' : '') + esc(leaveName(l.type)) + '</div><div class="m">' + (adj ? esc(l.note) + ' · ' + fDate(l.dateFrom) : fRange(l.dateFrom, l.dateTo, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + (l.note ? ' · ' + esc(l.note) : '')) + '</div></div>' +
    '<span class="amt ' + (adj && l.days > 0 ? 'plus' : 'minus') + '">' + (adj ? (l.days > 0 ? '+' : '−') : '') + frac(Math.abs(l.days)) + 'd</span>' + (isAdmin() ? '<button class="icon-btn" data-act="leaveDel" data-id="' + l.id + '" aria-label="Remove this record">' + ic('trash') + '</button>' : '') + '</li>';
}
function leaveModal(u){
  var staff = S.users.filter(function(x){ return x.active && canLeave(x); });
  if (!staff.length) return toast('Set employment types in Staff first.');
  u = u && staff.some(function(x){ return x.username === u; }) ? u : staff[0].username;
  var groups = [['Leave credits', ['VL','FL','SL']], ['Yearly allowances', ['SPL','WL','SOLO','SEL']], ['Special leaves', ['ML','PL','VAWC','SLBW','RL','STL','AL']], ['Other', ['LWOP']]];
  modal('Record leave', '<div class="field"><label for="lu2">Employee</label><select class="input" id="lu2" name="username">' + staff.map(function(x){ return '<option value="' + esc(x.username) + '"' + (x.username === u ? ' selected' : '') + '>' + esc(x.name) + ' · ' + esc(x.empType) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="lt">Type of leave</label><select class="input" id="lt" name="type">' + groups.map(function(g){ return '<optgroup label="' + g[0] + '">' + g[1].map(function(t){ return '<option value="' + t + '">' + esc(LEAVE_TYPES[t].name) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></div>' +
    '<div class="two"><div class="field"><label for="lf">From</label><input class="input" id="lf" name="dateFrom" type="date" value="' + today() + '" required></div><div class="field"><label for="lto">To</label><input class="input" id="lto" name="dateTo" type="date" value="' + today() + '" required></div></div>' +
    '<div class="field"><label for="ld">Days</label><input class="input num" id="ld" name="days" type="number" min="0.5" step="0.5" value="1" required><span class="hint" id="ldHint">Weekdays in the range, not counting holidays. Change it for half days.</span></div>' +
    '<div class="field"><label for="ln">Note <span class="hint">(optional, e.g. Form 6 control no.)</span></label><input class="input" id="ln" name="note" maxlength="160"></div><div id="lbal"></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Record leave</button>', 'recordLeave');
  leaveCheck(true);
}
function leaveCheck(recount){
  var u = (document.getElementById('lu2') || {}).value; if (!u) return;
  var sel = document.getElementById('lt'), only = wlOnly(userOf(u));
  Array.prototype.forEach.call(sel.options, function(o){ o.disabled = only && o.value !== 'WL'; o.hidden = o.disabled; });
  Array.prototype.forEach.call(sel.querySelectorAll('optgroup'), function(g){ g.hidden = only && !g.querySelector('option[value=WL]'); });
  if (only && sel.value !== 'WL') sel.value = 'WL';
  var t = sel.value, f = document.getElementById('lf'), to = document.getElementById('lto'), d = document.getElementById('ld'), r = LEAVE_TYPES[t];
  if (to.value < f.value) to.value = f.value;
  if (recount) d.value = workdaysBetween(f.value, to.value, r.calendar) || 1;
  document.getElementById('ldHint').textContent = r.calendar ? 'Calendar days in the range (maternity leave counts every day).' : 'Weekdays in the range, not counting holidays. Change it for half days.';
  var b = leaveBal(u, f.value.slice(0,4)), days = Number(d.value) || 0, msg = '', over = false;
  if (r.pool){ var left = r.pool === 'VL' ? b.vl : b.sl; msg = (r.pool === 'VL' ? 'Vacation' : 'Sick') + ' leave left: ' + fD(left) + (b.set ? '' : ' (balances not set)'); over = days > left + 1e-9; }
  var cap = t === 'WL' ? wellCap() : r.year; if (cap){ var l2 = Math.max(cap - (b.used[t] || 0), 0); msg += (msg ? ' · ' : '') + r.name + ' left this year: ' + fD(l2); over = over || days > l2 + 1e-9; }
  if (t === 'WL' && days > 3){ msg += ' · Wellness leave is up to 3 days in a row.'; over = true; }
  if (r.once) msg += (msg ? ' · ' : '') + 'Up to ' + r.once + ' days per ' + (t === 'AL' ? 'adoption' : 'occurrence') + '.';
  document.getElementById('lbal').innerHTML = (msg ? '<div class="' + (over ? 'warn-note' : 'info-note') + '">' + ic(over ? 'clock' : 'shield') + '<span>' + esc(msg) + (over ? '. Record the extra days as Leave Without Pay, or tick below if HR approved it.' : '') + '</span></div>' : '') +
    (over ? '<label class="keep"><input type="checkbox" name="override"> Record anyway (approved by HR)</label>' : '');
}
function creditsModal(u){
  var x = userOf(u), c = S.credits.filter(function(z){ return z.username === u; })[0] || { vl: '', sl: '', asOf: shiftMonth(curMonth(), -1) };
  M = { u: u };
  modal('Leave balances · ' + esc(x.name), '<p class="hint" style="margin:0">Copy these from the employee’s official leave card. From the month after, the app adds 1.25 days of vacation and sick leave every month.</p>' +
    '<div class="two"><div class="field"><label for="cv">Vacation leave</label><input class="input num" id="cv" name="vl" type="number" min="0" step="0.001" value="' + c.vl + '" required></div><div class="field"><label for="cs">Sick leave</label><input class="input num" id="cs" name="sl" type="number" min="0" step="0.001" value="' + c.sl + '" required></div></div>' +
    '<div class="field"><label for="ca">Balances as of the end of</label><input class="input" id="ca" name="asOf" type="month" value="' + c.asOf + '" required></div>' +
    '<div class="label">Adjust without resetting</div><div class="two"><div class="field"><label for="aj">Days (+ or −)</label><input class="input num" id="aj" type="number" step="0.001" placeholder="e.g. -0.5"></div><div class="field"><label for="ap2">Credit</label><select class="input" id="ap2"><option value="VL">Vacation</option><option value="SL">Sick</option></select></div></div>' +
    '<div class="field"><label for="ar2">Reason</label><input class="input" id="ar2" maxlength="120" placeholder="e.g. Tardiness deduction for October"></div><button type="button" class="btn btn-sm btn-ghost" data-act="adjust">' + ic('edit') + 'Save adjustment</button>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save balances</button>', 'credits');
}

/* ----- dashboard widgets added by Overwatch ----- */
WIDGETS.admin.splice(2, 0, ['out', 'Who’s out today', 6], ['tos', 'Upcoming travel orders', 6]);
WIDGETS.employee.splice(2, 0, ['out', 'Who’s out today', 6], ['mytos', 'My travel orders', 6]);
WIDGETS.employee.push(['leave', 'My leave credits', 12]);
function outWidget(n){
  var td = today(), rows = S.users.filter(function(u){ return u.active; }).sort(byDiv).map(function(u){ return { u: u, s: statusOn(u.username, td) }; }).filter(function(r){ return r.s; });
  return panel('Who’s out today', 'users', rows.length ? '<ul class="list">' + rows.slice(0, 6).map(function(r){ return '<li data-grp="' + esc(r.u.division) + '" class="row avail"><span class="avatar">' + esc(initials(r.u.name)) + '</span><div class="body"><div class="t">' + esc(r.u.name) + '</div><div class="m">' + (r.s.kind === 'to' ? esc(r.s.ref.event) + (r.s.ref.destination ? ' · ' + esc(r.s.ref.destination) : '') : esc(r.u.empType)) + '</div></div>' + statusPill(r.s) + '</li>'; }).join('') + '</ul>'
    : empty('check', 'Everyone is in today', isWeekend(td) || holidayOn(td) ? 'It’s a non-working day anyway.' : 'No travel orders, leaves or days off today.'), '<button class="btn btn-sm btn-ghost" data-go="availability">Availability</button>', span(n));
}
function tosWidget(n, mine){
  var td = today(), list = activeTOs().filter(function(t){ return t.dateTo >= td && (!mine || t.usernames.indexOf(S.me.username) >= 0 || t.createdBy === S.me.username); }).sort(function(a,b){ return a.dateFrom < b.dateFrom ? -1 : 1; }).slice(0, 4);
  return panel(mine ? 'My travel orders' : 'Upcoming travel orders', 'route', list.length ? '<ul class="list">' + list.map(function(t){ return toMini(t); }).join('') + '</ul>' : empty('route', 'No travel orders coming up', 'File one when the team is sent to the field.', (canFileTO() ? '<button class="btn btn-ghost" data-act="toNew">' + ic('plus') + 'New travel order</button>' : '')), '<button class="btn btn-sm btn-ghost" data-go="travel">All</button>', span(n));
}
function leaveWidget(n){
  if (!hasLeaves()) return '';
  var b = leaveBal(S.me.username);
  return '<div class="tiles ' + span(n) + '">' + tile('Vacation leave', b.set ? fD(b.vl) : '—', b.set ? 'Includes forced leave' : 'Not set yet', '', 'sun', 'data-go="leaves"') + tile('Sick leave', b.set ? fD(b.sl) : '—', '+1.25 a month', '', 'shield', 'data-go="leaves"') + tile('Special privilege', fD(b.left('SPL')), 'Left this year', '', 'star', 'data-go="leaves"') + tile('Wellness', fD(b.left('WL')), 'Left this year', '', 'plane', 'data-go="leaves"') + '</div>';
}
(function(){
  var A = adminWidgets, E = empWidgets;
  adminWidgets = function(staff){ var w = A(staff); w.out = outWidget; w.tos = function(n){ return tosWidget(n, false); }; return w; };
  empWidgets = function(){ var w = E(); w.out = outWidget; w.mytos = function(n){ return tosWidget(n, true); }; w.leave = leaveWidget; return w; };
})();

/* ----- events for the new screens ----- */
document.addEventListener('click', function(ev){
  var p = ev.target.closest('[data-pick]'); if (p){ addName(p.dataset.pick); return; }
  var t = ev.target.closest('[data-act]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'avPrev' || a === 'avNext'){ S.availDate = addDays(S.availDate || today(), a === 'avNext' ? 1 : -1); render(); }
  else if (a === 'avToday'){ S.availDate = today(); render(); }
  else if (a === 'toTab'){ S.toFilter = t.dataset.t; render(); }
  else if (a === 'toPer'){ S.toPer = t.dataset.p; if (!S.toAnchor) S.toAnchor = today(); render(); }
  else if (a === 'toNav'){ var dv = Number(t.dataset.d), an = S.toAnchor || today(); if ((S.toPer || 'week') === 'week') S.toAnchor = addDays(an, 7 * dv); else { var dm = pd(an); S.toAnchor = ymd(new Date(dm.getFullYear(), dm.getMonth() + dv, 1)); } render(); }
  else if (a === 'toSort'){ var cur = S.toSort || (S.toFilter === 'past' ? 'desc' : 'asc'); S.toSort = cur === 'desc' ? 'asc' : 'desc'; render(); }
  else if (a === 'dayPop') dayPop(t.dataset.d);
  else if (a === 'evTile') evTileModal(t.dataset.f);
  else if (a === 'evPick'){ var pe = S.events.filter(function(x){ return x.id === t.dataset.id; })[0]; if (pe){ closeModal(); dayPop(pe.date); } }
  else if (a === 'evAssign'){ closeModal(); assignModal(t.dataset.id); }
  else if (a === 'notifs') notifModal();
  else if (a === 'notifOn'){ Promise.resolve(Notification.requestPermission()).then(function(p){ if (p === 'granted'){ lSet('pio_dn_' + S.me.username, '1'); nSet('notified', myAlerts().map(function(x){ return x.id; })); toast('Notifications are on'); } else toast('Notifications were not allowed'); notifModal(); }); }
  else if (a === 'notifOff'){ lSet('pio_dn_' + S.me.username, null); toast('Notifications are off'); notifModal(); }
  else if (a === 'invNew') invModal();
  else if (a === 'invEdit') invModal(t.dataset.id);
  else if (a === 'invOut') invOutModal(t.dataset.id);
  else if (a === 'invIn') act('checkinItem', { id: t.dataset.id }, 'Returned').catch(function(e){ toast(e.message); });
  else if (a === 'invRepair'){ busy(t, act('setItemStatus', { id: t.dataset.id, status: 'Repair' }, 'Sent for repair').then(closeModal)); }
  else if (a === 'invStatus') act('setItemStatus', { id: t.dataset.id, status: t.dataset.s }, 'Updated').catch(function(e){ toast(e.message); });
  else if (a === 'invDel'){ act('deleteItem', { id: t.dataset.id }, 'Equipment deleted').then(closeModal).catch(function(e){ toast(e.message); }); }
  else if (a === 'invF'){ var fromAlert = !!t.closest('.inv-alert'); S.invF = fromAlert ? t.dataset.f : (S.invF === t.dataset.f ? 'all' : t.dataset.f); render(); if (fromAlert){ var gl = document.getElementById('invQ'); if (gl) gl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  else if (a === 'evNew'){ if (t.dataset.d) S.selDay = t.dataset.d; closeModal(); evModal(); }
  else if (a === 'evEdit') evModal(t.dataset.id);
  else if (a === 'evDispatch'){ var de = S.events.filter(function(x){ return x.id === t.dataset.id; })[0]; if (de){ closeModal(); evDispatch(de); } }
  else if (a === 'evBack') evBackToDay();
  else if (a === 'evCancelYes'){ busy(t, act('setEventStatus', { id: t.dataset.id, status: 'Cancelled' }, 'Event cancelled').then(evBackToDay).catch(function(e){ toast(e.message); })); }
  else if (a === 'evConfirm' || a === 'evCancel' || a === 'evReopen'){ var es = a === 'evConfirm' ? 'Confirmed' : a === 'evCancel' ? 'Cancelled' : 'Pending'; if (a === 'evCancel') return evRemoveAsk(t.dataset.id, 'cancel'); act('setEventStatus', { id: t.dataset.id, status: es }, es === 'Confirmed' ? 'Event confirmed' : es === 'Cancelled' ? 'Event cancelled' : 'Event reopened').then(refreshPop).catch(function(e){ toast(e.message); }); }
  else if (a === 'evDelete' || a === 'evRemove') evRemoveAsk(t.dataset.id, a === 'evDelete' ? 'dup' : '');
  else if (a === 'dupReview') dupReview();
  else if (a === 'dupOpen'){ var dq = S.events.filter(function(x){ return x.id === t.dataset.id; })[0]; if (dq){ closeModal(); dayPop(dq.date); } }
  else if (a === 'dupKeep'){ t.disabled = true; act('mergeEvent', { id: t.dataset.drop, into: t.dataset.keep, note: 'From the duplicate review' }, 'Duplicate removed').then(dupReview).catch(function(e){ t.disabled = false; toast(e.message); }); }
  else if (a === 'dupNot'){ t.disabled = true; act('markNotDup', { id: t.dataset.a, other: t.dataset.b }, 'Marked as different events').then(dupReview).catch(function(e){ t.disabled = false; toast(e.message); }); }
  else if (a === 'toMarkPrinted'){ var mp = S.travelOrders.filter(function(x){ return x.id === t.dataset.id; })[0]; if (mp) markPrinted([mp]); }
  else if (a === 'toNew') toModal();
  else if (a === 'toEdit') toModal(t.dataset.id);
  else if (a === 'toManage') toManageModal(t.dataset.id);
  else if (a === 'toCopy'){ var to = S.travelOrders.filter(function(x){ return x.id === t.dataset.id; })[0]; if (to) copyText(toText(to)); }
  else if (a === 'toAddMe') addName(S.me.name);
  else if (a === 'toDrop'){ TO.names.splice(+t.dataset.i, 1); drawChips(); }
  else if (a === 'toDelete'){ busy(t, act('deleteTO', { id: t.dataset.id }, 'Travel order deleted').then(closeModal), 'merr'); }
  else if (a === 'leaveNew') leaveModal(t.dataset.u);
  else if (a === 'credits') creditsModal(t.dataset.u);
  else if (a === 'leaveDel'){ busy(t, act('deleteLeave', { id: t.dataset.id }, 'Leave record removed')); }
  else if (a === 'adjust'){ var dd = Number(document.getElementById('aj').value), rs = document.getElementById('ar2').value;
    busy(t, act('adjustLeave', { username: M.u, pool: document.getElementById('ap2').value, days: dd, note: rs }, 'Adjustment saved').then(closeModal), 'merr'); }
  else if (a === 'exportLeaves'){ download('leave-records-' + today() + '.csv', csv([['Employee','Type','From','To','Days','Note','Recorded by','Recorded at']].concat(S.leaves.map(function(l){ return [userName(l.username), leaveName(l.type), l.dateFrom, l.dateTo, l.days, l.note, l.createdBy, l.createdAt]; }))), 'text/csv'); toast('Leave records downloaded'); }
});
document.addEventListener('keydown', function(ev){
  if (ev.target.id !== 'tp') return;
  var ul = document.getElementById('toSug'), items = ul ? Array.prototype.slice.call(ul.querySelectorAll('li')) : [], cur = items.findIndex(function(li){ return li.getAttribute('aria-selected') === 'true'; });
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){ ev.preventDefault(); if (!items.length) return; var nx = (cur + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach(function(li, i){ li.setAttribute('aria-selected', String(i === nx)); }); }
  else if (ev.key === 'Enter'){ ev.preventDefault(); if (cur >= 0) addName(items[cur].dataset.pick); else if (ev.target.value.trim()) addName(ev.target.value); }
  else if (ev.key === 'Backspace' && !ev.target.value && TO.names.length){ TO.names.pop(); drawChips(); }
});
document.addEventListener('input', function(ev){
  if (ev.target.id === 'tp') showSug(ev.target.value);
  if (ev.target.id === 'ld') leaveCheck(false);
});
document.addEventListener('change', function(ev){
  var id = ev.target.id;
  if (id === 'avDate' && ev.target.value){ S.availDate = ev.target.value; render(); }
  if (id === 'toMine'){ S.toMine = ev.target.checked; render(); }
  if (id === 'calMine'){ S.calMine = ev.target.checked; render(); }
  if (id === 'invQ'){ S.invQ = ev.target.value.trim(); render(); }
  if (id === 'toQ'){ S.toQ = ev.target.value.trim(); render(); }
  if (id === 'toTy'){ S.toType = ev.target.value; render(); }
  if (id === 'tf' || id === 'tt') drawChips();
  if (id === 'lu2' || id === 'lt' || id === 'lf' || id === 'lto') leaveCheck(id !== 'lu2');
  if (ev.target.dataset.setemp){ var el = ev.target; el.disabled = true; act('setEmpType', { username: el.dataset.setemp, empType: el.value }, 'Employment type updated').then(function(){ if (document.getElementById('pemp')) personModal(el.dataset.setemp); }).catch(function(e){ toast(e.message); el.disabled = false; }); }
});
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form]'); if (!f) return;
  var kind = f.dataset.form, btn = f.querySelector('[type=submit]'), d = {};
  new FormData(f).forEach(function(v, k){ if (typeof v === 'string') d[k] = v; });
  var p;
  if (kind === 'saveTO'){ var pend = document.getElementById('tp').value.trim(); if (pend) addName(pend); d.names = TO.names.join('\n'); d.id = TO.id; p = act('saveTO', d, TO.id ? 'Travel order saved' : 'Travel order filed. An admin will prepare it.').then(closeModal); }
  else if (kind === 'toStatus'){ d.id = M.id; p = act('setTOStatus', d, 'Travel order updated').then(closeModal); }
  else if (kind === 'recordLeave'){ d.override = !!d.override; p = act('recordLeave', d, 'Leave recorded').then(closeModal); }
  else if (kind === 'credits'){ d.username = M.u; p = act('setCredits', d, 'Balances saved').then(closeModal); }
  if (p) busy(btn, p, 'merr');
});

/* =====================================================================
   PIO Overwatch: TEVs, leave-first dashboards, printing travel orders,
   calendar events overview and quick picks for logging offsets
   ===================================================================== */
ICONS.peso = '<path d="M7 21V3h5.5a5 5 0 0 1 0 10H7"/><path d="M4 7h16M4 10h16"/>';
var PESO_FMT = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function peso(n){ return '₱' + PESO_FMT.format(Number(n) || 0); }
function toOf(id){ return S.travelOrders.filter(function(t){ return t.id === id; })[0]; }

