# MedPay Play Console data-safety notes

Use this as a preparation sheet. Confirm every answer against the exact production build when completing Play Console.

## High-level answers

- Data is collected: **Yes**
- Data is shared with third parties for their own purposes: **No**
- Data is encrypted in transit: **Yes** (production API uses HTTPS)
- Users can request deletion: **Yes**
- Account deletion URL: https://pharma-pay-tracker.onrender.com/delete-account
- Ads: **No**
- Analytics or tracking SDK: **No**

Infrastructure providers that process data only to operate MedPay should be treated according to Google Play's service-provider rules, not silently omitted if the production setup changes.

## Data collected

| Play data type | MedPay example | Required? | Purpose |
|---|---|---:|---|
| Name | Owner/full name, business/store owner name | Yes for account; store details are user-entered | Account management, app functionality |
| Email address | Account email | Yes | Account management, support, deletion verification |
| User IDs | Username and internal account/workspace IDs | Yes | Authentication, account management, security |
| Phone number | Medical-store contact number | Only when the user enters a store | App functionality |
| Address | Medical-store address | Only when the user enters a store | App functionality |
| Other financial info | Invoice amounts, outstanding balances, payment amounts/modes | Core business data | App functionality |
| Files and docs | Backup file selected or exported by the user | Optional/user initiated | Backup and restore |
| Other user-generated content | Notes, bill/slip/receipt numbers | Optional | App functionality |

Passwords are never stored in plaintext by the application; the server stores password hashes. Authentication tokens are used to keep the user signed in.

## Not collected by the current build

- Precise or approximate device location
- Contacts
- Photos or videos
- Audio or microphone recordings
- Advertising ID
- Web browsing history
- Health and fitness data
- Crash analytics or product analytics

The Android manifest is configured to block location, microphone and legacy external-storage permissions. Recheck the final AAB in Play Console's App Bundle Explorer before submitting.
