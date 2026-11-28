/* PIO Overwatch · app.js · loaded in order by index.html (core, views, events, documents, data, app). */
/* ---------- update prompt ----------
   An app left open keeps running the version it loaded. version.json (published with each update) holds the
   newest version and a few lines on what changed. When it differs from this page's APP_VER, a card offers
   a refresh. Checked when the app comes back to the front and every 10 minutes. Keep APP_VER, version.json
   and the cache name in sw.js the same when publishing. */
var APP_VER = 'v102';
(function(){
  var shown = null, last = 0;
  function check(force){
    if (!force && Date.now() - last < 60000) return; last = Date.now();
    if (!window.fetch || location.protocol === 'file:') return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(v){
      if (!v || !v.ver) return;
      // just updated: say what changed, once per version on this device
      if (v.ver === APP_VER){ var seen = null; try { seen = localStorage.getItem('pio_seen_ver'); } catch(e){}
        if (seen !== APP_VER && shown !== APP_VER && (v.notes || []).length){ shown = APP_VER; lSet('pio_seen_ver', APP_VER); showDone(v); } return; }
      if (v.ver === shown) return;
      try { if (sessionStorage.getItem('pio_upd_later') === v.ver) return; } catch(e){}
      shown = v.ver; showUpdate(v);
    }).catch(function(){});
  }
  function showUpdate(v, done){
    var old = document.getElementById('upd'); if (old) old.remove();
    var notes = (v.notes || []).slice(0, 5);
    var el = document.createElement('div'); el.id = 'upd'; el.className = 'upd-scrim';
    var back = document.activeElement;
    el.innerHTML = '<section class="upd" role="dialog" aria-modal="true" aria-labelledby="updT"><div class="upd-h">' + (done ? ic('check') + '<div><b id="updT">You’re up to date</b><span>Here’s what changed in this version.</span></div></div>' : ic('refresh') + '<div><b id="updT">Update ready</b><span>Refresh to get the newest version.</span></div></div>') +
      (notes.length ? '<div class="upd-new"><div class="upd-k">What’s new</div><ul>' + notes.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="upd-f">' + (done ? '<button type="button" class="btn btn-primary btn-sm" data-upd="ok">Got it</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-upd="later">Later</button><button type="button" class="btn btn-primary btn-sm" data-upd="go">' + ic('refresh') + 'Refresh now</button>') + '</div></section>';
    document.body.appendChild(el); document.body.classList.add('locked');
    el.querySelector('.upd-f .btn-primary').focus();
    var later = function(){ if (!done) try { sessionStorage.setItem('pio_upd_later', v.ver); } catch(e){}
      el.classList.add('out'); document.removeEventListener('keydown', keys, true);
      setTimeout(function(){ el.remove(); if (!document.querySelector('#modal .scrim')) document.body.classList.remove('locked'); if (back && document.body.contains(back)) back.focus(); }, 200); };
    // Esc = Later; Tab stays inside the two buttons
    var keys = function(ev){
      if (ev.key === 'Escape'){ ev.stopPropagation(); ev.preventDefault(); later(); }
      else if (ev.key === 'Tab'){ var bs = el.querySelectorAll('button:not(:disabled)'), f = bs[0], l = bs[bs.length - 1];
        if (ev.shiftKey && document.activeElement === f){ ev.preventDefault(); l.focus(); } else if (!ev.shiftKey && document.activeElement === l){ ev.preventDefault(); f.focus(); } }
    };
    document.addEventListener('keydown', keys, true);
    el.addEventListener('click', function(ev){
      if (ev.target === el){ later(); return; }          // a tap on the dimmed backdrop counts as Later
      var b = ev.target.closest('[data-upd]'); if (!b) return;
      if (b.dataset.upd !== 'go'){ later(); return; }
      b.disabled = true; b.lastChild.textContent = 'Refreshing…'; reloadWhenSaved();
    });
  }
  /* after updating: a quiet card in the lower right that fades out after 5 seconds
     (it waits while the pointer is on it or it has keyboard focus, so it can be read) */
  function showDone(v){
    var notes = (v.notes || []).slice(0, 5), el = document.createElement('section');
    el.className = 'upd-done'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="upd-h">' + ic('check') + '<div><b>You’re up to date</b><span>What’s new in this version:</span></div>' +
      '<button type="button" class="icon-btn" aria-label="Close">' + ic('x') + '</button></div>' +
      '<ul>' + notes.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><i class="upd-timer" aria-hidden="true"></i>';
    document.body.appendChild(el);
    var t = null, gone = false, bar = el.querySelector('.upd-timer');
    var bye = function(){ if (gone) return; gone = true; el.classList.add('out'); setTimeout(function(){ el.remove(); }, 260); };
    var run = function(){ clearTimeout(t); bar.classList.remove('hold'); void bar.offsetWidth; bar.classList.add('go'); t = setTimeout(bye, 5000); };
    var hold = function(){ clearTimeout(t); bar.classList.remove('go'); bar.classList.add('hold'); };
    el.addEventListener('pointerenter', hold); el.addEventListener('pointerleave', function(){ if (!el.contains(document.activeElement)) run(); });
    el.addEventListener('focusin', hold); el.addEventListener('focusout', function(ev){ if (!el.contains(ev.relatedTarget)) run(); });
    el.querySelector('.icon-btn').addEventListener('click', bye);
    run();
  }
  // never throw away a change that is still being saved
  function reloadWhenSaved(){
    if (typeof Q !== 'undefined' && Q && (Q.busy || (Q.ops && Q.ops.length))){ setTimeout(reloadWhenSaved, 500); return; }
    location.reload();
  }
  window.addEventListener('focus', function(){ check(); });
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) check(); });
  setInterval(function(){ if (!document.hidden) check(true); }, 10 * 60000);
  setTimeout(function(){ check(true); }, 4000);
  window.pioCheckUpdate = function(){ last = 0; check(true); };
})();

/* Installable app: cache the page shell so it opens fast and works as a home-screen app. */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function(r){ r.update(); }).catch(function(){});

/* ---------- boot ----------
   A remembered device shows its last data instantly, then refreshes in the background. */
/* The splash runs for 2 seconds on every app start, then the app opens out of it in a growing circle
   (a plain fade with reduced motion). The dashboard's entrance waits for the circle. */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(function(){
    var s = document.getElementById('splash'), app = document.getElementById('app'); if (!s) return;
    if (reduce || !app){ s.classList.add('out'); setTimeout(function(){ s.remove(); }, 400); return; }
    app.classList.add('reveal');
    setTimeout(function(){ if (typeof dashMotion === 'function') dashMotion(true); }, 160);
    setTimeout(function(){ s.remove(); app.classList.remove('reveal'); }, 760);
  }, reduce ? 600 : 2000);
})();

/* =====================================================================
   v42: search, phone Back button and page links, accessibility fixes,
   dispatch orders for events near the Capitol within office hours
   ===================================================================== */

/* ---------- every page has its own link; the phone's Back button works ---------- */
var NAV = { init: false, fromPop: false };
function navViews(){ return navItems().map(function(x){ return x[0]; }).concat(['log', 'records', 'inventory']); }
function navSync(){
  if (!S.me || typeof NAV === 'undefined' || !NAV) return;
  var h = '#' + S.view;
  if (!NAV.init){
    NAV.init = true;
    var want = location.hash.slice(1);
    if (want && want !== S.view && navViews().indexOf(want) >= 0){ S.view = want; history.replaceState({ v: want }, '', '#' + want); render(); return; }
    history.replaceState({ v: S.view }, '', h); return;
  }
  if (NAV.fromPop){ NAV.fromPop = false; return; }
  if (location.hash !== h){
    history.pushState({ v: S.view }, '', h);
    var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true });   // screen readers start at the new page
  }
}
window.addEventListener('popstate', function(){
  if (!S.me) return;
  if (document.querySelector('#modal .scrim')){            // Back closes an open window first
    closeModal(); history.pushState({ v: S.view }, '', '#' + S.view); return;
  }
  var v = location.hash.slice(1);
  if (v && v !== S.view && navViews().indexOf(v) >= 0){ NAV.fromPop = true; S.view = v; S.selDay = null; render(); window.scrollTo(0, 0); }
});

/* ---------- accessibility fixes applied to every page ---------- */
function a11yFix(root){
  root.querySelectorAll('th').forEach(function(th){ if (!th.textContent.trim() && !th.children.length) th.innerHTML = '<span class="sr-only">Actions</span>'; });
  root.querySelectorAll('.table-wrap').forEach(function(w){
    if (w.hasAttribute('tabindex')) return;
    var h = w.closest('.panel'), t = h && h.querySelector('h2');
    w.setAttribute('tabindex', '0'); w.setAttribute('role', 'region'); w.setAttribute('aria-label', (t ? t.textContent.trim() : 'Table') + ' (scrolls sideways)');
  });
  root.querySelectorAll('.lgscroll').forEach(function(w){ if (!w.hasAttribute('tabindex')){ w.setAttribute('tabindex', '0'); w.setAttribute('role', 'region'); w.setAttribute('aria-label', 'Legend (scrolls sideways)'); } });
}

/* ---------- search everything (top bar, or press / ) ---------- */
function searchModal(){
  modal('Search', '<div class="field"><label for="sq" class="sr-only">Search</label><input class="input" id="sq" type="search" autocomplete="off" placeholder="Name, event, place, TO number, date…" aria-describedby="sqh" aria-controls="sres"><span class="hint" id="sqh">Staff, events, travel orders, TEVs, offsets and leaves. Press Enter to open the first result.</span></div><div id="sres" role="region" aria-live="polite"></div>', '', '');
  setTimeout(function(){ var i = document.getElementById('sq'); if (i) i.focus(); }, 30);
  searchRun('');
}
/* pages search can open, with the words people might use for them */
var PAGE_WORDS = { tasks: 'tasks to do work assignment graphic design pubmat caption writing layout report accomplishment summary', dashboard: 'home start overview', calendar: 'events schedule dispatch day', travel: 'travel orders to trips print', log: 'offset offsets log earn overtime', leaves: 'leave vacation sick wellness', tev: 'tev reimbursement claim cheque', monthly: 'monthly report summary', records: 'records history list entries', approvals: 'review approve pending requests', staff: 'staff people accounts pin days field office', settings: 'settings holidays backup rules', inventory: 'equipment camera gear inventory' };
function searchPages(){ var seen = {}; return navItems().concat(isAdmin() ? [['log', 'plus', 'Log offset'], ['approvals', 'check', 'Approvals']] : []).filter(function(n){ if (seen[n[0]]) return false; seen[n[0]] = 1; return true; }); }
function sNorm(s){ return String(s || '').toLowerCase(); }
function searchRun(q){
  var box = document.getElementById('sres'); if (!box) return;
  var words = sNorm(q).split(/\s+/).filter(Boolean);
  // nothing typed yet: every page, one tap away
  if (!words.length){ box.innerHTML = '<div class="label" style="margin-top:12px">Go to</div><div class="s-pages">' + searchPages().map(function(p){ return '<button type="button" class="chip" data-go="' + p[0] + '">' + ic(p[1]) + esc(p[2]) + '</button>'; }).join('') + '</div>'; return; }
  function hit(text){ text = sNorm(text); return words.every(function(w){ return text.indexOf(w) >= 0; }); }
  var long = { month:'long', day:'numeric', year:'numeric' }, groups = [], adm = isAdmin();
  var pg = searchPages().filter(function(p){ return hit(p[2] + ' ' + (PAGE_WORDS[p[0]] || '')); });
  if (pg.length) groups.push(['Pages', pg.map(function(p){ return { a: 'data-go="' + p[0] + '"', ic: p[1], t: p[2], m: 'Open this page' }; })]);
  var ppl = S.users.filter(function(u){ return hit(u.name + ' ' + u.username + ' ' + (u.empType || '') + ' ' + (u.position || '')); }).slice(0, 5);
  if (ppl.length) groups.push(['Staff', ppl.map(function(u){ return { a: adm || u.username === S.me.username ? 'data-person="' + esc(u.username) + '"' : 'data-go="calendar"', ic: 'users', t: u.name, m: (u.empType || '') + (u.active === false ? ' · inactive' : '') }; })]);
  var evs = (S.events || []).filter(function(e){ return hit([e.title, e.venue, e.requester, e.date, fDate(e.date, long), evKind(e) === 'tasking' ? 'dispatch order' : 'travel order', (evNeedsText(e) || []).join(' ')].join(' ')); })
    .sort(function(a, b){ return a.date < b.date ? 1 : -1; }).slice(0, 6);
  if (evs.length) groups.push(['Events', evs.map(function(e){ return { a: 'data-act="evPick" data-id="' + esc(e.id) + '"', ic: 'megaphone', t: e.title, m: evShort(e) + ' · ' + e.venue + ' · ' + EV_LABEL[evState(e)] }; })]);
  var tos = S.travelOrders.filter(function(t){ return hit([t.event, t.destination, t.toNo, (t.names || []).join(' '), t.dateFrom, fDate(t.dateFrom, long), t.status].join(' ')); })
    .sort(function(a, b){ return a.dateFrom < b.dateFrom ? 1 : -1; }).slice(0, 6);
  if (tos.length) groups.push(['Travel orders', tos.map(function(t){ return { a: 'data-act="findTO" data-id="' + t.id + '"', ic: 'route', t: t.event, m: fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric', year:'numeric' }) + (t.destination ? ' · ' + t.destination : '') + ' · ' + t.status }; })]);
  var tevs = (S.tevs || []).filter(function(v){ var t = toOf(v.toId) || {}; return hit([v.name, t.event, t.destination, v.chequeNo, v.status].join(' ')); }).slice(0, 6);
  if (tevs.length) groups.push(['TEVs', tevs.map(function(v){ var t = toOf(v.toId) || {}; return { a: adm ? 'data-act="tevEdit" data-id="' + v.id + '"' : 'data-go="tev"', ic: 'peso', t: dispName(v.name) + ' · ' + (t.event || ''), m: v.status + ' · ' + peso(v.total) }; })]);
  var ents = S.entries.filter(function(e){ return hit([userName(e.username), e.event, e.venue, e.category, e.date, fDate(e.date, long), e.type === 'USE' ? 'day off' : 'offset', e.status].join(' ')); })
    .sort(function(a, b){ return a.date < b.date ? 1 : -1; }).slice(0, 6);
  if (ents.length) groups.push(['Offsets and days off', ents.map(function(e){ return { a: 'data-entry="' + e.id + '"', ic: e.type === 'USE' ? 'plane' : 'plus', t: (adm ? userName(e.username) + ' · ' : '') + (e.type === 'USE' ? 'Day off' : (e.event || e.category)), m: fDate(e.date) + ' · ' + e.status }; })]);
  var lv = S.leaves.filter(function(l){ return !/^ADJ/.test(l.type) && hit([userName(l.username), leaveName(l.type), l.dateFrom, fDate(l.dateFrom, long), l.note].join(' ')); }).slice(0, 5);
  if (lv.length) groups.push(['Leaves', lv.map(function(l){ return { a: 'data-go="leaves"', ic: 'plane', t: (adm ? userName(l.username) + ' · ' : '') + leaveName(l.type), m: fRange(l.dateFrom, l.dateTo, { month:'short', day:'numeric', year:'numeric' }) }; })]);
  box.innerHTML = groups.length ? groups.map(function(g){ return '<div class="label" style="margin-top:12px">' + g[0] + '</div><ul class="list sres">' + g[1].map(function(x){ return '<li class="row tap" ' + x.a + ' tabindex="0"><span class="mark act">' + ic(x.ic) + '</span><div class="body"><div class="t">' + esc(x.t) + '</div><div class="m">' + esc(x.m) + '</div></div></li>'; }).join('') + '</ul>'; }).join('')
    : '<p class="hint" style="margin:12px 0 0">Nothing found for “' + esc(q) + '”.</p>';
}
document.addEventListener('input', function(ev){ if (ev.target.id === 'sq') searchRun(ev.target.value); });
document.addEventListener('keydown', function(ev){
  if (ev.target.id === 'sq' && ev.key === 'Enter'){ ev.preventDefault(); var f = document.querySelector('#sres .row'); if (f) f.click(); return; }
  if (ev.target.closest && ev.target.closest('#sres') && ev.key === 'Enter' && ev.target.classList.contains('row')){ ev.preventDefault(); ev.target.click(); return; }
  var a = document.activeElement, typing = a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable);
  if (ev.key === '/' && !typing && S.me && !document.querySelector('#modal .scrim')){ ev.preventDefault(); searchModal(); }
});
/* opening a travel order from search: go to its tab and point at it */
function findTO(id){
  var t = toOf(id); if (!t) return;
  closeModal();
  S.view = 'travel'; S.toMine = false; S.toPer = 'all'; S.toType = 'all'; S.toQ = '';
  S.toFilter = t.status === 'Cancelled' ? 'Cancelled' : (t.dateTo || t.dateFrom) < today() ? 'past' : 'upcoming';
  render(); window.scrollTo(0, 0);
  setTimeout(function(){ var el = document.getElementById('to-' + id); if (el){ el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(function(){ el.classList.remove('flash'); }, 1800); } }, 60);
}
(function(){
  var T = toRow;
  toRow = function(t){ return T(t).replace('<li class="to-card"', '<li class="to-card" id="to-' + t.id + '"'); };
})();
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  if (t.dataset.act === 'search') searchModal();
  else if (t.dataset.act === 'findTO') findTO(t.dataset.id);
});

/* ---------- events: dispatch order vs travel order ----------
   Most coverage is at the Capitol or nearby, within 8 AM to 5 PM, and staff can come back for the
   biometric at noon or the event is only half a day. Those need a dispatch order, not a travel order.
   A travel order is for out-of-town, multi-day, or after-hours work. */
var OFFICE = { start: '08:00', end: '17:00', noon: '12:00' };
function evSuggest(d){
  var multi = d.dateTo && d.date && d.dateTo !== d.date;
  var early = d.time && d.time < OFFICE.start, late = (d.timeEnd && d.timeEnd > OFFICE.end) || (d.time && d.time >= OFFICE.end);
  var wkend = d.date && [0, 6].indexOf(pd(d.date).getDay()) >= 0;
  if (multi) return { k: 'travel', why: 'more than one day' };
  if (early || late) return { k: 'travel', why: 'outside 8 AM to 5 PM' };
  if (wkend) return { k: 'travel', why: 'on a weekend' };
  return { k: 'tasking', why: 'one day, within office hours' };
}
function evHalf(e){
  if (!e.time || (e.dateTo && e.dateTo !== e.date)) return '';
  var end = e.timeEnd || '';
  if (end && end <= '12:30') return 'Half day · morning';
  if (e.time >= '12:00' && (!end || end <= OFFICE.end)) return 'Half day · afternoon';
  return '';
}
(function(){
  var EM = evModal;
  evModal = function(id){
    EM(id);
    var f = document.querySelector('#modal form[data-form="saveEvent"]'); if (!f) return;
    // clearer choices
    var lab = { travel: ['Travel order', 'Away from the Capitol, overnight, or on a weekend'], tasking: ['Dispatch order', 'Capitol grounds or nearby; staff can come back for the biometric'] };
    f.querySelectorAll('input[name=kind]').forEach(function(r){ var l = f.querySelector('label[for="' + r.id + '"]'); if (l && lab[r.value]) l.innerHTML = '<b>' + lab[r.value][0] + '</b><small>' + lab[r.value][1] + '</small>'; });
    var seg = f.querySelector('input[name=kind]'); if (!seg) return;
    var box = seg.closest('.seg'), hint = document.createElement('p'); hint.className = 'hint'; hint.id = 'evKindHint'; hint.style.margin = '6px 0 0';
    box.parentNode.insertBefore(hint, box.nextSibling);
    var isNew = !(f.querySelector('input[name=id]') || {}).value;
    // new events: nothing is picked for you; the person adding it says what is needed (required)
    f.querySelectorAll('input[name=kind]').forEach(function(r){ r.required = true; if (isNew) r.checked = false; });
    var leg = box.closest('fieldset') && box.closest('fieldset').querySelector('legend'); if (leg) leg.innerHTML = 'How will staff be sent? <span class="req" aria-hidden="true" style="color:var(--red)">*</span>';
    evKindSync(f);
  };
})();
function evWeekend(d1, d2){ if (!d1) return false; for (var d = d1; d <= (d2 || d1); d = addDays(d, 1)){ var w = pd(d).getDay(); if (w === 0 || w === 6) return true; if (d > addDays(d1, 31)) break; } return false; }
function evKindSync(f){
  var g = function(n){ var x = f.querySelector('[name=' + n + ']'); return x ? x.value : ''; };
  var d = { date: g('date'), dateTo: g('dateTo'), time: g('time'), timeEnd: g('timeEnd') };
  var wk = evWeekend(d.date, d.dateTo), disp = f.querySelector('input[name=kind][value=tasking]'), trav = f.querySelector('input[name=kind][value=travel]');
  // rule: weekend events always need a travel order
  if (disp){ disp.disabled = wk; if (wk && disp.checked){ disp.checked = false; if (trav) trav.checked = true; } if (wk && trav && !trav.checked) trav.checked = true; }
  var h = document.getElementById('evKindHint'); if (!h) return;
  var half = evHalf(d), s = evSuggest(d), cur = (f.querySelector('input[name=kind]:checked') || {}).value;
  if (wk){ h.textContent = 'Weekend events always need a travel order.'; return; }
  // a hint only: the person who knows the event decides
  // no guessing from the time of day: office hours alone do not make it a dispatch order
  h.textContent = 'Pick by where it is: a dispatch order only if it is on the Capitol grounds or nearby and staff can come back for the biometric. Anywhere else needs a travel order.' + (half ? ' ' + half + '.' : '');
}
document.addEventListener('input', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveEvent"]'); if (!f) return;
  if (/^(date|dateTo|time|timeEnd|kind)$/.test(ev.target.name)) evKindSync(f);
});
document.addEventListener('change', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveEvent"]'); if (!f) return;
  if (/^(date|dateTo|kind)$/.test(ev.target.name)) evKindSync(f);
});
(function(){
  var EC = evCard;
  evCard = function(e){
    var h = EC(e), half = evHalf(e), miss = e.status !== 'Cancelled' ? evMissing(e) : [];
    if (miss.length){ var only = miss.length === 1 && miss[0] === 'more people'; h = h.replace('>Incomplete</span>', '>Incomplete · ' + (only ? 'more people to be added' : 'no ' + miss.join(' or ').replace('more people', 'full crew') + ' yet') + '</span>'); }
    h = h.replace('Dispatch order <span class="hint">(within the Capitol)</span>', 'Dispatch order <span class="hint">(Capitol or nearby, office hours)</span>');
    if (half) h = h.replace(/(<dt>Time<\/dt><dd>)([^<]*)/, '$1$2 <span class="pill off">' + half + '</span>');
    // a travel-order event that fits office hours: say a dispatch order may be enough
    return h;
  };
  var EP = evPrompt;
  evPrompt = function(e){ EP(e); var b = document.querySelector('#modal .panel-b p'); if (b && evKind(e) === 'tasking') b.innerHTML = b.innerHTML.replace('Assign the people who will cover it so it shows on their dashboards.', 'Assign the people who will cover it. A dispatch order was picked, so no travel order is made.'); };
  var AM = assignModal;
  assignModal = function(id){ AM(id); var e = S.events.filter(function(x){ return x.id === id; })[0], half = e && evHalf(e), sb = document.querySelector('#modal .sumbox span'); if (half && sb) sb.textContent += ' · ' + half; };
})();

/* ---------- styles ---------- */
(function(){
  var st = document.createElement('style');
  st.textContent = '.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}' +
    '#main:focus{outline:none}.table-wrap:focus-visible{outline:2px solid var(--brand);outline-offset:2px}' +
    '.to-card.flash{animation:flash 1.6s ease-out}@keyframes flash{0%,40%{background:var(--brand-soft)}100%{background:transparent}}' +
    '.side-search kbd{margin-left:auto;font:600 11px inherit;border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:1px 6px;opacity:.8}@media (pointer:coarse){.side-search kbd{display:none}}' +
    '.sres .row{padding-block:10px}.sres .t{white-space:normal;overflow:visible}' +
    // dark mode: the green button was too light for white text (3.2:1); this shade passes 4.5:1
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .btn-primary{background:#1B7434}:root:not([data-theme="light"]) .btn-primary:hover{background:#16602B}}:root[data-theme="dark"] .btn-primary{background:#1B7434}:root[data-theme="dark"] .btn-primary:hover{background:#16602B}' +
    // phones and tablets: everything tappable at least 44px
    // phones: four summary tiles become two rows so labels are not split mid-word; top bar title on one line
    '@media (max-width:520px){.tiles.cal4{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}.tile .k{word-break:normal;overflow-wrap:normal}' +
    '.topbar b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    // waiting tags sit in a one-line meta row that cuts off on phones; let that row wrap so the tag stays visible
    '.row .m:has(.age){white-space:normal;overflow:visible}' +
    // smallest click targets at least 24px (WCAG 2.2)
    '.legend .lgh{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.legend .lgsep{width:1px;align-self:stretch;min-height:16px;background:var(--line-strong);padding:0}' +
    'button.pill{min-height:24px}.seg input:disabled+label{opacity:.5;cursor:not-allowed}' +
    '@media (pointer:coarse){.chip,.input{min-height:44px}.icon-btn{min-width:44px;min-height:44px}.topbar button{width:44px;height:44px}button.pill{min-height:32px;padding-inline:12px}}';
  document.head.appendChild(st);
})();


/* ---------- one person on a dispatch order: final, or more to come? ---------- */
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('#modal form[data-form="assignEvent"]'); if (!f) return;
  var n = f.querySelectorAll('input[name=user]:checked').length, open = f.querySelector('input[name=open]');
  if (!open){ open = document.createElement('input'); open.type = 'hidden'; open.name = 'open'; open.value = ''; f.appendChild(open); }
  if (n !== 1){ open.value = n === 0 ? '' : '0'; return; }
  if (open.value === '0' || open.value === '1') return;          // already answered
  ev.preventDefault(); ev.stopImmediatePropagation();
  var who = f.querySelector('input[name=user]:checked'), lab = who && f.querySelector('label input[value="' + who.value + '"]'), name = lab ? lab.closest('label').textContent.trim().split('\n')[0] : 'one person';
  var box = document.getElementById('crewAsk');
  if (!box){ box = document.createElement('div'); box.id = 'crewAsk'; box.className = 'warn-note'; box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-labelledby', 'crewAskT'); var pb = f.querySelector('.panel-b') || f; pb.insertBefore(box, pb.firstChild); }
  box.innerHTML = ic('users') + '<span><b id="crewAskT">Only one person is dispatched.</b> Is that final, or will you add more people later?' +
    '<span class="conflict-acts" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn btn-sm btn-primary" data-act="crewFinal">One is enough · final</button><button type="button" class="btn btn-sm btn-ghost" data-act="crewOpen">More people later</button></span></span>';
  box.scrollIntoView({ block: 'nearest' }); var b1 = box.querySelector('[data-act=crewFinal]'); if (b1) b1.focus();
}, true);
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="crewFinal"],[data-act="crewOpen"]'); if (!t) return;
  var f = t.closest('form'); if (!f) return;
  f.querySelector('input[name=open]').value = t.dataset.act === 'crewOpen' ? '1' : '0';
  if (f.requestSubmit) f.requestSubmit(); else f.querySelector('[type=submit]').click();
});
// changing who is ticked asks again
document.addEventListener('change', function(ev){
  if (ev.target.name !== 'user') return; var f = ev.target.closest('form[data-form="assignEvent"]'); if (!f) return;
  var o = f.querySelector('input[name=open]'); if (o) o.value = ''; var b = document.getElementById('crewAsk'); if (b) b.remove();
});

/* ---------- link travel orders to calendar events ----------
   A trip filed straight on the Travel orders page asks which event it is for, or makes one,
   so the calendar shows one item per trip. "No event" is for after-hours work and similar. */
function toEventChoices(d1, d2, cur){
  d2 = d2 || d1;
  return (S.events || []).filter(function(e){ return e.status !== 'Cancelled' && (e.id === cur || (e.date <= d2 && (e.dateTo || e.date) >= d1)); }).sort(evSort);
}
function toEventField(form, keep){
  var box = form.querySelector('#toEvBox'); if (!box) return;
  var g = function(n){ var x = form.querySelector('[name=' + n + ']'); return x ? x.value : ''; };
  var prev = keep != null ? keep : (form.querySelector('input[name=eventId]:checked') || {}).value;
  var dayoff = (form.querySelector('input[name=toType]:checked') || {}).value === 'dayoff';
  if (dayoff){ box.innerHTML = '<input type="hidden" name="eventId" value=""><p class="hint" style="margin:0">Day-off travel orders are not tied to an event.</p>'; return; }
  var isNew = box.dataset.isnew === '1';
  if (isNew && box.dataset.picked !== '1' && keep == null) prev = null;     // follow the dates until someone picks
  var list = toEventChoices(g('dateFrom'), g('dateTo'), prev);
  if (prev == null || prev === undefined) prev = isNew ? (list.length ? '' : '__new') : 'none';
  var opt = function(v, title, sub){ return '<label class="check" style="padding:10px 12px"><input type="radio" name="eventId" value="' + esc(v) + '" required' + (prev === v ? ' checked' : '') + '><span><b>' + title + '</b>' + (sub ? '<br><span class="hint">' + sub + '</span>' : '') + '</span></label>'; };
  box.innerHTML = '<div style="display:grid;gap:8px">' +
    list.map(function(e){ return opt(e.id, esc(e.title), esc(evShort(e)) + (e.venue ? ' · ' + esc(e.venue) : '') + ' · ' + EV_LABEL[evState(e)]); }).join('') +
    opt('__new', 'Add it to the calendar as a new event', 'Uses the purpose, place and dates above. You can edit the event later.') +
    opt('none', 'No event', 'For after-hours work or anything that is not a coverage event') + '</div>' +
    (list.length ? '<p class="hint" style="margin:6px 0 0">' + list.length + ' event' + (list.length === 1 ? '' : 's') + ' on these dates.</p>' : '');
}
(function(){
  var TM = toModal;
  toModal = function(id, pre){
    TM(id, pre);
    var f = document.querySelector('#modal form[data-form="saveTO"]'); if (!f) return;
    if (f.querySelector('input[type=hidden][name=eventId]')) return;      // already made from an event
    var t = id ? S.travelOrders.filter(function(x){ return x.id === id; })[0] : null;
    var fs = document.createElement('fieldset'); fs.className = 'field'; fs.style.cssText = 'border:0;padding:0;margin:0';
    fs.innerHTML = '<legend class="label" style="margin-bottom:6px">Which event is this for? <span aria-hidden="true" style="color:var(--red)">*</span></legend><div id="toEvBox" data-isnew="' + (t ? '' : '1') + '"></div>';
    var anchor = f.querySelector('#te'); anchor = anchor && anchor.closest('.field');
    var pb = f.querySelector('.panel-b') || f;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(fs, anchor); else pb.appendChild(fs);
    // move it below Location so it reads after purpose and place
    var loc = f.querySelector('#tdst'); loc = loc && loc.closest('.field'); if (loc && loc.nextSibling) loc.parentNode.insertBefore(fs, loc.nextSibling);
    toEventField(f, t ? (t.eventId && (S.events || []).some(function(e){ return e.id === t.eventId; }) ? t.eventId : 'none') : null);
  };
})();
document.addEventListener('change', function(ev){
  var f = ev.target.closest && ev.target.closest('#modal form[data-form="saveTO"]'); if (!f || !f.querySelector('#toEvBox')) return;
  if (ev.target.name === 'eventId'){ f.querySelector('#toEvBox').dataset.picked = '1'; return; }
  if (/^(dateFrom|dateTo|toType)$/.test(ev.target.name)) toEventField(f);
});
// "none" is a form value only
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('#modal form[data-form="saveTO"]'); if (!f) return;
  var r = f.querySelector('input[name=eventId]:checked'); if (r && r.value === 'none'){ r.value = ''; }
}, true);

/* =====================================================================
   v43 polish: undo instead of "Are you sure?", calmer motion, steady numbers
   ===================================================================== */

/* ---------- Undo for deletes (6 seconds), instead of asking first ---------- */
var UNDO_MAP = { deleteEvent: ['events', 'id'], deleteItem: ['inventory', 'id'], deleteTO: ['travelOrders', 'id'], deleteLeave: ['leaves', 'id'], deleteEntry: ['entries', 'id'], deleteTEV: ['tevs', 'id'], deleteHoliday: ['holidays', 'date'] };
var UNDO = { list: [] };
function undoHide(){ UNDO.list.forEach(function(x){ var arr = S[x.c]; if (arr) S[x.c] = arr.filter(function(r){ return r[x.k] !== x.id; }); }); }
(function(){
  var A0 = apply; apply = function(d){ A0(d); undoHide(); };       // a background refresh must not bring it back
  var ACT = act;
  act = function(action, p, msg){
    var m = UNDO_MAP[action]; if (!m) return ACT(action, p, msg);
    var c = m[0], k = m[1], id = p && (k === 'date' ? p.date : p.id), rec = (S[c] || []).filter(function(r){ return r[k] === id; })[0];
    if (!rec) return ACT(action, p, msg);
    var job = { c: c, k: k, id: id, rec: rec, action: action, p: p, msg: msg };
    UNDO.list.push(job); undoHide(); render();
    job.timer = setTimeout(function(){ undoSend(job); }, 6000);
    undoToast(job, (msg || 'Deleted').replace(/^Deleted$/, 'Deleted'));
    return Promise.resolve({});
  };
  window.__actRaw = ACT;
})();
function undoSend(job){
  clearTimeout(job.timer); var i = UNDO.list.indexOf(job); if (i < 0) return; UNDO.list.splice(i, 1);
  undoToastHide(job);
  window.__actRaw(job.action, job.p, '').catch(function(e){ (S[job.c] = S[job.c] || []).push(job.rec); render(); toast(e.message); });
}
function undoBack(job){
  clearTimeout(job.timer); var i = UNDO.list.indexOf(job); if (i < 0) return; UNDO.list.splice(i, 1);
  (S[job.c] = S[job.c] || []).push(job.rec); render(); undoToastHide(job); toast('Restored');
}
// leaving the page sends anything still waiting, so a delete is never lost silently
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') UNDO.list.slice().forEach(undoSend); });
function undoToast(job, msg){
  var t = document.getElementById('undoToast');
  if (!t){ t = document.createElement('div'); t.id = 'undoToast'; t.className = 'toast undo-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  var old = t._job; if (old && old !== job) undoSend(old);               // one undo at a time: the earlier one goes through
  t._job = job; t.hidden = false;
  t.innerHTML = '<span>' + esc(msg) + '</span><button type="button" class="undo-btn" data-act="undoDel">Undo</button><i class="undo-bar" aria-hidden="true"></i>';
  var tt = document.getElementById('toast'); if (tt) tt.hidden = true;
}
function undoToastHide(job){ var t = document.getElementById('undoToast'); if (t && t._job === job){ t.hidden = true; t._job = null; } }
document.addEventListener('click', function(ev){ var b = ev.target.closest('[data-act="undoDel"]'); if (!b) return; var t = document.getElementById('undoToast'); if (t && t._job) undoBack(t._job); });

/* ---------- windows leave faster than they arrive (no blocking, no bounce) ---------- */
(function(){
  var CM = closeModal;
  closeModal = function(){
    var sc = document.querySelector('#modal .scrim'), reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!sc || reduce) return CM();
    var ghost = sc.cloneNode(true);
    ghost.querySelectorAll('[id]').forEach(function(e){ e.removeAttribute('id'); });
    ghost.querySelectorAll('[data-act],[data-form],[name]').forEach(function(e){ e.removeAttribute('data-act'); e.removeAttribute('data-form'); e.removeAttribute('name'); });
    ghost.removeAttribute('data-act'); ghost.classList.add('leaving'); ghost.setAttribute('aria-hidden', 'true'); ghost.style.pointerEvents = 'none';
    var host = document.getElementById('modal'); host.parentNode.insertBefore(ghost, host);   // the next window, if any, sits on top
    CM();
    setTimeout(function(){ ghost.remove(); }, 200);
  };
})();

/* ---------- charts: a text version for screen readers ---------- */
(function(){
  var TC = trendChart;
  trendChart = function(data){
    var h = TC(data), tot = data.reduce(function(a, d){ return [a[0] + d.earned, a[1] + d.used]; }, [0, 0]);
    h = h.replace('aria-label="Offsets earned and used per month"', 'aria-label="Offsets earned and used per month: ' + fD(tot[0]) + ' earned and ' + fD(tot[1]) + ' used over ' + data.length + ' months"');
    return h + '<table class="sr-only"><caption>Offsets per month</caption><thead><tr><th>Month</th><th>Earned</th><th>Used</th></tr></thead><tbody>' +
      data.map(function(d){ return '<tr><td>' + fMonth(d.m) + '</td><td>' + fD(d.earned) + '</td><td>' + fD(d.used) + '</td></tr>'; }).join('') + '</tbody></table>';
  };
})();

(function(){
  var st = document.createElement('style');
  st.textContent =
    ':root{--ease-out:cubic-bezier(.22,1,.36,1);--ease-in:cubic-bezier(.55,0,1,.45)}' +
    // entrances ease out; exits about 30% shorter and ease in
    '.modal{animation:pop .24s var(--ease-out)}@media (max-width:640px){.modal{animation:sheet .28s var(--ease-out)}}' +
    '.scrim.leaving{animation:fadeOut .17s var(--ease-in) forwards}.scrim.leaving .modal{animation:popOut .17s var(--ease-in) forwards}' +
    '@media (max-width:640px){.scrim.leaving .modal{animation:sheetOut .2s var(--ease-in) forwards}}' +
    '@keyframes fadeOut{to{opacity:0}}@keyframes popOut{to{opacity:0;transform:translateY(8px) scale(.98)}}@keyframes sheetOut{to{transform:translateY(40px);opacity:0}}' +
    // every tap gets an answer: a small press, no layout change
    '.btn,.chip,.tile,.icon-btn,.tabbar button,.nav button{transition:background .15s,box-shadow .15s,transform .12s var(--ease-out)}' +
    '.btn:active,.chip:active,.icon-btn:active,.tabbar button:active{transform:scale(.97)}button.tile:active{transform:scale(.985)}' +
    '.row.tap:active,.nav button:active{background:var(--surface-2)}' +
    // numbers line up and do not wiggle when they change
    '.amt,.big,.big-amt,.tile .v,td.r,.badge,.num,.mini-tiles b,.pill{font-variant-numeric:tabular-nums}' +
    // no one-word last lines on headings; nicer breaks in body text
    'h1,h2,h3,h4,.t,.tile .k{text-wrap:balance}p,.hint,.m,.info-note span,.warn-note span{text-wrap:pretty}' +
    // undo toast
    '.undo-toast{display:flex;align-items:center;gap:14px;padding:8px 8px 8px 18px;overflow:hidden}.undo-toast[hidden]{display:none}' +
    '.undo-btn{background:none;border:0;color:var(--sun);font:inherit;font-weight:700;padding:8px 12px;border-radius:999px;cursor:pointer;min-height:36px}.undo-btn:hover{background:rgba(255,255,255,.1)}' +
    '.undo-bar{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--sun);transform-origin:left;animation:undoBar 6s linear forwards}@keyframes undoBar{to{transform:scaleX(0)}}' +
    '@media (pointer:coarse){.undo-btn{min-height:44px}}';
  document.head.appendChild(st);
})();


/* =====================================================================
   v46: skills, easier assigning, equipment for an event, division views
   ===================================================================== */
var SKILLS = ['Photographer', 'Videographer', 'Livestream', 'OBS operator', 'Writer', 'Emcee / Host', 'Graphic artist'];
var NEED_SKILL = { 'Photo Documentation': ['Photographer'], 'Video Documentation': ['Videographer'], 'Livestreaming': ['Livestream', 'OBS operator'], 'News and Write-up': ['Writer'], 'Emcee or Hosting': ['Emcee / Host'] };
function skillsOf(u){ u = typeof u === 'string' ? userOf(u) : u; return (u && u.skills) || []; }
function canSkills(){ return !!S.me && (isAdmin() || S.me.role === 'scheduler'); }
function skillChips(u){ var k = skillsOf(u); return k.length ? '<span class="skchips">' + k.map(function(x){ return '<span class="skc">' + esc(x) + '</span>'; }).join('') + '</span>' : ''; }

/* who else is busy that day: on leave, on another trip, or dispatched to another event */
function busyOn(u, d, exceptEv){
  var s = statusOn(u, d); if (s && s.kind !== 'to') return { why: s.label || 'Out', hard: true };
  if (s && s.kind === 'to' && !(exceptEv && s.ref && s.ref.eventId === exceptEv)) return { why: 'Travel: ' + s.label, hard: true };
  var ask = S.entries.filter(function(x){ return x.username === u && x.type === 'USE' && x.status === 'Pending' && !x._del && x.date === d; })[0];
  if (ask) return { why: 'Asked for a day off', hard: true };
  var other = (S.events || []).filter(function(e){ return e.id !== exceptEv && e.status !== 'Cancelled' && e.date <= d && (e.dateTo || e.date) >= d && evMine(e, u, d); })[0];
  return other ? { why: 'Also on: ' + other.title, hard: false } : null;
}
/* busy over the whole event: out on every day = busy; out on some days = a note naming the days */
function busyRange(u, e){
  var ds = evDays(e); if (ds.length < 2) return busyOn(u, e.date, e.id);
  var hits = ds.map(function(d){ return busyOn(u, d, e.id); }), hard = hits.filter(function(b){ return b && b.hard; }).length;
  if (hard === ds.length) return hits[0];
  var some = ds.filter(function(d, i){ return hits[i]; }); if (!some.length) return null;
  return { why: hits[ds.indexOf(some[0])].why + ' (' + some.map(function(d){ return fDate(d, { weekday: 'short', day: 'numeric' }); }).join(', ') + ')', hard: false };
}
/* recent workload: trips and dispatch orders in the last 30 days and the next 14, and the last one before today.
   Used to give others a turn instead of sending the same people every time. */
function loadMap(){
  var from = addDays(today(), -30), to = addDays(today(), 14), td = today(), m = {};
  var add = function(u, d1, d2){ var x = m[u] || (m[u] = { n: 0, last: '' }); x.n++; if (d1 <= td){ var l = d2 < td ? d2 : td; if (l > x.last) x.last = l; } };
  (S.travelOrders || []).forEach(function(t){ if (t.status === 'Cancelled' || t._del || isOffsetTO(t) || t.dateTo < from || t.dateFrom > to) return; (t.usernames || []).forEach(function(u){ add(u, t.dateFrom, t.dateTo); }); });
  (S.events || []).forEach(function(e){ if (e.status === 'Cancelled' || evKind(e) !== 'tasking' || (e.dateTo || e.date) < from || e.date > to) return; (e.assigned || []).forEach(function(u){ add(u, e.date, e.dateTo || e.date); }); });
  return m;
}
function loadText(l){ l = l || { n: 0, last: '' }; return l.n ? l.n + (l.n === 1 ? ' trip' : ' trips') + ' lately' + (l.last ? ' · last ' + fDate(l.last, { month: 'short', day: 'numeric' }) : '') : 'No trips lately'; }
/* 2 to 5 people: first someone for each skill the event needs, then others with fewer recent trips */
function fairPicks(e, LM){
  LM = LM || loadMap();
  var needs = (e.needs || []).filter(function(n){ return NEED_SKILL[n]; }), want = Math.max(2, Math.min(5, needs.length + 1));
  var L = function(u){ return LM[u.username] || { n: 0, last: '' }; };
  var fair = function(a, b){ return L(a).n - L(b).n || (L(a).last || '0') .localeCompare(L(b).last || '0') || byDiv(a, b); };
  var pool = S.users.filter(function(u){ if (!u.active || u.role === 'admin') return false; var b = busyRange(u.username, e); return !(b && b.hard); });
  var picked = [], why = {};
  needs.forEach(function(n){ var sk = NEED_SKILL[n];
    var c = pool.filter(function(u){ return picked.indexOf(u) < 0 && skillsOf(u).some(function(x){ return sk.indexOf(x) >= 0; }); }).sort(fair)[0];
    if (c){ picked.push(c); why[c.username] = n.replace(/ Documentation$/, '').replace(/^News and /, ''); } });
  var wantSk = []; needs.forEach(function(n){ wantSk = wantSk.concat(NEED_SKILL[n]); });
  var rest = pool.filter(function(u){ return picked.indexOf(u) < 0; }).sort(function(a, b){
    var sa = skillsOf(a).some(function(x){ return wantSk.indexOf(x) >= 0; }) ? 0 : 1, sb = skillsOf(b).some(function(x){ return wantSk.indexOf(x) >= 0; }) ? 0 : 1;
    return sa - sb || fair(a, b); });
  while (picked.length < want && rest.length) picked.push(rest.shift());
  return picked.map(function(u){ return { u: u, why: why[u.username] || '', load: L(u) }; });
}
/* people for each thing the event needs, free first, then whoever went out least lately */
function suggestFor(e){
  var out = [], d = e.date, LM = loadMap();
  (e.needs || []).forEach(function(n){
    var sk = NEED_SKILL[n]; if (!sk) return;
    var ppl = S.users.filter(function(u){ return u.active && skillsOf(u).some(function(x){ return sk.indexOf(x) >= 0; }); })
      .map(function(u){ return { u: u, busy: busyRange(u.username, e) }; })
      .sort(function(a, b){ return (a.busy ? (a.busy.hard ? 2 : 1) : 0) - (b.busy ? (b.busy.hard ? 2 : 1) : 0) || ((LM[a.u.username] || {}).n || 0) - ((LM[b.u.username] || {}).n || 0) || byDiv(a.u, b.u) || (a.u.name < b.u.name ? -1 : 1); });
    out.push({ need: n, skills: sk, people: ppl });
  });
  return out;
}

/* ---------- dispatch order: suggested people first, by what the event needs ---------- */
(function(){
  var AM = assignModal;
  assignModal = function(id){
    AM(id);
    var e = S.events.filter(function(x){ return x.id === id; })[0], f = document.querySelector('#modal form[data-form="assignEvent"]'); if (!e || !f) return;
    var cur = e.assigned || [];
    // every person's box shows their skills and whether they are free
    f.querySelectorAll('input[name=user]').forEach(function(cb){
      var lab = cb.closest('label'), u = userOf(cb.value), b = busyRange(cb.value, e), sp = lab && lab.querySelector('span');
      if (!sp) return;
      sp.innerHTML = '<span class="as-who">' + avatarHtml(u || { username: cb.value, name: cb.value }, 30) + '<b title="' + esc(u ? u.name : cb.value) + '">' + esc(u ? shortName(u) : cb.value) + '</b></span>' + (b ? ' <small class="hint' + (b.hard ? ' busy' : '') + '">' + esc(b.why) + '</small>' : '') + skillChips(u);
      if (b && b.hard) lab.classList.add('is-busy');
    });
    var sug = suggestFor(e), pb = f.querySelector('.panel-b') || f, sb = f.querySelector('.sumbox');
    var LM = loadMap(), fp = fairPicks(e, LM);
    var html = fp.length ? '<div class="dsec">Suggested · giving others a turn</div><p class="hint" style="margin:0 0 8px">Covers what the event needs, favouring people with fewer trips in the last 30 days.</p>' +
      '<div class="sugppl fairppl">' + fp.map(function(p){ var on = cur.indexOf(p.u.username) >= 0;
        return '<button type="button" class="sugp' + (on ? ' on' : '') + '" data-act="sugPick" data-u="' + esc(p.u.username) + '" aria-pressed="' + on + '">' + (on ? ic('check') : ic('plus')) + avatarHtml(p.u, 26) + '<span title="' + esc(p.u.name) + '">' + esc(shortName(p.u)) + '<small>' + (p.why ? esc(p.why) + ' · ' : '') + esc(loadText(p.load)) + '</small></span></button>'; }).join('') +
      '</div><div class="row-btns" style="margin:8px 0 4px"><button type="button" class="btn btn-sm btn-ghost" data-act="fairAll">' + ic('users') + 'Pick all ' + fp.length + '</button></div>' : '';
    if (sug.length){
      html += '<div class="dsec">Suggested for what is needed</div>' + sug.map(function(g){
        var list = g.people.length ? g.people.map(function(p){ var on = cur.indexOf(p.u.username) >= 0;
          return '<button type="button" class="sugp' + (on ? ' on' : '') + (p.busy && p.busy.hard ? ' busy' : '') + '" data-act="sugPick" data-u="' + esc(p.u.username) + '" aria-pressed="' + on + '">' + (on ? ic('check') : ic('plus')) + avatarHtml(p.u, 26) + '<span title="' + esc(p.u.name) + '">' + esc(shortName(p.u)) + (p.busy ? '<small>' + esc(p.busy.why) + '</small>' : '<small>Free</small>') + '</span></button>'; }).join('')
          : '<span class="hint">Nobody has the ' + esc(g.skills.join(' or ')) + ' skill yet. Add skills from <b>Staff skills</b>.</span>';
        return '<div class="sugrow"><b>' + esc(g.need) + '</b><div class="sugppl">' + list + '</div></div>'; }).join('');
    } else html += '<p class="hint" style="margin:8px 0 0">Tick what the event needs (Edit event) to get suggested people by skill.</p>';
    html += '<div class="row-btns" style="margin-top:8px">' + (canSkills() ? '<button type="button" class="btn btn-sm btn-ghost" data-act="skillsModal">' + ic('users') + 'Staff skills</button>' : '') +
      (inProd() ? '<button type="button" class="btn btn-sm btn-ghost" data-act="gearModal" data-id="' + esc(e.id) + '">' + ic('camera') + 'Equipment to bring</button>' : '') + '</div><div class="dsec dsec-row">Everyone, by division' + nameToggle() + '</div>' +
      '<input class="input as-q" id="asQ" type="search" placeholder="Search name, skill or division" aria-label="Search people" autocomplete="off"><p class="hint as-none" hidden style="margin:8px 0 0">No one matches.</p>';
    var box = document.createElement('div'); box.innerHTML = html;
    if (sb && sb.nextSibling) pb.insertBefore(box, sb.nextSibling); else pb.insertBefore(box, pb.firstChild);
    // each person in the full list also shows their recent trips
    f.querySelectorAll('input[name=user]').forEach(function(cb){ var sp = cb.closest('label') && cb.closest('label').querySelector('span'); if (!sp) return;
      var u = userOf(cb.value), dv = u && S.divisions.filter(function(x){ return x.id === u.division; })[0];
      cb.closest('label').dataset.q = [u ? u.name : cb.value, skillsOf(u).join(' '), dv ? (dv.short || '') + ' ' + dv.name : ''].join(' ').toLowerCase();
      sp.insertAdjacentHTML('beforeend', '<small class="hint as-load">' + esc(loadText(LM[cb.value])) + '</small>'); });
  };
})();
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="sugPick"]'); if (!t) return;
  var cb = document.querySelector('#modal input[name=user][value="' + t.dataset.u + '"]'); if (!cb) return;
  cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelectorAll('#modal [data-act="sugPick"][data-u="' + t.dataset.u + '"]').forEach(function(b){ b.classList.toggle('on', cb.checked); b.setAttribute('aria-pressed', String(cb.checked)); b.querySelector('svg').outerHTML = ic(cb.checked ? 'check' : 'plus'); });
});

document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="fairAll"]'); if (!t) return;
  document.querySelectorAll('#modal .fairppl [data-act="sugPick"]').forEach(function(b){ if (b.getAttribute('aria-pressed') !== 'true') b.click(); }); });
document.addEventListener('input', function(ev){ if (ev.target.id !== 'asQ') return;
  var q = ev.target.value.trim().toLowerCase(), f = ev.target.closest('form'), any = false;
  f.querySelectorAll('label.check').forEach(function(l){ var cb = l.querySelector('input[name=user]'); if (!cb || l.dataset.q == null) return;
    var hit = !q || q.split(/\s+/).every(function(w){ return l.dataset.q.indexOf(w) >= 0; }); l.hidden = !hit && !cb.checked; if (hit) any = true; });
  // hide a division heading when nobody under it matches
  [].forEach.call(f.querySelectorAll('.dsec'), function(h){ var g = h.nextElementSibling;
    if (g && g.querySelector && g.querySelector('input[name=user]')){ var vis = [].some.call(g.querySelectorAll('label.check'), function(l){ return !l.hidden; }); h.hidden = !vis; g.hidden = !vis; } });
  var none = f.querySelector('.as-none'); if (none) none.hidden = any || !q;
});

/* ---------- multi-day events: which days each person goes ---------- */
function asDaysRender(f, e){
  var box = f.querySelector('#asDays'); if (!box) return;
  var keep = {}; box.querySelectorAll('input[data-ad]').forEach(function(i){ (keep[i.dataset.ad] = keep[i.dataset.ad] || {})[i.value] = i.checked; });
  var ds = evDays(e), who = [].map.call(f.querySelectorAll('input[name=user]:checked'), function(x){ return x.value; });
  if (!who.length){ box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<div class="dsec">Which days?</div><p class="hint" style="margin:0 0 8px">Untick the days a person does not go. Days they are out are left off.</p>' + who.map(function(u){
    var x = userOf(u), had = e.assignDays && e.assignDays[u];
    return '<div class="ad-row"><b>' + esc(x ? x.name : u) + '</b><div class="ad-days">' + ds.map(function(d){
      var b = busyOn(u, d, e.id), on = keep[u] && keep[u][d] != null ? keep[u][d] : had && had.length ? had.indexOf(d) >= 0 : (e.assigned || []).indexOf(u) >= 0 ? true : !(b && b.hard);
      return '<label class="ad-day' + (b && b.hard ? ' busy' : '') + '"' + (b ? ' title="' + esc(b.why) + '"' : '') + '><input type="checkbox" data-ad="' + esc(u) + '" value="' + d + '"' + (on ? ' checked' : '') + '><span>' + esc(fDate(d, { weekday: 'short', day: 'numeric' })) + (b ? '<small>' + esc(b.hard ? b.why : 'Also on another event') + '</small>' : '') + '</span></label>';
    }).join('') + '</div></div>';
  }).join('');
}
(function(){
  var AM2 = assignModal;
  assignModal = function(id){
    AM2(id);
    var e = S.events.filter(function(x){ return x.id === id; })[0], f = document.querySelector('#modal form[data-form="assignEvent"]'); if (!e || !f || evDays(e).length < 2) return;
    var pb = f.querySelector('.panel-b') || f, note = pb.querySelector('.info-note'), box = document.createElement('div'); box.id = 'asDays'; box.className = 'asdays';
    if (note) pb.insertBefore(box, note); else pb.appendChild(box);
    asDaysRender(f, e);
  };
})();
document.addEventListener('change', function(ev){
  if (ev.target.name !== 'user') return; var f = ev.target.closest('form[data-form="assignEvent"]'); if (!f) return;
  var e = S.events.filter(function(x){ return x.id === M.id; })[0]; if (e && evDays(e).length > 1) asDaysRender(f, e);
});

/* ---------- travel order made from an event: suggested names to add ---------- */
(function(){
  var TM = toModal;
  toModal = function(id, pre){
    TM(id, pre);
    var evId = (pre && pre.eventId) || (id && (toOf(id) || {}).eventId), e = evId && S.events.filter(function(x){ return x.id === evId; })[0];
    var f = document.querySelector('#modal form[data-form="saveTO"]'); if (!e || !f) return;
    var sug = suggestFor(e), LM = loadMap(), fp = fairPicks(e, LM); if (!sug.length && !fp.length) return;
    var pick = f.querySelector('#toChips'); pick = pick && pick.closest('.field'); if (!pick) return;
    var have = function(u){ return TO.names.indexOf(u.name.toUpperCase()) >= 0; };
    var div = document.createElement('div'); div.className = 'tosug';
    // giving others a turn: people who fit and have had fewer trips lately
    div.innerHTML = (fp.length ? '<span class="label" style="margin:0 0 4px">Suggested · giving others a turn</span><p class="hint" style="margin:0 0 8px">Covers what the event needs, favouring people with fewer trips in the last 30 days.</p>' +
      '<div class="sugppl fairto">' + fp.map(function(p){ var on = have(p.u); return '<button type="button" class="sugp' + (on ? ' on' : '') + '" data-act="toSug" data-n="' + esc(p.u.name.toUpperCase()) + '">' + ic(on ? 'check' : 'plus') + avatarHtml(p.u, 26) + '<span title="' + esc(p.u.name) + '">' + esc(shortName(p.u)) + '<small>' + (p.why ? esc(p.why) + ' · ' : '') + esc(loadText(p.load)) + '</small></span></button>'; }).join('') +
      '</div><div class="row-btns" style="margin:8px 0 12px"><button type="button" class="btn btn-sm btn-ghost" data-act="toFairAll">' + ic('users') + 'Add all ' + fp.length + '</button></div>' : '') +
      (sug.length ? '<span class="label" style="margin:0 0 6px">Suggested for what is needed</span>' : '') + sug.map(function(g){
      return '<div class="sugrow"><b>' + esc(g.need) + '</b><div class="sugppl">' + (g.people.length ? g.people.map(function(p){ return '<button type="button" class="sugp' + (p.busy && p.busy.hard ? ' busy' : '') + '" data-act="toSug" data-n="' + esc(p.u.name.toUpperCase()) + '">' + ic('plus') + avatarHtml(p.u, 26) + '<span title="' + esc(p.u.name) + '">' + esc(shortName(p.u)) + '<small>' + esc(p.busy ? p.busy.why : 'Free') + ' · ' + esc(loadText(LM[p.u.username])) + '</small></span></button>'; }).join('') : '<span class="hint">Nobody has this skill yet.</span>') + '</div></div>'; }).join('');
    pick.appendChild(div);
  };
})();
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="toSug"]'); if (!t) return; addName(t.dataset.n);
  // the same person may appear in several suggestion rows: mark them all
  document.querySelectorAll('#modal [data-act="toSug"][data-n="' + t.dataset.n.replace(/"/g, '') + '"]').forEach(function(b){ b.classList.add('on'); var sv = b.querySelector('svg'); if (sv) sv.outerHTML = ic('check'); }); });
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="toFairAll"]'); if (!t) return;
  document.querySelectorAll('#modal .fairto [data-act="toSug"]:not(.on)').forEach(function(b){ b.click(); }); });

/* ---------- staff skills (admins and division leaders) ---------- */
function skillsModal(){
  var staff = S.users.filter(function(u){ return u.active; }).sort(byDiv), last = null;
  modal('Staff skills', '<p class="hint" style="margin:0 0 8px">Tick what each person can do. Events then suggest free people with the skill they need. Saves as you tick.</p>' +
    staff.map(function(u){
      var d = divOf(u.division), head = u.division !== last ? '<div class="dsec">' + esc(d ? d.name : 'No division') + '</div>' : ''; last = u.division;
      return head + '<fieldset class="skrow"><legend>' + esc(u.name) + '</legend><div class="skgrid">' + SKILLS.map(function(k){ return '<label class="skopt"><input type="checkbox" data-skill-u="' + esc(u.username) + '" value="' + esc(k) + '"' + (skillsOf(u).indexOf(k) >= 0 ? ' checked' : '') + '><span>' + esc(k) + '</span></label>'; }).join('') + '</div></fieldset>';
    }).join(''), '<button type="button" class="btn btn-primary" data-act="close">Done</button>');
}
document.addEventListener('change', function(ev){
  var u = ev.target.dataset && ev.target.dataset.skillU; if (!u) return;
  var list = Array.prototype.slice.call(document.querySelectorAll('#modal input[data-skill-u="' + u + '"]:checked')).map(function(x){ return x.value; });
  var x = userOf(u); if (x) x.skills = list;               // show it right away
  call('setSkills', { username: u, skills: list }).catch(function(e){ toast(e.message); });
});
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="skillsModal"]'); if (t) skillsModal(); });
/* skills on a person's page (admin) */
(function(){
  var PM = personModal;
  personModal = function(username){
    PM(username);
    var u = userOf(username), anchor = document.querySelector('#modal #ppos'); if (!u || !canSkills()) return;
    var box = document.createElement('div'); box.className = 'field';
    box.innerHTML = '<span class="label">Skills</span><div class="skgrid">' + SKILLS.map(function(k){ return '<label class="skopt"><input type="checkbox" data-skill-u="' + esc(u.username) + '" value="' + esc(k) + '"' + (skillsOf(u).indexOf(k) >= 0 ? ' checked' : '') + '><span>' + esc(k) + '</span></label>'; }).join('') + '</div>';
    var at = anchor ? anchor.closest('.field') : document.querySelector('#modal .panel-b .label');
    if (at && at.parentNode) at.parentNode.insertBefore(box, at.nextSibling); else (document.querySelector('#modal .panel-b') || document.body).appendChild(box);
  };
})();

/* ---------- equipment to bring (Social Media and Production) ---------- */
function gearModal(evId){
  var e = S.events.filter(function(x){ return x.id === evId; })[0]; if (!e) return;
  var out = S.inventory.filter(function(i){ return i.eventId === e.id && i.status === 'Out'; }), avail = S.inventory.filter(function(i){ return i.status === 'Available'; }).sort(function(a, b){ return a.name < b.name ? -1 : 1; });
  var ppl = evPeople(e).filter(function(p){ return p.u; }), opts = (ppl.length ? ppl.map(function(p){ return userOf(p.u); }) : S.users.filter(function(u){ return u.active; })).filter(Boolean);
  M = { gear: e.id };
  modal('Equipment to bring', '<div class="sumbox"><b>' + esc(e.title) + '</b><span>' + esc(evShort(e)) + (e.venue ? ' · ' + esc(e.venue) : '') + '</span></div>' +
    (out.length ? '<div class="dsec">Already going</div><ul class="list">' + out.map(function(i){ return '<li class="row"><span class="mark act">' + ic('camera') + '</span><div class="body"><div class="t">' + esc(i.name) + '</div><div class="m">With ' + esc(userName(i.holder)) + (i.dueBack ? ' · back by ' + fDate(i.dueBack) : '') + '</div></div><button type="button" class="btn btn-sm btn-ghost" data-act="gearBack" data-id="' + esc(i.id) + '">Returned</button></li>'; }).join('') + '</ul>' : '') +
    '<div class="dsec">Available now</div>' + (avail.length ? '<div class="skgrid">' + avail.map(function(i){ return '<label class="skopt"><input type="checkbox" name="gear" value="' + esc(i.id) + '"><span>' + esc(i.name) + (i.tag ? ' <small class="hint">' + esc(i.tag) + '</small>' : '') + '</span></label>'; }).join('') + '</div>' : '<p class="hint" style="margin:0">Nothing is available right now.</p>') +
    '<div class="two" style="margin-top:12px"><div class="field"><label for="ggw">Who brings it</label><select class="input" id="ggw" name="holder">' + opts.map(function(u){ return '<option value="' + esc(u.username) + '">' + esc(u.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="ggd">Due back</label><input class="input" id="ggd" name="dueBack" type="date" value="' + addDays(e.dateTo || e.date, 1) + '"></div></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Close</button>' + (avail.length ? '<button type="button" class="btn btn-primary" data-act="gearGo">' + ic('check') + 'Check out ticked items</button>' : ''));
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="gearModal"],[data-act="gearGo"],[data-act="gearBack"]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'gearModal') return gearModal(t.dataset.id);
  if (a === 'gearBack'){ var evb = M.gear; t.disabled = true; return act('checkinItem', { id: t.dataset.id }, 'Marked as returned').then(function(){ gearModal(evb); }).catch(function(e){ toast(e.message); t.disabled = false; }); }
  var ids = Array.prototype.map.call(document.querySelectorAll('#modal input[name=gear]:checked'), function(x){ return x.value; });
  if (!ids.length) return toast('Tick at least one item.');
  var holder = document.getElementById('ggw').value, due = document.getElementById('ggd').value, evId = M.gear; t.disabled = true;
  ids.reduce(function(p, id){ return p.then(function(){ return call('checkoutItem', { id: id, holder: holder, dueBack: due, eventId: evId, note: '' }); }); }, Promise.resolve())
    .then(function(){ return refresh(); }).then(function(){ toast(ids.length + ' item' + (ids.length === 1 ? '' : 's') + ' checked out to ' + firstName(holder)); gearModal(evId); })
    .catch(function(e){ toast(e.message); t.disabled = false; });
});
/* event card: who has which gear, and a button for it */
(function(){
  var EC = evCard;
  evCard = function(e){
    var h = EC(e);
    if (inProd()){
      var gear = S.inventory.filter(function(i){ return i.eventId === e.id && i.status === 'Out'; });
      if (gear.length) h = h.replace(/<dt>Gear<\/dt><dd>[^<]*<\/dd>/, '<dt>Gear</dt><dd>' + gear.map(function(i){ return esc(i.name) + ' <span class="hint">(' + esc(firstName(i.holder)) + ')</span>'; }).join(', ') + '</dd>');
      if (e.status !== 'Cancelled') h = h.replace('<div class="acts-row">', '<div class="acts-row"><button type="button" class="btn btn-sm btn-ghost" data-act="gearModal" data-id="' + esc(e.id) + '">' + ic('camera') + 'Equipment</button>');
    }
    return h;
  };
})();

/* ---------- calendar: Mine / My division / Everyone (not locked, just a default) ---------- */
function calScope(){ return S.calScope || (isAdmin() || !S.me.division ? 'all' : 'div'); }
function inMyDiv(u){ var x = userOf(u); return !!x && !!S.me.division && x.division === S.me.division; }
(function(){
  calItems = function(){
    var me = S.me.username, adm = isAdmin(), items = [], live = {}, sc = calScope();
    var keep = function(us, isEvent, e){ if (sc === 'all') return true; if (sc === 'mine') return us.indexOf(me) >= 0;
      return us.some(inMyDiv) || us.indexOf(me) >= 0 || (isEvent && canSched() && evState(e) === 'need') || (isEvent && e.createdBy && inMyDiv(e.createdBy)); };
    S.events.forEach(function(e){ if (e.status === 'Cancelled') return; live[e.id] = 1; var us = evPeople(e).map(function(p){ return p.u; }).filter(Boolean); if (!keep(us, true, e)) return; var st = evState(e); items.push({ s: e.date, e: e.dateTo, gap: evGaps(e), cls: 'b-' + st, t: e.title, un: e.status === 'Pending', mine: us.indexOf(me) >= 0, pr: st === 'need' ? 0 : st === 'wait' ? 1 : 2 }); });
    activeTOs().forEach(function(t){ if ((t.eventId && live[t.eventId]) || isOffsetTO(t)) return; var us = t.usernames || []; if (!keep(us)) return; items.push({ s: t.dateFrom, e: t.dateTo, cls: 'b-to', t: 'TO · ' + t.event, mine: us.indexOf(me) >= 0, pr: 3 }); });
    S.leaves.forEach(function(l){ if (/^ADJ/.test(l.type) || !keep([l.username])) return; var mm = l.username === me; items.push({ s: l.dateFrom, e: l.dateTo, cls: 'b-lv', t: (adm && !mm ? firstName(l.username) + ' · ' : '') + leaveName(l.type), mine: mm, pr: 4 }); });
    S.entries.forEach(function(e){ if (e.type !== 'USE' || e.status === 'Rejected' || !keep([e.username])) return; var mm = e.username === me; items.push({ s: e.date, e: e.date, cls: 'b-lv', t: (adm && !mm ? firstName(e.username) + ' · ' : '') + 'Day off', un: e.status === 'Pending', mine: mm, pr: 4 }); });
    if (!adm) S.board.forEach(function(b){ if (b.username === me || !keep([b.username])) return; items.push({ s: b.from, e: b.to, cls: 'b-lv', t: firstName(b.username) + ' · ' + (b.kind === 'leave' ? 'On leave' : 'Day off'), pr: 4 }); });
    return items;
  };
  var VC = viewCalendar;
  viewCalendar = function(){
    var v = VC(), sc = calScope();
    var seg = '<div class="tabs calscope" role="group" aria-label="Show on the calendar">' + [['mine', 'Mine'], ['div', 'My division'], ['all', 'Everyone']].filter(function(o){ return o[0] !== 'div' || S.me.division; })
      .map(function(o){ return '<button type="button" data-act="calScope" data-s="' + o[0] + '" aria-pressed="' + (sc === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    v.body = v.body.replace(/<label class="keep" style="font-size:13.5px"><input type="checkbox" id="calMine"[^>]*>Only mine<\/label>/, seg);
    if (canSkills()) v.actions = (v.actions || '') .replace('<button type="button" class="btn btn-sun" data-act="evNew">', '<button type="button" class="btn btn-glass" data-act="skillsModal">' + ic('users') + 'Staff skills</button><button type="button" class="btn btn-sun" data-act="evNew">');
    return v;
  };
})();
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="calScope"]'); if (!t) return; S.calScope = t.dataset.s; render(); });

(function(){
  var st = document.createElement('style');
  st.textContent = '.skchips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.skc{font-size:11.5px;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)}' +
    '.is-busy{opacity:.7}.hint.busy{color:var(--red)}' +
    '.sugrow{display:grid;gap:6px;margin:8px 0}.sugrow>b{font-size:13px}.sugppl{display:flex;flex-wrap:wrap;gap:6px}' +
    '.sugp{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);border-radius:12px;padding:6px 10px;cursor:pointer;font:inherit;text-align:left;min-height:40px;transition:background .15s,transform .12s var(--ease-out,ease-out)}' +
    '.sugp span{display:flex;flex-direction:column;line-height:1.2;font-weight:600;font-size:13.5px}.sugp small{font-weight:500;font-size:11.5px;color:var(--muted)}.sugp svg{width:16px;height:16px;flex:none}' +
    '.sugp.on{background:var(--brand-soft);border-color:var(--brand);color:var(--brand-strong)}.sugp.busy small{color:var(--red)}.sugp:active{transform:scale(.97)}' +
    '.tosug{margin-top:10px;padding:10px 12px;border:1px dashed var(--line-strong);border-radius:12px}' +
    '.skrow{border:0;padding:0;margin:0 0 10px}.skrow legend{font-weight:600;font-size:14px;margin-bottom:6px}.skgrid{display:flex;flex-wrap:wrap;gap:6px}' +
    '.skopt{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;cursor:pointer;font-size:13.5px;min-height:36px}.skopt:has(input:checked){background:var(--brand-soft);border-color:var(--brand);color:var(--brand-strong);font-weight:600}' +
    '.calscope{flex:none}@media (pointer:coarse){.sugp,.skopt{min-height:44px}}';
  document.head.appendChild(st);
})();

/* =====================================================================
   v47: inventory as kits (Camera + Lens + SD card + Battery + others),
   how many are left on any date, and which dates need equipment
   ===================================================================== */
INV_CATS = ['Camera', 'Lens', 'SD card', 'Battery', 'Drone', 'Tripod and Support', 'Audio', 'Lighting', 'Computer', 'Accessory', 'Other'];
var KIT = ['Camera', 'Lens', 'SD card', 'Battery'];
var CAT_PLURAL = { 'Camera': 'Cameras', 'Lens': 'Lenses', 'SD card': 'SD cards', 'Battery': 'Batteries', 'Drone': 'Drones', 'Tripod and Support': 'Tripods', 'Audio': 'Audio', 'Lighting': 'Lights', 'Computer': 'Computers', 'Accessory': 'Accessories', 'Other': 'Other' };
var GEAR_NEEDS = ['Photo Documentation', 'Video Documentation', 'Livestreaming'];
ICONS.lens = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v4M18.9 8l-3.5 2M18.9 16l-3.5-2"/>';
ICONS.sd = '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M10 3v4M13 3v4M16 5v2"/>';
ICONS.battery = '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4"/><path d="M7 10v4M11 10v4"/>';
ICONS.drone = '<circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M8 8l2.5 2.5M16 8l-2.5 2.5M8 16l2.5-2.5M16 16l-2.5-2.5"/><rect x="10" y="10" width="4" height="4" rx="1"/>';
ICONS.tripod = '<path d="M12 4v6M12 10l-6 10M12 10l6 10M12 10v10"/><rect x="9" y="3" width="6" height="3" rx="1"/>';
ICONS.mic = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>';
ICONS.bulb = '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>';
ICONS.laptop = '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>';
var CAT_IC = { 'Camera': 'camera', 'Lens': 'lens', 'SD card': 'sd', 'Battery': 'battery', 'Drone': 'drone', 'Tripod and Support': 'tripod', 'Audio': 'mic', 'Lighting': 'bulb', 'Computer': 'laptop', 'Accessory': 'plus', 'Other': 'plus' };
function catOf(i){ var c = i.category || 'Other'; if (c === 'Storage and Cards') return 'SD card'; return INV_CATS.indexOf(c) >= 0 ? c : 'Other'; }

/* is this item free on a date? (out and not due back yet, broken, or planned for another event that day) */
function gearPlannedOn(itemId, d, exceptEv){
  return (S.events || []).filter(function(e){ return e.id !== exceptEv && e.status !== 'Cancelled' && (e.gear || []).indexOf(itemId) >= 0 && e.date <= d && (e.dateTo || e.date) >= d; })[0] || null;
}
function gearFree(i, d, exceptEv){
  if (i.status === 'Repair' || i.status === 'Missing') return false;
  if (i.status === 'Out'){ if (!(exceptEv && i.eventId === exceptEv) && (!i.dueBack || i.dueBack >= d)) return false; }
  return !gearPlannedOn(i.id, d, exceptEv);
}
function gearFreeRange(i, d1, d2, exceptEv){ for (var d = d1; d <= (d2 || d1); d = addDays(d, 1)){ if (!gearFree(i, d, exceptEv)) return false; if (d > addDays(d1, 31)) break; } return true; }
function stockOn(d){
  var o = {}; INV_CATS.forEach(function(c){ o[c] = { total: 0, free: 0 }; });
  S.inventory.forEach(function(i){ var c = catOf(i); o[c].total++; if (gearFree(i, d)) o[c].free++; });
  return o;
}
function kitText(ids){
  var by = {}; ids.forEach(function(id){ var i = S.inventory.filter(function(x){ return x.id === id; })[0]; if (!i) return; var c = catOf(i); by[c] = (by[c] || 0) + 1; });
  return INV_CATS.filter(function(c){ return by[c]; }).map(function(c){ return (by[c] > 1 ? by[c] + ' ' + CAT_PLURAL[c].toLowerCase() : c); }).join(' + ');
}
function needsGear(e){ return (e.needs || []).some(function(n){ return GEAR_NEEDS.indexOf(n) >= 0; }); }

/* ---------- the Inventory page ---------- */
viewInventory = function(){
  var F = S.invF || 'all', C = S.invCat || '', Q = (S.invQ || '').toLowerCase(), td = today(), D = S.invDay || td;
  var all = S.inventory.slice().sort(function(a, b){ return INV_CATS.indexOf(catOf(a)) - INV_CATS.indexOf(catOf(b)) || (a.name < b.name ? -1 : 1); });
  var n = { Available: 0, Out: 0, bad: 0, over: 0 }; all.forEach(function(i){ if (i.status === 'Available') n.Available++; else if (i.status === 'Out') n.Out++; else n.bad++; if (invOverdue(i)) n.over++; });
  var tiles = '<div class="tiles cal4" style="margin-bottom:16px">' + [
    ['all', 'Equipment', 'camera', String(all.length), 'Items on the list', ''],
    ['Available', 'Available now', 'check', String(n.Available), 'On the shelf', 'ok'],
    ['Out', 'Checked out', 'clock', String(n.Out), n.over ? n.over + ' overdue' : 'None overdue', n.over ? 'warn' : ''],
    ['attention', 'Needs attention', 'flag', String(n.bad + n.over), 'Repair, missing or overdue', n.bad + n.over ? 'bad' : '']
  ].map(function(x){ return tile(x[1], x[3], x[4], x[5], x[2], 'data-act="invF" data-f="' + x[0] + '" aria-pressed="' + (F === x[0]) + '"'); }).join('') + '</div>';

  // The counts and filters live on the equipment list (tabs) and problems show inside "What is free",
  // so there is no separate row of summary tiles.
  var stTabs = '<div class="tabs" role="group" aria-label="Show equipment">' + [['all', 'All', all.length], ['Available', 'Available', n.Available], ['Out', 'Checked out', n.Out], ['attention', 'Needs attention', n.bad + n.over]]
    .map(function(x){ return '<button type="button" data-act="invF" data-f="' + x[0] + '" aria-pressed="' + (F === x[0]) + '">' + x[1] + ' · ' + x[2] + '</button>'; }).join('') + '</div>';
  var probs = [n.over ? n.over + ' overdue' : '', n.bad ? n.bad + ' in repair or missing' : ''].filter(Boolean).join(' · ');
  var alertNote = probs ? '<div class="warn-note inv-alert">' + ic('flag') + '<span><b>Needs attention:</b> ' + probs + '</span><button type="button" class="btn btn-sm btn-ghost" data-act="invSheet" data-c="attention" aria-haspopup="dialog">Show</button></div>' : '';

  // the kit: Camera + Lens + SD card + Battery, how many of each are free on the chosen day
  var st = stockOn(D), kits = Math.min.apply(null, KIT.map(function(c){ return st[c].free; }));
  var card = function(c, big){ var x = st[c], pct = x.total ? Math.round(100 * x.free / x.total) : 0, low = x.total && x.free === 0;
    return '<button type="button" class="kcard' + (big ? ' big' : '') + (low ? ' low' : '') + '" data-act="invSheet" data-c="' + esc(c) + '" aria-haspopup="dialog">' +
      '<span class="kic">' + ic(CAT_IC[c] || 'camera') + '</span><span class="kname">' + esc(CAT_PLURAL[c]) + '</span>' +
      '<span class="knum"><b>' + x.free + '</b><small> of ' + x.total + ' free</small></span><span class="kbar" aria-hidden="true"><i style="width:' + pct + '%"></i></span></button>'; };
  var others = INV_CATS.filter(function(c){ return KIT.indexOf(c) < 0 && st[c].total; });
  var kitPanel = '<section class="panel kitpanel"><div class="panel-h"><h2>' + ic('camera') + 'What is free</h2><div class="row-btns"><button type="button" class="btn btn-sm btn-ghost" data-act="invSheet" data-c="all" aria-haspopup="dialog">' + ic('list') + 'All equipment</button><label class="hint" for="invDay" style="margin:0">On</label><input class="input" type="date" id="invDay" value="' + D + '" style="width:auto;margin:0">' + (D !== td ? '<button type="button" class="btn btn-sm btn-ghost" data-act="invToday">Today</button>' : '') + '</div></div>' +
    '<div class="kitrow">' + KIT.map(function(c, i){ return (i ? '<span class="kplus" aria-hidden="true">+</span>' : '') + card(c, true); }).join('') + '</div>' +
    '<div class="kitsum"><b>' + kits + '</b> full kit' + (kits === 1 ? '' : 's') + ' ready ' + (D === td ? 'today' : 'on ' + fDate(D, { weekday:'short', month:'short', day:'numeric' })) + ' <span class="hint">(camera + lens + SD card + battery)</span></div>' +
    (others.length ? '<div class="kitrow small"><span class="hint" style="align-self:center">Also</span>' + others.map(function(c){ return card(c, false); }).join('') + '</div>' : '') + '</section>';

  // which dates need equipment (next 3 weeks)
  var lim = addDays(td, 21), ups = (S.events || []).filter(function(e){ return e.status !== 'Cancelled' && (e.dateTo || e.date) >= td && e.date <= lim && (needsGear(e) || (e.gear || []).length); }).sort(evSort);
  var byDay = {}; ups.forEach(function(e){ var k = e.date < td ? td : e.date; (byDay[k] = byDay[k] || []).push(e); });
  // the next 4 dates show; the rest open with "Show N more dates"
  var needDays = Object.keys(byDay).sort(), needMore = needDays.length - 4;
  var needs = needDays.map(function(d, di){
    var evs = byDay[d], s2 = stockOn(d), want = evs.filter(function(e){ return needsGear(e) && !(e.gear || []).length; }).length, short = want > 0 && s2.Camera.free < want;
    return '<div class="nday' + (di >= 4 && !S.needAll ? ' shut' : '') + '"><div class="ndate' + (short ? ' bad' : '') + '"><b>' + fDate(d, { day:'numeric' }) + '</b><span>' + fDate(d, { month:'short' }) + '</span><small>' + fDate(d, { weekday:'short' }) + '</small></div><div class="nlist">' +
      evs.map(function(e){ var g = e.gear || [], who = e.gearHolder && userOf(e.gearHolder);
        return '<div class="nev"><div class="grow"><b><button type="button" class="lnk" data-act="evPick" data-id="' + esc(e.id) + '">' + esc(e.title) + '</button></b><div class="hint">' + esc((e.needs || []).filter(function(x){ return GEAR_NEEDS.indexOf(x) >= 0; }).join(', ') || 'Equipment planned') + (e.venue ? ' · ' + esc(e.venue) : '') + '</div>' +
          (g.length ? '<div class="kitline">' + ic('check') + esc(kitText(g)) + (who ? ' <span class="hint">· ' + esc(who.name) + '</span>' : '') + '</div>' : '<div class="kitline none">' + ic('flag') + 'No equipment planned yet</div>') + '</div>' +
          '<button type="button" class="btn btn-sm ' + (g.length ? 'btn-ghost' : 'btn-primary') + '" data-act="gearModal" data-id="' + esc(e.id) + '">' + (g.length ? 'Change' : 'Plan kit') + '</button></div>'; }).join('') +
      '<div class="hint nstock">' + s2.Camera.free + ' camera' + (s2.Camera.free === 1 ? '' : 's') + ' free that day' + (short ? ' · <b style="color:var(--red)">not enough for ' + want + ' event' + (want === 1 ? '' : 's') + '</b>' : '') + '</div></div></div>'; }).join('');
  if (needMore > 0) needs += '<div class="nmore"><button type="button" class="btn btn-sm btn-ghost" data-act="needAll" aria-expanded="' + !!S.needAll + '">' + ic(S.needAll ? 'minus' : 'plus') + (S.needAll ? 'Show fewer dates' : 'Show ' + needMore + ' more date' + (needMore === 1 ? '' : 's')) + '</button></div>';
  var needPanel = panel('Dates that need equipment', 'cal', needs ? '<div class="ndays">' + needs + '</div>' : empty('cal', 'Nothing coming up', 'Events in the next 3 weeks that need photo, video or livestream show here.'), '<span class="hint">Next 3 weeks</span>', '');

  // the list, grouped in kit order
  var list = all.filter(function(i){
    if (C && catOf(i) !== C) return false;
    if ((F === 'Available' || F === 'Out') && i.status !== F) return false;
    if (F === 'attention' && !(i.status === 'Repair' || i.status === 'Missing' || invOverdue(i))) return false;
    if (Q){ var u = i.holder && userOf(i.holder); if ((i.name + ' ' + catOf(i) + ' ' + (i.tag || '') + ' ' + (i.serial || '') + ' ' + (u ? u.name : '')).toLowerCase().indexOf(Q) < 0) return false; }
    return true; });
  var groups = INV_CATS.map(function(c){ var g = list.filter(function(i){ return catOf(i) === c; }); if (!g.length) return '';
    var fr = g.filter(function(i){ return gearFree(i, td); }).length;
    return '<li class="invgrp"><span class="kic">' + ic(CAT_IC[c] || 'camera') + '</span><b>' + esc(CAT_PLURAL[c]) + '</b><span class="hint">' + fr + ' of ' + g.length + ' free today</span></li>' + g.map(invRow).join(''); }).join('');
  var body = '<div class="mcbar"><input class="input" id="invQ" type="search" value="' + esc(S.invQ || '') + '" placeholder="Search name, tag, serial or person" aria-label="Search equipment" style="max-width:340px;margin:0">' + stTabs + (C ? '<button type="button" class="btn btn-sm btn-ghost" data-act="invCat" data-c="">' + ic('x') + 'Showing ' + esc(CAT_PLURAL[C]) + '</button>' : '') + '</div>' +
    (list.length ? '<ul style="list-style:none;margin:0;padding:0">' + groups + '</ul>' : empty('camera', all.length ? 'No equipment matches' : 'No equipment yet', all.length ? 'Try another filter or search.' : 'Add cameras first, then lenses, SD cards and batteries, then drones, tripods and the rest.', '<button type="button" class="btn btn-primary" data-act="invNew">' + ic('plus') + 'Add equipment</button>'));
  return { eyebrow: 'Production', title: 'Inventory', sub: 'What is free, what is out, and which dates need equipment.',
    actions: '<button type="button" class="btn btn-sun" data-act="invNew">' + ic('plus') + 'Add equipment</button>',
    // the equipment list lives in sheets now (tap a card, "All equipment" or the notice); the page keeps only an empty-state prompt
    body: kitPanel.replace(/<\/section>$/, alertNote + '</section>') + needPanel + (all.length ? '' : panel('Equipment', 'camera', empty('camera', 'No equipment yet', 'Add cameras first, then lenses, SD cards and batteries, then drones, tripods and the rest.', '<button type="button" class="btn btn-primary" data-act="invNew">' + ic('plus') + 'Add equipment</button>'), '', '')) };
};
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="invCat"],[data-act="invToday"]'); if (!t) return;
  if (t.dataset.act === 'invToday'){ S.invDay = ''; render(); return; }
  S.invCat = S.invCat === t.dataset.c ? '' : t.dataset.c; render();
  var l = document.querySelector('.invgrp'); if (l && S.invCat) l.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.addEventListener('change', function(ev){ if (ev.target.id === 'invDay'){ S.invDay = ev.target.value; render(); } });

/* ---------- plan a kit for an event: Camera + Lens + SD card + Battery + others ---------- */
gearModal = function(evId){
  var e = S.events.filter(function(x){ return x.id === evId; })[0]; if (!e) return;
  var d1 = e.date, d2 = e.dateTo || e.date, plan = (e.gear || []).slice(), out = S.inventory.filter(function(i){ return i.eventId === e.id && i.status === 'Out'; });
  var ppl = evPeople(e).filter(function(p){ return p.u; }).map(function(p){ return userOf(p.u); }).filter(Boolean), opts = ppl.length ? ppl : S.users.filter(function(u){ return u.active; });
  var holder = e.gearHolder || (ppl[0] && ppl[0].username) || S.me.username;
  if (!opts.some(function(u){ return u.username === holder; }) && userOf(holder)) opts = [userOf(holder)].concat(opts);
  M = { gear: e.id };
  var step = function(c, i){
    var items = S.inventory.filter(function(x){ return catOf(x) === c && (plan.indexOf(x.id) >= 0 || gearFreeRange(x, d1, d2, e.id)); });
    var busy = S.inventory.filter(function(x){ return catOf(x) === c && items.indexOf(x) < 0; }).length;
    if (!items.length && !busy && KIT.indexOf(c) < 0) return '';
    return '<div class="kstep"><div class="kstep-h"><span class="kn">' + (i < KIT.length ? i + 1 : '+') + '</span><span class="kic">' + ic(CAT_IC[c] || 'camera') + '</span><b>' + esc(c) + '</b><span class="hint">' + items.length + ' free' + (busy ? ' · ' + busy + ' busy' : '') + '</span></div>' +
      (items.length ? '<div class="kchips">' + items.map(function(x){ var on = plan.indexOf(x.id) >= 0; return '<label class="kchip"><input type="checkbox" name="gear" value="' + esc(x.id) + '"' + (on ? ' checked' : '') + '><span>' + esc(x.name) + (x.tag ? '<small>' + esc(x.tag) + '</small>' : '') + '</span></label>'; }).join('') + '</div>'
        : '<p class="hint" style="margin:4px 0 0">None free on ' + (d1 === d2 ? 'that day' : 'those days') + '.</p>') + '</div>';
  };
  var steps = KIT.map(step).join('<div class="kjoin" aria-hidden="true">+</div>') + '<div class="kjoin" aria-hidden="true">+</div><div class="dsec" style="margin-top:4px">Others</div>' + INV_CATS.filter(function(c){ return KIT.indexOf(c) < 0; }).map(function(c){ return step(c, 99); }).join('');
  var started = d1 <= today();
  modal('Equipment for this event', '<div class="sumbox"><b>' + esc(e.title) + '</b><span>' + esc(evShort(e)) + (e.venue ? ' · ' + esc(e.venue) : '') + '</span></div>' +
    '<div class="kformula" id="kformula" aria-live="polite"></div>' +
    (out.length ? '<div class="dsec">Handed out</div><ul class="list">' + out.map(function(i){ return '<li class="row"><span class="mark act">' + ic(CAT_IC[catOf(i)] || 'camera') + '</span><div class="body"><div class="t">' + esc(i.name) + '</div><div class="m">With ' + esc(userName(i.holder)) + (i.dueBack ? ' · back by ' + fDate(i.dueBack) : '') + '</div></div><button type="button" class="btn btn-sm btn-ghost" data-act="gearBack" data-id="' + esc(i.id) + '">Returned</button></li>'; }).join('') + '</ul>' : '') +
    steps +
    '<div class="field" style="margin-top:12px"><label for="ggw">Who brings it</label><select class="input" id="ggw">' + opts.map(function(u){ return '<option value="' + esc(u.username) + '"' + (u.username === holder ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select></div>' +
    '<p class="hint" style="margin:0">Planning keeps these free for this event. ' + (started ? 'Hand out marks them checked out now.' : 'Hand them out on the day.') + '</p>',
    '<button type="button" class="btn btn-ghost" data-act="close">Close</button>' + (started ? '<button type="button" class="btn btn-ghost" data-act="gearHand">' + ic('check') + 'Hand out now</button>' : '') + '<button type="button" class="btn btn-primary" data-act="gearSave">Save plan</button>');
  kitFormula();
};
function kitFormula(){
  var box = document.getElementById('kformula'); if (!box) return;
  var ids = Array.prototype.map.call(document.querySelectorAll('#modal input[name=gear]:checked'), function(x){ return x.value; });
  var by = {}; ids.forEach(function(id){ var i = S.inventory.filter(function(x){ return x.id === id; })[0]; if (i){ var c = catOf(i); by[c] = (by[c] || 0) + 1; } });
  box.innerHTML = KIT.map(function(c){ var n = by[c] || 0; return '<span class="kf' + (n ? ' on' : '') + '">' + ic(CAT_IC[c]) + esc(c) + (n > 1 ? ' ×' + n : '') + '</span>'; }).join('<span class="kfp">+</span>') +
    INV_CATS.filter(function(c){ return KIT.indexOf(c) < 0 && by[c]; }).map(function(c){ return '<span class="kfp">+</span><span class="kf on">' + esc(c) + (by[c] > 1 ? ' ×' + by[c] : '') + '</span>'; }).join('') +
    '<span class="kfsum">' + (ids.length ? ids.length + ' item' + (ids.length === 1 ? '' : 's') : 'Nothing picked yet') + (KIT.every(function(c){ return by[c]; }) ? ' · full kit' : '') + '</span>';
}
document.addEventListener('change', function(ev){ if (ev.target.name === 'gear' && ev.target.closest('#modal')) kitFormula(); });
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="gearSave"],[data-act="gearHand"]'); if (!t) return;
  var evId = M.gear, ids = Array.prototype.map.call(document.querySelectorAll('#modal input[name=gear]:checked'), function(x){ return x.value; }), holder = (document.getElementById('ggw') || {}).value || '';
  var e = S.events.filter(function(x){ return x.id === evId; })[0]; if (!e) return;
  t.disabled = true;
  var p = call('planGear', { id: evId, items: ids, holder: holder });
  if (t.dataset.act === 'gearHand') p = p.then(function(){ return ids.filter(function(id){ var i = S.inventory.filter(function(x){ return x.id === id; })[0]; return i && i.status === 'Available'; })
    .reduce(function(q, id){ return q.then(function(){ return call('checkoutItem', { id: id, holder: holder, dueBack: addDays(e.dateTo || e.date, 1), eventId: evId, note: '' }); }); }, Promise.resolve()); });
  p.then(function(){ return refresh(); }).then(function(){ toast(t.dataset.act === 'gearHand' ? 'Handed out to ' + firstName(holder) : (ids.length ? 'Kit planned: ' + kitText(ids) : 'Plan cleared')); closeModal(); })
    .catch(function(err){ toast(err.message); t.disabled = false; });
});
/* event card: the planned kit */
(function(){
  var EC = evCard;
  evCard = function(e){
    var h = EC(e), g = e.gear || [];
    if (g.length && inProd()) h = h.replace(/(<dt>Needed<\/dt><dd>)/, '<dt>Kit</dt><dd>' + esc(kitText(g)) + (e.gearHolder ? ' <span class="hint">(' + esc(firstName(e.gearHolder)) + ')</span>' : '') + '</dd>$1');
    return h;
  };
})();

(function(){
  var st = document.createElement('style');
  st.textContent =
    '.kitpanel .panel-h .row-btns{gap:8px;align-items:center}' +
    '.kitrow{display:flex;align-items:stretch;gap:8px;padding:14px 18px 6px;flex-wrap:wrap}.kitrow.small{padding-top:4px;padding-bottom:16px}.kitrow.small .kcard{flex:0 1 150px}' +
    '.kplus{align-self:center;font:800 22px/1 var(--f-display,inherit);color:var(--muted)}' +
    '.kcard{flex:1 1 140px;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"ic name" "num num" "bar bar";gap:6px 8px;text-align:left;border:1px solid var(--line-strong);background:var(--surface);border-radius:14px;padding:12px;cursor:pointer;font:inherit;color:var(--ink);transition:transform .12s var(--ease-out,ease-out),border-color .15s}' +
    '.kcard:active{transform:scale(.97)}.kcard.on{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}.kcard.low .knum b{color:var(--red)}' +
    '.kic{grid-area:ic;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--brand-soft);color:var(--brand-strong)}.kic svg{width:18px;height:18px}' +
    '.kname{grid-area:name;align-self:center;font-weight:700;font-size:13px}.knum{grid-area:num}.knum b{font:800 26px/1 var(--f-display,inherit);font-variant-numeric:tabular-nums}.kcard:not(.big) .knum b{font-size:18px}.knum small{color:var(--muted);font-size:12px}' +
    '.kbar{grid-area:bar;height:5px;border-radius:99px;background:var(--surface-2);overflow:hidden}.kbar i{display:block;height:100%;background:var(--brand)}.kcard.low .kbar i{background:var(--red)}' +
    '.kitsum{padding:4px 18px 14px;font-size:14px}.kitsum b{font-variant-numeric:tabular-nums}' +
    '.ndays{display:grid}.nday{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:12px 18px;border-top:1px solid var(--line)}.nday:first-child{border-top:0}' +
    '.ndate{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;border-radius:12px;background:var(--surface-2);padding:6px 4px;height:max-content}.ndate b{font:800 22px/1 var(--f-display,inherit)}.ndate span{font-size:12px;font-weight:700;text-transform:uppercase}.ndate small{font-size:11px;color:var(--muted)}.ndate.bad{background:var(--red-soft);color:var(--red)}' +
    '.nlist{display:grid;gap:8px;min-width:0}.nev{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.nev .grow{min-width:0}' +
    '.kitline{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--brand-strong);margin-top:4px;flex-wrap:wrap}.kitline svg{width:14px;height:14px}.kitline.none{color:var(--gold)}' +
    '.invgrp{display:flex;align-items:center;gap:10px;padding:14px 4px 6px;border-top:1px solid var(--line);margin-top:6px}.invgrp:first-child{border-top:0;margin-top:0}.invgrp .hint{margin-left:auto}' +
    '.kformula{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 12px;border-radius:12px;background:var(--surface-2);margin:10px 0;position:sticky;top:0;z-index:2}' +
    '.kf{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px dashed var(--line-strong);color:var(--muted)}.kf svg{width:14px;height:14px}.kf.on{border-style:solid;border-color:var(--brand);background:var(--brand-soft);color:var(--brand-strong)}' +
    '.kfp{font-weight:800;color:var(--muted)}.kfsum{margin-left:auto;font-size:12.5px;color:var(--muted)}' +
    '.kstep{border:1px solid var(--line);border-radius:14px;padding:10px 12px}.kstep-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}.kstep-h .hint{margin-left:auto}.kstep-h .kic{width:26px;height:26px}' +
    '.kn{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--ink);color:var(--surface);font-size:11px;font-weight:800}' +
    '.kjoin{text-align:center;font:800 18px/1 var(--f-display,inherit);color:var(--muted);margin:4px 0}' +
    '.kchips{display:flex;flex-wrap:wrap;gap:6px}.kchip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line-strong);border-radius:12px;padding:8px 12px;cursor:pointer;font-size:13.5px;min-height:40px}' +
    '.kchip span{display:flex;flex-direction:column;line-height:1.2;font-weight:600}.kchip small{font-weight:500;color:var(--muted);font-size:11.5px}.kchip:has(input:checked){background:var(--brand-soft);border-color:var(--brand);color:var(--brand-strong)}' +
    '@media (max-width:640px){.kitrow{padding:12px 12px 4px}.kplus{display:none}.kcard{flex:1 1 calc(50% - 8px)}.nday{grid-template-columns:52px 1fr;padding:12px}.nev{flex-direction:column}}' +
    '@media (pointer:coarse){.kchip{min-height:44px}}';
  document.head.appendChild(st);
})();

(function(){
  var IR = invRow; invRow = function(i){ var h = IR(i); return i.category === catOf(i) ? h : h.replace('<div class="hint">' + esc(i.category), '<div class="hint">' + esc(catOf(i))); };
})();

/* Add or edit equipment. The type is one tap (no dropdown to scroll), it starts on the last type used
   (or the type the page is filtered by), optional details are folded away, and "Add & add another"
   keeps the form open with the same type so several items can be entered in a row. */
var INV_SHORT = { 'Tripod and Support': 'Tripod' };
invModal = function(id){
  var i = id ? S.inventory.filter(function(x){ return x.id === id; })[0] : null;
  var cat = i ? catOf(i) : (S.invCat || lGet('pio_inv_cat') || 'Camera'); if (INV_CATS.indexOf(cat) < 0) cat = 'Camera';
  var hist = i ? (i.history || []).slice(0, 5).map(function(h){ var u = h.who && userOf(h.who); return '<li class="hint">' + esc(fDate(String(h.at).slice(0, 10), { month:'short', day:'numeric' })) + ' · ' + esc(h.act) + (u ? ' · ' + esc(u.name) : '') + (h.note ? ' · ' + esc(h.note) : '') + '</li>'; }).join('') : '';
  var more = i && (i.tag || i.serial || i.note); M.added = 0;
  var types = '<fieldset class="typepick"><legend>Type</legend><div class="tgrid">' + INV_CATS.map(function(c, k){
    return '<input type="radio" name="category" id="ivc' + k + '" value="' + esc(c) + '"' + (c === cat ? ' checked' : '') + ' required><label for="ivc' + k + '">' + ic(CAT_IC[c] || 'camera') + '<span>' + esc(INV_SHORT[c] || c) + '</span></label>'; }).join('') + '</div></fieldset>';
  modal(i ? 'Edit equipment' : 'Add equipment',
    '<input type="hidden" name="id" value="' + esc(i ? i.id : '') + '">' + types +
    '<div class="field"><label for="ivn">Name</label><input class="input" id="ivn" name="name" maxlength="120" value="' + esc(i ? i.name : '') + '" placeholder="e.g. Sony A7 III" autocomplete="off" required></div>' +
    '<details class="ivmore"' + (more ? ' open' : '') + '><summary>More details <span class="hint">(optional: asset tag, serial number, notes)</span></summary>' +
      '<div class="two"><div class="field"><label for="ivt">Asset tag</label><input class="input" id="ivt" name="tag" maxlength="40" value="' + esc(i ? i.tag || '' : '') + '"></div>' +
      '<div class="field"><label for="ivs">Serial number</label><input class="input" id="ivs" name="serial" maxlength="60" value="' + esc(i ? i.serial || '' : '') + '"></div></div>' +
      '<div class="field"><label for="ivo">Notes</label><input class="input" id="ivo" name="note" maxlength="300" value="' + esc(i ? i.note || '' : '') + '" placeholder="Condition, what is in the bag, etc."></div></details>' +
    (i && i.status === 'Available' ? '<div class="ivstat"><span class="hint">Damaged or not working?</span><button type="button" class="btn btn-sm btn-ghost" data-act="invRepair" data-id="' + esc(i.id) + '">' + ic('flag') + 'Send for repair</button></div>' : '') +
    (hist ? '<div class="dsec">Recent history</div><ul style="margin:0;padding-left:18px">' + hist + '</ul>' : '') +
    (i ? '' : '<p class="hint" id="ivDone" aria-live="polite" style="margin:0"></p>'),
    (i && isAdmin() ? '<button type="button" class="btn btn-danger" data-act="invDel" data-id="' + i.id + '">' + ic('trash') + 'Delete</button>' : '') +
    (i ? '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save</button>'
       : '<button class="btn btn-ghost" type="submit" data-again="1" title="Save it and keep this form open for the next item">' + ic('plus') + 'Add another</button><button class="btn btn-primary" type="submit">Add equipment</button>'), 'saveItem');
  if (!i){ var n = document.getElementById('ivn'); if (n) n.focus(); }
};
/* Equipment sheets: tapping a type card (Cameras, Lenses...), "All equipment" or the attention notice opens
   the items in a sheet with their actions. The sheet redraws itself when data changes (return, check out...). */
function invSheetItems(mode, f, q){
  q = (q || '').trim().toLowerCase();
  return S.inventory.filter(function(i){
    if (mode === 'attention') { if (!(i.status === 'Repair' || i.status === 'Missing' || invOverdue(i))) return false; }
    else if (mode !== 'all' && catOf(i) !== mode) return false;
    if (mode === 'all' && f === 'Available' && i.status !== 'Available') return false;
    if (mode === 'all' && f === 'Out' && i.status !== 'Out') return false;
    if (mode === 'all' && f === 'attention' && !(i.status === 'Repair' || i.status === 'Missing' || invOverdue(i))) return false;
    if (q){ var u = i.holder && userOf(i.holder); if ((i.name + ' ' + catOf(i) + ' ' + (i.tag || '') + ' ' + (i.serial || '') + ' ' + (u ? u.name : '')).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }).sort(function(a, b){ return INV_CATS.indexOf(catOf(a)) - INV_CATS.indexOf(catOf(b)) || (a.name < b.name ? -1 : 1); });
}
function invSheetList(){
  var items = invSheetItems(M.sheet, M.sheetF, M.sheetQ), grouped = M.sheet === 'all' || M.sheet === 'attention', last = '', html = '';
  items.forEach(function(i){ var c = catOf(i); if (grouped && c !== last){ last = c; html += '<li class="invgrp"><span class="kic">' + ic(CAT_IC[c] || 'camera') + '</span><b>' + esc(CAT_PLURAL[c]) + '</b></li>'; }
    // the sheet title or group heading already names the type, so the row does not repeat it
    var cn = esc(c), row = invRow(i).replace('<div class="hint">' + cn + ' · ', '<div class="hint">').replace('<div class="hint">' + cn + '</div>', '');
    html += row; });
  return html || '<li class="hint" style="padding:18px 4px;text-align:center">' + (M.sheetQ ? 'No equipment matches.' : M.sheet === 'attention' || M.sheetF === 'attention' ? 'Nothing needs attention.' : M.sheetF === 'Out' ? 'Nothing is checked out.' : M.sheetF === 'Available' ? 'Nothing is available right now.' : 'None yet. Use Add to put the first one on the list.') + '</li>';
}
function invSheetTabs(){
  var all = S.inventory, cnt = function(f){ return invSheetItems('all', f, '').length; };
  return '<div class="tabs" role="group" aria-label="Show equipment">' + [['all', 'All', all.length], ['Available', 'Available', cnt('Available')], ['Out', 'Checked out', cnt('Out')], ['attention', 'Needs attention', cnt('attention')]]
    .map(function(x){ return '<button type="button" data-act="invSheetF" data-f="' + x[0] + '" aria-pressed="' + ((M.sheetF || 'all') === x[0]) + '">' + x[1] + ' · ' + x[2] + '</button>'; }).join('') + '</div>';
}
function invSheet(mode){
  M = { sheet: mode, sheetF: 'all', sheetQ: '' };
  var isCat = mode !== 'all' && mode !== 'attention', n = isCat ? S.inventory.filter(function(i){ return catOf(i) === mode; }) : [];
  var title = mode === 'all' ? 'All equipment' : mode === 'attention' ? 'Needs attention' : esc(CAT_PLURAL[mode] || mode);
  var sub = isCat ? '<p class="hint" style="margin:0 0 10px">' + n.filter(function(i){ return gearFree(i, today()); }).length + ' of ' + n.length + ' free today</p>' : '';
  modal(title, '<div class="invsheet">' + sub + (mode === 'all' ? '<div class="invsheet-bar"><input class="input" type="search" id="invSheetQ" placeholder="Search name, tag, serial or person" aria-label="Search equipment" autocomplete="off"><div id="invSheetTabs">' + invSheetTabs() + '</div></div>' : '') +
      '<ul id="invSheetList" class="invsheet-list">' + invSheetList() + '</ul></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Close</button>' + (mode !== 'attention' ? '<button type="button" class="btn btn-primary" data-act="invNewIn" data-c="' + esc(isCat ? mode : '') + '">' + ic('plus') + (isCat ? 'Add ' + esc((INV_SHORT[mode] || mode).toLowerCase()) : 'Add equipment') + '</button>' : ''));
  requestAnimationFrame(function(){ tabFades(document.getElementById('modal')); });
}
function invSheetRedraw(){
  var l = document.getElementById('invSheetList'); if (!l || !M.sheet) return;
  l.innerHTML = invSheetList(); var tb = document.getElementById('invSheetTabs'); if (tb) tb.innerHTML = invSheetTabs();
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="invSheet"],[data-act="invSheetF"],[data-act="invNewIn"]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'invSheet') invSheet(t.dataset.c);
  else if (a === 'invSheetF'){ M.sheetF = t.dataset.f; invSheetRedraw(); }
  else if (a === 'invNewIn'){ var keep = S.invCat; S.invCat = t.dataset.c || ''; invModal(); S.invCat = keep; }
});
document.addEventListener('input', function(ev){ if (ev.target.id === 'invSheetQ' && M.sheet){ M.sheetQ = ev.target.value; invSheetRedraw(); } });
(function(){ var R = render; render = function(){ R.apply(this, arguments); invSheetRedraw(); }; })();
/* after "Add & add another": keep the type, clear the rest, and go back to Name */
function invNext(f){
  var cat = (f.querySelector('input[name=category]:checked') || {}).value, nm = f.querySelector('#ivn').value;
  ['ivn', 'ivt', 'ivs', 'ivo'].forEach(function(k){ var el = f.querySelector('#' + k); if (el){ el.value = ''; el.removeAttribute('aria-invalid'); } });
  f.querySelectorAll('.ferr').forEach(function(p){ p.remove(); });
  M.added = (M.added || 0) + 1;
  var done = document.getElementById('ivDone'); if (done) done.textContent = '✓ ' + nm + ' added' + (M.added > 1 ? ' · ' + M.added + ' added so far' : '') + '. Add the next ' + (INV_SHORT[cat] || cat || 'item').toLowerCase() + '.';
  f.querySelector('#ivn').focus();
}

/* ---------- quick add: an event that still needs people offers the fairest picks right on its card ---------- */
(function(){
  var EC = evCard;
  evCard = function(e){
    var h = EC(e);
    if (!canSched() || e.status === 'Cancelled' || (e.dateTo || e.date) < today() || evState(e) !== 'need') return h;
    var picks = fairPicks(e).slice(0, 3); if (!picks.length) return h;
    var qa = '<div class="qa"><span class="qa-k">' + ic('users') + 'Quick add</span>' + picks.map(function(p){
      return '<button type="button" class="qa-p" data-act="qAssign" data-id="' + esc(e.id) + '" data-u="' + esc(p.u.username) + '" data-tip="' + esc(p.u.name + (p.why ? '\n' + p.why : '') + '\n' + loadText(p.load)) + '" aria-label="Add ' + esc(p.u.name) + '">' + avatarHtml(p.u, 24) + '<span>' + esc(shortName(p.u)) + '</span>' + ic('plus') + '</button>'; }).join('') +
      '<button type="button" class="qa-more" data-act="evAssign" data-id="' + esc(e.id) + '">Choose…</button></div>';
    return h.indexOf('<div class="acts-row">') >= 0 ? h.replace('<div class="acts-row">', qa + '<div class="acts-row">') : h.replace(/<\/article>$/, qa + '</article>');
  };
})();
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="qAssign"]'); if (!t) return;
  var e = S.events.filter(function(x){ return x.id === t.dataset.id; })[0]; if (!e) return;
  var users = (e.assigned || []).concat([t.dataset.u]).filter(function(u, i, a){ return a.indexOf(u) === i; });
  busy(t, act('assignEvent', { id: e.id, users: users, open: '0' }, firstName(t.dataset.u) + ' added').then(function(){ if (typeof refreshPop === 'function') refreshPop(); }));
});
/* remember whether "More" is open in the side menu */
document.addEventListener('toggle', function(ev){ if (ev.target.classList && ev.target.classList.contains('nav-more')) S.navMore = ev.target.open; }, true);

/* ---------- dashboard entrance: cards rise in one after another and the numbers count up from zero.
   Plays when you arrive on the dashboard (not on every refresh of it); skipped with reduced motion. ---------- */
function countTo(el, delay){
  var full = el.textContent, m = /^([+−-]?)(\d+)([\s\S]*)$/.exec(full); if (!m || +m[2] < 1) return;
  var to = +m[2], tail = m[3].replace(/^[¼½¾]/, ''), t0 = null;
  el.textContent = m[1] + '0' + tail;
  setTimeout(function(){ requestAnimationFrame(function step(ts){ if (!t0) t0 = ts;
    var k = Math.min(1, (ts - t0) / 800), e = 1 - Math.pow(1 - k, 3);
    if (!el.isConnected) return;
    el.textContent = k < 1 ? m[1] + Math.round(to * e) + tail : full;
    if (k < 1) requestAnimationFrame(step); }); }, delay);
}
function dashMotion(force){
  if (!S.me || S.view !== 'dashboard') { S._motionView = S.me ? S.view : null; return; }
  var arrived = S._motionView !== 'dashboard'; S._motionView = 'dashboard';
  if (!arrived && !force) return;
  if ((document.getElementById('splash') || document.querySelector('.wel')) && !force) { S._motionView = null; return; }   // the splash or welcome will call again
  if (lessMotion()) return;
  var g = document.querySelector('.grid.dash'); if (!g) return;
  var kids = [].slice.call(g.children);
  kids.forEach(function(c, i){ c.style.setProperty('--i', Math.min(i, 8)); });
  g.classList.add('rise-in');
  setTimeout(function(){ g.classList.remove('rise-in'); }, 1200);
  [].slice.call(g.querySelectorAll('.tile .v, .hero .big, .hero-r .box b')).forEach(function(el, i){ countTo(el, 180 + i * 70); });
}
(function(){ var R = render; render = function(){ R.apply(this, arguments); try { dashMotion(); } catch(e){} }; })();

/* the sign-in screen: load the people and divisions for the name picker, then show it.
   Used when the app opens signed out, and again after signing out (a session that opened signed in never had the list). */
function loadSignIn(){
  return call('status').then(function(st){ if (S.me) return; S.needsSetup = st.needsSetup; S.divisions = st.divisions || []; S.profiles = st.profiles || [];
    var lu = lGet('pio_lastu'), lp = S.profiles.filter(function(x){ return x.username === lu && x.active !== false; })[0]; if (lp && !S.authDiv) S.authDiv = S.divisions.some(function(d){ return d.id === lp.division; }) ? lp.division : '_';
    render(); var f = document.getElementById('lu') || document.getElementById('sn'); if (f && window.innerWidth > 860) f.focus(); });
}

(function boot(){
  S.token = lGet('pio_tok') || sGet('pio_tok');
  if (!LIVE && S.token && S.token.charAt(0) !== 't'){ clearSession(); S.token = null; }
  var cached = null;
  try { cached = JSON.parse(lGet('pio_cache') || 'null'); } catch(e){}
  if (S.token && cached && LIVE){ apply(cached); render(); }
  var first = S.token ? refresh().catch(function(e){ if (!S.me){ clearSession(); S.token = null; } else toast(e.message); }) : Promise.resolve();
  first.then(function(){
    if (S.me) return;
    return loadSignIn();
  }).catch(function(e){ document.getElementById('app').innerHTML = '<div class="loading"><p>' + esc(e.message) + '</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></div>'; });
})();
