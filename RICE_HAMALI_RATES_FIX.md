# Rice Hamali Rates Fix

This document records the changes made to fix the Rice Hamali Rates system, specifically focusing on simplifying the rate structure to a single column ("Above 24 feet").

## Changes Made

### Frontend
- **File:** `client/src/components/RiceHamaliRatesTable.tsx`
- **Updates:**
  - Removed 18-21 and 21-24 columns from table header.
  - Removed 18-21 and 21-24 input fields from Add/Edit form.
  - Updated form state to only include `rate_24_27`.
  - Updated submit handler to send `rate_18_21=0`, `rate_21_24=0`.
  - Added cache-busting headers to prevent stale data.
  - Added 300ms delay before refresh after edit.

### Backend
- **File:** `server/routes/riceHamaliRates.js`
- **Updates:**
  - Updated GET `/` to fetch only `rate_24_27` column.
  - Updated GET `/work-type/:workType` to fetch only `rate_24_27` column.

### Database
- **File:** `server/migrations/37_fix_rice_hamali_rates_from_images.js`
- **Updates:**
  - Changed all `rate_18_21` values to 0.
  - Changed all `rate_21_24` values to 0.
  - Kept only `rate_24_27` with actual values from images.
  - Integration: Already added in server startup sequence.

## Result
Only "Above 24 feet" (rate_24_27) column is now visible in the UI and used by the system. Data persistence and seeding are now accurate and stable.
