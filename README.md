# PIO Overwatch

Offsets, travel orders, TEVs, leave credits and staff availability for the Provincial Information Office, Camarines Norte.
The app is hosted on GitHub Pages. Data is saved in Google Firebase (Cloud Firestore), with sign-in through Firebase Authentication.

Current version: **6.0** (Firebase).

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (screens, design and rules). Edit this for most patches. |
| `config.js` | Your Firebase settings (or the old Apps Script link). Set once. |
| `firebase.js` | The Firebase tools, bundled so the app needs no outside sites. Don't edit. |
| `firestore.rules` | Who may read and change what. Paste into Firebase console > Firestore > Rules. |
| `sw.js` | Lets the app install and open fast. Change the version line (`pio-offsets-v23`) whenever `index.html` changes, so phones pick up the update. |
| `to-header.png`, `to-footer.png`, `to-watermark.jpg` | Letterhead for printing travel orders from the browser (taken from the template). |
| `to-template.docx` | The office travel order template, with fill-in spots: `{DATE}` `{NAME}` `{DEST}` `{DEP}` `{ARR}` `{PURPOSE}` `{X1}` `{X2}` `{REC1}`–`{REC3}`. |
| `jszip.min.js` | Builds the travel order Word file inside the app. Don't edit. |
| `manifest.webmanifest`, `icon-*.png` | Make it installable (Add to Home Screen). |
| `pio-logo.webp`, `pio-digital.webp`, `capitol.webp` | PIO seal, sign-in wordmark and Capitol photo. Replace with a file of the same name to change them. |
| `apps-script/Code.gs` | The old Google Sheet server. Only needed to export your data before switching, or if you go back to it. |

## Setup with Firebase (once)

### 1. Save your current data
In the current app (still on the Google Sheet): Settings > **Backup (.json)**. Keep the file.

### 2. Create the Firebase project
1. Go to <https://console.firebase.google.com> with the office Google account. **Create a project** named "pio-overwatch". Google Analytics: off.
2. **Build > Authentication > Get started > Sign-in method > Email/Password > Enable** (leave "Email link" off). Save.
3. **Authentication > Settings > Authorized domains > Add domain**: `<your-username>.github.io`.
4. **Build > Firestore Database > Create database**. Location: **asia-southeast1 (Singapore)**. Start in **production mode**.
5. **Firestore > Rules**: replace everything with the contents of `firestore.rules`. **Publish**.
6. **Project settings (gear) > General > Your apps > Web (`</>`)**. Nickname "Overwatch". Don't tick Hosting. Register.
   Copy the `firebaseConfig` values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
7. Holidays (optional but recommended): open <https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>, pick the same project, click **Enable**.
   This lets the app load the Philippine holidays by itself.

### 3. GitHub
1. Upload `index.html`, `firebase.js`, `firestore.rules`, `sw.js`, `README.md`. Commit.
2. Open `config.js` on GitHub, click the pencil, and paste the values into `window.PIO_FIREBASE`. Commit.
3. After a minute, open the site. It shows **Create the admin account**: use your own username and PIN.

### 4. Bring in the old data
1. **Settings > Bring in data from the Google Sheet > Import backup (.json)**. Pick the file from step 1. Confirm.
2. **Staff > Set PINs for N**: give everyone one starting PIN. PINs can't be copied from the Sheet. Each person can change theirs after signing in.
3. Check the numbers (offsets, leaves, TEVs) against the Sheet for two or three people.

## Updating

| What changed | Where | Steps |
|---|---|---|
| `index.html`, `sw.js`, template | GitHub | Upload the files (same names) and commit. Live in about a minute. Refresh twice on phones. |
| `firestore.rules` | Firebase console | Firestore > Rules > paste > Publish. Also update the copy on GitHub. |

## Free plan limits (Spark)

- 50,000 reads and 20,000 writes a day, 1 GB stored. Each device keeps its own copy and only downloads what changed, so a 30-person office uses a small part of this.
- See usage in Firebase console > Firestore > **Usage**. If it ever gets close, switch to the Blaze plan (pay as you go). At this size it costs centavos a month.

## How it works

### Accounts
- Sign in with username and 4–6 digit PIN. "Keep me signed in" keeps the device signed in; without it, closing the browser signs out.
- Too many wrong PINs and Firebase blocks sign-in from that device for a few minutes.
- Deactivating or removing an account blocks it right away. Resetting a PIN makes the old PIN stop working.
- Admins see everything. Staff see only their own entries, leaves and TEVs, plus who is out. The rules in `firestore.rules` enforce this on Firebase's side, not only in the app.

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
3. Prepared travel orders get a **print button**. It opens a print dialog: check the date prepared, tick other prepared travel orders to print together, then **Print** (straight from the browser, or Save as PDF). **Word file** downloads the same thing as a .docx made from `to-template.docx`. The letterhead is `to-header.png`, `to-footer.png` and `to-watermark.jpg`:
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
- Statuses: **To prepare** > **Pending** (waiting for the cheque) > **Claimed**. Each row has a one-tap button for the next step (Submit, Claim), and a travel order with several pending TEVs has **Claim all**.
- Each TEV lists what it covers (transportation, food, accommodation, other) with amounts. A category counts only if it has an amount.
- Totals for the year: released, pending, to prepare, and left for spending (budget − released − pending).

### TEV amounts (worksheet)
- Open a TEV to see it day by day. Pick **where**: within the province, within Bicol, or outside Bicol (applies to everyone on the travel order).
- Within Bicol: ₱1,500 a day (50% lodging, 30% meals, 20% incidental); transportation up to ₱1,000.
- Outside Bicol: ₱2,200 a day, same split; transportation up to ₱2,000.
- Within the province: no lodging; 3 meals = ₱450; incidental (₱300, so ₱750 in all) only 50 km or more from the Capitol.
- **Noon rule:** leaving 12:00 NN or later, the first day is not claimed. The return day has meals and incidental, no lodging.
- Untick meals the host provided. **Government vehicle** = no transportation claim. JO: no incidental. COS: no TEV (none is created for them).
- Rates, signatories and codes can be changed in Settings > TEV rates and signatories.
- **Print** (printer icon on each travel order in TEVs, or in the TEV): Itinerary of Travel (per person), Payroll, Disbursement Voucher (amount in words filled in), Obligation Request, Certificate of Travel Completed (per person). Pick forms and people, then print or Save as PDF. When the travel order has Job Order staff, a **Certification for Job Order staff** (meal allowance, from COT_TEMPLATE) is also offered: one page naming all JO staff picked, signed by the PIO, on the same letterhead as the travel order. With one JO person, pick he or she in the dialog; with more it says they. The other forms print on A4; the Payroll prints as its own job on long bond paper (8.5 × 13 in). After the A4 forms, the app asks you to load long bond and print the payroll.
- Positions printed on the forms: Staff > Manage > Position.

### Leaves (Regular and Casual)
- Admins enter starting VL/SL balances from the leave card. The app adds 1.25 days of each per month.
- Leaves are filed on CS Form No. 6 as usual and recorded here by an admin. Covers VL, forced, SL, SPL, wellness, solo parent, calamity, maternity, paternity, VAWC, special leave for women, rehabilitation, study, adoption and leave without pay.

### Availability and calendar
- Availability shows who is in the office, in the field, on leave or on a day off, for any date and week. Staff see "On leave" without the leave type.
- The calendar shows holidays, travel orders, leaves, offsets and days off, plus an **Events in [month]** list.

### Holidays
- National holidays update by themselves every week (when an admin opens the app) from Google's Philippine holiday calendar. Admins can also tap **Update now** in Settings. Needs the Calendar API step in Setup.
- Add provincial and local holidays in Settings.

## Good to know

- Firestore collections: `users`, `entries`, `travelOrders`, `tevs`, `leaves`, `credits`, `divisions`, `holidays`, `settings`, `board` (who is out), `activity`, plus `members` and `logins` (sign-in). Don't edit them by hand unless you know what you're doing; use the app.
- Deleted records are kept with a `_del` mark so every device knows they were removed.
- **Activity** is the audit trail: every change with who, what and when. It can only be added to. Admins see it under Records > Activity log.
- Saves show on screen right away and reach Firebase in under a second. Offline, they wait on the device and send by themselves.
- Changes made by others appear on your screen by themselves. What you're typing is kept.
- Backups: Settings > **Backup (.json)** and **All entries (.csv)**. Do it monthly and before big changes.
- Phones and tablets: swipe from the left edge or tap ☰ for the menu. Install with Add to Home Screen (Chrome on Android, Safari on iPhone).

## Handover

- The Firebase project belongs to the Google account that created it. Add a second owner: Firebase console > Project settings > **Users and permissions** > Add member > Owner.
- Keep `config.js` values somewhere safe. They are not secret (anyone using the app can see them); the rules are what protect the data.
