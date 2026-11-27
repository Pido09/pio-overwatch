/* Automatic checks for PIO Overwatch. Run with:  node tests/run.js   (or: npm test)
   Loads the app's own code (js/*.js) in a sandbox with a tiny fake browser, then checks the rules the office relies on:
   offsets and day offs, travel orders, events, availability, day counts, duplicates and names.
   No data is read or written anywhere: everything runs on sample data in memory. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0; const fails = [];
function check(name, ok, detail){ if (ok){ pass++; } else { fail++; fails.push(name + (detail !== undefined ? '  →  ' + JSON.stringify(detail) : '')); } }

/* ---------- 1. files and versions ---------- */
const order = ['core.js', 'views.js', 'events.js', 'documents.js', 'data.js', 'app.js'];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = order.map(function(f){ return fs.readFileSync(path.join(root, 'js', f), 'utf8'); });
srcs.forEach(function(src, i){ try { new Function(src); check('parses: js/' + order[i], true); } catch (e) { check('parses: js/' + order[i], false, e.message); } });
const tagOrder = (html.match(/<script src="js\/([a-z]+\.js)\?v=v\d+"><\/script>/g) || []).map(function(t){ return t.match(/js\/([a-z]+\.js)/)[1]; });
check('index.html loads the files in order', JSON.stringify(tagOrder) === JSON.stringify(order), tagOrder);
const appVer = (srcs.join('').match(/var APP_VER = '(v\d+)'/) || [])[1];
const jsonVer = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).ver;
const swVer = (fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/pio-offsets-(v\d+)/) || [])[1];
const tagVers = (html.match(/\?v=(v\d+)/g) || []).map(function(x){ return x.slice(3); });
check('version markers match (APP_VER, version.json, sw.js, index.html)', appVer && appVer === jsonVer && appVer === swVer && tagVers.every(function(v){ return v === appVer; }), { appVer: appVer, jsonVer: jsonVer, swVer: swVer, tagVers: tagVers });
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
check('offline cache lists every code file', order.every(function(f){ return sw.indexOf("'js/" + f + "'") >= 0; }) && sw.indexOf("'app.css'") >= 0);

/* ---------- 2. load the app in a sandbox ---------- */
function el(){ const e = { style: {}, dataset: {}, children: [], innerHTML: '', textContent: '', value: '', hidden: false,
  classList: { _s: {}, add(){ for (const c of arguments) this._s[c] = 1; }, remove(){ for (const c of arguments) delete this._s[c]; }, toggle(c, on){ if (on === undefined) on = !this._s[c]; if (on) this._s[c] = 1; else delete this._s[c]; return on; }, contains(c){ return !!this._s[c]; } },
  setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){}, appendChild(c){ this.children.push(c); return c; }, insertBefore(c){ return c; }, remove(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, click(){},
  getBoundingClientRect(){ return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }; }, animate(){ return { finished: Promise.resolve(), addEventListener(){}, cancel(){}, finish(){} }; },
  getAnimations(){ return []; } }; return e; }
const store = {}; const storage = { getItem(k){ return k in store ? store[k] : null; }, setItem(k, v){ store[k] = String(v); }, removeItem(k){ delete store[k]; } };
const app = el(), docEl = el();
const sandbox = {
  console: { log(){}, warn(){}, error(){} }, CFG: {}, Intl, Date, Math, JSON, Promise, URL, Blob: function(){},
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
  localStorage: storage, sessionStorage: storage, navigator: { userAgent: 'node' }, location: { protocol: 'http:', hash: '', search: '', reload(){} },
  matchMedia(){ return { matches: false, addEventListener(){}, addListener(){} }; }, fetch(){ return Promise.reject(new Error('offline')); },
  innerWidth: 1280, innerHeight: 800, scrollY: 0, scrollTo(){}, addEventListener(){}, removeEventListener(){}, getComputedStyle(){ return {}; }, MutationObserver: function(){ this.observe = function(){}; },
  document: { documentElement: docEl, body: el(), head: el(), createElement: el, getElementById(id){ return id === 'app' ? app : null; }, querySelector(){ return null; }, querySelectorAll(){ return []; },
    addEventListener(){}, removeEventListener(){}, activeElement: null, hidden: false, startViewTransition: undefined, getAnimations(){ return []; } }
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
let loaded = true;
order.forEach(function(f, i){ try { vm.runInContext(srcs[i], sandbox, { filename: 'js/' + f }); } catch (e) { loaded = false; check('loads in order: js/' + f, false, e.message); } });
check('app code loads', loaded);
if (!loaded){ report(); }
const G = sandbox;
const T = G.today(), D = function(n){ return G.addDays(T, n); };

/* ---------- 3. rules, checked on the engine (the same code that saves real data) ---------- */
function engine(seed){
  const base = { users: [{ username: 'adm', name: 'Admin One', role: 'admin', active: true, division: 'd1', empType: 'Regular' },
                         { username: 'lead', name: 'Lead Two', role: 'scheduler', active: true, division: 'd1', empType: 'JO' },
                         { username: 'bob', name: 'Bob Cruz', role: 'employee', active: true, division: 'd1', empType: 'JO' }],
    entries: [], divisions: [{ id: 'd1', name: 'Division', short: 'Div' }], holidays: [], settings: {}, activity: [], tos: [], events: [], inventory: [], leaves: [], credits: [], tevs: [] };
  const d = Object.assign(base, JSON.parse(JSON.stringify(seed || {})));
  G.Mock.engine.load(d); return G.Mock.engine;
}
function run(E, who, a, p){ const r = E.run(who, a, p); return r.ok ? 'ok' : (r.error || r.message || 'failed'); }

// offsets: a day-off travel order takes only the ticked days, and never takes a requested day twice
(function(){
  const E = engine({ entries: [{ id: 'earn', username: 'bob', type: 'EARN', date: D(-45), days: 5, status: 'Confirmed', category: 'Weekend' },
                               { id: 'req', username: 'bob', type: 'USE', date: D(2), days: 1, status: 'Pending', createdBy: 'bob' }],
    tos: [{ id: 'T', status: 'Filed', toType: 'dayoff', names: ['BOB CRUZ'], usernames: ['bob'], dateFrom: D(2), dateTo: D(3), event: 'Day off', destination: 'Day off', createdBy: 'adm' }] });
  const r = E.run('adm', 'setTOStatus', { id: 'T', status: 'Prepared', tev: 'No', dayoffDays: JSON.stringify(['bob|' + D(2)]) });
  const uses = E.dump().entries.filter(function(e){ return e.type === 'USE'; });
  check('day-off travel order uses only the ticked day', r.ok && r.data.offsetUsed === 1 && uses.length === 1 && uses[0].status === 'Confirmed', uses);
  E.run('adm', 'setTOStatus', { id: 'T', status: 'Cancelled', tev: 'No' });
  const after = E.dump().entries.filter(function(e){ return e.type === 'USE'; });
  check('cancelling it puts the request back to waiting', after.length === 1 && after[0].status === 'Pending', after);
})();

// division leaders cannot file travel orders
(function(){
  const E = engine();
  check('division leaders cannot file travel orders', run(E, 'lead', 'saveTO', { names: 'BOB CRUZ', event: 'x', destination: 'y', dateFrom: D(1) }) !== 'ok');
})();

// events: reschedule, cancel with a reason, merge duplicates
(function(){
  const E = engine({ events: [
    { id: 'A', title: 'Media Appreciation Day', venue: 'UMA', date: D(5), dateTo: D(5), status: 'Confirmed', needs: ['Photo Documentation'] },
    { id: 'B', title: 'To cover Media Appreciation Day', venue: '', date: D(5), dateTo: D(5), status: 'Confirmed', time: '08:00', needs: ['Video Documentation'], assigned: ['bob'] },
    { id: 'C', title: 'Quarterly meeting', venue: 'PPO', date: D(8), dateTo: D(8), status: 'Confirmed' }],
    tos: [{ id: 'T', status: 'Filed', toType: 'regular', names: ['BOB CRUZ'], usernames: ['bob'], dateFrom: D(5), dateTo: D(5), event: 'x', destination: 'y', eventId: 'B', createdBy: 'adm' }] });
  check('leaders cannot merge a duplicate that has travel orders', run(E, 'lead', 'mergeEvent', { id: 'B', into: 'A' }) !== 'ok');
  check('admin merges a duplicate', run(E, 'adm', 'mergeEvent', { id: 'B', into: 'A' }) === 'ok');
  const d = E.dump(), A = d.events.filter(function(e){ return e.id === 'A'; })[0];
  check('merging moves travel orders, people, needs and missing details', d.events.length === 2 && d.tos[0].eventId === 'A' && A.assigned.indexOf('bob') >= 0 && A.needs.length === 2 && A.time === '08:00', A);
  check('rescheduling records the move', run(E, 'lead', 'rescheduleEvent', { id: 'C', date: D(9), note: 'per letter' }) === 'ok');
  const C = E.dump().events.filter(function(e){ return e.id === 'C'; })[0];
  check('a leader’s move goes back for confirmation', C.date === D(9) && C.status === 'Pending' && C.moves.length === 1, C);
  check('rescheduling to the same date is refused', run(E, 'adm', 'rescheduleEvent', { id: 'C', date: D(9) }) !== 'ok');
  check('cancelling keeps the reason', run(E, 'adm', 'setEventStatus', { id: 'C', status: 'Cancelled', note: 'typhoon' }) === 'ok' && E.dump().events.filter(function(e){ return e.id === 'C'; })[0].removeNote === 'typhoon');
})();

// per-day assignment on multi-day dispatch orders
(function(){
  const E = engine({ users: [{ username: 'adm', name: 'Admin One', role: 'admin', active: true }, { username: 'bob', name: 'Bob Cruz', role: 'employee', active: true }, { username: 'ann', name: 'Ann Reyes', role: 'employee', active: true }],
    events: [{ id: 'D', title: 'Capitol week', venue: 'Capitol', date: D(1), dateTo: D(3), status: 'Confirmed', kind: 'tasking', assigned: [] }] });
  run(E, 'adm', 'assignEvent', { id: 'D', users: ['bob', 'ann'], open: '0', days: JSON.stringify({ ann: [D(2)] }) });
  const ev = E.dump().events[0];
  check('only people not going every day get a day list', ev.assignDays && !ev.assignDays.bob && JSON.stringify(ev.assignDays.ann) === JSON.stringify([D(2)]), ev.assignDays);
})();

// photos: only pictures, and only your own unless you are an admin
(function(){
  const E = engine();
  check('staff cannot change someone else’s photo', run(E, 'bob', 'setPhoto', { username: 'lead', photo: '' }) !== 'ok');
  check('a photo must be a picture', run(E, 'adm', 'setPhoto', { username: 'bob', photo: 'data:text/html;base64,PGI+' }) !== 'ok');
})();

/* ---------- 4. screen rules, checked on the shared state ---------- */
function withState(st, fn){ const keep = {}; Object.keys(st).forEach(function(k){ keep[k] = G.S[k]; G.S[k] = st[k]; }); try { fn(); } finally { Object.keys(keep).forEach(function(k){ G.S[k] = keep[k]; }); } }
const users = [{ username: 'adm', name: 'Admin One', role: 'admin', active: true, division: 'd1' }, { username: 'bob', name: 'Bob Cruz', role: 'employee', active: true, division: 'd1' },
               { username: 'ann', name: 'Ann Reyes', role: 'employee', active: true, division: 'd1' }, { username: 'ann2', name: 'Ann Santos', role: 'employee', active: true, division: 'd1' }];
const base = { users: users, me: users[0], entries: [], board: [], leaves: [], holidays: [], divisions: [{ id: 'd1', name: 'Division' }], tevs: [], inventory: [] };

withState(Object.assign({}, base, {
  events: [{ id: 'A', title: 'Two-day caravan', venue: 'Daet', date: D(1), dateTo: D(2), status: 'Confirmed', kind: 'travel' },
           { id: 'B', title: 'Other event', venue: 'Labo', date: D(2), dateTo: D(2), status: 'Confirmed', kind: 'travel' }],
  travelOrders: [{ id: 'T', status: 'Prepared', toType: 'regular', names: ['BOB CRUZ'], usernames: ['bob'], dateFrom: D(1), dateTo: D(1), event: 'x', destination: 'Daet', eventId: 'A' },
                 { id: 'O', status: 'Filed', toType: 'dayoff', names: ['ANN REYES'], usernames: ['ann'], dateFrom: D(2), dateTo: D(2), event: 'Day off', destination: 'Day off', eventId: '' }]
}), function(){
  const A = G.S.events[0];
  check('a one-day travel order shows the person on that day only', G.evPeople(A, D(1)).length === 1 && G.evPeople(A, D(2)).length === 0);
  check('they are free for another event on the other day', G.busyOn('bob', D(2), 'B') === null);
  check('the uncovered day of the event is marked', JSON.stringify(G.evGaps(A)) === JSON.stringify([D(2)]), G.evGaps(A));
  const st = G.statusOn('ann', D(2));
  check('a planned day-off travel order counts as out', st && st.kind === 'off', st);
});

withState(Object.assign({}, base, {
  entries: [{ id: 'q', username: 'bob', type: 'USE', date: D(4), days: 1, status: 'Pending' }], events: [], travelOrders: []
}), function(){
  const b = G.busyOn('bob', D(4));
  check('a pending day-off request makes them unavailable', b && b.hard, b);
});

(function(){
  // day counts: travel orders are field days; dispatch orders count as office days
  const ym = T.slice(0, 7), y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1;
  const wk = []; for (let d = 1; d <= 28 && wk.length < 3; d++){ const s = G.ymd(new Date(y, m, d)); const w = new Date(y, m, d).getDay(); if (w > 0 && w < 6) wk.push(s); }
  withState(Object.assign({}, base, {
    events: [{ id: 'C', title: 'Flag ceremony', date: wk[1], dateTo: wk[2], status: 'Confirmed', kind: 'tasking', assigned: ['bob'] }],
    travelOrders: [{ id: 'T', status: 'Prepared', toType: 'regular', names: ['BOB CRUZ'], usernames: ['bob'], dateFrom: wk[0], dateTo: wk[0], event: 'x', destination: 'y' }]
  }), function(){
    const r = G.staffDays('bob', ym);
    check('day counts: travel orders are field, dispatch orders are office', r.field === 1 && r.office === r.work - 1 && r.off === 0, r);
  });
})();

withState(Object.assign({}, base), function(){
  check('people sharing a first name get a last-name initial', G.shortName('ann') === 'Ann R.' && G.shortName('ann2') === 'Ann S.' && G.shortName('bob') === 'Bob');
  check('likely duplicates are found by name and date', G.evDupScore({ title: 'DOJ quarterly meeting', date: D(3) }, { title: 'Quarterly Meeting of Department of Justice', date: D(3) }) >= 0.75);
  check('a weekly session a week apart is not a duplicate', G.evDupScore({ title: 'PB regular session', date: D(1) }, { title: 'Provincial Board regular session', date: D(8) }) === 0);
});

/* ---------- 5. menus per role ---------- */
withState(Object.assign({}, base, { me: { username: "bob", name: "Bob Cruz", role: "employee", empType: "JO" } }), function(){
  const nav = G.navItems(), main = nav.filter(G.navMain).map(function(n){ return n[0]; });
  check("staff see four main places", JSON.stringify(main) === JSON.stringify(["dashboard", "calendar", "travel", "log"]), main);
  check("folded pages stay reachable under More", ["tev", "monthly", "records"].every(function(v){ return nav.some(function(n){ return n[0] === v && !G.navMain(n); }); }));
});
withState(Object.assign({}, base, { me: users[0] }), function(){
  check("admins keep the full menu", G.navItems().every(G.navMain) && G.navItems().length >= 9);
});

report();
function report(){
  console.log('');
  fails.forEach(function(f){ console.log('  ✗ ' + f); });
  console.log((fail ? '✗ ' : '✓ ') + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
