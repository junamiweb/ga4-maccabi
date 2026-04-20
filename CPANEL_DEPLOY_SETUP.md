## cPanel Git Deploy Setup (FTPS)

This repository is configured to deploy the plugin folder to cPanel on every push to `main` via FTPS.

### 1) Create a GitHub repository

1. Create an empty GitHub repo (for example: `ga4-maccabi`).
2. Connect your local folder:

```powershell
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git add .
git commit -m "Initial GA4 Maccabi plugin repository"
git push -u origin main
```

### 2) Add GitHub Secrets

Go to **GitHub > Settings > Secrets and variables > Actions** and add:

- `CPANEL_FTP_HOST` - FTP server (example: `ftp.shop.maccabi.co.il`)
- `CPANEL_FTP_PORT` - FTPS explicit port (usually `21`)
- `CPANEL_FTP_USERNAME` - FTP username
- `CPANEL_FTP_PASSWORD` - FTP password
- `CPANEL_WP_PLUGIN_PATH` - absolute plugin path on server, for example:
  - `/home/<cpanel-user>/public_html/wp-content/plugins`
  - or `/home/<cpanel-user>/public_html/ga4/wp-content/plugins`

### 3) Verify first deployment

1. Edit a file inside `ga4-maccabi-tracking`.
2. Push to `main`.
3. Open **GitHub Actions** and verify job `Deploy WordPress Plugin to cPanel` passed.
4. In WordPress Admin, verify the updated plugin version/files.

### Notes

- Only the folder `ga4-maccabi-tracking` is deployed.
- Keep plugin version updated in `ga4-maccabi-tracking.php`.
- This workflow uses explicit FTPS (`protocol: ftps`) and port `21`.
