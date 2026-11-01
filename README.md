# PIO Offset Tracker

Offset tracker for the Provincial Information Office, Camarines Norte.
The page is hosted on GitHub Pages. Data is saved in a Google Sheet through Google Apps Script.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (design and screens). Edit this for most patches. |
| `config.js` | The Apps Script link. Set once. |
| `pio-logo.webp` | PIO seal. |
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

- Records are in the Google Sheet tabs `Users`, `Entries` and `Divisions`. Don't rename the column headers.
- Offsets logged in a month are added to balances on the 1st of the next month.
- PINs are stored only as salted hashes. 5 wrong PINs lock a username for 15 minutes.
- Sessions end after 6 hours of no activity.
- `HOURS_PER_DAY` (8) and `WORKDAYS` (22) are at the top of `Code.gs`.
