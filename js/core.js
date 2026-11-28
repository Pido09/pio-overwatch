/* PIO Overwatch · core.js · loaded in order by index.html (core, views, events, documents, data, app). */
var LOGO = 'pio-logo.webp';
var API = (window.PIO_API_URL || '').trim();
var FIRE = !!(window.PIO_FIREBASE && window.PIO_FIREBASE.apiKey && window.PIO_FIREBASE.projectId);
var LIVE = FIRE || /^https:\/\/script\.google\.com\//.test(API);
var S = { token: null, me: null, users: [], entries: [], divisions: [], holidays: [], activity: [], travelOrders: [], events: [], inventory: [], tasks: [], pubs: [], pubItems: [], pubVotes: [], leaves: [], credits: [], board: [], availDate: null, toFilter: 'upcoming', toMine: false,
          settings: { workdays: 22, carryCap: 0 }, view: 'dashboard', cal: null, mon: null, calUser: 'all', selDay: null,
          dashDiv: 'all', rf: { user: 'all', div: 'all', type: 'all', status: 'all' }, recTab: 'entries', holYear: null,
          needsSetup: false, prefill: null, loadedAt: 0 };

/* ---------- storage ---------- */
function sGet(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }
function sSet(k,v){ try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch(e){} }
function lGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
/* Appearance: Auto (follow the device), Light or Dark. Applied right away, before the first screen draws. */
function themePref(){ var t = null; try { t = localStorage.getItem('pio_theme'); } catch(e){} return t === 'light' || t === 'dark' ? t : 'auto'; }
function applyTheme(t){
  var root = document.documentElement; if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  var dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', dark ? '#0B1310' : '#0B4A25');
}
applyTheme(themePref());
if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ applyTheme(themePref()); }); } catch(e){}
/* light / dark: the new look spreads out in a circle from where you tapped */
function themeSwitch(t, x, y){
  var before = document.documentElement.getAttribute('data-theme') || '', dark0 = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var willDark = t === 'dark' || (t === 'auto' && dark0), wasDark = before === 'dark' || (!before && dark0);
  if (!document.startViewTransition || lessMotion() || willDark === wasDark){ applyTheme(t); return; }
  x = x || window.innerWidth / 2; y = y || window.innerHeight / 2;
  var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.classList.add('vt-theme');
  var vt = document.startViewTransition(function(){ applyTheme(t); });
  vt.ready.then(function(){ document.documentElement.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }); }).catch(function(){});
  var clr = function(){ document.documentElement.classList.remove('vt-theme'); }; vt.finished.finally(clr); setTimeout(clr, 1500);   // never left on if the page stops drawing
}
function themePick(){ var t = themePref();
  return '<div class="themepick" role="group" aria-label="Appearance">' + [['auto', 'Auto', 'sliders'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']].map(function(x){
    return '<button type="button" data-act="setTheme" data-t="' + x[0] + '" aria-pressed="' + (t === x[0]) + '" title="' + (x[0] === 'auto' ? 'Follow this device' : x[1] + ' mode') + '">' + ic(x[2]) + '<span>' + x[1] + '</span></button>'; }).join('') + '</div>'; }
document.addEventListener('click', function(ev){ var b = ev.target.closest('[data-act="setTheme"]'); if (!b) return;
  try { if (b.dataset.t === 'auto') localStorage.removeItem('pio_theme'); else localStorage.setItem('pio_theme', b.dataset.t); } catch(e){}
  themeSwitch(b.dataset.t, ev.clientX, ev.clientY); document.querySelectorAll('[data-act="setTheme"]').forEach(function(x){ x.setAttribute('aria-pressed', String(x.dataset.t === b.dataset.t)); }); });
function sideMini(){ try { return localStorage.getItem('pio_side') === 'mini'; } catch(e){ return false; } }
try { if (localStorage.getItem('pio_side') === 'mini') document.documentElement.classList.add('side-mini'); } catch(e){}
document.addEventListener('click', function(ev){ var t = ev.target.closest('[data-act="sideMini"]'); if (!t) return;
  var on = !document.documentElement.classList.contains('side-mini'); document.documentElement.classList.toggle('side-mini', on); lSet('pio_side', on ? 'mini' : null);
  t.setAttribute('aria-expanded', String(!on)); t.setAttribute('aria-label', on ? 'Expand menu' : 'Collapse menu'); });
function lSet(k,v){ try {v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e){} }
function remembered(){ return lGet('pio_tok') != null; }
function saveSession(token, remember){
  if (remember){ lSet('pio_tok', token); sSet('pio_tok', null); }
  else { sSet('pio_tok', token); lSet('pio_tok', null); lSet('pio_cache', null); }
}
function clearSession(){ lSet('pio_tok', null); sSet('pio_tok', null); lSet('pio_cache', null); }

/* ---------- utilities ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* Speed: making a date formatter is slow and these run thousands of times per screen, so one formatter is
   reused per format, and today's date is remembered for a second (it still turns over at midnight). */
var TODAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }), TODAY_AT = 0, TODAY_VAL = '';
function today(){ var n = Date.now(); if (n - TODAY_AT > 1000){ TODAY_VAL = TODAY_FMT.format(new Date(n)); TODAY_AT = n; } return TODAY_VAL; }
var DFMT = {};
function dfmt(opt){ var k = JSON.stringify(opt); return DFMT[k] || (DFMT[k] = new Intl.DateTimeFormat('en-PH', opt)); }
function curMonth(){ return today().slice(0,7); }
function pd(s){ var a = s.split('-'); return new Date(+a[0], +a[1]-1, +(a[2]||1)); }
function ymd(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function fDate(s, opt){ return dfmt(opt || { month:'short', day:'numeric', year:'numeric' }).format(pd(s)); }
function fMonth(m){ return dfmt({ month:'long', year:'numeric' }).format(pd(m + '-01')); }
function mShort(m){ return dfmt({ month:'short' }).format(pd(m + '-01')); }
function shiftMonth(m, n){ var d = pd(m + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0,7); }
function nextMonthStart(m){ return shiftMonth(m, 1) + '-01'; }
function addDays(s, n){ var d = pd(s); d.setDate(d.getDate() + n); return ymd(d); }
function frac(d){ d = Math.round(Math.abs(d) * 4) / 4; var w = Math.floor(d), f = { 0:'', 0.25:'¼', 0.5:'½', 0.75:'¾' }[Math.round((d - w) * 100) / 100]; return (w || !f ? String(w) : '') + (f || ''); }
function fD(d){ var v = Math.round(Math.abs(d) * 4) / 4; return (d < 0 ? '−' : '') + frac(v) + (v === 1 || (v < 1 && v > 0) ? ' day' : ' days'); }
function fDs(d, sign){ return (sign ? (d < 0 ? '−' : '+') : '') + frac(d) + 'd'; }
function fTime(t){ if (!t) return ''; var h = +t.slice(0,2), m = t.slice(3,5); return ((h % 12) || 12) + ':' + m + (h < 12 ? ' AM' : ' PM'); }
function initials(n){ return String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase(); }
function userOf(u){ return S.users.filter(function(z){ return z.username === u; })[0]; }
function userName(u){ var x = userOf(u); return x ? x.name : u; }
function firstName(u){ return userName(u).split(' ')[0]; }
function isAdmin(){ return S.me && S.me.role === 'admin'; }
function canSched(){ return !!S.me && (S.me.role === 'admin' || S.me.role === 'scheduler'); }
/* Division leaders (role "scheduler") assign people; they do not file or edit travel orders. */
function isLeader(){ return !!S.me && S.me.role === 'scheduler'; }
function canFileTO(){ return !!S.me && !isLeader(); }
function when(iso){ if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; return dfmt({ month:'short', day:'numeric', year:'numeric' }).format(d) + ', ' + dfmt({ hour:'numeric', minute:'2-digit' }).format(d); }
function ago(iso){
  var d = new Date(iso); if (isNaN(d)) return '';
  var s = (Date.now() - d) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s/60) + ' min ago'; if (s < 86400) return Math.floor(s/3600) + ' h ago';
  if (s < 7*86400) return Math.floor(s/86400) + ' d ago'; return dfmt({ month:'short', day:'numeric' }).format(d);
}
function holidayOn(d){ return S.holidays.filter(function(h){ return h.date === d; })[0]; }
function isWeekend(d){ var w = pd(d).getDay(); return w === 0 || w === 6; }

var ICONS = {
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cal:'<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  month:'<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 14h3M7.5 17.5h6"/>',
  plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  minus:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  tick:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.6 3 5.2"/>',
  out:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M18 5l2 2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', up:'<path d="m6 15 6-6 6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  route:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/>',
  edit:'<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  print:'<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pie:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  plane:'<path d="M2 16l20-8-6 12-3-5-5 3 1-5z"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  drive:'<path d="M8 3h8l6 11-4 7H6l-4-7z"/><path d="M8 3l6 11M2 14h12M16 3l-6 11"/>',
  fb:'<path d="M14 8.5h2V5.5h-2.5A3.5 3.5 0 0 0 10 9v2H8v3h2v7h3v-7h2.5l.5-3h-3V9.2c0-.4.3-.7.7-.7z" fill="currentColor" stroke="none"/>',
  yt:'<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor"/>',
  tt:'<path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46M14 4c.4 2.2 1.9 3.6 4 3.8"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  monument:'<path d="M12 2.5 14 6v11h-4V6z"/><path d="M8.5 17h7l1 2.5h-9z"/><path d="M5.5 21.5h13"/>',
  folder:'<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  megaphone:'<path d="M3 10v4h3l7 4V6l-7 4z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
};
var DIV_ICONS = ['camera','monument','folder','megaphone','pen','radio','users','star'];
var SWATCHES = ['#0B2C6E','#1D4ED8','#C8202A','#16803A','#F2B233','#6D28D9','#0F766E','#FFFFFF'];
var CAT_ICON = { 'Holiday':'flag', 'Weekend':'sun', 'After 5 PM':'moon', 'Travel order':'route' };
ICONS.news = '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V19H6a2 2 0 0 1-2-2z"/><path d="M17 8h2.5A1.5 1.5 0 0 1 21 9.5V17a2 2 0 0 1-2 2h-2"/><path d="M7.5 8h6M7.5 11.5h6M7.5 15h4"/>';
ICONS.copy = '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>';
function ic(n){ return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || ICONS.star) + '</svg>'; }

/* Staff lists are grouped by division, in the order the divisions are listed. */
function divRank(id){ for (var i = 0; i < S.divisions.length; i++) if (S.divisions[i].id === id) return i; return 999; }
function byDiv(a, b){ return divRank(a.division) - divRank(b.division) || a.name.localeCompare(b.name); }
function sortNames(names){ return names.map(function(n, i){ var u = S.users.filter(function(x){ return x.name.toUpperCase() === n; })[0]; return { n: n, r: u ? divRank(u.division) : 1000, i: i }; }).sort(function(a, b){ return a.r - b.r || a.i - b.i; }).map(function(x){ return x.n; }); }
function divOf(id){ return S.divisions.filter(function(d){ return d.id === id; })[0]; }
function fgFor(hex){ var n = parseInt(String(hex).slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.62 ? '#0B2C6E' : '#FFFFFF'; }
function divBadge(d, size){
  if (!d) return ''; size = size || 40;
  return '<span class="dbadge" style="--dc:' + esc(d.color) + ';--dfg:' + fgFor(d.color) + ';width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size/4) + 'px">' + (d.logo ? '<img src="' + esc(d.logo) + '" alt="">' : ic(d.icon)) + '</span>';
}
function divChip(id){ var d = divOf(id); return d ? '<span class="dchip" style="--dc:' + esc(d.color) + '"><i></i>' + esc(d.short || d.name) + '</span>' : '<span class="dchip hint">No division</span>'; }
function toast(msg){ var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function(){ t.hidden = true; }, 3000); }

/* ---------- server ---------- */
/* task templates: the steps each kind of work goes through, and the skill each step needs.
   Step types: work (someone does it), proof (someone other than the writer reads it), post (it goes out). */
var TASK_TPL = [
  { id: 'pubmat', name: 'Pubmat', icon: 'pen', steps: [['Design', 'Graphic artist', 'work'], ['Caption', 'Writer', 'work'], ['Proofreading', 'Writer', 'proof'], ['Posting', '', 'post']] },
  { id: 'release', name: 'Press release', icon: 'edit', steps: [['Design', 'Graphic artist', 'work'], ['Caption', 'Writer', 'work'], ['Proofreading', 'Writer', 'proof'], ['Posting', '', 'post']] },
  { id: 'photo', name: 'Photo', icon: 'camera', steps: [['Selection and editing', 'Photographer', 'work'], ['Caption', 'Writer', 'work'], ['Proofreading', 'Writer', 'proof']] },
  { id: 'video', name: 'Video', icon: 'camera', steps: [['Editing', 'Videographer', 'work'], ['Caption', 'Writer', 'work'], ['Proofreading', 'Writer', 'proof'], ['Posting', '', 'post']] },
  { id: 'other', name: 'Other task', icon: 'tick', steps: [['Do the task', '', 'work']] }
];
/* only these divisions post to the office's pages */
var POST_DIV_RX = /bantayog|social media|special project/i;
function divCanPost(divId, divs){ var d = (divs || (typeof S !== 'undefined' && S.divisions) || []).filter(function(x){ return x.id === divId; })[0]; return !!(d && POST_DIV_RX.test(d.name + ' ' + (d.short || ''))); }
function isCaptionStep(s){ return s.type === 'work' && /caption/i.test(s.name || ''); }
function taskTpl(id){ return TASK_TPL.filter(function(t){ return t.id === id; })[0] || TASK_TPL[TASK_TPL.length - 1]; }
/* a task's steps; older tasks without steps are one step done by everyone on it */
function taskStepsOf(t){
  if (Array.isArray(t.steps) && t.steps.length) return t.steps.map(function(s){ return Object.assign({ who: [], doneBy: '', doneAt: '' }, s, { who: (s.who || []).slice() }); });
  return [{ id: 's1', name: t.kind || 'Do the task', skill: '', type: 'work', who: (t.assignees || []).slice(), doneBy: t.status === 'Done' ? t.doneBy || '' : '', doneAt: t.status === 'Done' ? t.doneAt || '' : '' }];
}
function apply(d){
  S.me = d.me; S.users = d.users; S.entries = d.entries; S.divisions = d.divisions;
  S.holidays = d.holidays || []; S.settings = d.settings || S.settings; S.activity = d.activity || [];
  S.travelOrders = d.travelOrders || []; S.events = d.events || []; S.inventory = d.inventory || []; S.tasks = d.tasks || []; S.pubs = d.pubs || []; S.pubItems = d.pubItems || []; S.pubVotes = d.pubVotes || []; S.tevs = d.tevs || []; S.leaves = d.leaves || []; S.credits = d.credits || []; S.board = d.board || [];
  S.loadedAt = Date.now(); S.lastWrite = d.lastWrite || 0;
  if (remembered()) lSet('pio_cache', JSON.stringify(d));
}
function call(action, p){
  return new Promise(function(resolve, reject){
    function done(r){
      if (r && r.ok){ if (r.fresh) apply(r.fresh); return resolve(r.data); }
      if (r && r.expired){ clearSession(); S.token = null; S.me = null; render(); }
      reject(new Error(r && r.error ? r.error : 'Something went wrong. Please try again.'));
    }
    if (FIRE){ Fire.api(action, p || {}).then(function(r){ if (r && !r.ok && r.net){ var er = new Error(r.error); er.net = true; return reject(er); } done(r); }, function(e){ var er = new Error(e.message || 'Could not reach the server.'); er.net = true; reject(er); }); }
    else if (LIVE){
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, p: p || {}, token: S.token }) })
        .then(function(r){ return r.text(); }, function(){ throw new Error('net'); })
        .then(function(t){ var j; try { j = JSON.parse(t); } catch(e){ throw new Error('html'); } done(j); })
        .catch(function(e){ var er = new Error(e.message === 'html' ? 'The server sent a web page instead of data. In Apps Script, set the deployment’s access to Anyone and deploy a new version.' : 'Could not reach the server. Check your internet connection and try again.'); er.net = e.message !== 'html'; reject(er); });
    } else setTimeout(function(){ done(Mock.api(action, p || {}, S.token)); }, 150);
  });
}
/* force: rebuild the server's snapshot from the Sheet (the Refresh button), e.g. after someone edited the Sheet by hand. */
function refresh(force){ return call('data', force ? { force: true } : {}).then(function(d){ apply(d); render(); }); }
function act(action, p, msg){ return call(action, p).then(function(r){ if (msg) toast(typeof msg === 'function' ? msg(r) : msg); render(); profSync(action); return r; }); }
function profSync(action){
  if (!LIVE || !S.me || !isAdmin()) return;
  if (action && S._profSync && !/User|Role|Active|Photo|Pin|Div|Name|Emp|import/i.test(action)) return;
  S._profSync = true; setTimeout(function(){ call('syncProfiles').catch(function(){}); }, 600);
}

/* ---------- balances ----------
   Offsets earned in a month become usable on the 1st of the next month and carry over.
   With a carry-over cap, anything above the cap is forfeited at the start of each month.
   The server runs the same calculation (balance_ in Code.gs). */
function ledgerFor(entries, u, cap){
  var earn = {}, use = {}, first = null, cur = curMonth(), months = {};
  entries.forEach(function(e){
    if (e.username !== u || e.status !== 'Confirmed') return;
    var m = e.date.slice(0,7);
    if (e.type === 'EARN') earn[m] = (earn[m] || 0) + e.days; else use[m] = (use[m] || 0) + e.days;
    if (!first || m < first) first = m;
  });
  if (!first) return { avail: 0, months: months };
  var avail = 0, m = first, last = cur;
  Object.keys(use).forEach(function(k){ if (k > last) last = k; });
  while (m <= last){
    var rec = { open: 0, forfeit: 0, earned: earn[m] || 0, used: use[m] || 0 };
    if (m <= cur){
      avail += earn[shiftMonth(m, -1)] || 0;
      if (cap > 0 && avail > cap){ rec.forfeit = avail - cap; avail = cap; }
    }
    rec.open = avail;
    avail -= use[m] || 0;
    rec.close = avail + rec.earned;
    months[m] = rec;
    m = shiftMonth(m, 1);
  }
  return { avail: avail, months: months };
}
/* Speed: a person's balance is worked out once per screen draw and reused (rows ask for it several times).
   The cache is emptied when the next draw starts and after the current task, so new data is always counted. */
var STATS_C = null;
function statsReset(){ STATS_C = null; }
function stats(u){
  if (STATS_C && STATS_C[u]) return STATS_C[u];
  if (!STATS_C){ STATS_C = {}; setTimeout(statsReset, 0); }
  return (STATS_C[u] = statsCalc(u));
}
function statsCalc(u){
  var L = ledgerFor(S.entries, u, S.settings.carryCap);
  var o = { avail: L.avail, month: 0, pending: 0, pendN: 0, reqDays: 0, reqN: 0, earnedY: 0, usedY: 0, usedM: 0, lastUse: null, upcoming: 0 };
  var y = today().slice(0,4), m = curMonth(), td = today();
  S.entries.forEach(function(e){
    if (e.username !== u) return;
    if (e.status === 'Confirmed'){
      if (e.type === 'EARN'){ if (e.date.slice(0,7) === m) o.month += e.days; if (e.date.slice(0,4) === y) o.earnedY += e.days; }
      else { if (e.date.slice(0,4) === y) o.usedY += e.days; if (e.date.slice(0,7) === m) o.usedM += e.days; if (e.date > td) o.upcoming += e.days; if (e.date <= td && (!o.lastUse || e.date > o.lastUse)) o.lastUse = e.date; }
    } else if (e.status === 'Pending'){
      if (e.type === 'EARN'){ o.pending += e.days; o.pendN++; } else { o.reqDays += e.days; o.reqN++; }
    }
  });
  o.free = o.avail - o.reqDays;
  return o;
}
function sumStats(users){
  var t = { avail: 0, month: 0, pending: 0, usedM: 0 };
  users.forEach(function(u){ var s = stats(u.username); t.avail += s.avail; t.month += s.month; t.pending += s.pending; t.usedM += s.usedM; });
  return t;
}
function ledgerMonth(u, m){
  var L = ledgerFor(S.entries, u, S.settings.carryCap), r = L.months[m];
  var pend = S.entries.filter(function(e){ return e.username === u && e.status === 'Pending' && e.date.slice(0,7) === m && e.type === 'EARN'; }).reduce(function(s, e){ return s + e.days; }, 0);
  if (!r){
    var prior = Object.keys(L.months).filter(function(k){ return k < m; }).sort().pop();
    var open = prior ? L.months[prior].close : 0;
    if (m > curMonth()) open = L.avail;
    r = { open: open, forfeit: 0, earned: 0, used: 0, close: open };
  }
  return { open: r.open, forfeit: r.forfeit, earned: r.earned, used: r.used, close: r.close, pending: pend };
}
function otherAdmins(){ return S.users.filter(function(u){ return u.role === 'admin' && u.active && u.username !== S.me.username; }).length; }
function canReview(e){ return isAdmin() && e.status === 'Pending' && !(e.username === S.me.username && otherAdmins() > 0); }
function sorted(list){ return list.slice().sort(function(a,b){ return a.date === b.date ? (b.createdAt > a.createdAt ? 1 : -1) : (b.date > a.date ? 1 : -1); }); }
function pending(type){ return sorted(S.entries.filter(function(e){ return e.status === 'Pending' && (!type || e.type === type); })); }
function closesOn(m){ return fDate(nextMonthStart(m), { month:'long', day:'numeric' }); }
function goRecords(f){ S.recLimit = 0; S.rf =Object.assign({ user:'all', div:'all', type:'all', status:'all' }, f || {}); var rq = document.getElementById('rfQ'); if (rq) rq.value = S.rf.q || ''; S.recTab = 'entries'; S.view = 'records'; render(); window.scrollTo(0,0); }

/* ---------- files ---------- */
function download(name, text, type){
  var blob = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csv(rows){ return '﻿' + rows.map(function(r){ return r.map(function(c){ c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); }
function entriesCsv(list){
  return csv([['Date','Employee','Username','Division','Type','Category','Event','Venue','Ended at','Days','Status','Note','Logged by','Logged at','Reviewed by','Reviewed at']].concat(list.map(function(e){
    var u = userOf(e.username), d = u && divOf(u.division);
    return [e.date, userName(e.username), e.username, d ? d.name : '', e.type === 'USE' ? 'Used' : 'Earned', e.type === 'USE' ? '' : e.category, e.event, e.venue, e.endTime, e.type === 'USE' ? -e.days : e.days, e.status, e.note, e.createdBy, e.createdAt, e.reviewedBy, e.reviewedAt];
  })));
}

