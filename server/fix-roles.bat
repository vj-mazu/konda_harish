@echo off
echo ========================================
echo  Adding Sample Entry Roles to Database
echo ========================================
echo.

echo Step 1: Checking current status...
node check-sample-entry-status.js
echo.

echo Step 2: Running migrations...
node run-sample-entry-migrations.js
echo.

echo Step 3: Verifying roles were added...
node check-sample-entry-status.js
echo.

echo ========================================
echo  Done! Restart your server now.
echo ========================================
echo.
echo Run: npm run dev
echo.
pause
