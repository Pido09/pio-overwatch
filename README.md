# PIO Overwatch

Offsets, travel orders, TEVs, leave credits and staff availability for the Provincial Information Office, Camarines Norte.
The app is hosted on GitHub Pages. Data is saved in a Google Sheet through Google Apps Script.

Current version: **5.1** (server `Code.gs` shows `VERSION = '5.1'`).

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (screens and design). Edit this for most patches. |
| `config.js` | The Apps Script link. Set once. |
| `sw.js` | Lets the app install and open fast. Change the version line (`pio-offsets-v9`) whenever `index.html` changes, so phones pick up the update. |
| `to-template.docx` | The office travel order template, with fill-in spots: `{DATE}` `{NAME}` `{DEST}` `{DEP}` `{ARR}` `{PURPOSE}` `{X1}` `{X2}` `{REC1}`–`{REC3}`. |
| `jszip.min.js` | The tool that builds the travel order Word file inside the app. Don't edit. |
| `manifest.webmanifest`, `icon-*.png` | Make it installable (Add to Home Screen). |
| `pio-logo.webp`, `pio-digital.webp`, `capitol.webp` | PIO seal, sign-in wordmark and Capitol photo. Replace with a file of the same name to change them. |
| `apps-script/Code.gs` | The server code. It runs in Apps Script, not on GitHub Pages. This copy keeps a record of versions. |

## Setup (once)

### 1. Google Sheet and Apps Script
1. Create a blank Google Sheet named "PIO Offset Tracker", using the account that should own the data.
2. Go to Extensions > Apps Script. Replace everything in `Code.gs` with `apps-script/Code.gs`. Save.
3. Go to Deploy > New deployment > gear icon > Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click Deploy, then authorize. If Google shows "unverified app", click Advanced > Go to project.
5. Copy the **Web app URL**. It ends in `/exec`.
6. In the editor, pick `installWarmUp` from the function menu and click Run. This keeps the app fast during office hours and updates holidays weekly.
7. Pick `syncHolidaysNow` and click Run. Allow access to Calendar. This loads the Philippine holidays.

### 2. GitHub
1. Create a repository named `pio-offset-tracker` (Public).
2. Click "uploading an existing file". Drag in everything from this folder, including the `apps-script` folder. Commit.
3. Open `config.js`, click the pencil icon, paste the Web app URL between the quotes, and commit.
4. Go to Settings > Pages. Under Source, pick **Deploy from a branch**, then `main` and `/ (root)`. Save.
5. After a minute or two the site is live at `https://<your-username>.github.io/pio-offset-tracker/`.

### 3. First use
1. Open the site. The first screen asks you to create the admin account.
2. Add staff in Staff. Set each person's division and employment type (Regular, Casual, JO or COS) under **Manage**.
3. In Settings, enter the yearly TEV budget.

## Updating

| What changed | Where | Steps |
|---|---|---|
| `index.html`, `sw.js`, template | GitHub | Upload the files (same names) and commit. Live in about a minute. Refresh twice on phones. |
| `Code.gs` | Apps Script | Paste the code, save, then Deploy > Manage deployments > pencil > Version: **New version** > Deploy. Also update `apps-script/Code.gs` on GitHub to keep a record. |

Always edit the existing deployment. "New deployment" creates a new URL, and `config.js` would still point to the old one.
When both files change, update Apps Script first, then GitHub.

## How it works

### Accounts
- Sign in with username and PIN. "Keep me signed in" lasts 30 days, renewed with use.
- Too many wrong PINs locks the account for a while.
- Resetting a PIN, or deactivating or removing an account, signs that person out everywhere.
- Admins see everything. Staff see only their own entries, leaves and TEVs, plus who is out.

### Employment types
- **Regular and Casual**: the dashboard shows leave credits first. Offsets are still available.
- **JO and COS**: the dashboard shows offsets first. No CSC leave credits.

### Offsets
- Each entry is ½ day or 1 day. Types: Holiday, Weekend, After 5 PM, Travel order.
- After 5 PM: ending 1:00 AM or later = 1 day, earlier = ½ day, before 7:00 PM is not counted.
- Travel order days count only when the person already reached the monthly workdays (22 by default) and the day was not charged to payroll.
- **Quick fill** on Log offset: tap one of your travel orders from the last 60 days, or "Within the Capitol grounds" for events with no travel order.
- Offsets logged in a month become usable on the 1st of the next month. Unused offsets carry over. Admins can set a carry-over cap in Settings (0 = no limit).
- Admins confirm offsets and approve days off. An admin's own entries need another admin (automatic if there is only one).

### Travel orders
1. Any staff member files it: date(s), purpose, **location** (required) and the people (saved in capital letters).
2. An admin opens **Prepare**: TO number, **date prepared**, TEV Yes/No/Not yet, status.
3. Prepared travel orders get a **print button**. It downloads a Word file made from `to-template.docx`:
   - Date prepared at the top, one name per line, destination, purpose "… at [location]".
   - Departure and arrival are the travel order's start and end dates.
   - TEV No = X in the first box. TEV Yes = X in the second box. Not yet = both empty.
   - If Sarah Marie P. Aviado is on the travel order, the Recommending Approval block is left out.
4. **Copy** gives the text in this format:
   ```
   November 5, 2026
   Purpose in Location on/from date

   NAMES IN CAPITALS
   ```
- Offsets logged on a travel order date are flagged for the admin if the type is not "Travel order".

### TEVs (Field work > TEVs)
- Marking a travel order TEV: Yes starts a TEV for each person and asks "Make the TEVs now?".
- Statuses: **To prepare** > **Pending** (waiting for the cheque) > **Claimed**.
- Each TEV lists what it covers (transportation, food, accommodation, other) with amounts. A category counts only if it has an amount.
- Totals for the year: released, pending, to prepare, and left for spending (budget − released − pending).

### Leaves (Regular and Casual)
- Admins enter starting VL/SL balances from the leave card. The app adds 1.25 days of each per month.
- Leaves are filed on CS Form No. 6 as usual and recorded here by an admin. Covers VL, forced, SL, SPL, wellness, solo parent, calamity, maternity, paternity, VAWC, special leave for women, rehabilitation, study, adoption and leave without pay.

### Availability and calendar
- Availability shows who is in the office, in the field, on leave or on a day off, for any date and week. Staff see "On leave" without the leave type.
- The calendar shows holidays, travel orders, leaves, offsets and days off, plus an **Events in [month]** list.

### Holidays
- National holidays update by themselves every week from Google's Philippine holiday calendar. Admins can also tap **Update now** in Settings.
- Add provincial and local holidays in Settings.

## Good to know

- Sheet tabs: `Users`, `Entries`, `Divisions`, `Holidays`, `Settings`, `Activity`, `TravelOrders`, `TEVs`, `Leaves`, `LeaveCredits`. Don't rename the column headers. New columns are added by themselves.
- **Activity** is the audit trail: every change with who, what and when. The app never edits or deletes it. Admins see it under Records > Activity log.
- Saves happen in the background. If the connection drops, they wait on the device and send by themselves. A "Saving" pill shows what's pending.
- When someone else adds something, a "New entries" bar offers a refresh. What you're typing is kept.
- Backups (Settings): save a copy of the Sheet to Drive, or download JSON/CSV. Do it monthly and before big changes.
- Phones and tablets: swipe from the left edge or tap ☰ for the menu. Install with Add to Home Screen (Chrome on Android, Safari on iPhone).
- If you edit the Sheet by hand, tap **Refresh** in the app to reload from the Sheet.

## Handover

- The Sheet, script and deployment belong to the account that created them. Share the Sheet and the Apps Script project with a second admin or an office account so the app keeps running if that account changes.
- To move ownership: share the Sheet with the new owner as Editor, then make them Owner. They redeploy the script from their account (same steps as Setup 1.3–1.7) and update `config.js` with the new URL.
