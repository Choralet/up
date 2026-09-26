# Backing up Up

Your progress lives on your iPhone, inside the Up app. There are two ways to keep a copy.

## 1. Backup file (no setup)

Today → gear (⚙) → **Export Backup File**. Save it to Files or iCloud Drive.
To restore: **Import Backup File**, pick the file, confirm **Replace**.

## 2. Automatic backup to GitHub (set up once)

Up saves a copy to your **private** repository `Choralet/up-data` every time you leave the app (only when something changed). You can also tap **Back Up Now**.

### Make the token (only you can do this)

1. On github.com: your picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `Up backup`. Expiration: your choice (when it expires, make a new one and connect again).
3. **Repository access**: *Only select repositories* → `up-data`.
4. **Permissions** → Repository permissions → **Contents: Read and write**. (Metadata: Read-only is added automatically.)
5. **Generate token** and copy it.

### Connect in Up (this phone, first time)

Today → gear (⚙) → **GitHub backup**:

- GitHub owner: `Choralet`
- Repository: `up-data`
- Token: paste it

Tap **Connect**, then **Back Up Now**. You should see "Last backup: …".

### New phone (restore your backup)

1. Install Up and open it. In **Find your level**, tap **Skip for now** (Settings is reachable after that).
2. Today → gear (⚙) → GitHub backup → connect with a token as above.
3. Up sees there is already a backup and **pauses** automatic backup. Tap **Restore It** → **Replace**.
   Do **not** tap "Replace with This Phone" on a new phone: that overwrites your backup with the empty new phone.
   (If that ever happens, older versions are still in the repository's commit history on github.com.)

### Good to know

- The token stays on your phone. It is only ever sent to `api.github.com`, and it can only touch `up-data`.
- The token is **never** put in a backup file or in the repository.
- If iOS offers to save the token as a password in iCloud Keychain, tap "Not Now": it is not needed there.
- Up's storage is shared with any other site you publish under `choralet.github.io`. Only publish your own code there; the token can only reach `up-data` in any case.
- Backups upload only when something changed. If they stop working (for example the token expired, or no backup for a week), **Today shows "Backup needs attention"**. Make a new token, Disconnect, and connect again.
- Two phones connected at the same time overwrite each other's backup (the last one wins).
