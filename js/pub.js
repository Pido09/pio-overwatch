/* =====================================================================
   Bantayog Publication: pick the news for each issue.
   An issue covers a date range and moves Collecting → Voting → Final.
   Articles come from the PIO Facebook Page: the monthly export file from Meta Business Suite (uploaded here),
   the optional read-only scan (push-worker/fb.js), or a pasted post link.
   Editorial board members (chosen by an admin) add articles and score
   each one from 1 to 5; the app averages the scores. The Bantayog division leader or an admin picks what
   goes in and locks the final lineup, which prints for layout.
   ===================================================================== */
var PUB_STAGES = [['collect', 'Collecting'], ['vote', 'Voting'], ['final', 'Final lineup']];

/* ---------- Facebook's monthly export (Meta Business Suite → Insights → Content → Export data, CSV) ---------- */
/* a CSV reader that copes with quotes, commas and line breaks inside a post's text */
function parseCsv(txt){
  var rows = [], row = [], cell = '', q = false, s = String(txt || '').replace(/^﻿/, '');
  for (var i = 0; i < s.length; i++){
    var c = s[i];
    if (q){ if (c === '"'){ if (s[i + 1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ','){ row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r'){ if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(x){ return String(x).trim(); }); });
}
/* the date a post went up, as YYYY-MM-DD: "2026-11-28T09:30:00+0800", "11/28/2026 09:30" (US order, as Meta exports) */
function fbDay(v){
  var s = String(v || '').trim(), m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  var t = Date.parse(s); return isNaN(t) ? '' : ymd(new Date(t));
}
/* the posts in an export file: finds the text, date, link and id columns even if Meta renames them a little */
function fbExportRows(txt){
  var rows = parseCsv(txt); if (rows.length < 2) return [];
  var head = rows[0].map(function(h){ return String(h).trim().toLowerCase(); });
  var col = function(names){ for (var i = 0; i < names.length; i++){ var k = head.indexOf(names[i]); if (k >= 0) return k; } for (var j = 0; j < head.length; j++) if (names.some(function(n){ return head[j].indexOf(n) >= 0; })) return j; return -1; };
  var cText = col(['description', 'message', 'post message', 'caption', 'text']), cTitle = col(['title']), cDate = col(['publish time', 'published', 'created time', 'date']), cLink = col(['permalink', 'link', 'url']), cId = col(['post id', 'id']);
  if (cText < 0 && cTitle < 0 && cLink < 0) return [];
  var seen = {}, out = [];
  rows.slice(1).forEach(function(r){
    var text = String((cText >= 0 ? r[cText] : '') || (cTitle >= 0 ? r[cTitle] : '') || '').trim(), link = String(cLink >= 0 ? r[cLink] || '' : '').trim();
    var id = String(cId >= 0 ? r[cId] || '' : '').replace(/[^0-9_]/g, '') || (/(\d{6,})\/?(?:\?|$)/.exec(link) || [])[1] || '';
    if (!text && !link) return;
    var key = id || link || text.slice(0, 80); if (seen[key]) return; seen[key] = 1;   // one row per post
    out.push({ id: id, text: text, day: fbDay(cDate >= 0 ? r[cDate] : ''), link: /^https?:\/\//i.test(link) ? link : '' });
  });
  return out;
}
/* add an export's posts: each goes to its month's issue (opened if needed); posts already there are left alone */
function pubImportFile(file){
  return file.text().then(function(txt){
    var posts = fbExportRows(txt);
    if (!posts.length) throw new Error('This file doesn’t look like a Facebook export (no post text or link). In Meta Business Suite use Insights, then Content, then Export data, as CSV.');
    var res = { added: 0, already: 0, locked: 0, nodate: 0, months: {} };
    var byMonth = {}; posts.forEach(function(p){ if (!p.day){ res.nodate++; return; } (byMonth[p.day.slice(0, 7)] = byMonth[p.day.slice(0, 7)] || []).push(p); });
    return Object.keys(byMonth).sort().reduce(function(chain, ym){ return chain.then(function(){
      return call('ensurePubMonth', { ym: ym }).catch(function(){}).then(function(){
        var iss = pubIssues().filter(function(x){ return x.id === 'm' + ym; })[0] || pubIssues().filter(function(x){ return x.from <= ym + '-01' && x.to >= ym + '-28'; })[0];
        if (!iss){ res.locked += byMonth[ym].length; return; }
        res.months[iss.title] = 0;
        return byMonth[ym].sort(function(a, b){ return a.day < b.day ? -1 : 1; }).reduce(function(c2, p){ return c2.then(function(){
          var title = fbTitle(p.text) || 'Facebook post';
          return call('savePubItem', { issueId: iss.id, title: title, link: p.link, postedOn: p.day, summary: p.text.slice(title.length).trim().slice(0, 600), fbId: p.id })
            .then(function(){ res.added++; res.months[iss.title]++; }, function(e){ if (/already/i.test(e.message)) res.already++; else res.locked++; });
        }); }, Promise.resolve());
      });
    }); }, Promise.resolve()).then(function(){ return res; });
  });
}
function isBantayog(div){ var d = divOf(div); return !!(d && /bantayog/i.test(d.name + ' ' + (d.short || ''))); }
function pubMgr(){ return isAdmin() || (S.me && S.me.role === 'scheduler' && isBantayog(S.me.division)); }
function onBoard(u){ var x = userOf(u || S.me.username) || (u ? null : S.me); return !!(x && x.board === true); }
function pubCanSee(){ return !!S.me && (pubMgr() || onBoard()); }
function pubAvg(votes){ if (!votes || !votes.length) return null; return Math.round(votes.reduce(function(s, v){ return s + v.score; }, 0) / votes.length * 100) / 100; }
function pubIssues(){ return (S.pubs || []).filter(function(x){ return !x._del; }).sort(function(a, b){ return a.from < b.from ? 1 : -1; }); }
function pubItemsOf(id){ return (S.pubItems || []).filter(function(x){ return !x._del && !x.skip && x.issueId === id; }); }
function pubSkippedOf(id){ return (S.pubItems || []).filter(function(x){ return !x._del && x.skip && x.issueId === id; }); }

/* ---------- the Facebook Page: new posts in an issue's dates are added while it is collecting ---------- */
function fbOn(){ return typeof pushCfg === 'function' && !!pushCfg() && typeof LIVE !== 'undefined' && LIVE; }
function fbTitle(msg){ var line = String(msg || '').split(/\n+/).map(function(l){ return l.trim(); }).filter(Boolean)[0] || ''; return line.length > 160 ? line.slice(0, 157).replace(/\s+\S*$/, '') + '…' : line; }
function pubFbSync(iss, fresh){
  if (!fbOn() || !iss || iss.stage !== 'collect' || !(pubMgr() || onBoard())) return Promise.resolve();
  S.fbState = S.fbState || {}; var st = S.fbState[iss.id] = S.fbState[iss.id] || {};
  if (st.busy || (!fresh && st.at && Date.now() - st.at < 10 * 60 * 1000)) return Promise.resolve();
  if (!fresh && +(lGet('pio_fb_off') || 0) > Date.now() - 6 * 3600 * 1000) return Promise.resolve();   // not connected: ask again in a few hours
  st.busy = true; st.err = '';
  return pushPost('/fbposts', { from: iss.from, to: iss.to, fresh: !!fresh }).then(function(r){
    var have = {}; (S.pubItems || []).forEach(function(x){ if (x.issueId === iss.id && x.fbId) have[x.fbId] = 1; });   // skipped ones count too
    var add = (r.posts || []).filter(function(p){ return !have[p.id]; }).sort(function(a, b){ return a.at < b.at ? -1 : 1; }).slice(0, 40);
    st.checkedAt = r.checkedAt || Date.now(); st.page = r.page || '';
    // one at a time, then a single redraw
    return add.reduce(function(chain, p){ return chain.then(function(){
      var rest = String(p.message || '').trim(), title = fbTitle(rest) || 'Photo post';
      return call('savePubItem', { issueId: iss.id, title: title, link: p.link, postedOn: p.day, summary: rest.slice(title.length).trim().slice(0, 600), fbId: p.id, image: p.image }).catch(function(){});
    }); }, Promise.resolve()).then(function(){ st.added = add.length; if (add.length) toast(add.length + (add.length === 1 ? ' new post' : ' new posts') + ' added from Facebook'); });
  }).catch(function(e){ st.err = e.message || 'Facebook could not be read.'; if (/not connected/i.test(st.err)) lSet('pio_fb_off', String(Date.now())); }).then(function(){ st.busy = false; st.at = Date.now(); if (S.view === 'pub') render(); });
}
function pubFbLine(iss){
  var el = document.getElementById('pbFb'); if (!el || !iss) return;
  el.outerHTML = pubFbHtml(iss);
}
function pubFbHtml(iss){
  if (!fbOn() || !(pubMgr() || onBoard())) return '';
  var st = (S.fbState || {})[iss.id] || {}, txt;
  if (/not connected/i.test(st.err || '') || (!st.checkedAt && !st.busy)) return '<span id="pbFb" hidden></span>';   // the optional connection isn't set up: say nothing
  if (st.busy) txt = '<span class="spin" aria-hidden="true"></span>Checking Facebook…';
  else if (st.err) txt = ic('flag') + esc(/not connected/i.test(st.err) ? 'Facebook isn’t connected yet' : st.err);
  else if (st.checkedAt) txt = ic('news') + 'Facebook checked ' + esc(agoText(st.checkedAt));
  else txt = ic('news') + (iss.stage === 'collect' ? 'Facebook posts are added while collecting' : 'Facebook posts are added while collecting');
  return '<span id="pbFb" class="pb-fb' + (st.err ? ' err' : '') + '">' + txt + (iss.stage === 'collect' && !st.busy ? '<button type="button" class="lnk" data-act="pubFb">Check now</button>' : '') + '</span>';
}
function agoText(t){ var m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 60 * 24 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
function pubVotesOf(itemId){ return (S.pubVotes || []).filter(function(v){ return !v._del && v.itemId === itemId; }); }
function pubBoard(){ return S.users.filter(function(u){ return u.active && u.board === true; }).sort(byDiv); }
function pubCur(){ var L = pubIssues(), cur = 'm' + today().slice(0, 7); return L.filter(function(x){ return x.id === S.pubSel; })[0] || L.filter(function(x){ return x.id === cur; })[0] || L[0] || null; }
/* Monthly, by itself: this month's issue is opened the first time the leader or a board member visits,
   and a monthly issue whose month is over moves to voting. Runs once per visit. */
function pubMonthly(){
  if (S._pubMonthly || !(pubMgr() || onBoard())) return Promise.resolve(false);
  S._pubMonthly = true;
  var ym = today().slice(0, 7), jobs = [], changed = false;
  if (!pubIssues().some(function(x){ return x.id === 'm' + ym || (x.from === ym + '-01' && x.to === ymd(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0))); })) jobs.push(['ensurePubMonth', { ym: ym }]);
  pubIssues().forEach(function(x){ if (x.auto && x.stage === 'collect' && today() > x.to) jobs.push(['pubAutoVote', { id: x.id }]); });
  return jobs.reduce(function(chain, j){ return chain.then(function(){ return call(j[0], j[1]).then(function(){ changed = true; }).catch(function(){}); }); }, Promise.resolve())
    .then(function(){ if (changed && S.view === 'pub') render(); return changed; });
}
function starRow(itemId, mine, can){
  return '<span class="pb-stars" role="group" aria-label="Your score">' + [1, 2, 3, 4, 5].map(function(n){
    return '<button type="button" class="pb-star' + (mine >= n ? ' on' : '') + '" ' + (can ? 'data-act="pubScore" data-id="' + esc(itemId) + '" data-s="' + n + '"' : 'disabled') + ' aria-pressed="' + (mine === n) + '" aria-label="' + n + ' of 5' + (mine === n ? ' (tap again to clear)' : '') + '">' + ic('star') + '</button>'; }).join('') + '</span>';
}

/* ---------- the page ---------- */
function viewPub(){
  var mgr = pubMgr(), board = onBoard(), me = S.me.username, iss = pubCur(), all = pubIssues();
  if (!S._pubMonthly) setTimeout(pubMonthly, 0);   // this month's issue opens by itself
  var actions = (mgr || board ? '<button class="btn btn-sun" data-act="pubUpload" data-tip="Meta Business Suite: Insights, then Content, then Export data (CSV)">' + ic('upload') + 'Upload Facebook export</button>' : '') +
    (mgr ? '<button class="btn btn-glass" data-act="pubNew">' + ic('plus') + 'New issue</button>' : '') + (isAdmin() ? '<button class="btn btn-glass" data-act="pubBoardEdit">' + ic('users') + 'Editorial board</button>' : '');
  if (!iss) return { eyebrow: 'Bantayog Publication', title: 'Publication', sub: 'Pick the news for each issue of the Bantayog Publication.', actions: actions,
    body: '<div class="grid"><section class="panel span-12">' + empty('edit', 'No issues yet', mgr ? 'Start an issue for the dates it covers. Board members then add articles and score them.' : 'When the Bantayog leader starts an issue, its articles show up here for scoring.', mgr ? '<button class="btn btn-primary" data-act="pubNew">' + ic('plus') + 'New issue</button>' : '') + '</section></div>' };
  var items = pubItemsOf(iss.id), stage = iss.stage, si = PUB_STAGES.map(function(x){ return x[0]; }).indexOf(stage);
  setTimeout(function(){ pubFbSync(iss); }, 0);   // bring in new Facebook posts (at most every 10 minutes per visit)
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
      '<span class="pb-board" data-tip="' + esc(brd.length ? 'Editorial board\n' + brd.map(function(u){ return u.name; }).join('\n') : 'No editorial board yet') + '">' + ic('users') + '<span class="tk-faces">' + faces(brd.map(function(u){ return u.username; }), 22, 6) + '</span>' + (stage === 'vote' && brd.length ? scoredAll + ' of ' + brd.length + ' done scoring' : brd.length + ' on the board') + '</span>' + pubFbHtml(iss) + '</div>' +
    (iss.auto ? '<p class="hint" style="margin:8px 0 0">' + ic('cal') + (stage === 'collect' ? 'Monthly issue: posts from this month collect here, and voting opens by itself when the month ends.' : stage === 'vote' && iss.autoVoted ? 'The month has ended, so voting opened by itself. The Bantayog leader locks the final lineup.' : 'Monthly issue.') + '</p>' : '') +
    (iss.note ? '<p class="hint" style="margin:8px 0 0">' + esc(iss.note) + '</p>' : '') +
    (stage === 'vote' && board ? '<div class="pb-mine"><b>' + myCount + ' of ' + items.length + '</b> scored by you' + (myCount < items.length ? '. Tap the stars, 1 (leave out) to 5 (must include).' : '. Thank you!') + '<span class="pb-bar"><i style="width:' + (items.length ? Math.round(myCount / items.length * 100) : 0) + '%"></i></span></div>' : '') +
    (!board && !mgr ? '<p class="hint">Only editorial board members score articles.</p>' : '');
  var card = function(r, n){
    var it = r.it, showAvg = mgr || r.mine || stage === 'final', who = userOf(it.addedBy);
    var mayEdit = stage !== 'final' && (mgr || it.addedBy === me), mayDel = stage !== 'final' && (it.fbId ? (mgr || board) : (mgr || (it.addedBy === me && stage === 'collect')));
    return '<li class="pb-item' + (it.pick === 'in' ? ' is-in' : it.pick === 'out' ? ' is-out' : '') + '">' + (n ? '<span class="pb-n">' + n + '</span>' : '') +
      (it.image ? '<img class="pb-img" src="' + esc(it.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<div class="pb-body"><div class="pb-t">' + esc(it.title) + (it.link ? ' <a class="pb-link no-print" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer" aria-label="Open the Facebook post">' + ic('right') + '</a>' : '') + '</div>' +
        '<div class="pb-m">' + (it.postedOn ? esc(fDate(it.postedOn, { month: 'short', day: 'numeric' })) + ' · ' : '') + 'added by ' + esc(who ? shortName(who) : it.addedBy) + (it.link ? '<span class="print-only"> · ' + esc(it.link) + '</span>' : '') + '</div>' +
        (it.summary ? '<p class="pb-sum">' + esc(it.summary) + '</p>' : '') + '</div>' +
      '<div class="pb-side">' +
        (stage === 'vote' && board ? starRow(it.id, r.mine, true) : '') +
        (stage !== 'collect' ? (showAvg ? '<span class="pb-avg" data-tip="' + esc(r.v.length ? r.v.map(function(v){ return userName(v.username) + ': ' + v.score; }).join('\n') : 'No scores yet') + '"><b>' + (r.avg == null ? '–' : r.avg.toFixed(1)) + '</b>' + ic('star') + '<small>' + r.v.length + (r.v.length === 1 ? ' score' : ' scores') + '</small></span>' : '<span class="pb-avg hidden-avg"><small>Score it to see the average</small></span>') : '') +
        (mgr && stage === 'vote' ? '<span class="pb-pick" role="group" aria-label="In the lineup?"><button type="button" class="chip" data-act="pubPick" data-id="' + esc(it.id) + '" data-p="' + (it.pick === 'in' ? '' : 'in') + '" aria-pressed="' + (it.pick === 'in') + '">' + ic('tick') + 'In</button><button type="button" class="chip" data-act="pubPick" data-id="' + esc(it.id) + '" data-p="' + (it.pick === 'out' ? '' : 'out') + '" aria-pressed="' + (it.pick === 'out') + '">' + ic('x') + 'Out</button></span>' : '') +
        (mayEdit || mayDel ? '<span class="pb-tools no-print">' + (mayEdit ? '<button type="button" class="icon-btn" data-act="pubAdd" data-id="' + esc(it.id) + '" aria-label="Edit article">' + ic('edit') + '</button>' : '') + (mayDel ? (it.fbId ? '<button type="button" class="icon-btn" data-act="pubDel" data-id="' + esc(it.id) + '" aria-label="Skip this post (not news)" data-tip="Skip (not news)">' + ic('x') + '</button>' : '<button type="button" class="icon-btn" data-act="pubDel" data-id="' + esc(it.id) + '" aria-label="Remove article">' + ic('trash') + '</button>') : '') + '</span>' : '') +
      '</div></li>';
  };
  var list;
  if (stage === 'final'){
    var inn = rows.filter(function(r){ return r.it.pick === 'in'; }), out = rows.filter(function(r){ return r.it.pick !== 'in'; });
    list = '<div class="print-head"><img src="' + LOGO + '" alt=""><div><b>Provincial Information Office · Camarines Norte</b><div>Bantayog Publication · ' + esc(iss.title) + ' · final lineup</div></div></div>' +
      '<div class="dsec">In the issue · ' + inn.length + '</div><ol class="pb-list">' + inn.map(function(r, i){ return card(r, i + 1); }).join('') + '</ol>' +
      (out.length ? '<details class="pb-out no-print"><summary>Not included · ' + out.length + '</summary><ol class="pb-list">' + out.map(function(r){ return card(r); }).join('') + '</ol></details>' : '') +
      '<p class="hint" style="margin-top:12px">Locked by ' + esc(userName(iss.finalBy)) + ' on ' + esc(fDate(taskDay(iss.finalAt))) + '.</p>';
  } else list = (rows.length ? '<ol class="pb-list">' + rows.map(function(r){ return card(r); }).join('') + '</ol>'
    : empty('edit', 'No articles yet', (mgr || board) ? 'Add the Facebook posts from ' + fRange(iss.from, iss.to, { month: 'short', day: 'numeric' }) + ' that could go into this issue.' : 'Board members add articles here.', addBtn ? '<button class="btn btn-primary" data-act="pubAdd">' + ic('plus') + 'Add article</button>' : '')) +
    // posts set aside as "not news" (from the Facebook Page), with a way back
    (function(){ var sk = pubSkippedOf(iss.id); return sk.length && (mgr || board) ? '<details class="pb-out no-print"><summary>Skipped posts · ' + sk.length + '</summary><ul class="pb-list">' + sk.map(function(it){
      return '<li class="pb-item is-out"><div class="pb-body"><div class="pb-t">' + esc(it.title) + '</div><div class="pb-m">' + (it.postedOn ? esc(fDate(it.postedOn, { month: 'short', day: 'numeric' })) : '') + '</div></div><div class="pb-side"><button type="button" class="btn btn-sm btn-ghost" data-act="pubUnskip" data-id="' + esc(it.id) + '">' + ic('left') + 'Bring back</button></div></li>'; }).join('') + '</ul></details>' : ''; })();
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
  if (a === 'pubFb'){ pubFbSync(pubCur(), true); return; }
  if (a === 'pubUpload'){
    // pick the CSV Meta Business Suite exported, add its posts, then say what happened
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = function(){
      var f = inp.files && inp.files[0]; if (!f) return;
      busy(t, pubImportFile(f).then(function(r){
        render();
        var months = Object.keys(r.months), lines = months.map(function(m){ return '<li><b>' + r.months[m] + '</b> added to <b>' + esc(m) + '</b></li>'; });
        if (r.already) lines.push('<li>' + r.already + (r.already === 1 ? ' post was' : ' posts were') + ' already there (or skipped earlier), left as they are</li>');
        if (r.locked) lines.push('<li>' + r.locked + ' could not be added (that month’s lineup is locked)</li>');
        if (r.nodate) lines.push('<li>' + r.nodate + ' had no date, so they were left out</li>');
        modal(r.added ? 'Facebook posts added' : 'Nothing new to add', '<p style="margin:0 0 8px">' + (r.added ? 'From ' + esc(f.name) + ':' : 'Every post in ' + esc(f.name) + ' is already in its issue.') + '</p><ul class="pb-res">' + lines.join('') + '</ul>' +
          '<p class="hint" style="margin:10px 0 0">Posts that aren’t news can be skipped with the ✕ on each one.</p>', '<button type="button" class="btn btn-primary" data-act="close">Done</button>');
      }));
    };
    inp.click(); return;
  }
  if (a === 'pubUnskip'){ busy(t, act('pubUnskip', { id: t.dataset.id }, 'Post brought back')); return; }
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
