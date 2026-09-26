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

### Connect in Up

Today → gear (⚙) → **GitHub backup**:

- GitHub owner: `Choralet`
- Repository: `up-data`
- Token: paste it

Tap **Connect**, then **Back Up Now**. You should see "Last backup: …".

### Good to know

- The token stays on your phone. It is only ever sent to `api.github.com`, and it can only touch `up-data`.
- The token is **never** put in a backup file or in the repository.
- New phone: install Up, connect with a token the same way, then **Restore from GitHub** → **Replace**.
- If a background backup fails (for example no connection), Settings shows the reason; the next one retries.
