/**
 * End-to-end style integration test:
 *   login → close tab → reopen tab → land on dashboard with active session.
 *
 * We mount real React Router routes with the same auth-guard pattern the
 * dashboards use (`supabase.auth.getSession()` + redirect on null), drive
 * the actual `setRememberMe` / `enforceRememberMeOnBoot` flow, and use the
 * real jsdom `localStorage` / `sessionStorage` so tab-close semantics are
 * exercised end-to-end. Supabase's network layer is stubbed so the test
 * runs hermetically.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect, useState } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { render, screen, cleanup, act } from "@testing-library/react";

const SUPABASE_AUTH_KEY = "sb-wwtkejyxzllucfsksypn-auth-token";
const TEST_USER = { id: "user-abc", email: "traveler@example.com" };
const buildSession = () => ({
  access_token: "tkn",
  refresh_token: "rfr",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: TEST_USER,
});

// ---- Stub @supabase/supabase-js so the real client.ts builds a fake that
// reads/writes the real localStorage under the real auth key. ----------
vi.mock("@supabase/supabase-js", () => {
  const listeners = new Set<(event: string, session: any) => void>();
  const readSession = () => {
    const raw = localStorage.getItem(SUPABASE_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  };
  const emit = (event: string) => {
    const session = readSession();
    listeners.forEach((cb) => cb(event, session));
  };
  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: readSession() }, error: null }),
        signOut: async () => {
          localStorage.removeItem(SUPABASE_AUTH_KEY);
          emit("SIGNED_OUT");
          return { error: null };
        },
        onAuthStateChange: (cb: any) => {
          listeners.add(cb);
          return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
        },
      },
    }),
  };
});

/** Minimal route guard mirroring TravelDashboard's auth check. */
const Dashboard = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session) navigate("/login");
      else setEmail(session.user.email);
    })();
    return () => { alive = false; };
  }, [navigate]);
  return <div>{email ? `dashboard:${email}` : "checking…"}</div>;
};

const LoginStub = () => <div>login-page</div>;

const mountApp = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  );

const waitForText = async (text: RegExp) => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return screen.findByText(text);
};

describe("E2E: login → close tab → reopen → still on dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });
  afterEach(() => cleanup());

  it("with 'Remember me' checked, the session survives tab close and the user lands on the dashboard", async () => {
    // 1. User logs in (Supabase would write the token + we record the choice).
    const { setRememberMe } = await import("@/lib/rememberMe");
    localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(buildSession()));
    setRememberMe(true);

    // 2. User closes the browser tab (sessionStorage is wiped).
    sessionStorage.clear();
    cleanup();
    vi.resetModules();

    // 3. User reopens the app — boot runs, then the dashboard route mounts.
    const { enforceRememberMeOnBoot } = await import("@/lib/rememberMe");
    await enforceRememberMeOnBoot();
    mountApp();

    // 4. Auth guard finds the session and renders the dashboard.
    const el = await waitForText(/^dashboard:/);
    expect(el.textContent).toBe(`dashboard:${TEST_USER.email}`);
    expect(localStorage.getItem(SUPABASE_AUTH_KEY)).not.toBeNull();
  });

  it("with 'Remember me' unchecked, the Supabase auth token is NOT touched (Supabase owns its own storage)", async () => {
    const { setRememberMe } = await import("@/lib/rememberMe");
    localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(buildSession()));
    setRememberMe(false);

    sessionStorage.clear();
    cleanup();
    vi.resetModules();

    const { enforceRememberMeOnBoot } = await import("@/lib/rememberMe");
    await enforceRememberMeOnBoot();
    mountApp();

    // Token is still in localStorage; guard finds the session.
    const el = await waitForText(/^dashboard:/);
    expect(el.textContent).toBe(`dashboard:${TEST_USER.email}`);
    expect(localStorage.getItem(SUPABASE_AUTH_KEY)).not.toBeNull();
  });
});

