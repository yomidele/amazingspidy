/**
 * Integration test for the "Remember me" persistence flow.
 *
 * Simulates: login → close tab → reopen tab, and verifies that:
 *  - When "Remember me" is checked, the Supabase auth token survives the
 *    tab close and the user lands on the dashboard with an active session.
 *  - When "Remember me" is unchecked, the auth token is purged on reopen
 *    and the user is sent back to login.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const SUPABASE_AUTH_KEY = "sb-wwtkejyxzllucfsksypn-auth-token";
const FAKE_SESSION = JSON.stringify({
  access_token: "fake-access",
  refresh_token: "fake-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "user-123", email: "test@example.com" },
});

/** Simulates closing the browser tab: sessionStorage is wiped, localStorage persists. */
const closeTab = () => sessionStorage.clear();

/**
 * Simulates reopening the app in a new tab. Re-imports rememberMe (which
 * triggers enforceRememberMeOnBoot equivalent) and then asks a mocked
 * Supabase client what session it sees in storage.
 */
const reopenTabAndGetSession = async () => {
  vi.resetModules();
  const { enforceRememberMeOnBoot } = await import("./rememberMe");
  await enforceRememberMeOnBoot();
  const raw = localStorage.getItem(SUPABASE_AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
};

describe("Remember me persistence across tab close/reopen", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  it("keeps the user logged in when 'Remember me' is checked", async () => {
    const { setRememberMe } = await import("./rememberMe");

    // Login with remember=true → Supabase stores session in localStorage.
    localStorage.setItem(SUPABASE_AUTH_KEY, FAKE_SESSION);
    setRememberMe(true);

    // User closes the tab.
    closeTab();

    // User reopens the app in a fresh tab.
    const session = await reopenTabAndGetSession();

    expect(session).not.toBeNull();
    expect(session.user.id).toBe("user-123");
    // App would now route them straight to the dashboard.
  });

  it("logs the user out when 'Remember me' is unchecked", async () => {
    const { setRememberMe } = await import("./rememberMe");

    localStorage.setItem(SUPABASE_AUTH_KEY, FAKE_SESSION);
    setRememberMe(false);

    closeTab();

    const session = await reopenTabAndGetSession();

    expect(session).toBeNull();
    // App would redirect to /login.
  });

  it("survives a reload (no tab close) even when remember=false", async () => {
    const { setRememberMe, enforceRememberMeOnBoot } = await import("./rememberMe");

    localStorage.setItem(SUPABASE_AUTH_KEY, FAKE_SESSION);
    setRememberMe(false);

    // Simulate a reload: sessionStorage is preserved, app boots again.
    vi.resetModules();
    const { enforceRememberMeOnBoot: boot2 } = await import("./rememberMe");
    await boot2();

    expect(localStorage.getItem(SUPABASE_AUTH_KEY)).toBe(FAKE_SESSION);
    void enforceRememberMeOnBoot;
  });

  it("does not purge a session when no preference was ever recorded", async () => {
    // Pre-existing session, user never interacted with the new checkbox.
    localStorage.setItem(SUPABASE_AUTH_KEY, FAKE_SESSION);
    closeTab();

    const session = await reopenTabAndGetSession();
    expect(session).not.toBeNull();
  });
});
