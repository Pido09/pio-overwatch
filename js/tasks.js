/* =====================================================================
   Tasks: graphic design, captions, writing and other work beyond dispatches.
   Admins and division leaders give tasks to anyone; anyone may give themselves a task;
   the people on a task just mark it done. Finished tasks feed the daily and monthly report.
   ===================================================================== */
var TASK_IC = { 'Graphic design': 'pen', 'Caption': 'edit', 'Writing': 'edit', 'Photo': 'camera', 'Video': 'camera', 'Layout': 'grid', 'Social media post': 'megaphone', 'Other': 'star' };
function canLead(){ return isAdmin() || (S.me && S.me.role === 'scheduler'); }
function taskSelf(t){ return t.createdBy === S.me.username && (t.assignees || []).length === 1 && t.assignees[0] === S.me.username; }
function taskCanEdit(t){ return canLead() || taskSelf(t); }
function taskCanDone(t){ return canLead() || (t.assignees || []).indexOf(S.me.username) >= 0; }
function taskDay(iso){ return iso ? ymd(new Date(iso)) : ''; }
function tasksAll(){ return (S.tasks || []).filter(function(t){ return !t._del; }); }
function taskSort(a, b){ var x = a.due || '9999', y = b.due || '9999'; return x < y ? -1 : x > y ? 1 : (a.createdAt < b.createdAt ? -1 : 1); }
function myOpenTasks(){ var me = S.me.username; return tasksAll().filter(function(t){ return t.status !== 'Done' && (t.assignees || []).indexOf(me) >= 0; }).sort(taskSort); }
function taskDue(t){
  if (t.status === 'Done') return { cls: 'done', txt: 'Done ' + fDate(taskDay(t.doneAt), { month: 'short', day: 'numeric' }) + (t.doneBy && t.doneBy !== S.me.username ? ' by ' + firstName(t.doneBy) : '') };
  if (!t.due) return { cls: '', txt: 'No due date' };
  var n = dayDiff(t.due, today());
  if (n < 0) return { cls: 'late', txt: 'Overdue · ' + fDate(t.due, { month: 'short', day: 'numeric' }) };
  if (n === 0) return { cls: 'soon', txt: 'Due today' };
  if (n === 1) return { cls: 'soon', txt: 'Due tomorrow' };
  return { cls: '', txt: 'Due ' + fDate(t.due, n < 7 ? { weekday: 'long' } : { weekday: 'short', month: 'short', day: 'numeric' }) };
}
/* one task: a round check button, what to do, when, and who */
function taskRow(t, opts){
  opts = opts || {}; var done = t.status === 'Done', due = taskDue(t), can = taskCanDone(t), who = t.assignees || [];
  var faces = opts.noFaces || (who.length === 1 && who[0] === S.me.username) ? '' : '<span class="tk-faces" data-tip="' + esc(who.map(function(u){ return userName(u); }).join('\n')) + '">' + who.slice(0, 3).map(function(u){ return avatarHtml(userOf(u) || { username: u, name: u }, 26); }).join('') + (who.length > 3 ? '<span class="tk-more">+' + (who.length - 3) + '</span>' : '') + '</span>';
  var from = t.createdBy && t.createdBy !== S.me.username && !(who.length === 1 && who[0] === t.createdBy) ? ' · from ' + esc(firstName(t.createdBy)) : '';
  return '<li class="row tk-row' + (done ? ' is-done' : '') + '">' +
    (can ? '<button type="button" class="tk-check" data-act="taskDone" data-id="' + esc(t.id) + '" data-done="' + (done ? '0' : '1') + '" aria-pressed="' + done + '" aria-label="' + esc((done ? 'Mark not done: ' : 'Mark done: ') + t.title) + '">' + ic('tick') + '</button>'
         : '<span class="tk-check ro" aria-hidden="true">' + ic('tick') + '</span>') +
    '<button type="button" class="tk-body" data-act="taskOpen" data-id="' + esc(t.id) + '"><span class="tk-t">' + esc(t.title) + '</span>' +
    '<span class="tk-m"><span class="tk-kind">' + ic(TASK_IC[t.kind] || 'star') + esc(t.kind || 'Other') + '</span><span class="tk-due ' + due.cls + '">' + esc(due.txt) + '</span>' + from + '</span></button>' + faces + '</li>';
}

/* ---------- the Tasks page ---------- */
function viewTasks(){
  var lead = canLead(), me = S.me.username, scope = S.tkScope || (lead ? 'all' : 'mine'), tab = lead ? (S.tkTab || 'list') : 'list';
  var all = tasksAll(), open = all.filter(function(t){ return t.status !== 'Done'; });
  var mine = function(t){ return (t.assignees || []).indexOf(me) >= 0; };
  var L = all.filter(function(t){ return scope === 'mine' ? mine(t) : scope === 'given' ? t.createdBy === me && !taskSelf(t) : true; });
  var td = today(), wk = addDays(td, -7);
  var late = L.filter(function(t){ return t.status !== 'Done' && t.due && t.due < td; }).sort(taskSort);
  var now = L.filter(function(t){ return t.status !== 'Done' && t.due && t.due >= td && t.due <= addDays(td, 1); }).sort(taskSort);
  var later = L.filter(function(t){ return t.status !== 'Done' && t.due > addDays(td, 1); }).sort(taskSort);
  var nodue = L.filter(function(t){ return t.status !== 'Done' && !t.due; }).sort(taskSort);
  var done = L.filter(function(t){ return t.status === 'Done' && taskDay(t.doneAt) >= wk; }).sort(function(a, b){ return a.doneAt < b.doneAt ? 1 : -1; });
  var sec = function(name, list, cls){ return list.length ? '<li class="tk-sec ' + (cls || '') + '">' + name + ' · ' + list.length + '</li>' + list.map(function(t){ return taskRow(t); }).join('') : ''; };
  var chips = '<div class="tk-scope" role="group" aria-label="Show">' + (lead ? [['all', 'Everyone'], ['given', 'Given by me'], ['mine', 'Mine']] : [['mine', 'Mine'], ['all', 'Everyone']]).map(function(x){
    return '<button type="button" class="chip" data-act="tkScope" data-s="' + x[0] + '" aria-pressed="' + (scope === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  var body = sec('Overdue', late, 'late') + sec('Today and tomorrow', now) + sec('Coming up', later) + sec('No due date', nodue) + sec('Done this week', done, 'done');
  var list = panel(scope === 'mine' ? 'Your tasks' : scope === 'given' ? 'Tasks you gave' : 'Everyone’s tasks', 'tick', '<div class="panel-b" style="padding-bottom:4px">' + chips + '</div>' +
    (body ? '<ul class="list tk-list">' + body + '</ul>' : empty('tick', scope === 'mine' ? 'Nothing on your list' : 'No tasks here yet', lead ? 'Give someone a task, like a pubmat or a caption, and it shows up on their Home.' : 'Add a task for yourself to keep track of your work.', '<button class="btn btn-primary" data-act="taskNew">' + ic('plus') + 'New task</button>')), '', 'span-12');
  var tabs = lead ? '<div class="tk-tabs" role="tablist"><button type="button" role="tab" data-act="tkTab" data-t="list" aria-selected="' + (tab === 'list') + '">' + ic('tick') + 'To do</button><button type="button" role="tab" data-act="tkTab" data-t="report" aria-selected="' + (tab === 'report') + '">' + ic('chart') + 'Report</button></div>' : '';
  var lateAll = open.filter(function(t){ return t.due && t.due < td; }).length;
  return { eyebrow: 'Work', title: 'Tasks',
    sub: lead ? open.length + ' open across the office' + (lateAll ? ' · ' + lateAll + ' overdue' : '') + '. Tap a task to see or change it.' : myOpenTasks().length + ' open for you. Tap the circle when you finish one.',
    actions: '<button class="btn btn-sun" data-act="taskNew">' + ic('plus') + 'New task</button>',
    body: '<div class="grid">' + (tabs ? '<div class="span-12">' + tabs + '</div>' : '') + (tab === 'report' ? taskReport() : list) + '</div>' };
}

/* ---------- task form: new, edit, or just look ---------- */
function taskModal(t, preset){
  t = t || null; preset = preset || {};
  var lead = canLead(), me = S.me.username, edit = !t || taskCanEdit(t);
  if (t && !edit){
    var dd = taskDue(t), ev = t.eventId && S.events.filter(function(e){ return e.id === t.eventId; })[0];
    return modal(esc(t.title), '<div class="tk-view"><p class="tk-m"><span class="tk-kind">' + ic(TASK_IC[t.kind] || 'star') + esc(t.kind) + '</span><span class="tk-due ' + dd.cls + '">' + esc(dd.txt) + '</span></p>' +
      (t.note ? '<p style="white-space:pre-line">' + esc(t.note) + '</p>' : '') + (ev ? '<p class="hint">For: ' + esc(ev.title) + ' · ' + esc(fDate(ev.date)) + '</p>' : '') +
      '<div class="label">People</div><div class="tk-ppl">' + (t.assignees || []).map(function(u){ return personBubble(u); }).join('') + '</div>' +
      '<p class="hint">Given by ' + esc(userName(t.createdBy)) + ' on ' + esc(fDate(taskDay(t.createdAt))) + '</p></div>',
      (taskCanDone(t) ? '<button type="button" class="btn btn-primary" data-act="taskDone" data-id="' + esc(t.id) + '" data-done="' + (t.status === 'Done' ? '0' : '1') + '">' + ic('tick') + (t.status === 'Done' ? 'Mark not done' : 'Mark done') + '</button>' : '<button type="button" class="btn btn-ghost" data-act="close">Close</button>'));
  }
  var picked = t ? t.assignees : preset.assignees || [me];
  var kind = (t && t.kind) || preset.kind || lGet('pio_tk_kind') || 'Graphic design';
  var people = lead ? '<fieldset class="tk-pick"><legend>Who will do it</legend><div class="tk-pick-l">' + S.users.filter(function(u){ return u.active; }).sort(byDiv).map(function(u){
      return '<label class="tk-p"><input type="checkbox" name="assignees" value="' + esc(u.username) + '"' + (picked.indexOf(u.username) >= 0 ? ' checked' : '') + '>' + avatarHtml(u, 30) + '<span>' + esc(shortName(u)) + (u.username === me ? ' (you)' : '') + '</span></label>'; }).join('') + '</div></fieldset>'
    : '<div class="tk-self">' + avatarHtml(userOf(me) || S.me, 30) + '<span>This task is for you. Division leaders and admins can give tasks to others.</span></div>';
  var evs = S.events.filter(function(e){ return e.status !== 'Cancelled' && (e.dateTo || e.date) >= addDays(today(), -7) && e.date <= addDays(today(), 45); }).sort(function(a, b){ return a.date < b.date ? -1 : 1; });
  var evId = (t && t.eventId) || preset.eventId || '';
  var due = t ? t.due : preset.due || '';
  var body = '<input type="hidden" name="id" value="' + esc(t ? t.id : '') + '">' +
    '<div class="field"><label for="tkT">What needs to be done</label><input class="input" id="tkT" name="title" maxlength="140" required placeholder="e.g. Pubmat for the job fair" value="' + esc(t ? t.title : preset.title || '') + '"></div>' +
    '<fieldset class="tk-kinds"><legend>Kind of work</legend>' + TASK_KINDS.map(function(k){ return '<label class="chip tk-k"><input type="radio" name="kind" value="' + esc(k) + '"' + (k === kind ? ' checked' : '') + '>' + ic(TASK_IC[k] || 'star') + esc(k) + '</label>'; }).join('') + '</fieldset>' +
    people +
    '<div class="two"><div class="field"><label for="tkD">Due date <span class="hint">(optional)</span></label><input class="input" type="date" id="tkD" name="due" value="' + esc(due) + '">' +
      '<div class="tk-quick"><button type="button" class="chip" data-act="tkDue" data-n="0">Today</button><button type="button" class="chip" data-act="tkDue" data-n="1">Tomorrow</button><button type="button" class="chip" data-act="tkDue" data-n="">No date</button></div></div>' +
    '<div class="field"><label for="tkE">For an event <span class="hint">(optional)</span></label><select class="input" id="tkE" name="eventId"><option value="">None</option>' + evs.map(function(e){ return '<option value="' + esc(e.id) + '"' + (e.id === evId ? ' selected' : '') + '>' + esc(fDate(e.date, { month: 'short', day: 'numeric' }) + ' · ' + e.title) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="tkN">Notes <span class="hint">(optional)</span></label><textarea class="input" id="tkN" name="note" rows="3" maxlength="600" placeholder="Sizes, wording, links to photos…">' + esc(t ? t.note : '') + '</textarea></div>';
  var foot = (t ? '<button type="button" class="btn btn-danger" data-act="taskDel" data-id="' + esc(t.id) + '">' + ic('trash') + 'Remove</button>' : '') +
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (t ? 'Save' : ic('plus') + 'Add task') + '</button>';
  modal(t ? 'Edit task' : 'New task', body, foot, 'saveTask');
}
/* saving the form: the people boxes are gathered here (a form only keeps one value per name) */
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveTask"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var d = {}; new FormData(f).forEach(function(v, k){ if (typeof v === 'string' && k !== 'assignees') d[k] = v; });
  d.assignees = [].slice.call(f.querySelectorAll('input[name="assignees"]:checked')).map(function(x){ return x.value; });
  var err = document.getElementById('merr');
  if (canLead() && !d.assignees.length){ if (err) err.textContent = 'Pick who will do it.'; return; }
  if (d.kind) lSet('pio_tk_kind', d.kind);
  var who = d.assignees.length === 1 && d.assignees[0] === S.me.username ? 'you' : d.assignees.length === 1 ? firstName(d.assignees[0]) : d.assignees.length + ' people';
  busy(f.querySelector('[type=submit]'), act('saveTask', d, d.id ? 'Task saved' : 'Task added for ' + who).then(closeModal), 'merr');
}, true);

/* ---------- clicks ---------- */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act;
  if (a === 'taskNew'){ taskModal(null, t.dataset.u ? { assignees: [t.dataset.u] } : {}); return; }
  if (a === 'taskOpen'){ var tk = tasksAll().filter(function(x){ return x.id === t.dataset.id; })[0]; if (tk) taskModal(tk); return; }
  if (a === 'tkScope'){ S.tkScope = t.dataset.s; render(); return; }
  if (a === 'tkTab'){ S.tkTab = t.dataset.t; render(); return; }
  if (a === 'tkDue'){ var inp = document.getElementById('tkD'); if (inp) inp.value = t.dataset.n === '' ? '' : addDays(today(), +t.dataset.n); return; }
  if (a === 'taskDel'){
    if (!t.dataset.sure){ t.dataset.sure = '1'; t.innerHTML = ic('trash') + 'Tap again to remove'; setTimeout(function(){ if (document.body.contains(t)){ delete t.dataset.sure; t.innerHTML = ic('trash') + 'Remove'; } }, 4000); return; }
    busy(t, act('deleteTask', { id: t.dataset.id }, 'Task removed').then(closeModal), 'merr'); return;
  }
  if (a === 'taskDone'){
    var on = t.dataset.done === '1', row = t.closest('.tk-row');
    if (row){ row.classList.toggle('is-done', on); t.setAttribute('aria-pressed', on); if (on && !lessMotion()) t.animate([{ transform: 'scale(.8)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
    var go = function(){ return act('setTaskDone', { id: t.dataset.id, done: on ? '1' : '0' }, on ? 'Nice work. Task done.' : 'Task reopened').then(function(){ if (document.querySelector('#modal .tk-view')) closeModal(); }); };
    // a short pause so the tick is seen before the list re-sorts
    if (row && on && !lessMotion()) busy(t, new Promise(function(res){ setTimeout(res, 420); }).then(go)); else busy(t, go());
  }
});

/* ---------- Home: "Your tasks" ---------- */
function myTasksWidget(n){
  var L = myOpenTasks(), lead = canLead(), td = today();
  var open = tasksAll().filter(function(t){ return t.status !== 'Done'; }), late = open.filter(function(t){ return t.due && t.due < td; }).length;
  var doneToday = tasksAll().filter(function(t){ return t.status === 'Done' && taskDay(t.doneAt) === td && (t.assignees || []).indexOf(S.me.username) >= 0; }).length;
  var head = '<div class="tk-sum">' + (L.length ? '<b>' + L.length + '</b> open for you' : 'Nothing open for you') + (doneToday ? ' · <b>' + doneToday + '</b> done today' : '') +
    (lead ? ' <span class="hint">· ' + open.length + ' open across the office' + (late ? ', <span class="tk-due late">' + late + ' overdue</span>' : '') + '</span>' : '') + '</div>';
  var body = L.length ? '<ul class="list tk-list">' + L.slice(0, 5).map(function(t){ return taskRow(t, { noFaces: true }); }).join('') + '</ul>' + (L.length > 5 ? '<div class="panel-b"><button class="btn btn-sm btn-ghost" data-go="tasks">See all ' + L.length + '</button></div>' : '')
    : '<div class="tk-empty"><span class="mt-ic">' + ic('tick') + '</span><div><b>All clear</b><span>' + (lead ? 'Give someone a task, or add one for yourself.' : 'Add a task for yourself, like a caption or a layout.') + '</span></div></div>';
  return panel('Your tasks', 'tick', head + body, '<div class="row-btns"><button class="btn btn-sm btn-ghost" data-go="tasks">All tasks</button><button class="btn btn-sm btn-primary" data-act="taskNew">' + ic('plus') + 'New</button></div>', span(n) + ' tk-panel');
}

/* ---------- report for Ma'am Sarah: what each person finished, by day or by month ---------- */
function taskReport(){
  var mode = S.rpMode || 'day', td = today(), at = S.rpAt || td;
  var from = mode === 'day' ? at : at.slice(0, 7) + '-01', to = mode === 'day' ? at : ymd(new Date(+at.slice(0, 4), +at.slice(5, 7), 0));
  var label = mode === 'day' ? fDate(at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : fMonth(at.slice(0, 7));
  var done = tasksAll().filter(function(t){ var d = taskDay(t.doneAt); return t.status === 'Done' && d >= from && d <= to; });
  var people = S.users.filter(function(u){ return u.active; }).sort(byDiv).map(function(u){
    var mine = done.filter(function(t){ return (t.assignees || []).indexOf(u.username) >= 0; }).sort(function(a, b){ return a.doneAt < b.doneAt ? -1 : 1; });
    var trips = tripsFor(u.username, from, to);
    return { u: u, tasks: mine, trips: trips };
  });
  var active = people.filter(function(p){ return p.tasks.length || p.trips.length; }), quiet = people.length - active.length;
  var open = tasksAll().filter(function(t){ return t.status !== 'Done'; }), late = open.filter(function(t){ return t.due && t.due < td; }).length;
  var kinds = {}; done.forEach(function(t){ kinds[t.kind] = (kinds[t.kind] || 0) + 1; });
  var tile = function(n, l){ return '<div class="mm-t"><b>' + n + '</b><span>' + l + '</span></div>'; };
  var nTrips = active.reduce(function(s, p){ return s + p.trips.length; }, 0);
  var nav = '<div class="row-btns wk-nav no-print"><button type="button" class="icon-btn" data-act="rpNav" data-d="-1" aria-label="Earlier">' + ic('left') + '</button><span class="wk-lab">' + esc(label) + '</span><button type="button" class="icon-btn" data-act="rpNav" data-d="1" aria-label="Later">' + ic('right') + '</button></div>';
  var modes = '<div class="tk-scope no-print" role="group" aria-label="Report period"><button type="button" class="chip" data-act="rpMode" data-m="day" aria-pressed="' + (mode === 'day') + '">Daily</button><button type="button" class="chip" data-act="rpMode" data-m="month" aria-pressed="' + (mode === 'month') + '">Monthly</button>' +
    (at !== td ? '<button type="button" class="chip" data-act="rpToday">Back to today</button>' : '') + '</div>';
  var rows = active.map(function(p){
    var dv = divOf(p.u.division);
    return '<div class="rp-p"><div class="rp-who">' + avatarHtml(p.u, 40) + '<div><b>' + esc(p.u.name) + '</b><div class="hint">' + esc((dv ? dv.short + ' · ' : '') + p.tasks.length + (p.tasks.length === 1 ? ' task' : ' tasks') + ' · ' + p.trips.length + (p.trips.length === 1 ? ' dispatch' : ' dispatches')) + '</div></div></div>' +
      '<ul class="rp-l">' + p.tasks.map(function(t){ return '<li>' + ic(TASK_IC[t.kind] || 'star') + '<span><b>' + esc(t.title) + '</b><small>' + esc(t.kind + (mode === 'month' ? ' · ' + fDate(taskDay(t.doneAt), { month: 'short', day: 'numeric' }) : '')) + '</small></span></li>'; }).join('') +
      p.trips.map(function(x){ return '<li class="trip">' + ic('route') + '<span><b>' + esc(x.title) + '</b><small>' + esc([mode === 'month' ? fRange(x.d1, x.d2, { month: 'short', day: 'numeric' }) : '', x.place, x.st].filter(Boolean).join(' · ')) + '</small></span></li>'; }).join('') + '</ul></div>';
  }).join('');
  var head = '<div class="print-head"><img src="' + LOGO + '" alt=""><div><b>Provincial Information Office · Camarines Norte</b><div>' + (mode === 'day' ? 'Daily accomplishment summary · ' : 'Monthly accomplishment report · ') + esc(label) + '</div></div></div>';
  return panel((mode === 'day' ? 'Daily summary' : 'Monthly report') + ' · ' + esc(label), 'chart',
    '<div class="panel-b">' + head + modes +
      '<div class="mm-tiles rp-tiles">' + tile(done.length, 'Tasks done') + tile(nTrips, 'Dispatches') + tile(active.length, 'People with work') + tile(open.length, 'Still open' + (late ? ' · ' + late + ' late' : '')) + '</div>' +
      (Object.keys(kinds).length ? '<p class="hint rp-kinds">' + Object.keys(kinds).sort(function(a, b){ return kinds[b] - kinds[a]; }).map(function(k){ return kinds[k] + ' ' + k.toLowerCase(); }).join(' · ') + '</p>' : '') +
      (rows ? '<div class="rp-list">' + rows + '</div>' : empty('chart', 'Nothing recorded yet', mode === 'day' ? 'Finished tasks and dispatches for this day show here.' : 'Finished tasks and dispatches for this month show here.')) +
      (quiet && rows ? '<p class="hint" style="margin-top:12px">' + quiet + ' other ' + (quiet === 1 ? 'person has' : 'people have') + ' no finished tasks or dispatches ' + (mode === 'day' ? 'on this day' : 'this month') + ' (they may be doing office work not logged as tasks).</p>' : '') +
    '</div>', nav + '<button class="btn btn-sm btn-primary no-print" data-act="print">' + ic('print') + 'Print</button>', 'span-12 rp-panel');
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="rpNav"],[data-act="rpMode"],[data-act="rpToday"]'); if (!t) return;
  var a = t.dataset.act, at = S.rpAt || today(), mode = S.rpMode || 'day';
  if (a === 'rpMode'){ S.rpMode = t.dataset.m; }
  else if (a === 'rpToday'){ S.rpAt = today(); }
  else { var d = +t.dataset.d; S.rpAt = mode === 'day' ? addDays(at, d) : ymd(new Date(+at.slice(0, 4), +at.slice(5, 7) - 1 + d, 1)); }
  render();
});
