/* PIO Overwatch · documents.js · loaded in order by index.html (core, views, events, documents, data, app). */
/* ---------- TEVs ---------- */
var TEV_ST = { 'To prepare': ['To prepare', 'off', 'Being prepared'], 'Pending': ['Pending', 'Pending', 'Waiting for the cheque'], 'Claimed': ['Claimed', 'Confirmed', 'Cheque released'] };
var COVER = [['transpo', 'Transportation'], ['food', 'Food'], ['lodging', 'Accommodation'], ['other', 'Other']];
function tevSums(list){
  var o = { released: 0, pending: 0, prep: 0, prepN: 0, pendN: 0, relN: 0 };
  list.forEach(function(v){ if (v.status === 'Claimed'){ o.released += v.total; o.relN++; } else if (v.status === 'Pending'){ o.pending += v.total; o.pendN++; } else { o.prep += v.total; o.prepN++; } });
  return o;
}
function tevYear(v){ var t = toOf(v.toId); return (v.releasedOn || (t && t.dateFrom) || v.submittedOn || '').slice(0, 4); }
function tevTiles(list, budget, cls){
  var s = tevSums(list), left = budget ? budget - s.released - s.pending : null;
  return '<div class="tiles' + (budget == null ? ' three ' : ' ') + (cls || '') + '">' +
    tile('Released', peso(s.released), s.relN + ' claimed', '', 'check', '') +
    tile('Pending', peso(s.pending), s.pendN + ' waiting for the cheque', s.pendN ? 'warn' : '', 'clock', '') +
    tile('To prepare', String(s.prepN), s.prep ? peso(s.prep) + ' drafted' : 'Not yet submitted', '', 'edit', '') +
    (budget != null ? tile('Left for spending', budget ? peso(left) : '—', budget ? 'Of ' + peso(budget) + ' this year' : (isAdmin() ? 'Set the TEV budget in Settings' : 'No budget set'), left != null && left < 0 ? 'warn' : '', 'peso', isAdmin() && !budget ? 'data-go="settings"' : '') : '') + '</div>';
}
function tevRow(v){
  var adm = isAdmin(), st = TEV_ST[v.status] || TEV_ST['To prepare'], cov = COVER.filter(function(c){ return v[c[0]] > 0; });
  return '<li class="row' + (adm && !v._saving ? ' tap" data-act="tevEdit" data-id="' + v.id + '" tabindex="0' : v._saving ? ' is-saving' : '') + '"><span class="avatar">' + esc(initials(v.name)) + '</span><div class="body"><div class="t">' + esc(v.name) + '</div>' +
    '<div class="m">' + (cov.length ? cov.map(function(c){ return c[1] + ' ' + peso(v[c[0]]); }).join(' · ') : 'No amounts yet') +
      (v.chequeNo ? ' · Cheque ' + esc(v.chequeNo) : '') + (v.releasedOn ? ' · Released ' + fDate(v.releasedOn) : v.submittedOn ? ' · Submitted ' + fDate(v.submittedOn) : '') + '</div></div>' +
    '<span class="amt">' + peso(v.total) + '</span>' + (adm ? tevQuick(v) : '<span class="pill ' + st[1] + '">' + st[0] + '</span>') + '</li>';
}
/* One-tap next step: Submit (to prepare > pending) and Claim (pending > claimed). */
function tevQuick(v){
  if (v.status === 'Pending') return '<button class="btn btn-sm btn-primary" data-act="tevClaim" data-id="' + v.id + '">' + ic('check') + 'Claim</button>';
  if (v.status === 'To prepare') return v.total > 0 ? '<button class="btn btn-sm btn-ghost" data-act="tevSubmit" data-id="' + v.id + '">Submit</button>' : '<button class="btn btn-sm btn-ghost" data-act="tevEdit" data-id="' + v.id + '">' + ic('edit') + 'Fill in</button>';
  return '<span class="pill Confirmed">Claimed</span>';
}
function tevStep(ids, status){
  var td = today(), list = (S.tevs || []).filter(function(v){ return ids.indexOf(v.id) >= 0 && !v._saving; });
  if (!list.length) return;
  var one = list.length === 1, patch = { status: status };
  if (status === 'Claimed') patch.releasedOn = td;
  // one request for the whole group; the server keeps any dates already set
  bg('setTEVStatus', { ids: list.map(function(v){ return v.id; }), status: status }, { arr: 'tevs', ids: list.map(function(v){ return v.id; }), patch: patch },
     one ? (status === 'Claimed' ? 'Claimed' : 'Submitted') + ' · ' + list[0].name : list.length + ' TEVs ' + (status === 'Claimed' ? 'claimed' : 'submitted'),
     one ? 'The TEV for ' + list[0].name : list.length + ' TEVs');
}
function viewTEV(){
  var adm = isAdmin(), tab = S.tevTab || 'To prepare', yr = today().slice(0, 4), budget = Number(S.settings.tevBudget) || 0;
  var all = S.tevs || [], yearList = all.filter(function(v){ return tevYear(v) === yr; });
  var list = all.filter(function(v){ return (tab === 'All' || v.status === tab) && (!S.tevTO || v.toId === S.tevTO); });
  var groups = {}, order = [];
  list.forEach(function(v){ if (!groups[v.toId]){ groups[v.toId] = []; order.push(v.toId); } groups[v.toId].push(v); });
  order.sort(function(a, b){ var x = toOf(a), y = toOf(b); return ((y && y.dateFrom) || '') < ((x && x.dateFrom) || '') ? -1 : 1; });
  // groups start closed (header only, with a count); tap the header to see the people. One group, or a
  // single travel order picked, starts open.
  S.tevOpen = S.tevOpen || {};
  var body = order.map(function(id){
    var t = toOf(id), vs = groups[id], sum = vs.reduce(function(n, v){ return n + v.total; }, 0), open = !!(S.tevAllOpen || S.tevOpen[id] || S.tevTO || order.length === 1);
    var byS = {}; vs.forEach(function(v){ byS[v.status] = (byS[v.status] || 0) + 1; });
    var cnt = vs.length + (vs.length === 1 ? ' person' : ' people') + ['To prepare', 'Pending', 'Claimed'].filter(function(s){ return byS[s]; }).map(function(s){ return ' · ' + byS[s] + ' ' + s.toLowerCase(); }).join('');
    return '<li class="grp tev-grp tap' + (open ? ' open' : '') + '" data-act="tevGrp" data-id="' + id + '" tabindex="0" aria-expanded="' + open + '"><span class="to-chev" aria-hidden="true">' + ic('right') + '</span><div><b>' + esc(t ? t.event : 'Travel order') + '</b><span class="hint">' + (t ? fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric', year:'numeric' }) + (t.destination ? ' · ' + esc(t.destination) : '') + (t.toNo ? ' · TO No. ' + esc(t.toNo) : '') : 'Removed') + '</span><span class="hint tev-cnt">' + cnt + '</span></div>' +
      (function(){ var pend = vs.filter(function(v){ return v.status === 'Pending' && !v._saving; }); return adm && pend.length > 1 ? '<button class="btn btn-sm btn-primary" data-act="tevClaimAll" data-ids="' + pend.map(function(v){ return v.id; }).join(',') + '">' + ic('check') + 'Claim all ' + pend.length + '</button>' : ''; })() +
      '<b class="num">' + peso(sum) + '</b>' + (adm ? '<button class="icon-btn" data-act="tevPrint" data-to="' + id + '" aria-label="Print TEV forms" title="Print TEV forms">' + ic('print') + '</button>' : '') + '</li>' +
      vs.sort(function(a, b){ return a.name < b.name ? -1 : 1; }).map(function(v){ return tevRow(v).replace('<li class="', '<li data-g="' + id + '" class="tevmem' + (open ? '' : ' shut') + ' '); }).join('');
  }).join('');
  var tabs = '<div class="tabs" role="group" aria-label="Show">' + ['To prepare', 'Pending', 'Claimed', 'All'].map(function(x){ var n = all.filter(function(v){ return (x === 'All' || v.status === x) && (!S.tevTO || v.toId === S.tevTO); }).length; return '<button data-act="tevTab" data-t="' + x + '" aria-pressed="' + (tab === x) + '">' + x + (n ? ' · ' + n : '') + '</button>'; }).join('') + '</div>';
  var ft = S.tevTO && toOf(S.tevTO);
  return { eyebrow: 'Field work', title: adm ? 'Travel expense vouchers' : 'My TEVs',
    sub: adm ? 'From preparing the TEV to the release of the cheque. Totals are for ' + yr + '.' : 'Your travel expense vouchers and where each one is.',
    actions: adm ? '<button class="btn btn-sun" data-act="tevNew">' + ic('plus') + 'Add TEV</button>' : '',
    body: '<div class="grid">' + tevTiles(yearList, adm ? budget : null, 'span-12') +
      (ft ? '<div class="span-12 info-note">' + ic('route') + '<span>Showing TEVs for <b>' + esc(ft.event) + '</b> in ' + esc(ft.destination || '—') + '. <button class="link" data-act="tevAll">Show all</button></span></div>' : '') +
      panel('TEVs', 'peso', list.length ? '<ul class="list">' + body + '</ul>' : empty('peso', tab === 'All' ? 'No TEVs yet' : 'Nothing ' + tab.toLowerCase(), adm ? 'When a travel order is marked “TEV: Yes”, a TEV is started for each person on it.' : 'TEVs for your travel orders show here.', adm ? '<button class="btn btn-ghost" data-go="travel">' + ic('route') + 'Travel orders</button>' : ''), tabs + (order.length > 1 ? '<button type="button" class="btn btn-sm btn-ghost" data-act="tevAllOpen" aria-pressed="' + !!S.tevAllOpen + '">' + ic(S.tevAllOpen ? 'minus' : 'plus') + (S.tevAllOpen ? 'Close all' : 'Open all') + '</button>' : ''), 'span-12') + '</div>' };
}
function tevModal(id, toId){
  var v = id ? (S.tevs || []).filter(function(x){ return x.id === id; })[0] : null;
  if (id && !v) return;
  M = { id: id };
  var tos = activeTOs().slice().sort(function(a, b){ return a.dateFrom < b.dateFrom ? 1 : -1; }).slice(0, 60), t0 = v ? toOf(v.toId) : toOf(toId) || tos[0];
  var head = v ? '<div class="sumbox"><b>' + esc(v.name) + '</b><span>' + (t0 ? esc(t0.event) + ' · ' + esc(t0.destination || '') + ' · ' + fRange(t0.dateFrom, t0.dateTo, { month:'short', day:'numeric', year:'numeric' }) : '') + '</span></div>'
    : (tos.length ? '<div class="field"><label for="vto">Travel order</label><select class="input" id="vto" name="toId">' + tos.map(function(t){ return '<option value="' + t.id + '"' + (t0 && t.id === t0.id ? ' selected' : '') + '>' + esc(t.event) + ' · ' + esc(fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric' })) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="vn">Employee</label><select class="input" id="vn" name="name"></select></div>' : '<p class="hint">File a travel order first.</p>');
  v = v || { status: 'To prepare', transpo: 0, food: 0, lodging: 0, other: 0 };
  modal(id ? 'TEV' : 'Add a TEV', head +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">What the TEV covers</legend><div class="cover">' +
      COVER.map(function(c){ var on = v[c[0]] > 0; return '<label class="cov"><input type="checkbox" data-cov="' + c[0] + '"' + (on ? ' checked' : '') + '><span>' + c[1] + '</span><input class="input num" type="number" min="0" step="0.01" inputmode="decimal" name="' + c[0] + '" value="' + (on ? v[c[0]] : '') + '" placeholder="0.00" aria-label="' + c[1] + ' amount"' + (on ? '' : ' disabled') + '></label>'; }).join('') +
      '</div><div class="tev-total"><span>Total</span><b class="num" id="vtot">' + peso(v.total || 0) + '</b></div></fieldset>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Status</legend><div class="seg">' +
      Object.keys(TEV_ST).map(function(k, i){ return '<input type="radio" name="status" id="vs' + i + '" value="' + k + '"' + (v.status === k ? ' checked' : '') + '><label for="vs' + i + '"><b>' + k + '</b><small>' + TEV_ST[k][2] + '</small></label>'; }).join('') + '</div></fieldset>' +
    '<div class="two"><div class="field"><label for="vsub">Submitted on</label><input class="input" id="vsub" name="submittedOn" type="date" value="' + esc(v.submittedOn || '') + '"></div><div class="field"><label for="vrel">Cheque released on</label><input class="input" id="vrel" name="releasedOn" type="date" value="' + esc(v.releasedOn || '') + '"></div></div>' +
    '<div class="two"><div class="field"><label for="vchq">Cheque no. <span class="hint">(optional)</span></label><input class="input" id="vchq" name="chequeNo" maxlength="40" value="' + esc(v.chequeNo || '') + '"></div><div class="field"><label for="vnote">Note <span class="hint">(optional)</span></label><input class="input" id="vnote" name="note" maxlength="200" value="' + esc(v.note || '') + '"></div></div>',
    (id ? '<button type="button" class="btn btn-ghost" data-act="tevDel" data-id="' + id + '" style="margin-right:auto;color:var(--red)">' + ic('trash') + 'Delete</button>' : '') +
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save TEV</button>', 'tev');
  tevNames(); tevTotal();
}
function tevNames(){
  var s = document.getElementById('vto'), n = document.getElementById('vn'); if (!s || !n) return;
  var t = toOf(s.value), have = (S.tevs || []).filter(function(v){ return v.toId === s.value; }).map(function(v){ return v.name; });
  var names = t ? sortNames(t.names).filter(function(x){ return have.indexOf(x) < 0; }) : [];
  n.innerHTML = names.length ? names.map(function(x){ return '<option>' + esc(x) + '</option>'; }).join('') : '<option value="">Everyone on this TO has a TEV</option>';
}
function tevTotal(){
  var sum = 0; COVER.forEach(function(c){ var i = document.querySelector('#modal input[name=' + c[0] + ']'); if (i && !i.disabled) sum += Number(i.value) || 0; });
  var o = document.getElementById('vtot'); if (o) o.textContent = peso(sum);
}
/* Asked after a travel order is marked "TEV: Yes". */
function tevPrompt(t){
  modal('Make the TEVs now?', '<p style="margin:0">A TEV was started for each of the ' + t.names.length + ' ' + (t.names.length === 1 ? 'person' : 'people') + ' on <b>' + esc(t.event) + '</b> in ' + esc(t.destination || '—') + '. You can fill in the amounts now or later from <b>TEVs</b> under Field work.</p>',
    '<button type="button" class="btn btn-ghost" data-act="close">Later</button><button type="button" class="btn btn-primary" data-act="tevGo" data-id="' + t.id + '">' + ic('peso') + 'Make them now</button><button type="button" class="btn btn-ghost" data-act="toPrint" data-id="' + t.id + '">Print travel order</button>');
}

/* ---------- dashboards ---------- */
WIDGETS.admin.splice(WIDGETS.admin.map(function(w){ return w[0]; }).indexOf('tos') + 1, 0, ['tevsum', 'TEV totals', 12]);
WIDGETS.employee.push(['mytev', 'My TEVs', 6]);
WIDGETS.regular = [['leave', 'My leave credits', 12], ['myleaves', 'My leave history', 6], ['mytos', 'My travel orders', 6], ['out', 'Who’s out today', 6], ['holidays', 'Upcoming holidays', 6],
  ['hero', 'Offset balance', 12], ['mytev', 'My TEVs', 6], ['recent', 'Recent offsets', 6], ['trend', 'My monthly offsets chart', 12]];
function myTevWidget(n){
  var mine = (S.tevs || []).filter(function(v){ return v.username === S.me.username; }), open = mine.filter(function(v){ return v.status !== 'Claimed'; }).slice(0, 4);
  return panel('My TEVs', 'peso', mine.length ? '<ul class="list">' + (open.length ? open : mine.slice(0, 3)).map(function(v){ var t = toOf(v.toId), st = TEV_ST[v.status] || TEV_ST['To prepare'];
      return '<li class="row"><span class="mark to">' + ic('peso') + '</span><div class="body"><div class="t">' + esc(t ? t.event : 'Travel order') + '</div><div class="m">' + st[0] + (t ? ' · ' + fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric' }) : '') + '</div></div><span class="amt">' + peso(v.total) + '</span></li>'; }).join('') + '</ul>'
    : empty('peso', 'No TEVs', 'When a travel order you are on gets a TEV, it shows here.'), '<button class="btn btn-sm btn-ghost" data-go="tev">All</button>', span(n));
}
function myLeavesWidget(n){
  var list = S.leaves.filter(function(l){ return l.username === S.me.username && !/^ADJ/.test(l.type); }).sort(function(a, b){ return a.dateFrom < b.dateFrom ? 1 : -1; }).slice(0, 5);
  return panel('My leave history', 'plane', list.length ? '<ul class="list">' + list.map(function(l){ return leaveRow(l); }).join('') + '</ul>' : empty('plane', 'No leaves recorded', 'Leaves the admin records from your Form 6 show here.'), '<button class="btn btn-sm btn-ghost" data-go="leaves">All</button>', span(n));
}
(function(){
  var A = adminWidgets, E = empWidgets;
  adminWidgets = function(staff){ var w = A(staff); w.tevsum = function(n){ var yr = today().slice(0, 4), s = tevSums((S.tevs || []).filter(function(v){ return tevYear(v) === yr; })), bud = Number(S.settings.tevBudget) || 0;
      return '<button class="mine ' + span(n) + '" data-go="tev"><span class="k">' + ic('peso') + 'TEVs ' + yr + '</span><b>' + peso(s.pending) + ' pending</b><span class="hint">' + s.prepN + ' to prepare · ' + peso(s.released) + ' released' + (bud ? ' · ' + peso(bud - s.released - s.pending) + ' left' : '') + '</span><span class="go">TEVs' + ic('right') + '</span></button>'; }; return w; };
  empWidgets = function(){ var w = E(); w.mytev = myTevWidget; w.myleaves = myLeavesWidget; return w; };
  // Regular and casual staff: lines about leaves instead of offsets.
  var Q0 = quip;
  quip = function(){
    if (isAdmin() || !hasLeaves()) return Q0();
    var lw = nextLongWeekend(); if (lw) return Q0();
    var b = leaveBal(S.me.username), fl = 5 - (b.used.FL || 0), mo = +today().slice(5, 7);
    if (b.set && mo >= 9 && fl > 0) return fl + ' of your 5 mandatory leave day' + (fl === 1 ? ' is' : 's are') + ' still unused this year.';
    if (b.set && b.vl >= 15) return 'Vacation leave balance: ' + fD(b.vl) + '.';
    if (b.left('WL') > 0 && mo >= 10) return 'Wellness leave left this year: ' + fD(b.left('WL')) + '.';
    return Q0();
  };
})();

/* ---------- travel order document (fills the office's Word template) ---------- */
/* to-template.docx sits beside index.html. It is the PIO template with {DATE}, {NAME}, {DEST}, {DEP}, {ARR}, {PURPOSE}, {X1}, {X2}, {REC1}-{REC3} in place of the sample text. */
var JSZIP_URL = 'jszip.min.js';   // kept in the repo so it works without outside sites
function loadZip(){
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = JSZIP_URL; sc.onload = function(){ ok(window.JSZip); }; sc.onerror = function(){ no(new Error('Could not load the document tool. Check your internet connection.')); }; document.head.appendChild(sc); });
}
function xmlEsc(v){ return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/* The Provincial Information Officer does not recommend her own travel. When she travels with other
   employees, their travel still needs her recommendation, so it is left out only when she goes alone. */
function selfRecommend(t){ var n = t.names || []; return n.length === 1 && /SARAH/i.test(n[0]) && /AVIADO/i.test(n[0]); }
function toDocXml(x, t){
  var o = { month:'long', day:'numeric', year:'numeric' }, names = sortNames(t.names);
  // one line per extra person: copy the second name line
  var p2 = x.indexOf('{NAME}', x.indexOf('{NAME}') + 1);
  if (p2 > 0){
    var s = Math.max(x.lastIndexOf('<w:p ', p2), x.lastIndexOf('<w:p>', p2)), e = x.indexOf('</w:p>', p2) + 6, line = x.slice(s, e);
    x = x.slice(0, s) + names.slice(1).map(function(n){ return line.replace('{NAME}', xmlEsc(n)); }).join('') + x.slice(e);
  }
  var rec = !selfRecommend(t), map = {
    DATE: fDate(t.datePrepared || today(), o), NAME: names[0] || '', DEST: t.destination || '',
    DEP: fDate(t.dateFrom, o), ARR: fDate(t.dateTo || t.dateFrom, o),
    PURPOSE: String(t.event || '').replace(/[.\s]+$/, '') + (t.destination ? ' at ' + t.destination : ''),
    X1: t.tev === 'No' ? 'X' : '', X2: t.tev === 'Yes' ? 'X' : '',
    REC1: rec ? 'RECOMMENDING APPROVAL:' : '', REC2: rec ? '       SARAH MARIE P. AVIADO, DPA' : '', REC3: rec ? '         Provincial Information Officer' : ''
  };
  return x.replace(/\{(DATE|NAME|DEST|DEP|ARR|PURPOSE|X1|X2|REC1|REC2|REC3)\}/g, function(m, k){ return xmlEsc(map[k]); });
}
function printTO(t, btn){
  if (btn) btn.disabled = true;
  var name = ('Travel Order ' + (t.toNo || t.dateFrom) + ' ' + t.event).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) + '.docx';
  return Promise.all([loadZip(), fetch('to-template.docx', { cache: 'no-cache' }).then(function(r){ if (!r.ok) throw new Error('to-template.docx is missing from the site. Upload it to GitHub next to index.html.'); return r.arrayBuffer(); })])
    .then(function(a){ return a[0].loadAsync(a[1]); })
    .then(function(z){ return z.file('word/document.xml').async('string').then(function(x){ z.file('word/document.xml', toDocXml(x, t)); return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); }); })
    .then(function(blob){ var u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 30000); toast('Travel order downloaded. Open it in Word to print.'); })
    .catch(function(e){ toast(e.message || 'Could not make the document.'); })
    .then(function(){ if (btn) btn.disabled = false; });
}
(function(){
  var R = toRow;
  toRow = function(t){
    var h = R(t);
    if (t.status === 'Prepared' && isAdmin()) h = h.replace('<div class="to-icons">', '<div class="to-icons"><button class="btn btn-sm btn-ghost" data-act="toPrint" data-id="' + t.id + '">' + ic('print') + 'Print</button>');
    if (t.tev === 'Yes' && !t._saving){ var n = (S.tevs || []).filter(function(v){ return v.toId === t.id; }); if (n.length) h = h.replace(/(<span class="pill hol">TEV: Yes<\/span>)/, '<button class="pill hol" data-act="tevGo" data-id="' + t.id + '" style="border:0;cursor:pointer">TEV: Yes · ' + n.filter(function(v){ return v.status === 'Claimed'; }).length + '/' + n.length + ' claimed</button>'); }
    return h;
  };
})();

/* ---------- calendar: events overview ---------- */
function toPicks(who){
  var td = today(), from = addDays(td, -60);
  var list = activeTOs().filter(function(t){ return t.usernames.indexOf(who) >= 0 && t.dateFrom <= td && t.dateTo >= from; }).sort(function(a, b){ return a.dateFrom < b.dateFrom ? 1 : -1; }).slice(0, 6);
  return '<div class="field"><span class="label">Quick fill</span><div class="picks">' +
    list.map(function(t){ return '<button type="button" class="pick" data-act="pickTO" data-id="' + t.id + '">' + ic('route') + '<span><b>' + esc(t.event) + '</b><small>' + esc(t.destination || '') + ' · ' + esc(fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric' })) + '</small></span></button>'; }).join('') +
    '<button type="button" class="pick" data-act="pickCapitol">' + ic('monument') + '<span><b>Within the Capitol grounds</b><small>No travel order needed</small></span></button></div>' +
    (list.length ? '<span class="hint">Your travel orders from the last 60 days. Tap one to fill in the form.</span>' : '<span class="hint">No travel orders under your name in the last 60 days.</span>') + '</div>';
}
(function(){
  var F = earnFields;
  earnFields = function(e, adm){ var h = F(e, adm); return h.replace('<div class="field"><label for="fe">', '<div id="pickWrap">' + toPicks((e && e.username) || S.me.username) + '</div><div class="field"><label for="fe">'); };
})();

/* ---------- events ---------- */
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'tevTab'){ S.tevTab = t.dataset.t; if (S.view !== 'tev'){ S.view = 'tev'; window.scrollTo(0, 0); } render(); }
  else if (a === 'tevOpen'){ S.tevTab = t.dataset.t; S.tevTO = null; S.view = 'tev'; render(); window.scrollTo(0, 0); }
  else if (a === 'tevAll'){ S.tevTO = null; render(); }
  else if (a === 'tevGo'){ closeModal(); S.tevTO = t.dataset.id; S.tevTab = 'All'; S.view = 'tev'; render(); window.scrollTo(0, 0); }
  else if (a === 'tevEdit') tevModal(t.dataset.id);
  else if (a === 'tevClaim') tevStep([t.dataset.id], 'Claimed');
  else if (a === 'tevSubmit') tevStep([t.dataset.id], 'Pending');
  else if (a === 'tevClaimAll') tevStep(t.dataset.ids.split(','), 'Claimed');
  else if (a === 'tevNew') tevModal(null, S.tevTO);
  else if (a === 'tevDel'){ busy(t, act('deleteTEV', { id: t.dataset.id }, 'TEV deleted').then(closeModal), 'merr'); }
  else if (a === 'syncHol') busy(t, act('syncHolidays', {}, function(r){ return r && r.added ? r.added + ' holiday' + (r.added === 1 ? '' : 's') + ' added' : 'Holidays are up to date'; }));
  else if (a === 'toPrint'){ var to = toOf(t.dataset.id); if (to) printTO(to, t); }
  else if (a === 'pickTO' || a === 'pickCapitol'){
    var form = t.closest('form'), fe = form.querySelector('#fe'), fv = form.querySelector('#fv'), fd = form.querySelector('#fd');
    if (a === 'pickTO'){
      var x = toOf(t.dataset.id); if (!x) return;
      fd.value = x.dateFrom > today() ? today() : x.dateFrom; form.querySelector('#c3').checked = true;
      fe.value = x.event; fv.value = x.destination || '';
      var sel = form.querySelector('#fto'); sel.dataset.cur = x.id; sel.value = '';
      checkEarnForm(form, false); sel.value = x.id;
    } else {
      fv.value = CAPITOL; var cat = form.querySelector('input[name=category]:checked');
      if (cat && cat.value === 'Travel order') form.querySelector('#c1').checked = true;
      checkEarnForm(form, false); var nt = form.querySelector('#chkNoTO input'); if (nt) nt.checked = true;
      fe.focus();
    }
    form.querySelectorAll('.pick').forEach(function(b){ b.classList.toggle('on', b === t); });
  }
});
document.addEventListener('change', function(ev){
  var c = ev.target;
  if (c.dataset && c.dataset.cov){ var i = c.parentElement.querySelector('input[type=number]'); i.disabled = !c.checked; if (c.checked) i.focus(); else i.value = ''; tevTotal(); }
  else if (c.id === 'vto') tevNames();
  else if (c.id === 'fu' && document.getElementById('pickWrap')) document.getElementById('pickWrap').innerHTML = toPicks(c.value);
});
document.addEventListener('input', function(ev){ if (ev.target.closest && ev.target.closest('.cover')) tevTotal(); });
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form="tev"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  var d = {}; new FormData(f).forEach(function(v, k){ if (typeof v === 'string') d[k] = v; });
  COVER.forEach(function(c){ d[c[0]] = Number(d[c[0]]) || 0; });
  var err = document.getElementById('merr'); if (err) err.textContent = '';
  if (!M.id && !d.name) return bad('merr', 'Everyone on this travel order already has a TEV.');
  if (d.status === 'Claimed' && !COVER.some(function(c){ return d[c[0]] > 0; })) return bad('merr', 'Enter at least one amount before marking it claimed.');
  if (d.releasedOn && d.submittedOn && d.releasedOn < d.submittedOn) return bad('merr', 'The release date is before the submission date.');
  var total = Math.round(COVER.reduce(function(n, c){ return n + d[c[0]]; }, 0) * 100) / 100, td = today();
  var fields = { status: d.status, transpo: d.transpo, food: d.food, lodging: d.lodging, other: d.other, total: total, chequeNo: d.chequeNo || '', note: d.note || '',
                 submittedOn: d.submittedOn || (d.status !== 'To prepare' ? td : ''), releasedOn: d.releasedOn || (d.status === 'Claimed' ? td : ''), _saving: true };
  if (M.id){ d.id = M.id; return bg('saveTEV', d, { arr: 'tevs', id: M.id, patch: fields }, 'TEV saved', 'The TEV for ' + ((S.tevs || []).filter(function(v){ return v.id === M.id; })[0] || {}).name); }
  var u = S.users.filter(function(x){ return x.name.toUpperCase() === d.name; })[0], id = tmpId();
  return bg('saveTEV', d, { arr: 'tevs', item: Object.assign({ id: id, toId: d.toId, name: d.name, username: u ? u.username : '' }, fields) }, 'TEV added', 'The TEV for ' + d.name, id);
}, true);

/* =====================================================================
   PIO Overwatch: TEV worksheet (rates, day by day), printable TEV forms,
   and drag-to-reorder for the dashboard
   ===================================================================== */
var TEV_DEF = {
  bicol: { daily: 1500, transpo: 1000 },                // within Bicol Region
  outside: { daily: 2200, transpo: 2000 },              // outside Bicol Region
  province: { meals: 450, inc: 300 },                   // within Camarines Norte: no lodging; incidental only 50 km or more from the Capitol
  split: { lodging: 50, meals: 30, inc: 20 },           // share of the daily rate
  sign: {
    pio: ['SARAH MARIE P. AVIADO, DPA', 'Provincial Information Officer'], gov: ['HON. RICARTE R. PADILLA', 'Governor'],
    payroll: ['HON. RICARTE R. PADILLA', 'Governor'], acct: ['IMELDA M. FLORES, CPA', 'Provincial Accountant'],
    treas: ['DANTE E. MANLAPAZ', 'Provincial Treasurer'], budget: ['MERCEDES M. ALFUERTE, CPA', 'Provincial Budget Officer']
  },
  codes: { rc: '1121', fpp: '1120-004-1-02-004-001-008', acct: '5 02 01 010', agency: 'PROVINCIAL GOVERNORS OFFICE/ PIO', office: 'Provincial Information Office (PIO)/Radyo Pilipinas',
           address: 'PIO, Daet Camarines Norte', station: 'Provincial Information Office /Radio Pilipinas, PGCN, Daet, Camarines Norte' }
};
var SCOPES = [['province', 'Within the province', 'No lodging'], ['bicol', 'Within Bicol', '₱1,500 a day'], ['outside', 'Outside Bicol', '₱2,200 a day']];
COVER[2][1] = 'Accommodation'; COVER[3][1] = 'Incidental';
function deepMerge(a, b){ var o = JSON.parse(JSON.stringify(a)); Object.keys(b || {}).forEach(function(k){ o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && o[k] && typeof o[k] === 'object' ? deepMerge(o[k], b[k]) : b[k]; }); return o; }
function tevCfg(){ return deepMerge(TEV_DEF, (S.settings && S.settings.tev) || {}); }
function tripOf(t){ return Object.assign({ scope: '', far: false, gov: false, dep: '', arr: '' }, (t && t.trip) || {}); }
function r2(n){ return Math.round(n * 100) / 100; }
function tevRates(scope){
  var c = tevCfg(), sp = c.split;
  if (scope === 'province') return { lodge: 0, meal: r2(c.province.meals / 3), inc: c.province.inc, transMax: c.bicol.transpo, daily: c.province.meals + c.province.inc };
  var d = scope === 'outside' ? c.outside.daily : c.bicol.daily;
  return { lodge: r2(d * sp.lodging / 100), meal: r2(d * sp.meals / 100 / 3), inc: r2(d * sp.inc / 100), transMax: scope === 'outside' ? c.outside.transpo : c.bicol.transpo, daily: d };
}
function tevUser(v){ return S.users.filter(function(u){ return u.username === v.username || u.name.toUpperCase() === v.name; })[0] || null; }
/* COS cannot claim a TEV; JO cannot claim incidental. */
function tevRule(v){ var u = tevUser(v), et = u ? u.empType : ''; return { et: et, none: et === 'COS', noInc: et === 'JO', pos: (u && u.position) || '' }; }
function tripDates(t){ var a = []; for (var d = t.dateFrom; d <= (t.dateTo || t.dateFrom); d = addDays(d, 1)){ a.push(d); if (a.length > 60) break; } return a; }
/* Noon rule: leaving before 12:00 NN counts the departure day. The return day has meals and incidental, no lodging. */
function defaultDays(t, v){
  var tr = tripOf(t), ru = tevRule(v), ds = tripDates(t), multi = ds.length > 1, prov = tr.scope === 'province';
  return ds.map(function(d, i){
    var first = i === 0, last = i === ds.length - 1, on = !(multi && first && tr.dep && tr.dep >= '12:00');
    return { date: d, b: on, l: on, d: on, lodge: on && !last && !prov, inc: on && !ru.noInc && (!prov || tr.far) };
  });
}
function tevCalc(t, v, days, trip, transpo){
  var tr = trip || tripOf(t), ru = tevRule(v), rt = tevRates(tr.scope || 'bicol'), ds = tripDates(t), prov = tr.scope === 'province';
  var saved = days || v.days, use = saved && saved.length === ds.length && saved.every(function(x, i){ return x.date === ds[i]; }) ? saved : defaultDays(Object.assign({}, t, { trip: tr }), v);
  var out = { rt: rt, trip: tr, rule: ru, rows: [], lodging: 0, food: 0, other: 0, meals: 0, nights: 0, incDays: 0 };
  use.forEach(function(x){
    var meals = (x.b ? 1 : 0) + (x.l ? 1 : 0) + (x.d ? 1 : 0), lodge = x.lodge && !prov, inc = x.inc && !ru.noInc && (!prov || tr.far);
    var row = { date: x.date, b: x.b, l: x.l, d: x.d, lodge: lodge, inc: inc, meals: meals, amt: r2(meals * rt.meal + (lodge ? rt.lodge : 0) + (inc ? rt.inc : 0)) };
    out.rows.push(row); out.meals += meals; out.nights += lodge ? 1 : 0; out.incDays += inc ? 1 : 0;
    out.food += meals * rt.meal; out.lodging += lodge ? rt.lodge : 0; out.other += inc ? rt.inc : 0;
  });
  var tp = transpo != null ? transpo : (v.transpo || 0);
  out.transpo = tr.gov ? 0 : Math.min(Number(tp) || 0, rt.transMax);
  out.food = r2(out.food); out.lodging = r2(out.lodging); out.other = r2(out.other);
  if (ru.none){ out.food = out.lodging = out.other = out.transpo = 0; out.rows.forEach(function(x){ x.amt = 0; }); }
  out.total = r2(out.food + out.lodging + out.other + out.transpo);
  return out;
}

/* ---------- the worksheet ---------- */
var TV = null;
var oldTevModal = tevModal;
tevModal = function(id, toId){ if (!id) return oldTevModal(null, toId); return tevSheet(id); };
function tevSheet(id){
  var v = (S.tevs || []).filter(function(x){ return x.id === id; })[0]; if (!v) return;
  var t = toOf(v.toId); if (!t) return oldTevModal(id);
  var c = tevCalc(t, v);
  TV = { id: id, toId: t.id, trip: c.trip, days: c.rows.map(function(x){ return { date: x.date, b: x.b, l: x.l, d: x.d, lodge: x.lodge, inc: x.inc }; }), transpo: v.transpo || 0 };
  M = { id: id };
  var ru = c.rule;
  modal('TEV · ' + esc(v.name),
    '<div class="sumbox"><b>' + esc(t.event) + '</b><span>' + esc(t.destination || '') + ' · ' + fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric', year:'numeric' }) + (ru.et ? ' · ' + esc(ru.et) : '') + '</span></div>' +
    (ru.none ? '<div class="warn-note" style="background:var(--red-soft);color:var(--red)">' + ic('x') + '<span>COS workers cannot claim a TEV. Delete this one, or change the employment type in Staff if it is wrong.</span></div>' : '') +
    (ru.noInc ? '<div class="info-note">' + ic('shield') + '<span>Job order: incidental expenses are not claimable.</span></div>' : '') +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Where <span class="hint">(applies to everyone on this travel order)</span></legend><div class="seg">' +
      SCOPES.map(function(s, i){ var cf = tevCfg(); if (s[0] === 'bicol') s = [s[0], s[1], peso(cf.bicol.daily).replace('.00', '') + ' a day']; if (s[0] === 'outside') s = [s[0], s[1], peso(cf.outside.daily).replace('.00', '') + ' a day']; return '<input type="radio" name="scope" id="sc' + i + '" value="' + s[0] + '"' + (c.trip.scope === s[0] ? ' checked' : '') + '><label for="sc' + i + '"><b>' + s[1] + '</b><small>' + s[2] + '</small></label>'; }).join('') + '</div></fieldset>' +
    '<div class="two"><label class="keep" id="farWrap"><input type="checkbox" id="tFar"' + (c.trip.far ? ' checked' : '') + '> 50 km or more from the Capitol</label><label class="keep"><input type="checkbox" id="tGov"' + (c.trip.gov ? ' checked' : '') + '> Government vehicle (no transportation claim)</label></div>' +
    '<div class="two"><div class="field"><label for="tDep">Departure time</label><input class="input" type="time" id="tDep" value="' + esc(c.trip.dep) + '"><span class="hint">Leaving 12:00 NN or later: the first day is not claimed.</span></div><div class="field"><label for="tArr">Arrival back at the station</label><input class="input" type="time" id="tArr" value="' + esc(c.trip.arr) + '"></div></div>' +
    '<div class="label" style="display:flex;justify-content:space-between;align-items:center">Day by day <button type="button" class="btn btn-sm btn-ghost" data-act="tevRules">' + ic('refresh') + 'Reset to the rules</button></div>' +
    '<div class="table-wrap"><table class="tev-days"><thead><tr><th>Date</th><th class="c">B</th><th class="c">L</th><th class="c">D</th><th class="c">Lodging</th><th class="c">Incid.</th><th class="r">Amount</th></tr></thead><tbody id="tvDays"></tbody></table></div>' +
    '<p class="hint" style="margin:0">Untick meals the host provided. B, L, D = breakfast, lunch, dinner.</p>' +
    '<div class="field"><label for="tTr">Transportation (private or public vehicle)</label><input class="input num" type="number" min="0" step="0.01" id="tTr" value="' + (v.transpo || '') + '" placeholder="0.00"><span class="hint" id="tTrHint"></span></div>' +
    '<div class="tev-sum" id="tvSum"></div>' +
    '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Status</legend><div class="seg">' +
      Object.keys(TEV_ST).map(function(k, i){ return '<input type="radio" name="status" id="vs' + i + '" value="' + k + '"' + (v.status === k ? ' checked' : '') + '><label for="vs' + i + '"><b>' + k + '</b><small>' + TEV_ST[k][2] + '</small></label>'; }).join('') + '</div></fieldset>' +
    '<div class="two"><div class="field"><label for="vsub">Submitted on</label><input class="input" id="vsub" name="submittedOn" type="date" value="' + esc(v.submittedOn || '') + '"></div><div class="field"><label for="vrel">Cheque released on</label><input class="input" id="vrel" name="releasedOn" type="date" value="' + esc(v.releasedOn || '') + '"></div></div>' +
    '<div class="two"><div class="field"><label for="vchq">Cheque no. <span class="hint">(optional)</span></label><input class="input" id="vchq" name="chequeNo" maxlength="40" value="' + esc(v.chequeNo || '') + '"></div><div class="field"><label for="vnote">Note <span class="hint">(optional)</span></label><input class="input" id="vnote" name="note" maxlength="200" value="' + esc(v.note || '') + '"></div></div>',
    '<button type="button" class="btn btn-ghost" data-act="tevDel" data-id="' + id + '" style="margin-right:auto;color:var(--red)">' + ic('trash') + 'Delete</button>' +
    '<button type="button" class="btn btn-ghost" data-act="tevPrint" data-to="' + t.id + '">' + ic('print') + 'Print</button><button class="btn btn-primary" type="submit">Save TEV</button>', 'tev2');
  drawSheet();
}
function readTrip(){
  var sc = document.querySelector('#modal input[name=scope]:checked');
  TV.trip = { scope: sc ? sc.value : '', far: document.getElementById('tFar').checked, gov: document.getElementById('tGov').checked, dep: document.getElementById('tDep').value, arr: document.getElementById('tArr').value };
}
function drawSheet(){
  var v = (S.tevs || []).filter(function(x){ return x.id === TV.id; })[0], t = toOf(TV.toId);
  TV.transpo = Number(document.getElementById('tTr').value) || 0;
  var c = tevCalc(t, v, TV.days, TV.trip, TV.transpo), prov = TV.trip.scope === 'province';
  document.getElementById('farWrap').hidden = !prov;
  var tr = document.getElementById('tTr'); tr.disabled = TV.trip.gov;
  document.getElementById('tTrHint').textContent = TV.trip.gov ? 'Transportation provided by the government: no claim.' : 'Up to ' + peso(c.rt.transMax) + (TV.transpo > c.rt.transMax ? '. Only ' + peso(c.rt.transMax) + ' will be claimed.' : '.');
  function box(i, k, dis){ return '<td class="c"><input type="checkbox" data-day="' + i + '" data-k="' + k + '"' + (TV.days[i][k] && !dis ? ' checked' : '') + (dis ? ' disabled' : '') + ' aria-label="' + k + ' ' + TV.days[i].date + '"></td>'; }
  document.getElementById('tvDays').innerHTML = c.rows.map(function(x, i){
    return '<tr><td class="num">' + fDate(x.date, { month:'short', day:'numeric' }) + '<span class="hint" style="display:block">' + fDate(x.date, { weekday:'short' }) + '</span></td>' + box(i, 'b') + box(i, 'l') + box(i, 'd') + box(i, 'lodge', prov) + box(i, 'inc', c.rule.noInc || (prov && !TV.trip.far)) + '<td class="r num">' + (x.amt ? x.amt.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—') + '</td></tr>';
  }).join('');
  document.getElementById('tvSum').innerHTML = (!TV.trip.scope ? '<div class="warn-note">' + ic('flag') + '<span>Pick where the travel is to compute the rates.</span></div>' : '') +
    '<div class="mini-tiles"><div><span>Accommodation · ' + c.nights + ' night' + (c.nights === 1 ? '' : 's') + '</span><b>' + peso(c.lodging) + '</b></div><div><span>Meals · ' + c.meals + ' × ' + peso(c.rt.meal) + '</span><b>' + peso(c.food) + '</b></div>' +
    '<div><span>Incidental · ' + c.incDays + ' day' + (c.incDays === 1 ? '' : 's') + '</span><b>' + peso(c.other) + '</b></div><div><span>Transportation</span><b>' + peso(c.transpo) + '</b></div></div>' +
    '<div class="tev-total"><span>Total</span><b class="num">' + peso(c.total) + '</b></div>';
  TV.calc = c;
}
document.addEventListener('change', function(ev){
  if (!TV || !document.getElementById('tvDays')) return;
  var el = ev.target;
  if (el.dataset && el.dataset.day != null && el.dataset.k){ TV.days[+el.dataset.day][el.dataset.k] = el.checked; drawSheet(); return; }
  if (el.name === 'scope' || el.id === 'tFar' || el.id === 'tGov' || el.id === 'tDep' || el.id === 'tArr'){
    var oldScope = TV.trip.scope, oldDep = TV.trip.dep; readTrip();
    if (el.name === 'scope' || el.id === 'tDep' || el.id === 'tFar' && oldScope === 'province'){ var t = toOf(TV.toId), v = (S.tevs || []).filter(function(x){ return x.id === TV.id; })[0]; TV.days = defaultDays(Object.assign({}, t, { trip: TV.trip }), v); }
    drawSheet();
  }
});
document.addEventListener('input', function(ev){ if (TV && ev.target.id === 'tTr') drawSheet(); });
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  if (t.dataset.act === 'tevRules' && TV){ var to = toOf(TV.toId), v = (S.tevs || []).filter(function(x){ return x.id === TV.id; })[0]; readTrip(); TV.days = defaultDays(Object.assign({}, to, { trip: TV.trip }), v); drawSheet(); }
});
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form="tev2"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  readTrip(); drawSheet();
  var c = TV.calc, st = (f.querySelector('input[name=status]:checked') || {}).value || 'To prepare', td = today();
  var sub = f.querySelector('#vsub').value, rel = f.querySelector('#vrel').value;
  if (!TV.trip.scope) return bad('merr', 'Pick where the travel is (within the province, within Bicol or outside Bicol).');
  if (c.rule.none) return bad('merr', 'COS workers cannot claim a TEV.');
  if (st === 'Claimed' && !c.total) return bad('merr', 'Nothing to claim yet. Check the days and transportation.');
  if (rel && sub && rel < sub) return bad('merr', 'The release date is before the submission date.');
  var p = { id: TV.id, toId0: TV.toId, status: st, transpo: c.transpo, food: c.food, lodging: c.lodging, other: c.other, chequeNo: f.querySelector('#vchq').value, note: f.querySelector('#vnote').value,
            submittedOn: sub, releasedOn: rel, days: TV.days, trip: TV.trip };
  var to = toOf(TV.toId); if (to) to.trip = TV.trip;
  bg('saveTEV', p, { arr: 'tevs', id: TV.id, patch: { status: st, transpo: c.transpo, food: c.food, lodging: c.lodging, other: c.other, total: c.total, days: TV.days, submittedOn: sub || (st !== 'To prepare' ? td : ''), releasedOn: rel || (st === 'Claimed' ? td : '') } },
     'TEV saved', 'The TEV for ' + (((S.tevs || []).filter(function(x){ return x.id === TV.id; })[0]) || {}).name);
}, true);

/* ---------- amount in words ---------- */
function pesoWords(n){
  var ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'],
      tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  function h(x){ var s = []; if (x >= 100){ s.push(ones[Math.floor(x / 100)] + ' HUNDRED'); x %= 100; } if (x >= 20){ s.push(tens[Math.floor(x / 10)] + (x % 10 ? '-' + ones[x % 10] : '')); } else if (x) s.push(ones[x]); return s.join(' '); }
  var whole = Math.floor(n + 1e-9), cents = Math.round((n - whole) * 100), parts = [];
  [[1e9, 'BILLION'], [1e6, 'MILLION'], [1e3, 'THOUSAND'], [1, '']].forEach(function(u){ var q = Math.floor(whole / u[0]); if (q){ parts.push(h(q) + (u[1] ? ' ' + u[1] : '')); whole -= q * u[0]; } });
  return (parts.join(' ') || 'ZERO') + ' PESOS' + (cents ? ' AND ' + (cents < 10 ? '0' : '') + cents + '/100' : '');
}

/* ---------- printable TEV forms ---------- */
var TEV_FORMS = [['itin', 'Itinerary of Travel', 'One page per person'], ['payroll', 'Payroll', 'Prints by itself on long bond paper (8.5 × 13 in)'], ['dv', 'Disbursement Voucher', 'Amount in words filled in'],
                 ['or', 'Obligation Request', ''], ['cert', 'Certificate of Travel Completed', 'One page per person'], ['jocert', 'Certification for Job Order staff', 'One page for all JO staff picked below']];
function tevPrintDialog(toId){
  var t = toOf(toId); if (!t) return;
  var list = (S.tevs || []).filter(function(v){ return v.toId === toId && !tevRule(v).none; });
  if (!list.length) return toast('No TEVs to print for this travel order.');
  M = { printTo: toId };
  var jo = list.filter(function(v){ return tevRule(v).et === 'JO'; });
  modal('Print TEV forms', '<div class="sumbox"><b>' + esc(t.event) + '</b><span>' + esc(t.destination || '') + ' · ' + fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric', year:'numeric' }) + '</span></div>' +
    (tripOf(t).scope ? '' : '<div class="warn-note">' + ic('flag') + '<span>Open a TEV and pick where the travel is first, so the amounts are right.</span></div>') +
    '<div class="label">Forms (printed in this order)</div><div class="wlist">' + TEV_FORMS.filter(function(f){ return f[0] !== 'jocert' || jo.length; }).map(function(f){ return '<label class="check" style="padding:10px 12px"><input type="checkbox" data-form-pick="' + f[0] + '" checked><span><b>' + f[1] + '</b>' + (f[2] ? '<br><span class="hint">' + f[2] + '</span>' : '') + '</span></label>'; }).join('') + '</div>' +
    '<div class="label">People</div><div class="wlist">' + list.map(function(v){ return '<label class="check" style="padding:10px 12px"><input type="checkbox" data-person-pick="' + v.id + '" checked><span><b>' + esc(v.name) + '</b><br><span class="hint">' + peso(tevCalc(t, v).total) + '</span></span></label>'; }).join('') + '</div>' +
    (jo.length === 1 ? '<div class="field"><label for="pPron">Job Order certification says</label><select class="input" id="pPron"><option value="he">he is allowed…</option><option value="she">she is allowed…</option></select></div>' : '') +
    '<div class="two"><div class="field"><label for="pDate">Date on the itinerary</label><input class="input" type="date" id="pDate" value="' + esc(t.datePrepared || today()) + '"></div><div class="field"><label for="pCert">Date of the certificate</label><input class="input" type="date" id="pCert" value="' + esc(addDays(t.dateTo || t.dateFrom, 3)) + '"></div></div>',
    '<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button type="button" class="btn btn-primary" data-act="tevPrintGo">' + ic('print') + 'Print</button>');
}
function tevDocHtml(t, people, forms, dPrep, dCert){
  var cfg = tevCfg(), sg = cfg.sign, cd = cfg.codes, tr = tripOf(t), dest = t.destination || '';
  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var ABB = ['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  function E(x){ return esc(x == null ? '' : x); }
  function money(n){ return n ? (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }
  function ymdParts(d){ return { y: +d.slice(0, 4), m: +d.slice(5, 7) - 1, d: +d.slice(8, 10) }; }
  // "September 22-25, 2026", "Sept. 23-25, 2026", "September 30-October 2, 2026"
  function rng(a, b, short){
    var M = short ? ABB : MON, x = ymdParts(a), y = ymdParts(b || a);
    if (a === (b || a)) return M[x.m] + ' ' + x.d + ', ' + x.y;
    if (x.y === y.y && x.m === y.m) return M[x.m] + ' ' + x.d + '-' + y.d + ', ' + x.y;
    if (x.y === y.y) return M[x.m] + ' ' + x.d + '-' + M[y.m] + ' ' + y.d + ', ' + x.y;
    return M[x.m] + ' ' + x.d + ', ' + x.y + '-' + M[y.m] + ' ' + y.d + ', ' + y.y;
  }
  function day(d){ return rng(d, d); }
  function tm(x){ if (!x) return ''; var h = +x.slice(0, 2), m = x.slice(3); return (h % 12 || 12) + ':' + m + (h < 12 ? ' am' : 'pm'); }
  var calcs = people.map(function(v){ return { v: v, c: tevCalc(t, v), r: tevRule(v) }; });
  var sum = { transpo: 0, lodging: 0, food: 0, other: 0, total: 0 };
  calcs.forEach(function(x){ ['transpo','lodging','food','other','total'].forEach(function(k){ sum[k] += x.c[k]; }); });
  var period = rng(t.dateFrom, t.dateTo || t.dateFrom), purpose = String(t.event || '').replace(/[.\s]+$/, '') + (dest ? ' at ' + dest : '') + '.';
  var payee = calcs.length === 1 ? calcs[0].v.name : calcs[0].v.name + ' AND ' + (calcs.length - 1) + ' OTHER' + (calcs.length > 2 ? 'S' : '');
  var hd = '<div class="hd"><div>Republic of the Philippines</div><div>PROVINCE OF CAMARINES NORTE</div><div class="sp">D a e t</div><div class="off">PROVINCIAL INFORMATION OFFICE</div></div>';
  function sig(s, cls){ return '<div class="sig ' + (cls || '') + '"><b>' + E(s[0]) + '</b><span>' + E(s[1]) + '</span></div>'; }
  var html = '';

  /* ---- Itinerary of Travel (one per person) ---- */
  if (forms.itin) calcs.forEach(function(x){
    var c = x.c, rows = c.rows, n = rows.length, lines = [];
    if (n === 1) lines.push({ d: rng(rows[0].date, rows[0].date, true), p: 'Station to ' + dest + ' and back', dep: tr.dep, arr: tr.arr, amt: rows[0].amt });
    else {
      // like the office forms: departure day, then the rest of the days together, then the trip back
      lines.push({ d: rng(rows[0].date, rows[0].date, true), p: 'Station to ' + dest, dep: tr.dep, amt: rows[0].amt });
      lines.push({ d: rng(rows[1].date, rows[n - 1].date, true), p: dest, amt: rows.slice(1).reduce(function(s, r){ return s + r.amt; }, 0) });
      lines.push({ d: rng(rows[n - 1].date, rows[n - 1].date, true), p: dest + ' to Station', arr: tr.arr, amt: null });
    }
    var per = rows.reduce(function(s, r){ return s + r.amt; }, 0);
    html += '<section class="pg it">' + hd +
      '<div class="no"><div>No.<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div><div>Date: &nbsp;&nbsp;&nbsp;' + E(day(dPrep)) + '</div></div><h1>ITINERARY OF TRAVEL</h1>' +
      '<table class="kv"><tr><td class="k">Name</td><td class="c1">:</td><td><b>' + E(x.v.name) + '</b></td><td class="sal">Monthly Salary: &nbsp;Php</td></tr>' +
      '<tr><td class="k">Position</td><td class="c1">:</td><td colspan="2">' + E(x.r.pos || x.r.et) + '</td></tr>' +
      '<tr><td colspan="4">Official Station &nbsp;: &nbsp;' + E(cd.station) + '</td></tr></table>' +
      '<p class="purp"><i>Purpose: ' + E(purpose) + '</i></p>' +
      '<table class="itin"><thead><tr><th rowspan="2" class="bt">Date</th><th rowspan="2">Places<br>to be visited</th><th colspan="2">T i m e</th><th rowspan="2">Means of<br>Transportation</th><th colspan="2">Allowable Expenses</th><th rowspan="2">Total</th></tr>' +
      '<tr><th>Departure</th><th>Arrival</th><th>Trans<br>Allow</th><th>Per<br>Diems</th></tr></thead><tbody><tr class="bodyrow">' +
      '<td>' + lines.map(function(l){ return '<div class="ln">' + E(l.d) + '</div>'; }).join('') + '</td>' +
      '<td class="c">' + lines.map(function(l){ return '<div class="ln">' + E(l.p) + '</div>'; }).join('') + '</td>' +
      '<td class="c">' + lines.map(function(l){ return '<div class="ln">' + E(tm(l.dep)) + '</div>'; }).join('') + '</td>' +
      '<td class="c">' + lines.map(function(l){ return '<div class="ln">' + E(tm(l.arr)) + '</div>'; }).join('') + '</td>' +
      '<td class="c mid"><div class="ln">&nbsp;</div><div>' + E(tr.gov ? 'Government Vehicle' : 'Public/Private Vehicle') + '</div></td>' +
      '<td class="r">' + lines.map(function(l, i){ return '<div class="ln">' + (i === 0 && c.transpo ? money(c.transpo) : '') + '</div>'; }).join('') + '</td>' +
      '<td class="r">' + lines.map(function(l){ return '<div class="ln">' + (l.amt ? money(l.amt) : '') + '</div>'; }).join('') + '</td>' +
      '<td class="r">' + lines.map(function(l, i){ var v = (l.amt || 0) + (i === 0 ? c.transpo : 0); return '<div class="ln">' + (v ? money(v) : '') + '</div>'; }).join('') + '</td></tr>' +
      '<tr class="tot"><td></td><td><b>TOTALS</b></td><td></td><td></td><td></td><td class="r">' + money(c.transpo) + '</td><td class="r">' + money(per) + '</td><td class="r"><u class="dbl">' + money(c.total) + '</u></td></tr></tbody></table>' +
      '<div class="it-foot"><div class="cert">I certify that 1) I have reviewed the<br>the foregoing itinerary. 2) the travel<br>is necessary to the service. 3) the<br>period covered is reasonable and<br>4) the expense are proper.</div>' +
      '<div class="prep"><div class="lab">Prepared by:</div>' + sig([x.v.name, 'Employee'], 'ul') + '<div class="lab ap">Approved by:</div></div></div>' +
      '<div class="it-sigs">' + sig(sg.pio, 'ov') + sig(sg.gov, 'ov') + '</div></section>';
  });

  /* ---- Payroll (A4 landscape, everyone on the travel order) ---- */
  if (forms.payroll) html += '<section class="pg land"><div class="pr">' +
    '<div class="pr-top"><div class="pr-t">PAYROLL</div><div class="pr-per"><i>Period:</i> &nbsp;<b>' + E(period.toUpperCase()) + '</b></div></div>' +
    '<div class="pr-ag"><b>Agency:</b> &nbsp;<u>' + E(cd.agency) + '</u><div class="rev"><i>Revised January 1992</i></div></div>' +
    '<p class="purp"><i>Purpose: ' + E(purpose) + '</i></p>' +
    '<table class="pay"><thead><tr><th rowspan="2" style="width:3%">No.</th><th rowspan="2" style="width:17%">NAME</th><th rowspan="2" style="width:12%">OCCUPATION</th><th rowspan="2" style="width:5%">No. of<br>Days</th><th colspan="4">Allowable Expenses</th><th colspan="2">Philhealth</th><th colspan="2">PAG-IBIG</th><th rowspan="2" style="width:7%">NET PAY</th><th rowspan="2" style="width:3%">No.</th><th rowspan="2" style="width:7%">Signature<br>/thumbmark</th><th rowspan="2" style="width:5%">CTC<br>NUMBER</th><th rowspan="2" style="width:5%">Issued At</th><th rowspan="2" style="width:6%">Issued on</th></tr>' +
    '<tr><th>Trans</th><th>Lodging</th><th>Meal</th><th>Incidental</th><th class="xs">Gov’t Share</th><th class="xs">Personal Share</th><th class="xs">Gov’t Share</th><th class="xs">Personal Share</th></tr></thead><tbody>' +
    calcs.map(function(x, i){ return '<tr><td class="c">' + (i + 1) + '</td><td>' + E(x.v.name) + '</td><td class="c">' + E(x.r.pos || x.r.et) + '</td><td class="c">' + x.c.rows.length + '</td><td class="r">' + (x.c.transpo ? money(x.c.transpo) : '') + '</td><td class="r">' + (x.c.lodging ? money(x.c.lodging) : '') + '</td><td class="r">' + money(x.c.food) + '</td><td class="r">' + (x.c.other ? money(x.c.other) : '') + '</td><td></td><td></td><td></td><td></td><td class="r"><b>' + money(x.c.total) + '</b></td><td class="c">' + (i + 1) + '</td><td></td><td></td><td></td><td></td></tr>'; }).join('') +
    '<tr><td></td><td><b>TOTAL</b></td><td></td><td></td><td class="r">' + (sum.transpo ? money(sum.transpo) : '') + '</td><td class="r">' + (sum.lodging ? money(sum.lodging) : '-') + '</td><td class="r"><b>' + money(sum.food) + '</b></td><td class="r"><b>' + (sum.other ? money(sum.other) : '') + '</b></td><td></td><td></td><td></td><td></td><td class="r"><u class="dbl">' + money(sum.total) + '</u></td><td colspan="5"></td></tr></tbody></table>' +
    '<table class="pay-foot"><tr><td style="width:46%"><div class="xs">CERTIFIED:</div><div class="xs ind">Each person whose name appears on this roll had<br>rendered service for the time stated</div>' + sig(sg.pio, 'ul') + '</td>' +
    '<td style="width:27%"><div class="xs">APPROVED PLANTILLA</div>' + sig(sg.payroll, 'ul') + '</td>' +
    '<td><div class="xs">CERTIFIED:</div><div class="xs">Each person whose name appears on the above payroll has been paid the amount stated opposite his name after identifying Him.</div><div class="dis">Name and signature of Disbursing officer</div></td></tr></table></div></section>';

  /* ---- Disbursement Voucher ---- */
  var one = calcs.length === 1 ? calcs[0].c : null;
  if (forms.dv) html += '<section class="pg dvp"><table class="box dv">' +
    '<tr><td colspan="4" class="c hd2">Republic of the Philippines<br><span class="big">PROVINCE OF CAMARINES NORTE</span></td></tr>' +
    '<tr class="h"><td colspan="3" class="title">DISBURSEMENT VOUCHER</td><td class="sm">No.<br>Date:</td></tr>' +
    '<tr><td class="lbl">Mode of Payment</td><td colspan="3" class="mop"><span class="bx">X</span> Check <span class="bx gap"></span> Cash <span class="bx gap"></span> Others</td></tr>' +
    '<tr><td class="lbl">Payee</td><td class="b">' + E(payee) + '</td><td class="c sm2">TIN/Employee No.</td><td class="c sm2">Obligation Request<br>No.</td></tr>' +
    '<tr><td class="lbl" rowspan="2">Address</td><td class="b" rowspan="2">' + E(cd.address) + '</td><td colspan="2" class="c sm2">Responsibility Center</td></tr>' +
    '<tr><td class="c sm2">Office/Unit/Project<br><b>PIO</b></td><td class="c sm2">Code<br><b>' + E(cd.rc) + '</b></td></tr>' +
    '<tr><td colspan="3" class="c b">EXPLANATION</td><td class="c b">AMOUNT</td></tr>' +
    '<tr class="tallx"><td colspan="3" class="exp">TO PAYMENT for the above named Payee' + (calcs.length > 1 ? 's' : '') + ' for the reimbursement of ' + (calcs.length > 1 ? 'their' : 'his/her') + ' Travelling Expenses incurred on <b>' + E(period) + '</b> at <b>' + E(dest) + '</b> as per supporting papers hereto attached &nbsp;amounting to<br><b>' + E(pesoWords(sum.total)) + ' only………</b>' +
      (one ? '<table class="allow"><tr><td colspan="3"><b>ALLOWABLE ALLOWANCES</b></td></tr><tr><td>Trans</td><td class="r">' + money(one.transpo) + '</td><td>(to ' + E(dest) + ')</td></tr><tr><td>Lodging</td><td class="r">' + money(one.lodging) + '</td><td>(' + one.nights + ' night' + (one.nights === 1 ? '' : 's') + ')</td></tr><tr><td>Meal</td><td class="r">' + money(one.food) + '</td><td>(' + money(one.rt.meal) + '/meal X ' + one.meals + ')</td></tr><tr><td>Incidental</td><td class="r">' + money(one.other) + '</td><td>(' + money(one.rt.inc) + '/day X ' + one.incDays + ' days)</td></tr><tr><td><b>TOTAL:</b></td><td class="r"><b>' + money(one.total) + '</b></td><td></td></tr></table>' : '') +
    '</td><td class="r top amt">' + money(sum.total) + '</td></tr>' +
    '<tr><td colspan="3" class="r">Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td class="r b">' + money(sum.total) + '</td></tr>' +
    '<tr><td colspan="2" class="cA"><i>A. Certified</i><div class="ck"><span class="bx"></span>Allotment obligated for the purpose<br>as indicated above</div><div class="ck"><span class="bx tall"></span>Supporting documents complete</div></td><td colspan="2" class="cA"><i>B. Certified</i><div class="c fa">Funds Available</div></td></tr>' +
    '<tr class="sigrow"><td colspan="2" class="c">' + sig(sg.acct, 'ul') + '</td><td colspan="2" class="c">' + sig(sg.treas) + '</td></tr>' +
    '<tr><td colspan="2" class="dt">Date</td><td colspan="2" class="dt">Date</td></tr>' +
    '<tr><td colspan="2" class="cC"><i>C. Approved for Payment</i><div class="gsig">' + sig(sg.gov) + '</div></td><td colspan="2" class="cD"><i>D. Received Payment</i>' +
      '<table class="rp"><tr><td style="width:28%">Check No.</td><td>Bank Name</td><td style="width:30%">Date</td></tr><tr><td colspan="3">Signature</td></tr><tr><td colspan="3">Printed Name<br><span style="margin-left:28%">Date</span></td></tr><tr><td colspan="2" class="c">OR/Other Documents</td><td>JEV No. &nbsp;&nbsp;Date</td></tr></table></td></tr></table></section>';

  /* ---- Obligation Request ---- */
  if (forms.or) html += '<section class="pg dvp"><table class="box orq">' +
    '<tr><td colspan="5" class="c hd2"><b class="xs2">Republic of the Philippines</b><br><span class="big b">PROVINCE OF CAMARINES NORTE</span></td></tr>' +
    '<tr class="h"><td colspan="4" class="title">OBLIGATION REQUEST</td><td class="sm">No.<br>Date:</td></tr>' +
    '<tr><td class="lbl b">Payee</td><td colspan="4" class="b">' + E(payee) + '</td></tr>' +
    '<tr><td class="lbl b">Office</td><td colspan="4">' + E(cd.office) + '</td></tr>' +
    '<tr><td class="lbl b">Address</td><td colspan="4">Daet Camarines Norte</td></tr>' +
    '<tr><th class="xs" style="width:13%">Responsibility<br>Center</th><th style="width:35%">Particulars</th><th style="width:24%">F.P.P</th><th style="width:12%">Account<br>Code</th><th style="width:16%">Amount</th></tr>' +
    '<tr class="tallx"><td class="c top">' + E(cd.rc) + '</td><td class="c top">Travelling Expenses incurred on<br><b>' + E(period) + ' at ' + E(dest) + '.</b></td><td class="c top xs2">' + E(cd.fpp) + '</td><td class="c top">' + E(cd.acct) + '</td><td class="r top b">' + money(sum.total) + '</td></tr>' +
    '<tr><td colspan="3" style="border-right:0"></td><td>Total</td><td class="r b">' + money(sum.total) + '</td></tr>' +
    '<tr><td colspan="2" class="cA"><i>A. Certified</i><div class="ck"><span class="bx"></span>Charges to budget necessary,<br>lawful and under my direct<br>supervision</div><div class="ck"><span class="bx"></span>Supporting documents valid,<br>proper and legal</div></td><td colspan="3" class="cA"><i>B. Certified</i><div class="c fa">Existence of Available Appropriation</div></td></tr>' +
    '<tr class="sigrow2"><td colspan="2" class="c">' + sig(sg.pio, 'ul') + '<div class="dl">Date : <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div></td><td colspan="3" class="c">' + sig(sg.budget, 'ul') + '<div class="dl">Date : <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div></td></tr></table></section>';

  /* ---- Certificate of Travel Completed (one per person) ---- */
  if (forms.cert) calcs.forEach(function(x){
    html += '<section class="pg ct"><div class="hd sans"><div>Republic of &nbsp;the Philippines</div><div>Province of Camarines Norte</div><div class="sp">D a e t</div><div class="off">PROVINCIAL INFORMATION OFFICE</div></div>' +
      '<div class="ct-t"><div>Appendix &nbsp;B</div><b>CERTIFICATE OF TRAVEL COMPLETED</b></div>' +
      '<div class="ct-top"><div>' + sig(sg.gov, 'ul') + '</div><div class="r2"><div class="ol">' + E(sg.gov[1]) + '</div><div class="c">Station &nbsp;Head</div><div class="ol dt2">' + E(day(dCert)) + '</div><div class="c">Date</div></div></div>' +
      '<p class="ct-body">I &nbsp;hereby certify that I have completed the travel authorized in Itinerary of Travel to<br>' + E(dest) + ' on ' + E(period) + ' under conditions indicated below:</p>' +
      '<table class="ct-opts"><tr><td class="ln2">✓</td><td>Strictly in accordance with the approved Itinerary.</td></tr><tr><td class="ln2"></td><td>Cut short as explained below. &nbsp;Additional itinerary submitted.</td></tr>' +
      '<tr><td class="ln2"></td><td>Extended as explained below, &nbsp;Additional itinerary submitted.</td></tr><tr><td class="ln2"></td><td>Other deviations explained below.</td></tr></table>' +
      '<table class="ct-ex"><tr><td class="k">Explanations/Justifications:</td><td><div class="ul2"></div><div class="ul2"></div><div class="ul2"></div></td></tr>' +
      '<tr><td class="k">Evidence of travel hereto attached:</td><td><div class="ul2 tx">Approved Travel Order dated ' + E(period) + ' with Certificate of Appearance</div><div class="ul2 tx">and approved itinerary &nbsp;of travel below dated ' + E(day(dPrep)) + '</div><div class="ul2"></div><div class="ul2"></div></td></tr></table>' +
      '<div class="ct-sub"><div class="lab">Respectfully submitted:</div>' + sig([x.v.name, x.r.pos || x.r.et], 'ul') + '</div>' +
      '<p class="ct-ev">On evidence and &nbsp;information of which I have knowledge, the travel was actually undertaken.</p>' +
      '<div class="ct-gov">' + sig([sg.gov[0].replace(/^HON\.\s*/, ''), sg.gov[1]], 'ul') + '</div></section>';
  });

  return '<!doctype html><html><head><meta charset="utf-8"><title>TEV · ' + E(t.event) + '</title><style>' +
    '@page{size:A4 portrait;margin:12mm 14mm}@page land{size:A4 landscape;margin:10mm 10mm}' +
    'html,body{margin:0}body{font-family:Cambria,"Cambria Math",Georgia,"Times New Roman",serif;font-size:11pt;color:#000;line-height:1.3}' +
    '.pg{page-break-after:always;break-after:page;height:268mm;overflow:hidden}.pg.land{height:186mm}.fit{transform-origin:top left}.pg:last-child{page-break-after:auto;break-after:auto}.land{page:land}' +
    'table{border-collapse:collapse}.r{text-align:right}.c{text-align:center}.b{font-weight:bold}.top{vertical-align:top}.xs{font-size:7.5pt}.xs2{font-size:8pt}' +
    '.sig{text-align:center;line-height:1.25}.sig b{display:block}.sig span{display:block}.sig.ul b{text-decoration:underline}.sig.ov b{border-top:1.5px solid #000;padding-top:2px;text-decoration:none}' +
    'u.dbl{text-decoration:underline double}' +
    '.hd{text-align:center;line-height:1.25;font-size:10.5pt}.hd .sp{letter-spacing:.05em}.hd .off{font-weight:bold;font-size:12pt;margin-top:8mm}.hd.sans{font-family:Arial,Helvetica,sans-serif}' +
    /* itinerary */
    '.it .no{width:62mm;margin:6mm 0 0 auto;font-size:10.5pt}.it h1{font-size:12pt;text-align:center;margin:7mm 0 6mm}' +
    '.kv{width:100%;font-size:10.5pt}.kv td{padding:0 2px;vertical-align:top}.kv .k{width:22mm}.kv .c1{width:6mm}.kv .sal{text-align:left;width:60mm}' +
    '.purp{margin:4mm 0 1mm;font-size:10.5pt}' +
    '.itin{width:100%;font-size:10pt}.itin th,.itin td{border:1px solid #000;padding:3px 5px;font-weight:normal;vertical-align:middle}' +
    '.itin thead th{text-align:center}.itin .bt{vertical-align:bottom;text-align:left}.itin .bodyrow td{vertical-align:top;height:78mm;padding-top:8px}.itin .ln{min-height:16mm}.itin td.mid{vertical-align:top}.itin .mid>div:nth-child(2){margin-top:4mm}' +
    '.itin .tot td{border-top:1px solid #000}' +
    '.it-foot{display:flex;justify-content:space-between;margin-top:5mm;font-size:10pt}.it-foot .cert{line-height:1.35}.prep{width:72mm}.prep .lab{margin-bottom:9mm}.prep .ap{margin:7mm 0 0}' +
    '.it-sigs{display:flex;justify-content:space-between;margin-top:12mm;font-size:10pt}.it-sigs .sig{width:80mm}' +
    /* payroll */
    '.pr{border:1px solid #000;padding:2mm 3mm 0;font-family:Calibri,Carlito,Arial,sans-serif;font-size:9pt}.pr-top{display:flex;justify-content:center;position:relative}.pr-t{font-weight:bold;text-decoration:underline;font-size:12pt}.pr-per{position:absolute;right:4mm;top:3mm;font-size:11pt}' +
    '.pr-ag{margin-top:3mm;font-size:9.5pt}.pr-ag .rev{font-size:8pt}.pr .purp{font-size:10pt;margin:2mm 0}' +
    '.pay{width:100%;font-size:8.5pt}.pay th,.pay td{border:1px solid #000;padding:2px 3px;font-weight:bold}.pay td{font-weight:normal;height:5mm}.pay th.xs{font-size:6pt;font-weight:normal}' +
    '.pay-foot{width:calc(100% + 6mm);margin:0 -3mm;font-size:8pt}.pay-foot td{border-top:1px solid #000;border-right:1px solid #000;vertical-align:top;padding:2mm 3mm;height:34mm}.pay-foot td:last-child{border-right:0}.pay-foot .ind{margin:2mm 0 0 8mm;line-height:1.6}.pay-foot .sig{margin-top:8mm;font-family:Cambria,Georgia,serif;font-size:9.5pt}' +
    '.pay-foot .dis{margin-top:12mm;border-top:1px solid #000;text-align:center;padding-top:1mm}' +
    /* voucher and obligation request */
    '.box{width:100%;border:1.5px solid #000}.box td,.box th{border:1px solid #000;padding:3px 6px;vertical-align:middle}.box th{font-weight:bold}' +
    '.hd2{line-height:1.3;padding:6px}.hd2 .big{font-size:13pt}.box .h td{height:13mm}.box .title{font-size:14pt;padding-left:12mm}.box .sm{font-size:9.5pt;width:24%}.box .lbl{width:20%;text-align:center}.box .sm2{font-size:10pt}' +
    '.mop .bx{margin:0 3mm 0 6mm}.mop .bx.gap{margin-left:24mm}' +
    '.bx{display:inline-block;width:12mm;height:6mm;border:1px solid #000;text-align:center;line-height:6mm;vertical-align:middle}.bx.tall{height:10mm}' +
    '.exp{text-align:center;vertical-align:top;padding:4mm 6mm;line-height:1.45}.tallx>td{height:56mm}.amt{padding-top:16mm}' +
    '.allow{margin:6mm auto 0 18mm;text-align:left}.allow td{border:0;padding:0 8px 0 0}' +
    '.cA{vertical-align:top;height:36mm}.ck{display:flex;gap:4mm;align-items:flex-start;margin:6mm 0 0 8mm}.ck .bx{flex:none;width:8mm;height:5mm}.fa{margin-top:6mm}' +
    '.sigrow td{height:17mm;vertical-align:bottom;border-top:0}.dt{font-size:10pt;padding:1px 6px}.cC{vertical-align:top;height:40mm}.cC .gsig{margin-top:17mm}.cD{vertical-align:top;padding:0}.cD i{display:block;padding:3px 6px}' +
    '.rp{width:100%;font-size:10pt}.rp td{border:1px solid #000;height:7.5mm;vertical-align:top;padding:2px 4px}.rp tr:first-child td{border-top:1px solid #000}' +
    '.orq .tallx>td{height:92mm}.sigrow2 td{height:40mm;vertical-align:bottom}.sigrow2 .sig{margin-bottom:10mm}.dl{text-align:left;margin:0 0 4mm 4mm;font-size:10pt}' +
    /* certificate */
    '.ct{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt}.ct-t{text-align:center;margin-top:9mm;line-height:1.35}' +
    '.ct-top{display:flex;justify-content:space-between;margin:11mm 6mm 0 10mm}.ct-top .r2{width:62mm}.ct .ol{border-bottom:1px solid #000;text-align:center}.ct .dt2{margin-top:9mm}' +
    '.ct-body{text-align:center;margin:8mm 0 4mm}.ct-opts{margin-left:42mm}.ct-opts td{padding:2mm 0}.ct-opts .ln2{width:20mm;border-bottom:1px solid #000;text-align:center;color:#1d4ed8}.ct-opts td+td{padding-left:20mm}' +
    '.ct-ex{width:100%;margin-top:6mm}.ct-ex td{vertical-align:top;padding:0}.ct-ex .k{width:72mm;padding:3mm 0 0 8mm}.ul2{border-bottom:1px solid #000;min-height:5.5mm;font-size:8.5pt;white-space:nowrap}.ul2.tx{padding-top:1mm}' +
    '.ct-sub{width:80mm;margin:9mm 0 0 auto;text-align:center}.ct-sub .lab{margin-bottom:8mm}.ct-ev{margin:9mm 0 0 30mm}.ct-gov{width:70mm;margin:9mm 0 0 auto}' +
    '</style></head><body>' + html +
    // shrink any page that would spill onto a second sheet (fonts differ between computers)
    '<script>function fit(){document.querySelectorAll(".pg").forEach(function(p){var w=document.createElement("div");w.className="fit";while(p.firstChild)w.appendChild(p.firstChild);p.appendChild(w);var h=p.clientHeight,c=w.scrollHeight;if(c>h){var k=h/c;w.style.transform="scale("+k+")";w.style.width=(100/k)+"%";}});}fit();<\/script></body></html>';
}
function printPayroll(j){
  var people = (S.tevs || []).filter(function(v){ return j.ids.indexOf(v.id) >= 0; });
  printHtml(tevDocHtml(toOf(j.to), people, { payroll: 1 }, j.dP, j.dC));
}
function printHtml(html){
  var f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  var w = f.contentWindow; w.document.open(); w.document.write(html); w.document.close();
  var imgs = Array.prototype.slice.call(w.document.images), done = false;
  function go(){ if (done) return; done = true; try { w.focus(); w.print(); } catch(e){ toast('Printing is blocked in this browser.'); } setTimeout(function(){ f.remove(); }, 60000); }
  Promise.all(imgs.map(function(i){ return i.complete ? 0 : new Promise(function(r){ i.onload = i.onerror = r; }); })).then(function(){ setTimeout(go, 300); });
  setTimeout(go, 5000);
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'tevPrint'){ closeModal(); tevPrintDialog(t.dataset.to); }
  else if (a === 'tevPrintGo'){
    var to = toOf(M.printTo), forms = {}, ids = [];
    document.querySelectorAll('#modal [data-form-pick]').forEach(function(c){ if (c.checked) forms[c.dataset.formPick] = 1; });
    document.querySelectorAll('#modal [data-person-pick]').forEach(function(c){ if (c.checked) ids.push(c.dataset.personPick); });
    if (!Object.keys(forms).length) return toast('Pick at least one form.');
    if (!ids.length) return toast('Pick at least one person.');
    var people = (S.tevs || []).filter(function(v){ return ids.indexOf(v.id) >= 0; });
    var dP = document.getElementById('pDate').value || today(), dC = document.getElementById('pCert').value || today();
    var a4 = Object.assign({}, forms); delete a4.payroll;
    var opts = { pron: (document.getElementById('pPron') || {}).value || '' };
    M.payJob = forms.payroll ? { to: to.id, ids: ids, dP: dP, dC: dC } : null;
    if (Object.keys(a4).length){
      printHtml(tevDocHtml(to, people, a4, dP, dC, opts));
      if (M.payJob){ var pj = M.payJob; closeModal(); M = { payJob: pj };
        modal('Print the payroll', '<p style="margin:0">The other forms went to the printer on A4. Load <b>long bond paper (8.5 × 13 in)</b>, then print the payroll.</p>',
          '<button type="button" class="btn btn-ghost" data-act="close">Skip</button><button type="button" class="btn btn-primary" data-act="tevPrintPay">' + ic('print') + 'Print payroll</button>'); }
    } else printPayroll(M.payJob);
  }
  else if (a === 'tevPrintPay' && M.payJob){ var j = M.payJob; closeModal(); printPayroll(j); }
});
/* ---------- TEV rates and signatories (Settings) ---------- */
(function(){
  var VS = viewSettings;
  viewSettings = function(){
    var v = VS(), c = tevCfg(), sg = c.sign, cd = c.codes;
    function num(id, val, lab, hint){ return '<div class="field"><label for="' + id + '">' + lab + '</label><input class="input num" type="number" min="0" step="0.01" id="' + id + '" value="' + val + '">' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; }
    function who(k, lab){ return '<div class="two"><div class="field"><label for="sg_' + k + '0">' + lab + '</label><input class="input" id="sg_' + k + '0" value="' + esc(sg[k][0]) + '"></div><div class="field"><label for="sg_' + k + '1">Title</label><input class="input" id="sg_' + k + '1" value="' + esc(sg[k][1]) + '"></div></div>'; }
    var panelHtml = '<form class="panel span-12" data-form="tevSetup"><div class="panel-h"><h2>' + ic('peso') + 'TEV rates and signatories</h2></div><div class="panel-b stack">' +
      '<div class="two">' + num('rBd', c.bicol.daily, 'Within Bicol: daily rate', '50% lodging, 30% meals, 20% incidental') + num('rBt', c.bicol.transpo, 'Within Bicol: transportation cap') + '</div>' +
      '<div class="two">' + num('rOd', c.outside.daily, 'Outside Bicol: daily rate') + num('rOt', c.outside.transpo, 'Outside Bicol: transportation cap') + '</div>' +
      '<div class="two">' + num('rPm', c.province.meals, 'Within the province: 3 meals') + num('rPi', c.province.inc, 'Within the province: incidental', 'Only 50 km or more from the Capitol') + '</div>' +
      '<div class="label">Signatories on the forms</div>' + who('pio', 'Provincial Information Officer') + who('gov', 'Governor (approves TO, itinerary, voucher)') + who('payroll', 'Payroll (plantilla) certified by') + who('padmin', 'Travel order: by authority of the Governor') + who('acct', 'Accountant') + who('treas', 'Treasurer') + who('budget', 'Budget Officer') +
      '<div class="label">Codes</div><div class="two"><div class="field"><label for="cRc">Responsibility center</label><input class="input" id="cRc" value="' + esc(cd.rc) + '"></div><div class="field"><label for="cAc">Account code</label><input class="input" id="cAc" value="' + esc(cd.acct) + '"></div></div>' +
      '<div class="field"><label for="cFp">F.P.P</label><input class="input" id="cFp" value="' + esc(cd.fpp) + '"></div>' +
      '<div class="field"><label for="cOf">Office (Obligation Request)</label><input class="input" id="cOf" value="' + esc(cd.office) + '"></div>' +
      '<div class="field"><label for="cSt">Official station (Itinerary)</label><input class="input" id="cSt" value="' + esc(cd.station) + '"></div>' +
      '<div class="field"><label for="cAd">Address (Voucher)</label><input class="input" id="cAd" value="' + esc(cd.address) + '"></div>' +
      '<p class="error" id="terr" role="alert"></p><div><button class="btn btn-primary" type="submit">Save TEV settings</button></div></div></form>';
    v.body = v.body.replace(/<\/div>$/, panelHtml + '</div>');
    return v;
  };
})();
document.addEventListener('submit', function(ev){
  var f = ev.target.closest('form[data-form="tevSetup"]'); if (!f) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  function n(id){ return Number(document.getElementById(id).value) || 0; } function s(id){ return document.getElementById(id).value.trim(); }
  var sign = {}; ['pio', 'gov', 'payroll', 'padmin', 'acct', 'treas', 'budget'].forEach(function(k){ sign[k] = [s('sg_' + k + '0'), s('sg_' + k + '1')]; });
  var tev = { bicol: { daily: n('rBd'), transpo: n('rBt') }, outside: { daily: n('rOd'), transpo: n('rOt') }, province: { meals: n('rPm'), inc: n('rPi') }, sign: sign,
              codes: Object.assign({}, tevCfg().codes, { rc: s('cRc'), acct: s('cAc'), fpp: s('cFp'), office: s('cOf'), station: s('cSt'), address: s('cAd') }) };
  if (!tev.bicol.daily || !tev.outside.daily) return bad('terr', 'Enter the daily rates.');
  busy(f.querySelector('[type=submit]'), act('saveTevSetup', { tev: tev }, 'TEV settings saved'), 'terr');
}, true);

/* ---------- position (shown on the TEV forms) in Manage ---------- */
(function(){
  var PM = personModal;
  personModal = function(username){
    PM(username);
    var u = userOf(username), box = document.querySelector('#modal #pemp');
    if (!isAdmin() || !u || !box) return;
    var f = box.closest('.two'), d = document.createElement('div');
    d.className = 'field'; d.innerHTML = '<label for="ppos">Position <span class="hint">(printed on TEV forms)</span></label><input class="input" id="ppos" data-setpos="' + esc(username) + '" maxlength="60" value="' + esc(u.position || '') + '" placeholder="e.g. Information Officer I">';
    f.parentNode.insertBefore(d, f.nextSibling);
    var nf = document.createElement('div'); nf.className = 'field';
    nf.innerHTML = '<label for="pname">Name <span class="hint">(fixes it on travel orders and TEVs too)</span></label><div class="inline-row" style="display:flex;gap:8px"><input class="input" id="pname" maxlength="80" value="' + esc(u.name) + '" style="flex:1"><button type="button" class="btn btn-sm btn-ghost" data-act="renameUser" data-u="' + esc(username) + '">' + ic('edit') + 'Rename</button></div>';
    f.parentNode.insertBefore(nf, f);
  };
})();
document.addEventListener('click', function(ev){
  var b = ev.target.closest('[data-act="renameUser"]'); if (!b) return;
  var u = userOf(b.dataset.u), v = (document.getElementById('pname').value || '').replace(/\s+/g, ' ').trim();
  if (!u || !v || v === u.name) return toast(v ? 'The name is the same.' : 'Type the full name.');
  b.disabled = true;
  act('renameUser', { username: u.username, name: v }, 'Name updated').then(function(){ personModal(u.username); }).catch(function(e){ toast(e.message); b.disabled = false; });
});
document.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' && ev.target.id === 'pname'){ ev.preventDefault(); var b = document.querySelector('#modal [data-act="renameUser"]'); if (b) b.click(); } });
document.addEventListener('change', function(ev){
  var el = ev.target; if (!el.dataset || !el.dataset.setpos) return;
  act('setPosition', { username: el.dataset.setpos, position: el.value }, 'Position saved').catch(function(e){ toast(e.message); });
});

/* ---------- drag to reorder the dashboard (Customize) ---------- */
(function(){
  var C = customizeModal;
  customizeModal = function(){
    C();
    var draw = M.draw;
    M.draw = function(){ draw(); document.querySelectorAll('#wl .w').forEach(function(row, i){ if (!row.querySelector('.drag')){ var h = document.createElement('span'); h.className = 'drag'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = ic('menu'); row.insertBefore(h, row.firstChild); } row.dataset.i = i; }); };
    M.draw();
    var p = document.querySelector('#modal .wlist'); if (p) p.insertAdjacentHTML('beforebegin', '<p class="hint" style="margin:0">Drag ' + ic('menu') + ' to move, or use the arrows.</p>');
  };
})();
(function(){
  var drag = null;
  document.addEventListener('pointerdown', function(ev){
    var h = ev.target.closest('#wl .drag'); if (!h) return;
    var row = h.closest('.w'), list = row.parentNode; ev.preventDefault();
    drag = { row: row, list: list, y: ev.clientY, from: +row.dataset.i };
    row.classList.add('dragging'); try { h.setPointerCapture(ev.pointerId); } catch(e){}
  });
  document.addEventListener('pointermove', function(ev){
    if (!drag) return;
    var rows = Array.prototype.slice.call(drag.list.querySelectorAll('.w')), y = ev.clientY;
    for (var i = 0; i < rows.length; i++){
      var r = rows[i]; if (r === drag.row) continue;
      var b = r.getBoundingClientRect(), mid = b.top + b.height / 2, before = drag.row.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_PRECEDING;
      if (before && y < mid){ drag.list.insertBefore(drag.row, r); break; }
      if (!before && y > mid){ drag.list.insertBefore(drag.row, r.nextSibling); }
    }
  });
  function end(){
    if (!drag) return;
    var boxes = Array.prototype.slice.call(drag.list.querySelectorAll('.w input[data-w]')), ids = boxes.map(function(x){ return x.dataset.w; });
    M.hidden = boxes.filter(function(x){ return !x.checked; }).map(function(x){ return x.dataset.w; });
    drag.row.classList.remove('dragging'); drag = null;
    if (ids.length === M.order.length) { M.order = ids; M.draw(); }
  }
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();

/* ---------- travel order: print straight from the browser ---------- */
TEV_DEF.sign.padmin = ['DON EDUARDO S. PADILLA', 'Provincial Administrator'];
var printTODocx = printTO;
printTO = function(t){ toPrintDialog(t.id); };
function toPrintDialog(id){
  var t = toOf(id); if (!t) return;
  M = { printTO: id };
  modal('Print travel order', '<div class="sumbox"><b>' + esc(t.event) + '</b><span>' + esc(t.destination || '') + ' · ' + fRange(t.dateFrom, t.dateTo, { month:'short', day:'numeric', year:'numeric' }) + ' · ' + t.names.length + ' ' + (t.names.length === 1 ? 'person' : 'people') + '</span></div>' +
    '<div class="two"><div class="field"><label for="tpDate">Date prepared</label><input class="input" type="date" id="tpDate" value="' + esc(t.datePrepared || today()) + '"><span class="hint">Printed at the top right.</span></div>' +
    '<div class="field"><span class="label">TEV box</span><div class="hint" style="margin-top:8px">' + (t.tev === 'Yes' ? 'X on “entitled to collect traveling expenses”' : t.tev === 'No' ? 'X on “official time only”' : 'Both boxes empty (TEV not decided yet)') + '</div></div></div>' +
    (selfRecommend(t) ? '<div class="info-note">' + ic('shield') + '<span>Sarah Marie P. Aviado is the only person on this travel order, so Recommending Approval is left out.</span></div>' : '') +
    '',
    '<button type="button" class="btn btn-ghost" data-act="toDocx" style="margin-right:auto">' + ic('download') + 'Word file</button><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button type="button" class="btn btn-primary" data-act="toPrintGo">' + ic('print') + 'Print</button>');
}
/* Laid out from to-template.docx: A4, 1-inch margins, the same tab stops, line spacing and empty lines as the Word file. */
function toPageHtml(t, prepared){
  var o = { month:'long', day:'numeric', year:'numeric' }, sg = tevCfg().sign, names = sortNames(t.names), rec = !selfRecommend(t);
  var pad = sg.padmin || TEV_DEF.sign.padmin;
  function E(x){ return esc(x == null ? '' : x); }
  function P(cls, html){ return '<div class="p ' + cls + '">' + (html || '') + '</div>'; }
  var purpose = String(t.event || '').replace(/[.\s]+$/, '') + (t.destination ? ' at ' + t.destination : '');
  var h = '';
  h += P('title', 'TRAVEL ORDER') + P('e9') + P('date', E(fDate(prepared || today(), o))) + P('e9');
  names.forEach(function(n, i){ h += P('name', (i === 0 ? '<span class="to">TO</span><span class="tc">:</span>' : '') + '<b>' + E(n) + '</b>'); });
  if (names.length < 2) h += P('e');
  h += P('e') + P('', 'You are hereby directed to undertake the following Itinerary of Travel:');
  function row(label, value){ return P('row', '<span class="lb">' + label + '</span><span class="cl">:</span><span class="vl">' + E(value) + '</span>'); }
  h += row('Place of Destination', t.destination) + row('Date/Time of Departure', fDate(t.dateFrom, o)) + row('Date/Time of Arrival', fDate(t.dateTo || t.dateFrom, o));
  h += P('purpose', '<span class="lb">Purpose</span><span class="cl">:</span>' + E(purpose));
  h += P('e') + P('opt1', '<span class="bx b1">' + (t.tev === 'No' ? 'X' : '') + '</span>This order allows official time only.') + P('e');
  h += P('opt2', '<span class="bx b2">' + (t.tev === 'Yes' ? 'X' : '') + '</span>By way of this directive, you are entitled to collect traveling expenses subject to the usual accounting and auditing rules and regulations.') + P('e') + P('e');
  h += P('rec', rec ? 'RECOMMENDING APPROVAL:' : '') + P('e7') + P('e7') + P('e7');
  h += P('sig', rec ? '       ' + E(sg.pio[0]) : '') + P('sig', rec ? '         ' + E(sg.pio[1]) : '');
  h += P('e') + P('e') + P('c', 'APPROVED BY:') + P('e') + P('e') + P('e') + P('c', E(sg.gov[0].replace(/^HON\.\s*/, ''))) + P('c s9', E(sg.gov[1]));
  h += P('e') + P('e') + P('e') + P('c', 'By Authority of the Governor:') + P('e') + P('e') + P('e') + P('e') + P('e') + P('c', E(pad[0])) + P('c s9', E(pad[1]));
  return '<section class="to"><img class="hdr" src="to-header.png" alt=""><img class="wm" src="to-watermark.jpg" alt=""><img class="ftr" src="to-footer.png" alt=""><div class="body">' + h + '</div></section>';
}
function toDocHtml(list, prepared){
  var base = location.href.replace(/[#?].*$/, '').replace(/[^\/]*$/, '');
  // measurements in mm, taken from the Word template (margins 25.4, default tabs every 12.7)
  return '<!doctype html><html><head><meta charset="utf-8"><base href="' + base + '"><title>Travel Order</title><style>' +
    '@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}' +
    'body{font-family:"Maiandra GD","Century Gothic","Segoe UI",Arial,sans-serif;font-size:11pt;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.to{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}.to:last-child{page-break-after:auto;break-after:auto}' +
    '.hdr{position:absolute;left:1.59mm;top:0;width:216mm;height:48.47mm}.wm{position:absolute;left:4.25mm;top:19.5mm;width:201.5mm;height:201.6mm;opacity:.05}' +
    '.ftr{position:absolute;left:3.35mm;top:266.9mm;width:203.3mm;height:29.11mm}' +
    '.body{position:absolute;left:25.4mm;top:36.6mm;width:159.2mm}' +
    '.p{position:relative;line-height:4.7mm;min-height:4.7mm;white-space:pre-wrap}.e9{min-height:3.9mm;line-height:3.9mm}.e7{min-height:3mm;line-height:3mm}' +
    '.title{font-family:Calibri,Carlito,Arial,sans-serif;font-weight:bold;font-size:13pt;text-align:center;line-height:5.6mm;min-height:6.8mm}' +
    '.date{padding-left:114.3mm}' +
    '.name{padding-left:25.4mm}.name .to{position:absolute;left:0}.name .tc{position:absolute;left:12.7mm}' +
    '.row{padding-left:50.8mm}.row .lb{position:absolute;left:0}.row .cl{position:absolute;left:45mm}' +
    '.purpose{padding-left:25.4mm;text-indent:25.4mm;text-align:justify}.purpose .lb{position:absolute;left:0;text-indent:0}.purpose .cl{position:absolute;left:44.7mm;text-indent:0}' +
    '.opt1,.opt2,.opt2b{padding-left:25.4mm}' +
    '.bx{position:absolute;width:13.49mm;height:6.61mm;box-sizing:border-box;border:1px solid #000;background:#fff;text-align:center;font-weight:bold;line-height:6.4mm;text-indent:0}' +
    '.b1{left:4.76mm;top:.19mm}.b2{left:4.87mm;top:1.39mm}' +
    '.rec{margin-left:88.9mm;text-align:center}.sig{padding-left:88.9mm}.c{text-align:center}.s9{font-size:9pt;line-height:3.8mm;min-height:3.8mm}' +
    '</style></head><body>' + list.map(function(t){ return toPageHtml(t, t.id === M.printTO ? prepared : t.datePrepared); }).join('') + '</body></html>';
}
document.addEventListener('click', function(ev){
  var t = ev.target.closest('[data-act]'); if (!t) return;
  var a = t.dataset.act;
  if (a === 'toDocx'){ var x = toOf(M.printTO); if (x){ printTODocx(Object.assign({}, x, { datePrepared: (document.getElementById('tpDate') || {}).value || x.datePrepared }), t); setTimeout(function(){ markPrinted([x]); }, 1500); } }
  else if (a === 'toPrintGo'){
    var main = toOf(M.printTO); if (!main) return;
    var list = [main].concat(Array.prototype.slice.call(document.querySelectorAll('#modal [data-to-pick]:checked')).map(function(c){ return toOf(c.dataset.toPick); }).filter(Boolean));
    var prep = (document.getElementById('tpDate') || {}).value || today();
    var html = toDocHtml(list, prep); markPrinted(list);
    // wait for the letterhead images before opening the print window
    var f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var w = f.contentWindow; w.document.open(); w.document.write(html); w.document.close();
    var imgs = Array.prototype.slice.call(w.document.images), go = function(){ try { w.focus(); w.print(); } catch(e){ toast('Printing is blocked in this browser.'); } setTimeout(function(){ f.remove(); }, 60000); };
    Promise.all(imgs.map(function(im){ return im.complete ? 0 : new Promise(function(r){ im.onload = im.onerror = r; }); })).then(function(){ setTimeout(go, 150); });
  }
});
var TEV_SHEETS = {"DV":{"cols":[64,102,69,90,107,65,108,144],"rows":[19.3,19.3,20.7,23.3,19.3,19.3,19.3,19.3,26.7,26.7,26.7,19.3,26.7,26.7,20.0,26.7,20.0,57.0,19.3,19.3,19.3,19.3,19.3,19.3,20.0,22.0,22.0,36.0,22.0,22.0,26.0,20.7,20.7,20.7,20.7,20.7,20.7,19.3,19.3,19.3,19.3,20.7,19.3,19.3,20.0,19.3,19.3,19.3,20.7,20.7,20.7,19.3,26.7],"cells":[{"r":0,"c":0},{"r":0,"c":1},{"r":0,"c":2},{"r":0,"c":3},{"r":0,"c":4},{"r":0,"c":5},{"r":0,"c":6},{"r":0,"c":7},{"r":1,"c":0,"b":[1,0,0,1]},{"r":1,"c":1,"b":[1,0,0,0]},{"r":1,"c":2,"b":[1,0,0,0]},{"r":1,"c":3,"b":[1,0,0,0]},{"r":1,"c":4,"b":[1,0,0,0]},{"r":1,"c":5,"b":[1,0,0,0]},{"r":1,"c":6,"b":[1,0,0,0]},{"r":1,"c":7,"b":[1,1,0,0]},{"r":2,"c":0,"cs":8,"v":"Republic of the Philippines","b":[0,1,0,1],"s":["Cambria",12.0,"b","center","bottom",0,0]},{"r":3,"c":0,"cs":8,"v":"PROVINCE OF CAMARINES NORTE","b":[0,1,0,1],"s":["Cambria",14.0,"b","center","bottom",0,0]},{"r":4,"c":0,"b":[0,0,1,1]},{"r":4,"c":1,"b":[0,0,1,0]},{"r":4,"c":2,"b":[0,0,1,0]},{"r":4,"c":3,"b":[0,0,1,0]},{"r":4,"c":4,"b":[0,0,1,0]},{"r":4,"c":5,"b":[0,0,1,0]},{"r":4,"c":6,"b":[0,0,1,0]},{"r":4,"c":7,"b":[0,1,1,0]},{"r":5,"c":0,"rs":3,"cs":5,"v":"DISBURSEMENT VOUCHER","b":[0,0,1,1],"s":["Cambria",16.0,"b","center","middle",0,0]},{"r":5,"c":5,"b":[1,1,0,0]},{"r":5,"c":6},{"r":5,"c":7,"b":[1,1,0,0]},{"r":6,"c":5,"b":[0,1,0,0]},{"r":6,"c":6,"v":"No.","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":6,"c":7,"b":[0,1,0,0]},{"r":7,"c":5,"b":[0,1,1,0]},{"r":7,"c":6,"v":"Date:","b":[0,0,1,0],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":7,"c":7,"b":[0,1,1,0]},{"r":8,"c":0,"rs":3,"cs":2,"v":"Mode of Payment","b":[1,1,1,1],"s":["Cambria",11.0,"","center","middle",1,0]},{"r":8,"c":2},{"r":8,"c":3},{"r":8,"c":4},{"r":8,"c":5},{"r":8,"c":6},{"r":8,"c":7,"b":[0,1,0,0]},{"r":9,"c":2},{"r":9,"c":3,"v":"Check","s":["Cambria",12.0,"","center","middle",0,0]},{"r":9,"c":4},{"r":9,"c":5,"v":"Cash","s":["Cambria",12.0,"","center","middle",0,0]},{"r":9,"c":6},{"r":9,"c":7,"v":"Others","b":[0,1,0,0],"s":["Cambria",12.0,"","left","middle",0,0]},{"r":10,"c":2},{"r":10,"c":3},{"r":10,"c":4},{"r":10,"c":5},{"r":10,"c":6},{"r":10,"c":7,"b":[0,1,0,0]},{"r":11,"c":0,"rs":2,"cs":2,"v":"Payee","b":[1,1,1,1],"s":["Cambria",11.0,"","center","middle",0,0]},{"r":11,"c":2,"rs":2,"cs":3,"v":"{{PAYEE}}","b":[1,1,1,1],"s":["Cambria",12.0,"b","left","middle",1,0]},{"r":11,"c":5,"cs":2,"v":"TIN/Employee No.","b":[1,1,0,1],"s":["Cambria",10.0,"","center","middle",0,0]},{"r":11,"c":7,"rs":2,"v":"Obligation Request No.","b":[1,1,1,1],"s":["Cambria",10.0,"","center","middle",1,0]},{"r":12,"c":5,"b":[0,0,1,1]},{"r":12,"c":6,"b":[0,1,1,0]},{"r":13,"c":0,"rs":3,"cs":2,"v":"Address","b":[1,1,1,1],"s":["Cambria",11.0,"","center","middle",0,0]},{"r":13,"c":2,"b":[1,0,0,1]},{"r":13,"c":3,"b":[1,0,0,0]},{"r":13,"c":4,"b":[1,1,0,0]},{"r":13,"c":5,"cs":3,"v":"Responsibility Center","b":[1,1,0,1],"s":["Cambria",12.0,"","center","middle",0,0]},{"r":14,"c":2,"v":"{{ADDR}}","b":[1,0,0,1],"s":["Cambria",12.0,"b","left","middle",0,0]},{"r":14,"c":3,"b":[1,0,0,0]},{"r":14,"c":4,"b":[1,1,0,0]},{"r":14,"c":5,"cs":2,"v":"Office/Unit/Project","b":[1,1,0,1],"s":["Cambria",10.0,"","center","middle",0,0]},{"r":14,"c":7,"v":"Code","b":[1,1,0,1],"s":["Cambria",10.0,"","center","middle",0,0]},{"r":15,"c":2,"b":[0,0,1,1]},{"r":15,"c":3,"b":[0,0,1,0]},{"r":15,"c":4,"b":[0,1,1,0]},{"r":15,"c":5,"cs":2,"v":"PIO","b":[0,1,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":15,"c":7,"v":"{{RC}}","b":[0,1,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":16,"c":0,"cs":7,"v":"EXPLANATION","b":[1,1,0,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":16,"c":7,"v":"AMOUNT","b":[1,1,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":17,"c":0,"cs":7,"v":"{{EXP1}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","middle",1,0]},{"r":17,"c":7,"b":[0,1,0,0]},{"r":18,"c":0,"cs":7,"v":"{{EXP2}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":18,"c":7,"v":"{{AMT}}","b":[0,1,0,1],"s":["Cambria",11.0,"b","right","bottom",0,0]},{"r":19,"c":0,"b":[0,0,0,1]},{"r":19,"c":1},{"r":19,"c":2},{"r":19,"c":3},{"r":19,"c":4},{"r":19,"c":5},{"r":19,"c":6,"b":[0,1,0,0]},{"r":19,"c":7,"b":[0,1,0,0]},{"r":20,"c":0,"b":[0,0,0,1]},{"r":20,"c":1,"cs":4,"v":"{{ALLOWH}}","s":["Calibri",10.0,"b","center","middle",0,0]},{"r":20,"c":5},{"r":20,"c":6,"b":[0,1,0,0]},{"r":20,"c":7,"b":[0,1,0,1]},{"r":21,"c":0,"b":[0,0,0,1]},{"r":21,"c":1,"cs":2,"v":"{{LT}}","s":["Calibri",11.0,"b","center","middle",0,0]},{"r":21,"c":3,"v":"{{VT}}","s":["Arial",10.0,"","center","middle",0,0]},{"r":21,"c":4,"v":"{{NT}}","s":["Cambria",9.0,"","left","bottom",0,0]},{"r":21,"c":5},{"r":21,"c":6,"b":[0,1,0,0]},{"r":21,"c":7,"b":[0,1,0,0]},{"r":22,"c":0,"b":[0,0,0,1]},{"r":22,"c":1,"cs":2,"v":"{{LL}}","s":["Calibri",11.0,"b","center","middle",0,0]},{"r":22,"c":3,"v":"{{VL}}","s":["Arial",10.0,"","center","middle",0,0]},{"r":22,"c":4,"v":"{{NL}}","s":["Arial",9.0,"","left","bottom",0,0]},{"r":22,"c":5},{"r":22,"c":6,"b":[0,1,0,0]},{"r":22,"c":7,"b":[0,1,0,0]},{"r":23,"c":0,"b":[0,0,0,1]},{"r":23,"c":1,"cs":2,"v":"{{LM}}","s":["Calibri",11.0,"b","center","middle",0,0]},{"r":23,"c":3,"v":"{{VM}}","s":["Arial",10.0,"","center","middle",0,0]},{"r":23,"c":4,"cs":3,"v":"{{NM}}","b":[0,1,0,0],"s":["Arial",9.0,"","left","bottom",0,0]},{"r":23,"c":7,"b":[0,1,0,0]},{"r":24,"c":0,"b":[0,0,0,1]},{"r":24,"c":1,"cs":2,"v":"{{LI}}","s":["Calibri",11.0,"b","center","middle",1,0]},{"r":24,"c":3,"v":"{{VI}}","s":["Arial",10.0,"","center","middle",0,0]},{"r":24,"c":4,"v":"{{NI}}","s":["Arial",9.0,"","left","bottom",0,0]},{"r":24,"c":5},{"r":24,"c":6,"b":[0,1,0,0]},{"r":24,"c":7,"b":[0,1,0,0]},{"r":25,"c":0,"b":[0,0,0,1]},{"r":25,"c":1,"cs":2,"v":"{{LTOT}}","s":["Calibri",11.0,"b","right","middle",1,0]},{"r":25,"c":3,"v":"{{VTOT}}","s":["Calibri",11.0,"b","right","middle",1,0]},{"r":25,"c":4},{"r":25,"c":5},{"r":25,"c":6,"b":[0,1,0,0]},{"r":25,"c":7,"b":[0,1,0,0]},{"r":26,"c":0,"b":[0,0,0,1]},{"r":26,"c":1,"v":"{{CERTH}}","s":["Calibri",11.0,"b","left","middle",1,0]},{"r":26,"c":2},{"r":26,"c":3},{"r":26,"c":4},{"r":26,"c":5},{"r":26,"c":6,"b":[0,1,0,0]},{"r":26,"c":7,"b":[0,1,0,0]},{"r":27,"c":0,"b":[0,0,0,1]},{"r":27,"c":1,"cs":3,"v":"{{CERTB}}","s":["Arial",9.0,"","left","middle",1,0]},{"r":27,"c":4},{"r":27,"c":5},{"r":27,"c":6,"b":[0,1,0,0]},{"r":27,"c":7,"b":[0,1,0,0]},{"r":28,"c":0,"b":[0,0,0,1]},{"r":28,"c":1},{"r":28,"c":2},{"r":28,"c":3},{"r":28,"c":4},{"r":28,"c":5},{"r":28,"c":6,"b":[0,1,0,0]},{"r":28,"c":7,"b":[0,1,0,0]},{"r":29,"c":0,"b":[0,0,0,1]},{"r":29,"c":1},{"r":29,"c":2,"cs":3,"v":"{{CPIO}}","s":["Arial",11.0,"b","center","middle",1,0]},{"r":29,"c":5},{"r":29,"c":6,"b":[0,1,0,0]},{"r":29,"c":7,"b":[0,1,0,0]},{"r":30,"c":0,"b":[0,0,1,1]},{"r":30,"c":1},{"r":30,"c":2,"cs":3,"v":"{{CPIOT}}","b":[0,0,1,0],"s":["Arial",10.0,"","center","middle",0,0]},{"r":30,"c":5},{"r":30,"c":6,"b":[0,1,0,0]},{"r":30,"c":7,"b":[0,1,1,1]},{"r":31,"c":0,"b":[1,0,1,1]},{"r":31,"c":1,"b":[1,0,1,0]},{"r":31,"c":2,"b":[1,0,1,0]},{"r":31,"c":3,"b":[1,0,1,0]},{"r":31,"c":4,"b":[1,0,1,0]},{"r":31,"c":5,"b":[1,0,1,0]},{"r":31,"c":6,"v":"Total","b":[1,1,1,0],"s":["Cambria",11.0,"","left","bottom",0,0]},{"r":31,"c":7,"v":"{{AMT}}","b":[1,1,2,1],"s":["Cambria",12.0,"b","right","middle",0,0]},{"r":32,"c":0,"v":"A. Certified","b":[1,0,0,1],"s":["Cambria",12.0,"i","left","bottom",0,0]},{"r":32,"c":1,"b":[1,0,0,0]},{"r":32,"c":2,"b":[1,0,0,0]},{"r":32,"c":3,"b":[1,0,0,0]},{"r":32,"c":4,"b":[1,1,0,0]},{"r":32,"c":5,"v":"B. Certified","b":[1,0,0,1],"s":["Cambria",12.0,"i","left","bottom",0,0]},{"r":32,"c":6,"b":[1,0,0,0]},{"r":32,"c":7,"b":[0,1,0,0]},{"r":33,"c":0,"b":[0,0,0,1]},{"r":33,"c":1,"v":"Allotment obligated for the purpose","s":["Cambria",12.0,"","left","bottom",0,0]},{"r":33,"c":2},{"r":33,"c":3},{"r":33,"c":4,"b":[0,1,0,0]},{"r":33,"c":5,"cs":3,"b":[0,1,0,1]},{"r":34,"c":0,"b":[0,0,0,1]},{"r":34,"c":1,"v":"as indicated above","s":["Cambria",12.0,"","left","bottom",0,0]},{"r":34,"c":2},{"r":34,"c":3},{"r":34,"c":4,"b":[0,1,0,0]},{"r":34,"c":5,"cs":3,"v":"Funds Available","b":[0,1,0,1],"s":["Cambria",12.0,"","center","bottom",0,0]},{"r":35,"c":0,"b":[0,0,0,1]},{"r":35,"c":1},{"r":35,"c":2},{"r":35,"c":3},{"r":35,"c":4,"b":[0,1,0,0]},{"r":35,"c":5,"b":[0,0,0,1]},{"r":35,"c":6},{"r":35,"c":7,"b":[0,1,0,0]},{"r":36,"c":0,"b":[0,0,0,1]},{"r":36,"c":1,"v":"Supporting documents complete","s":["Cambria",12.0,"","left","bottom",0,0]},{"r":36,"c":2},{"r":36,"c":3},{"r":36,"c":4,"b":[0,1,0,0]},{"r":36,"c":5,"b":[0,0,0,1]},{"r":36,"c":6},{"r":36,"c":7,"b":[0,1,0,0]},{"r":37,"c":0,"b":[0,0,1,1]},{"r":37,"c":1,"b":[0,0,1,0]},{"r":37,"c":2,"b":[0,0,1,0]},{"r":37,"c":3,"b":[0,0,1,0]},{"r":37,"c":4,"b":[0,1,1,0]},{"r":37,"c":5,"b":[0,0,1,1]},{"r":37,"c":6,"b":[0,0,1,0]},{"r":37,"c":7,"b":[0,1,1,0]},{"r":38,"c":0,"b":[1,0,0,1]},{"r":38,"c":1,"b":[1,0,0,0]},{"r":38,"c":2,"b":[1,0,0,0]},{"r":38,"c":3,"b":[1,0,0,0]},{"r":38,"c":4,"b":[1,1,0,0]},{"r":38,"c":5,"b":[1,0,0,1]},{"r":38,"c":6,"b":[1,0,0,0]},{"r":38,"c":7,"b":[1,1,0,0]},{"r":39,"c":0,"b":[0,0,0,1]},{"r":39,"c":1},{"r":39,"c":2},{"r":39,"c":3},{"r":39,"c":4,"b":[0,1,0,0]},{"r":39,"c":5,"b":[0,0,0,1]},{"r":39,"c":6},{"r":39,"c":7,"b":[0,1,0,0]},{"r":40,"c":0,"b":[0,0,0,1]},{"r":40,"c":1},{"r":40,"c":2},{"r":40,"c":3},{"r":40,"c":4,"b":[0,1,0,0]},{"r":40,"c":5,"b":[0,0,0,1]},{"r":40,"c":6},{"r":40,"c":7,"b":[0,1,0,0]},{"r":41,"c":0,"cs":5,"v":"{{ACC}}","b":[0,1,0,1],"s":["Cambria",12.0,"bu","center","bottom",0,0]},{"r":41,"c":5,"cs":3,"v":"{{TRE}}","b":[0,1,0,1],"s":["Cambria",10.0,"b","center","bottom",0,0]},{"r":42,"c":0,"cs":5,"v":"{{ACCT}}","b":[0,1,0,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":42,"c":5,"cs":3,"v":"{{TRET}}","b":[0,1,1,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":43,"c":0,"v":"Date","b":[1,1,1,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":43,"c":1,"b":[1,0,1,1]},{"r":43,"c":2,"b":[1,0,1,0]},{"r":43,"c":3,"b":[1,0,1,0]},{"r":43,"c":4,"b":[1,1,1,0]},{"r":43,"c":5,"v":"Date","b":[1,1,1,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":43,"c":6,"b":[1,0,1,1]},{"r":43,"c":7,"b":[1,1,1,0]},{"r":44,"c":0,"v":"C. Approved for Payment","b":[1,0,1,1],"s":["Cambria",12.0,"i","left","middle",0,0]},{"r":44,"c":1,"b":[1,0,1,0]},{"r":44,"c":2,"b":[1,0,1,0]},{"r":44,"c":3,"b":[1,0,1,0]},{"r":44,"c":4,"b":[1,1,1,0]},{"r":44,"c":5,"v":"D. Received Payment","b":[1,0,1,1],"s":["Cambria",12.0,"i","left","middle",0,0]},{"r":44,"c":6,"b":[1,0,1,0]},{"r":44,"c":7,"b":[1,1,1,0]},{"r":45,"c":0,"b":[1,0,0,1]},{"r":45,"c":1,"b":[1,0,0,0]},{"r":45,"c":2,"b":[1,0,0,0]},{"r":45,"c":3,"b":[1,0,0,0]},{"r":45,"c":4,"b":[1,1,0,0]},{"r":45,"c":5,"v":"Check No.","b":[1,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":45,"c":6,"v":"Bank Name","b":[1,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":45,"c":7,"v":"Date","b":[1,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":46,"c":0,"b":[0,0,0,1]},{"r":46,"c":1},{"r":46,"c":2},{"r":46,"c":3},{"r":46,"c":4,"b":[0,1,0,0]},{"r":46,"c":5,"b":[0,1,1,1]},{"r":46,"c":6,"b":[0,1,1,1]},{"r":46,"c":7,"b":[0,1,1,1]},{"r":47,"c":0,"b":[0,0,0,1]},{"r":47,"c":1},{"r":47,"c":2},{"r":47,"c":3},{"r":47,"c":4,"b":[0,1,0,0]},{"r":47,"c":5,"rs":2,"v":"Signature","b":[1,1,1,1],"s":["Cambria",10.0,"","center","middle",0,0]},{"r":47,"c":6,"b":[1,0,0,1]},{"r":47,"c":7,"b":[1,1,0,0]},{"r":48,"c":0,"cs":5,"b":[0,1,0,1]},{"r":48,"c":6,"b":[0,0,1,1]},{"r":48,"c":7,"b":[0,1,1,0]},{"r":49,"c":0,"cs":5,"v":"{{GOV}}","b":[0,1,0,1],"s":["Cambria",12.0,"b","center","bottom",0,0]},{"r":49,"c":5,"v":"Printed Name","b":[1,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":49,"c":6,"b":[1,0,0,1]},{"r":49,"c":7,"b":[1,1,0,0]},{"r":50,"c":0,"cs":5,"v":"{{GOVT}}","b":[0,1,0,1],"s":["Cambria",12.0,"","center","bottom",0,0]},{"r":50,"c":5,"b":[0,1,1,1]},{"r":50,"c":6,"v":"Date","b":[0,0,1,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":50,"c":7,"b":[0,1,1,0]},{"r":51,"c":0,"b":[0,0,0,1]},{"r":51,"c":1},{"r":51,"c":2},{"r":51,"c":3},{"r":51,"c":4,"b":[0,1,0,0]},{"r":51,"c":5,"cs":2,"v":"OR/Other Documents","b":[1,1,0,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":51,"c":7,"v":"JEV No.       Date","b":[1,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":52,"c":0,"b":[0,0,2,1]},{"r":52,"c":1,"b":[0,0,2,0]},{"r":52,"c":2,"b":[0,0,2,0]},{"r":52,"c":3,"b":[0,0,2,0]},{"r":52,"c":4,"b":[0,1,2,0]},{"r":52,"c":5,"b":[0,0,2,1]},{"r":52,"c":6,"b":[0,1,2,0]},{"r":52,"c":7,"b":[0,1,2,1]}],"shapes":[[193.8,190.5,35.8,20.0,"X"],[388.0,193.5,37.0,19.0,""],[544.0,190.5,38.0,20.0,""],[30.0,828.6,26.0,17.7,""],[31.0,765.5,26.0,18.7,""]]},"PAYROLL":{"cols":[28,208,114,49,56,70,71,63,37,39,64,59,89,34,62,56,64,117,66],"rows":[16.7,24.0,20.7,17.3,17.3,42.0,26.0,26.0,20.7,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3],"cells":[{"r":0,"c":0},{"r":0,"c":1},{"r":0,"c":2},{"r":0,"c":3},{"r":0,"c":4},{"r":0,"c":5},{"r":0,"c":6},{"r":0,"c":7},{"r":0,"c":8},{"r":0,"c":9},{"r":0,"c":10},{"r":0,"c":11},{"r":0,"c":12},{"r":0,"c":13},{"r":0,"c":14},{"r":0,"c":15},{"r":0,"c":16},{"r":0,"c":17},{"r":0,"c":18},{"r":1,"c":0,"b":[1,0,0,1]},{"r":1,"c":1,"b":[1,0,0,0]},{"r":1,"c":2,"b":[1,0,0,0]},{"r":1,"c":3,"b":[1,0,0,0]},{"r":1,"c":4,"b":[1,0,0,0]},{"r":1,"c":5,"v":" PAYROLL ","b":[1,0,0,0],"s":["Arial Black",12.0,"bu","center","middle",0,0]},{"r":1,"c":6,"b":[1,0,0,0]},{"r":1,"c":7,"b":[1,0,0,0]},{"r":1,"c":8,"b":[1,0,0,0]},{"r":1,"c":9,"b":[1,0,0,0]},{"r":1,"c":10,"b":[1,0,0,0]},{"r":1,"c":11,"b":[1,0,0,0]},{"r":1,"c":12,"b":[1,0,0,0]},{"r":1,"c":13,"b":[1,0,0,0]},{"r":1,"c":14,"b":[1,0,0,0]},{"r":1,"c":15,"b":[1,0,0,0]},{"r":1,"c":16,"b":[1,0,0,0]},{"r":1,"c":17,"b":[1,1,0,0]},{"r":1,"c":18},{"r":2,"c":0,"v":"Agency:   {{AGENCY}}","b":[0,0,0,1],"s":["Calibri",11.0,"b","left","middle",0,0]},{"r":2,"c":1},{"r":2,"c":2},{"r":2,"c":3},{"r":2,"c":4},{"r":2,"c":5},{"r":2,"c":6},{"r":2,"c":7},{"r":2,"c":8},{"r":2,"c":9},{"r":2,"c":10},{"r":2,"c":11},{"r":2,"c":12},{"r":2,"c":13},{"r":2,"c":14,"v":"Period: ","s":["Calibri",10.0,"bi","right","bottom",0,0]},{"r":2,"c":15,"v":"{{PERIOD}}","s":["Calibri",10.0,"bi","left","bottom",0,0]},{"r":2,"c":16},{"r":2,"c":17,"b":[0,1,0,0]},{"r":2,"c":18},{"r":3,"c":0,"v":"Revised January 1992","b":[0,0,0,1],"s":["Calibri",10.0,"i","left","bottom",0,0]},{"r":3,"c":1},{"r":3,"c":2},{"r":3,"c":3},{"r":3,"c":4},{"r":3,"c":5},{"r":3,"c":6},{"r":3,"c":7},{"r":3,"c":8},{"r":3,"c":9},{"r":3,"c":10,"v":" ","s":["Arial",10.0,"","center","middle",0,0]},{"r":3,"c":11},{"r":3,"c":12},{"r":3,"c":13},{"r":3,"c":14},{"r":3,"c":15},{"r":3,"c":16},{"r":3,"c":17,"b":[0,1,0,0]},{"r":3,"c":18},{"r":4,"c":0,"b":[0,0,0,1]},{"r":4,"c":1},{"r":4,"c":2},{"r":4,"c":3},{"r":4,"c":4},{"r":4,"c":5},{"r":4,"c":6},{"r":4,"c":7},{"r":4,"c":8},{"r":4,"c":9},{"r":4,"c":10},{"r":4,"c":11},{"r":4,"c":12},{"r":4,"c":13},{"r":4,"c":14},{"r":4,"c":15},{"r":4,"c":16},{"r":4,"c":17,"b":[0,1,0,0]},{"r":4,"c":18},{"r":5,"c":0,"cs":18,"v":"Purpose: {{PURPOSE}}","b":[0,1,1,1],"s":["Calibri",12.0,"i","left","top",1,0]},{"r":5,"c":18},{"r":6,"c":0,"rs":2,"v":"No.","b":[1,1,1,1],"s":["Calibri",11.0,"b","center","middle",0,0]},{"r":6,"c":1,"rs":2,"v":"NAME","b":[1,1,1,1],"s":["Calibri",11.0,"b","center","middle",0,0]},{"r":6,"c":2,"rs":2,"v":"OCCUPATION","b":[1,1,1,1],"s":["Calibri",11.0,"b","center","middle",0,0]},{"r":6,"c":3,"rs":2,"v":"No. of Days ","b":[1,1,1,1],"s":["Calibri",8.0,"b","center","middle",1,0]},{"r":6,"c":4,"cs":4,"v":"Allowable Expenses","b":[1,1,1,1],"s":["Calibri",10.0,"b","center","middle",0,0]},{"r":6,"c":8,"cs":2,"v":"Philhealth","b":[1,1,1,1],"s":["Calibri",9.0,"b","center","middle",1,0]},{"r":6,"c":10,"cs":2,"v":"PAG-IBIG","b":[1,1,1,1],"s":["Calibri",9.0,"b","center","middle",0,0]},{"r":6,"c":12,"rs":2,"v":"NET PAY","b":[1,1,1,1],"s":["Calibri",11.0,"b","center","middle",0,0]},{"r":6,"c":13,"rs":2,"v":"No.","b":[1,1,1,1],"s":["Calibri",10.0,"b","center","middle",0,0]},{"r":6,"c":14,"rs":2,"v":"Signature /thumbmark","b":[1,1,1,1],"s":["Calibri",7.0,"b","center","middle",1,0]},{"r":6,"c":15,"rs":2,"v":"CTC NUMBER","b":[1,1,1,1],"s":["Calibri",7.0,"b","center","middle",1,0]},{"r":6,"c":16,"rs":2,"v":"Issued At","b":[1,1,1,1],"s":["Calibri",7.0,"b","center","middle",1,0]},{"r":6,"c":17,"rs":2,"v":"Issued on","b":[1,1,1,1],"s":["Calibri",10.0,"b","center","middle",1,0]},{"r":6,"c":18},{"r":7,"c":4,"v":"Trans","b":[1,1,1,1],"s":["Calibri",8.0,"b","center","middle",0,0]},{"r":7,"c":5,"v":"Lodging","b":[1,1,1,1],"s":["Calibri",8.0,"b","center","middle",0,0]},{"r":7,"c":6,"v":"Meal","b":[1,1,1,1],"s":["Calibri",8.0,"b","center","middle",0,0]},{"r":7,"c":7,"v":"Incidental","b":[1,1,1,1],"s":["Calibri",8.0,"b","center","middle",1,0]},{"r":7,"c":8,"v":"Gov't Share","b":[1,1,1,1],"s":["Calibri",5.0,"","left","top",1,0]},{"r":7,"c":9,"v":"Personal Share","b":[1,1,1,1],"s":["Calibri",5.0,"","left","top",1,0]},{"r":7,"c":10,"v":"Gov;t Share","b":[1,1,1,1],"s":["Calibri",5.0,"","left","top",1,0]},{"r":7,"c":11,"v":"Personal Share","b":[1,1,1,1],"s":["Calibri",5.0,"","left","top",1,0]},{"r":7,"c":18},{"r":8,"c":0,"v":"{{I}}","b":[1,1,1,1],"s":["Calibri",11.0,"","center","middle",0,0]},{"r":8,"c":1,"v":"{{NAME}}","b":[1,1,1,1],"s":["Maiandra GD",11.0,"","left","middle",0,0]},{"r":8,"c":2,"v":"{{POS}}","b":[1,1,1,1],"s":["Maiandra GD",9.0,"","center","middle",1,0]},{"r":8,"c":3,"v":"{{DAYS}}","b":[1,1,1,1],"s":["Arial",10.0,"","center","middle",1,0]},{"r":8,"c":4,"v":"{{TR}}","b":[1,1,1,1],"s":["Arial",8.0,"","center","middle",0,0]},{"r":8,"c":5,"v":"{{LO}}","b":[1,1,1,1],"s":["Arial",9.0,"","center","middle",0,0]},{"r":8,"c":6,"v":"{{ME}}","b":[1,1,1,1],"s":["Arial",9.0,"","center","middle",0,0]},{"r":8,"c":7,"v":"{{IN}}","b":[1,1,1,1],"s":["Arial",9.0,"","center","middle",0,0]},{"r":8,"c":8,"b":[1,1,1,1]},{"r":8,"c":9,"b":[1,1,1,1]},{"r":8,"c":10,"b":[1,1,1,1]},{"r":8,"c":11,"b":[1,1,1,1]},{"r":8,"c":12,"v":"{{NET}}","b":[1,1,1,1],"s":["Arial",9.0,"b","center","middle",0,0]},{"r":8,"c":13,"v":"{{I}}","b":[1,1,1,1],"s":["Calibri",10.0,"b","center","middle",0,0]},{"r":8,"c":14,"b":[1,1,1,1]},{"r":8,"c":15,"b":[1,1,1,1]},{"r":8,"c":16,"b":[1,1,1,1]},{"r":8,"c":17,"b":[1,1,1,1]},{"r":8,"c":18},{"r":9,"c":0,"b":[1,1,1,1]},{"r":9,"c":1,"v":"TOTAL","b":[1,1,1,1],"s":["Arial",10.0,"b","left","middle",0,0]},{"r":9,"c":2,"b":[1,1,1,1]},{"r":9,"c":3,"b":[1,1,1,1]},{"r":9,"c":4,"v":"{{TTR}}","b":[1,1,1,1],"s":["Arial",8.0,"","center","middle",0,0]},{"r":9,"c":5,"v":"{{TLO}}","b":[1,1,1,1],"s":["Arial",8.0,"","center","middle",0,0]},{"r":9,"c":6,"v":"{{TME}}","b":[1,1,1,1],"s":["Arial",9.0,"","center","middle",0,0]},{"r":9,"c":7,"v":"{{TIN}}","b":[1,1,1,1],"s":["Arial",9.0,"","center","middle",0,0]},{"r":9,"c":8,"b":[1,1,1,1]},{"r":9,"c":9,"b":[1,1,1,1]},{"r":9,"c":10,"b":[1,1,1,1]},{"r":9,"c":11,"b":[1,1,1,1]},{"r":9,"c":12,"v":"{{TNET}}","b":[1,1,1,1],"s":["Arial",9.0,"b","right","middle",0,0]},{"r":9,"c":13,"b":[1,1,1,1]},{"r":9,"c":14,"b":[1,1,1,1]},{"r":9,"c":15,"b":[1,1,1,1]},{"r":9,"c":16,"b":[1,1,1,1]},{"r":9,"c":17,"b":[1,1,1,1]},{"r":9,"c":18},{"r":10,"c":0,"v":"CERTIFIED:","b":[1,0,0,1],"s":["Calibri",8.0,"","left","middle",0,0]},{"r":10,"c":1,"b":[1,0,0,0]},{"r":10,"c":2,"b":[1,0,0,0]},{"r":10,"c":3,"b":[1,0,0,0]},{"r":10,"c":4,"b":[1,0,0,0]},{"r":10,"c":5,"b":[1,0,0,0]},{"r":10,"c":6,"cs":7,"v":"APPROVED PLANTILLA","b":[1,0,0,1],"s":["Calibri",8,"","left","middle",0,0]},{"r":10,"c":13,"b":[1,1,0,0]},{"r":10,"c":14,"v":"CERTIFIED:","b":[1,0,0,1],"s":["Calibri",8.0,"","left","bottom",0,0]},{"r":10,"c":15,"b":[1,0,0,0]},{"r":10,"c":16,"b":[1,0,0,0]},{"r":10,"c":17,"b":[1,1,0,0]},{"r":10,"c":18},{"r":11,"c":0,"b":[0,0,0,1]},{"r":11,"c":1,"v":"Each person whose name appears on this roll had","s":["Calibri",8.0,"","left","bottom",0,0]},{"r":11,"c":2},{"r":11,"c":3},{"r":11,"c":4},{"r":11,"c":5},{"r":11,"c":6,"b":[0,0,0,1]},{"r":11,"c":7},{"r":11,"c":8},{"r":11,"c":9},{"r":11,"c":10},{"r":11,"c":11},{"r":11,"c":12},{"r":11,"c":13,"b":[0,1,0,0]},{"r":11,"c":14,"v":"Each person whose name appears on the above payroll ","s":["Calibri",8.0,"","left","bottom",0,0]},{"r":11,"c":15},{"r":11,"c":16},{"r":11,"c":17,"b":[0,1,0,0]},{"r":11,"c":18},{"r":12,"c":0,"b":[0,0,0,1]},{"r":12,"c":1,"v":"rendered service for the time stated","s":["Calibri",8,"","left","bottom",0,0]},{"r":12,"c":2},{"r":12,"c":3},{"r":12,"c":4},{"r":12,"c":5},{"r":12,"c":6,"b":[0,0,0,1]},{"r":12,"c":7},{"r":12,"c":8},{"r":12,"c":9},{"r":12,"c":10},{"r":12,"c":11},{"r":12,"c":12},{"r":12,"c":13,"b":[0,1,0,0]},{"r":12,"c":14,"v":"has been paid the amount stated opposite his name  ","s":["Calibri",8.0,"","left","bottom",0,0]},{"r":12,"c":15},{"r":12,"c":16},{"r":12,"c":17,"b":[0,1,0,0]},{"r":12,"c":18},{"r":13,"c":0,"b":[0,0,0,1]},{"r":13,"c":1},{"r":13,"c":2},{"r":13,"c":3},{"r":13,"c":4},{"r":13,"c":5},{"r":13,"c":6,"b":[0,0,0,1]},{"r":13,"c":7},{"r":13,"c":8},{"r":13,"c":9},{"r":13,"c":10},{"r":13,"c":11},{"r":13,"c":12},{"r":13,"c":13,"b":[0,1,0,0]},{"r":13,"c":14,"v":"after identifying Him.","s":["Calibri",8.0,"","left","bottom",0,0]},{"r":13,"c":15},{"r":13,"c":16},{"r":13,"c":17,"b":[0,1,0,0]},{"r":13,"c":18},{"r":14,"c":0,"b":[0,0,0,1]},{"r":14,"c":1},{"r":14,"c":2},{"r":14,"c":3},{"r":14,"c":4},{"r":14,"c":5},{"r":14,"c":6,"b":[0,0,0,1]},{"r":14,"c":7},{"r":14,"c":8},{"r":14,"c":9},{"r":14,"c":10},{"r":14,"c":11},{"r":14,"c":12},{"r":14,"c":13,"b":[0,1,0,0]},{"r":14,"c":14},{"r":14,"c":15},{"r":14,"c":16},{"r":14,"c":17,"b":[0,1,0,0]},{"r":14,"c":18},{"r":15,"c":0,"b":[0,0,0,1]},{"r":15,"c":1,"cs":5,"v":"{{PIO}}","s":["Times New Roman",11.0,"bu","center","bottom",0,0]},{"r":15,"c":6,"b":[0,0,0,1]},{"r":15,"c":7,"cs":6,"v":"{{APP}}","s":["Times New Roman",11.0,"bu","center","bottom",0,0]},{"r":15,"c":13,"b":[0,1,0,0]},{"r":15,"c":14,"v":"________________________________","b":[0,0,0,0],"s":["Calibri",11.0,"b","left","bottom",0,0]},{"r":15,"c":15,"b":[0,0,0,0]},{"r":15,"c":16,"b":[0,0,0,0]},{"r":15,"c":17,"b":[0,1,0,0]},{"r":15,"c":18},{"r":16,"c":0,"b":[0,0,1,1]},{"r":16,"c":1,"cs":5,"v":"{{PIOT}}","b":[0,0,1,0],"s":["Times New Roman",11.0,"b","center","bottom",0,0]},{"r":16,"c":6,"cs":8,"v":"{{APPT}}","b":[0,1,1,1],"s":["Times New Roman",11.0,"b","center","bottom",0,0]},{"r":16,"c":14,"cs":4,"v":"Name and signature of Disbursing officer","b":[0,1,1,0],"s":["Calibri",9.0,"","center","middle",0,0]},{"r":16,"c":18}],"shapes":[]},"OR":{"cols":[119,306,167,100,98],"rows":[19.3,19.3,23.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,20.7,19.3,19.3,19.3,19.3,19.3,19.3,20.7,19.3,19.3,19.3,19.3,19.3,19.3],"cells":[{"r":0,"c":0,"b":[1,0,0,1]},{"r":0,"c":1,"b":[1,0,0,0]},{"r":0,"c":2,"b":[1,0,0,0]},{"r":0,"c":3,"b":[1,0,0,0]},{"r":0,"c":4,"b":[1,1,0,0]},{"r":1,"c":0,"cs":5,"v":"Republic of the Philippines","b":[0,1,0,1],"s":["Cambria",10.0,"b","center","bottom",0,0]},{"r":2,"c":0,"cs":5,"v":"PROVINCE OF CAMARINES NORTE","b":[0,1,0,1],"s":["Cambria",14.0,"b","center","bottom",0,0]},{"r":3,"c":0,"b":[0,0,1,1]},{"r":3,"c":1,"b":[0,0,1,0]},{"r":3,"c":2,"b":[0,0,1,0]},{"r":3,"c":3,"b":[0,0,1,0]},{"r":3,"c":4,"b":[0,1,1,0]},{"r":4,"c":0,"rs":3,"cs":2,"v":"OBLIGATION REQUEST","b":[0,0,1,1],"s":["Cambria",16.0,"b","center","middle",0,0]},{"r":4,"c":2,"b":[1,1,0,0]},{"r":4,"c":3},{"r":4,"c":4,"b":[0,1,0,0]},{"r":5,"c":2,"b":[0,1,0,0]},{"r":5,"c":3,"v":"No.","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":5,"c":4,"b":[0,1,0,0]},{"r":6,"c":2,"b":[0,1,1,0]},{"r":6,"c":3,"v":"Date:","b":[0,0,1,0],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":6,"c":4,"b":[0,1,1,0]},{"r":7,"c":0,"v":"Payee","b":[1,0,0,1],"s":["Cambria",11.0,"b","left","middle",0,0]},{"r":7,"c":1,"rs":2,"cs":4,"v":"{{PAYEE}}","b":[1,1,1,1],"s":["Cambria",12.0,"b","left","middle",0,0]},{"r":8,"c":0,"b":[0,0,1,1]},{"r":9,"c":0,"v":"Office","b":[1,0,0,1],"s":["Cambria",11.0,"b","left","middle",0,0]},{"r":9,"c":1,"rs":2,"cs":4,"v":"{{OFFICE}}","b":[1,1,1,1],"s":["Cambria",12.0,"","left","middle",0,0]},{"r":10,"c":0,"b":[0,0,1,1]},{"r":11,"c":0,"v":"Address","b":[1,0,0,1],"s":["Cambria",11.0,"b","left","middle",0,0]},{"r":11,"c":1,"rs":2,"cs":4,"v":"{{ADDR2}}","b":[1,1,1,1],"s":["Cambria",12.0,"","left","middle",0,0]},{"r":12,"c":0,"b":[0,0,1,1]},{"r":13,"c":0,"v":"Responsibility","b":[1,0,0,1],"s":["Cambria",11.0,"b","center","middle",0,0]},{"r":13,"c":1,"rs":2,"v":"Particulars","b":[1,0,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":13,"c":2,"rs":2,"v":"F.P.P","b":[1,1,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":13,"c":3,"v":"Account ","b":[0,1,0,1],"s":["Cambria",12.0,"b","center","bottom",0,0]},{"r":13,"c":4,"rs":2,"v":"Amount","b":[0,1,1,1],"s":["Cambria",12.0,"b","center","middle",0,0]},{"r":14,"c":0,"v":"Center","b":[0,0,1,1],"s":["Cambria",11.0,"b","center","middle",0,0]},{"r":14,"c":3,"v":"Code","b":[0,1,1,1],"s":["Cambria",12.0,"b","center","bottom",0,0]},{"r":15,"c":0,"b":[1,1,0,1]},{"r":15,"c":1,"b":[1,0,0,0]},{"r":15,"c":2,"b":[1,1,0,1]},{"r":15,"c":3,"b":[1,1,0,1]},{"r":15,"c":4,"b":[1,1,0,1]},{"r":16,"c":0,"b":[0,1,0,1]},{"r":16,"c":1},{"r":16,"c":2,"b":[0,1,0,1]},{"r":16,"c":3,"b":[0,0,0,1]},{"r":16,"c":4,"b":[0,1,0,1]},{"r":17,"c":0,"v":"{{RC}}","b":[0,1,0,1],"s":["Cambria",12.0,"","center","middle",0,0]},{"r":17,"c":1,"v":"Travelling Expenses incurred on ","b":[0,0,0,1],"s":["Cambria",12.0,"","center","bottom",0,0]},{"r":17,"c":2,"v":"{{FPP}}","b":[0,0,0,1],"s":["Cambria",9.0,"","center","middle",0,0]},{"r":17,"c":3,"v":"{{ACCT}}","b":[0,1,0,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":17,"c":4,"v":"{{AMT}}","b":[0,1,1,1],"s":["Cambria",11.0,"b","right","middle",0,0]},{"r":18,"c":0,"b":[0,1,0,1]},{"r":18,"c":1,"rs":2,"v":"{{WHEN}}","b":[0,1,0,1],"s":["Cambria",12.0,"b","center","bottom",1,0]},{"r":18,"c":2,"b":[0,1,0,1]},{"r":18,"c":3,"b":[0,1,0,1]},{"r":18,"c":4,"b":[0,1,0,1]},{"r":19,"c":0,"b":[0,1,0,1]},{"r":19,"c":2,"b":[0,1,0,1]},{"r":19,"c":3,"b":[0,1,0,1]},{"r":19,"c":4,"b":[0,1,0,1]},{"r":20,"c":0,"b":[0,1,0,1]},{"r":20,"c":1,"b":[0,0,0,1]},{"r":20,"c":2,"b":[0,1,0,1]},{"r":20,"c":3,"b":[0,1,0,1]},{"r":20,"c":4,"b":[0,1,0,1]},{"r":21,"c":0,"b":[0,1,0,1]},{"r":21,"c":1,"b":[0,0,0,1]},{"r":21,"c":2,"b":[0,1,0,1]},{"r":21,"c":3,"b":[0,1,0,1]},{"r":21,"c":4,"b":[0,1,0,1]},{"r":22,"c":0,"b":[0,1,0,1]},{"r":22,"c":1,"b":[0,0,0,1]},{"r":22,"c":2,"b":[0,1,0,1]},{"r":22,"c":3,"b":[0,1,0,1]},{"r":22,"c":4,"b":[0,1,0,1]},{"r":23,"c":0,"b":[0,1,0,1]},{"r":23,"c":1,"v":"     ","b":[0,0,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":23,"c":2,"b":[0,1,0,1]},{"r":23,"c":3,"b":[0,1,0,1]},{"r":23,"c":4,"b":[0,1,0,1]},{"r":24,"c":0,"b":[0,1,0,1]},{"r":24,"c":1},{"r":24,"c":2,"b":[0,1,0,1]},{"r":24,"c":3,"b":[0,1,0,1]},{"r":24,"c":4,"b":[0,1,0,1]},{"r":25,"c":0,"b":[0,1,0,1]},{"r":25,"c":1},{"r":25,"c":2,"b":[0,1,0,1]},{"r":25,"c":3,"b":[0,1,0,1]},{"r":25,"c":4,"b":[0,1,0,1]},{"r":26,"c":0,"b":[0,1,0,1]},{"r":26,"c":1},{"r":26,"c":2,"b":[0,1,0,1]},{"r":26,"c":3,"b":[0,1,0,1]},{"r":26,"c":4,"b":[0,1,0,1]},{"r":27,"c":0,"b":[0,1,0,1]},{"r":27,"c":1},{"r":27,"c":2,"b":[0,1,0,1]},{"r":27,"c":3,"b":[0,1,0,1]},{"r":27,"c":4,"b":[0,1,0,1]},{"r":28,"c":0,"b":[0,1,0,1]},{"r":28,"c":1},{"r":28,"c":2,"b":[0,1,0,1]},{"r":28,"c":3,"b":[0,1,0,1]},{"r":28,"c":4,"b":[0,1,0,1]},{"r":29,"c":0,"b":[0,1,0,1]},{"r":29,"c":1},{"r":29,"c":2,"b":[0,1,0,1]},{"r":29,"c":3,"b":[0,1,0,1]},{"r":29,"c":4,"b":[0,1,0,1]},{"r":30,"c":0,"b":[0,1,0,1]},{"r":30,"c":1},{"r":30,"c":2,"b":[0,1,0,1]},{"r":30,"c":3,"b":[0,1,0,1]},{"r":30,"c":4,"b":[0,1,0,1]},{"r":31,"c":0,"b":[0,1,0,1]},{"r":31,"c":1},{"r":31,"c":2,"b":[0,1,0,1]},{"r":31,"c":3,"b":[0,1,0,1]},{"r":31,"c":4,"b":[0,1,0,1]},{"r":32,"c":0,"b":[0,1,0,1]},{"r":32,"c":1},{"r":32,"c":2,"b":[0,1,0,1]},{"r":32,"c":3,"b":[0,1,0,1]},{"r":32,"c":4,"b":[0,1,0,1]},{"r":33,"c":0,"b":[0,1,0,1]},{"r":33,"c":1},{"r":33,"c":2,"b":[0,1,0,1]},{"r":33,"c":3,"b":[0,1,0,1]},{"r":33,"c":4,"b":[0,1,0,1]},{"r":34,"c":0,"b":[0,1,1,1]},{"r":34,"c":1,"b":[0,0,1,0]},{"r":34,"c":2,"b":[0,1,1,1]},{"r":34,"c":3,"b":[0,1,1,1]},{"r":34,"c":4,"b":[0,1,1,1]},{"r":35,"c":0,"b":[1,0,1,1]},{"r":35,"c":1,"b":[1,0,1,0]},{"r":35,"c":2,"b":[1,0,1,0]},{"r":35,"c":3,"v":"Total","b":[1,1,1,1],"s":["Cambria",11.0,"","left","bottom",0,0]},{"r":35,"c":4,"v":"{{AMT}}","b":[1,1,1,1],"s":["Cambria",12.0,"b","right","bottom",0,0]},{"r":36,"c":0,"v":"A. Certified","b":[1,0,0,1],"s":["Cambria",12.0,"","left","bottom",0,0]},{"r":36,"c":1,"b":[1,0,0,0]},{"r":36,"c":2,"v":"B. Certified","b":[1,0,0,1],"s":["Cambria",12.0,"","left","bottom",0,0]},{"r":36,"c":3,"b":[1,0,0,0]},{"r":36,"c":4,"b":[1,1,0,0]},{"r":37,"c":0,"b":[0,0,0,1]},{"r":37,"c":1,"v":"Charges to budget necessary,","s":["Cambria",12.0,"","left","bottom",0,1.0]},{"r":37,"c":2,"b":[0,0,0,1]},{"r":37,"c":3},{"r":37,"c":4,"b":[0,1,0,0]},{"r":38,"c":0,"b":[0,0,0,1]},{"r":38,"c":1,"v":"lawful and under my direct ","s":["Cambria",12.0,"","left","bottom",0,1.0]},{"r":38,"c":2,"cs":3,"v":"Existence of Available Appropriation","b":[0,1,0,1],"s":["Cambria",12.0,"","center","bottom",0,0]},{"r":39,"c":0,"b":[0,0,0,1]},{"r":39,"c":1,"v":"supervision","s":["Cambria",12.0,"","left","bottom",0,1.0]},{"r":39,"c":2,"b":[0,0,0,1]},{"r":39,"c":3},{"r":39,"c":4,"b":[0,1,0,0]},{"r":40,"c":0,"b":[0,0,0,1]},{"r":40,"c":1},{"r":40,"c":2,"b":[0,0,0,1]},{"r":40,"c":3},{"r":40,"c":4,"b":[0,1,0,0]},{"r":41,"c":0,"b":[0,0,0,1]},{"r":41,"c":1},{"r":41,"c":2,"b":[0,0,0,1]},{"r":41,"c":3},{"r":41,"c":4,"b":[0,1,0,0]},{"r":42,"c":0,"b":[0,0,0,1]},{"r":42,"c":1,"v":"Supporting documents valid,","s":["Cambria",12.0,"","left","bottom",0,1.0]},{"r":42,"c":2,"b":[0,0,0,1]},{"r":42,"c":3},{"r":42,"c":4,"b":[0,1,0,0]},{"r":43,"c":0,"b":[0,0,0,1]},{"r":43,"c":1,"v":"proper and legal","s":["Cambria",12.0,"","left","bottom",0,1.0]},{"r":43,"c":2,"b":[0,0,0,1]},{"r":43,"c":3},{"r":43,"c":4,"b":[0,1,0,0]},{"r":44,"c":0,"b":[0,0,0,1]},{"r":44,"c":1},{"r":44,"c":2,"b":[0,0,0,1]},{"r":44,"c":3},{"r":44,"c":4,"b":[0,1,0,0]},{"r":45,"c":0,"b":[0,0,1,1]},{"r":45,"c":1,"b":[0,0,1,0]},{"r":45,"c":2,"b":[0,0,1,1]},{"r":45,"c":3,"b":[0,0,1,0]},{"r":45,"c":4,"b":[0,1,1,0]},{"r":46,"c":0,"b":[1,0,0,1]},{"r":46,"c":1,"b":[1,0,0,0]},{"r":46,"c":2,"b":[1,0,0,1]},{"r":46,"c":3,"b":[1,0,0,0]},{"r":46,"c":4,"b":[1,1,0,0]},{"r":47,"c":0,"b":[0,0,0,1]},{"r":47,"c":1},{"r":47,"c":2,"b":[0,0,0,1]},{"r":47,"c":3},{"r":47,"c":4,"b":[0,1,0,0]},{"r":48,"c":0,"b":[0,0,0,1]},{"r":48,"c":1},{"r":48,"c":2,"b":[0,0,0,1]},{"r":48,"c":3},{"r":48,"c":4,"b":[0,1,0,0]},{"r":49,"c":0,"b":[0,0,0,1]},{"r":49,"c":1},{"r":49,"c":2,"b":[0,0,0,1]},{"r":49,"c":3},{"r":49,"c":4,"b":[0,1,0,0]},{"r":50,"c":0,"b":[0,0,0,1]},{"r":50,"c":1},{"r":50,"c":2,"b":[0,0,0,1]},{"r":50,"c":3},{"r":50,"c":4,"b":[0,1,0,0]},{"r":51,"c":0,"cs":2,"v":"{{PIO}}","b":[0,0,0,1],"s":["Cambria",12.0,"bu","center","bottom",0,0]},{"r":51,"c":2,"cs":3,"v":"{{BUD}}","b":[0,1,0,1],"s":["Cambria",12.0,"bu","center","bottom",0,0]},{"r":52,"c":0,"cs":2,"v":"{{PIOT}}","b":[0,0,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":52,"c":2,"cs":3,"v":"{{BUDT}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":53,"c":0,"b":[0,0,0,1]},{"r":53,"c":1},{"r":53,"c":2,"b":[0,0,0,1]},{"r":53,"c":3},{"r":53,"c":4,"b":[0,1,0,0]},{"r":54,"c":0,"v":"Date :","b":[0,0,0,1],"s":["Cambria",10.0,"","right","bottom",0,0]},{"r":54,"c":1,"v":"{{DLINE}}","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":54,"c":2,"v":"Date :","b":[0,0,0,1],"s":["Cambria",10.0,"","right","bottom",0,0]},{"r":54,"c":3,"v":"{{DLINE}}","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":54,"c":4,"b":[0,1,0,0]},{"r":55,"c":0,"b":[0,0,0,1]},{"r":55,"c":1},{"r":55,"c":2,"b":[0,0,0,1]},{"r":55,"c":3},{"r":55,"c":4,"b":[0,1,0,0]},{"r":56,"c":0,"b":[0,0,1,1]},{"r":56,"c":1,"b":[0,0,1,0]},{"r":56,"c":2,"b":[0,0,1,1]},{"r":56,"c":3,"b":[0,0,1,0]},{"r":56,"c":4,"b":[0,1,1,0]},{"r":57,"c":0},{"r":57,"c":1},{"r":57,"c":2},{"r":57,"c":3},{"r":57,"c":4}],"shapes":[[75,770.4,34,20,""],[75,857.2,34,20,""]]},"Sarah":{"cols":[130,145,86,93,87,91,64,94],"rows":[19.3,19.3,19.3,19.3,19.3,19.3,20.7,20.7,19.3,19.3,19.3,20.7,19.3,19.3,19.3,19.3,56.0,19.3,19.3,20.0,19.3,20.0,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,20.7,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,20.0,19.3,20.0,19.3,19.3,19.3,19.3,19.3],"cells":[{"r":0,"c":0},{"r":0,"c":1},{"r":0,"c":2},{"r":0,"c":3},{"r":0,"c":4},{"r":0,"c":5},{"r":0,"c":6},{"r":0,"c":7},{"r":1,"c":0},{"r":1,"c":1},{"r":1,"c":2},{"r":1,"c":3},{"r":1,"c":4},{"r":1,"c":5},{"r":1,"c":6},{"r":1,"c":7},{"r":2,"c":0,"cs":8,"v":"Republic of the Philippines","s":["Cambria",10.0,"","center","bottom",0,0]},{"r":3,"c":0,"cs":8,"v":"PROVINCE OF CAMARINES NORTE","s":["Cambria",10.0,"","center","bottom",0,0]},{"r":4,"c":0,"cs":8,"v":"D a e t","s":["Cambria",11.0,"","center","bottom",0,0]},{"r":5,"c":0},{"r":5,"c":1},{"r":5,"c":2},{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5},{"r":5,"c":6},{"r":5,"c":7},{"r":6,"c":0,"cs":8,"v":"PROVINCIAL INFORMATION OFFICE","s":["Cambria",12.0,"b","center","bottom",0,0]},{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2},{"r":7,"c":3},{"r":7,"c":4},{"r":7,"c":5},{"r":7,"c":6},{"r":7,"c":7},{"r":8,"c":0},{"r":8,"c":1},{"r":8,"c":2},{"r":8,"c":3},{"r":8,"c":4},{"r":8,"c":5,"v":"                No._____________","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":8,"c":6},{"r":8,"c":7},{"r":9,"c":0},{"r":9,"c":1},{"r":9,"c":2},{"r":9,"c":3},{"r":9,"c":4},{"r":9,"c":5,"v":"                Date: ","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":9,"c":6,"v":"{{DATE}}","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":9,"c":7},{"r":10,"c":0},{"r":10,"c":1},{"r":10,"c":2},{"r":10,"c":3},{"r":10,"c":4},{"r":10,"c":5},{"r":10,"c":6},{"r":10,"c":7},{"r":11,"c":0},{"r":11,"c":1},{"r":11,"c":2,"v":"        ITINERARY OF TRAVEL","s":["Cambria",12.0,"b","left","bottom",0,0]},{"r":11,"c":3},{"r":11,"c":4},{"r":11,"c":5},{"r":11,"c":6},{"r":11,"c":7},{"r":12,"c":0},{"r":12,"c":1},{"r":12,"c":2},{"r":12,"c":3},{"r":12,"c":4},{"r":12,"c":5},{"r":12,"c":6},{"r":12,"c":7},{"r":13,"c":0,"v":"Name         :         ","s":["Cambria",11.0,"","left","bottom",0,0]},{"r":13,"c":1,"v":"{{NAME}}","s":["Cambria",11.0,"b","left","bottom",0,0]},{"r":13,"c":2},{"r":13,"c":3},{"r":13,"c":4,"v":"                 Monthly Salary:   Php ","s":["Cambria",11.0,"","left","bottom",0,0]},{"r":13,"c":5},{"r":13,"c":6},{"r":13,"c":7},{"r":14,"c":0,"v":"Position    :            ","s":["Cambria",11.0,"","left","bottom",0,0]},{"r":14,"c":1,"v":"{{POS}}","s":["Cambria",11.0,"","left","bottom",0,0]},{"r":14,"c":2},{"r":14,"c":3},{"r":14,"c":4},{"r":14,"c":5},{"r":14,"c":6},{"r":14,"c":7},{"r":15,"c":0,"v":"Official Station   :  {{STATION}}","s":["Cambria",11.0,"","left","bottom",0,0]},{"r":15,"c":1},{"r":15,"c":2},{"r":15,"c":3},{"r":15,"c":4},{"r":15,"c":5},{"r":15,"c":6},{"r":15,"c":7},{"r":16,"c":0,"cs":8,"v":"Purpose: {{PURPOSE}}","s":["Cambria",11.0,"i","left","middle",1,0]},{"r":17,"c":0,"b":[1,0,0,1]},{"r":17,"c":1,"b":[1,1,0,1]},{"r":17,"c":2,"b":[1,0,0,0]},{"r":17,"c":3,"b":[1,0,0,0]},{"r":17,"c":4,"rs":3,"v":"Means of Transportation","b":[1,1,1,1],"s":["Cambria",9.0,"","center","middle",1,0]},{"r":17,"c":5,"v":"     Allowable  Expenses","b":[1,0,1,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":17,"c":6,"b":[1,0,1,0]},{"r":17,"c":7,"b":[1,1,0,1]},{"r":18,"c":0,"b":[0,0,0,1]},{"r":18,"c":1,"v":"                Places","b":[0,1,0,1],"s":["Cambria",10.0,"","left","top",0,0]},{"r":18,"c":2,"v":"               T i m e","b":[0,0,1,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":18,"c":3,"b":[0,0,1,0]},{"r":18,"c":5,"v":"Trans.","b":[1,1,0,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":18,"c":6,"v":"         Per","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":18,"c":7,"v":"       Total","b":[0,1,0,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":19,"c":0,"v":"   Date","b":[0,0,2,1],"s":["Cambria",10.0,"","left","top",0,0]},{"r":19,"c":1,"v":"          to  be  visited","b":[0,1,2,1],"s":["Cambria",10.0,"","left","top",0,0]},{"r":19,"c":2,"v":"  Departure","b":[1,1,2,1],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":19,"c":3,"v":"   Arrival","b":[0,0,2,0],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":19,"c":5,"v":"   Allow.","b":[0,1,2,1],"s":["Cambria",10.0,"","center","bottom",0,0]},{"r":19,"c":6,"v":"       Diems","b":[0,0,2,0],"s":["Cambria",10.0,"","left","bottom",0,0]},{"r":19,"c":7,"b":[0,1,2,1]},{"r":20,"c":0,"b":[0,0,0,1]},{"r":20,"c":1,"b":[2,1,0,1]},{"r":20,"c":2,"b":[0,1,0,1]},{"r":20,"c":3},{"r":20,"c":4,"rs":9,"v":"{{MEANS}}","b":[1,1,0,1],"s":["Cambria",11,"","center","middle",1,0]},{"r":20,"c":5,"b":[0,1,0,0]},{"r":20,"c":6,"b":[0,1,0,1]},{"r":20,"c":7,"b":[0,1,0,1]},{"r":21,"c":0,"v":"{{D1}}","b":[0,0,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":21,"c":1,"rs":2,"v":"{{P1}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","middle",1,0]},{"r":21,"c":2,"v":"{{DEP}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":21,"c":3},{"r":21,"c":5,"v":"{{T1}}","b":[0,1,0,0],"s":["Cambria",11.0,"","left","middle",0,0]},{"r":21,"c":6,"v":"{{A1}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":21,"c":7,"v":"{{S1}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":22,"c":0,"b":[0,0,0,1]},{"r":22,"c":2,"b":[0,1,0,1]},{"r":22,"c":3},{"r":22,"c":5,"b":[0,1,0,0]},{"r":22,"c":6,"b":[0,1,0,1]},{"r":22,"c":7,"b":[0,1,0,1]},{"r":23,"c":0,"b":[0,0,0,1]},{"r":23,"c":1,"b":[0,1,0,1]},{"r":23,"c":2,"b":[0,1,0,0]},{"r":23,"c":3},{"r":23,"c":5,"b":[0,1,0,0]},{"r":23,"c":6,"b":[0,1,0,1]},{"r":23,"c":7,"b":[0,1,0,1]},{"r":24,"c":0,"v":"{{D2}}","b":[0,0,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":24,"c":1,"v":"{{P2}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":24,"c":2,"b":[0,1,0,1]},{"r":24,"c":3},{"r":24,"c":5,"b":[0,1,0,0]},{"r":24,"c":6,"v":"{{A2}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":24,"c":7,"v":"{{S2}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":25,"c":0,"b":[0,0,0,1]},{"r":25,"c":1,"b":[0,1,0,1]},{"r":25,"c":2,"b":[0,1,0,0]},{"r":25,"c":3},{"r":25,"c":5,"b":[0,1,0,0]},{"r":25,"c":6,"b":[0,1,0,1]},{"r":25,"c":7,"b":[0,1,0,1]},{"r":26,"c":0,"b":[0,0,0,1]},{"r":26,"c":1,"b":[0,1,0,1]},{"r":26,"c":2,"b":[0,1,0,0]},{"r":26,"c":3},{"r":26,"c":5,"b":[0,1,0,0]},{"r":26,"c":6,"b":[0,1,0,1]},{"r":26,"c":7,"b":[0,1,0,1]},{"r":27,"c":0,"v":"{{D3}}","b":[0,0,0,1],"s":["Cambria",11.0,"","center","bottom",0,0]},{"r":27,"c":1,"rs":2,"v":"{{P3}}","b":[0,1,0,1],"s":["Cambria",11.0,"","center","middle",1,0]},{"r":27,"c":2,"b":[0,1,0,1]},{"r":27,"c":3,"v":"{{ARR}}","s":["Cambria",11.0,"","center","bottom",0,0]},{"r":27,"c":5,"b":[0,1,0,0]},{"r":27,"c":6,"v":"{{A3}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":27,"c":7,"v":"{{S3}}","b":[0,1,0,1],"s":["Cambria",11.0,"","right","bottom",0,0]},{"r":28,"c":0,"b":[0,0,0,1]},{"r":28,"c":2,"b":[0,1,0,1]},{"r":28,"c":3},{"r":28,"c":5,"b":[0,1,0,1]},{"r":28,"c":6,"b":[0,1,0,1]},{"r":28,"c":7,"b":[0,1,0,1]},{"r":29,"c":0,"b":[0,0,0,1]},{"r":29,"c":1,"b":[0,1,0,1]},{"r":29,"c":2,"b":[0,1,0,1]},{"r":29,"c":3},{"r":29,"c":4,"b":[0,1,0,1]},{"r":29,"c":5,"b":[0,1,0,1]},{"r":29,"c":6,"b":[0,1,0,1]},{"r":29,"c":7,"b":[0,1,0,1]},{"r":30,"c":0,"b":[0,0,0,1]},{"r":30,"c":1,"b":[0,1,0,1]},{"r":30,"c":2,"b":[0,1,0,1]},{"r":30,"c":3},{"r":30,"c":4,"b":[0,1,0,1]},{"r":30,"c":5,"b":[0,1,0,1]},{"r":30,"c":6,"b":[0,1,0,0]},{"r":30,"c":7,"b":[0,1,0,1]},{"r":31,"c":0,"b":[1,0,1,1]},{"r":31,"c":1,"v":"TOTALS","b":[1,1,1,1],"s":["Cambria",11.0,"b","left","middle",0,0]},{"r":31,"c":2,"b":[1,1,1,1]},{"r":31,"c":3,"b":[1,0,1,0]},{"r":31,"c":4,"b":[1,1,1,1]},{"r":31,"c":5,"v":"{{TT}}","b":[1,1,1,1],"s":["Cambria",11.0,"b","right","middle",0,0]},{"r":31,"c":6,"v":"{{TA}}","b":[1,1,1,1],"s":["Cambria",11.0,"b","right","middle",0,0]},{"r":31,"c":7,"v":"{{TS}}","b":[1,1,1,1],"s":["Cambria",11.0,"b","right","middle",0,0]},{"r":32,"c":0},{"r":32,"c":1},{"r":32,"c":2},{"r":32,"c":3},{"r":32,"c":4},{"r":32,"c":5},{"r":32,"c":6},{"r":32,"c":7},{"r":33,"c":0,"v":"   I certify that 1) I have reviewed  the","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":33,"c":1},{"r":33,"c":2},{"r":33,"c":3},{"r":33,"c":4},{"r":33,"c":5},{"r":33,"c":6},{"r":33,"c":7},{"r":34,"c":0,"v":"   the foregoing itinerary.  2) the travel","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":34,"c":1},{"r":34,"c":2},{"r":34,"c":3},{"r":34,"c":4,"v":"  Prepared by:","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":34,"c":5},{"r":34,"c":6},{"r":34,"c":7},{"r":35,"c":0,"v":"   is necessary to the service. 3) the","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":35,"c":1},{"r":35,"c":2},{"r":35,"c":3},{"r":35,"c":4},{"r":35,"c":5},{"r":35,"c":6},{"r":35,"c":7},{"r":36,"c":0,"v":"   period covered is reasonable  and","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":36,"c":1},{"r":36,"c":2},{"r":36,"c":3},{"r":36,"c":4,"cs":4,"v":"{{NAME}}","s":["Cambria",10.0,"bu","center","bottom",1,0]},{"r":37,"c":0,"v":"   4) the expense are  proper.","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":37,"c":1},{"r":37,"c":2},{"r":37,"c":3},{"r":37,"c":4},{"r":37,"c":5,"v":"                  Employee","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":37,"c":6},{"r":37,"c":7},{"r":38,"c":0},{"r":38,"c":1},{"r":38,"c":2},{"r":38,"c":3},{"r":38,"c":4},{"r":38,"c":5},{"r":38,"c":6},{"r":38,"c":7},{"r":39,"c":0},{"r":39,"c":1},{"r":39,"c":2},{"r":39,"c":3},{"r":39,"c":4,"v":"  Approved by:","s":["Cambria",10.0,"","left","bottom",0,0]},{"r":39,"c":5},{"r":39,"c":6},{"r":39,"c":7},{"r":40,"c":0},{"r":40,"c":1},{"r":40,"c":2},{"r":40,"c":3},{"r":40,"c":4},{"r":40,"c":5},{"r":40,"c":6},{"r":40,"c":7},{"r":41,"c":0,"cs":2,"v":"{{PIO}}","b":[2,0,0,0],"s":["Cambria",10.0,"b","center","bottom",0,0]},{"r":41,"c":2},{"r":41,"c":3},{"r":41,"c":4},{"r":41,"c":5},{"r":41,"c":6},{"r":41,"c":7},{"r":42,"c":0,"cs":2,"v":"{{PIOT}}","s":["Cambria",10.0,"","center","bottom",0,0]},{"r":42,"c":2},{"r":42,"c":3},{"r":42,"c":4},{"r":42,"c":5},{"r":42,"c":6},{"r":42,"c":7},{"r":43,"c":0,"cs":2},{"r":43,"c":2},{"r":43,"c":3},{"r":43,"c":4},{"r":43,"c":5,"cs":2,"v":"{{GOV}}","b":[2,0,0,0],"s":["Cambria",11.0,"b","center","bottom",0,0]},{"r":43,"c":7},{"r":44,"c":0},{"r":44,"c":1},{"r":44,"c":2},{"r":44,"c":3},{"r":44,"c":4},{"r":44,"c":5,"cs":2,"v":"{{GOVT}}","s":["Cambria",10.0,"","center","bottom",0,0]},{"r":44,"c":7},{"r":45,"c":0},{"r":45,"c":1},{"r":45,"c":2},{"r":45,"c":3},{"r":45,"c":4},{"r":45,"c":5},{"r":45,"c":6},{"r":45,"c":7},{"r":46,"c":0},{"r":46,"c":1},{"r":46,"c":2},{"r":46,"c":3},{"r":46,"c":4},{"r":46,"c":5},{"r":46,"c":6},{"r":46,"c":7},{"r":47,"c":0},{"r":47,"c":1},{"r":47,"c":2},{"r":47,"c":3},{"r":47,"c":4},{"r":47,"c":5},{"r":47,"c":6},{"r":47,"c":7}],"shapes":[]},"Travel Completed Cert":{"cols":[64,64,64,64,64,64,64,64,64,106],"rows":[19.3,19.3,19.3,19.3,19.3,19.3,19.3,20.7,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3,19.3],"cells":[{"r":0,"c":0},{"r":0,"c":1},{"r":0,"c":2},{"r":0,"c":3},{"r":0,"c":4},{"r":0,"c":5},{"r":0,"c":6},{"r":0,"c":7},{"r":0,"c":8},{"r":0,"c":9},{"r":1,"c":0},{"r":1,"c":1},{"r":1,"c":2},{"r":1,"c":3},{"r":1,"c":4},{"r":1,"c":5},{"r":1,"c":6},{"r":1,"c":7},{"r":1,"c":8},{"r":1,"c":9},{"r":2,"c":0,"cs":10,"v":" Republic of  the Philippines","s":["Arial",11.0,"","center","bottom",0,0]},{"r":3,"c":0,"cs":10,"v":"  Province of Camarines Norte","s":["Arial",11.0,"","center","bottom",0,0]},{"r":4,"c":0,"cs":10,"v":"D a e t","s":["Calibri",11.0,"","center","bottom",0,0]},{"r":5,"c":0},{"r":5,"c":1},{"r":5,"c":2},{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5},{"r":5,"c":6},{"r":5,"c":7},{"r":5,"c":8},{"r":5,"c":9},{"r":6,"c":0},{"r":6,"c":1},{"r":6,"c":2},{"r":6,"c":3},{"r":6,"c":4},{"r":6,"c":5},{"r":6,"c":6},{"r":6,"c":7},{"r":6,"c":8},{"r":6,"c":9},{"r":7,"c":0,"cs":10,"v":"   PROVINCIAL INFORMATION OFFICE","s":["Arial",12.0,"b","center","bottom",0,0]},{"r":8,"c":0},{"r":8,"c":1},{"r":8,"c":2},{"r":8,"c":3},{"r":8,"c":4},{"r":8,"c":5},{"r":8,"c":6},{"r":8,"c":7},{"r":8,"c":8},{"r":8,"c":9},{"r":9,"c":0},{"r":9,"c":1},{"r":9,"c":2},{"r":9,"c":3},{"r":9,"c":4},{"r":9,"c":5},{"r":9,"c":6},{"r":9,"c":7},{"r":9,"c":8},{"r":9,"c":9},{"r":10,"c":0,"cs":10,"v":" Appendix  B","s":["Arial",11.0,"","center","bottom",0,0]},{"r":11,"c":0,"cs":10,"v":" CERTIFICATE OF TRAVEL COMPLETED","s":["Arial",11.0,"b","center","bottom",0,0]},{"r":12,"c":0},{"r":12,"c":1},{"r":12,"c":2},{"r":12,"c":3},{"r":12,"c":4},{"r":12,"c":5},{"r":12,"c":6},{"r":12,"c":7},{"r":12,"c":8},{"r":12,"c":9},{"r":13,"c":0},{"r":13,"c":1},{"r":13,"c":2},{"r":13,"c":3},{"r":13,"c":4},{"r":13,"c":5},{"r":13,"c":6},{"r":13,"c":7},{"r":13,"c":8},{"r":13,"c":9},{"r":14,"c":0,"cs":3,"v":"{{SH}}","s":["Arial",11.0,"bu","center","bottom",0,0]},{"r":14,"c":3},{"r":14,"c":4},{"r":14,"c":5},{"r":14,"c":6},{"r":14,"c":7,"v":"                 {{SHT2}}","b":[0,0,1,0],"s":["Arial",11.0,"","left","bottom",0,0]},{"r":14,"c":8,"b":[0,0,1,0]},{"r":14,"c":9,"b":[0,0,1,0]},{"r":15,"c":0,"cs":3,"v":"{{SHT}}","s":["Arial",11.0,"","center","bottom",0,0]},{"r":15,"c":3},{"r":15,"c":4},{"r":15,"c":5},{"r":15,"c":6},{"r":15,"c":7,"v":"             Station  Head","s":["Arial",11.0,"","left","bottom",0,0]},{"r":15,"c":8},{"r":15,"c":9},{"r":16,"c":0},{"r":16,"c":1},{"r":16,"c":2},{"r":16,"c":3},{"r":16,"c":4},{"r":16,"c":5},{"r":16,"c":6},{"r":16,"c":7},{"r":16,"c":8},{"r":16,"c":9},{"r":17,"c":0},{"r":17,"c":1},{"r":17,"c":2},{"r":17,"c":3},{"r":17,"c":4},{"r":17,"c":5},{"r":17,"c":6},{"r":17,"c":7},{"r":17,"c":8},{"r":17,"c":9},{"r":18,"c":0,"v":"    ","s":["Calibri",11.0,"","left","bottom",0,0]},{"r":18,"c":1},{"r":18,"c":2},{"r":18,"c":3},{"r":18,"c":4},{"r":18,"c":5},{"r":18,"c":6},{"r":18,"c":7,"cs":3,"v":"{{CDATE}}","b":[0,0,1,0],"s":["Arial",11.0,"","center","middle",0,0]},{"r":19,"c":0},{"r":19,"c":1},{"r":19,"c":2},{"r":19,"c":3},{"r":19,"c":4},{"r":19,"c":5},{"r":19,"c":6},{"r":19,"c":7,"cs":3,"v":"   Date","b":[1,0,0,0],"s":["Arial",11.0,"","center","bottom",0,0]},{"r":20,"c":0},{"r":20,"c":1},{"r":20,"c":2},{"r":20,"c":3},{"r":20,"c":4},{"r":20,"c":5},{"r":20,"c":6},{"r":20,"c":7},{"r":20,"c":8},{"r":20,"c":9},{"r":21,"c":0,"cs":10,"v":"     I  hereby certify that I have completed the travel authorized in Itinerary of Travel to","s":["Arial",10.0,"","center","bottom",0,0]},{"r":22,"c":0,"cs":10,"v":"      {{DEST}} on {{PERIOD}}  under conditions indicated below:","s":["Arial",10.0,"","center","bottom",0,0]},{"r":23,"c":0},{"r":23,"c":1},{"r":23,"c":2},{"r":23,"c":3},{"r":23,"c":4},{"r":23,"c":5},{"r":23,"c":6},{"r":23,"c":7},{"r":23,"c":8},{"r":23,"c":9},{"r":24,"c":0},{"r":24,"c":1},{"r":24,"c":2,"v":"\u2713","b":[0,0,1,0],"s":["Arial",11.0,"","center","bottom",0,0]},{"r":24,"c":3},{"r":24,"c":4,"v":"Strictly in accordance with the approved Itinerary.","s":["Arial",10.0,"","left","bottom",0,0]},{"r":24,"c":5},{"r":24,"c":6},{"r":24,"c":7},{"r":24,"c":8},{"r":24,"c":9},{"r":25,"c":0},{"r":25,"c":1},{"r":25,"c":2},{"r":25,"c":3},{"r":25,"c":4},{"r":25,"c":5},{"r":25,"c":6},{"r":25,"c":7},{"r":25,"c":8},{"r":25,"c":9},{"r":26,"c":0},{"r":26,"c":1},{"r":26,"c":2,"b":[0,0,1,0]},{"r":26,"c":3},{"r":26,"c":4,"v":"Cut short as explained below. Additional itinerary submitted.","s":["Arial",10.0,"","left","bottom",0,0]},{"r":26,"c":5},{"r":26,"c":6},{"r":26,"c":7},{"r":26,"c":8},{"r":26,"c":9},{"r":27,"c":0},{"r":27,"c":1},{"r":27,"c":2},{"r":27,"c":3},{"r":27,"c":4},{"r":27,"c":5},{"r":27,"c":6},{"r":27,"c":7},{"r":27,"c":8},{"r":27,"c":9},{"r":28,"c":0},{"r":28,"c":1},{"r":28,"c":2,"b":[0,0,1,0]},{"r":28,"c":3},{"r":28,"c":4,"v":"Extended as explained below,  Additional itinerary submitted.","s":["Arial",10.0,"","left","bottom",0,0]},{"r":28,"c":5},{"r":28,"c":6},{"r":28,"c":7},{"r":28,"c":8},{"r":28,"c":9},{"r":29,"c":0},{"r":29,"c":1},{"r":29,"c":2},{"r":29,"c":3},{"r":29,"c":4},{"r":29,"c":5},{"r":29,"c":6},{"r":29,"c":7},{"r":29,"c":8},{"r":29,"c":9},{"r":30,"c":0},{"r":30,"c":1},{"r":30,"c":2,"b":[0,0,1,0]},{"r":30,"c":3},{"r":30,"c":4,"v":"Other deviations explained below.","s":["Arial",10.0,"","left","bottom",0,0]},{"r":30,"c":5},{"r":30,"c":6},{"r":30,"c":7},{"r":30,"c":8},{"r":30,"c":9},{"r":31,"c":0},{"r":31,"c":1},{"r":31,"c":2},{"r":31,"c":3},{"r":31,"c":4},{"r":31,"c":5},{"r":31,"c":6},{"r":31,"c":7},{"r":31,"c":8},{"r":31,"c":9},{"r":32,"c":0},{"r":32,"c":1},{"r":32,"c":2},{"r":32,"c":3},{"r":32,"c":4},{"r":32,"c":5},{"r":32,"c":6},{"r":32,"c":7},{"r":32,"c":8},{"r":32,"c":9},{"r":33,"c":0,"v":"          Explanations/Justifications:","s":["Calibri",11.0,"","left","bottom",0,0]},{"r":33,"c":1},{"r":33,"c":2},{"r":33,"c":3},{"r":33,"c":4,"cs":6,"b":[0,0,1,0]},{"r":34,"c":0},{"r":34,"c":1},{"r":34,"c":2},{"r":34,"c":3},{"r":34,"c":4,"b":[1,0,1,0]},{"r":34,"c":5,"b":[1,0,1,0]},{"r":34,"c":6,"b":[1,0,1,0]},{"r":34,"c":7,"b":[1,0,1,0]},{"r":34,"c":8,"b":[1,0,1,0]},{"r":34,"c":9,"b":[1,0,1,0]},{"r":35,"c":0},{"r":35,"c":1},{"r":35,"c":2},{"r":35,"c":3},{"r":35,"c":4,"b":[1,0,1,0]},{"r":35,"c":5,"b":[1,0,1,0]},{"r":35,"c":6,"b":[1,0,1,0]},{"r":35,"c":7,"b":[1,0,1,0]},{"r":35,"c":8,"b":[1,0,1,0]},{"r":35,"c":9,"b":[1,0,1,0]},{"r":36,"c":0},{"r":36,"c":1},{"r":36,"c":2},{"r":36,"c":3},{"r":36,"c":4},{"r":36,"c":5},{"r":36,"c":6},{"r":36,"c":7},{"r":36,"c":8},{"r":36,"c":9},{"r":37,"c":0,"v":"          Evidence of travel hereto attached:   ","s":["Calibri",11.0,"","left","bottom",0,0]},{"r":37,"c":1},{"r":37,"c":2},{"r":37,"c":3},{"r":37,"c":4},{"r":37,"c":5},{"r":37,"c":6},{"r":37,"c":7},{"r":37,"c":8},{"r":37,"c":9},{"r":38,"c":0},{"r":38,"c":1},{"r":38,"c":2},{"r":38,"c":3},{"r":38,"c":4,"v":"Approved Travel Order dated {{PERIOD}}","b":[0,0,1,0],"s":["Arial",9.0,"","left","bottom",0,0]},{"r":38,"c":5,"b":[0,0,1,0]},{"r":38,"c":6,"b":[0,0,1,0]},{"r":38,"c":7,"b":[0,0,1,0]},{"r":38,"c":8,"b":[0,0,1,0]},{"r":38,"c":9,"b":[0,0,1,0]},{"r":39,"c":0},{"r":39,"c":1},{"r":39,"c":2},{"r":39,"c":3},{"r":39,"c":4,"v":"with Certificate of Appearance and approved itinerary of travel","b":[0,0,1,0],"s":["Arial",10.0,"","left","bottom",0,0]},{"r":39,"c":5,"b":[1,0,1,0]},{"r":39,"c":6,"b":[0,0,1,0]},{"r":39,"c":7,"b":[0,0,1,0]},{"r":39,"c":8,"b":[0,0,1,0]},{"r":39,"c":9,"b":[0,0,1,0]},{"r":40,"c":0},{"r":40,"c":1},{"r":40,"c":2},{"r":40,"c":3},{"r":40,"c":4,"v":"below dated {{IDATE}}","b":[0,0,1,0],"s":["Arial",10.0,"","left","bottom",0,0]},{"r":40,"c":5,"b":[1,0,1,0]},{"r":40,"c":6,"b":[0,0,1,0]},{"r":40,"c":7,"b":[0,0,1,0]},{"r":40,"c":8,"b":[0,0,1,0]},{"r":40,"c":9,"b":[0,0,1,0]},{"r":41,"c":0},{"r":41,"c":1},{"r":41,"c":2},{"r":41,"c":3},{"r":41,"c":4,"b":[1,0,1,0]},{"r":41,"c":5,"b":[1,0,1,0]},{"r":41,"c":6,"b":[1,0,1,0]},{"r":41,"c":7,"b":[1,0,1,0]},{"r":41,"c":8,"b":[1,0,1,0]},{"r":41,"c":9,"b":[1,0,1,0]},{"r":42,"c":0},{"r":42,"c":1},{"r":42,"c":2},{"r":42,"c":3},{"r":42,"c":4},{"r":42,"c":5},{"r":42,"c":6},{"r":42,"c":7},{"r":42,"c":8},{"r":42,"c":9},{"r":43,"c":0},{"r":43,"c":1},{"r":43,"c":2},{"r":43,"c":3},{"r":43,"c":4},{"r":43,"c":5},{"r":43,"c":6},{"r":43,"c":7},{"r":43,"c":8},{"r":43,"c":9},{"r":44,"c":0},{"r":44,"c":1},{"r":44,"c":2},{"r":44,"c":3},{"r":44,"c":4},{"r":44,"c":5},{"r":44,"c":6,"v":"Respectfully submitted:","s":["Arial",10.0,"","left","bottom",0,0]},{"r":44,"c":7},{"r":44,"c":8},{"r":44,"c":9},{"r":45,"c":0},{"r":45,"c":1},{"r":45,"c":2},{"r":45,"c":3},{"r":45,"c":4},{"r":45,"c":5},{"r":45,"c":6},{"r":45,"c":7},{"r":45,"c":8},{"r":45,"c":9},{"r":46,"c":0},{"r":46,"c":1},{"r":46,"c":2},{"r":46,"c":3},{"r":46,"c":4},{"r":46,"c":5},{"r":46,"c":6},{"r":46,"c":7},{"r":46,"c":8},{"r":46,"c":9},{"r":47,"c":0},{"r":47,"c":1},{"r":47,"c":2},{"r":47,"c":3},{"r":47,"c":4},{"r":47,"c":5,"cs":4,"v":"{{NAME}}","s":["Arial",11.0,"bu","center","bottom",0,0]},{"r":47,"c":9},{"r":48,"c":0},{"r":48,"c":1},{"r":48,"c":2},{"r":48,"c":3},{"r":48,"c":4},{"r":48,"c":5,"cs":4,"v":"{{POS}}","s":["Arial",10.0,"","center","bottom",0,0]},{"r":48,"c":9},{"r":49,"c":0},{"r":49,"c":1},{"r":49,"c":2},{"r":49,"c":3},{"r":49,"c":4},{"r":49,"c":5},{"r":49,"c":6},{"r":49,"c":7},{"r":49,"c":8},{"r":49,"c":9},{"r":50,"c":0},{"r":50,"c":1},{"r":50,"c":2},{"r":50,"c":3},{"r":50,"c":4},{"r":50,"c":5},{"r":50,"c":6},{"r":50,"c":7},{"r":50,"c":8},{"r":50,"c":9},{"r":51,"c":0},{"r":51,"c":1,"v":"On evidence and  information of which I have knowledge, the travel was actually undertaken.","s":["Arial",10.0,"","left","bottom",0,0]},{"r":51,"c":2},{"r":51,"c":3},{"r":51,"c":4},{"r":51,"c":5},{"r":51,"c":6},{"r":51,"c":7},{"r":51,"c":8},{"r":51,"c":9},{"r":52,"c":0},{"r":52,"c":1},{"r":52,"c":2},{"r":52,"c":3},{"r":52,"c":4},{"r":52,"c":5},{"r":52,"c":6},{"r":52,"c":7},{"r":52,"c":8},{"r":52,"c":9},{"r":53,"c":0},{"r":53,"c":1},{"r":53,"c":2},{"r":53,"c":3},{"r":53,"c":4},{"r":53,"c":5},{"r":53,"c":6},{"r":53,"c":7},{"r":53,"c":8},{"r":53,"c":9},{"r":54,"c":0},{"r":54,"c":1},{"r":54,"c":2},{"r":54,"c":3},{"r":54,"c":4},{"r":54,"c":5},{"r":54,"c":6},{"r":54,"c":7},{"r":54,"c":8},{"r":54,"c":9},{"r":55,"c":0},{"r":55,"c":1},{"r":55,"c":2},{"r":55,"c":3},{"r":55,"c":4},{"r":55,"c":5,"cs":5,"v":"{{GOV}}","s":["Arial",11.0,"bu","center","bottom",0,0]},{"r":56,"c":0},{"r":56,"c":1},{"r":56,"c":2},{"r":56,"c":3},{"r":56,"c":4},{"r":56,"c":5,"cs":5,"v":"{{GOVT}}","s":["Arial",10.0,"","center","bottom",0,0]},{"r":57,"c":0},{"r":57,"c":1},{"r":57,"c":2},{"r":57,"c":3},{"r":57,"c":4},{"r":57,"c":5},{"r":57,"c":6,"v":"    ","s":["Arial",10.0,"","left","bottom",0,0]},{"r":57,"c":7},{"r":57,"c":8},{"r":57,"c":9}],"shapes":[]}};

/* =====================================================================
   TEV forms drawn from the office Excel file (column widths, row heights,
   fonts, borders and merged cells copied from the workbook)
   ===================================================================== */
function xlSheet(name, T, rep){
  var sp = TEV_SHEETS[name], cols = sp.cols, rows = sp.rows.slice(), cells = sp.cells.slice(), shapes = sp.shapes || [];
  if (rep && rep.n > 1){
    var R = rep.row, extra = rep.n - 1;
    var add = []; for (var k = 0; k < extra; k++) add.push(rows[R]);
    rows = rows.slice(0, R + 1).concat(add, rows.slice(R + 1));
    var out = [];
    cells.forEach(function(c){
      if (c.r < R) out.push(c);
      else if (c.r === R){ for (var k = 0; k < rep.n; k++) out.push(Object.assign({}, c, { r: R + k, k: k })); }
      else out.push(Object.assign({}, c, { r: c.r + extra }));
    });
    cells = out;
  }
  var BW = ['', '1px solid #000', '1.5px solid #000', '2px solid #000', '3px double #000'];
  function val(c){
    var T2 = (rep && c.k != null) ? Object.assign({}, T, rep.rows[c.k]) : (rep && c.r === rep.row ? Object.assign({}, T, rep.rows[0]) : T);
    return esc(c.v || '').replace(/\{\{(\w+)\}\}/g, function(m, key){ var x = T2[key]; return x == null ? '' : (x && x.html != null ? x.html : esc(x)); });
  }
  var byRow = {}; cells.forEach(function(c){ (byRow[c.r] = byRow[c.r] || []).push(c); });
  var at = {}; cells.forEach(function(c){ at[c.r + ':' + c.c] = c; });
  // how far a cell's text may spill (like Excel: into empty cells, never across a line or into text)
  function side(c, dir){
    if (c.s[5]) return 0;
    var w = 0, k = dir > 0 ? c.c + (c.cs || 1) : c.c - 1, b = c.b || [0, 0, 0, 0];
    if (dir > 0 ? b[1] : b[3]) return 0;
    while (k >= 0 && k < cols.length){
      var n = at[c.r + ':' + k]; if (!n || n.v || n.rs || n.cs) break; var nb = n.b || [0, 0, 0, 0];
      if (dir > 0 ? nb[3] : nb[1]) break;
      w += cols[k]; if (dir > 0 ? nb[1] : nb[3]) break; k += dir;
    }
    return w;
  }
  function room(c){ var a = c.s[3]; if (a === 'left') return side(c, 1); if (a === 'right') return side(c, -1); return 2 * Math.min(side(c, 1), side(c, -1)); }
  var W = cols.reduce(function(a, b){ return a + b; }, 0), H = rows.reduce(function(a, b){ return a + b; }, 0);
  var h = '<table class="xl" style="width:' + W + 'px"><colgroup>' + cols.map(function(w){ return '<col style="width:' + w + 'px">'; }).join('') + '</colgroup>';
  rows.forEach(function(rh, r){
    h += '<tr style="height:' + rh + 'px">';
    (byRow[r] || []).sort(function(a, b){ return a.c - b.c; }).forEach(function(c){
      var st = [], s = c.s, b = c.b || [0, 0, 0, 0];
      if (s){
        st.push("font-family:'" + s[0] + "'," + (/arial/i.test(s[0]) ? 'Arial,sans-serif' : /calibri/i.test(s[0]) ? 'Carlito,sans-serif' : 'Cambria,Georgia,serif'));
        st.push('font-size:' + s[1] + 'pt');
        if (s[2].indexOf('b') >= 0) st.push('font-weight:bold'); if (s[2].indexOf('i') >= 0) st.push('font-style:italic');
        if (s[2].indexOf('u') >= 0) st.push('text-decoration:underline'); if (s[2].indexOf('d') >= 0) st.push('text-decoration:underline double');
        st.push('text-align:' + s[3]); st.push('vertical-align:' + s[4]); st.push('white-space:' + (s[5] ? 'pre-wrap' : 'pre'));
        if (s[6]) st.push('padding-left:' + (s[6] * 9 + 2) + 'px');
      }
      ['top', 'right', 'bottom', 'left'].forEach(function(side, i){ if (b[i]) st.push('border-' + side + ':' + BW[b[i]]); });
      var cls = (s && c.v) ? ' class="fit" data-room="' + room(c) + '"' : '';
      h += '<td' + cls + (c.rs ? ' rowspan="' + c.rs + '"' : '') + (c.cs ? ' colspan="' + c.cs + '"' : '') + ' style="' + st.join(';') + '"><span class="v">' + val(c) + '</span></td>';
    });
    h += '</tr>';
  });
  h += '</table>';
  shapes.forEach(function(x){ h += '<div class="xs" style="left:' + x[0] + 'px;top:' + x[1] + 'px;width:' + x[2] + 'px;height:' + x[3] + 'px">' + esc(x[4]) + '</div>'; });
  return '<div class="xlw" style="width:' + W + 'px;min-height:' + H + 'px">' + h + '</div>';
}
tevDocHtml = function(t, people, forms, dPrep, dCert, opts){
  opts = opts || {};
  var cfg = tevCfg(), sg = cfg.sign, cd = cfg.codes, tr = tripOf(t), dest = t.destination || '';
  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var ABB = ['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  function P(d){ return { y: +d.slice(0, 4), m: +d.slice(5, 7) - 1, d: +d.slice(8, 10) }; }
  function rng(a, b, short){
    var M = short ? ABB : MON, x = P(a), y = P(b || a);
    if (a === (b || a)) return M[x.m] + ' ' + x.d + ', ' + x.y;
    if (x.y === y.y && x.m === y.m) return M[x.m] + ' ' + x.d + '-' + y.d + ', ' + x.y;
    if (x.y === y.y) return M[x.m] + ' ' + x.d + '-' + M[y.m] + ' ' + y.d + ', ' + x.y;
    return M[x.m] + ' ' + x.d + ', ' + x.y + '-' + M[y.m] + ' ' + y.d + ', ' + y.y;
  }
  function money(n){ return (Number(n) || 0) ? (Number(n)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }
  function tm(x){ if (!x) return ''; var h = +x.slice(0, 2), m = x.slice(3); return (h % 12 || 12) + ':' + m + (h < 12 ? ' am' : 'pm'); }
  var calcs = people.map(function(v){ return { v: v, c: tevCalc(t, v), r: tevRule(v) }; });
  var sum = { transpo: 0, lodging: 0, food: 0, other: 0, total: 0 };
  calcs.forEach(function(x){ ['transpo','lodging','food','other','total'].forEach(function(k){ sum[k] += x.c[k]; }); });
  var period = rng(t.dateFrom, t.dateTo || t.dateFrom), purpose = String(t.event || '').replace(/[.\s]+$/, '') + (dest ? ' at ' + dest : '') + '.';
  var payee = calcs.length === 1 ? calcs[0].v.name : calcs[0].v.name + ' AND ' + (calcs.length - 1) + ' OTHER' + (calcs.length > 2 ? 'S' : '');
  var base = { PIO: sg.pio[0], PIOT: sg.pio[1], GOV: sg.gov[0], GOVT: sg.gov[1], PERIOD: period, PURPOSE: purpose, DEST: dest };
  var pages = [];
  function page(name, T, kind, rep){ pages.push('<section class="pg' + (kind ? ' ' + kind : '') + '">' + xlSheet(name, Object.assign({}, base, T), rep) + '</section>'); }

  if (forms.itin) calcs.forEach(function(x){
    var c = x.c, rows = c.rows, n = rows.length, T = { DATE: rng(dPrep, dPrep), NAME: x.v.name, POS: x.r.pos || x.r.et, STATION: cd.station, DEP: tm(tr.dep), ARR: tm(tr.arr),
      MEANS: tr.gov ? 'Government Vehicle' : 'Public/Private Vehicle', TT: money(c.transpo), TA: money(rows.reduce(function(s, r){ return s + r.amt; }, 0)), TS: money(c.total) };
    T.D1 = rng(rows[0].date, rows[0].date, true); T.P1 = 'Station to ' + dest + (n === 1 ? ' and back' : ''); T.A1 = money(rows[0].amt); T.S1 = money(rows[0].amt + c.transpo); T.T1 = c.transpo ? money(c.transpo) : '';
    if (n === 1){ T.ARR = ''; T.D3 = ''; T.A2 = T.S2 = T.A3 = T.S3 = ''; T.D1 = rng(rows[0].date, rows[0].date, true); T.P3 = ''; T.ARR1 = tm(tr.arr); }
    else {
      var mid = rows.slice(1).reduce(function(s, r){ return s + r.amt; }, 0);
      T.D2 = rng(rows[1].date, rows[n - 1].date, true); T.P2 = dest; T.A2 = money(mid); T.S2 = money(mid);
      T.D3 = rng(rows[n - 1].date, rows[n - 1].date, true); T.P3 = dest + ' to Station'; T.A3 = ''; T.S3 = '';
    }
    page('Sarah', T);
  });
  if (forms.payroll){
    var reps = calcs.map(function(x, i){ return { I: String(i + 1), NAME: x.v.name, POS: x.r.pos || x.r.et, DAYS: String(x.c.rows.length), TR: x.c.transpo ? money(x.c.transpo) : '', LO: x.c.lodging ? money(x.c.lodging) : '', ME: money(x.c.food), IN: x.c.other ? money(x.c.other) : '', NET: money(x.c.total) }; });
    page('PAYROLL', { AGENCY: cd.agency, PERIOD: period.toUpperCase(), TTR: sum.transpo ? money(sum.transpo) : '', TLO: money(sum.lodging), TME: money(sum.food), TIN: money(sum.other), TNET: money(sum.total), APP: sg.payroll[0], APPT: sg.payroll[1] }, 'long', { row: 8, n: reps.length, rows: reps });
  }
  if (forms.dv){
    var one = calcs.length === 1 ? calcs[0].c : null;
    var T = { PAYEE: payee, ADDR: cd.address, RC: cd.rc, AMT: money(sum.total), ACC: sg.acct[0], ACCT: sg.acct[1], TRE: sg.treas[0], TRET: sg.treas[1],
      EXP1: { html: 'TO PAYMENT for the above named Payee' + (calcs.length > 1 ? 's' : '') + ' for the reimbursement of ' + (calcs.length > 1 ? 'their' : 'his/her') + ' Travelling Expenses incurred on <b>' + esc(period) + '</b> at <b>' + esc(dest) + '</b> as per supporting papers hereto attached &nbsp;amounting to' },
      EXP2: { html: '<b>' + esc(pesoWords(sum.total)) + ' only………</b>' } };
    if (one) Object.assign(T, { ALLOWH: 'ALLOWABLE ALLOWANCES', LT: 'Trans', LL: 'Lodging', LM: 'Meal', LI: 'Incidental', VT: money(one.transpo), VL: money(one.lodging), VM: money(one.food), VI: money(one.other),
      NT: '(to ' + dest + ')', NL: '(' + one.nights + ' night' + (one.nights === 1 ? '' : 's') + ')', NM: '(' + money(one.rt.meal) + '/meal X ' + one.meals + ')', NI: '(' + money(one.rt.inc) + '/day X ' + one.incDays + ' days)',
      LTOT: 'TOTAL:', VTOT: money(one.total), CERTH: 'CERTIFIED:', CERTB: 'Each person whose name appears on this roll  rendered service for the time stated', CPIO: sg.pio[0], CPIOT: sg.pio[1] });
    page('DV', T);
  }
  if (forms.or) page('OR', { PAYEE: payee, OFFICE: cd.office, ADDR2: 'Daet Camarines Norte', RC: cd.rc, WHEN: period + ' at ' + dest + '.', FPP: cd.fpp, ACCT: cd.acct, AMT: money(sum.total), BUD: sg.budget[0], BUDT: sg.budget[1], DLINE: { html: '<span style="display:inline-block;width:92px;border-bottom:1px solid #000">&nbsp;</span>' } });
  if (forms.cert) calcs.forEach(function(x){
    page('Travel Completed Cert', { SH: sg.gov[0], SHT: sg.gov[1], SHT2: sg.gov[1], CDATE: rng(dCert, dCert), IDATE: rng(dPrep, dPrep), NAME: x.v.name, POS: x.r.pos || x.r.et, GOV: sg.gov[0] });
  });
  if (forms.jocert){ var jo = calcs.filter(function(x){ return x.r.et === 'JO'; }); if (jo.length) pages.push(joCertHtml(t, jo.map(function(x){ return x.v.name; }), opts.pron, sg)); }
  var base = location.href.replace(/[#?].*$/, '').replace(/[^\/]*$/, '');
  return '<!doctype html><html><head><meta charset="utf-8"><base href="' + base + '"><title>TEV · ' + esc(t.event) + '</title><style>' +
    (forms.payroll && Object.keys(forms).length === 1 ? '@page{size:13in 8.5in;margin:10mm 8mm}' : '@page{size:A4 portrait;margin:10mm 15mm 12mm}') + '@page land{size:A4 landscape;margin:12mm 8mm 10mm}@page long{size:13in 8.5in;margin:10mm 8mm}' +
    'html,body{margin:0}body{color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pg{page-break-after:always;break-after:page;break-inside:avoid;position:relative}.pg:last-child{page-break-after:auto;break-after:auto}' +
    '.pg.land{page:land}.pg.long{page:long}@page cot{size:A4 portrait;margin:0}.pg.cot{page:cot}' + JO_CERT_CSS +
    '.xlw{position:relative;margin:0 auto}.xl{border-collapse:collapse;table-layout:fixed}.xl td{padding:0 3px;line-height:1.15;overflow:visible}.xl td>.v{display:block}' +
    '.xs{position:absolute;border:1px solid #000;background:#fff;box-sizing:border-box;text-align:center;font:10pt Arial,sans-serif;display:flex;align-items:center;justify-content:center}' +
    '</style></head><body>' + pages.join('') +
    // scale each form to fill the printable width of A4, like Excel's "fit to page"
    '<script>(function(){var mm=96/25.4;document.querySelectorAll(".pg:not(.cot)").forEach(function(p){var k=p.classList.contains("long")?[314,195]:p.classList.contains("land")?[279,184]:[178,270],w=p.firstChild,z=Math.min(k[0]*mm/w.offsetWidth,k[1]*mm/w.offsetHeight);w.style.zoom=z;});document.querySelectorAll("td.fit").forEach(function(td){var f=parseFloat(getComputedStyle(td).fontSize),n=0;var r=+td.dataset.room||0,sp=td.firstChild;while(sp.scrollWidth>sp.clientWidth+r+1&&n++<20){f*=0.95;td.style.fontSize=f+"px";}});})();<\/script></body></html>';
};

/* Certification for Job Order staff (cot-template.docx): letterhead like the travel order, Maiandra GD 12 pt, 1.15 lines, 1-inch margins */
var JO_CERT_CSS = '.cotw{position:relative;width:210mm;height:296mm;overflow:hidden;font-family:"Maiandra GD","Century Gothic","Segoe UI",Arial,sans-serif;font-size:12pt}' +
  '.cotw .hdr{position:absolute;left:1.59mm;top:0;width:216mm;height:48.47mm}.cotw .wm{position:absolute;left:4.25mm;top:19.5mm;width:201.5mm;height:201.6mm;opacity:.05}' +
  '.cotw .ftr{position:absolute;left:3.35mm;top:266.9mm;width:203.3mm;height:29.11mm}' +
  '.cotw .body{position:absolute;left:25.4mm;top:36.6mm;width:159.2mm}' +
  '.cotw p{margin:0 0 2.82mm;line-height:5.85mm}.cotw .t{font-size:14pt;font-weight:bold;text-align:center;line-height:6.3mm}.cotw .e{min-height:5.85mm}' +
  '.cotw .j{text-align:justify;text-indent:12.7mm}.cotw .sg{margin:0;text-align:center;font-size:13pt;line-height:6.3mm}';
function sentenceName(n){
  return String(n).toLowerCase().replace(/(^|[\s\-.'(])([a-z\u00f1])/g, function(m, a, b){ return a + b.toUpperCase(); }).replace(/\b(Ii|Iii|Iv)\b/g, function(m){ return m.toUpperCase(); });
}
function joinNames(a){ return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function ordinal(d){ var v = d % 100; return d + ((v > 10 && v < 14) ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th'); }
function joCertHtml(t, names, pron, sg){
  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var many = names.length > 1; pron = many ? 'they' : (pron || 'he');
  var ev = String(t.event || '').replace(/[.\s]+$/, ''); ev = ev.replace(/^To\b/, 'to');
  var what = ev + (t.destination && ev.toLowerCase().indexOf(String(t.destination).split(',')[0].trim().toLowerCase()) < 0 ? ' at ' + t.destination : '');
  var a = t.dateFrom, b = t.dateTo || t.dateFrom, x = { y: +a.slice(0, 4), m: +a.slice(5, 7) - 1, d: +a.slice(8, 10) }, y = { y: +b.slice(0, 4), m: +b.slice(5, 7) - 1, d: +b.slice(8, 10) };
  var when = a === b ? MON[x.m] + ' ' + x.d + ', ' + x.y : (x.y === y.y && x.m === y.m) ? MON[x.m] + ' ' + x.d + '-' + y.d + ', ' + x.y : (x.y === y.y) ? MON[x.m] + ' ' + x.d + '-' + MON[y.m] + ' ' + y.d + ', ' + x.y : MON[x.m] + ' ' + x.d + ', ' + x.y + '-' + MON[y.m] + ' ' + y.d + ', ' + y.y;
  var body = '<p class="t">CERTIFICATION</p><p class="e" style="line-height:5.3mm;min-height:5.3mm"></p>' +
    '<p>TO WHOM IT MAY CONCERN:</p><p class="e"></p>' +
    '<p class="j">THIS IS TO CERTIFY that due to non-availability of regular/permanent employee <b>' + esc(what) + '</b> on <b>' + esc(when) + '</b>, <b>' + esc(joinNames(names.map(sentenceName))) + ',</b> Job Order' + (many ? 's' : '') + ' of this office ' + (many ? 'were' : 'was') + ' allowed to undertake said tasks.</p>' +
    '<p class="j">Certifying further that ' + pron + ' ' + (pron === 'they' ? 'are' : 'is') + ' allowed for reimbursable expenses covering meal allowance to the usual accounting and auditing rules and regulations chargeable to Travelling Expenses.</p>' +
    '<p class="j">Issued this ' + ordinal(x.d) + ' day of ' + MON[x.m] + ' ' + x.y + ' at Daet, Camarines Norte.</p>' +
    '<p class="e"></p><p class="e"></p><p class="sg"><b>' + esc(sg.pio[0]) + '</b></p><p class="sg">' + esc(sg.pio[1]) + '</p>';
  return '<section class="pg cot"><div class="cotw"><img class="hdr" src="to-header.png" alt=""><img class="wm" src="to-watermark.jpg" alt=""><img class="ftr" src="to-footer.png" alt=""><div class="body">' + body + '</div></div></section>';
}

/* =====================================================================
   Activity log: colour by meaning, and a detail view drawn as a flowchart
   ===================================================================== */
var ACT_KINDS = {
  add:    { label: 'Added or filed',       ic: 'plus' },
  ok:     { label: 'Approved or done',     ic: 'check' },
  edit:   { label: 'Changed',              ic: 'edit' },
  del:    { label: 'Removed or rejected',  ic: 'trash' },
  acct:   { label: 'Account and security', ic: 'key' }
};
function actKind(a){
  var s = String(a.action || '');
  if (/PIN|role|account|backup/i.test(s) && !/Deactivated|Removed an account/i.test(s)) return 'acct';
  if (/^(Deleted|Removed|Rejected|Deactivated)/i.test(s) || /Status: Cancelled/.test(a.details || '')) return 'del';
  if (/^(Approved|Claimed|Added a confirmed|Recorded offset use)/i.test(s) || (/^Updated a travel order/.test(s) && /Status: Prepared/.test(a.details || ''))) return 'ok';
  if (/^(Added|Logged|Filed|Recorded|Requested)/i.test(s)) return 'add';
  return 'edit';
}
activityRow = function(a){
  var tgt = a.target && userOf(a.target) ? userName(a.target) : a.target, k = actKind(a);
  return '<li class="row tap" data-act="actDetail" tabindex="0" title="Tap to show the full text"><span class="mark ak-' + k + '" title="' + esc(ACT_KINDS[k].label) + '">' + ic(ACT_KINDS[k].ic) + '</span><div class="body"><div class="t">' + esc(userName(a.actor)) + ' · ' + esc(String(a.action || '').toLowerCase()) + (tgt && a.target !== a.actor ? ' · ' + esc(tgt) : '') + '</div><div class="m">' + esc(a.details) + '</div></div><span class="hint" title="' + esc(when(a.at)) + '">' + ago(a.at) + '</span></li>';
};
function actLegend(){
  var cur = S.actKind || '', n = {}; S.activity.forEach(function(a){ var k = actKind(a); n[k] = (n[k] || 0) + 1; });
  return '<div class="ak-chips" role="group" aria-label="Show">' + '<button class="chip" data-act="actKind" data-k="" aria-pressed="' + !cur + '">All</button>' +
    Object.keys(ACT_KINDS).map(function(k){ return '<button class="chip" data-act="actKind" data-k="' + k + '" aria-pressed="' + (cur === k) + '"><i class="ak-dot ak-' + k + '"></i>' + ACT_KINDS[k].label + (n[k] ? ' · ' + n[k] : '') + '</button>'; }).join('') + '</div>';
}
function actList(){ var k = S.actKind || ''; return S.activity.filter(function(a){ return !k || actKind(a) === k; }); }
document.addEventListener('click', function(ev){
  var c = ev.target.closest('[data-act="actKind"]'); if (c){ S.actKind = c.dataset.k; render(); return; }
  var r = ev.target.closest('[data-act="actDetail"]'); if (r) r.classList.toggle('open');
});
(function(){
  var css = '.mark.ak-add,.ak-dot.ak-add{background:var(--brand-soft);color:var(--brand-strong)}.mark.ak-ok,.ak-dot.ak-ok{background:var(--navy-soft);color:var(--navy)}' +
    '.mark.ak-edit,.ak-dot.ak-edit{background:var(--gold-soft);color:var(--gold)}.mark.ak-del,.ak-dot.ak-del{background:var(--red-soft);color:var(--red)}.mark.ak-acct,.ak-dot.ak-acct{background:var(--violet-soft);color:var(--violet)}' +
    '.ak-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:14px;font-size:12px;color:var(--muted)}.ak-legend span{display:inline-flex;align-items:center;gap:6px}.ak-dot{width:10px;height:10px;border-radius:50%;display:inline-block;box-shadow:inset 0 0 0 2px currentColor}' +
    '.ak-chips{display:flex;flex-wrap:wrap;gap:6px;padding:12px 0 4px}.ak-chips .chip{display:inline-flex;align-items:center;gap:6px}.ak-chips .chip[aria-pressed=true]{background:var(--ink);color:var(--surface);border-color:var(--ink)}' +
    '.row[data-act=actDetail] .m,.row[data-act=actDetail] .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row[data-act=actDetail].open .m,.row[data-act=actDetail].open .t{white-space:normal;overflow:visible}' +
    '.to-icons{flex-wrap:wrap}.to-icons .btn{flex:0 0 auto}.dash-foot{display:flex;justify-content:center;margin:18px 0 4px}.mine .go{display:inline-flex;align-items:center;gap:4px;font-weight:600;font-size:13px}.mine .k{display:inline-flex;align-items:center;gap:6px}' +
    '@media (max-width:560px){.tile .k{white-space:nowrap;letter-spacing:.02em;font-size:11px;gap:6px}.tile .k .ib{width:22px;height:22px}.tile .k .go{margin-left:auto}}' + '.is-saving .btn,.is-saving .icon-btn,.row.is-saving .tevq{opacity:.55;pointer-events:none}.sync-pill.done{background:var(--brand-strong);color:#fff}' + '.to-mini .to-date{flex:none}.to-mini .m{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

