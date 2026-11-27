/* Make the key pair that signs phone alerts (run once).
   Usage:  node tools/vapid.js          (refuses if keys already exist)
           node tools/vapid.js --force  (new keys: every phone must turn alerts on again)
   - the public key goes into config.js (PIO_PUSH.vapid) and push-worker/wrangler.toml (VAPID_PUBLIC)
   - the private key is saved to push-worker/.vapid-private.json, which git ignores;
     give it to Cloudflare with:  Get-Content .vapid-private.json | npx wrangler secret put VAPID_PRIVATE   (inside push-worker) */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const priv = path.join(root, 'push-worker', '.vapid-private.json'), cfg = path.join(root, 'config.js'), toml = path.join(root, 'push-worker', 'wrangler.toml');
if (fs.existsSync(priv) && process.argv.indexOf('--force') < 0){ console.error('Keys already exist (push-worker/.vapid-private.json). Use --force to replace them; phones would need to turn alerts on again.'); process.exit(1); }
(async function(){
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const pub = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  fs.writeFileSync(priv, JSON.stringify(jwk));
  let c = fs.readFileSync(cfg, 'utf8');
  if (/window\.PIO_PUSH\s*=/.test(c)) c = c.replace(/(window\.PIO_PUSH\s*=\s*\{[\s\S]*?vapid:\s*)"[^"]*"/, '$1"' + pub + '"');
  else c = c.trimEnd() + '\n\n/* Phone alerts (see PUSH-SETUP.md): the worker address and the public key from tools/vapid.js */\nwindow.PIO_PUSH = {\n  url: "",\n  vapid: "' + pub + '"\n};\n';
  fs.writeFileSync(cfg, c);
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf8').replace(/VAPID_PUBLIC = "[^"]*"/, 'VAPID_PUBLIC = "' + pub + '"'));
  console.log('New alert keys made.\n  Public key: written to config.js and push-worker/wrangler.toml\n  Private key: push-worker/.vapid-private.json (kept out of git; give it to Cloudflare, see PUSH-SETUP.md)');
})();
