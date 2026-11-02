# PIO Overwatch

Offset tracker for the Provincial Information Office, Camarines Norte.
The page is hosted on GitHub Pages. Data is saved in a Google Sheet through Google Apps Script.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (design and screens). Edit this for most patches. |
| `config.js` | The Apps Script link. Set once. |
| `pio-logo.webp` | PIO seal. |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Make it installable as a phone/desktop app (Add to Home Screen). |
| `pio-digital.webp`, `capitol.webp` | Sign-in page wordmark and Capitol photo. Replace with a file of the same name to change them. |
| `apps-script/Code.gs` | The server code. It lives in Apps Script, not on GitHub Pages. This copy is for keeping versions. |

## Setup (once)

### 1. Google Sheet and Apps Script
1. Create a blank Google Sheet named "PIO Offset Tracker", using the account that should own the data.
2. Go to Extensions > Apps Script. Replace everything in `Code.gs` with `apps-script/Code.gs`. Save.
3. Go to Deploy > New deployment > gear icon > Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click Deploy, then authorize. If Google shows "unverified app", click Advanced > Go to project.
5. Copy the **Web app URL**. It ends in `/exec`.

### 2. GitHub
1. Create a new repository named `pio-offset-tracker` (Public).
2. Click "uploading an existing file". Drag in everything from this folder, including the `apps-script` folder. Commit.
3. Open `config.js` in GitHub, click the pencil icon, paste the Web app URL between the quotes, and commit.
4. Go to Settings > Pages. Under Source, pick **Deploy from a branch**, then `main` and `/ (root)`. Save.
5. After a minute or two the site is live at `https://<your-username>.github.io/pio-offset-tracker/`.

### 3. First use
Open the site. The first screen asks you to create the admin account.
Then add staff in Staff. The three PIO divisions are created automatically.

## Patching

- **Screens, wording, design** (`index.html`): edit the file on GitHub and commit. It goes live in about a minute. Staff may need to refresh.
- **Server rules** (`apps-script/Code.gs`): update the file on GitHub to keep a record. Then paste the same code into Apps Script and go to
  Deploy > Manage deployments > pencil icon > Version: **New version** > Deploy.
  Always edit the existing deployment. A "New deployment" creates a new URL, and `config.js` would then point to the old one.

## Good to know

- Records are in the Google Sheet tabs `Users`, `Entries`, `Divisions`, `Holidays`, `Settings` and `Activity`. Don't rename the column headers.
- **Activity** is the audit trail: every change made in the app is added there with who, what and when. The app never edits or deletes it. Admins see it under Records > Activity log.
- Each offset entry is ½ day or 1 day. "After 5 PM" entries ask when the event ended: 1:00 AM or later = 1 day, earlier = ½ day, before 7:00 PM is not counted.
- Offsets logged in a month become usable on the 1st of the next month. Unused offsets carry over; admins can set a carry-over cap in Settings (0 = no limit).
- Staff request days off from their dashboard or the calendar; an admin approves them. Admins' own entries and requests need another admin (automatic if there is only one admin).
- Rejections need a short reason, which the employee sees.
- Staff can edit or remove their own entries while they are still waiting for review.
- Holidays: the 2026 national list and Camarines Norte's Vinzons Day (Sept 28) are added automatically. Add Eid'l Fitr, Eid'l Adha, local holidays and next year's list in Settings.
- Backups are on demand in Settings: save a copy of the Sheet to Google Drive, or download a JSON backup or CSV. Reports: Monthly page > Download CSV or Print report.
- "Keep me signed in" keeps a device signed in for 30 days, renewed with use. Resetting a PIN or deactivating/removing an account signs that person out everywhere.
- Install on a phone: open the site in Chrome (Android) or Safari (iPhone) > Add to Home Screen.
