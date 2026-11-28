# Getting the Facebook Page's posts into the Bantayog Publication

## The way we use: the monthly export (no connection to the Page at all)
Once a month (after the month ends), someone with at least **view-only (insights) access** to the Page:
1. Opens **business.facebook.com** (type it yourself) and picks the **PIO Camarines Norte** Page at the top left.
2. Goes to **Insights → Content**, sets the date range to **the month**, then **Export data** → **Content/Posts** → **CSV**.
3. In PIO Overwatch, opens **Publication** → **Upload Facebook export**, and picks the downloaded file.

Every post lands in its month's issue (opened automatically if needed). Posts already there, or skipped earlier,
are not added twice, so uploading the same file again is harmless. Photos don't come with the export.

---

## Optional, not set up: the automatic read-only connection

The Publication page adds new posts from **facebook.com/piocamnorte** to each Bantayog issue while it is
collecting. A Cloudflare Worker (`push-worker/fb.js`) reads the Page every 3 hours with a **read-only key**
from a Meta Business Suite **system user**: a non-human account that cannot log in, cannot be phished,
and with these permissions cannot post, delete, message or change anything on the Page.

Do these steps with the Facebook account that manages the Page in Meta Business Suite. Never share its password.

## A. Check the Page is in your business portfolio
1. Open https://business.facebook.com/settings
2. Under **Accounts → Pages**, the PIO Camarines Norte Page should be listed.
   If not: **Add → Add a Page**, and pick it (needs full control of the Page).

## B. Make a small Meta app (free, no review needed)
3. Open https://developers.facebook.com/apps and choose **Create app**.
4. Pick the use case for **other / business** apps, type **Business**, name it e.g. **PIO Overwatch Reader**,
   and connect it to your business portfolio.
5. Leave it in **Development** mode. It only reads your own Page, so Meta's App Review is not needed.

## C. Make the system user and its read-only key
6. Back in Business settings: **Users → System users → Add**. Name: **Overwatch reader**. Role: **Employee** (not Admin).
7. Select it, then **Assign assets**:
   - **Pages** → PIO Camarines Norte → give the **lowest access** offered (start with insights/analytics only).
   - **Apps** → PIO Overwatch Reader → allow it to use the app.
8. **Generate new token** → pick the app → expiration **Never** → tick **only** these two permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   If the screen asks for anything with *manage*, *publish* or *messaging*, don't tick it.
9. Copy the key it shows (it is shown once). Don't paste it into chat, email or the app.

## D. Give the key to the Worker
10. In a terminal, inside the `push-worker` folder:
    ```powershell
    npx --yes wrangler@3 secret put FB_TOKEN
    ```
    Paste the key when asked, press Enter. It goes straight into Cloudflare as a secret.
11. Tell Claude it's done: it runs a first scan and checks posts come through. If Facebook says the access is
    too low, add one more access level for the system user on the Page (content) and try again.

## Turning it off
Business settings → **Users → System users → Overwatch reader → Revoke tokens** (or remove its Page access).
The app then shows "Facebook isn't connected yet" and the board can keep pasting links.
