// Africa/Lagos is UTC+1; this is 12 April 2027 at 00:00 local time.
export const INVESTOR_SUBSCRIPTION_EXPIRES_AT = Date.parse("2027-04-12T00:00:00+01:00");

export const isInvestorSubscriptionExpired = (now = Date.now()) =>
  now >= INVESTOR_SUBSCRIPTION_EXPIRES_AT;