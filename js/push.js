/* =====================================================================
   Phone alerts that arrive even when the app is closed.
   The app stays on Firebase; a small Cloudflare Worker (push-worker/) keeps each phone's subscription
   and sends the alerts. When someone saves a change, their app works out who now has something new
   (a dispatch, a ready travel order, their turn on a task, a caption sent back) and asks the worker to
   alert those people. Set up: PUSH-SETUP.md. Until config.js has PIO_PUSH.url, nothing here runs.
   ===================================================================== */
function pushCfg(){ var c = window.PIO_PUSH; return c && c.url && c.vapid ? c : null; }
function pushReady(){ return !!(typeof LIVE !== 'undefined' && LIVE && pushCfg() && window.navigator && navigator.serviceWorker && window.PushManager && Fire.idToken && S.me); }
function pushOnHere(){ return !!(S.me && lGet('pio_push_' + S.me.username) === '1'); }
function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function standalone(){ return !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone); }

/* what each person should be alerted about, worked out from the shared data */
function pushAlertsFor(u){
  var td = today(), out = [];
  (S.events || []).forEach(function(e){
    if (e.status === 'Cancelled' || (e.dateTo || e.date) < td || !evMine(e, u)) return;
    out.push({ to: u, id: 'asg:' + e.id, title: 'New dispatch', body: e.title + ' · ' + evRelText(e), url: './#calendar' });
  });
  (S.travelOrders || []).forEach(function(t){
    if (t.status === 'Prepared' && t.dateTo >= td && (t.usernames || []).indexOf(u) >= 0) out.push({ to: u, id: 'to:' + t.id, title: 'Travel order ready', body: t.event, url: './#travel' });
  });
  tasksAll().forEach(function(t){
    if (t.status === 'Done') return; var c = taskCur(t); if (!c) return; var s = c.s, turn = false;
    if (c.steps.length === 1) turn = (s.who.length ? s.who : t.assignees || []).indexOf(u) >= 0;
    else if (s.type === 'post') turn = (s.who.length ? s.who.indexOf(u) >= 0 : (t.assignees || []).indexOf(u) >= 0) && divCanPost((userOf(u) || {}).division);
    else if (s.who.length) turn = s.who.indexOf(u) >= 0 && !(s.type === 'proof' && taskWriter(t, c.i) === u);
    else if (s.type === 'proof') turn = taskWriter(t, c.i) !== u && skillsOf(u).indexOf('Writer') >= 0;   // open proofreading: the writers
    if (turn) out.push({ to: u, id: 'turn:' + t.id + ':' + c.i + ':' + (t.sentBack ? t.sentBack.at : ''),
      title: t.sentBack ? 'Sent back to you: ' + s.name : 'Your turn: ' + s.name,
      body: t.title + (t.sentBack ? ' · “' + t.sentBack.note + '”' : t.due ? ' · ' + taskDue(t).txt : ''), url: './#tasks' });
    else if ((t.assignees || []).indexOf(u) >= 0) out.push({ to: u, id: 'new:' + t.id, title: 'New task', body: t.title + ' · you’re on ' + c.steps.filter(function(x){ return x.who.indexOf(u) >= 0; }).map(function(x){ return x.name.toLowerCase(); }).join(', '), url: './#tasks' });
  });
  return out;
}
/* everyone's alerts except mine (I don't alert myself) */
function pushSnap(){ var me = S.me.username, all = []; S.users.forEach(function(u){ if (u.active && u.username !== me) all = all.concat(pushAlertsFor(u.username)); }); return all; }
/* what is new: alerts that weren't there before; "New task" only for people who weren't already alerted about that task */
function pushDiff(before, after){
  var had = {}, task = function(a){ var m = /^(?:turn|new):([^:]+)/.exec(a.id); return m ? a.to + '|task|' + m[1] : ''; };
  before.forEach(function(a){ had[a.to + '|' + a.id] = 1; var k = task(a); if (k) had[k] = 1; });
  return after.filter(function(a){ return !had[a.to + '|' + a.id] && !(/^new:/.test(a.id) && had[task(a)]); });
}

function pushPost(path, body){
  return Fire.idToken().then(function(tok){
    if (!tok) throw new Error('Please sign in again.');
    return fetch(pushCfg().url.replace(/\/$/, '') + path, { method: 'POST', keepalive: true, headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if (!r.ok) throw new Error(j.error || 'Phone alerts could not be reached.'); return j; }); });
}
function pushSend(items){ if (items.length) pushPost('/notify', { items: items.slice(0, 60) }).catch(function(){}); }

/* every save: after it lands, alert whoever has something new */
(function(){
  var A = act;
  act = function(){
    var snap = null; try { if (pushReady()) snap = pushSnap(); } catch(e){}
    return A.apply(this, arguments).then(function(r){ try { if (snap) pushSend(pushDiff(snap, pushSnap())); } catch(e){} return r; });
  };
})();

/* turning alerts on and off on this device */
function u8(b64){ var s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
function pushOn(){
  return navigator.serviceWorker.ready.then(function(reg){
    return reg.pushManager.getSubscription().then(function(s){ return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(pushCfg().vapid) }); });
  }).then(function(sub){ return pushPost('/subscribe', { sub: sub.toJSON() }); }).then(function(){ lSet('pio_push_' + S.me.username, '1'); });
}
function pushOff(){
  lSet('pio_push_' + S.me.username, null);
  return navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); })
    .then(function(s){ if (!s) return; return pushPost('/unsubscribe', { endpoint: s.endpoint }).catch(function(){}).then(function(){ return s.unsubscribe(); }); });
}
/* the bell's "Turn on/off device notifications" also turns phone alerts on/off */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="notifOn"],[data-act="notifOff"],[data-act="pushTest"]'); if (!t || !pushReady()) return;
  var a = t.dataset.act;
  if (a === 'notifOff'){ pushOff().catch(function(){}); return; }
  if (a === 'pushTest'){ busy(t, pushPost('/notify', { test: true, items: [{ to: S.me.username, id: 'test:' + Date.now(), title: 'PIO Overwatch', body: 'Phone alerts work on this device.', url: './#tasks' }] }).then(function(j){ toast(j.sent ? 'Test alert sent. It should pop up in a moment.' : 'Sent, but no phone is set up for you yet.'); })); return; }
  Promise.resolve(Notification.requestPermission()).then(function(p){
    if (p !== 'granted') return;
    return pushOn().then(function(){ toast('Phone alerts are on for this device.'); if (document.querySelector('#modal .push-st')) notifModal(); });
  }).catch(function(e){ toast(e.message || 'Phone alerts could not be turned on.'); });
});
/* the bell window says whether phone alerts are on, with a test, and the iPhone tip */
(function(){
  var N = notifModal;
  notifModal = function(){
    N.apply(this, arguments);
    if (arguments[0] === 'list') return;   // only the list was swapped; the status card is already there
    if (!pushCfg() || typeof LIVE === 'undefined' || !LIVE) return;
    var box = document.querySelector('#modal .panel-b'); if (!box) return;
    var on = pushOnHere() && typeof Notification !== 'undefined' && Notification.permission === 'granted', html;
    if (isIOS() && !standalone()) html = '<b>' + ic('bell') + 'Phone alerts on iPhone</b><span>Add PIO Overwatch to your Home Screen first (Share, then Add to Home Screen), open it from there, then turn on notifications.</span>';
    else if (!window.PushManager || !navigator.serviceWorker) html = '<b>' + ic('bell') + 'Phone alerts</b><span>This browser can’t get alerts when the app is closed.</span>';
    else if (on) html = '<b>' + ic('bell') + 'Phone alerts are on</b><span>You’ll get new dispatches, ready travel orders and your turn on tasks, even when the app is closed.</span><button type="button" class="btn btn-sm btn-ghost" data-act="pushTest">Send a test alert</button>';
    else html = '<b>' + ic('bell') + 'Phone alerts are off</b><span>Turn on notifications below to get dispatches and your turn on tasks even when the app is closed.</span>';
    var el = document.createElement('div'); el.className = 'push-st' + (on ? ' on' : ''); el.innerHTML = html;
    var anchor = box.querySelector('.dsec'); if (anchor) box.insertBefore(el, anchor.nextSibling); else box.appendChild(el);
  };
})();
/* keep this device's subscription fresh once per visit (phones sometimes renew it) */
var _pushFresh = false;
(function(){ var R = render; render = function(){ R.apply(this, arguments); if (!_pushFresh && S.me && pushReady() && pushOnHere() && typeof Notification !== 'undefined' && Notification.permission === 'granted'){ _pushFresh = true; pushOn().catch(function(){}); } }; })();
