# Production Deployment: Rice Hamali Rates Fix

If your production site is showing `₹NaN` or missing rates after the latest update, follow this guide to run the necessary database migration on your production server.

## 🎯 The Problem
The latest update simplifies Rice Hamali rates to a single column ("Above 24 feet"). While the code is updated on GitHub, your production database might still be empty or contain old data formats, causing calculation errors like `NaN`.

## 🚀 Solution: Run Migration on Production

### Option 1: Automatic (Easiest)
Migration 37 is integrated into the server startup. Restarting your production server should trigger it automatically.

1. **Push latest code:**
   ```bash
   git add .
   git commit -m "Fix: Rice Hamali rates - single column implementation"
   git push origin main
   ```
2. **Restart Server:**
   - **Render:** Go to your Dashboard -> backend service -> **Manual Deploy** -> **Clear Cache and Deploy**.
   - **Heroku/Railway:** Restart the service from the dashboard.
   - **VPS (PM2):** Run `pm2 restart all`.

---

### Option 2: Manual Script (If Option 1 fails)
Use the provided standalone script to force the migration.

1. **Access your production terminal (SSH).**
2. **Navigate to the server directory:**
   ```bash
   cd /path/to/your/app/server
   ```
3. **Run the script:**
   ```bash
   node run-migration-37.js
   ```
4. **Restart your server** to ensure the new rates are loaded.

---

### Option 3: Direct SQL (Last Resort)
If you have access to a SQL Editor (like Supabase SQL Editor), you can manually run the migration logic.

1. **Clear old rates:**
   ```sql
   DELETE FROM rice_hamali_rates;
   ```
2. **Check `server/migrations/37_fix_rice_hamali_rates_from_images.js`** for the full list of `INSERT` statements if needed.

---

## 🧪 Verification Steps
After deploying, verify the fix:

1. **Check Logs:** Look for `✅ Migration 37: Rice Hamali Rates from images fixed`.
2. **Test UI:** Open the Rice Hamali form; dropdowns should now show actual values (e.g., ₹1.54, ₹2.26) instead of `NaN`.
3. **Check Database:** `SELECT COUNT(*) FROM rice_hamali_rates;` should return **80**.

## 📋 Quick Checklist
- [ ] Push code to GitHub
- [ ] Restart production server with "Clear Cache"
- [ ] Verify logs for migration success
- [ ] Confirm no more `NaN` in the frontend
