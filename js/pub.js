/* =====================================================================
   Bantayog Publication: pick the news for each issue.
   An issue covers a date range and moves Collecting → Voting → Final.
   Editorial board members (chosen by an admin) add articles (Facebook post links for now) and score
   each one from 1 to 5; the app averages the scores. The Bantayog division leader or an admin picks what
   goes in and locks the final lineup, which prints for layout.
   ===================================================================== */
var PUB_STAGES = [['collect', 'Collecting'], ['vote', 'Voting'], ['final', 'Final lineup']];
function isBantayog(div){ var d = divOf(div); return !!(d && /bantayog/i.test(d.name + ' ' + (d.short || ''))); }
function pubMgr(){ return isAdmin() || (S.me && S.me.role === 'scheduler' && isBantayog(S.me.division)); }
function onBoard(u){ var x = userOf(u || S.me.username) || (u ? null : S.me); return !!(x && x.board === true); }
function pubCanSee(){ return !!S.me && (pubMgr() || onBoard()); }
function pubAvg(votes){ if (!votes || !votes.length) return null; return Math.round(votes.reduce(function(s, v){ return s + v.score; }, 0) / votes.length * 100) / 100; }
function pubIssues(){ return (S.pubs || []).filter(function(x){ return !x._del; }).sort(function(a, b){ return a.from < b.from ? 1 : -1; }); }
function pubItemsOf(id){ return (S.pubItems || []).filter(function(x){ return !x._del && x.issueId === id; }); }
function pubVotesOf(itemId){ return (S.pubVotes || []).filter(function(v){ return !v._del && v.itemId === itemId; }); }
function pubBoard(){ return S.users.filter(function(u){ return u.active && u.board === true; }).sort(byDiv); }
function pubCur(){ var L = pubIssues(); return L.filter(function(x){ return x.id === S.pubSel; })[0] || L[0] || null; }
function starRow(itemId, mine, can){
  return '<span class="pb-stars" role="group" aria-label="Your score">' + [1, 2, 3, 4, 5].map(function(n){
    return '<button type="button" class="pb-star' + (mine >= n ? ' on' : '') + '" ' + (can ? 'data-act="pubScore" data-id="' + esc(itemId) + '" data-s="' + n + '"' : 'disabled') + ' aria-pressed="' + (mine === n) + '" aria-label="' + n + ' of 5' + (mine === n ? ' (tap again to clear)' : '') + '">' + ic('star') + '</button>'; }).join('') + '</span>';
}

/* ---------- the page ---------- */
function viewPub(){
  var mgr = pubMgr(), board = onBoard(), me = S.me.username, iss = pubCur(), all = pubIssues();
  var actions = (mgr ? '<button class="btn btn-sun" data-act="pubNew">' + ic('plus') + 'New issue</button>' : '') + (isAdmin() ? '<button class="btn btn-glass" data-act="pubBoardEdit">' + ic('users') + 'Editorial board</button>' : '');
  if (!iss) return { eyebrow: 'Bantayog Publication', title: 'Publication', sub: 'Pick the news for each issue of the Bantayog Publication.', actions: actions,
    body: '<div class="grid"><section class="panel span-12">' + empty('edit', 'No issues yet', mgr ? 'Start an issue for the dates it covers. Board members then add articles and score them.' : 'When the Bantayog leader starts an issue, its articles show up here for scoring.', mgr ? '<button class="btn btn-primary" data-act="pubNew">' + ic('plus') + 'New issue</button>' : '') + '</section></div>' };
  var items = pubItemsOf(iss.id), stage = iss.stage, si = PUB_STAGES.map(function(x){ return x[0]; }).indexOf(stage);
  var rows = items.map(function(it){ var v = pubVotesOf(it.id), mine = v.filter(function(x){ return x.username === me; })[0]; return { it: it, v: v, avg: pubAvg(v), mine: mine ? mine.score : 0 }; });
  // order: while voting, your unscored ones first; the leader and the final list go by average
  if (stage === 'vote' && !mgr) rows.sort(function(a, b){ return (!!a.mine - !!b.mine) || (a.it.postedOn < b.it.postedOn ? -1 : 1); });
  else if (stage !== 'collect') rows.sort(function(a, b){ return ((b.avg || 0) - (a.avg || 0)) || (b.v.length - a.v.length); });
  else rows.sort(function(a, b){ return (a.it.postedOn || '9') < (b.it.postedOn || '9') ? -1 : 1; });
  var brd = pubBoard(), scoredAll = brd.filter(function(u){ return items.length && items.every(function(it){ return pubVotesOf(it.id).some(function(v){ return v.username === u.username; }); }); }).length;
  var myCount = rows.filter(function(r){ return r.mine; }).length;
  // issue switcher
  var chips = all.length > 1 ? '<div class="tk-scope pb-issues" role="group" aria-label="Issues">' + all.map(function(x){ return '<button type="button" class="chip" data-act="pubSel" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === iss.id) + '">' + esc(x.title) + '</button>'; }).join('') + '</div>' : '';
  // where the issue is
  var stepper = '<ol class="pb-steps">' + PUB_STAGES.map(function(x, i){ return '<li class="' + (i < si ? 'done' : i === si ? 'cur' : '') + '"><span class="pb-dot">' + (i < si ? ic('tick') : i + 1) + '</span>' + x[1] + '</li>'; }).join('') + '</ol>';
  var ctrl = !mgr ? '' : stage === 'collect' ? '<button class="btn btn-primary" data-act="pubStage" data-s="vote"' + (items.length ? '' : ' disabled') + '>' + ic('star') + 'Open voting</button>'
    : stage === 'vote' ? '<button class="btn btn-ghost" data-act="pubStage" data-s="collect">' + ic('left') + 'Back to collecting</button><button class="btn btn-primary" data-act="pubStage" data-s="final">' + ic('tick') + 'Lock final lineup</button>'
    : '<button class="btn btn-ghost" data-act="pubStage" data-s="vote">' + ic('edit') + 'Reopen</button><button class="btn btn-primary" data-act="print">' + ic('print') + 'Print lineup</button>';
  var addBtn = (mgr || board) && stage !== 'final' ? '<button class="btn btn-sm btn-primary" data-act="pubAdd">' + ic('plus') + 'Add article</button>' : '';
  var info = '<div class="pb-head">' + stepper + '<div class="row-btns">' + ctrl + (mgr || isAdmin() ? '<button class="btn btn-ghost" data-act="pubEdit" data-id="' + esc(iss.id) + '">' + ic('edit') + 'Issue details</button>' : '') + '</div></div>' +
    '<div class="pb-meta"><span>' + ic('cal') + esc(fRange(iss.from, iss.to, { month: 'short', day: 'numeric', year: 'numeric' })) + '</span>' + (iss.due && stage === 'vote' ? '<span>' + ic('clock') + 'Scoring closes ' + esc(fDate(iss.due, { weekday: 'short', month: 'short', day: 'numeric' })) + '</span>' : '') +
      '<span>' + ic('list') + items.length + (items.length === 1 ? ' article' : ' articles') + '</span>' +
      '<span class="pb-board" data-tip="' + esc(brd.length ? 'Editorial board\n' + brd.map(function(u){ return u.name; }).join('\n') : 'No editorial board yet') + '">' + ic('users') + '<span class="tk-faces">' + faces(brd.map(function(u){ return u.username; }), 22, 6) + '</span>' + (stage === 'vote' && brd.length ? scoredAll + ' of ' + brd.length + ' done scoring' : brd.length + ' on the board') + '</span></div>' +
    (iss.note ? '<p class="hint" style="margin:8px 0 0">' + esc(iss.note) + '</p>' : '') +
    (stage === 'vote' && board ? '<div class="pb-mine"><b>' + myCount + ' of ' + items.length + '</b> scored by you' + (myCount < items.length ? '. Tap the stars, 1 (leave out) to 5 (must include).' : '. Thank you!') + '<span class="pb-bar"><i style="width:' + (items.length ? Math.round(myCount / items.length * 100) : 0) + '%"></i></span></div>' : '') +
    (!board && !mgr ? '<p class="hint">Only editorial board members score articles.</p>' : '');
  var card = function(r, n){
    var it = r.it, showAvg = mgr || r.mine || stage === 'final', who = userOf(it.addedBy);
    var mayEdit = stage !== 'final' && (mgr || it.addedBy === me), mayDel = stage !== 'final' && (mgr || (it.addedBy === me && stage === 'collect'));
    return '<li class="pb-item' + (it.pick === 'in' ? ' is-in' : it.pick === 'out' ? ' is-out' : '') + '">' + (n ? '<span class="pb-n">' + n + '</span>' : '') +
      '<div class="pb-body"><div class="pb-t">' + esc(it.title) + (it.link ? ' <a class="pb-link no-print" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer" aria-label="Open the Facebook post">' + ic('right') + '</a>' : '') + '</div>' +
        '<div class="pb-m">' + (it.postedOn ? esc(fDate(it.postedOn, { month: 'short', day: 'numeric' })) + ' · ' : '') + 'added by ' + esc(who ? shortName(who) : it.addedBy) + (it.link ? '<span class="print-only"> · ' + esc(it.link) + '</span>' : '') + '</div>' +
        (it.summary ? '<p class="pb-sum">' + esc(it.summary) + '</p>' : '') + '</div>' +
      '<div class="pb-side">' +
        (stage === 'vote' && board ? starRow(it.id, r.mine, true) : '') +
        (stage !== 'collect' ? (showAvg ? '<span class="pb-avg" data-tip="' + esc(r.v.length ? r.v.map(function(v){ return userName(v.username) + ': ' + v.score; }).join('\n') : 'No scores yet') + '"><b>' + (r.avg == null ? '–' : r.avg.toFixed(1)) + '</b>' + ic('star') + '<small>' + r.v.length + (r.v.length === 1 ? ' score' : ' scores') + '</small></span>' : '<span class="pb-avg hidden-avg"><small>Score it to see the average</small></span>') : '') +
        (mgr && stage === 'vote' ? '<span class="pb-pick" role="group" aria-label="In the lineup?"><button type="button" class="chip" data-act="pubPick" data-id="' + esc(it.id) + '" data-p="' + (it.pick === 'in' ? '' : 'in') + '" aria-pressed="' + (it.pick === 'in') + '">' + ic('tick') + 'In</button><button type="button" class="chip" data-act="pubPick" data-id="' + esc(it.id) + '" data-p="' + (it.pick === 'out' ? '' : 'out') + '" aria-pressed="' + (it.pick === 'out') + '">' + ic('x') + 'Out</button></span>' : '') +
        (mayEdit || mayDel ? '<span class="pb-tools no-print">' + (mayEdit ? '<button type="button" class="icon-btn" data-act="pubAdd" data-id="' + esc(it.id) + '" aria-label="Edit article">' + ic('edit') + '</button>' : '') + (mayDel ? '<button type="button" class="icon-btn" data-act="pubDel" data-id="' + esc(it.id) + '" aria-label="Remove article">' + ic('trash') + '</button>' : '') + '</span>' : '') +
      '</div></li>';
  };
  var list;
  if (stage === 'final'){
    var inn = rows.filter(function(r){ return r.it.pick === 'in'; }), out = rows.filter(function(r){ return r.it.pick !== 'in'; });
    list = '<div class="print-head"><img src="' + LOGO + '" alt=""><div><b>Provincial Information Office · Camarines Norte</b><div>Bantayog Publication · ' + esc(iss.title) + ' · final lineup</div></div></div>' +
      '<div class="dsec">In the issue · ' + inn.length + '</div><ol class="pb-list">' + inn.map(function(r, i){ return card(r, i + 1); }).join('') + '</ol>' +
      (out.length ? '<details class="pb-out no-print"><summary>Not included · ' + out.length + '</summary><ol class="pb-list">' + out.map(function(r){ return card(r); }).join('') + '</ol></details>' : '') +
      '<p class="hint" style="margin-top:12px">Locked by ' + esc(userName(iss.finalBy)) + ' on ' + esc(fDate(taskDay(iss.finalAt))) + '.</p>';
  } else list = rows.length ? '<ol class="pb-list">' + rows.map(function(r){ return card(r); }).join('') + '</ol>'
    : empty('edit', 'No articles yet', (mgr || board) ? 'Add the Facebook posts from ' + fRange(iss.from, iss.to, { month: 'short', day: 'numeric' }) + ' that could go into this issue.' : 'Board members add articles here.', addBtn ? '<button class="btn btn-primary" data-act="pubAdd">' + ic('plus') + 'Add article</button>' : '');
  return { eyebrow: 'Bantayog Publication', title: esc(iss.title), sub: PUB_STAGES[si][1] + ' · ' + esc(fRange(iss.from, iss.to, { month: 'short', day: 'numeric' })), actions: actions,
    body: '<div class="grid">' + (chips ? '<div class="span-12">' + chips + '</div>' : '') +
      panel(stage === 'final' ? 'Final lineup' : stage === 'vote' ? 'Score the articles' : 'Articles', stage === 'vote' ? 'star' : 'list', '<div class="panel-b">' + info + '</div>' + list, addBtn, 'span-12 pb-panel') + '</div>' };
}

/* ---------- forms ---------- */
function pubIssueModal(iss){
  var td = today(), first = td.slice(0, 7) + '-01', last = ymd(new Date(+td.slice(0, 4), +td.slice(5, 7), 0));
  modal(iss ? 'Issue details' : 'New issue', '<input type="hidden" name="id" value="' + esc(iss ? iss.id : '') + '">' +
    '<div class="field"><label for="pbT">Name</label><input class="input" id="pbT" name="title" required maxlength="120" value="' + esc(iss ? iss.title : 'Bantayog, ' + fMonth(td.slice(0, 7))) + '"></div>' +
    '<div class="two"><div class="field"><label for="pbF">Covers news from</label><input class="input" type="date" id="pbF" name="from" required value="' + esc(iss ? iss.from : first) + '"></div><div class="field"><label for="pbTo">to</label><input class="input" type="date" id="pbTo" name="to" required value="' + esc(iss ? iss.to : last) + '"></div></div>' +
    '<div class="field"><label for="pbD">Scoring closes <span class="hint">(optional)</span></label><input class="input" type="date" id="pbD" name="due" value="' + esc(iss ? iss.due : '') + '"></div>' +
    '<div class="field"><label for="pbN">Note for the board <span class="hint">(optional)</span></label><textarea class="input" id="pbN" name="note" rows="2" maxlength="400">' + esc(iss ? iss.note : '') + '</textarea></div>',
    (iss && isAdmin() ? '<button type="button" class="btn btn-danger" data-act="pubDelIssue" data-id="' + esc(iss.id) + '">' + ic('trash') + 'Delete issue</button>' : '') + '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">' + (iss ? 'Save' : ic('plus') + 'Start issue') + '</button>', 'pubIssue');
}
function pubItemModal(it){
  var iss = pubCur();
  modal(it ? 'Edit article' : 'Add article', '<input type="hidden" name="id" value="' + esc(it ? it.id : '') + '"><input type="hidden" name="issueId" value="' + esc(iss.id) + '">' +
    '<div class="field"><label for="paL">Facebook post link</label><input class="input" id="paL" name="link" inputmode="url" placeholder="https://www.facebook.com/…" value="' + esc(it ? it.link : '') + '"><span class="hint">Open the post on Facebook, tap Share, then Copy link, and paste it here.</span></div>' +
    '<div class="field"><label for="paT">Title or headline</label><input class="input" id="paT" name="title" required maxlength="200" value="' + esc(it ? it.title : '') + '"></div>' +
    '<div class="field"><label for="paD">Posted on <span class="hint">(optional)</span></label><input class="input" type="date" id="paD" name="postedOn" min="' + esc(iss.from) + '" max="' + esc(iss.to) + '" value="' + esc(it ? it.postedOn : '') + '"></div>' +
    '<div class="field"><label for="paS">Summary <span class="hint">(optional)</span></label><textarea class="input" id="paS" name="summary" rows="3" maxlength="1200" placeholder="A line or two the board can read without opening Facebook">' + esc(it ? it.summary : '') + '</textarea></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button>' + (it ? '' : '<button class="btn btn-ghost" type="submit" data-again="1">' + ic('plus') + 'Add another</button>') + '<button class="btn btn-primary" type="submit">' + (it ? 'Save' : 'Add article') + '</button>', 'pubItem');
}
function pubBoardModal(){
  var on = pubBoard().map(function(u){ return u.username; });
  modal('Editorial board', '<p class="hint" style="margin:0 0 10px">Board members add articles and score them from 1 to 5. Pick anyone, in any division.</p><div class="tk-pick-l pb-boardpick">' + S.users.filter(function(u){ return u.active; }).sort(byDiv).map(function(u){
    return '<label class="tk-p"><input type="checkbox" name="board" value="' + esc(u.username) + '"' + (on.indexOf(u.username) >= 0 ? ' checked' : '') + '>' + avatarHtml(u, 30) + '<span class="tk-pn">' + esc(shortName(u)) + '<small class="tk-away">' + esc((divOf(u.division) || {}).short || '') + '</small></span></label>'; }).join('') + '</div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save board</button>', 'pubBoard');
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('form[data-form="pubIssue"],form[data-form="pubItem"],form[data-form="pubBoard"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var kind = f.dataset.form, d = {}; new FormData(f).forEach(function(v, k){ if (k !== 'board') d[k] = v; });
  var btn = (ev.submitter && ev.submitter.type === 'submit' ? ev.submitter : null) || f.querySelector('[type=submit]'), again = !!(ev.submitter && ev.submitter.dataset.again);
  if (kind === 'pubBoard'){ var names = [].slice.call(f.querySelectorAll('input[name="board"]:checked')).map(function(x){ return x.value; }); return busy(btn, act('setBoard', { usernames: names }, 'Editorial board saved').then(closeModal), 'merr'); }
  if (kind === 'pubIssue') return busy(btn, act('savePub', d, d.id ? 'Issue saved' : 'Issue started').then(function(r){ if (r && r.data && r.data.id) S.pubSel = r.data.id; closeModal(); render(); }), 'merr');
  busy(btn, act('savePubItem', d, d.id ? 'Article saved' : 'Article added').then(function(){
    if (again){ ['paL', 'paT', 'paD', 'paS'].forEach(function(id){ var el = document.getElementById(id); if (el) el.value = ''; }); var l = document.getElementById('paL'); if (l) l.focus(); }
    else closeModal(); }), 'merr');
}, true);

/* ---------- clicks ---------- */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act;
  if (a === 'pubNew') return pubIssueModal(null);
  if (a === 'pubEdit') return pubIssueModal(pubCur());
  if (a === 'pubBoardEdit') return pubBoardModal();
  if (a === 'pubSel'){ S.pubSel = t.dataset.id; render(); return; }
  if (a === 'pubAdd'){ var it = t.dataset.id && (S.pubItems || []).filter(function(x){ return x.id === t.dataset.id; })[0]; return pubItemModal(it || null); }
  if (a === 'pubStage'){ var s = t.dataset.s, iss = pubCur();
    busy(t, act('pubStage', { id: iss.id, stage: s }, s === 'vote' ? (iss.stage === 'final' ? 'Reopened for scoring' : 'Voting is open. The board can score now.') : s === 'final' ? 'Final lineup locked' : 'Back to collecting articles')); return; }
  if (a === 'pubPick'){ busy(t, act('pubPick', { id: t.dataset.id, pick: t.dataset.p })); return; }
  if (a === 'pubScore'){
    var id = t.dataset.id, n = +t.dataset.s, mine = pubVotesOf(id).filter(function(v){ return v.username === S.me.username; })[0], score = mine && mine.score === n ? 0 : n;
    // fill the stars at once, then save
    var row = t.closest('.pb-stars'); if (row) row.querySelectorAll('.pb-star').forEach(function(b, i){ b.classList.toggle('on', i < score); });
    if (!lessMotion() && score) t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    act('scorePub', { itemId: id, score: score }).catch(function(e){ toast(e.message); render(); }); return;
  }
  if (a === 'pubDel' || a === 'pubDelIssue'){
    if (!t.dataset.sure){ t.dataset.sure = '1'; var label = t.innerHTML; t.innerHTML = ic('trash') + (a === 'pubDelIssue' ? 'Tap again to delete' : ''); t.classList.add('sure'); setTimeout(function(){ if (document.body.contains(t)){ delete t.dataset.sure; t.innerHTML = label; t.classList.remove('sure'); } }, 4000); return; }
    busy(t, act(a === 'pubDel' ? 'deletePubItem' : 'deletePub', { id: t.dataset.id }, a === 'pubDel' ? 'Article removed' : 'Issue deleted').then(function(){ if (a === 'pubDelIssue'){ S.pubSel = null; closeModal(); } }), 'merr'); return;
  }
});
