/* PIO Overwatch phone alerts (Cloudflare Worker).
   The app stays on Firebase; this only remembers which phones want alerts and sends them.

   POST /subscribe    { sub }                     this phone wants alerts for the signed-in person
   POST /unsubscribe  { endpoint }                stop sending to this phone
   POST /notify       { items: [{ to, id, title, body, url }] }   send alerts to people (each id once per person)

   Every call carries the person's Firebase sign-in token. The worker checks it by reading that person's
   members/{uid} record from Firestore with the same token, so only active staff can use it.
   Storage (KV "SUBS"): u:<username> -> phones, s:<username> -> ids already sent. */
import { send } from './webpush.js';

const json = function(body, status, cors){ return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) }); };

function corsFor(req, env){
  const origin = req.headers.get('Origin') || '', ok = String(env.ORIGINS || '').split(',').map(function(s){ return s.trim(); }).indexOf(origin) >= 0;
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } : null;
}

/* who is calling: the sign-in token must belong to an active member */
async function who(req, env){
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const part = tok.split('.')[1]; if (!part) return null;
  let claims; try { const b = part.replace(/-/g, '+').replace(/_/g, '/'); claims = JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))); } catch (e) { return null; }
  if (!claims.user_id || claims.aud !== env.FIREBASE_PROJECT || claims.exp * 1000 < Date.now()) return null;
  // Firestore checks the token itself; the rules only let people read their own member record
  const url = 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT + '/databases/(default)/documents/members/' + encodeURIComponent(claims.user_id);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } }); if (!r.ok) return null;
  const f = (await r.json()).fields || {};
  if (!f.username || !f.active || f.active.booleanValue !== true) return null;
  return f.username.stringValue;
}
async function getList(env, key){ try { return JSON.parse((await env.SUBS.get(key)) || '[]'); } catch (e) { return []; } }

export default {
  async fetch(req, env){
    const cors = corsFor(req, env);
    if (!cors) return new Response('Not allowed', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    const me = await who(req, env); if (!me) return json({ error: 'Please sign in again.' }, 401, cors);
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'Bad request' }, 400, cors); }
    const path = new URL(req.url).pathname;

    if (path === '/subscribe'){
      const sub = body.sub; if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ error: 'Bad subscription' }, 400, cors);
      const list = (await getList(env, 'u:' + me)).filter(function(s){ return s.endpoint !== sub.endpoint; });
      list.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, at: Date.now() });
      await env.SUBS.put('u:' + me, JSON.stringify(list.slice(-6)));   // up to 6 phones/computers per person
      return json({ ok: true }, 200, cors);
    }
    if (path === '/unsubscribe'){
      const list = (await getList(env, 'u:' + me)).filter(function(s){ return s.endpoint !== body.endpoint; });
      await env.SUBS.put('u:' + me, JSON.stringify(list));
      return json({ ok: true }, 200, cors);
    }
    if (path === '/notify'){
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 60);
      const keys = { publicKey: env.VAPID_PUBLIC, privateJwk: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT };
      const byUser = {}; items.forEach(function(it){ if (it && it.to && it.id && (it.to !== me || (body.test && /^test:/.test(it.id)))) (byUser[it.to] = byUser[it.to] || []).push(it); });
      let sent = 0;
      for (const u of Object.keys(byUser)){
        const subs = await getList(env, 'u:' + u); if (!subs.length) continue;
        const done = await getList(env, 's:' + u), fresh = byUser[u].filter(function(it){ return done.indexOf(String(it.id)) < 0; }).slice(0, 5);
        if (!fresh.length) continue;
        const gone = [];
        for (const it of fresh){
          const msg = { title: String(it.title || 'PIO Overwatch').slice(0, 80), body: String(it.body || '').slice(0, 240), url: String(it.url || './').slice(0, 120), tag: String(it.id).slice(0, 120), from: me };
          for (const s of subs){ try { const st = await send(s, msg, keys); if (st === 404 || st === 410) gone.push(s.endpoint); else if (st < 300) sent++; } catch (e) {} }
        }
        await env.SUBS.put('s:' + u, JSON.stringify(done.concat(fresh.map(function(it){ return String(it.id); })).slice(-300)));
        if (gone.length) await env.SUBS.put('u:' + u, JSON.stringify(subs.filter(function(s){ return gone.indexOf(s.endpoint) < 0; })));
      }
      return json({ ok: true, sent: sent }, 200, cors);
    }
    return json({ error: 'Not found' }, 404, cors);
  }
};
