/* PIO Overwatch · views.js · loaded in order by index.html (core, views, events, documents, data, app). */
/* ---------- render ---------- */
/* [view, icon, label, sidebar group]. The first four also go in the phone tab bar; the rest sit under More. */
function navItems(){
  // The first five are the phone tab bar. Regular and casual staff get leaves up front; JO and COS get offsets.
  var tev = ['tev','peso','TEVs','Field work'];
  if (isAdmin()) return [['dashboard','grid','Dashboard','Overview'],['travel','route','Travel orders','Field work'],
       ['calendar','cal','Calendar','Overview'],tev,['monthly','month','Monthly','Offsets'],['records','list','Records','Offsets'],['leaves','plane','Leaves','Leaves'],['staff','users','Staff','Admin'],['settings','cog','Settings','Admin']];
  // staff and division leaders: four main places, everything else folded under More
  var main = [['dashboard','grid','Home','Main'],['calendar','cal','Calendar','Main'],['travel','route','My travel orders','Main'],['log','plus','Offsets','Main']];
  if (hasLeaves()) main.push(['leaves','plane','My leaves','Main']);
  var more = [['tev','peso','TEVs','More'],['monthly','month','Monthly','More'],['records','list','Records','More']];
  if (!hasLeaves() && wlOnly()) more.push(['leaves','plane','Wellness leave','More']);
  return main.concat(more);
}
var SHORT = { dashboard: 'Home', travel: 'Travel', availability: 'Who’s in', log: 'Offsets', leaves: 'Leaves', approvals: 'Review' };
/* staff menus: the main places (and Inventory for Production) stay up front; the rest is under More */
function navMain(n){ return isAdmin() || n[3] === 'Main' || n[3] === 'Production'; }
function sideNav(nav, navBtn){
  if (!isAdmin()){
    var mainN = nav.filter(navMain), moreN = nav.filter(function(n){ return !navMain(n); }), open = S.navMore || moreN.some(function(n){ return n[0] === S.view; });
    return mainN.map(navBtn).join('') + (moreN.length ? '<details class="nav-more"' + (open ? ' open' : '') + '><summary>' + ic('right') + '<span>More</span></summary>' + moreN.map(navBtn).join('') + '</details>' : '');
  }
  var order = ['Overview','Field work','Production','Offsets','Leaves','Admin'], html = '';
  order.forEach(function(g){ var items = nav.filter(function(n){ return n[3] === g; }); if (items.length) html += '<div class="nav-h">' + g + '</div>' + items.map(navBtn).join(''); });
  return html;
}
/* What someone is typing survives a screen refresh (a save finishing, new data arriving).
   A form that was just sent is left out, so it clears as expected. */
function keepForm(root){
  var k = { f: {}, focus: null };
  root.querySelectorAll('input[id],select[id],textarea[id]').forEach(function(el){
    if (el.type === 'file') return;
    var f = el.closest('form[data-form]'); if (f && f.dataset.form === S.sentForm) return;
    k.f[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? { c: el.checked } : { v: el.value };
  });
  var a = document.activeElement;
  if (a && a.id && root.contains(a) && k.f[a.id]) k.focus = { id: a.id, s: a.selectionStart, e: a.selectionEnd };
  return k;
}
function restoreForm(k){
  Object.keys(k.f).forEach(function(id){
    var el = document.getElementById(id), x = k.f[id]; if (!el) return;
    if ('c' in x){ if (el.checked !== x.c) el.checked = x.c; } else if (el.value !== x.v){ el.value = x.v; }
  });
  if (k.focus){ var el = document.getElementById(k.focus.id); if (el){ el.focus({ preventScroll: true }); try { if (k.focus.s != null) el.setSelectionRange(k.focus.s, k.focus.e); } catch(e){} } }
}
document.addEventListener('submit', function(ev){ var f = ev.target.closest && ev.target.closest('form[data-form]'); if (f) S.sentForm = f.dataset.form; }, true);
document.addEventListener('input', function(ev){ var f = ev.target.closest && ev.target.closest('form[data-form]'); if (f && f.dataset.form === S.sentForm) S.sentForm = null; }, true);
function render(){
  statsReset();
  var app = document.getElementById('app');
  var banner = LIVE ? '' : '<div class="preview">Preview mode with sample data. Nothing is saved. Sign in as <b>admin</b> or <b>jdelacruz</b>, PIN <b>1234</b>. To go live, put your Firebase settings in config.js (see README).</div>';
  if (!S.me){ app.innerHTML = banner + (S.needsSetup ? viewSetup() : viewLogin()); return; }
  var nav = navItems(), pc = isAdmin() ? pending().filter(canReview).length : 0;
  function navBtn(n){ return '<button data-go="' + n[0] + '" data-tip="' + esc(n[2]) + '"' + (S.view === n[0] ? ' aria-current="page"' : '') + '>' + ic(n[1]) + '<span>' + n[2] + '</span>' + navBadge(n[0], pc) + '</button>'; }
  var tabs = isAdmin() ? nav.slice(0, 5) : nav.filter(navMain).slice(0, 4);
  var tabMore = !isAdmin() && nav.some(function(n){ return !navMain(n); });
  var views = { dashboard: viewDashboard, log: viewLog, approvals: viewApprovals, calendar: viewCalendar, events: viewCalendar, inventory: viewInventory, monthly: viewMonthly, records: viewRecords, staff: viewStaff, settings: viewSettings, availability: viewCalendar, travel: viewTravel, leaves: viewLeaves, tev: viewTEV };
  if (!views[S.view] || ((['staff','approvals','settings'].indexOf(S.view) >= 0 && !isAdmin()) || (S.view === 'inventory' && !inProd()))) S.view = 'dashboard';
  var v = views[S.view]();
  var myDiv = divOf(S.me.division), y = window.scrollY, same = S.view === S.lastView && !!app.querySelector('.shell'), kept = same ? keepForm(app) : null;
  S.lastView = S.view;
  var html = banner + '<a class="skip" href="#main">Skip to content</a>' +
    '<div class="shell">' +
      '<div class="drawer-scrim" data-act="drawerClose"></div><aside class="side" id="sidenav"><div class="brand"><img src="' + LOGO + '" alt="Provincial Information Office seal"><div class="brand-t"><b>PIO Overwatch</b><small>Camarines Norte</small></div><button type="button" class="side-tog" data-act="sideMini" aria-label="' + (sideMini() ? 'Expand menu' : 'Collapse menu') + '" aria-expanded="' + !sideMini() + '">' + ic('left') + '</button></div>' +
        '<nav class="nav" aria-label="Main">' + '<button data-act="search" class="side-search" aria-keyshortcuts="/">' + ic('search') + '<span>Search</span><kbd>/</kbd></button>' + sideNav(nav, navBtn) + '</nav>' +
        '<div class="side-foot"><div class="who"><button type="button" class="av-btn" data-act="photoModal" data-u="' + esc(S.me.username) + '" aria-label="Your photo" data-tip="Your photo">' + avatarHtml(userOf(S.me.username) || S.me, 38) + '</button>' +
          '<div class="who-t" style="min-width:0"><b>' + esc(S.me.name) + '</b><small><span class="cap">' + esc(S.me.role === 'scheduler' ? 'division leader' : S.me.role) + '</span> · ' + (myDiv ? esc(myDiv.short) : '@' + esc(S.me.username)) + '</small></div></div>' +
        themePick() + '<div class="nav">' + (S.view === 'dashboard' ? '<button data-act="customize" class="show-sm">' + ic('sliders') + '<span>Customize dashboard</span></button>' : '') + bellBtn(true) + '<button data-act="refresh">' + ic('refresh') + '<span>Refresh</span></button><button data-act="changePin">' + ic('key') + '<span>Change PIN</span></button><button data-act="logout">' + ic('out') + '<span>Sign out</span></button></div></div>' +
      '</aside>' +
      '<div style="min-width:0">' +
        '<header class="topbar"><button data-act="drawer" aria-label="Open menu" aria-controls="sidenav" aria-expanded="false">' + ic('menu') + '</button><img src="' + LOGO + '" alt=""><b>PIO Overwatch</b>' + '<button data-act="search" aria-label="Search">' + ic('search') + '</button>' + bellBtn(false) + '</header>' +
        '<main class="main" id="main" tabindex="-1">' +
          '<section class="band"><div class="band-in"><div><p class="eyebrow">' + (v.eyebrow || 'PIO Overwatch') + '</p><h1>' + v.title + '</h1>' + (v.sub ? '<p' + (S.view === 'dashboard' ? ' class="keep-sub"' : '') + '>' + v.sub + '</p>' : '') + '</div>' + (v.actions ? '<div class="row-btns no-print">' + v.actions + '</div>' : '') + '</div></section>' +
          '<div class="wrap">' + v.body + '</div>' +
        '</main>' +
      '</div>' +
      '<nav class="tabbar" aria-label="Quick links">' + tabs.map(function(n){ return navBtn([n[0], n[1], SHORT[n[0]] || n[2]]); }).join('') + (tabMore ? '<button type="button" data-act="moreNav"' + (nav.some(function(n){ return !navMain(n) && n[0] === S.view; }) ? ' aria-current="page"' : '') + '>' + ic('menu') + '<span>More</span></button>' : '') + '</nav>' +
    '</div>';
  if (same){
    // same page: change only what changed, so background updates do not flash or jump
    var tpl = document.createElement('div'); tpl.innerHTML = html; groupify(tpl); cardLabels(tpl); if (typeof a11yFix === 'function') a11yFix(tpl);
    morphKids(app, tpl); resetControls(app, kept); requestAnimationFrame(function(){ tabFades(app); });
    if (kept) restoreForm(kept);
    var dr = app.querySelector('[data-act="drawer"]'), ex = String(document.body.classList.contains('drawer-open')); if (dr && dr.getAttribute('aria-expanded') !== ex) dr.setAttribute('aria-expanded', ex);
  } else {
    app.innerHTML = html;
    document.body.classList.remove('drawer-open');
    window.scrollTo(0, y);
    groupify(app); cardLabels(app); if (typeof a11yFix === 'function') a11yFix(app); requestAnimationFrame(function(){ tabFades(app); });
  }
  if (typeof navSync === 'function') navSync();
  if (S.view === 'log') checkEarnForm(document, true);
}

/* ----- update the page in place (a small DOM morph) ----- */
function sameNode(a, b){
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  if (a.tagName !== b.tagName) return false;
  var k = ['id', 'data-id', 'data-person', 'data-u', 'data-at', 'data-date', 'data-tab', 'data-form'];
  for (var i = 0; i < k.length; i++) if (a.getAttribute(k[i]) !== b.getAttribute(k[i])) return false;
  return true;
}
function morphAttrs(a, b){
  var i, n;
  for (i = a.attributes.length - 1; i >= 0; i--){ n = a.attributes[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
  for (i = 0; i < b.attributes.length; i++){ n = b.attributes[i]; if (a.getAttribute(n.name) !== n.value) a.setAttribute(n.name, n.value); }
}
function morphKids(from, to){
  var a = from.firstChild, b = to.firstChild;
  while (b){
    var nb = b.nextSibling;
    if (!a){ from.appendChild(b); }
    else if (sameNode(a, b)){
      if (a.nodeType === 1){ morphAttrs(a, b); morphKids(a, b); } else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
      a = a.nextSibling;
    }
    else if (a.nextSibling && sameNode(a.nextSibling, b) && !(nb && sameNode(a, nb))){ var gone = a; a = a.nextSibling; from.removeChild(gone); continue; }
    else if (nb && sameNode(a, nb)){ from.insertBefore(b, a); }
    else { var nx = a.nextSibling; from.replaceChild(b, a); a = nx; }
    b = nb;
  }
  while (a){ var r = a; a = a.nextSibling; from.removeChild(r); }
}
// typed values live in properties, not attributes: bring them back to what the markup says, then keepForm/restoreForm puts back what the person is typing
function resetControls(root, kept){
  root.querySelectorAll('input,textarea,select').forEach(function(el){
    if (el.type === 'file' || (kept && el.id && kept.f[el.id])) return;
    if (el.type === 'checkbox' || el.type === 'radio'){ if (el.checked !== el.defaultChecked) el.checked = el.defaultChecked; return; }
    if (el.tagName === 'SELECT'){ var o = el.querySelector('option[selected]') || el.options[0]; if (o && el.value !== o.value) el.value = o.value; return; }
    if (el.value !== el.defaultValue) el.value = el.defaultValue;
  });
}

/* ----- auth ----- */
function brandPanel(){
  return '<aside class="auth-photo" aria-label="Provincial Capitol of Camarines Norte"><div class="auth-brand"><img class="wordmark" src="pio-digital.webp?v=2" alt="Camarines Norte PIO">' +
    '<div class="socials"><span>' + ic('fb') + '</span><span>' + ic('yt') + '</span><span>' + ic('tt') + '</span><b>@piocamnorte</b></div></div></aside>';
}
function divPicker(selected){
  if (!S.divisions.length) return '';
  return '<fieldset class="divpick"><legend>Your division</legend><div class="divgrid">' + S.divisions.map(function(d, i){
    return '<input type="radio" name="division" id="dv' + i + '" value="' + esc(d.id) + '"' + (selected === d.id ? ' checked' : '') + '><label for="dv' + i + '" title="' + esc(d.name) + '">' + divBadge(d, 34) + '<span>' + esc(d.short || d.name) + '</span><span class="tick">' + ic('tick') + '</span></label>';
  }).join('') + '</div></fieldset>';
}
/* profile pictures: a photo when there is one, otherwise initials on a colour picked from the name */
var AV_COLORS = ['#1F8A50', '#C2410C', '#7C3AED', '#0E7490', '#B4235A', '#A16207', '#1D4ED8', '#0F766E', '#9D174D', '#4D7C0F'];
function avColor(s){ var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return AV_COLORS[Math.abs(h) % AV_COLORS.length]; }
function avatarHtml(u, size, cls){
  size = size || 36; var st = 'width:' + size + 'px;height:' + size + 'px';
  if (u && u.photo && /^data:image\//.test(u.photo)) return '<img class="av ' + (cls || '') + '" src="' + esc(u.photo) + '" alt="" style="' + st + '">';
  return '<span class="av av-i ' + (cls || '') + '" style="' + st + ';background:' + avColor((u && (u.username || u.name)) || '') + ';font-size:' + Math.round(size * 0.36) + 'px" aria-hidden="true">' + esc(initials((u && u.name) || '?')) + '</span>';
}
/* sign in like picking a profile: division, then your name, then your PIN */
function profilesIn(dv){ return (S.profiles || []).filter(function(x){ return x.active !== false && (dv === '_' ? !S.divisions.some(function(d){ return d.id === x.division; }) : x.division === dv); }).sort(function(a, b){ return a.name.localeCompare(b.name); }); }
function viewPicker(){
  var step = S.authUser ? 3 : S.authDiv ? 2 : 1, intro = !S.pfIntro ? ' pfx-intro' : '', body = '';
  var tile = function(inner, label, sub, attrs, vt){ return '<button type="button" class="pfx-tile" ' + attrs + '><span class="pfx-av"' + (vt ? ' style="view-transition-name:' + vt + '"' : '') + '>' + inner + '</span><span class="pfx-n">' + esc(label) + '</span>' + (sub ? '<small class="pfx-s">' + sub + '</small>' : '') + '</button>'; };
  if (step === 1){
    var divs = S.divisions.filter(function(d){ return profilesIn(d.id).length; }).map(function(d){ return [d.id, d.short || d.name, divBadge(d, 150)]; });
    if (profilesIn('_').length) divs.push(['_', 'Others', '<span class="av av-i" style="width:150px;height:150px;background:#3B4A42;font-size:54px">' + ic('users') + '</span>']);
    body = '<h1 class="pfx-h">Which division are you in?</h1><div class="pfx-row">' + divs.map(function(d){
      var n = profilesIn(d[0]).length; return tile(d[2], d[1], n + ' ' + (n === 1 ? 'person' : 'people'), 'data-act="authDiv" data-d="' + esc(d[0]) + '"', S.pfDiv === d[0] ? 'pf-div' : ''); }).join('') + '</div>';
  } else if (step === 2){
    var dv = S.divisions.filter(function(d){ return d.id === S.authDiv; })[0], last = lGet('pio_lastu');
    body = '<button type="button" class="pfx-back" data-act="authBack">' + ic('left') + '<span class="pfx-chip" style="view-transition-name:pf-div">' + (dv ? divBadge(dv, 28) : '') + '</span>' + esc(dv ? dv.short || dv.name : 'Others') + '</button>' +
      '<h1 class="pfx-h">Who’s signing in?</h1><div class="pfx-row">' + profilesIn(S.authDiv).map(function(x){
        return tile(avatarHtml(x, 150), x.name, x.username === last ? 'Last signed in' : '', 'data-act="authUser" data-u="' + esc(x.username) + '"', S.pfUser === x.username ? 'pf-user' : ''); }).join('') + '</div>';
  } else {
    var me1 = (S.profiles || []).filter(function(x){ return x.username === S.authUser; })[0] || { username: S.authUser, name: S.authUser };
    body = '<form class="pfx-pin" data-form="login" autocomplete="on"><button type="button" class="pfx-back" data-act="authBack">' + ic('left') + 'Not you?</button>' +
      '<span class="pfx-av pfx-me" style="view-transition-name:pf-user">' + avatarHtml(me1, 150) + '</span><b class="pfx-name">' + esc(me1.name) + '</b>' +
      '<p class="pfx-ask">Enter your PIN</p>' +
      '<input type="text" name="username" autocomplete="username" value="' + esc(me1.username) + '" readonly hidden><input type="hidden" name="division" value="' + esc(S.authDiv === '_' ? '' : S.authDiv || '') + '">' +
      '<div class="pfx-boxes"><input id="lp" name="pin" type="password" autocomplete="current-password" inputmode="numeric" pattern="[0-9]*" maxlength="4" required aria-label="4-digit PIN">' +
        [0, 1, 2, 3].map(function(){ return '<i class="pfx-box" aria-hidden="true"></i>'; }).join('') + '</div>' +
      '<p class="error pfx-err" id="err" role="alert"></p>' +
      '<button class="pfx-go" type="submit">Sign in</button>' + keepBox() +
      '<p class="pfx-hint">Forgot your PIN? Ask an admin to reset it.</p></form>';
  }
  return '<div class="pfx pfx-s' + step + intro + '"><header class="pfx-top"><img src="' + LOGO + '" alt="Provincial Information Office seal"><b>PIO Overwatch</b></header>' +
    '<main class="pfx-main">' + body + '</main>' +
    (step < 3 ? '<button type="button" class="pfx-alt" data-act="authManual">Sign in with your username</button>' : '') + '</div>';
}
/* moving between the steps: the picture you pick glides into place (where the browser can), everything else fades */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="authDiv"],[data-act="authUser"],[data-act="authBack"],[data-act="authManual"]'); if (!t || S.me) return;
  var a = t.dataset.act, back = a === 'authBack';
  var apply = function(){
    if (a === 'authDiv'){ S.authDiv = t.dataset.d; S.pfDiv = t.dataset.d; }
    else if (a === 'authUser'){ S.authUser = t.dataset.u; S.pfUser = t.dataset.u; lSet('pio_lastu', t.dataset.u); }
    else if (back){ if (S.authUser) S.authUser = null; else S.authDiv = null; }
    else { S.authManual = !S.authManual; S.authUser = null; }
    S.pfIntro = true; render();
    var f = document.getElementById('lp') || document.querySelector('.pfx-tile'); if (f) try { f.focus({ preventScroll: true }); } catch(e){}
  };
  // the tapped tile carries its picture into the next step
  // one name per picture at a time, or the browser skips the glide
  var av = t.querySelector('.pfx-av'); if (av) document.querySelectorAll('.pfx-tile .pfx-av').forEach(function(x){ x.style.viewTransitionName = ''; });
  if (av && a === 'authDiv') av.style.viewTransitionName = 'pf-div';
  if (av && a === 'authUser') av.style.viewTransitionName = 'pf-user';
  if (document.startViewTransition && !lessMotion() && a !== 'authManual'){
    var h = document.documentElement; h.classList.add('vt-pf'); h.classList.toggle('vt-back', back);
    var vt = document.startViewTransition(apply), done = function(){ h.classList.remove('vt-pf', 'vt-back'); };
    vt.finished.finally(done); setTimeout(done, 1500);
  } else apply();
});
/* PIN boxes follow what is typed; a wrong PIN shakes them and clears the boxes */
function pfxBoxes(){ var i = document.getElementById('lp'); if (!i || !i.closest('.pfx-boxes')) return; var n = i.value.length, f = document.activeElement === i;
  i.parentNode.querySelectorAll('.pfx-box').forEach(function(b, k){ b.classList.toggle('on', k < n); b.classList.toggle('cur', f && k === Math.min(n, 3)); }); }
document.addEventListener('input', function(ev){ if (ev.target.id === 'lp' && ev.target.closest('.pfx-boxes')){ ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 4); pfxBoxes(); var e = document.getElementById('err'); if (e) e.textContent = '';
    var fm = ev.target.form; if (ev.target.value.length === 4 && fm && !fm.closest('.pfx-busy')) setTimeout(function(){ if (ev.target.value.length === 4 && document.body.contains(fm) && !fm.closest('.pfx-busy')){ if (fm.requestSubmit) fm.requestSubmit(); else fm.querySelector('[type=submit]').click(); } }, 180); } });
document.addEventListener('focusin', pfxBoxes); document.addEventListener('focusout', function(){ setTimeout(pfxBoxes, 0); });
document.addEventListener('submit', function(ev){ var f = ev.target.closest && ev.target.closest('.pfx-pin'); if (f) f.closest('.pfx').classList.add('pfx-busy'); }, true);
new MutationObserver(function(){ var e = document.querySelector('.pfx-pin #err'); if (!e || !e.textContent) return; var x = document.querySelector('.pfx'); if (!x || !x.classList.contains('pfx-busy')) return;
  x.classList.remove('pfx-busy'); var bx = document.querySelector('.pfx-boxes'), i = document.getElementById('lp');
  if (bx && !lessMotion()) bx.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
  if (i){ i.value = ''; i.focus(); pfxBoxes(); } }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
/* after signing in: "Welcome to Overwatch, <first name>" with your picture, then the app fades in underneath */
function welcome(){
  if (!S.me) return;
  var u = userOf(S.me.username) || S.me, first = String(S.me.name || '').trim().split(/\s+/)[0] || firstName(S.me.username);
  var el = document.createElement('div'); el.className = 'wel'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="wel-in">' + avatarHtml(u, 220, 'wel-av') + '<p class="wel-k">Welcome to Overwatch,</p><h1 class="wel-n">' + esc(first) + '</h1></div>';
  document.body.appendChild(el);
  var gone = false, quick = lessMotion(), out = function(){ if (gone) return; gone = true; el.classList.add('out'); if (typeof dashMotion === 'function') setTimeout(function(){ dashMotion(true); }, 120); setTimeout(function(){ el.remove(); }, 650); };
  setTimeout(out, quick ? 1500 : 3000);
  el.addEventListener('click', out);
}
function keepBox(){ return '<label class="keep"><input type="checkbox" name="remember" checked><span>Keep me signed in on this device</span></label>'; }
function viewLogin(){
  if ((S.profiles || []).length && !S.authManual) return viewPicker();
  return '<div class="auth">' + brandPanel() + '<div class="auth-main"><form class="auth-card" data-form="login" autocomplete="on">' +
    '<div class="auth-title"><img class="seal" src="' + LOGO + '" alt="Provincial Information Office, Camarines Norte seal"><div><p class="eyebrow">Provincial Information Office</p><h1>PIO Overwatch</h1></div></div>' +
    '<p class="lede">Offsets, travel orders, leaves and who is available, in one place.</p>' + divPicker(lGet('pio_div')) +
    '<div class="field"><label for="lu">Username</label><input class="input" id="lu" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
    '<div class="field"><label for="lp">PIN</label><div class="pinwrap"><input class="input pin" id="lp" name="pin" type="password" autocomplete="current-password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required><button type="button" data-act="showPin" aria-label="Show PIN" aria-pressed="false">' + ic('eye') + '</button></div></div>' +
    keepBox() + '<p class="error" id="err" role="alert"></p><button class="btn btn-primary btn-block btn-lg" type="submit">Sign in</button>' +
    '<p class="hint center">Forgot your PIN? Ask an admin to reset it.</p>' + ((S.profiles || []).length ? '<p class="hint center"><button type="button" class="lnk" data-act="authManual">Pick your name instead</button></p>' : '') + '</form></div></div>';
}
function viewSetup(){
  return '<div class="auth">' + brandPanel() + '<div class="auth-main"><form class="auth-card" data-form="setup" autocomplete="off">' +
    '<div class="auth-title"><img class="seal" src="' + LOGO + '" alt="Provincial Information Office, Camarines Norte seal"><div><p class="eyebrow">First-time setup</p><h1>Create the admin account</h1></div></div>' +
    '<p class="lede">This account confirms offsets and manages staff, divisions and holidays. You can add more admins later.</p>' +
    '<div class="field"><label for="sn">Full name</label><input class="input" id="sn" name="name" required></div>' +
    '<div class="field"><label for="su">Username</label><input class="input" id="su" name="username" autocapitalize="none" spellcheck="false" required><span class="hint">Lowercase letters, numbers, dots or dashes.</span></div>' +
    '<div class="two"><div class="field"><label for="sp">PIN</label><input class="input pin" id="sp" name="pin" type="password" inputmode="numeric" maxlength="4" required></div><div class="field"><label for="sp2">Repeat PIN</label><input class="input pin" id="sp2" name="pin2" type="password" inputmode="numeric" maxlength="4" required></div></div>' +
    divPicker('') + keepBox() + '<p class="error" id="err" role="alert"></p><button class="btn btn-primary btn-block btn-lg" type="submit">Create admin account</button></form></div></div>';
}

/* ----- shared pieces ----- */
function entryRow(e, opts){
  opts = opts || {};
  var use = e.type === 'USE', pend = e.status === 'Pending';
  var cls = pend ? 'pend' : (use ? 'use' : 'earn');
  var title = (opts.showName ? esc(userName(e.username)) + ' · ' : '') + (use ? (pend ? 'Day-off request' : 'Day off') : esc(e.event || e.category));
  var meta = fDate(e.date, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + (use ? '' : ' · ' + esc(e.category) + (e.endTime ? ' until ' + fTime(e.endTime) : '')) + (e.venue ? ' · ' + esc(e.venue) : '');
  var acts = '';
  if (e._saving) acts = '';
  else if (opts.review && !canReview(e)) acts = '<div class="acts"><span class="pill off">Needs another admin</span></div>';
  else if (opts.review) acts = '<div class="acts">' + shortNote(e) + '<button class="btn btn-sm btn-primary" data-act="review" data-id="' + e.id + '" data-d="Confirmed"' + (useShort(e) ? ' data-override="1"' : '') + '>' + (use ? (useShort(e) ? 'Approve anyway' : 'Approve') : 'Confirm') + '</button><button class="btn btn-sm btn-danger" data-act="rejectModal" data-id="' + e.id + '">Reject</button></div>';
  else if (use && e.status === 'Confirmed' && !e.toId && e.date >= today() && (isAdmin() || e.username === S.me.username)) acts = '<div class="acts"><button class="btn btn-sm btn-ghost" data-act="moveUse" data-id="' + e.id + '">Reschedule</button></div>';
  return '<li class="row tap' + (opts.review ? ' rv' : '') + '" data-entry="' + e.id + '" tabindex="0"><span class="mark ' + cls + '">' + ic(use ? 'plane' : (CAT_ICON[e.category] || 'plus')) + '</span>' +
    '<div class="body"><div class="t">' + title + '</div><div class="m">' + meta + '</div>' + (toPill(e) ? '<div class="m">' + toPill(e) + '</div>' : '') + '</div>' +
    (e.type === 'EARN' && e.category !== 'Travel order' && typeof toOn === 'function' && toOn(e.username, e.date) ? '<span class="pill Rejected" title="This person is on a travel order on this date">On TO</span>' : '') +
    (e._saving ? '<span class="pill off">Saving…</span>' : opts.review || e.status === 'Confirmed' ? '' : '<span class="pill ' + e.status + '">' + e.status + '</span>') +
    '<span class="amt ' + (use ? 'minus' : 'plus') + '">' + fDs(use ? -e.days : e.days, true) + '</span>' + acts + '</li>';
}
function tile(k, v, s, cls, icon, go){
  var tag = go ? 'button' : 'div';
  return '<' + tag + ' class="panel tile ' + (cls||'') + '"' + (go ? ' ' + go : '') + '><span class="k">' + (icon ? '<span class="ib">' + ic(icon) + '</span>' : '') + k + (go ? '<span class="go">' + ic('right') + '</span>' : '') + '</span><span class="v">' + v + '</span><span class="s">' + s + '</span></' + tag + '>';
}
function divSelect(id, val, label, withAll, withNone){
  return '<select class="input" id="' + id + '" name="division" aria-label="' + (label || 'Division') + '">' + (withAll ? '<option value="all">All divisions</option>' : '') + (withNone ? '<option value="">No division</option>' : '') +
    S.divisions.map(function(d){ return '<option value="' + esc(d.id) + '"' + (val === d.id ? ' selected' : '') + '>' + esc(d.short || d.name) + '</option>'; }).join('') + '</select>';
}
function panel(title, icon, body, extra, span){ return '<section class="panel ' + (span || '') + '"><div class="panel-h"><h2>' + (icon ? ic(icon) : '') + title + '</h2>' + (extra || '') + '</div>' + body + '</section>'; }
function empty(icon, title, text, btn){ return '<div class="empty"><div class="ill">' + ic(icon) + '</div><b>' + title + '</b>' + text + (btn ? '<div style="margin-top:12px">' + btn + '</div>' : '') + '</div>'; }

/* ---------- charts ---------- */
function trendData(users, n){
  var m = curMonth(), out = [];
  for (var i = n - 1; i >= 0; i--){
    var mm = shiftMonth(m, -i), earned = 0, used = 0;
    S.entries.forEach(function(e){ if (e.status !== 'Confirmed' || e.date.slice(0,7) !== mm || users.indexOf(e.username) < 0) return; if (e.type === 'EARN') earned += e.days; else used += e.days; });
    out.push({ m: mm, earned: earned, used: used });
  }
  return out;
}
function trendChart(data){
  var W = 560, H = 200, pl = 30, pb = 26, pt = 10, max = Math.max(2, Math.ceil(Math.max.apply(null, data.map(function(d){ return Math.max(d.earned, d.used); })))), step = max <= 4 ? 1 : Math.ceil(max / 4);
  max = Math.ceil(max / step) * step;
  var gw = (W - pl) / data.length, bw = Math.min(22, gw / 3.2), y = function(v){ return pt + (H - pt - pb) * (1 - v / max); };
  var g = '';
  for (var t = 0; t <= max; t += step) g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y(t) + '" y2="' + y(t) + '" style="stroke:var(--line)" stroke-dasharray="3 4"/><text x="' + (pl - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>';
  data.forEach(function(d, i){
    var cx = pl + gw * i + gw / 2, cur = i === data.length - 1;
    g += '<rect x="' + (cx - bw - 2) + '" y="' + y(d.earned) + '" width="' + bw + '" height="' + (y(0) - y(d.earned)) + '" rx="4" style="fill:var(--brand)' + (cur ? ';opacity:.55' : '') + '"><title>' + fMonth(d.m) + ': earned ' + fD(d.earned) + '</title></rect>';
    g += '<rect x="' + (cx + 2) + '" y="' + y(d.used) + '" width="' + bw + '" height="' + (y(0) - y(d.used)) + '" rx="4" style="fill:var(--sun)"><title>' + fMonth(d.m) + ': used ' + fD(d.used) + '</title></rect>';
    g += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + mShort(d.m) + '</text>';
  });
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Offsets earned and used per month">' + g + '</svg></div>' +
    '<div class="legend"><span><i style="background:var(--brand)"></i>Earned (confirmed)</span><span><i style="background:var(--sun)"></i>Used</span><span class="hint">This month is lighter: still counting</span></div>';
}

/* ---------- dashboard widgets ---------- */
var WIDGETS = {
  admin: [
    ['mine', 'Your offset', 12], ['kpis', 'Summary tiles', 12], ['balances', 'Staff balances', 7], ['queue', 'Waiting for review', 5],
    ['trend', 'Earned vs used chart', 7], ['divisions', 'Balances by division', 5], ['daysoff', 'Upcoming days off', 6], ['holidays', 'Upcoming holidays', 6], ['activity', 'Recent activity', 12]
  ],
  employee: [
    ['hero', 'Balance card', 12], ['kpis', 'Summary tiles', 12], ['recent', 'Recent activity', 7], ['requests', 'My days off', 5], ['trend', 'My monthly chart', 7], ['holidays', 'Upcoming holidays', 5]
  ]
};
/* Admins see their own offset in the summary tiles, so the separate "Your offset" strip is not needed. */
WIDGETS.admin = WIDGETS.admin.filter(function(w){ return w[0] !== 'mine'; });
function ensureComing(){ Object.keys(WIDGETS).forEach(function(k){ var L = WIDGETS[k], at = 0, has = false; for (var i = 0; i < L.length; i++){ if (L[i][0] === 'coming') has = true; if (L[i][0] === 'kpis' || L[i][0] === 'leave' || L[i][0] === 'hero') at = i + 1; } if (!has) L.splice(at, 0, ['coming', 'Coming up', 12]);
    // "This week" (coverage + who is out per day) sits right after the summary, before Coming up
    if (!L.some(function(w){ return w[0] === 'week'; })) L.splice(at, 0, ['week', 'This week', 12]);
    if (!L.some(function(w){ return w[0] === 'mytrips'; })) L.unshift(['mytrips', 'Your dispatches', 12]); }); }
function widgetPrefs(){ ensureComing();
  var role = wRole(), all = WIDGETS[role].map(function(w){ return w[0]; }), saved = null;
  try { saved = JSON.parse(lGet('pio_w_' + role) || 'null'); } catch(e){}
  // Phones start with a shorter dashboard; everything can be turned back on in Customize.
  // Admins start with what needs action (reviews, who's out, what's coming), then the reference panels.
  if ((!saved || !saved.order) && role === 'admin'){ var first = ['mytrips','kpis','queue','week','out','coming','tos','daysoff','tevsum','balances'];
    all = all.slice().sort(function(a, b){ var i = first.indexOf(a), j = first.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); }
  if (!saved || !saved.order) return { order: all, hidden: window.innerWidth < 700 ? (role === 'admin' ? ['balances','trend','divisions','daysoff','holidays','activity'] : role === 'regular' ? ['trend','recent','hero','holidays'] : ['trend','holidays','recent']) : [] };
  if (all.indexOf('mytrips') >= 0 && saved.order.indexOf('mytrips') < 0) saved.order.unshift('mytrips');
  all.forEach(function(id){ if (saved.order.indexOf(id) < 0) saved.order.push(id); });
  saved.order = saved.order.filter(function(id){ return all.indexOf(id) >= 0; });
  return saved;
}
/* Dashboards: admins, regular/casual staff (leaves first) and JO/COS staff (offsets first). */
function wRole(){ return isAdmin() ? 'admin' : hasLeaves() ? 'regular' : 'employee'; }
/* Folded panels show only their title bar. Admins start with the reference panels folded;
   opening or closing one is remembered on this device. */
function wFolded(){ var role = wRole(), f = null; try { f = JSON.parse(lGet('pio_fold_' + role) || 'null'); } catch(e){}
  return Array.isArray(f) ? f : role === 'admin' ? ['balances','trend','divisions','holidays','activity'] : []; }
function foldable(html, id, folded){
  if (html.indexOf('<section class="panel ') !== 0) return html;
  return html.replace('<section class="panel ', '<section data-w="' + id + '" class="panel ' + (folded ? 'folded ' : ''))
    .replace('<h2>', '<h2><button type="button" class="fold-t" id="wf-' + id + '" data-act="wFold" data-w="' + id + '" aria-expanded="' + !folded + '">')
    .replace('</h2>', '<span class="fold-c" aria-hidden="true">' + ic('right') + '</span></button></h2>'); }
function widgetDef(id){ ensureComing(); return WIDGETS[wRole()].filter(function(w){ return w[0] === id; })[0]; }

/* Greeting by time of day in the Philippines. */
function greeting(){
  var h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', hour12: false }).format(new Date()) % 24;
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
/* A light, friendly line under the greeting, picked from what is going on. */
// the same line all day (per person), so it does not change every time the page updates
function pick(list){ var k = today() + (S.me ? S.me.username : '') + list[0], h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return list[Math.abs(h) % list.length]; }
function offDay(d){ return isWeekend(d) || !!holidayOn(d); }
function nextLongWeekend(){
  var td = today();
  for (var i = -3; i < 35; i++){
    var d = addDays(td, i);
    if (!offDay(d) || offDay(addDays(d, -1))) continue;
    var end = d; while (offDay(addDays(end, 1))) end = addDays(end, 1);
    var len = Math.round((pd(end) - pd(d)) / 864e5) + 1;
    if (len >= 3 && end >= td){
      var h = null; for (var k = d; k <= end; k = addDays(k, 1)){ if (holidayOn(k)){ h = holidayOn(k); break; } }
      return { start: d, end: end, len: len, holiday: h, now: d <= td };
    }
  }
  return null;
}
function bridgeDay(){
  var td = today();
  for (var i = 1; i < 35; i++){
    var d = addDays(td, i), h = holidayOn(d), w = pd(d).getDay();
    if (!h) continue;
    if (w === 2 && !offDay(addDays(d, -1))) return { holiday: h, date: d, bridge: addDays(d, -1) };
    if (w === 4 && !offDay(addDays(d, 1))) return { holiday: h, date: d, bridge: addDays(d, 1) };
  }
  return null;
}
/* One factual line under the greeting: the most useful thing to know today, or nothing. */
function quip(){
  var lw = nextLongWeekend(), br = bridgeDay();
  var span = lw ? fDate(lw.start, { month:'short', day:'numeric' }) + '–' + fDate(lw.end, { month:'short', day:'numeric' }) : '';
  if (lw && lw.now) return 'Long weekend until ' + fDate(lw.end, { weekday:'long', month:'short', day:'numeric' }) + (lw.holiday ? ' (' + lw.holiday.name + ').' : '.');
  if (isAdmin()){
    var p = pending().filter(canReview).length;
    if (p) return p + (p === 1 ? ' entry is' : ' entries are') + ' waiting for your review.';
  }
  if (lw) return 'Long weekend ahead: ' + span + (lw.holiday ? ' (' + lw.holiday.name + ')' : '') + '.';
  var st = stats(S.me.username);
  if (br && st.free >= 1) return br.holiday.name + ' is on a ' + fDate(br.date, { weekday:'long' }) + '. A day off on ' + fDate(br.bridge, { weekday:'long', month:'short', day:'numeric' }) + ' makes a 4-day weekend.';
  if (!isAdmin() && st.pendN + st.reqN) return (st.pendN + st.reqN) + (st.pendN + st.reqN === 1 ? ' entry is' : ' entries are') + ' waiting for review.';
  if (st.avail >= 1) return fD(st.avail) + ' of offset available.';
  if (st.month > 0) return '+' + fD(st.month) + ' earned this month, usable from ' + closesOn(curMonth()) + '.';
  return '';
}
function viewDashboard(){
  var adm = isAdmin(), P = widgetPrefs(), html = '';
  var staff = S.users.filter(function(u){ return u.active && (!adm || S.dashDiv === 'all' || u.division === S.dashDiv); });
  var W = adm ? adminWidgets(staff) : empWidgets(); W.coming = comingWidget; W.week = weekWidget; W.mytrips = myTripsWidget;
  // Pack widgets into full rows of 12 so side-by-side boxes always line up:
  // a box that would leave a gap at the end of its row is widened to fill it.
  // Folded panels are half width, so they pair up into tidy rows.
  var F = wFolded();
  var items = P.order.filter(function(id){ return P.hidden.indexOf(id) < 0 && W[id] && W[id](widgetDef(id)[2]); }).map(function(id){ var f = F.indexOf(id) >= 0; return { id: id, f: f, n: f ? 6 : widgetDef(id)[2] }; });
  var row = [], used = 0;
  function closeRow(){ if (row.length && used < 12){ var grow = 12 - used, k = row.length; row.forEach(function(it, i){ var add = Math.floor(grow / k) + (i < grow % k ? 1 : 0); it.n += add; }); } row = []; used = 0; }
  items.forEach(function(it){ if (used + it.n > 12) closeRow(); row.push(it); used += it.n; if (used === 12) closeRow(); });
  closeRow();
  items.forEach(function(it){ html += foldable(W[it.id](it.n), it.id, it.f); });
  var toReview = adm ? pending().filter(canReview).length : 0;
  var actions = (adm
      ? (toReview ? '<button class="btn btn-glass" data-go="log">' + ic('plus') + 'Add offset</button><button class="btn btn-sun" data-go="approvals">' + ic('check') + 'Review ' + toReview + '</button>'
                  : '<button class="btn btn-sun" data-go="log">' + ic('plus') + 'Add offset</button>')
      : (hasLeaves() ? '<button class="btn btn-glass" data-go="leaves">' + ic('plane') + 'My leaves</button>' : '') + '<button class="btn btn-sun" data-go="log">' + ic('plus') + 'Log offset</button>');
  return { eyebrow: fDate(today(), { weekday:'long', month:'long', day:'numeric', year:'numeric' }),
    title: greeting() + ', ' + esc(S.me.name.split(' ')[0]) + '!',
    sub: (adm ? officeToday() + (S.dashDiv === 'all' ? '' : ' · ' + esc(divOf(S.dashDiv).short)) : (S.me.division ? divChip(S.me.division) + ' · ' : '') + (hasLeaves() ? esc(S.me.empType) + ' · vacation and sick leave grow by 1.25 days a month.' : esc(S.me.empType || 'JO') + ' · unused offsets carry over every month.')) + (function(){ var q = quip(); return q ? '<span class="quip">' + ic('flag') + '<span>' + esc(q) + '</span></span>' : ''; })() + fieldCrew(),
    actions: actions, body: '<div class="grid dash">' + (html || '<div class="span-12 panel">' + empty('sliders', 'Your dashboard is empty', 'Turn widgets back on to see your numbers.', '<button class="btn btn-primary" data-act="customize">Customize</button>') + '</div>') + '</div>' +
      (html ? '<div class="dash-foot"><button class="btn btn-sm btn-ghost" data-act="customize">' + ic('sliders') + 'Customize dashboard</button></div>' : '') };
}
/* the line under the greeting: what is happening across the office today */
function officeToday(){
  var td = today(), ev = (S.events || []).filter(function(e){ return e.status !== 'Cancelled' && e.date <= td && (e.dateTo || e.date) >= td; });
  if (!ev.length) return 'A quiet day across the office: no events today.';
  var need = ev.filter(function(e){ return evState(e) === 'need'; }).length;
  return 'Today across the office: ' + ev.length + (ev.length === 1 ? ' event' : ' events') + (need ? ', ' + need + ' still ' + (need === 1 ? 'needs' : 'need') + ' people.' : ', all covered.');
}
function span(n){ return 'span-' + n; }
function adminWidgets(staff){
  var all = sumStats(staff), pend = pending(), m = curMonth(), td = today(), mine = stats(S.me.username);
  var rows = staff.map(function(u){ return { u: u, s: stats(u.username) }; }).sort(function(a,b){ return byDiv(a.u, b.u); });
  return {
    mine: function(n){ return '<button class="mine ' + span(n) + '" data-act="requestModal"><span class="k">Your offset</span><b>' + fD(mine.avail) + ' available</b><span class="hint">' + (mine.month ? '+' + fD(mine.month) + ' this month · ' : '') + (mine.pendN + mine.reqN ? (mine.pendN + mine.reqN) + ' waiting for another admin' : 'Nothing waiting') + '</span><span class="go">Use offset' + ic('right') + '</span></button>'; },
    kpis: function(n){ return '<div class="tiles ' + span(n) + '">' +
      tile('To review', pend.length, pending('USE').length + ' day-off ' + (pending('USE').length === 1 ? 'request' : 'requests') + ' · ' + pending('EARN').length + ' offsets', pend.length ? 'warn' : '', 'clock', 'data-go="approvals"') +
      tile('Your offset', fD(mine.avail), (mine.month ? '+' + fD(mine.month) + ' this month · ' : '') + (mine.pendN + mine.reqN ? (mine.pendN + mine.reqN) + ' waiting for another admin' : 'Tap to use offset'), '', 'shield', 'data-act="requestModal"') +
      tile(mShort(m) + ' so far', '+' + fD(all.month), 'Usable on ' + closesOn(m), '', 'month', 'data-go="monthly"') +
      tile('Used in ' + mShort(m), fD(all.usedM), 'Days off taken in ' + mShort(m), '', 'plane', 'data-rec="type:USE"') + '</div>' + gapNote(); },
    balances: function(n){ return panel('Staff balances', 'users', rows.length ? '<div class="table-wrap"><table class="cards"><thead><tr><th>Employee</th><th class="r">Available</th><th class="r">This month</th><th></th></tr></thead><tbody>' +
        rows.map(function(r){ return '<tr class="tap" data-grp="' + esc(r.u.division) + '" data-person="' + esc(r.u.username) + '" tabindex="0"><td><b>' + esc(r.u.name) + '</b><div class="hint">' + esc(r.u.empType) + '</div></td><td class="r num"><b>' + fD(r.s.avail) + '</b>' + (r.s.reqDays ? '<div class="hint">' + fD(r.s.reqDays) + ' requested</div>' : '') + '</td><td class="r num">' + (r.s.month ? '+' + fD(r.s.month) : '—') + '</td>' +
          '<td class="r"><button class="btn btn-sm btn-ghost" data-act="useModal" data-u="' + esc(r.u.username) + '"' + (r.s.avail > 0 && r.u.username !== S.me.username ? '' : ' disabled') + ' aria-label="Record offset use for ' + esc(r.u.name) + '">' + ic('minus') + 'Use</button></td></tr>'; }).join('') + '</tbody></table></div>'
        : empty('users', 'No staff here yet', 'Add employees in Staff, or pick another division.'), divSelect('dashDiv', S.dashDiv, 'Filter by division', true), span(n)); },
    // shown only when something is waiting; the "To review" tile already says when nothing is
    queue: function(n){ if (!pend.length) return ''; return panel('Waiting for review', 'clock', pend.length ? '<ul class="list">' + pend.slice(0, 4).map(function(e){ return entryRow(e, { showName: true, review: true }); }).join('') + '</ul>' : empty('check', 'All caught up', 'New offsets and day-off requests appear here.'),
        pend.length > 4 ? '<button class="btn btn-sm btn-ghost" data-go="approvals">All ' + pend.length + '</button>' : '', span(n)); },
    trend: function(n){ return panel('Earned vs used, last 6 months', 'chart', trendChart(trendData(staff.map(function(u){ return u.username; }), 6)), '', span(n)); },
    divisions: function(n){
      var data = S.divisions.map(function(d){ var us = S.users.filter(function(u){ return u.active && u.division === d.id; }); return { d: d, n: us.length, v: sumStats(us).avail }; });
      var mx = Math.max.apply(null, data.map(function(x){ return x.v; }).concat([1]));
      return panel('Balances by division', 'pie', data.length ? '<div class="hbar">' + data.map(function(x){ return '<div class="tap" data-div="' + esc(x.d.id) + '"><div class="r1"><span class="dchip" style="--dc:' + esc(x.d.color) + '"><i></i>' + esc(x.d.short) + '</span><b class="num">' + fD(x.v) + ' <span class="hint">· ' + x.n + ' staff</span></b></div><div class="track"><div class="fill" style="--dc:' + esc(x.d.color) + ';width:' + Math.max(2, x.v / mx * 100) + '%"></div></div></div>'; }).join('') + '</div>' : empty('pie', 'No divisions', 'Add divisions in Staff.'), '', span(n)); },
    daysoff: function(n){
      var list = S.entries.filter(function(e){ return e.type === 'USE' && e.status !== 'Rejected' && (e.date >= td || e.status === 'Pending'); }).sort(function(a,b){ return a.date < b.date ? -1 : 1; }).slice(0, 6);
      return panel('Upcoming days off', 'plane', list.length ? '<ul class="list">' + list.map(function(e){ return entryRow(e, { showName: true }); }).join('') + '</ul>' : empty('plane', 'No days off coming up', 'Approved requests and recorded days off appear here.'), '', span(n)); },
    holidays: function(n){ return holidayWidget(n); },
    activity: function(n){ return panel('Recent activity', 'history', S.activity.length ? '<ul class="list">' + S.activity.slice(0, 6).map(activityRow).join('') + '</ul>' : empty('history', 'No activity yet', 'Every change made in the app is recorded here.'),
        '<button class="btn btn-sm btn-ghost" data-act="openActivity">Full log</button>', span(n)); }
  };
}
function empWidgets(){
  var st = stats(S.me.username), m = curMonth(), td = today();
  return {
    hero: function(n){ return '<section class="hero ' + span(n) + '"><button class="hero-main" data-go="monthly"><span class="k">Available offset</span><span class="big">' + fD(st.avail) + '</span>' +
      '<span class="sub">' + (st.reqDays ? fD(st.reqDays) + ' requested · ' + fD(Math.max(st.free, 0)) + ' free to request' : 'Tap to see each month') + '</span></button>' +
      '<div class="hero-r"><button class="box" data-go="monthly"><span>' + fMonth(m) + ' so far</span><b>+' + fD(st.month) + '</b><span>Usable on ' + closesOn(m) + '</span></button>' +
      '<button class="btn btn-sun" data-act="requestModal"' + (st.free > 0 || st.month > 0 ? '' : ' disabled') + '>' + ic('plane') + 'Use offset</button></div></section>'; },
    kpis: function(n){ return '<div class="tiles three ' + span(n) + '">' +
      tile('To review', fD(st.pending + st.reqDays), (st.pendN + st.reqN) + ' not yet reviewed', st.pendN + st.reqN ? 'warn' : '', 'clock', 'data-rec="status:Pending"') +
      tile('Earned this year', fD(st.earnedY), 'Confirmed in ' + td.slice(0,4), '', 'plus', 'data-rec="type:EARN"') +
      tile('Used this year', fD(st.usedY), st.lastUse ? 'Last day off ' + fDate(st.lastUse) : 'No days off yet', '', 'plane', 'data-rec="type:USE"') + '</div>'; },
    recent: function(n){ var list = sorted(S.entries.filter(function(e){ return e.type === 'EARN'; })).slice(0, 6);
      return panel('Recent offsets', 'list', list.length ? '<ul class="list">' + list.map(function(e){ return entryRow(e); }).join('') + '</ul>' : empty('plus', 'No offsets logged yet', 'When you work beyond the ' + S.settings.workdays + '-day schedule, log it with the event and venue.', '<button class="btn btn-primary" data-go="log">' + ic('plus') + 'Log your first offset</button>'),
        '<button class="btn btn-sm btn-ghost" data-go="records">See all</button>', span(n)); },
    requests: function(n){ var list = S.entries.filter(function(e){ return e.type === 'USE' && (e.date >= td || e.status === 'Pending'); }).sort(function(a,b){ return a.date < b.date ? -1 : 1; });
      return panel('My days off', 'plane', list.length ? '<ul class="list">' + list.map(function(e){ return entryRow(e); }).join('') + '</ul>' : empty('plane', 'No days off planned', 'Use offset on your balance card. An admin approves it.'), '', span(n)); },
    trend: function(n){ return panel('My last 6 months', 'chart', trendChart(trendData([S.me.username], 6)), '', span(n)); },
    holidays: function(n){ return holidayWidget(n); }
  };
}
function holidayWidget(n){
  var td = today(), list = S.holidays.filter(function(h){ return h.date >= td; }).slice(0, 5);
  return panel('Upcoming holidays', 'flag', list.length ? '<ul class="list">' + list.map(function(h){
    var days = Math.round((pd(h.date) - pd(td)) / 864e5);
    return '<li class="row tap" data-calday="' + h.date + '" tabindex="0"><span class="mark hol">' + ic('flag') + '</span><div class="body"><div class="t">' + esc(h.name) + '</div><div class="m">' + fDate(h.date, { weekday:'long', month:'long', day:'numeric' }) + '</div></div><span class="pill hol">' + (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days') + '</span></li>';
  }).join('') + '</ul>' : empty('flag', 'No holidays listed', isAdmin() ? 'Add holidays in Settings.' : 'An admin can add holidays in Settings.'), '', span(n));
}
function activityRow(a){
  var tgt = a.target && userOf(a.target) ? userName(a.target) : a.target;
  return '<li class="row"><span class="mark act">' + ic('history') + '</span><div class="body"><div class="t">' + esc(userName(a.actor)) + ' · ' + esc(a.action.toLowerCase()) + (tgt && a.target !== a.actor ? ' · ' + esc(tgt) : '') + '</div><div class="m">' + esc(a.details) + '</div></div><span class="hint" title="' + esc(when(a.at)) + '">' + ago(a.at) + '</span></li>';
}

/* ----- log offset ----- */
function earnFields(e, adm){
  e = e || {};
  var cat = e.category || 'Holiday', cats = [['Holiday','flag','Regular, special or local holiday'],['Weekend','sun','Saturday or Sunday'],['After 5 PM','moon','Events past office hours'],['Travel order','route','Beyond your ' + S.settings.workdays + ' workdays, not in payroll']];
  return (adm ? '<div class="field"><label for="fu">Employee</label><select class="input" id="fu" name="username">' +
      S.users.filter(function(u){ return u.active; }).map(function(u){ return '<option value="' + esc(u.username) + '"' + ((e.username || S.me.username) === u.username ? ' selected' : '') + '>' + esc(u.name) + (u.username === S.me.username ? ' (you)' : '') + '</option>'; }).join('') + '</select>' +
      '<span class="hint">Offsets you add for staff are confirmed right away.' + (otherAdmins() ? ' Your own go to another admin.' : '') + '</span></div>' : '') +
    '<div class="field"><label for="fe">Event name</label><input class="input" id="fe" name="event" maxlength="120" value="' + esc(e.event) + '" placeholder="e.g. Bantayog Festival opening program" required></div>' +
    '<div class="field"><label for="fv">Venue</label><input class="input" id="fv" name="venue" maxlength="120" value="' + esc(e.venue) + '" placeholder="e.g. Provincial Capitol Grounds, Daet" required></div>' +
    '<div class="field"><label for="fd">Date worked</label><input class="input" id="fd" name="date" type="date" max="' + today() + '" value="' + (e.date || today()) + '" required><span class="hint">Forgot to log? Pick the past date. It counts once confirmed.</span></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Type of extra work</legend><div class="seg four">' +
      cats.map(function(c, i){ return '<input type="radio" name="category" id="c' + i + '" value="' + c[0] + '"' + (cat === c[0] ? ' checked' : '') + '><label for="c' + i + '"><b>' + ic(c[1]) + c[0] + '</b><small>' + c[2] + '</small></label>'; }).join('') +
    '</div></fieldset>' +
    '<div id="dateCheck"></div>' +
    '<div class="field" id="toWrap"' + (cat === 'Travel order' ? '' : ' hidden') + '><label for="fto">Travel order</label><select class="input" id="fto" name="toId" data-cur="' + esc(e.toId || '') + '"></select><span class="hint">The travel order you were on that day.</span></div>' +
    '<div class="field" id="endWrap"' + (cat === 'After 5 PM' ? '' : ' hidden') + '><label for="ft">Event ended at</label><input class="input" id="ft" name="endTime" type="time" value="' + esc(e.endTime || '') + '"><span class="hint" id="endHint">Ends 1:00 AM or later = 1 day (8 hours or more). Earlier = ½ day.</span></div>' +
    '<fieldset class="field" id="amtWrap" style="border:0;padding:0;margin:0"' + (cat === 'After 5 PM' ? ' hidden' : '') + '><legend class="label" style="margin-bottom:6px">How much offset</legend><div class="seg two-up">' +
      '<input type="radio" name="days" id="a0" value="1"' + (e.days !== 0.5 ? ' checked' : '') + '><label for="a0"><b>1 day</b><small>8 hours or more</small></label>' +
      '<input type="radio" name="days" id="a1" value="0.5"' + (e.days === 0.5 ? ' checked' : '') + '><label for="a1"><b>½ day</b><small>About 4 hours</small></label>' +
    '</div></fieldset>' +
    '<label class="check" id="chkNoTO"' + (cat === 'Travel order' ? ' hidden' : '') + '><input type="checkbox" name="noTravelOrder"' + (cat === 'Travel order' ? '' : ' required') + (e.id ? ' checked' : '') + '><span><b>This work was not under a travel order.</b><br><span class="hint">For travel order days, choose the type \u201cTravel order\u201d instead.</span></span></label>' +
    '<label class="check" id="chkPayroll"' + (cat === 'Travel order' ? '' : ' hidden') + '><input type="checkbox" name="notInPayroll"' + (cat === 'Travel order' ? ' required' : '') + (e.id ? ' checked' : '') + '><span><b>This travel order day is not charged to payroll.</b><br><span class="hint">I already reached the ' + S.settings.workdays + ' workdays this month, so this day becomes an offset.</span></span></label>';
}
/* Smart checks: match the date with the type of work, and show what an "After 5 PM" entry counts as. */
function checkEarnForm(root, auto){
  root = root || document;
  var d = root.querySelector('#fd'), box = root.querySelector('#dateCheck'); if (!d || !box) return;
  var cat = (root.querySelector('input[name=category]:checked') || {}).value, h = holidayOn(d.value), wk = d.value && isWeekend(d.value);
  if (auto && h && cat !== 'Holiday'){ root.querySelector('#c0').checked = true; cat = 'Holiday'; }
  else if (auto && !h && wk && cat === 'Holiday'){ root.querySelector('#c1').checked = true; cat = 'Weekend'; }
  var msg = '';
  if (h) msg = '<div class="info-note">' + ic('flag') + '<span>' + fDate(d.value, { month:'long', day:'numeric' }) + ' is ' + esc(h.name) + ' (' + esc(h.kind) + ').</span></div>';
  if (cat === 'Weekend' && d.value && !wk) msg = '<div class="warn-note">' + ic('sun') + '<span>' + fDate(d.value, { weekday:'long' }) + ' is a weekday. Is this the right date?</span></div>';
  if (cat === 'Holiday' && d.value && !h) msg = '<div class="warn-note">' + ic('flag') + '<span>This date is not in the holiday list. If it is a local holiday, ask an admin to add it in Settings.</span></div>';
  var who = (root.querySelector('#fu') || {}).value || S.me.username, tros = d.value ? activeTOs().filter(function(t){ return t.usernames.indexOf(who) >= 0 && t.dateFrom <= d.value && t.dateTo >= d.value; }) : [];
  if (auto && tros.length && cat !== 'Travel order'){ root.querySelector('#c3').checked = true; cat = 'Travel order'; }
  var isTO = cat === 'Travel order', sel = root.querySelector('#fto');
  if (sel){ var cur = sel.value || sel.dataset.cur; sel.innerHTML = tros.map(function(t){ return '<option value="' + t.id + '"' + (t.id === cur ? ' selected' : '') + '>' + esc(t.event) + ' · ' + esc(fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric' })) + (t.toNo ? ' · TO No. ' + esc(t.toNo) : '') + '</option>'; }).join('');
    var tSel = tros.filter(function(t){ return t.id === sel.value; })[0];
    if (isTO && tSel){ var fe = root.querySelector('#fe'), fv = root.querySelector('#fv'); if (fe && !fe.value) fe.value = tSel.event; if (fv && !fv.value && tSel.destination) fv.value = tSel.destination; } }
  if (isTO && !tros.length && d.value) msg += '<div class="warn-note">' + ic('route') + '<span>No travel order found for ' + (who === S.me.username ? 'you' : esc(userName(who))) + ' on this date. File the travel order first, then log the offset.</span></div>';
  if (!isTO && tros.length) msg += '<div class="warn-note" style="background:var(--red-soft);color:var(--red)">' + ic('route') + '<span>' + (who === S.me.username ? 'You are' : esc(userName(who)) + ' is') + ' on a travel order this day (' + esc(tros[0].event) + '). If it went beyond the ' + S.settings.workdays + ' workdays, choose the type \u201cTravel order\u201d. Otherwise it will be flagged for the admin.</span></div>';
  root.querySelector('#toWrap').hidden = !isTO;
  root.querySelector('#chkNoTO').hidden = isTO; root.querySelector('#chkNoTO input').required = !isTO;
  root.querySelector('#chkPayroll').hidden = !isTO; root.querySelector('#chkPayroll input').required = isTO;
  box.innerHTML = msg;
  var after = cat === 'After 5 PM';
  root.querySelector('#endWrap').hidden = !after; root.querySelector('#amtWrap').hidden = after;
  root.querySelector('#ft').required = after;
  var t = root.querySelector('#ft').value, hint = root.querySelector('#endHint');
  if (after && t) hint.innerHTML = (t >= '17:00' && t < '19:00') ? '<b style="color:var(--red)">Events that end before 7:00 PM are not counted.</b>' : 'Counts as <b>' + ((t >= '01:00' && t < '12:00') ? '1 day' : '½ day') + '</b>. Ends 1:00 AM or later = 1 day.';
}
function viewLog(){
  var adm = isAdmin(), pre = S.prefill || {}; S.prefill = null;
  return { eyebrow: 'Offsets', title: adm ? 'Add an offset' : 'Log an offset', sub: adm ? 'Log your own extra work, or add one for a staff member who forgot.' : 'Log extra work beyond the ' + S.settings.workdays + '-day schedule. An admin confirms it before it counts.',
    actions: '<button class="btn btn-glass" data-act="requestModal">' + ic('plane') + 'Use offset</button>',
    body: '<div class="grid"><form class="panel panel-b stack span-7" data-form="earn" id="earnForm">' + earnFields({ username: pre.username }, adm) +
      '<p class="error" id="err" role="alert"></p><div><button class="btn btn-primary btn-lg" type="submit">' + ic('plus') + (adm ? 'Save offset' : 'Submit for confirmation') + '</button></div></form>' +
      panel('How offsets are counted', 'shield', '<div class="panel-b stack" style="font-size:14px;color:var(--ink-2)">' +
        [['month','The regular schedule is ' + S.settings.workdays + ' workdays a month. Days worked beyond it are offsets.'],
         ['moon','After 5 PM: events that end 1:00 AM or later count as 1 day. Earlier counts as ½ day.'],
         ['clock','What you log in ' + fMonth(curMonth()) + ' becomes usable on ' + closesOn(curMonth()) + '.'],
         ['refresh', S.settings.carryCap ? 'Unused offsets carry over, up to ' + fD(S.settings.carryCap) + '. Anything above that is forfeited at the start of a month.' : 'Unused offsets carry over to the next months. They do not expire.'],
         ['route','Travel order days count as offsets only when you already reached the ' + S.settings.workdays + ' workdays that month and the day was not charged to payroll. Choose the type \u201cTravel order\u201d.']].map(function(x){ return '<div style="display:flex;gap:10px"><span style="color:var(--brand-strong)">' + ic(x[0]) + '</span><span>' + x[1] + '</span></div>'; }).join('') + '</div>', '', 'span-5') + '</div>' };
}

/* ----- approvals ----- */
function viewApprovals(){
  var req = pending('USE'), off = pending('EARN');
  function block(list, title, icon, kind){
    var ok = list.filter(canReview).length;
    return panel(title + ' <span class="pill ' + (list.length ? 'Pending' : 'off') + '">' + list.length + '</span>', icon,
      list.length ? '<ul class="list">' + list.map(function(e){ return entryRow(e, { showName: true, review: true }); }).join('') + '</ul>' : empty(icon, 'All caught up', kind === 'USE' ? 'Day-off requests from staff appear here.' : 'Offsets logged by staff appear here.'),
      ok > 1 ? '<button class="btn btn-sm btn-primary" data-act="confirmAll" data-k="' + kind + '">' + ic('check') + (kind === 'USE' ? 'Approve all ' : 'Confirm all ') + ok + '</button>' : '', 'span-12');
  }
  return { eyebrow: 'Approvals', title: 'Waiting for review', sub: (req.length + off.length) ? 'Tap an entry to see its details before deciding. Rejections ask for a short reason.' : 'Nothing to review right now.',
    body: '<div class="grid">' + block(req, 'Day-off requests', 'plane', 'USE') + block(off, 'Offsets logged', 'plus', 'EARN') + '</div>' };
}

/* ----- calendar ----- */
/* ----- monthly summary & report ----- */
function monthRows(m){
  var dv = S.dashDiv;
  return S.users.filter(function(u){ return dv === 'all' || u.division === dv; }).map(function(u){ return { u: u, s: ledgerMonth(u.username, m) }; })
    .filter(function(r){ return r.u.active || r.s.earned || r.s.used || r.s.open; }).sort(function(a,b){ return byDiv(a.u, b.u); });
}
function viewMonthly(){
  var m = S.mon || curMonth(), adm = isAdmin(), open = m >= curMonth(), cap = S.settings.carryCap, nm = fDate(nextMonthStart(m), { month:'short', day:'numeric' });
  var status = open ? '<span class="pill Pending">Counting · closes ' + nm + '</span>' : '<span class="pill Confirmed">Counted</span>';
  var nav = '<div class="cal-nav"><button class="icon-btn" data-act="monPrev" aria-label="Previous month">' + ic('left') + '</button><h2>' + fMonth(m) + '</h2><button class="icon-btn" data-act="monNext" aria-label="Next month"' + (m >= curMonth() ? ' disabled' : '') + '>' + ic('right') + '</button></div>';
  var body, head = '<div class="print-head"><img src="' + LOGO + '" alt=""><div><b>Provincial Information Office · Camarines Norte</b><div>Offset report · ' + fMonth(m) + (S.dashDiv !== 'all' ? ' · ' + esc(divOf(S.dashDiv).name) : '') + '</div></div></div>';
  if (adm){
    var rows = monthRows(m), tot = { open: 0, forfeit: 0, earned: 0, used: 0, close: 0, pending: 0 };
    rows.forEach(function(r){ Object.keys(tot).forEach(function(k){ tot[k] += r.s[k]; }); });
    function cells(x){ return '<td class="r num">' + (x.open ? fD(x.open) : '—') + '</td>' + (cap ? '<td class="r num minus">' + (x.forfeit ? '−' + fD(x.forfeit) : '—') + '</td>' : '') + '<td class="r num plus">' + (x.earned ? '+' + fD(x.earned) : '—') + '</td><td class="r num minus">' + (x.used ? '−' + fD(x.used) : '—') + '</td><td class="r num"><b>' + fD(x.close) + '</b></td><td class="r num">' + (x.pending ? fD(x.pending) : '—') + '</td>'; }
    body = head + '<section class="panel"><div class="panel-h no-print">' + nav + '<div class="filters">' + divSelect('dashDiv', S.dashDiv, 'Filter by division', true) + status + '</div></div>' +
      '<div class="table-wrap"><table class="cards"><thead><tr><th>Employee</th><th>Employment</th><th class="r">Carried over</th>' + (cap ? '<th class="r">Forfeited</th>' : '') + '<th class="r">Earned</th><th class="r">Used</th><th class="r">Balance ' + nm + '</th><th class="r">Pending</th></tr></thead><tbody>' +
      rows.map(function(r){ return '<tr class="tap" data-grp="' + esc(r.u.division) + '" data-person="' + esc(r.u.username) + '" tabindex="0"><td><b>' + esc(r.u.name) + '</b></td><td>' + esc(r.u.empType) + '</td>' + cells(r.s) + '</tr>'; }).join('') +
      '<tr class="total"><td>Total</td><td>' + rows.length + ' staff</td>' + cells(tot) + '</tr></tbody></table></div></section>';
  } else {
    var s = ledgerMonth(S.me.username, m), list = sorted(S.entries.filter(function(e){ return e.date.slice(0,7) === m; }));
    body = head + '<section class="panel"><div class="panel-h no-print">' + nav + status + '</div><div class="panel-b"><div class="tiles">' +
      tile('Carried over', fD(s.open), s.forfeit ? fD(s.forfeit) + ' forfeited (over the cap)' : 'Left from earlier months', '', 'refresh') +
      tile('Earned', '+' + fD(s.earned), s.pending ? fD(s.pending) + ' still waiting for review' : 'Confirmed offsets', s.pending ? 'warn' : '', 'plus') +
      tile('Used', '−' + fD(s.used), 'Days off in ' + mShort(m), '', 'plane') +
      tile('Balance on ' + nm, fD(s.close), open ? 'If nothing else changes' : 'Carried into ' + mShort(shiftMonth(m, 1)), '', 'shield') + '</div></div>' +
      (list.length ? '<ul class="list" style="border-top:1px solid var(--line)">' + list.map(function(e){ return entryRow(e); }).join('') + '</ul>' : '<div class="empty">No offsets recorded in ' + fMonth(m) + '.</div>') + '</section>';
  }
  return { eyebrow: 'Offsets', title: 'Monthly summary', sub: 'Carried over + earned − used = balance on the 1st. ' + (cap ? 'Carry-over is capped at ' + fD(cap) + '.' : 'Unused offsets carry over.'),
    actions: '<button class="btn btn-glass" data-act="exportMonth">' + ic('download') + 'Download CSV</button><button class="btn btn-sun" data-act="print">' + ic('print') + 'Print report</button>', body: body };
}

/* ----- records & activity log ----- */
function viewRecords(){
  var adm = isAdmin(), f = S.rf;
  var tabs = adm ? '<div class="tabs" role="group" aria-label="Records view"><button data-act="recTab" data-t="entries" aria-pressed="' + (S.recTab === 'entries') + '">Entries</button><button data-act="recTab" data-t="activity" aria-pressed="' + (S.recTab === 'activity') + '">Activity log</button></div>' : '';
  if (adm && S.recTab === 'activity'){
    return { eyebrow: 'Records', title: 'Activity log', sub: 'Every change: who made it and when. This log cannot be edited.',
      actions: '<button class="btn btn-glass" data-act="exportActivity">' + ic('download') + 'Download CSV</button>',
      body: '<section class="panel"><div class="panel-h">' + tabs + '<span class="hint">' + S.activity.length + ' most recent actions</span></div><div style="padding:0 18px">' + actLegend() + '</div>' + (actList().length ? '<ul class="list">' + actList().map(activityRow).join('') + '</ul>' : empty('history', 'No activity yet', 'Changes will appear here.')) + '</section>' };
  }
  var list = filteredRecords();
  var net = list.reduce(function(s, e){ return e.status === 'Confirmed' ? s + (e.type === 'USE' ? -e.days : e.days) : s; }, 0);
  function sel(id, label, opts, val){ return '<select class="input" id="' + id + '" aria-label="' + label + '">' + opts.map(function(o){ return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  var filters = '<div class="filters">' + tabs + '<input class="input" type="search" id="rfQ" placeholder="Search name, event, venue" aria-label="Search records" autocomplete="off" enterkeyhint="search" value="' + esc(f.q || '') + '">' + (adm ? divSelect('rfDiv', f.div, 'Division', true) + sel('rfUser', 'Employee', [['all','All staff']].concat(S.users.map(function(u){ return [u.username, u.name]; })), f.user) : '') +
    sel('rfType', 'Type', [['all','Earned and used'],['EARN','Earned only'],['USE','Days off only']], f.type) + sel('rfStatus', 'Status', [['all','Any status'],['Confirmed','Confirmed'],['Pending','Pending'],['Rejected','Rejected']], f.status) + '</div>';
  // Speed: draw the newest 100 (then 100 more per tap). Search, filters and the CSV still cover everything.
  var lim = S.recLimit || 100, more = list.length - lim;
  var rows = list.slice(0, lim).map(function(e){
    return '<tr class="tap" data-entry="' + e.id + '" tabindex="0"><td class="num">' + fDate(e.date, { weekday:'short', month:'short', day:'numeric', year:'numeric' }) + '</td>' + (adm ? '<td>' + esc(userName(e.username)) + '</td>' : '') +
      '<td style="white-space:normal;min-width:180px"><b>' + (e.type === 'USE' ? 'Day off' : esc(e.event || '—')) + '</b><div class="hint">' + (e.type === 'USE' ? '' : esc(e.category) + (e.endTime ? ' · until ' + fTime(e.endTime) : '')) + '</div></td>' +
      '<td class="hint" style="white-space:normal;min-width:150px">' + esc(e.venue || '—') + '</td><td class="r num amt ' + (e.type === 'USE' ? 'minus' : 'plus') + '">' + fDs(e.type === 'USE' ? -e.days : e.days, true) + '</td>' +
      '<td><span class="pill ' + e.status + '">' + e.status + '</span>' + (toPill(e) ? ' ' + toPill(e) : '') + (e.note ? '<div class="hint" style="white-space:normal;max-width:220px">' + esc(e.note) + '</div>' : '') + '</td></tr>';
  }).join('');
  return { eyebrow: 'Records', title: adm ? 'All records' : 'My records', sub: 'Every offset earned and every day off.',
    actions: '<button class="btn btn-glass" data-act="exportRecords">' + ic('download') + 'Download CSV</button>',
    body: '<section class="panel"><div class="panel-h">' + filters + '<span class="hint num">' + list.length + (list.length === 1 ? ' entry' : ' entries') + ' · net ' + fD(net) + ' confirmed</span></div>' +
      (list.length ? '<div class="table-wrap"><table class="cards"><thead><tr><th>Date</th>' + (adm ? '<th>Employee</th>' : '') + '<th>Event</th><th>Venue</th><th class="r">Days</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (more > 0 ? '<div class="nmore"><button type="button" class="btn btn-sm btn-ghost" data-act="recMore">' + ic('plus') + 'Show ' + Math.min(100, more) + ' more <span class="hint">(' + more + ' not shown)</span></button></div>' : '')
        : empty('list', 'No matching entries', 'Try different filters.', '<button class="btn btn-sm btn-ghost" data-act="clearFilters">Clear filters</button>')) + '</section>' };
}
function filteredRecords(){
  var adm = isAdmin(), f = S.rf, q = (f.q || '').trim().toLowerCase();
  // the search box matches the person, event, venue, note or category (or "day off")
  function hit(e){ if (!q) return true; return [userName(e.username), e.event, e.venue, e.note, e.category, e.type === 'USE' ? 'day off' : ''].some(function(s){ return s && String(s).toLowerCase().indexOf(q) >= 0; }); }
  return sorted(S.entries.filter(function(e){ var u = userOf(e.username);
    return (!adm || f.user === 'all' || e.username === f.user) && (!adm || f.div === 'all' || (u && u.division === f.div)) && (f.type === 'all' || e.type === f.type) && (f.status === 'all' || e.status === f.status) && hit(e); }));
}

/* ----- staff & divisions ----- */
function viewStaff(){
  var ym = S.sdMon || today().slice(0, 7);
  var rows = S.users.slice().sort(function(a,b){ return byDiv(a, b) || (b.active - a.active); }).map(function(u){
    var st = stats(u.username), self = u.username === S.me.username, r = staffDays(u.username, ym);
    var days = u.active ? '<button type="button" class="st-days" data-act="monthTrips" data-m="' + ym + '" data-u="' + esc(u.username) + '" aria-label="' + esc(u.name + ', ' + fMonth(ym) + ': ' + r.field + ' field, ' + r.office + ' office, ' + r.off + ' off or leave. Open the list.') + '">' +
        '<span class="sd-bar" aria-hidden="true">' + [['field', r.field], ['office', r.office], ['off', r.off]].filter(function(x){ return x[1]; }).map(function(x){ return '<i class="sd-' + x[0] + '" style="flex:' + x[1] + '"></i>'; }).join('') + '</span>' +
        '<span class="st-dn"><b>' + r.field + '</b> field · <b>' + r.office + '</b> office · <b>' + r.off + '</b> off</span></button>' : '<span class="hint">—</span>';
    return '<tr class="tap" data-grp="' + esc(u.division) + '" data-person="' + esc(u.username) + '" tabindex="0"><td><div class="st-who">' + avatarHtml(u, 38) + '<div><b>' + esc(u.name) + '</b><div class="hint">@' + esc(u.username) + ' · <span class="cap">' + esc(u.role === 'scheduler' ? 'division leader' : u.role) + '</span> · ' + esc(u.empType || 'JO') + '</div></div></div></td>' +
      '<td>' + (u.noPin ? '<span class="pill Pending">PIN not set</span>' : u.active ? '<span class="pill Confirmed">Active</span>' : '<span class="pill off">Inactive</span>') + '</td><td class="st-dc">' + days + '</td><td class="r num">' + fD(st.avail) + '</td>' +
      '<td class="r"><button class="btn btn-sm btn-ghost" data-person="' + esc(u.username) + '">Manage' + (self ? ' (you)' : '') + '</button></td></tr>';
  }).join('');
  var divs = S.divisions.map(function(d){ var n = S.users.filter(function(u){ return u.division === d.id && u.active; }).length;
    return '<li class="row tap" data-act="divModal" data-id="' + esc(d.id) + '" tabindex="0">' + divBadge(d, 38) + '<div class="body"><div class="t">' + esc(d.name) + '</div><div class="m">' + n + ' active staff · shown as “' + esc(d.short) + '”</div></div><span class="hint">' + ic('edit') + '</span></li>'; }).join('');
  return { eyebrow: 'People', title: 'Staff', sub: 'Tap a person to manage their account.',
    actions: '<button class="btn btn-sun" data-act="focusAdd">' + ic('plus') + 'Add staff</button>',
    body: '<div class="grid">' + panel('Staff and their days', 'users', '<p class="hint" style="margin:0;padding:12px 18px 0">' + (S.users.length ? staffDays(S.users[0].username, ym).work : 0) + ' working days in ' + esc(fMonth(ym)) + ', counting weekdays and leaving out holidays. Field days are travel orders (weekends included); dispatch orders within the Capitol count as office days. Tap the days to see someone’s trips.</p>' +
      '<div class="table-wrap"><table class="cards st-tab"><thead><tr><th>Name</th><th>Status</th><th><span class="sd-key">' + esc(fMonth(ym)) + ' <i class="sd-field"></i>Field <i class="sd-office"></i>Office <i class="sd-off"></i>Off</span></th><th class="r">Offsets</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>',
      '<div class="row-btns wk-nav"><button type="button" class="icon-btn" data-act="sdNav" data-d="-1" aria-label="Previous month">' + ic('left') + '</button><span class="wk-lab">' + esc(fMonth(ym)) + '</span><button type="button" class="icon-btn" data-act="sdNav" data-d="1" aria-label="Next month">' + ic('right') + '</button></div>' + (function(){ var np = S.users.filter(function(u){ return u.noPin; }).length; return np ? '<button class="btn btn-sm btn-primary" data-act="setPins">' + ic('key') + 'Set PINs for ' + np + '</button>' : ''; })(), 'span-12') +
      panel('Divisions', 'pie', (divs ? '<ul class="list">' + divs + '</ul>' : empty('pie', 'No divisions', 'Add the PIO divisions so staff can choose theirs at sign-in.')) + '<div class="panel-b hint" style="border-top:1px solid var(--line)">Staff pick their division on the sign-in page.</div>', '<button class="btn btn-sm btn-primary" data-act="divModal">' + ic('plus') + 'Add division</button>', 'span-12') +
'</div>' };
}

/* days per person in a month, assuming everyone works on weekdays: field days (travel orders and dispatch
   orders, weekends included), days off and leave (weekdays), and office days (the remaining weekdays) */
function staffDays(u, ym, upto){
  var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, last = new Date(y, m + 1, 0).getDate(), r = { work: 0, field: 0, off: 0, office: 0 };
  for (var i = 1; i <= last; i++){
    var d = ymd(new Date(y, m, i)); if (upto && d > upto) break;
    var wk = [0, 6].indexOf(pd(d).getDay()) < 0 && !holidayOn(d);
    var s = statusOn(u, d), disp = !s && (S.events || []).some(function(e){ return e.status !== 'Cancelled' && evKind(e) === 'tasking' && e.date <= d && (e.dateTo || e.date) >= d && assignedOn(e, u, d); });
    if (wk) r.work++;
    if (s && s.kind === 'to'){ r.field++; continue; }
    if (wk && s){ r.off++; continue; }
    if (wk){ r.office++; if (disp) r.disp = (r.disp || 0) + 1; }
  }
  return r;
}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="sdNav"]'); if (!t) return;
  var ym = S.sdMon || today().slice(0, 7), dt = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + Number(t.dataset.d), 1); S.sdMon = ymd(dt).slice(0, 7); render(); });
function addStaffModal(){
  modal('Add staff', '<div class="field"><label for="an">Full name</label><input class="input" id="an" name="name" required></div>' +
    '<div class="two"><div class="field"><label for="au">Username</label><input class="input" id="au" name="username" autocapitalize="none" spellcheck="false" placeholder="e.g. jdelacruz" required></div><div class="field"><label for="ap">Starting PIN</label><input class="input pin" id="ap" name="pin" inputmode="numeric" maxlength="4" placeholder="4 digits" required></div></div>' +
    '<div class="two"><div class="field"><label for="ad">Division</label>' + divSelect('ad', '', 'Division', false, true) + '</div><div class="field"><label for="ar">Role</label><select class="input" id="ar" name="role"><option value="employee">Employee</option><option value="scheduler">Division leader</option><option value="admin">Admin</option></select></div></div>' +
    '<div class="field"><label for="aet">Employment</label><select class="input" id="aet" name="empType"><option value="JO">JO (Job order)</option><option value="COS">COS (Contract of service)</option><option>Casual</option><option>Regular</option></select><span class="hint">Regular and casual get CSC leave credits. JO and COS get wellness leave. Everyone can log offsets.</span></div>' +
    '<span class="hint">Give the PIN to the employee in person. They can change it after signing in.</span>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + ic('plus') + 'Add staff</button>', 'addUser');
  setTimeout(function(){ var an = document.getElementById('an'); if (an) an.focus(); }, 30);
}
/* ----- settings: rules, holidays, backup ----- */
function viewSettings(){
  var yr = S.holYear || today().slice(0,4);
  var years = {}; S.holidays.forEach(function(h){ years[h.date.slice(0,4)] = 1; }); years[today().slice(0,4)] = 1; years[String(+today().slice(0,4) + 1)] = 1;
  var hol = S.holidays.filter(function(h){ return h.date.slice(0,4) === yr; });
  return { eyebrow: 'Admin', title: 'Settings', sub: 'Office rules, holidays, reports and backups.',
    body: '<div class="grid">' +
      '<form class="panel span-6" data-form="settings"><div class="panel-h"><h2>' + ic('shield') + 'Office rules</h2></div><div class="panel-b stack">' +
        '<div class="field"><label for="sw">Regular workdays a month</label><input class="input num" id="sw" name="workdays" type="number" min="15" max="26" step="1" value="' + S.settings.workdays + '" required><span class="hint">Shown to staff as the schedule. Days worked beyond it are offsets.</span></div>' +
        '<div class="field"><label for="sc">Carry-over cap (days)</label><input class="input num" id="sc" name="carryCap" type="number" min="0" max="365" step="0.5" value="' + S.settings.carryCap + '" required><span class="hint">0 means no limit. With a cap, anything above it is forfeited at the start of each month. This applies to everyone right away, so tell staff first.</span></div>' +
        '<div class="field"><label for="swl">Wellness leave days a year</label><input class="input num" id="swl" name="wellnessDays" type="number" min="0" max="5" step="1" value="' + (S.settings.wellnessDays == null ? 5 : S.settings.wellnessDays) + '" required><span class="hint">CSC Resolution No. 2501292 lets agencies grant up to 5 days a year (non-cumulative, up to 3 days in a row).</span></div>' +
        '<div class="field"><label for="stb">TEV budget for the year (₱)</label><input class="input num" id="stb" name="tevBudget" type="number" min="0" step="0.01" value="' + (S.settings.tevBudget || 0) + '"><span class="hint">Used for “Left for spending” on the TEV page. 0 hides it.</span></div>' +
        '<p class="error" id="err" role="alert"></p><div><button class="btn btn-primary" type="submit">Save rules</button></div></div></form>' +
      panel('Backup and export', 'drive', '<div class="panel-b stack">' +
        (FIRE ? '' : '<div><b>Save a copy to Google Drive</b><p class="hint" style="margin:4px 0 8px">Makes a full copy of the Sheet in the admin’s Drive, PIN hashes included. Do this before big changes or at year-end.</p><button class="btn btn-ghost" data-act="backupDrive">' + ic('drive') + 'Save copy to Drive</button></div>') +
        '<div><b>Download a backup file</b><p class="hint" style="margin:4px 0 8px">Everything except PINs, as one JSON file, plus all entries as CSV for Excel.</p><div class="row-btns"><button class="btn btn-ghost" data-act="exportJson">' + ic('download') + 'Backup (.json)</button><button class="btn btn-ghost" data-act="exportAllCsv">' + ic('download') + 'All entries (.csv)</button></div></div>' +
        (FIRE ? '<div><b>Bring in data from the Google Sheet</b><p class="hint" style="margin:4px 0 8px">One time, after switching to Firebase. In the old app, download Settings > Backup (.json), then pick that file here. Existing records with the same ID are updated, nothing is deleted. PINs do not carry over: set them in Staff afterwards.</p><label class="btn btn-ghost" style="cursor:pointer">' + ic('upload') + 'Import backup (.json)<input type="file" id="importJson" accept=".json,application/json" hidden></label></div>' : '') +
        '<div><b>Monthly report</b><p class="hint" style="margin:4px 0 8px">Print or download per division from the Monthly page.</p><button class="btn btn-ghost" data-go="monthly">' + ic('month') + 'Open monthly report</button></div></div>', '', 'span-6') +
      panel('Holidays', 'flag', '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Holiday</th><th>Kind</th><th></th></tr></thead><tbody>' +
          (hol.length ? hol.map(function(h){ return '<tr><td class="num">' + fDate(h.date, { weekday:'short', month:'short', day:'numeric' }) + '</td><td><b>' + esc(h.name) + '</b></td><td><span class="pill hol">' + esc(h.kind) + '</span></td><td class="r"><button class="icon-btn" data-act="delHoliday" data-date="' + h.date + '" aria-label="Delete ' + esc(h.name) + '">' + ic('trash') + '</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="hint">No holidays for ' + yr + ' yet. Add them below when the Palace releases the list.</td></tr>') +
        '</tbody></table></div><form class="panel-b" data-form="holiday" style="border-top:1px solid var(--line)"><div class="filters" style="align-items:flex-end">' +
          '<div class="field"><label for="hd">Date</label><input class="input" id="hd" name="date" type="date" required></div><div class="field" style="flex:1;min-width:180px"><label for="hn">Name</label><input class="input" id="hn" name="name" maxlength="80" placeholder="e.g. Eid’l Fitr, Bantayog Festival" required></div>' +
          '<div class="field"><label for="hk">Kind</label><select class="input" id="hk" name="kind"><option>Regular</option><option>Special</option><option>Local</option></select></div><button class="btn btn-primary" type="submit">' + ic('plus') + 'Add</button></div><p class="error" id="herr" role="alert"></p>' +
          '<p class="hint" style="margin:0">National holidays update by themselves every week from Google’s Philippine holiday calendar. Add provincial and local holidays here.</p></form>',
        '<button class="btn btn-sm btn-ghost" data-act="syncHol">' + ic('refresh') + 'Update now</button><select class="input" id="holYear" aria-label="Year">' + Object.keys(years).sort().map(function(x){ return '<option' + (x === yr ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>', 'span-12') + '</div>' };
}

/* ---------- sheets (modals) ---------- */
var M = {}, lastFocus = null;
function modal(title, body, foot, form){
  if (!document.querySelector('#modal .scrim')) lastFocus = document.activeElement;
  var tag = form ? 'form data-form="' + form + '"' : 'div';
  document.getElementById('modal').innerHTML = '<div class="scrim" data-act="closeScrim"><' + tag + ' class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="panel-h"><h2 id="mt">' + title + '</h2><button type="button" class="icon-btn" data-act="close" aria-label="Close">' + ic('x') + '</button></div>' +
    '<div class="panel-b">' + body + '<p class="error" id="merr" role="alert"></p></div>' + (foot ? '<div class="modal-f">' + foot + '</div>' : '') + '</' + (form ? 'form' : 'div') + '></div>';
  document.body.classList.add('locked');
  var f = document.querySelector('#modal input:not([type=hidden]):not([type=file]):not([type=radio]):not([type=checkbox]), #modal select, #modal textarea');
  (form && f ? f : document.querySelector('#modal [data-act=close]')).focus();
}
(function(){
  var st = null;
  document.addEventListener('pointerdown', function(ev){
    if (window.innerWidth > 640 || ev.pointerType === 'mouse') return;
    var h = ev.target.closest && ev.target.closest('#modal .modal > .panel-h'); if (!h || ev.target.closest('button,input,select,textarea,a')) return;
    var md = h.parentNode; st = { y: ev.clientY, t: Date.now(), md: md, dy: 0 }; md.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('pointermove', function(ev){ if (!st) return; st.dy = Math.max(0, ev.clientY - st.y); st.md.style.transform = 'translateY(' + st.dy + 'px)'; }, { passive: true });
  var end = function(){ if (!st) return; var s0 = st, fast = s0.dy / Math.max(1, Date.now() - s0.t) > 0.6; st = null;
    s0.md.style.transition = 'transform .28s cubic-bezier(.22,1,.36,1)';
    if (s0.dy > 110 || (fast && s0.dy > 40)){ s0.md.style.transform = 'translateY(100%)'; setTimeout(function(){ var c = document.querySelector('#modal [data-act="close"]'); if (c) c.click(); else closeModal(); }, 200); }
    else { s0.md.style.transform = ''; setTimeout(function(){ s0.md.style.transition = ''; }, 300); } };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();
function closeModal(){ if (typeof CROP !== 'undefined' && CROP){ try { URL.revokeObjectURL(CROP.url); } catch(e){} CROP = null; }
  var open = !!document.querySelector('#modal .scrim');
  document.getElementById('modal').innerHTML = ''; document.body.classList.remove('locked'); M = {};
  if (open && lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  lastFocus = null;
}
function entryModal(id){
  var e = S.entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  var use = e.type === 'USE', adm = isAdmin(), u = userOf(e.username), pend = e.status === 'Pending';
  function f(k, v){ return v ? '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>' : ''; }
  var body = '<div class="detail-top"><span class="mark ' + (pend ? 'pend' : (use ? 'use' : 'earn')) + '">' + ic(use ? 'plane' : (CAT_ICON[e.category] || 'plus')) + '</span><div><div class="big-amt ' + (use ? 'minus' : 'plus') + '">' + (use ? '−' : '+') + fD(e.days) + '</div><span class="pill ' + e.status + '">' + e.status + '</span></div></div>' +
    (e.type === 'EARN' && e.category === 'Travel order' ? '<div class="info-note">' + ic('route') + '<span>From a travel order beyond the ' + S.settings.workdays + ' workdays, not charged to payroll' + (toOn(e.username, e.date) ? ': ' + esc(toOn(e.username, e.date).event) : '') + '.</span></div>' : '') +
    (e.type === 'EARN' && e.category !== 'Travel order' && toOn(e.username, e.date) ? '<div class="warn-note" style="background:var(--red-soft);color:var(--red)">' + ic('route') + '<span>On a travel order this day: ' + esc(toOn(e.username, e.date).event) + '. Check that this is not already counted in the DTR.</span></div>' : '') +
    (e.status === 'Rejected' && e.note ? '<div class="warn-note" style="background:var(--red-soft);color:var(--red)">' + ic('x') + '<span>Reason: ' + esc(e.note) + '</span></div>' : '') +
    '<div class="kvs">' + f('Employee', esc(userName(e.username)) + (u && u.division ? ' · ' + divChip(u.division) : '')) + f(use ? 'Day off' : 'Date', fDate(e.date, { weekday:'long', month:'long', day:'numeric', year:'numeric' }) + (holidayOn(e.date) ? ' · ' + esc(holidayOn(e.date).name) : '')) +
      (use ? '' : f('Type', esc(e.category) + (e.endTime ? ' · ended ' + fTime(e.endTime) : '')) + f('Event', esc(e.event)) + f('Venue', esc(e.venue)) +
        f('Counts toward', fMonth(e.date.slice(0,7)) + (e.date.slice(0,7) < curMonth() ? ' (usable now)' : ' (usable on ' + closesOn(e.date.slice(0,7)) + ')'))) +
      f(use && e.createdBy === e.username ? 'Requested by' : 'Logged by', (e.createdBy === e.username ? 'Self' : esc(userName(e.createdBy))) + ' · ' + when(e.createdAt)) +
      (e.reviewedBy && e.createdBy !== e.reviewedBy ? f(e.status === 'Rejected' ? 'Rejected by' : 'Approved by', esc(userName(e.reviewedBy)) + ' · ' + when(e.reviewedAt)) : '') + '</div>';
  var foot = '', mine = e.username === S.me.username, tst = toState(e), eto = entryTO(e);
  // its travel order, one tap away
  if (eto) body += '<div class="linkrow">' + ic('route') + '<span class="hint">Travel order:</span>' + linkTO(eto) + toStatusPill(eto) + '</div>';
  // weekday offsets and days off are valid only once their travel order is prepared
  if (tst === 'none' || tst === 'prep') body += '<div class="warn-note">' + ic('route') + '<span>' + (e.type === 'USE' ? 'A weekday day off' : 'An offset for weekday work') + ' is valid only with a prepared travel order. ' + (tst === 'none' ? 'There is no travel order for it yet.' : 'Its travel order is not prepared yet.') + '</span>' +
    (isAdmin() ? (use ? '<button type="button" class="btn btn-sm btn-primary" data-act="offsetPick" data-id="' + e.id + '">' + ic('route') + 'Pick event and prepare</button>'
      : tst === 'none' ? '<button type="button" class="btn btn-sm btn-ghost" data-act="startEntryTO" data-id="' + e.id + '">Start travel order</button>' : '<button type="button" class="btn btn-sm btn-ghost" data-go="travel">Open travel orders</button>') : '') + '</div>';
  if (e._saving){ modal(esc(e.event || 'Saving'), body + '<div class="info-note">' + ic('clock') + '<span>Still saving. You can open it again in a moment.</span></div>', '<button type="button" class="btn btn-ghost" data-act="close">Close</button>'); return; }
  if (adm || (mine && pend)) foot += '<button type="button" class="btn btn-danger" data-act="del" data-id="' + e.id + '" style="margin-right:auto">' + ic('trash') + 'Remove</button>';
  if (pend && (adm || mine)) foot += '<button type="button" class="btn btn-ghost" data-act="editEntry" data-id="' + e.id + '">' + ic('edit') + 'Edit</button>';
  if (pend && canReview(e)) foot += '<button type="button" class="btn btn-ghost" data-act="rejectModal" data-id="' + e.id + '">Reject</button><button type="button" class="btn btn-primary" data-act="review" data-id="' + e.id + '" data-d="Confirmed"' + (useShort(e) ? ' data-override="1"' : '') + '>' + ic('check') + (use ? (useShort(e) ? 'Approve anyway' : 'Approve') : 'Confirm') + '</button>';
  else if (pend && adm) foot += '<span class="hint" style="align-self:center">Another admin needs to review your own entry.</span>';
  else foot += '<button type="button" class="btn btn-ghost" data-act="close">Close</button>';
  modal(use ? (pend ? 'Day-off request' : 'Day off') : esc(e.event || 'Offset'), body, foot);
}
function editModal(id){
  var e = S.entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  M = { id: id };
  if (e.type === 'EARN') modal('Edit offset', '<div class="stack" id="editEarn">' + earnFields(e, false) + '</div>', '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save changes</button>', 'editEntry');
  else modal('Edit day-off request', daysFields(e.date, e.days), '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save changes</button>', 'editEntry');
  checkEarnForm(document.getElementById('modal'));
}
function daysFields(date, days){
  return '<div class="two"><div class="field"><label for="mdt">First day off</label><input class="input" id="mdt" name="date" type="date" value="' + (date || today()) + '" required></div>' +
    '<div class="field"><label for="md">Days</label><input class="input num" id="md" name="days" type="number" min="0.5" max="30" step="0.5" value="' + (days || 1) + '" required>' +
    '<div class="chips"><button type="button" class="chip" data-d="0.5">½ day</button><button type="button" class="chip" data-d="1">1 day</button><button type="button" class="chip" data-d="2">2 days</button></div></div></div>';
}
function requestModal(date){
  var st = stats(S.me.username);
  modal('Use offset', '<div class="mini-tiles"><div><span>Free to request</span><b>' + fD(Math.max(st.free, 0)) + '</b></div><div><span>Earned this month</span><b>' + fD(st.month) + '</b></div></div>' + daysFields(date) +
    (st.month > 0 ? earlyBox(st.month, st.free <= 0) : '') +
    '<span class="hint">' + (isAdmin() && otherAdmins() ? 'Another admin approves your request.' : isAdmin() ? 'You are the only admin, so this is approved right away.' : 'An admin approves it, then the days are deducted.') + '</span>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit"' + (st.free > 0 || st.month > 0 ? '' : ' disabled') + '>' + ic('plane') + 'Send request</button>', 'requestUse');
}
function useModal(u, date){
  var staff = S.users.filter(function(x){ return x.active && !(x.username === S.me.username && otherAdmins()); });
  if (!staff.length) return toast('No staff to record for.');
  u = u && staff.some(function(x){ return x.username === u; }) ? u : staff[0].username;
  modal('Record offset use', '<div class="field"><label for="mu">Employee</label><select class="input" id="mu" name="username">' + staff.map(function(x){ return '<option value="' + esc(x.username) + '"' + (x.username === u ? ' selected' : '') + '>' + esc(x.name) + ' · ' + fD(stats(x.username).avail) + ' available</option>'; }).join('') + '</select></div>' +
    daysFields(date) + '<div id="muOpts">' + useOpts(u) + '</div><span class="hint">For days off agreed in person. Staff can also send requests from their own accounts.</span>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Record use</button>', 'recordUse');
}
/* ---------- travel orders behind weekday offsets and days off ----------
   An approved offset for weekday work, and an approved weekday day off, are valid only once their travel order
   is prepared. COS staff, weekends and holidays do not need one. */
function needsTO(e){
  if (!e || e.status !== 'Confirmed' || (e.type !== 'EARN' && e.type !== 'USE') || isWeekend(e.date) || holidayOn(e.date)) return false;
  var u = userOf(e.username); return !!u && u.empType !== 'COS';
}
function entryTO(e){
  var byId = S.travelOrders.filter(function(t){ return t.status !== 'Cancelled' && (t.id === e.autoToId || t.id === e.toId); })[0]; if (byId) return byId;
  var u = userOf(e.username), nm = u ? u.name.toUpperCase() : '';
  return S.travelOrders.filter(function(t){ return t.status !== 'Cancelled' && (e.type === 'USE' ? t.toType === 'dayoff' : t.toType !== 'dayoff') && t.dateFrom <= e.date && t.dateTo >= e.date && ((t.usernames || []).indexOf(e.username) >= 0 || (t.names || []).indexOf(nm) >= 0); })[0] || null;
}
function toState(e){ if (!needsTO(e)) return ''; var t = entryTO(e); return !t ? 'none' : t.status === 'Prepared' ? 'ok' : 'prep'; }
function toPill(e){ var s = toState(e); return s === 'none' ? '<span class="pill e-need">Needs travel order</span>' : s === 'prep' ? '<span class="pill Pending">TO not prepared</span>' : ''; }
/* entries from the start of last month on that are not valid yet (older ones are history) */
function toGaps(){ var from = shiftMonth(curMonth(), -1) + '-01'; return S.entries.filter(function(e){ return e.date >= from && (toState(e) === 'none' || toState(e) === 'prep'); }); }
/* is this person on a day off (approved or requested) on this date? */
function dayOffOn(u, d){ return S.entries.filter(function(e){ if (e.username !== u || e.type !== 'USE' || e.status === 'Rejected') return false; var end = e.date; for (var k = 1; k < Math.ceil(e.days); k++) end = addDays(end, 1); return e.date <= d && end >= d; })[0] || null; }
/* people on a regular (dispatch) travel order who have a day off on its dates: they are not really dispatched */
function toDayOffClash(t){
  if (!t || t.toType === 'dayoff' || t.status === 'Cancelled') return [];
  return (t.names || []).map(function(n, i){ var u = (t.usernames || [])[i] || ((S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]) || {}).username; if (!u) return null;
    for (var d = t.dateFrom; d <= (t.dateTo || t.dateFrom); d = addDays(d, 1)){ if (dayOffOn(u, d)) return { name: n, u: u, date: d }; } return null; }).filter(Boolean);
}
/* After a weekday day off is recorded or approved: pick the event its travel order goes with (an event that day,
   a new one, or none), then go straight to preparing it. People on it are NOT counted as dispatched to the event. */
function offsetTOModal(e){
  if (!e || !isAdmin()) return;
  var u = userOf(e.username), evs = S.events.filter(function(x){ return x.status !== 'Cancelled' && x.date <= e.date && (x.dateTo || x.date) >= e.date; });
  var cur = entryTO(e), curEv = cur && cur.eventId;
  M = { offsetEntry: e.id };
  var opt = function(val, title, sub, on){ return '<label class="check opt"><input type="radio" name="ev" value="' + esc(val) + '"' + (on ? ' checked' : '') + ' required><span><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></label>'; };
  modal('Travel order for this day off',
    '<div class="sumbox"><b>' + esc(u ? u.name : e.username) + ' · day off</b><span>' + esc(fDate(e.date, { weekday:'long', month:'long', day:'numeric' })) + ' · ' + fD(e.days) + '</span></div>' +
    '<p class="hint" style="margin:0">A weekday day off is valid only with a prepared travel order. Pick the event it goes with. ' + esc(u ? firstName(u.username) : 'They') + ' will <b>not</b> be counted as dispatched to that event.</p>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Event</legend>' +
      evs.map(function(x, i){ return opt(x.id, esc(x.title), esc([x.venue, evTimes(x)].filter(Boolean).join(' · ')), curEv ? curEv === x.id : i === 0); }).join('') +
      opt('__new', 'Add a new event', 'For an event that is not on the calendar yet', !evs.length && !curEv) +
      '<div class="two" id="ofNew"' + (evs.length || curEv ? ' hidden' : '') + '><div class="field"><label for="ofT">Event name</label><input class="input" id="ofT" name="newTitle" maxlength="160" placeholder="e.g. Provincial Board session"></div><div class="field"><label for="ofV">Location</label><input class="input" id="ofV" name="newVenue" maxlength="160" placeholder="e.g. Capitol, Daet"></div></div>' +
      opt('__none', 'No event', 'Just the day off', false) + '</fieldset>',
    '<button type="button" class="btn btn-ghost" data-act="close">Later</button><button class="btn btn-primary" type="submit">' + ic('route') + 'Continue to prepare</button>', 'offsetTO');
}
document.addEventListener('change', function(ev){ if (ev.target.name === 'ev' && ev.target.closest('form[data-form="offsetTO"]')){ var nb = document.getElementById('ofNew'); if (nb){ nb.hidden = ev.target.value !== '__new'; if (!nb.hidden) document.getElementById('ofT').focus(); } } });
/* open the prompt for this person's day off on this date once it is saved (quick saves sync in the background) */
function offsetPromptFor(u, date){
  var n = 0;
  (function tick(){
    var busy = typeof Q !== 'undefined' && (Q.ops.length || Q.busy);
    var e = S.entries.filter(function(x){ return x.username === u && x.type === 'USE' && x.status === 'Confirmed' && x.date === date && !x._saving; }).sort(function(a, b){ return a.createdAt < b.createdAt ? 1 : -1; })[0];
    if (!busy && e){ if (needsTO(e) && toState(e) !== 'ok') offsetTOModal(e); return; }
    if (++n < 80) setTimeout(tick, 250);
  })();
}
/* ---------- "This week" on the dashboard ----------
   A coverage bar (how this week's events split: needs people / waiting for TO / ready) and one small
   stacked column per day (Mon to Sun) with the number of events on top and how many people are out below.
   Every day opens its day pop-up (the full detail); hover or keyboard focus shows the numbers. */
var ST_ORDER = [['need', 'Needs people'], ['wait', 'Waiting for TO'], ['ok', 'Ready']];
/* the columns rise from the baseline and the coverage bar fills left to right: once when the chart first
   shows, and again when you change weeks (not on every live update) */
function growBars(){
  if (lessMotion()) return;
  document.querySelectorAll('main .wk-col').forEach(function(c, i){ var dl = 60 + i * 35;
    settle(c.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 460, delay: dl, easing: MOTION.easeOut, fill: 'backwards' }), 460 + dl); });
  var cv = document.querySelector('main .vzcov');
  if (cv) settle(cv.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 560, easing: MOTION.easeOut }), 560);
}
S.wkOff = S.wkOff || 0;
function weekWidget(n){
  if (!S._wkGrown){ S._wkGrown = true; requestAnimationFrame(growBars); }
  var td = today(), ws = addDays(addDays(td, -((pd(td).getDay() + 6) % 7)), 7 * (S.wkOff || 0)), days = [], tot = { need: 0, wait: 0, ok: 0 }, seen = {}, maxN = 1;
  for (var i = 0; i < 7; i++){
    var d = addDays(ws, i), c = { need: 0, wait: 0, ok: 0 }, out = 0, travel = 0;
    S.events.forEach(function(e){ if (e.status === 'Cancelled' || e.date > d || (e.dateTo || e.date) < d) return; var s = evState(e); if (c[s] == null) return; c[s]++; if (!seen[e.id]){ seen[e.id] = 1; tot[s]++; } });
    S.users.forEach(function(u){ if (!u.active) return; var s = statusOn(u.username, d); if (s){ out++; if (s.kind === 'to') travel++; } });
    var nEv = c.need + c.wait + c.ok; if (nEv > maxN) maxN = nEv;
    days.push({ d: d, c: c, n: nEv, out: out, travel: travel });
  }
  var all = tot.need + tot.wait + tot.ok;
  // coverage: one whole (this week's events) split into three parts -> a thin segmented bar + legend with counts
  var cover = all ? '<div class="vzcov" role="img" aria-label="' + esc(ST_ORDER.map(function(x){ return tot[x[0]] + ' ' + x[1].toLowerCase(); }).join(', ')) + ' this week">' +
      ST_ORDER.filter(function(x){ return tot[x[0]]; }).map(function(x){ return '<span class="vzcov-seg vz-' + x[0] + '" style="flex:' + tot[x[0]] + '"></span>'; }).join('') + '</div>' +
    '<div class="cov-legend">' + ST_ORDER.map(function(x){ return '<button type="button" class="cov-key" data-act="evTile" data-f="' + x[0] + '"' + (tot[x[0]] ? '' : ' disabled') + '><i class="sw vz-' + x[0] + '" aria-hidden="true"></i><b>' + tot[x[0]] + '</b> ' + x[1] + '</button>'; }).join('') + '</div>'
    : '<p class="hint" style="margin:0">No events this week.</p>';
  var H = 64; // tallest column, px
  var cols = days.map(function(x){
    var dt = pd(x.d), isT = x.d === td, wk = dt.getDay() === 0 || dt.getDay() === 6;
    var segs = ST_ORDER.slice().reverse().filter(function(s){ return x.c[s[0]]; }).map(function(s){ return '<span class="wk-seg vz-' + s[0] + '" style="height:' + Math.max(4, Math.round(H * x.c[s[0]] / maxN)) + 'px"></span>'; }).join('');
    var tip = fDate(x.d, { weekday:'long', month:'short', day:'numeric' }) + '\n' + (x.n ? ST_ORDER.filter(function(s){ return x.c[s[0]]; }).map(function(s){ return x.c[s[0]] + ' ' + s[1].toLowerCase(); }).join(' · ') : 'No events') + '\n' + (x.out ? x.out + ' out of the office' + (x.travel ? ' (' + x.travel + ' on travel)' : '') : 'Everyone in');
    return '<button type="button" class="wk-day' + (isT ? ' today' : '') + (wk ? ' wkend' : '') + '" data-act="dayPop" data-d="' + x.d + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip.replace(/\n/g, '. ')) + '">' +
      '<span class="wk-n">' + (x.n || '') + '</span><span class="wk-col" style="height:' + H + 'px">' + (segs || '<span class="wk-none"></span>') + '</span>' +
      '<span class="wk-dow">' + fDate(x.d, { weekday:'short' }) + '</span><span class="wk-date">' + dt.getDate() + '</span>' +
      '<span class="wk-out' + (x.out ? '' : ' none') + '">' + (x.out ? ic('users') + x.out : '—') + '</span></button>';
  }).join('');
  var label = fRange(ws, addDays(ws, 6), { month:'short', day:'numeric' });
  var nav = '<div class="row-btns wk-nav"><button type="button" class="icon-btn" data-act="wkNav" data-d="-1" aria-label="Previous week">' + ic('left') + '</button>' +
    '<span class="wk-lab">' + (S.wkOff ? esc(label) : 'This week') + '</span><button type="button" class="icon-btn" data-act="wkNav" data-d="1" aria-label="Next week">' + ic('right') + '</button>' +
    (S.wkOff ? '<button type="button" class="btn btn-sm btn-ghost" data-act="wkNav" data-d="0">Today</button>' : '') + '</div>';
  return panel('Week at a glance', 'cal', '<div class="wk">' + '<div class="wk-cover">' + cover + '</div><div class="wk-days">' + cols + '</div>' +
    '<p class="hint wk-key">' + ic('users') + '<span>People out of the office: travel, leave or day off. Tap a day for details.</span></p></div>', nav, span(n));
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="wkNav"]'); if (!t) return;   // (the legend's "evTile" is handled by the main click handler)
  var d = Number(t.dataset.d), was = S.wkOff || 0; S.wkOff = d === 0 ? 0 : was + d; if (S.wkOff === was) return; render();
  if (lessMotion()) return;
  var dx = S.wkOff > was ? 16 : -16;            // later weeks come in from the right, earlier ones from the left
  document.querySelectorAll('main .wk-day').forEach(function(c, i){ var dl = (dx > 0 ? i : 6 - i) * 22;
    settle(c.animate([{ opacity: 0, transform: 'translateX(' + dx + 'px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.inMs, delay: dl, easing: MOTION.easeOut, fill: 'backwards' }), MOTION.inMs + dl); });
  growBars();
});
/* one shared tooltip for charts: any element with data-tip (lines split by \n); shown on hover and keyboard focus */
(function(){
  var tip = null;
  function show(el){
    if (el.closest('.side') && !el.classList.contains('av-btn') && !document.documentElement.classList.contains('side-mini')) return;
    if (!tip){ tip = document.createElement('div'); tip.className = 'vtip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = ''; String(el.dataset.tip).split('\n').forEach(function(l, i){ var r = document.createElement('div'); r.textContent = l; if (!i) r.className = 'vtip-h'; tip.appendChild(r); });
    var b = el.getBoundingClientRect(); tip.style.display = 'block';
    var w = tip.offsetWidth, h = tip.offsetHeight, x = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), window.innerWidth - w - 8), y = b.top - h - 8;
    if (y < 8) y = b.bottom + 8; tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hide(){ if (tip) tip.style.display = 'none'; }
  document.addEventListener('pointerover', function(ev){ var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el && ev.pointerType !== 'touch') show(el); });
  document.addEventListener('pointerout', function(ev){ var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el && !el.contains(ev.relatedTarget)) hide(); });
  document.addEventListener('focusin', function(ev){ var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) show(el); else hide(); });
  document.addEventListener('focusout', hide); window.addEventListener('scroll', hide, true); document.addEventListener('click', hide);
})();
/* admin dashboard: weekday offsets and days off that are not valid yet (no prepared travel order) */
function gapNote(){ var g = toGaps(); if (!g.length) return '';
  var nUse = g.filter(function(e){ return e.type === 'USE'; }).length, nEarn = g.length - nUse;
  return '<div class="span-12 warn-note gapnote">' + ic('route') + '<span><b>Not valid yet:</b> ' + [nEarn ? nEarn + ' weekday offset' + (nEarn === 1 ? '' : 's') : '', nUse ? nUse + ' weekday day' + (nUse === 1 ? '' : 's') + ' off' : ''].filter(Boolean).join(' and ') + ' without a prepared travel order.</span><button type="button" class="btn btn-sm btn-ghost" data-act="toGaps">See them</button></div>'; }
function gapsModal(){ var g = toGaps().sort(function(a, b){ return a.date < b.date ? -1 : 1; });
  modal('Not valid yet', '<p class="hint" style="margin:0 0 8px">Weekday offsets and days off need a prepared travel order (COS staff do not). Tap one to start or open its travel order.</p>' +
    (g.length ? '<ul class="list">' + g.map(function(e){ return entryRow(e, { showName: true }); }).join('') + '</ul>' : '<p class="hint">All set.</p>'),
    '<button type="button" class="btn btn-ghost" data-go="travel">Open travel orders</button><button type="button" class="btn btn-primary" data-act="close">Done</button>'); }
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="toGaps"]'); if (t) gapsModal(); });
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="offsetPick"]'); if (!t) return; var e = S.entries.filter(function(x){ return x.id === t.dataset.id; })[0]; if (e) offsetTOModal(e); });
function clashNote(t){ var c = toDayOffClash(t); if (!c.length) return '';
  return '<div class="warn-note clash">' + ic('plane') + '<span><b>Not a real dispatch for ' + c.length + (c.length === 1 ? ' person' : ' people') + ':</b> ' + c.map(function(x){ return esc(dispName(x.name)) + ' has a day off on ' + fDate(x.date, { month:'short', day:'numeric' }); }).join('; ') + '. A day off uses a day-off travel order, not a dispatch.</span></div>'; }
/* a day-off request bigger than what the person can use: approving it needs an explicit "Approve anyway" (override) */
function useShort(e){ if (e.type !== 'USE' || e.status !== 'Pending') return false; var s = stats(e.username); return e.days > s.avail + (e.early ? s.month : 0) + 1e-9; }
function shortNote(e){ if (!useShort(e)) return ''; var s = stats(e.username); return '<span class="shortnote">' + ic('flag') + ' Not enough offset: has ' + fD(Math.max(s.avail + (e.early ? s.month : 0), 0)) + '. Approving goes below zero.</span>'; }
/* "Use offsets earned this month": they are normally usable from the 1st of next month */
function earlyBox(n, on){ return '<label class="check opt"><input type="checkbox" name="early" value="1"' + (on ? ' checked' : '') + '><span><b>Use offsets earned this month</b><small>' + fD(n) + ' earned this month, normally usable from ' + closesOn(curMonth()) + '.</small></span></label>'; }
/* admin: early use, plus an override for when there is not enough offset (the balance goes below zero) */
function useOpts(u){ var s = stats(u);
  return (s.month > 0 ? earlyBox(s.month, false) : '') +
    '<label class="check opt warnopt"><input type="checkbox" name="override" value="1"><span><b>Override: record even without enough offset</b><small>' + esc(firstName(u)) + ' has ' + fD(Math.max(s.avail, 0)) + ' usable now. Their balance can go below zero; offsets they earn later pay it back.</small></span></label>'; }
function rejectModal(id){
  var e = S.entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
  M = { id: id };
  modal('Reject this ' + (e.type === 'USE' ? 'request' : 'offset') + '?', '<p style="margin:0"><b>' + esc(userName(e.username)) + '</b> · ' + (e.type === 'USE' ? 'Day off' : esc(e.event)) + ' · ' + fDate(e.date) + ' · ' + fD(e.days) + '</p>' +
    '<div class="field"><label for="rn">Reason</label><input class="input" id="rn" name="note" maxlength="200" placeholder="e.g. Covered by travel order, wrong date" required><span class="hint">The employee sees this.</span></div>' +
    '<div class="chips">' + ['Covered by travel order','Wrong date','Already logged','Not past office hours','Conflicts with schedule'].map(function(r){ return '<button type="button" class="chip" data-reason="' + r + '">' + r + '</button>'; }).join('') + '</div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-danger" type="submit">Reject</button>', 'reject');
}
/* profile photo: cropped to a square and shrunk to 192px, so it loads fast on the sign-in page */
function resizePhoto(file){ return new Promise(function(res, rej){ var img = new Image(), url = URL.createObjectURL(file);
  img.onload = function(){ var c = document.createElement('canvas'), n = 288, sq = Math.min(img.width, img.height); c.width = c.height = n;
    c.getContext('2d').drawImage(img, (img.width - sq) / 2, (img.height - sq) / 2, sq, sq, 0, 0, n, n); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82)); };
  img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('That file is not a picture.')); }; img.src = url; }); }
function photoModal(username){
  var u = userOf(username); if (!u) return; M = { photoU: username };
  modal(username === S.me.username ? 'Your photo' : esc(u.name) + '’s photo', '<div class="ph-wrap">' + avatarHtml(u, 132, 'ph-av') +
    '<div class="ph-drop" id="phDrop" tabindex="0" role="button" aria-label="Paste or drop a picture here">' + ic('upload') + '<b>Paste a picture here</b><span>Copy a picture from a website (right-click, Copy image), then press <kbd>Ctrl</kbd>+<kbd>V</kbd>. You can also drop a file here.</span></div>' +
    '<p class="hint" style="margin:0;text-align:center">Shown on the sign-in page and around the app. A clear face works best.</p></div>' +
    '<input type="file" id="phFile" accept="image/*" hidden>',
    '<button type="button" class="btn btn-ghost" data-act="close">Close</button>' + (u.photo ? '<button type="button" class="btn btn-ghost" data-act="phRemove">' + ic('trash') + 'Remove</button><button type="button" class="btn btn-ghost" data-act="phAdjust">' + ic('sliders') + 'Adjust</button>' : '') + (navigator.clipboard && navigator.clipboard.read ? '<button type="button" class="btn btn-ghost" data-act="phPaste">' + ic('download') + 'Paste</button>' : '') + '<button type="button" class="btn btn-primary" data-act="phPick">' + ic('upload') + (u.photo ? 'Change photo' : 'Add a photo') + '</button>');
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="photoModal"],[data-act="phPick"],[data-act="phRemove"]'); if (!t) return;
  if (t.dataset.act === 'photoModal') return photoModal(t.dataset.u || S.me.username);
  if (t.dataset.act === 'phPick'){ var f = document.getElementById('phFile'); if (f) f.click(); return; }
  busy(t, act('setPhoto', { username: M.photoU, photo: '' }, 'Photo removed').then(function(){ photoModal(M.photoU); }), 'merr');
});
/* every new picture goes through "Adjust": drag to move, zoom with the slider, wheel or a pinch, then save the square you see */
function savePhoto(blob){ if (!M.photoU) return; cropModal(blob); }
var CROP = null;
function cropModal(blob){
  var who = M.photoU, url = URL.createObjectURL(blob), img = new Image();
  img.onload = function(){
    modal('Adjust the photo', '<div class="crop"><div class="crop-view" id="cropV" tabindex="0" aria-label="Photo preview. Drag or use the arrow keys to move it; plus and minus to zoom."><img id="cropI" alt="" draggable="false"><i class="crop-grid" aria-hidden="true"></i></div>' +
      '<div class="crop-zoom"><button type="button" class="icon-btn" data-act="cropZ" data-d="-1" aria-label="Zoom out">' + ic('minus') + '</button><input type="range" id="cropZ" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><button type="button" class="icon-btn" data-act="cropZ" data-d="1" aria-label="Zoom in">' + ic('plus') + '</button></div>' +
      '<p class="hint" style="margin:0;text-align:center">Drag to move it. Zoom with the slider, the mouse wheel or two fingers.</p></div>',
      '<button type="button" class="btn btn-ghost" data-act="cropBack">Back</button><button type="button" class="btn btn-ghost" data-act="cropReset">Reset</button><button type="button" class="btn btn-primary" data-act="cropSave">' + ic('check') + 'Save photo</button>');
    var v = document.getElementById('cropV'), im = document.getElementById('cropI'); im.src = url;
    CROP = { who: who, img: img, url: url, w: img.naturalWidth, h: img.naturalHeight, z: 1, x: 0, y: 0, V: v.clientWidth };
    CROP.base = CROP.V / Math.min(CROP.w, CROP.h);
    cropCenter(); cropDraw();
  };
  img.onerror = function(){ URL.revokeObjectURL(url); var er = document.getElementById('merr'); if (er) er.textContent = 'That file is not a picture.'; };
  img.src = url;
}
function cropScale(){ return CROP.base * CROP.z; }
function cropClamp(){ var sc = cropScale(), mw = CROP.V - CROP.w * sc, mh = CROP.V - CROP.h * sc; CROP.x = Math.min(0, Math.max(mw, CROP.x)); CROP.y = Math.min(0, Math.max(mh, CROP.y)); }
function cropCenter(){ var sc = cropScale(); CROP.x = (CROP.V - CROP.w * sc) / 2; CROP.y = (CROP.V - CROP.h * sc) / 2; }
function cropDraw(){ var im = document.getElementById('cropI'); if (!im || !CROP) return; cropClamp();
  im.style.width = CROP.w + 'px'; im.style.height = CROP.h + 'px'; im.style.transform = 'translate(' + CROP.x + 'px,' + CROP.y + 'px) scale(' + cropScale() + ')';
  var zr = document.getElementById('cropZ'); if (zr && +zr.value !== CROP.z) zr.value = CROP.z; }
/* zoom around a point in the viewport (the middle, the pointer, or between two fingers) */
function cropZoomTo(z, px, py){ if (!CROP) return; z = Math.min(4, Math.max(1, z)); if (px == null){ px = CROP.V / 2; py = CROP.V / 2; }
  var s0 = cropScale(); CROP.z = z; var s1 = cropScale(); CROP.x = px - (px - CROP.x) * s1 / s0; CROP.y = py - (py - CROP.y) * s1 / s0; cropDraw(); }
(function(){
  var pts = {}, last = null, pinch = null;
  var local = function(ev){ var r = document.getElementById('cropV').getBoundingClientRect(); return { x: (ev.clientX - r.left) * CROP.V / r.width, y: (ev.clientY - r.top) * CROP.V / r.height }; };
  document.addEventListener('pointerdown', function(ev){ var v = ev.target.closest && ev.target.closest('#cropV'); if (!v || !CROP) return; ev.preventDefault(); v.setPointerCapture(ev.pointerId); pts[ev.pointerId] = local(ev); last = local(ev); v.classList.add('grab');
    var ids = Object.keys(pts); if (ids.length === 2){ var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: CROP.z }; } });
  document.addEventListener('pointermove', function(ev){ if (!CROP || !pts[ev.pointerId]) return; var p = local(ev); pts[ev.pointerId] = p; var ids = Object.keys(pts);
    if (ids.length === 2 && pinch){ var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); cropZoomTo(pinch.z * d / Math.max(1, pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    CROP.x += p.x - last.x; CROP.y += p.y - last.y; last = p; cropDraw(); });
  var up = function(ev){ if (!pts[ev.pointerId]) return; delete pts[ev.pointerId]; pinch = null; var ids = Object.keys(pts); last = ids.length ? pts[ids[0]] : null; var v = document.getElementById('cropV'); if (v && !ids.length) v.classList.remove('grab'); };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  document.addEventListener('wheel', function(ev){ var v = ev.target.closest && ev.target.closest('#cropV'); if (!v || !CROP) return; ev.preventDefault(); var p = local(ev); cropZoomTo(CROP.z * Math.exp(-ev.deltaY * 0.0015), p.x, p.y); }, { passive: false });
  document.addEventListener('input', function(ev){ if (ev.target.id === 'cropZ' && CROP) cropZoomTo(+ev.target.value); });
  document.addEventListener('keydown', function(ev){ if (!CROP || document.activeElement !== document.getElementById('cropV')) return;
    var k = ev.key, step = 12; if (k === 'ArrowLeft') CROP.x += step; else if (k === 'ArrowRight') CROP.x -= step; else if (k === 'ArrowUp') CROP.y += step; else if (k === 'ArrowDown') CROP.y -= step;
    else if (k === '+' || k === '=') return cropZoomTo(CROP.z * 1.12); else if (k === '-') return cropZoomTo(CROP.z / 1.12); else return; ev.preventDefault(); cropDraw(); });
  document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="cropZ"],[data-act="cropBack"],[data-act="cropReset"],[data-act="cropSave"]'); if (!t || !CROP) return;
    var a = t.dataset.act;
    if (a === 'cropZ') return cropZoomTo(CROP.z * (t.dataset.d === '1' ? 1.2 : 1 / 1.2));
    if (a === 'cropReset'){ CROP.z = 1; cropCenter(); return cropDraw(); }
    if (a === 'cropBack'){ var w0 = CROP.who; URL.revokeObjectURL(CROP.url); CROP = null; return photoModal(w0); }
    // save exactly the square shown
    var c = document.createElement('canvas'), n = 288, sc = cropScale(); c.width = c.height = n;
    c.getContext('2d').drawImage(CROP.img, -CROP.x / sc, -CROP.y / sc, CROP.V / sc, CROP.V / sc, 0, 0, n, n);
    var ph = c.toDataURL('image/jpeg', 0.84), who = CROP.who; URL.revokeObjectURL(CROP.url); CROP = null;
    busy(t, act('setPhoto', { username: who, photo: ph }, 'Photo saved').then(function(){ photoModal(who); }), 'merr');
  });
})();
/* adjust the photo already saved (it was saved small, so zooming far in will look soft) */
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="phAdjust"]'); if (!t) return; var u = userOf(M.photoU); if (!u || !u.photo) return;
  fetch(u.photo).then(function(r){ return r.blob(); }).then(cropModal); });
/* a picture's web address was pasted: try to fetch it (many sites block this; then say how to copy the picture itself) */
function photoFromUrl(url){
  var er = document.getElementById('merr');
  return fetch(url, { mode: 'cors' }).then(function(r){ if (!r.ok) throw 0; return r.blob(); }).then(function(b){ if (!/^image\//.test(b.type)) throw 0; savePhoto(b); })
    .catch(function(){ if (er) er.textContent = 'That website does not let other sites load its pictures. Right-click the picture, choose Copy image, then paste here.'; });
}
document.addEventListener('click', function(ev){ if (ev.target.closest && ev.target.closest('#phDrop')){ var fi = document.getElementById('phFile'); if (fi) fi.click(); } });
document.addEventListener('change', function(ev){ if (ev.target.id !== 'phFile' || !ev.target.files[0]) return; savePhoto(ev.target.files[0]); });
document.addEventListener('paste', function(ev){
  if (!M.photoU || !document.getElementById('phDrop')) return;
  var items = (ev.clipboardData && ev.clipboardData.items) || [], file = null;
  for (var i = 0; i < items.length; i++){ if (items[i].kind === 'file' && /^image\//.test(items[i].type)){ file = items[i].getAsFile(); break; } }
  if (file){ ev.preventDefault(); savePhoto(file); return; }
  var txt = ev.clipboardData && ev.clipboardData.getData('text/plain');
  if (txt && /^https?:\/\/\S+$/i.test(txt.trim())){ ev.preventDefault(); photoFromUrl(txt.trim()); }
  else if (ev.clipboardData){ var er = document.getElementById('merr'); if (er) er.textContent = 'There is no picture to paste. Copy a picture first (right-click it, Copy image).'; }
});
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="phPaste"]'); if (!t) return; var er = document.getElementById('merr');
  navigator.clipboard.read().then(function(list){
    for (var i = 0; i < list.length; i++){ var ty = list[i].types.filter(function(x){ return /^image\//.test(x); })[0]; if (ty) return list[i].getType(ty).then(savePhoto); }
    return navigator.clipboard.readText().then(function(tx){ if (/^https?:\/\/\S+$/i.test(String(tx).trim())) return photoFromUrl(String(tx).trim()); throw new Error('There is no picture to paste. Copy a picture first.'); });
  }).catch(function(e){ if (er) er.textContent = e && e.message && !/denied|permission/i.test(e.message) ? e.message : 'The browser did not allow pasting. Press Ctrl+V instead, or choose a file.'; });
});
['dragover', 'dragleave', 'drop'].forEach(function(n){ document.addEventListener(n, function(ev){ var z = ev.target.closest && ev.target.closest('#phDrop'); if (!z) return; ev.preventDefault();
  z.classList.toggle('over', n === 'dragover'); if (n === 'drop'){ var f = ev.dataTransfer && ev.dataTransfer.files[0]; if (f) savePhoto(f); else { var url = ev.dataTransfer && (ev.dataTransfer.getData('text/uri-list') || ev.dataTransfer.getData('text/plain')); if (url) photoFromUrl(url.trim()); } } }); });
function personModal(username){
  var u = userOf(username); if (!u) return;
  var st = stats(username), recent = sorted(S.entries.filter(function(e){ return e.username === username; })).slice(0, 5), self = username === S.me.username;
  modal(esc(u.name), '<div class="detail-top">' + ((isAdmin() || self) ? '<button type="button" class="av-btn" data-act="photoModal" data-u="' + esc(username) + '" aria-label="Change photo">' + avatarHtml(u, 52) + '<span class="av-cam">' + ic('camera') + '</span></button>' : avatarHtml(u, 52)) + '<div><div class="hint">@' + esc(u.username) + ' · <span class="cap">' + esc(u.role) + '</span> · ' + esc(u.empType) + (u.active ? '' : ' · Inactive') + '</div>' + divChip(u.division) + '</div></div>' +
    '<div class="info-note">' + ic('users') + '<span>Today: ' + (statusOn(username, today()) ? esc(statusOn(username, today()).kind === 'to' ? 'In the field · ' + statusOn(username, today()).label : statusOn(username, today()).label) : 'Available') + '</span></div>' +
    (hasLeaves(u) ? (function(){ var b = leaveBal(username); return '<div class="mini-tiles"><div><span>Vacation leave</span><b>' + (b.set ? fD(b.vl) : '—') + '</b></div><div><span>Sick leave</span><b>' + (b.set ? fD(b.sl) : '—') + '</b></div></div>'; })() : '') +
    '<div class="mini-tiles"><div><span>Offsets available</span><b>' + fD(st.avail) + '</b></div><div><span>' + mShort(curMonth()) + ' so far</span><b>+' + fD(st.month) + '</b></div><div><span>Waiting for review</span><b>' + fD(st.pending + st.reqDays) + '</b></div><div><span>Used this year</span><b>' + fD(st.usedY) + '</b></div></div>' +
    (isAdmin() ? '<div class="label">Details</div><div class="two"><div class="field"><label for="pdiv">Division</label>' + divSelect('pdiv', u.division, 'Division', false, true).replace('class="input"', 'class="input" data-setdiv="' + esc(username) + '"') + '</div>' +
      '<div class="field"><label for="pemp">Employment</label><select class="input" id="pemp" data-setemp="' + esc(username) + '">' + [['JO','JO (Job order)'],['COS','COS (Contract of service)'],['Casual','Casual'],['Regular','Regular']].map(function(t){ return '<option value="' + t[0] + '"' + ((u.empType || 'JO') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select><span class="hint">Regular and casual get CSC leave credits.</span></div></div>' +
      '<div class="label">Account</div><div class="acct"><button type="button" class="btn btn-sm btn-ghost" data-act="pinModal" data-u="' + esc(username) + '">' + ic('key') + (u.noPin ? 'Set PIN' : 'Reset PIN') + '</button>' +
      (self ? '<span class="hint">Another admin manages your own role and status.</span>' :
        '<button type="button" class="btn btn-sm btn-ghost" data-act="setRole" data-u="' + esc(username) + '" data-r="' + (u.role === 'admin' ? 'employee' : 'admin') + '">' + ic('shield') + (u.role === 'admin' ? 'Make employee' : 'Make admin') + '</button>' +
        (u.role !== 'admin' ? '<button type="button" class="btn btn-sm btn-ghost" data-act="setRole" data-u="' + esc(username) + '" data-r="' + (u.role === 'scheduler' ? 'employee' : 'scheduler') + '">' + ic('megaphone') + (u.role === 'scheduler' ? 'Remove division leader' : 'Make division leader') + '</button>' : '') +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="toggleActive" data-u="' + esc(username) + '" data-a="' + (u.active ? '0' : '1') + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-act="removeUser" data-u="' + esc(username) + '">' + ic('trash') + 'Remove ' + (u.role === 'admin' ? 'admin' : 'staff') + '</button>') + '</div>' +
      (!self && st.avail > 0 ? '<div class="warn-note">' + ic('clock') + '<span>' + esc(u.name.split(' ')[0]) + ' still has ' + fD(st.avail) + ' available. Settle or record it before removing the account.</span></div>' : '') +
      '<p class="hint" style="margin:0">Deactivate blocks sign-in but keeps them on the lists. Remove deletes the account; their past entries stay in the records and the activity log.</p>' : '') +
    (recent.length ? '<div class="label" style="display:flex;justify-content:space-between;align-items:center">Recent<button type="button" class="btn btn-sm btn-ghost" data-act="personRecords" data-u="' + esc(username) + '">' + ic('list') + 'All records</button></div><ul class="list boxed">' + recent.map(function(e){ return entryRow(e); }).join('') + '</ul>' : '<p class="hint">No offsets yet.</p>') + personTOs(username),
    isAdmin() ? '<button type="button" class="btn btn-ghost" data-act="personAdd" data-u="' + esc(username) + '">' + ic('plus') + 'Add offset</button>' +
      (self ? '<button type="button" class="btn btn-primary" data-act="requestModal">' + ic('plane') + 'Use offset</button>' : '<button type="button" class="btn btn-primary" data-act="useModal" data-u="' + esc(username) + '"' + (st.avail > 0 ? '' : ' disabled') + '>' + ic('minus') + 'Record use</button>') : '');
}
function customizeModal(){
  var role = wRole(), P = widgetPrefs();
  M = { order: P.order.slice(), hidden: P.hidden.slice() };
  function draw(){
    document.getElementById('wl').innerHTML = M.order.map(function(id, i){ var w = widgetDef(id);
      return '<div class="w"><label><input type="checkbox" data-w="' + id + '"' + (M.hidden.indexOf(id) < 0 ? ' checked' : '') + '>' + esc(w[1]) + '</label><button type="button" class="icon-btn" data-act="wUp" data-i="' + i + '" aria-label="Move ' + esc(w[1]) + ' up"' + (i ? '' : ' disabled') + '>' + ic('up') + '</button><button type="button" class="icon-btn" data-act="wDown" data-i="' + i + '" aria-label="Move ' + esc(w[1]) + ' down"' + (i < M.order.length - 1 ? '' : ' disabled') + '>' + ic('down') + '</button></div>'; }).join('');
  }
  M.draw = draw; M.role = role;
  modal('Customize your dashboard', '<p class="hint" style="margin:0">Choose what shows on your dashboard and in what order. Saved on this device.</p><div class="wlist" id="wl"></div>',
    '<button type="button" class="btn btn-ghost" data-act="wReset" style="margin-right:auto">Reset</button><button type="button" class="btn btn-primary" data-act="wSave">Save layout</button>');
  draw();
}
function divModal(id){
  var d = divOf(id) || { id:'', name:'', short:'', color:'#16803A', icon:'star', logo:'' };
  M = { id: d.id, color: d.color, icon: d.icon, logo: d.logo };
  modal(d.id ? 'Edit division' : 'Add division',
    '<div class="logo-row"><span id="dprev">' + divBadge(d, 56) + '</span><div class="hint" style="flex:1;min-width:160px">This is how the division appears on the sign-in page and staff lists.</div></div>' +
    '<div class="field"><label for="dn">Division name</label><input class="input" id="dn" name="name" value="' + esc(d.name) + '" maxlength="80" required></div>' +
    '<div class="field"><label for="ds">Short label</label><input class="input" id="ds" name="short" value="' + esc(d.short) + '" maxlength="30" placeholder="e.g. Bantayog"><span class="hint">Used on the sign-in page, in tables and chips.</span></div>' +
    '<div class="field"><span class="label">Color</span><div class="swatches">' + SWATCHES.map(function(c){ return '<button type="button" class="sw" style="--dc:' + c + '" data-act="divColor" data-c="' + c + '" aria-label="Color ' + c + '" aria-pressed="' + (c.toUpperCase() === String(d.color).toUpperCase()) + '"></button>'; }).join('') + '<input type="color" id="dcol" value="' + esc(d.color) + '" aria-label="Custom color"></div></div>' +
    '<div class="field"><span class="label">Icon</span><div class="iconpick">' + DIV_ICONS.map(function(n){ return '<button type="button" data-act="divIcon" data-n="' + n + '" aria-label="' + n + ' icon" aria-pressed="' + (n === d.icon) + '">' + ic(n) + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><span class="label">Logo (optional)</span><div class="logo-row"><label class="btn btn-sm btn-ghost" for="dlogo">' + ic('upload') + 'Upload logo</label><input type="file" id="dlogo" accept="image/png,image/jpeg,image/webp" class="sr"><button type="button" class="btn btn-sm btn-ghost" data-act="divNoLogo" id="dnolog"' + (d.logo ? '' : ' hidden') + '>Remove logo</button></div><span class="hint">A square PNG or JPG works best. It replaces the icon.</span></div>',
    (d.id ? '<button type="button" class="btn btn-danger" data-act="divDelete" style="margin-right:auto">' + ic('trash') + 'Delete</button>' : '') + '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save division</button>', 'saveDivision');
}
function divPreview(){
  var p = document.getElementById('dprev'); if (!p) return;
  p.innerHTML = divBadge({ color: M.color, icon: M.icon, logo: M.logo }, 56);
  document.querySelectorAll('#modal .sw').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.c.toUpperCase() === M.color.toUpperCase())); });
  document.querySelectorAll('#modal .iconpick button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.n === M.icon)); });
  var nl = document.getElementById('dnolog'); if (nl) nl.hidden = !M.logo;
}
function readLogo(file){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ var img = new Image();
      img.onload = function(){ var c = document.createElement('canvas'), s = 128; c.width = s; c.height = s;
        var x = c.getContext('2d'), k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k; x.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
        var out = c.toDataURL('image/png'); if (out.length > 45000) out = c.toDataURL('image/webp', 0.85); if (out.indexOf('data:image/webp') !== 0 && out.length > 45000) out = c.toDataURL('image/jpeg', 0.82);
        out.length > 45000 ? reject(new Error('That image is too detailed. Try a simpler logo.')) : resolve(out); };
      img.onerror = function(){ reject(new Error('That file is not an image we can read.')); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
function sure(t, label){ if (t.dataset.sure === '1') return true; t.dataset.sure = '1'; t.innerHTML = ic('trash') + label; return false; }

