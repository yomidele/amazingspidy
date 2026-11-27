import { describe, expect, it } from "vitest";
import {
  INVESTOR_SUBSCRIPTION_EXPIRES_AT,
  isInvestorSubscriptionExpired,
} from "@/lib/investorSubscription";

describe("investor subscription expiry", () => {
  it("locks at midnight on 12 April 2027 in Africa/Lagos", () => {
    expect(INVESTOR_SUBSCRIPTION_EXPIRES_AT).toBe(Date.parse("2027-04-11T23:00:00.000Z"));
    expect(isInvestorSubscriptionExpired(INVESTOR_SUBSCRIPTION_EXPIRES_AT - 1)).toBe(false);
    expect(isInvestorSubscriptionExpired(INVESTOR_SUBSCRIPTION_EXPIRES_AT)).toBe(true);
    expect(isInvestorSubscriptionExpired(INVESTOR_SUBSCRIPTION_EXPIRES_AT + 1)).toBe(true);
  });
});