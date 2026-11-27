# Frontend-only Investor Dashboard expiry

## Scope
- Lock the Investor Dashboard in the frontend at 12 April 2027, 00:00 Africa/Lagos time.
- Do not add or change backend, database, RLS, or API enforcement.
- Preserve existing investor authentication, roles, stored records, and unrelated dashboards.
- Show a subscription-expired screen with the ₦40,000 monthly fee, awaiting-subscription status, and a renewal contact action. The action's destination will use the contact details requested from you.

## Implementation
- Add a shared expiry check and deadline timer so an already-open dashboard locks at the specified time.
- Check the expiry before loading investment details and replace the dashboard with the existing lock-screen pattern adapted for the subscription message.
- Add a small test for the instant before expiry and the exact expiry boundary.

## Technical details
- The frontend compares against `2027-04-12T00:00:00+01:00` (midnight in Africa/Lagos).
- No server-side access checks or financial-data changes are included.