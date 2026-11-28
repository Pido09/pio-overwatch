/* Automatic checks for PIO Overwatch. Run with:  node tests/run.js   (or: npm test)
   Loads the app's own code (js/*.js) in a sandbox with a tiny fake browser, then checks the rules the office relies on:
   offsets and day offs, travel orders, events, availability, day counts, duplicates and names.
   No data is read or written anywhere: everything runs on sample data in memory. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0; const fails = [];
function check(name, ok, detail){ if (ok){ pass++; } else { fail++; fails.push(name + (detail !== undefined ? '  →  ' + JSON.stringify(detail) : '')); } }

/* ---------- 1. files and versions ---------- */
const order = ['core.js', 'views.js', 'events.js', 'documents.js', 'data.js', 'tasks.js', 'pub.js', 'push.js', 'app.js'];
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
  check("staff see four main places", JSON.stringify(main) === JSON.stringify(["dashboard", "calendar", "tasks", "travel"]), main);
  check("folded pages stay reachable under More", ["log", "tev", "monthly", "records"].every(function(v){ return nav.some(function(n){ return n[0] === v && !G.navMain(n); }); }));
});
withState(Object.assign({}, base, { me: users[0] }), function(){
  check("admins keep the full menu", G.navItems().every(G.navMain) && G.navItems().length >= 9);
});

/* ---------- 6. tasks: templates, people per step, who may do what ---------- */
(function(){
  const E = engine({ divisions: [{ id: 'd1', name: 'Social Media and Production Division', short: 'Social Media' }] }), find = function(id){ return E.dump().tasks.filter(function(t){ return t.id === id; })[0]; };
  // a congratulatory pubmat: design (bob), caption (lead), proofreading (anyone but the writer), posting (adm)
  let r = E.run('lead', 'saveTask', { title: 'Congratulatory pubmat: board exam passers', template: 'pubmat', who: [['bob'], ['lead'], [], ['adm']], due: D(2) });
  const id = r.ok && r.data.id, t0 = r.ok && find(id);
  check('a task follows its template, with people per step', r.ok && t0.steps.length === 4 && t0.steps[0].who[0] === 'bob' && t0.steps[1].who[0] === 'lead' && t0.template === 'pubmat', r.error || t0);
  check('everyone on any step is on the task', r.ok && ['bob', 'lead', 'adm'].every(function(u){ return t0.assignees.indexOf(u) >= 0; }), t0 && t0.assignees);
  check('a task keeps its due date', r.ok && t0.due === D(2));
  check('a work step needs someone', !E.run('lead', 'saveTask', { title: 'Pubmat for the job fair', template: 'pubmat', who: [[], [], [], []] }).ok);
  check('steps go in order: the caption waits for the layout', !E.run('bob', 'taskStep', { id: id, step: 'undo' }).ok && G.taskStepsOf(find(id)).every(function(x){ return !x.doneAt; }));
  check('a multi-step task cannot be ticked done at once', !E.run('bob', 'setTaskDone', { id: id, done: '1' }).ok);
  r = E.run('bob', 'taskStep', { id: id, step: 'done' });
  check('the person on a step finishes it', r.ok && find(id).steps[0].doneBy === 'bob' && find(id).status === 'Open', r.error);
  check('a step is only for its people', !E.run('bob', 'taskStep', { id: id, step: 'done' }).ok);
  check('the caption step needs the caption', !E.run('lead', 'taskStep', { id: id, step: 'done' }).ok);
  E.run('lead', 'taskStep', { id: id, step: 'done', text: 'Congratulations to our new board passers!' });
  check('the caption is kept on the task', find(id).caption === 'Congratulations to our new board passers!');
  check('the writer cannot proofread their own caption', !E.run('lead', 'taskStep', { id: id, step: 'done' }).ok);
  check('sending back needs a note', !E.run('bob', 'taskStep', { id: id, step: 'back' }).ok);
  r = E.run('bob', 'taskStep', { id: id, step: 'back', note: 'Spell out the names' });
  check('a proofreader sends it back to the caption', r.ok && !find(id).steps[1].doneAt && find(id).steps[0].doneAt && find(id).sentBack.step === 'Caption', find(id).sentBack);
  E.run('lead', 'taskStep', { id: id, step: 'done', text: 'Congratulations to our new board passers!' });
  r = E.run('bob', 'taskStep', { id: id, step: 'done', text: 'Congratulations to our new passers!', note: 'Shortened it' });
  const pf = find(id).steps[2];
  check('the proofreader and their edits are recorded', r.ok && pf.doneBy === 'bob' && pf.edits === true && pf.note === 'Shortened it', pf);
  check('the proofread caption is what gets posted', find(id).caption === 'Congratulations to our new passers!');
  check('posting is for the person on that step', !E.run('bob', 'taskStep', { id: id, step: 'done' }).ok);
  r = E.run('adm', 'taskStep', { id: id, step: 'done' });
  check('the last step finishes the task', r.ok && find(id).status === 'Done' && find(id).doneBy === 'adm');
  check('only the person who did a step can undo it', !E.run('bob', 'taskStep', { id: id, step: 'undo' }).ok && E.run('adm', 'taskStep', { id: id, step: 'undo' }).ok && find(id).status === 'Open');
  // staff: tasks for themselves only
  r = E.run('bob', 'saveTask', { title: 'Caption for the clean-up drive', template: 'release', who: [['lead'], [], ['lead']] });
  const own = r.ok && find(r.data.id);
  check('staff can only give tasks to themselves', r.ok && JSON.stringify(own.assignees) === JSON.stringify(['bob']), own && own.assignees);
  check('staff cannot change a task someone gave them', !E.run('bob', 'saveTask', { id: id, title: 'Renamed', template: 'pubmat', who: [['bob'], ['bob'], [], ['bob']] }).ok);
  check('staff cannot remove a task someone gave them', !E.run('bob', 'deleteTask', { id: id }).ok);
  check('staff can remove their own task', E.run('bob', 'deleteTask', { id: own.id }).ok);
  // a photo task ends with proofreading
  r = E.run('lead', 'saveTask', { title: 'Photos: job fair', template: 'photo', who: [['bob'], ['lead'], []] });
  const ph = r.ok && r.data.id; E.run('bob', 'taskStep', { id: ph, step: 'done' }); E.run('lead', 'taskStep', { id: ph, step: 'done', text: 'Scenes from the job fair' });
  check('a photo task is finished by its proofreading', r.ok && E.run('bob', 'taskStep', { id: ph, step: 'done' }).ok && find(ph).status === 'Done', find(ph) && find(ph).status);
  // posting: the designer by default; only the posting divisions
  r = E.run('lead', 'saveTask', { title: 'Pubmat: road safety', template: 'pubmat', who: [['bob'], ['lead'], [], []] });
  check('posting goes to the designer when left empty', r.ok && JSON.stringify(find(r.data.id).steps[3].who) === JSON.stringify(['bob']), r.ok && find(r.data.id).steps[3].who);
  // one-step tasks still use the round check
  r = E.run('lead', 'saveTask', { title: 'Edit the Bayanihan video clips', template: 'other', who: [['bob']] });
  check('a one-step task is ticked done', r.ok && E.run('bob', 'setTaskDone', { id: r.data.id, done: '1' }).ok && find(r.data.id).status === 'Done');
  // older tasks (before steps) still work
  const E2 = engine({ tasks: [{ id: 'old', title: 'Old task', kind: 'Caption', assignees: ['bob'], status: 'Open', createdBy: 'lead', createdAt: new Date().toISOString() }] });
  check('tasks from before templates can still be finished', E2.run('bob', 'setTaskDone', { id: 'old', done: '1' }).ok && E2.dump().tasks[0].status === 'Done');
  // (this loads its own office, so it runs last)
  const E3 = engine({ divisions: [{ id: 'd1', name: 'Admin and Support Division', short: 'Admin' }, { id: 'd2', name: 'Bantayog Division', short: 'Bantayog' }],
    users: [{ username: 'adm', name: 'Admin One', role: 'admin', active: true, division: 'd1' }, { username: 'bob', name: 'Bob Cruz', role: 'employee', active: true, division: 'd2' }] });
  check('only Bantayog, Social Media and Special Projects staff can post', !E3.run('adm', 'saveTask', { title: 'Pubmat: flag day', template: 'pubmat', who: [['bob'], ['bob'], [], ['adm']] }).ok && E3.run('adm', 'saveTask', { title: 'Pubmat: flag day', template: 'pubmat', who: [['bob'], ['bob'], [], ['bob']] }).ok);
})();

/* ---------- 8. phone alerts: who is alerted when something changes ---------- */
(function(){
  const T = G.taskTpl('pubmat'), mk = function(done){ return [{ id: 'P', title: 'Pubmat: flag day', template: 'pubmat', kind: 'Pubmat', status: 'Open', createdBy: 'adm', createdAt: new Date().toISOString(), assignees: ['bob', 'ann'],
    steps: T.steps.map(function(x, i){ return { id: 's' + i, name: x[0], skill: x[1], type: x[2], who: i === 0 || i === 3 ? ['bob'] : i === 1 ? ['ann'] : [], doneBy: i < done ? (i === 1 ? 'ann' : 'bob') : '', doneAt: i < done ? new Date().toISOString() : '' }; }) }]; };
  const st = Object.assign({}, base, { divisions: [{ id: 'd1', name: 'Social Media and Production Division', short: 'Social Media' }], events: [], travelOrders: [] });
  let before, after;
  withState(Object.assign({}, st, { tasks: mk(0) }), function(){ before = G.pushSnap(); });
  check('a new task alerts the first step its turn, the rest that they are on it', before.some(function(a){ return a.to === 'bob' && /^turn:P:0/.test(a.id); }) && before.some(function(a){ return a.to === 'ann' && a.id === 'new:P'; }), before);
  withState(Object.assign({}, st, { tasks: mk(1) }), function(){ after = G.pushSnap(); });
  const d = G.pushDiff(before, after);
  check('finishing the design alerts the caption writer', d.length === 1 && d[0].to === 'ann' && /^turn:P:1/.test(d[0].id), d);
  withState(Object.assign({}, st, { tasks: mk(2) }), function(){ after = G.pushSnap(); });
  check('nobody is alerted about their own change', G.pushSnap && after.every(function(a){ return a.to !== 'adm'; }));
  withState(Object.assign({}, st, { events: [{ id: 'E', title: 'Board session', date: D(1), dateTo: D(1), status: 'Confirmed', kind: 'tasking', assigned: ['bob'] }], tasks: [] }), function(){ after = G.pushSnap(); });
  check('a new dispatch alerts the person', after.some(function(a){ return a.to === 'bob' && a.id === 'asg:E'; }));
})();
/* the push encryption matches the standard's worked example, and our signature verifies */
(function(){
  let r = {}; try { r = JSON.parse(require('child_process').execFileSync(process.execPath, [require('path').join(root, 'tests', 'webpush.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop()); } catch (e) { r = { error: String(e) }; }
  check('phone alert encryption matches the web push standard (RFC 8291)', r.rfc === true, r);
  check('phone alert signature verifies (VAPID)', r.vapid === true, r);
})();

/* ---------- 9. Bantayog Publication: board scores 1–5, the Bantayog leader locks the lineup ---------- */
(function(){
  const E = engine({ divisions: [{ id: 'b', name: 'Bantayog Division', short: 'Bantayog' }, { id: 'o', name: 'Admin and Support Division', short: 'Admin' }],
    users: [{ username: 'adm', name: 'Admin One', role: 'admin', active: true, division: 'o' },
            { username: 'lead', name: 'Lead Two', role: 'scheduler', active: true, division: 'b' },
            { username: 'olead', name: 'Other Lead', role: 'scheduler', active: true, division: 'o' },
            { username: 'ana', name: 'Ana Writer', role: 'employee', active: true, division: 'b' },
            { username: 'bob', name: 'Bob Cruz', role: 'employee', active: true, division: 'o' }] });
  const D0 = function(n){ return D(n); }, pub = function(){ return E.dump().pubs[0]; }, items = function(){ return E.dump().pubItems; }, votes = function(){ return E.dump().pubVotes; };
  check('only an admin picks the editorial board', !E.run('lead', 'setBoard', { usernames: ['ana'] }).ok && E.run('adm', 'setBoard', { usernames: ['ana', 'bob'] }).ok && E.dump().users.filter(function(u){ return u.board; }).length === 2);
  check('only the Bantayog leader or an admin starts an issue', !E.run('olead', 'savePub', { title: 'Bantayog, Dec', from: D0(0), to: D0(20) }).ok && E.run('lead', 'savePub', { title: 'Bantayog, Dec', from: D0(0), to: D0(20) }).ok);
  const pid = pub().id;
  let r = E.run('ana', 'savePubItem', { issueId: pid, title: 'Caravan reaches Labo', link: 'https://facebook.com/post/1', postedOn: D0(1) });
  check('board members add articles', r.ok, r.error);
  const a1 = r.data.id;
  check('people not on the board cannot add articles', !E.run('olead', 'savePubItem', { issueId: pid, title: 'Something else' }).ok);
  check('the same post is not added twice', !E.run('bob', 'savePubItem', { issueId: pid, title: 'Caravan again', link: 'https://facebook.com/post/1' }).ok);
  check('links must be web links', !E.run('bob', 'savePubItem', { issueId: pid, title: 'Bad link', link: 'facebook post' }).ok);
  const a2 = E.run('bob', 'savePubItem', { issueId: pid, title: 'Budget approved' }).data.id;
  check('scoring waits for voting to open', !E.run('ana', 'scorePub', { itemId: a1, score: 4 }).ok);
  E.run('lead', 'pubStage', { id: pid, stage: 'vote' });
  check('scores go from 1 to 5', !E.run('ana', 'scorePub', { itemId: a1, score: 6 }).ok && !E.run('ana', 'scorePub', { itemId: a1, score: 2.5 }).ok);
  check('only board members score', !E.run('lead', 'scorePub', { itemId: a1, score: 5 }).ok);
  E.run('ana', 'scorePub', { itemId: a1, score: 5 }); E.run('bob', 'scorePub', { itemId: a1, score: 4 }); E.run('ana', 'scorePub', { itemId: a1, score: 3 });
  const v1 = votes().filter(function(v){ return v.itemId === a1; });
  check('each board member has one score per article (re-scoring replaces it)', v1.length === 2 && v1.some(function(v){ return v.username === 'ana' && v.score === 3; }), v1);
  check('the average is worked out from the scores', G.pubAvg && G.pubAvg(v1) === 3.5, G.pubAvg && G.pubAvg(v1));
  check('locking needs at least one article included', !E.run('lead', 'pubStage', { id: pid, stage: 'final' }).ok);
  check('only the Bantayog leader or an admin decides the lineup', !E.run('ana', 'pubPick', { id: a1, pick: 'in' }).ok && E.run('lead', 'pubPick', { id: a1, pick: 'in' }).ok && E.run('lead', 'pubPick', { id: a2, pick: 'out' }).ok);
  r = E.run('lead', 'pubStage', { id: pid, stage: 'final' });
  check('the leader locks the final lineup', r.ok && pub().stage === 'final' && pub().finalBy === 'lead', r.error);
  check('a locked lineup takes no more scores or articles', !E.run('bob', 'scorePub', { itemId: a2, score: 5 }).ok && !E.run('ana', 'savePubItem', { issueId: pid, title: 'Late article' }).ok);
})();

report();
function report(){
  console.log('');
  fails.forEach(function(f){ console.log('  ✗ ' + f); });
  console.log((fail ? '✗ ' : '✓ ') + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
