# MedPay Play release checklist

## Before building

- Pull the latest `main` branch.
- Do not reapply old local `app.json`, `eas.json` or `pnpm-workspace.yaml` changes over the release configuration.
- Run `pnpm install` from the repository root.
- Confirm the API domain is `pharma-pay-tracker.onrender.com`.
- Confirm package ID is `com.medpay.agency`.
- Confirm version code is greater than every build previously uploaded to Play.
- Confirm target/compile SDK is Android 16 / API 36.

## Test APK

Build the preview APK and install it directly on at least one real Android phone. Test:

- New signup and login
- Existing legacy workspace conversion
- Dashboard totals and trend chart
- Stores, invoices, payments and reports
- Collection custom date range
- Monthly Register month navigation and filters
- Stable agency serial numbers
- Record, edit and delete payment
- Backup export and restore using demo data
- Logout/login persistence
- In-app account deletion on a disposable test account
- Slow/cold backend loading and retry states

Do not delete the real production owner account or restore demo data into the real workspace.

## Play AAB

- Increment `android.versionCode` before each Play upload.
- Build with the EAS `production` profile (AAB).
- Upload to Internal testing first.
- Review App Bundle Explorer permissions; only Internet should remain for the current feature set.
- Complete App content, Data safety, Privacy policy, Account deletion and Content rating.
- Use only sanitized demo screenshots.

New personal developer accounts may be required by Play Console to run a closed test with at least 12 opted-in testers for 14 continuous days before production access. Follow the requirement shown in the account's Production access screen.

## Known pre-production items

- Real email-based password reset still needs an email provider and verified sending domain.
- Free Beta is displayed but paid subscriptions are not enabled or enforced.
- Google Play Billing must be implemented before charging for digital subscriptions or premium app features through the Play-distributed app.
- Remove the legacy admin login fallback and temporary tenant defaults only after the tenant-aware backend deployment and owner conversion have been verified on production.
