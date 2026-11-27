/* Web Push for PIO Overwatch, with nothing but the platform's WebCrypto (runs on Cloudflare Workers and Node).
   - encrypt(): the message body, encrypted for one phone (RFC 8291, aes128gcm)
   - vapid():   the signed header that proves the alert comes from us (RFC 8292)
   - send():    both together, posted to the phone's push service */
const te = new TextEncoder();

export function b64u(bytes){ let s = ''; new Uint8Array(bytes).forEach(function(b){ s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function unb64u(str){ const s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(str).length + 3) % 4)); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
function cat(){ const parts = [].slice.call(arguments), out = new Uint8Array(parts.reduce(function(n, p){ return n + p.length; }, 0)); let o = 0; parts.forEach(function(p){ out.set(p, o); o += p.length; }); return out; }
async function hmac(key, data){ const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
/* a P-256 key from its 65-byte public point (and, for private keys, the 32-byte d) */
function pointJwk(pub, d){ const j = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true }; if (d) j.d = b64u(d); return j; }

/* encrypt one message for one subscription; opts.asPrivate / opts.asPublic / opts.salt exist only for the standard's test vector */
export async function encrypt(plain, p256dh, authSecret, opts){
  opts = opts || {};
  const uaPub = typeof p256dh === 'string' ? unb64u(p256dh) : p256dh, auth = typeof authSecret === 'string' ? unb64u(authSecret) : authSecret;
  let asPub, asKey;
  if (opts.asPrivate){ asPub = unb64u(opts.asPublic); asKey = await crypto.subtle.importKey('jwk', pointJwk(asPub, unb64u(opts.asPrivate)), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']); }
  else { const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']); asKey = kp.privateKey; asPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)); }
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKey, 256));
  const prkKey = await hmac(auth, ecdh);
  const ikm = await hmac(prkKey, cat(te.encode('WebPush: info'), new Uint8Array([0]), uaPub, asPub, new Uint8Array([1])));
  const salt = opts.salt ? unb64u(opts.salt) : crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm'), new Uint8Array([0, 1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce'), new Uint8Array([0, 1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const body = typeof plain === 'string' ? te.encode(plain) : plain;
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, cat(body, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // record size 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, sealed);
}

/* the VAPID header: a short-lived token signed with our private key */
export async function vapid(endpoint, publicKey, privateJwk, subject){
  const aud = new URL(endpoint).origin, exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const unsigned = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64u(te.encode(JSON.stringify({ aud: aud, exp: exp, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', typeof privateJwk === 'string' ? JSON.parse(privateJwk) : privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned)));
  return 'vapid t=' + unsigned + '.' + b64u(sig) + ', k=' + publicKey;
}

/* send one alert to one phone; returns the push service's status (404/410 mean the phone unsubscribed) */
export async function send(sub, message, keys){
  const body = await encrypt(JSON.stringify(message), sub.keys.p256dh, sub.keys.auth);
  const res = await fetch(sub.endpoint, { method: 'POST', body: body, headers: {
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': '86400', 'Urgency': 'high',
    'Authorization': await vapid(sub.endpoint, keys.publicKey, keys.privateJwk, keys.subject) } });
  return res.status;
}
