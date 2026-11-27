# Phone alerts: one-time setup (about 10 minutes)

Phone alerts reach staff even when PIO Overwatch is closed: a new dispatch, a travel order that is ready,
their turn on a task (design, caption, proofreading, posting), or a caption sent back.

The app stays on Firebase. A small free **Cloudflare Worker** (the `push-worker` folder) only remembers which
phones want alerts and sends them. No card is needed; the free plan covers far more than the office uses.

The alert keys are already made: the public key is in `config.js` and `push-worker/wrangler.toml`, and the
private key is in `push-worker/.vapid-private.json` on this computer (git ignores it; never share or upload it anywhere but Cloudflare).

> Done on 2026-11-27: the worker runs at https://pio-push.piolotabrera.workers.dev. Only step 7 (each phone) is left; steps 1 to 6 are here for reference.

## 1. Make a free Cloudflare account
Go to https://dash.cloudflare.com/sign-up and sign up (email and password).

## 2. Sign in from this computer
In a terminal, inside the project folder:

```powershell
cd push-worker
```
```powershell
npx wrangler login
```
A browser page opens; click **Allow**.

## 3. Make the storage for phone subscriptions
```powershell
npx wrangler kv namespace create SUBS
```
It prints an `id = "…"`. Open `push-worker/wrangler.toml` and paste that id in place of `PASTE_THE_KV_ID_HERE`.

## 4. Put the worker online
```powershell
npx wrangler deploy
```
It prints the address, like `https://pio-push.YOURNAME.workers.dev`. Copy it.

## 5. Give Cloudflare the private key
```powershell
Get-Content .vapid-private.json | npx wrangler secret put VAPID_PRIVATE
```

## 6. Tell the app where the worker is
Open `config.js` and paste the address into `PIO_PUSH.url`, for example:
```js
window.PIO_PUSH = {
  url: "https://pio-push.YOURNAME.workers.dev",
  vapid: "…(already filled in)…"
};
```
Then push the update (or ask Claude to).

## 7. Each person, on each phone
- Open PIO Overwatch, tap the **bell**, then **Turn on device notifications**, and allow.
- **iPhone:** first add the app to the Home Screen (Share, then **Add to Home Screen**), open it from the Home Screen icon, then turn on notifications there. Needs iOS 16.4 or newer.
- **Android and computers:** works from the browser.
- Tap **Send a test alert** in the bell window to check.

## Good to know
- Alerts are sent when someone saves a change in the app; the person who made the change is not alerted.
- Each alert is sent once per person.
- To turn alerts off on a device: bell, then **Turn off device notifications**.
- If you ever run `node tools/vapid.js --force` (new keys), redo step 5 and everyone must turn alerts on again.
