/* =====================================================================
   Tasks: posts, pubmats, press releases, photo and video work, and anything else.
   A task follows a template: a chain of steps (for a post: layout, caption, proofreading, posting),
   each with its own people, done in order. Who did each step, and any proofreading edits, are recorded.
   Admins and division leaders give tasks to anyone; anyone may give themselves a task.
   Finished steps, proofreading and dispatches feed the daily and monthly report.
   ===================================================================== */
var STEP_IC = { work: 'edit', proof: 'eye', post: 'megaphone' };
function canLead(){ return isAdmin() || (S.me && S.me.role === 'scheduler'); }
function taskSelf(t){ return t.createdBy === S.me.username && (t.assignees || []).length === 1 && t.assignees[0] === S.me.username; }
function taskCanEdit(t){ return canLead() || taskSelf(t); }
function taskDay(iso){ return iso ? ymd(new Date(iso)) : ''; }
function tasksAll(){ return (S.tasks || []).filter(function(t){ return !t._del; }); }
function taskSort(a, b){ var x = a.due || '9999', y = b.due || '9999'; return x < y ? -1 : x > y ? 1 : (a.createdAt < b.createdAt ? -1 : 1); }
function taskCur(t){ var st = taskStepsOf(t); for (var i = 0; i < st.length; i++) if (!st[i].doneAt) return { i: i, s: st[i], steps: st }; return null; }
function taskDoneN(t){ return taskStepsOf(t).filter(function(s){ return s.doneAt; }).length; }
function taskWriter(t, i){ var st = taskStepsOf(t), w = st.slice(0, i).filter(function(s){ return s.type === 'work'; }).pop(); return w ? w.doneBy : ''; }
/* may I do this step? (the engine checks the same) */
function stepMine(t, i){
  var s = taskStepsOf(t)[i], me = S.me.username; if (!s) return false;
  if (s.type === 'proof' && taskWriter(t, i) === me) return false;
  if (s.type === 'post' && !canPostMe()) return false;
  if (canLead()) return true;
  if (s.who.length) return s.who.indexOf(me) >= 0;
  return s.type === 'proof' || (t.assignees || []).indexOf(me) >= 0;
}
function canPostMe(){ var u = userOf(S.me.username) || S.me; return divCanPost(u.division); }
function postersOk(){ return S.users.filter(function(u){ return u.active && divCanPost(u.division); }); }
/* the caption on a task, with who wrote and who proofread it, and a Copy button */
function captionBox(t){
  if (!t.caption) return '';
  var st = taskStepsOf(t), w = st.filter(isCaptionStep)[0], p = st.filter(function(s){ return s.type === 'proof' && s.doneAt; }).pop();
  return '<div class="tk-cap"><div class="tk-cap-h"><b>' + ic('edit') + 'Caption</b><span class="hint">' + esc([w && w.doneBy ? 'by ' + firstName(w.doneBy) : '', p ? 'proofread by ' + firstName(p.doneBy) + (p.edits ? ', edited' : '') : 'not proofread yet'].filter(Boolean).join(' · ')) + '</span>' +
    '<button type="button" class="btn btn-sm btn-ghost tk-copy" data-act="tkCopy" data-id="' + esc(t.id) + '">' + ic('copy') + 'Copy</button></div><div class="tk-cap-t">' + esc(t.caption) + '</div></div>';
}
/* the button for whoever's turn it is */
function taskNext(t){
  var c = taskCur(t); if (!c || c.steps.length === 1 || !stepMine(t, c.i)) return null;
  var s = c.s;
  if (s.type === 'proof') return { label: s.name === 'Review' ? 'Review' : 'Proofread', icon: 'eye', type: 'proof' };
  if (s.type === 'post') return { label: 'Mark posted', icon: 'megaphone', type: 'post' };
  if (isCaptionStep(s)) return { label: t.caption ? 'Fix caption' : 'Write caption', icon: 'edit', type: 'work' };
  return { label: s.name.split(' ')[0] + ' done', icon: 'tick', type: 'work'};
}
function myTurn(t){
  if (t.status === 'Done') return false; var c = taskCur(t); if (!c) return false;
  if (c.steps.length === 1) return (c.s.who.length ? c.s.who : t.assignees || []).indexOf(S.me.username) >= 0;
  var s = c.s, me = S.me.username;
  if (s.who.length) return s.who.indexOf(me) >= 0 && stepMine(t, c.i);
  // open proofreading: shown to writers and leaders (not the person who wrote it)
  if (s.type === 'proof') return stepMine(t, c.i) && (canLead() || skillsOf(me).indexOf('Writer') >= 0);
  return (t.assignees || []).indexOf(me) >= 0;
}
function myOpenTasks(){ var me = S.me.username; return tasksAll().filter(function(t){ return t.status !== 'Done' && ((t.assignees || []).indexOf(me) >= 0 || myTurn(t)); }).sort(function(a, b){ return (myTurn(b) - myTurn(a)) || taskSort(a, b); }); }
function taskDue(t){
  if (t.status === 'Done') return { cls: 'done', txt: 'Done ' + fDate(taskDay(t.doneAt), { month: 'short', day: 'numeric' }) + (t.doneBy && t.doneBy !== S.me.username ? ' by ' + firstName(t.doneBy) : '') };
  if (!t.due) return { cls: '', txt: 'No due date' };
  var n = dayDiff(t.due, today());
  if (n < 0) return { cls: 'late', txt: 'Overdue · ' + fDate(t.due, { month: 'short', day: 'numeric' }) };
  if (n === 0) return { cls: 'soon', txt: 'Due today' };
  if (n === 1) return { cls: 'soon', txt: 'Due tomorrow' };
  return { cls: '', txt: 'Due ' + fDate(t.due, n < 7 ? { weekday: 'long' } : { weekday: 'short', month: 'short', day: 'numeric' }) };
}
function faces(list, size, max){ max = max || 3; return list.slice(0, max).map(function(u){ return avatarHtml(userOf(u) || { username: u, name: u }, size); }).join('') + (list.length > max ? '<span class="tk-more" style="width:' + size + 'px;height:' + size + 'px">+' + (list.length - max) + '</span>' : ''); }
function stepWho(t, s){ return s.who.length ? s.who.map(function(u){ return shortName(u) || u; }).join(', ') : s.type === 'proof' ? 'anyone but the writer' : 'anyone on the task'; }
/* the progress bar: "Assigned" plus one part per step; the part just finished grows in */
function taskBar(t, big){
  var st = taskStepsOf(t), c = taskCur(t), grow = S.tkJust && S.tkJust.id === t.id ? S.tkJust.i : -9, back = t.sentBack && c;
  var parts = [{ name: 'Assigned', on: true }].concat(st.map(function(s, i){ return { name: s.name, on: !!s.doneAt, next: c && c.i === i, grow: grow === i, type: s.type }; }));
  return '<span class="tk-bar' + (big ? ' big' : '') + (back ? ' back' : '') + '" role="img" aria-label="' + esc(taskDoneN(t) + ' of ' + st.length + ' steps done' + (c ? '. Now: ' + c.s.name : '')) + '" style="--n:' + parts.length + '">' + parts.map(function(p){
    return '<span class="tk-seg' + (p.on ? ' on' : '') + (p.next ? ' next' : '') + (p.grow ? ' grow' : '') + '"><i></i>' + (big ? '<small>' + esc(p.name.split(' ')[0]) + '</small>' : '') + '</span>'; }).join('') + '</span>';
}
/* one task row */
function taskRow(t, opts){
  opts = opts || {}; var done = t.status === 'Done', due = taskDue(t), who = t.assignees || [], st = taskStepsOf(t), one = st.length === 1, c = taskCur(t), nx = taskNext(t);
  var tpl = taskTpl(t.template), dn = taskDoneN(t);
  var canTick = one && (canLead() || (st[0].who.length ? st[0].who : who).indexOf(S.me.username) >= 0);
  var lead = !one ? '<span class="tk-ring" style="--p:' + ((dn + 1) / (st.length + 1)) + '" aria-hidden="true"><b>' + (done ? ic('tick') : dn + '/' + st.length) + '</b></span>'
    : canTick ? '<button type="button" class="tk-check" data-act="taskDone" data-id="' + esc(t.id) + '" data-done="' + (done ? '0' : '1') + '" aria-pressed="' + done + '" aria-label="' + esc((done ? 'Mark not done: ' : 'Mark done: ') + t.title) + '">' + ic('tick') + '</button>'
    : '<span class="tk-check ro" aria-hidden="true">' + ic('tick') + '</span>';
  var from = t.createdBy && t.createdBy !== S.me.username && !(who.length === 1 && who[0] === t.createdBy) ? ' · from ' + esc(firstName(t.createdBy)) : '';
  var now = !one && !done && c ? '<span class="tk-prog">' + taskBar(t) + '<span class="tk-now' + (t.sentBack ? ' back' : '') + '">' + (t.sentBack ? 'Sent back: ' : 'Now: ') + '<b>' + esc(c.s.name) + '</b>' +
    (c.s.who.length ? '<span class="tk-nf">' + faces(c.s.who, 18, 2) + '</span>' : ' · ' + esc(stepWho(t, c.s))) + '</span></span>' : '';
  return '<li class="row tk-row' + (done ? ' is-done' : '') + (myTurn(t) ? ' my-turn' : '') + '">' + lead +
    '<button type="button" class="tk-body" data-act="taskOpen" data-id="' + esc(t.id) + '"><span class="tk-t">' + esc(t.title) + '</span>' +
    '<span class="tk-m"><span class="tk-kind">' + ic(tpl.icon) + esc(t.template ? tpl.name : t.kind || 'Task') + '</span><span class="tk-due ' + due.cls + '">' + esc(due.txt) + '</span>' + from + '</span>' + now + '</button>' +
    (nx && !opts.noNext ? '<button type="button" class="tk-next t-' + nx.type + '" data-act="taskStep" data-step="done" data-id="' + esc(t.id) + '">' + ic(nx.icon) + '<span>' + esc(nx.label) + '</span></button>' : '') +
    (opts.noFaces || (who.length === 1 && who[0] === S.me.username) ? '' : '<span class="tk-faces" data-tip="' + esc(who.map(userName).join('\n')) + '">' + faces(who, 26) + '</span>') + '</li>';
}

/* ---------- the Tasks page ---------- */
var PIPE = ['In progress', 'Proofreading', 'Ready to post', 'Done this week'];
function pipeOf(t){ if (t.status === 'Done') return 3; var c = taskCur(t); return !c ? 3 : c.s.type === 'proof' ? 1 : c.s.type === 'post' ? 2 : 0; }
function viewTasks(){
  var lead = canLead(), me = S.me.username, scope = S.tkScope || (lead ? 'all' : 'mine'), tab = lead ? (S.tkTab || 'list') : 'list', stg = S.tkStage;
  var all = tasksAll(), open = all.filter(function(t){ return t.status !== 'Done'; }), td = today(), wk = addDays(td, -7);
  var inScope = all.filter(function(t){ return scope === 'mine' ? (t.assignees || []).indexOf(me) >= 0 || myTurn(t) : scope === 'given' ? t.createdBy === me && !taskSelf(t) : true; })
    .filter(function(t){ return t.status !== 'Done' || taskDay(t.doneAt) >= wk; });
  var pipe = inScope.length ? '<div class="tk-pipe" role="group" aria-label="Tasks by step">' + PIPE.map(function(l, i){
      var n = inScope.filter(function(t){ return pipeOf(t) === i; }).length;
      return '<button type="button" class="tk-pipe-s s' + i + '" data-act="tkStage" data-s="' + i + '" aria-pressed="' + (stg === i) + '"><span class="tk-pipe-n">' + n + '</span><span class="tk-pipe-l">' + l + '</span><span class="tk-pipe-bar" aria-hidden="true">' + [0, 1, 2, 3].map(function(k){ return '<i' + (k <= i ? ' class="on"' : '') + '></i>'; }).join('') + '</span></button>'; }).join('') + '</div>' : '';
  var L = stg == null ? inScope : inScope.filter(function(t){ return pipeOf(t) === stg; });
  var turn = L.filter(function(t){ return myTurn(t); }).sort(taskSort), rest = L.filter(function(t){ return !myTurn(t); });
  var late = rest.filter(function(t){ return t.status !== 'Done' && t.due && t.due < td; }).sort(taskSort);
  var soon = rest.filter(function(t){ return t.status !== 'Done' && t.due && t.due >= td && t.due <= addDays(td, 1); }).sort(taskSort);
  var later = rest.filter(function(t){ return t.status !== 'Done' && t.due > addDays(td, 1); }).sort(taskSort);
  var nodue = rest.filter(function(t){ return t.status !== 'Done' && !t.due; }).sort(taskSort);
  var done = rest.filter(function(t){ return t.status === 'Done'; }).sort(function(a, b){ return a.doneAt < b.doneAt ? 1 : -1; });
  var sec = function(name, list, cls){ return list.length ? '<li class="tk-sec ' + (cls || '') + '">' + name + ' · ' + list.length + '</li>' + list.map(function(t){ return taskRow(t); }).join('') : ''; };
  var chips = '<div class="tk-scope" role="group" aria-label="Show">' + (lead ? [['all', 'Everyone'], ['given', 'Given by me'], ['mine', 'Mine']] : [['mine', 'Mine'], ['all', 'Everyone']]).map(function(x){
    return '<button type="button" class="chip" data-act="tkScope" data-s="' + x[0] + '" aria-pressed="' + (scope === x[0]) + '">' + x[1] + '</button>'; }).join('') +
    (stg != null ? '<button type="button" class="chip tk-clear" data-act="tkStage" data-s="">' + ic('x') + PIPE[stg] + '</button>' : '') + '</div>';
  var body = sec('Your turn', turn, 'turn') + sec('Overdue', late, 'late') + sec('Today and tomorrow', soon) + sec('Coming up', later) + sec('No due date', nodue) + sec('Done this week', done, 'done');
  var list = panel(scope === 'mine' ? 'Your tasks' : scope === 'given' ? 'Tasks you gave' : 'Everyone’s tasks', 'tick', '<div class="panel-b" style="padding-bottom:4px">' + pipe + chips + '</div>' +
    (body ? '<ul class="list tk-list">' + body + '</ul>' : empty('tick', stg != null ? 'Nothing at this step' : scope === 'mine' ? 'Nothing on your list' : 'No tasks here yet', lead ? 'Pick the type of output, like a pubmat, and give each step to the right people.' : 'Add a task for yourself to keep track of your work.', '<button class="btn btn-primary" data-act="taskNew">' + ic('plus') + 'New task</button>')), '', 'span-12');
  var tabs = lead ? '<div class="tk-tabs" role="tablist"><button type="button" role="tab" data-act="tkTab" data-t="list" aria-selected="' + (tab === 'list') + '">' + ic('tick') + 'To do</button><button type="button" role="tab" data-act="tkTab" data-t="report" aria-selected="' + (tab === 'report') + '">' + ic('chart') + 'Report</button></div>' : '';
  var lateAll = open.filter(function(t){ return t.due && t.due < td; }).length, turns = all.filter(myTurn).length;
  return { eyebrow: 'Work', title: 'Tasks',
    sub: (lead ? open.length + ' open across the office' + (lateAll ? ' · ' + lateAll + ' overdue' : '') : myOpenTasks().length + ' open for you') + (turns ? ' · ' + turns + ' waiting on you' : '') + '.',
    actions: '<button class="btn btn-sun" data-act="taskNew">' + ic('plus') + 'New task</button>',
    body: '<div class="grid">' + (tabs ? '<div class="span-12">' + tabs + '</div>' : '') + (tab === 'report' ? taskReport() : list) + '</div>' };
}

/* ---------- one task in full: each step, its people, who did it, and what is next ---------- */
function taskView(t){
  var dd = taskDue(t), ev = t.eventId && S.events.filter(function(e){ return e.id === t.eventId; })[0], st = taskStepsOf(t), c = taskCur(t), nx = taskNext(t), tpl = taskTpl(t.template), me = S.me.username;
  var when = function(iso){ return iso ? fDate(taskDay(iso), { month: 'short', day: 'numeric' }) + ' · ' + new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''; };
  var who = function(u){ return '<span class="tk-who">' + avatarHtml(userOf(u) || { username: u, name: u }, 22) + esc(shortName(u) || u) + '</span>'; };
  var lastDone = -1; st.forEach(function(s, i){ if (s.doneAt) lastDone = i; });
  var li = '<li class="tk-step on"><span class="tk-dot" aria-hidden="true">' + ic('tick') + '</span><div><b>Assigned</b><div class="tk-sd">By ' + who(t.createdBy) + ' · ' + esc(when(t.createdAt)) + '</div></div></li>' +
    st.map(function(s, i){
      var cur = c && c.i === i, det = '';
      if (s.doneAt) det = (s.type === 'proof' ? 'Read by ' : s.type === 'post' ? 'Posted by ' : 'Done by ') + who(s.doneBy) + (s.type === 'proof' ? ' · ' + (s.edits ? '<b class="tk-ed">made edits</b>' : 'no changes') : '') + ' · ' + esc(when(s.doneAt)) + (s.note ? '<div class="tk-pnote">“' + esc(s.note) + '”</div>' : '');
      else det = (s.who.length ? s.who.map(who).join(' ') : '<span class="hint">' + esc(stepWho(t, s)) + (s.type === 'proof' && taskWriter(t, i) ? ' (not ' + esc(firstName(taskWriter(t, i))) + ')' : '') + '</span>') +
        (cur && t.sentBack ? '<div class="tk-backnote">' + ic('flag') + 'Sent back by ' + esc(firstName(t.sentBack.by)) + ': “' + esc(t.sentBack.note) + '”</div>' : '');
      return '<li class="tk-step' + (s.doneAt ? ' on' : '') + (cur ? ' cur' : '') + '"><span class="tk-dot" aria-hidden="true">' + (s.doneAt ? ic('tick') : i + 1) + '</span><div><b>' + esc(s.name) + '</b>' + (s.skill ? ' <span class="tk-skill">' + esc(s.skill) + '</span>' : '') + (cur ? ' <span class="tk-nowtag">Now</span>' : '') + '<div class="tk-sd">' + det + '</div></div></li>';
    }).join('');
  var body = '<div class="tk-view"><p class="tk-m"><span class="tk-kind">' + ic(tpl.icon) + esc(t.template ? tpl.name : t.kind || 'Task') + '</span><span class="tk-due ' + dd.cls + '">' + esc(dd.txt) + '</span><span>' + taskDoneN(t) + ' of ' + st.length + ' steps done</span></p>' +
    (t.note ? '<p class="tk-note">' + esc(t.note) + '</p>' : '') + (ev ? '<p class="hint">For: ' + esc(ev.title) + ' · ' + esc(fDate(ev.date)) + '</p>' : '') +
    captionBox(t) + (st.length > 1 ? '<div class="tk-tl-bar">' + taskBar(t, true) + '</div>' : '') + '<ol class="tk-tl">' + li + '</ol></div>';
  var canUndo = lastDone >= 0 && (canLead() || st[lastDone].doneBy === me);
  var foot = (taskCanEdit(t) ? '<button type="button" class="btn btn-ghost" data-act="taskEdit" data-id="' + esc(t.id) + '">' + ic('edit') + 'Edit</button>' : '') +
    (canUndo && st.length > 1 ? '<button type="button" class="btn btn-ghost" data-act="taskStep" data-step="undo" data-id="' + esc(t.id) + '">' + ic('left') + 'Undo “' + esc(st[lastDone].name) + '”</button>' : '');
  if (st.length === 1){ var tickable = canLead() || (st[0].who.length ? st[0].who : t.assignees || []).indexOf(me) >= 0; if (tickable) foot += '<button type="button" class="btn btn-primary" data-act="taskDone" data-id="' + esc(t.id) + '" data-done="' + (t.status === 'Done' ? '0' : '1') + '">' + ic('tick') + (t.status === 'Done' ? 'Mark not done' : 'Mark done') + '</button>'; }
  else if (nx) foot += '<button type="button" class="btn btn-primary" data-act="taskStep" data-step="done" data-id="' + esc(t.id) + '">' + ic(nx.icon) + esc(nx.label) + '</button>';
  if (!foot) foot = '<button type="button" class="btn btn-ghost" data-act="close">Close</button>';
  modal(esc(t.title), body, foot);
}

/* ---------- proofreading: looks good or I made edits, with a note; or send it back ---------- */
function proofModal(t){
  var c = taskCur(t), w = taskWriter(t, c.i);
  // the caption to read; fix it right here (a changed caption counts as edits)
  var cap = t.caption != null && t.caption !== '' ? '<div class="field"><label for="pfC">Caption <span class="hint">(fix it here if needed)</span></label><textarea class="input tk-capin" id="pfC" name="text" rows="7" maxlength="5000" data-orig="' + esc(t.caption) + '">' + esc(t.caption) + '</textarea><p class="hint tk-capchg" id="pfChg"></p></div>' : '';
  modal(esc(c.s.name), '<input type="hidden" name="id" value="' + esc(t.id) + '"><p class="tk-pq"><b>' + esc(t.title) + '</b>' + (w ? '<span class="hint">Written by ' + esc(userName(w)) + '</span>' : '') + '</p>' + cap +
    '<fieldset class="tk-pf"><legend>How was it?</legend>' +
      '<label class="tk-po"><input type="radio" name="edits" value="0" checked><span>' + ic('tick') + '<b>Looks good</b><small>No changes needed</small></span></label>' +
      '<label class="tk-po"><input type="radio" name="edits" value="1"><span>' + ic('edit') + '<b>I made edits</b><small>Fixed wording, spelling or the caption</small></span></label></fieldset>' +
    '<div class="field"><label for="pfN">Note <span class="hint">(optional; needed to send it back)</span></label><textarea class="input" id="pfN" name="note" rows="3" maxlength="400" placeholder="What you changed, or what still needs fixing"></textarea></div>',
    '<button type="button" class="btn btn-danger" data-act="tkBack" data-id="' + esc(t.id) + '">' + ic('left') + 'Send back</button><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + ic('tick') + 'Done</button>', 'taskProof');
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="taskProof"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var d = {}; new FormData(f).forEach(function(v, k){ d[k] = v; }); var t = taskById(d.id), c = t && taskCur(t);
  var p = { id: d.id, step: 'done', edits: d.edits, note: d.note }; if (d.text != null) p.text = d.text;
  var edited = d.edits === '1' || (d.text != null && d.text.trim() !== (t.caption || ''));
  taskGo(f.querySelector('[type=submit]'), d.id, c ? c.i : -1, act('taskStep', p, edited ? 'Proofread, with your edits noted' : 'Proofread. On to the next step.').then(closeModal));
}, true);
/* while proofreading: changing the caption ticks "I made edits" */
document.addEventListener('input', function(ev){
  if (ev.target.id !== 'pfC') return;
  var changed = ev.target.value.trim() !== ev.target.dataset.orig.trim(), r = document.querySelector('#modal input[name="edits"][value="' + (changed ? '1' : '0') + '"]'), h = document.getElementById('pfChg');
  if (r) r.checked = true; if (h) h.textContent = changed ? 'You changed the caption. It will be saved as the proofread version.' : '';
});

/* ---------- the caption step: write or paste the caption ---------- */
function captionModal(t){
  var c = taskCur(t);
  modal(esc(c.s.name), '<input type="hidden" name="id" value="' + esc(t.id) + '"><p class="tk-pq"><b>' + esc(t.title) + '</b><span class="hint">Write or paste the caption. The proofreader reads it next, and whoever posts copies it from here.</span></p>' +
    (t.sentBack ? '<div class="tk-backnote" style="margin-bottom:10px">' + ic('flag') + 'Sent back by ' + esc(firstName(t.sentBack.by)) + ': “' + esc(t.sentBack.note) + '”</div>' : '') +
    '<div class="field"><label for="cpT">Caption</label><textarea class="input tk-capin" id="cpT" name="text" rows="9" maxlength="5000" required placeholder="Congratulations to…">' + esc(t.caption || '') + '</textarea><p class="hint" id="cpN" style="text-align:right;margin:4px 0 0"></p></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + ic('tick') + 'Caption done</button>', 'taskCaption');
  capCount();
}
function capCount(){ var a = document.getElementById('cpT'), n = document.getElementById('cpN'); if (a && n) n.textContent = a.value.length + ' characters'; }
document.addEventListener('input', function(ev){ if (ev.target.id === 'cpT') capCount(); });
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="taskCaption"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var id = f.querySelector('input[name="id"]').value, text = f.querySelector('#cpT').value, t = taskById(id), c = t && taskCur(t);
  if (!text.trim()){ var e = document.getElementById('merr'); if (e) e.textContent = 'Write or paste the caption.'; return; }
  taskGo(f.querySelector('[type=submit]'), id, c ? c.i : -1, act('taskStep', { id: id, step: 'done', text: text }, 'Caption saved. Next: ' + (c && c.steps[c.i + 1] ? c.steps[c.i + 1].name : 'done')).then(closeModal));
}, true);

/* ---------- posting: copy the proofread caption, post it, then mark it posted ---------- */
function postModal(t){
  modal('Post it', '<input type="hidden" name="id" value="' + esc(t.id) + '"><p class="tk-pq"><b>' + esc(t.title) + '</b><span class="hint">Copy the caption, post it with the design on Facebook, then mark it posted.</span></p>' +
    (captionBox(t) || '<p class="hint">There’s no caption on this task.</p>') +
    '<div class="field" style="margin-top:12px"><label for="poN">Link or note <span class="hint">(optional)</span></label><input class="input" id="poN" name="note" maxlength="400" placeholder="Paste the Facebook link"></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + ic('megaphone') + 'Mark posted</button>', 'taskPost');
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="taskPost"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var id = f.querySelector('input[name="id"]').value, t = taskById(id), c = t && taskCur(t);
  taskGo(f.querySelector('[type=submit]'), id, c ? c.i : -1, act('taskStep', { id: id, step: 'done', note: f.querySelector('#poN').value }, 'Posted. Task finished!').then(closeModal));
}, true);
/* Copy: the caption goes to the clipboard, ready to paste on Facebook */
document.addEventListener('click', function(ev){
  var b = ev.target.closest('[data-act="tkCopy"]'); if (!b) return; var t = taskById(b.dataset.id); if (!t || !t.caption) return;
  var done = function(){ b.innerHTML = ic('tick') + 'Copied'; b.classList.add('ok'); setTimeout(function(){ if (document.body.contains(b)){ b.innerHTML = ic('copy') + 'Copy'; b.classList.remove('ok'); } }, 2000); };
  var fallback = function(){ var a = document.createElement('textarea'); a.value = t.caption; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch(e){ toast('Select the caption and copy it.'); } a.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.caption).then(done, fallback); else fallback();
});
/* a step was finished: its part of the bar grows in when the list redraws */
function taskGo(btn, id, i, p){ S.tkJust = { id: id, i: i }; setTimeout(function(){ if (S.tkJust && S.tkJust.id === id) S.tkJust = null; }, 1500); busy(btn, p, 'merr'); }

/* ---------- who is away on a day: on a travel order or dispatch (shown grayed out when picking people) ---------- */
function awayOn(u, d){ var x = tripsFor(u, d, d)[0]; return x ? x.title : ''; }
function taskAway(){
  var box = document.getElementById('modal'); if (!box || !box.querySelector('.tk-steps')) return;
  var inp = document.getElementById('tkD'), d = (inp && inp.value) || today(), lab = d === today() ? 'today' : fDate(d, { month: 'short', day: 'numeric' });
  box.querySelectorAll('.tk-p').forEach(function(el){
    var u = el.querySelector('input').value, away = awayOn(u, d), tag = el.querySelector('.tk-away');
    el.classList.toggle('is-away', !!away); el.title = away ? userName(u) + ' is out ' + lab + ': ' + away : '';
    if (tag) tag.textContent = away ? 'Out ' + lab : '';
  });
  box.querySelectorAll('.tk-pick-l').forEach(function(l){ var n = l.querySelectorAll('.tk-p.is-away').length, note = l.parentNode.querySelector('.tk-awayn'); if (note) note.textContent = n ? n + ' out ' + lab + ' on a travel order or dispatch (grayed out)' : ''; });
}

/* ---------- task form: pick a template, then the people for each step ---------- */
function stepEditor(tplId, whoArr, t){
  var lead = canLead(), me = S.me.username, tpl = taskTpl(tplId), keep = t && t.template === tplId ? taskStepsOf(t) : null;
  var people = S.users.filter(function(u){ return u.active; }).sort(byDiv);
  if (!lead) return '<div class="tk-self">' + avatarHtml(userOf(me) || S.me, 30) + '<span>You do ' + (tpl.steps.length > 1 ? 'the steps' : 'this') + (tpl.steps.some(function(s){ return s[2] === 'proof'; }) ? '; someone else proofreads it' : '') + '. Division leaders and admins can give steps to others.</span></div>' +
    '<ol class="tk-steps ro">' + tpl.steps.map(function(s, i){ return '<li><span class="tk-sn">' + (i + 1) + '</span><b>' + esc(s[0]) + '</b></li>'; }).join('') + '</ol>';
  return '<ol class="tk-steps">' + tpl.steps.map(function(s, i){
    var done = keep && keep[i] && keep[i].doneAt, picked = keep && keep[i] ? keep[i].who : whoArr[i] || [];
    var open = !done && i === (S.tkOpenStep == null ? 0 : S.tkOpenStep);
    var opt = s[2] !== 'work', post = s[2] === 'post', first = (keep && keep[0] ? keep[0].who : whoArr[0]) || [];
    // posting: only Bantayog, Social Media and Special Projects staff, with whoever does the first step (the designer, who has the file) on top
    var list = post ? postersOk().sort(function(a, b){ return (first.indexOf(b.username) >= 0) - (first.indexOf(a.username) >= 0) || byDiv(a, b); }) : people;
    var chosen = '<span class="tk-chosen">' + (picked.length ? faces(picked, 24, 4) + '<span>' + esc(picked.map(function(u){ return shortName(u) || u; }).join(', ')) + '</span>' : '<span class="hint">' + (opt ? (s[2] === 'proof' ? 'Anyone but the writer' : 'Whoever does the first step') : 'Pick someone') + '</span>') + '</span>';
    return '<li class="tk-st' + (open ? ' open' : '') + (done ? ' done' : '') + '" data-i="' + i + '"' + (post ? ' data-post="1"' : '') + '><div class="tk-st-h"><span class="tk-sn">' + (done ? ic('tick') : i + 1) + '</span><div class="tk-st-t"><b>' + esc(s[0]) + '</b>' + (s[1] ? '<span class="tk-skill">' + esc(s[1]) + '</span>' : '') + chosen + '</div>' +
      (done ? '<span class="hint">Done by ' + esc(firstName(keep[i].doneBy)) + '</span>' : '<button type="button" class="btn btn-sm btn-ghost" data-act="tkStepOpen" data-i="' + i + '" aria-expanded="' + open + '">' + (open ? 'Close' : 'Choose') + '</button>') + '</div>' +
      (done ? picked.map(function(u){ return '<input type="hidden" name="who_' + i + '" value="' + esc(u) + '">'; }).join('') :
      '<div class="tk-st-b"' + (open ? '' : ' hidden') + '><p class="tk-fit" aria-live="polite"></p><p class="tk-awayn hint"></p>' + (opt ? '<p class="hint" style="margin:0 0 6px">' + (s[2] === 'proof' ? 'Leave empty so any writer except the one who wrote it can proofread.' : 'Only Bantayog, Social Media and Special Projects staff can post. Whoever does the first step is put first, since they have the file.') + '</p>' : '') +
        '<div class="tk-pick-l" data-need="' + esc(s[1] === 'Writer' && s[2] === 'proof' ? 'Writer' : s[1]) + '">' + list.map(function(u){
          return '<label class="tk-p' + (post && first.indexOf(u.username) >= 0 ? ' is-first' : '') + '" data-sk="' + esc(skillsOf(u).join('|')) + '"><input type="checkbox" name="who_' + i + '" value="' + esc(u.username) + '"' + (picked.indexOf(u.username) >= 0 ? ' checked' : '') + '>' + avatarHtml(u, 30) + '<span class="tk-pn">' + esc(shortName(u)) + (u.username === me ? ' (you)' : '') + '<small class="tk-away"></small></span></label>'; }).join('') + '</div></div>') + '</li>';
  }).join('') + '</ol>';
}
function taskModal(t, preset){
  t = t || null; preset = preset || {};
  var lead = canLead(), started = t && taskDoneN(t) > 0;
  var tplId = (t && t.template) || preset.template || lGet('pio_tk_tpl') || 'pubmat'; if (!TASK_TPL.some(function(x){ return x.id === tplId; })) tplId = 'pubmat'; if (t && !t.template) tplId = 'other';
  // events to link: ongoing today and the next two weeks (or up to the due date), plus the one already linked
  var evLinked = t && t.eventId, evDue = t ? t.due : preset.due || '', evTo = evDue > addDays(today(), 14) ? evDue : addDays(today(), 14);
  var evs = S.events.filter(function(e){ return e.id === evLinked || (e.status !== 'Cancelled' && (e.dateTo || e.date) >= today() && e.date <= evTo); }).sort(function(a, b){ return a.date < b.date ? -1 : 1; });
  var evId = (t && t.eventId) || preset.eventId || '', due = t ? t.due : preset.due || '';
  var whoArr = t ? taskStepsOf(t).map(function(s){ return s.who; }) : taskTpl(tplId).steps.map(function(s){ return s[2] === 'work' && preset.assignees ? preset.assignees : []; });
  var tpls = '<fieldset class="tk-tpls"' + (started ? ' disabled' : '') + '><legend>Type of output</legend>' + TASK_TPL.map(function(x){
    return '<label class="tk-tpl"><input type="radio" name="template" value="' + x.id + '"' + (x.id === tplId ? ' checked' : '') + '><span>' + ic(x.icon) + '<b>' + esc(x.name) + '</b><small class="tk-chain">' + (x.steps.length === 1 ? 'One step, just mark it done' : x.steps.map(function(s){ return esc(s[0].split(' ')[0]); }).join(' <i>›</i> ')) + '</small></span></label>'; }).join('') +
    (started ? '<p class="hint" style="grid-column:1/-1;margin:4px 0 0">The type of output can’t change once a step is done.</p>' : '') + '</fieldset>';
  var body = '<input type="hidden" name="id" value="' + esc(t ? t.id : '') + '">' +
    '<div class="field"><label for="tkT">What needs to be done</label><input class="input" id="tkT" name="title" maxlength="140" required placeholder="e.g. Congratulatory post for the board passers" value="' + esc(t ? t.title : preset.title || '') + '"></div>' +
    tpls + '<div class="label" style="margin-bottom:6px">Steps and people</div><div id="tkSteps">' + stepEditor(tplId, whoArr, t) + '</div>' +
    '<div class="two" style="margin-top:14px"><div class="field"><label for="tkD">Due date <span class="hint">(optional)</span></label><input class="input" type="date" id="tkD" name="due" value="' + esc(due) + '">' +
      '<div class="tk-quick"><button type="button" class="chip" data-act="tkDue" data-n="0">Today</button><button type="button" class="chip" data-act="tkDue" data-n="1">Tomorrow</button><button type="button" class="chip" data-act="tkDue" data-n="">No date</button></div></div>' +
    '<div class="field"><label for="tkE">For an event <span class="hint">(optional)</span></label><select class="input" id="tkE" name="eventId"><option value="">None</option>' + evs.map(function(e){ return '<option value="' + esc(e.id) + '"' + (e.id === evId ? ' selected' : '') + '>' + esc((e.date < today() && (e.dateTo || e.date) >= today() ? 'Today (ongoing)' : e.date === today() ? 'Today' : fDate(e.date, { weekday: 'short', month: 'short', day: 'numeric' })) + ' · ' + e.title) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="tkN">Notes <span class="hint">(optional)</span></label><textarea class="input" id="tkN" name="note" rows="3" maxlength="600" placeholder="Sizes, wording, links to photos…">' + esc(t ? t.note : '') + '</textarea></div>';
  var foot = (t ? '<button type="button" class="btn btn-danger" data-act="taskDel" data-id="' + esc(t.id) + '">' + ic('trash') + 'Remove</button>' : '') +
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (t ? 'Save' : ic('plus') + 'Add task') + '</button>';
  S.tkOpenStep = null; S.tkEditing = t ? t.id : null; S.tkPostTouched = !!t;
  modal(t ? 'Edit task' : 'New task', body, foot, 'saveTask');
  taskFitAll(false); taskAway();
}
/* the people chosen so far, per step (kept when the template changes, by step position) */
function stepPicks(){ var out = []; document.querySelectorAll('#tkSteps .tk-st').forEach(function(li){ var i = +li.dataset.i; out[i] = [].slice.call(li.querySelectorAll('input[name="who_' + i + '"]:checked, input[type=hidden][name="who_' + i + '"]')).map(function(x){ return x.value; }); }); return out; }
function stepChosen(li){
  var i = +li.dataset.i, picked = [].slice.call(li.querySelectorAll('input[name="who_' + i + '"]:checked')).map(function(x){ return x.value; }), c = li.querySelector('.tk-chosen'), tpl = document.querySelector('#modal input[name="template"]:checked');
  var s = taskTpl(tpl ? tpl.value : 'other').steps[i] || ['', '', 'work'];
  if (c) c.innerHTML = picked.length ? faces(picked, 24, 4) + '<span>' + esc(picked.map(function(u){ return shortName(u) || u; }).join(', ')) + '</span>' : '<span class="hint">' + (s[2] === 'work' ? 'Pick someone' : s[2] === 'proof' ? 'Anyone but the writer' : 'Whoever does the first step') + '</span>';
}

/* posting: the people on the first step go on top (and are ticked, unless posting was changed by hand) */
function syncPoster(tick){
  var pl = document.querySelector('#tkSteps .tk-st[data-post]'); if (!pl || pl.classList.contains('done')) return;
  var first = (stepPicks()[0] || []), list = pl.querySelector('.tk-pick-l'), i = pl.dataset.i; if (!list) return;
  [].slice.call(list.querySelectorAll('.tk-p')).forEach(function(el){ var u = el.querySelector('input').value, on = first.indexOf(u) >= 0; el.classList.toggle('is-first', on); if (tick) el.querySelector('input').checked = on; });
  // designer first in the list
  [].slice.call(list.querySelectorAll('.tk-p.is-first')).reverse().forEach(function(el){ list.insertBefore(el, list.firstChild); });
  stepChosen(pl);
  var c = pl.querySelector('.tk-chosen'); if (tick && c && !lessMotion()) c.animate([{ backgroundColor: 'var(--brand-soft)' }, { backgroundColor: 'transparent' }], { duration: 900, easing: 'ease-out' });
}

/* ---------- people who fit a step's skill: the others slide away ---------- */
function taskFitAll(animate){ document.querySelectorAll('#modal .tk-pick-l').forEach(function(l){ taskFit(l, animate); }); }
function taskFit(box, animate){
  if (!box) return;
  var need = box.dataset.need ? [box.dataset.need] : [], items = [].slice.call(box.querySelectorAll('.tk-p'));
  var fits = function(el){ var sk = (el.dataset.sk || '').split('|'); return need.some(function(s){ return sk.indexOf(s) >= 0; }); };
  var nFit = items.filter(fits).length, filter = need.length && nFit && box.dataset.all !== '1';
  var show = function(el){ return !filter || fits(el) || el.querySelector('input').checked; };
  var fit = box.parentNode.querySelector('.tk-fit');
  if (fit) fit.innerHTML = !need.length ? '' : !nFit ? ic('users') + 'No one has the ' + esc(need[0]) + ' skill yet, so everyone is shown. Add skills in Staff.'
    : filter ? ic('star') + '<span><b>' + nFit + '</b> with the ' + esc(need[0]) + ' skill</span><button type="button" class="lnk" data-act="tkAll">Show everyone (' + items.length + ')</button>'
    : ic('users') + '<span>Everyone is shown</span><button type="button" class="lnk" data-act="tkFitOnly">Only ' + esc(need[0]) + ' (' + nFit + ')</button>';
  var go = items.filter(function(el){ return !el.hidden && !show(el); }), come = items.filter(function(el){ return el.hidden && show(el); });
  if (!animate || lessMotion() || !box.animate || box.closest('[hidden]')){ items.forEach(function(el){ el.hidden = !show(el); }); return; }
  var token = (box._n = (box._n || 0) + 1);
  items.forEach(function(el){ el.getAnimations().forEach(function(a){ a.cancel(); }); });
  // 1. the ones who do not fit shrink and fade
  var out = go.map(function(el){ return el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.82)' }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished; });
  Promise.all(out).catch(function(){}).then(function(){
    if (token !== box._n) return;
    // 2. the rest glide to their new places (first, last, invert, play), newcomers pop in
    var stay = items.filter(function(el){ return !el.hidden && go.indexOf(el) < 0; }), first = stay.map(function(el){ return el.getBoundingClientRect(); });
    go.forEach(function(el){ el.hidden = true; el.getAnimations().forEach(function(a){ a.cancel(); }); });
    come.forEach(function(el){ el.hidden = false; });
    stay.forEach(function(el, i){ var b = el.getBoundingClientRect(), dx = first[i].left - b.left, dy = first[i].top - b.top;
      if (dx || dy) el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }); });
    come.forEach(function(el, i){ el.animate([{ opacity: 0, transform: 'scale(.85) translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: Math.min(i, 10) * 22, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' }); });
  });
}
document.addEventListener('change', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveTask"]'); if (!f) return;
  if (ev.target.name === 'template'){
    // a new chain of steps: rebuild the step list (people kept by position), then let it fade in
    lSet('pio_tk_tpl', ev.target.value);
    var t = S.tkEditing ? taskById(S.tkEditing) : null, box = document.getElementById('tkSteps'); S.tkOpenStep = 0;
    box.innerHTML = stepEditor(ev.target.value, stepPicks(), t); taskFitAll(false); taskAway();
    if (!lessMotion()) box.querySelectorAll('.tk-st, .tk-steps.ro li').forEach(function(li, i){ li.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 45, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); });
  }
  if (/^who_\d+$/.test(ev.target.name)){
    var li = ev.target.closest('.tk-st'); stepChosen(li);
    if (li.dataset.post) S.tkPostTouched = true;
    // picking the designer fills in posting with them (they have the file), until posting is changed by hand
    if (li.dataset.i === '0') syncPoster(!S.tkPostTouched);
  }
  if (ev.target.id === 'tkD') taskAway();
});
document.addEventListener('input', function(ev){ if (ev.target.id === 'tkD') taskAway(); });
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act="tkAll"],[data-act="tkFitOnly"],[data-act="tkStepOpen"]'); if (!t) return;
  if (t.dataset.act === 'tkStepOpen'){
    var li = t.closest('.tk-st'), b = li.querySelector('.tk-st-b'), open = b.hidden;
    document.querySelectorAll('#tkSteps .tk-st').forEach(function(o){ var ob = o.querySelector('.tk-st-b'); if (ob && o !== li){ ob.hidden = true; o.classList.remove('open'); var bt = o.querySelector('[data-act="tkStepOpen"]'); if (bt){ bt.textContent = 'Choose'; bt.setAttribute('aria-expanded', 'false'); } } });
    b.hidden = !open; li.classList.toggle('open', open); t.textContent = open ? 'Close' : 'Choose'; t.setAttribute('aria-expanded', open);
    if (open){ taskFit(b.querySelector('.tk-pick-l'), false); if (!lessMotion()) b.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }); }
    return;
  }
  var box = t.closest('.tk-st-b').querySelector('.tk-pick-l'); box.dataset.all = t.dataset.act === 'tkAll' ? '1' : ''; taskFit(box, true);
});
/* saving the form */
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="saveTask"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var d = {}; new FormData(f).forEach(function(v, k){ if (typeof v === 'string' && !/^who_/.test(k)) d[k] = v; });
  var tplIn = f.querySelector('input[name="template"]:checked'); d.template = tplIn ? tplIn.value : 'other';
  d.who = stepPicks();
  var err = document.getElementById('merr'), tpl = taskTpl(d.template);
  if (canLead()){ var miss = tpl.steps.filter(function(s, i){ return s[2] === 'work' && !(d.who[i] || []).length; })[0];
    if (miss){ if (err) err.textContent = 'Pick who does “' + miss[0] + '”.'; var i = tpl.steps.indexOf(miss), bt = f.querySelector('.tk-st[data-i="' + i + '"] [data-act="tkStepOpen"]'); if (bt && bt.getAttribute('aria-expanded') !== 'true') bt.click(); return; } }
  var all = []; d.who.forEach(function(l){ (l || []).forEach(function(u){ if (all.indexOf(u) < 0) all.push(u); }); });
  var who = !canLead() || (all.length === 1 && all[0] === S.me.username) ? 'you' : all.length === 1 ? firstName(all[0]) : all.length + ' people';
  busy(f.querySelector('[type=submit]'), act('saveTask', d, d.id ? 'Task saved' : 'Task added for ' + who).then(closeModal), 'merr');
}, true);

/* ---------- clicks ---------- */
function taskById(id){ return tasksAll().filter(function(x){ return x.id === id; })[0]; }
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act;
  if (a === 'taskNew'){ taskModal(null, t.dataset.u ? { assignees: [t.dataset.u] } : {}); return; }
  if (a === 'taskOpen'){ var tk = taskById(t.dataset.id); if (tk) taskView(tk); return; }
  if (a === 'taskEdit'){ var te = taskById(t.dataset.id); if (te) taskModal(te); return; }
  if (a === 'tkScope'){ S.tkScope = t.dataset.s; render(); return; }
  if (a === 'tkStage'){ var s = t.dataset.s === '' ? null : +t.dataset.s; S.tkStage = S.tkStage === s ? null : s; render(); return; }
  if (a === 'tkTab'){ S.tkTab = t.dataset.t; render(); return; }
  if (a === 'tkDue'){ var inp = document.getElementById('tkD'); if (inp){ inp.value = t.dataset.n === '' ? '' : addDays(today(), +t.dataset.n); taskAway(); } return; }
  if (a === 'taskDel'){
    if (!t.dataset.sure){ t.dataset.sure = '1'; t.innerHTML = ic('trash') + 'Tap again to remove'; setTimeout(function(){ if (document.body.contains(t)){ delete t.dataset.sure; t.innerHTML = ic('trash') + 'Remove'; } }, 4000); return; }
    busy(t, act('deleteTask', { id: t.dataset.id }, 'Task removed').then(closeModal), 'merr'); return;
  }
  if (a === 'taskStep'){
    var ts = taskById(t.dataset.id), step = t.dataset.step, c = ts && taskCur(ts); if (!ts) return;
    if (step === 'done' && c && c.s.type === 'proof') return proofModal(ts);
    if (step === 'done' && c && isCaptionStep(c.s)) return captionModal(ts);
    if (step === 'done' && c && c.s.type === 'post') return postModal(ts);
    var msg = step === 'undo' ? 'Step undone' : !c ? '' : c.i === c.steps.length - 1 ? (c.s.type === 'post' ? 'Posted. Task finished!' : 'Task finished!') : c.s.name + ' done. Next: ' + c.steps[c.i + 1].name;
    taskGo(t, ts.id, step === 'done' && c ? c.i : -9, act('taskStep', { id: ts.id, step: step }, msg).then(function(){ if (document.querySelector('#modal .tk-view')) closeModal(); }));
    return;
  }
  if (a === 'tkBack'){
    var note = document.getElementById('pfN'), err = document.getElementById('merr');
    if (!note || !note.value.trim()){ if (err) err.textContent = 'Write what needs to change, then send it back.'; if (note) note.focus(); return; }
    busy(t, act('taskStep', { id: t.dataset.id, step: 'back', note: note.value }, 'Sent back for changes').then(closeModal), 'merr'); return;
  }
  if (a === 'taskDone'){
    var on = t.dataset.done === '1', row = t.closest('.tk-row');
    if (row){ row.classList.toggle('is-done', on); t.setAttribute('aria-pressed', on); if (on && !lessMotion()) t.animate([{ transform: 'scale(.8)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
    var go = function(){ return act('setTaskDone', { id: t.dataset.id, done: on ? '1' : '0' }, on ? 'Nice work. Task done.' : 'Task reopened').then(function(){ if (document.querySelector('#modal .tk-view')) closeModal(); }); };
    // a short pause so the tick is seen before the list re-sorts
    if (row && on && !lessMotion()) busy(t, new Promise(function(res){ setTimeout(res, 420); }).then(go)); else busy(t, go());
  }
});

/* ---------- Home: "Your tasks" (your turn first) ---------- */
function myTasksWidget(n){
  var L = myOpenTasks(), lead = canLead(), td = today(), me = S.me.username;
  var turn = L.filter(myTurn), waiting = L.filter(function(t){ return !myTurn(t); });
  var open = tasksAll().filter(function(t){ return t.status !== 'Done'; }), late = open.filter(function(t){ return t.due && t.due < td; }).length;
  var doneToday = 0; tasksAll().forEach(function(t){ taskStepsOf(t).forEach(function(s){ if (s.doneBy === me && taskDay(s.doneAt) === td) doneToday++; }); });
  var head = '<div class="tk-sum">' + (turn.length ? '<b>' + turn.length + '</b> waiting on you' : 'Nothing waiting on you') + (waiting.length ? ' · <b>' + waiting.length + '</b> with others' : '') + (doneToday ? ' · <b>' + doneToday + '</b> ' + (doneToday === 1 ? 'step' : 'steps') + ' done today' : '') +
    (lead ? ' <span class="hint">· ' + open.length + ' open across the office' + (late ? ', <span class="tk-due late">' + late + ' overdue</span>' : '') + '</span>' : '') + '</div>';
  var body = L.length ? '<ul class="list tk-list">' + (turn.length ? '<li class="tk-sec turn">Your turn · ' + turn.length + '</li>' + turn.slice(0, 4).map(function(t){ return taskRow(t, { noFaces: true }); }).join('') : '') +
      (waiting.length ? '<li class="tk-sec">With others · ' + waiting.length + '</li>' + waiting.slice(0, 3).map(function(t){ return taskRow(t, { noFaces: true }); }).join('') : '') + '</ul>' +
      (L.length > 7 ? '<div class="panel-b"><button class="btn btn-sm btn-ghost" data-go="tasks">See all ' + L.length + '</button></div>' : '')
    : '<div class="tk-empty"><span class="mt-ic">' + ic('tick') + '</span><div><b>All clear</b><span>' + (lead ? 'Pick the type of output and give each step to the right people.' : 'Add a task for yourself, like a caption or a layout.') + '</span></div></div>';
  return panel('Your tasks', 'tick', head + body, '<div class="row-btns"><button class="btn btn-sm btn-ghost" data-go="tasks">All tasks</button><button class="btn btn-sm btn-primary" data-act="taskNew">' + ic('plus') + 'New</button></div>', span(n) + ' tk-panel');
}

/* ---------- report for Ma'am Sarah: the steps each person did, proofreading and dispatches, by day or month ---------- */
function taskReport(){
  var mode = S.rpMode || 'day', td = today(), at = S.rpAt || td;
  var from = mode === 'day' ? at : at.slice(0, 7) + '-01', to = mode === 'day' ? at : ymd(new Date(+at.slice(0, 4), +at.slice(5, 7), 0));
  var label = mode === 'day' ? fDate(at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : fMonth(at.slice(0, 7));
  var inRange = function(iso){ var d = taskDay(iso); return d >= from && d <= to; };
  var finished = tasksAll().filter(function(t){ return t.status === 'Done' && inRange(t.doneAt); });
  var work = []; tasksAll().forEach(function(t){ taskStepsOf(t).forEach(function(s){ if (s.doneAt && inRange(s.doneAt)) work.push({ t: t, s: s }); }); });
  var people = S.users.filter(function(u){ return u.active; }).sort(byDiv).map(function(u){
    return { u: u, steps: work.filter(function(x){ return x.s.doneBy === u.username; }).sort(function(a, b){ return a.s.doneAt < b.s.doneAt ? -1 : 1; }), trips: tripsFor(u.username, from, to) };
  });
  var active = people.filter(function(p){ return p.steps.length || p.trips.length; }), quiet = people.length - active.length;
  var open = tasksAll().filter(function(t){ return t.status !== 'Done'; }), late = open.filter(function(t){ return t.due && t.due < td; }).length;
  var nProof = work.filter(function(x){ return x.s.type === 'proof'; }).length;
  var kinds = {}; finished.forEach(function(t){ var k = t.template ? taskTpl(t.template).name : t.kind || 'Task'; kinds[k] = (kinds[k] || 0) + 1; });
  var tile = function(n, l){ return '<div class="mm-t"><b>' + n + '</b><span>' + l + '</span></div>'; };
  var nTrips = active.reduce(function(s, p){ return s + p.trips.length; }, 0);
  var nav = '<div class="row-btns wk-nav no-print"><button type="button" class="icon-btn" data-act="rpNav" data-d="-1" aria-label="Earlier">' + ic('left') + '</button><span class="wk-lab">' + esc(label) + '</span><button type="button" class="icon-btn" data-act="rpNav" data-d="1" aria-label="Later">' + ic('right') + '</button></div>';
  var modes = '<div class="tk-scope no-print" role="group" aria-label="Report period"><button type="button" class="chip" data-act="rpMode" data-m="day" aria-pressed="' + (mode === 'day') + '">Daily</button><button type="button" class="chip" data-act="rpMode" data-m="month" aria-pressed="' + (mode === 'month') + '">Monthly</button>' +
    (at !== td ? '<button type="button" class="chip" data-act="rpToday">Back to today</button>' : '') + '</div>';
  var plural = function(n, one, many){ return n + ' ' + (n === 1 ? one : many); };
  var rows = active.map(function(p){
    var dv = divOf(p.u.division), pr = p.steps.filter(function(x){ return x.s.type === 'proof'; }).length;
    return '<div class="rp-p"><div class="rp-who">' + avatarHtml(p.u, 40) + '<div><b>' + esc(p.u.name) + '</b><div class="hint">' + esc((dv ? dv.short + ' · ' : '') + [plural(p.steps.length - pr, 'step', 'steps'), pr ? plural(pr, 'proofread', 'proofreads') : '', plural(p.trips.length, 'dispatch', 'dispatches')].filter(Boolean).join(' · ')) + '</div></div></div>' +
      '<ul class="rp-l">' + p.steps.map(function(x){ var s = x.s; return '<li class="' + (s.type === 'proof' ? 'proof' : '') + '">' + ic(STEP_IC[s.type] || 'tick') + '<span><b>' + esc((taskStepsOf(x.t).length > 1 ? s.name + ': ' : '') + x.t.title) + '</b><small>' + esc([s.type === 'proof' ? (s.edits ? 'made edits' : 'no changes') : '', x.t.status === 'Done' ? 'task finished' : '', mode === 'month' ? fDate(taskDay(s.doneAt), { month: 'short', day: 'numeric' }) : ''].filter(Boolean).join(' · ')) + '</small></span></li>'; }).join('') +
      p.trips.map(function(x){ return '<li class="trip">' + ic('route') + '<span><b>' + esc(x.title) + '</b><small>' + esc([mode === 'month' ? fRange(x.d1, x.d2, { month: 'short', day: 'numeric' }) : '', x.place, x.st].filter(Boolean).join(' · ')) + '</small></span></li>'; }).join('') + '</ul></div>';
  }).join('');
  var head = '<div class="print-head"><img src="' + LOGO + '" alt=""><div><b>Provincial Information Office · Camarines Norte</b><div>' + (mode === 'day' ? 'Daily accomplishment summary · ' : 'Monthly accomplishment report · ') + esc(label) + '</div></div></div>';
  return panel((mode === 'day' ? 'Daily summary' : 'Monthly report') + ' · ' + esc(label), 'chart',
    '<div class="panel-b">' + head + modes +
      '<div class="mm-tiles rp-tiles">' + tile(finished.length, 'Tasks finished') + tile(work.length - nProof, 'Steps done') + tile(nProof, 'Proofreads') + tile(nTrips, 'Dispatches') + '</div>' +
      '<p class="hint rp-kinds">' + (Object.keys(kinds).length ? Object.keys(kinds).sort(function(a, b){ return kinds[b] - kinds[a]; }).map(function(k){ return kinds[k] + ' ' + k.toLowerCase(); }).join(' · ') + ' · ' : '') + open.length + ' still open' + (late ? ', ' + late + ' late' : '') + '</p>' +
      (rows ? '<div class="rp-list">' + rows + '</div>' : empty('chart', 'Nothing recorded yet', mode === 'day' ? 'Finished steps, proofreading and dispatches for this day show here.' : 'Finished steps, proofreading and dispatches for this month show here.')) +
      (quiet && rows ? '<p class="hint" style="margin-top:12px">' + quiet + ' other ' + (quiet === 1 ? 'person has' : 'people have') + ' no finished steps or dispatches ' + (mode === 'day' ? 'on this day' : 'this month') + ' (they may be doing office work not logged as tasks).</p>' : '') +
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
