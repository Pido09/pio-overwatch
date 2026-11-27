/* Checks the push encryption against the worked example in the web push standard (RFC 8291, Appendix A),
   and that our VAPID signature verifies. Prints one JSON line for tests/run.js. Nothing is sent anywhere. */
import { encrypt, vapid, b64u, unb64u } from '../push-worker/webpush.js';
const out = {};
try {
  const body = await encrypt('When I grow up, I want to be a watermelon',
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', 'BTBZMqHH6r4Tts7J_aSIgg',
    { asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8', asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', salt: 'DGv6ra1nlYgDCS1FRnbzlw' });
  out.rfc = b64u(body) === 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
  if (!out.rfc) out.got = b64u(body);
  // VAPID: sign with a fresh key, then verify with its public half
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const h = await vapid('https://fcm.googleapis.com/fcm/send/abc', pub, jwk, 'https://pido09.github.io/pio-overwatch/');
  const tok = h.match(/t=([^,]+)/)[1].split('.'), claims = JSON.parse(new TextDecoder().decode(unb64u(tok[1])));
  out.vapid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, unb64u(tok[2]), new TextEncoder().encode(tok[0] + '.' + tok[1])) && claims.aud === 'https://fcm.googleapis.com' && h.indexOf('k=' + pub) > 0;
} catch (e) { out.error = String(e && e.stack || e); }
console.log(JSON.stringify(out));
