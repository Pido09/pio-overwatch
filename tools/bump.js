/* Set the release version everywhere at once, then run the checks.
   Usage:  node tools/bump.js v82 "What's new line 1" "What's new line 2" ...
   Updates: APP_VER in js/app.js, version.json (version and notes), the cache name in sw.js,
   and the ?v= tags in index.html, so phones never mix an old file with a new one. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const ver = process.argv[2], notes = process.argv.slice(3);
if (!/^v\d+$/.test(ver || '')) { console.error('Usage: node tools/bump.js v82 "note" ["note" ...]'); process.exit(1); }
function edit(file, fn){ const p = path.join(root, file), s = fs.readFileSync(p, 'utf8'), out = fn(s); if (out === s) throw new Error('nothing changed in ' + file); fs.writeFileSync(p, out); }
edit('js/app.js', function(s){ return s.replace(/var APP_VER = 'v\d+';/, "var APP_VER = '" + ver + "';"); });
edit('sw.js', function(s){ return s.replace(/pio-offsets-v\d+/, 'pio-offsets-' + ver); });
edit('index.html', function(s){ return s.replace(/\?v=v\d+/g, '?v=' + ver); });
const vj = path.join(root, 'version.json'), cur = JSON.parse(fs.readFileSync(vj, 'utf8'));
fs.writeFileSync(vj, JSON.stringify({ ver: ver, notes: notes.length ? notes : cur.notes }, null, 2) + '\n');
console.log('Version set to ' + ver + (notes.length ? ' with ' + notes.length + ' note(s)' : ' (notes kept)') + '. Running checks…\n');
try { cp.execFileSync(process.execPath, [path.join(root, 'tests', 'run.js')], { stdio: 'inherit' }); } catch (e) { process.exit(1); }
