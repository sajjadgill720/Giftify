"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/client";
import { Icon } from "./icons";
import { Artwork } from "./artwork";
export default function Account() {
  const [user, setUser] = useState<any>(),
    [enabled, setEnabled] = useState(false),
    [mode, setMode] = useState("sign-in"),
    [form, setForm] = useState({ email: "", password: "" }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("config")
      .then((c) => setEnabled(c.accountsReady))
      .catch((e) => setError(e.message));
    api("auth/me")
      .then(setUser)
      .catch(() => {});
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("session", {});
      const result = await api("auth/" + mode, form);
      if (result.requiresConfirmation)
        setNotice(
          "Check your email to confirm your account, then sign in here.",
        );
      else {
        setUser(result);
        setForm({ email: "", password: "" });
        setNotice(
          "Signed in. Your current guest keepsakes are linked to this account.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("auth/sign-out", {});
      for (const key of Object.keys(localStorage))
        if (key.startsWith("keepsake-v2-")) localStorage.removeItem(key);
      setUser(undefined);
      setNotice("Signed out. Guest access has been cleared from this browser.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="account-page">
      <div className="account-story">
        <p className="eyebrow">YOUR STORIES, ALWAYS WITH YOU</p>
        <h1>
          A place for
          <br />
          <em>your keepsakes.</em>
        </h1>
        <p>
          Link the designs and orders you’ve created in this browser to a
          verified account. Return to them wherever your story takes you.
        </p>
        <Artwork />
        <div className="account-promise">
          <Icon name="shield" size={18} />
          Private orders. Verified ownership.
        </div>
      </div>
      <div className="account-form">
        <span className="login-emblem">
          <Icon name="bag" size={25} />
        </span>
        {user ? (
          <>
            <p className="eyebrow">WELCOME TO YOUR LITTLE COLLECTION</p>
            <h2>Your stories are together.</h2>
            <p>Signed in as {user.email}.</p>
            <Link href="/orders" className="button wide">
              My keepsakes <Icon name="arrow" />
            </Link>
            <button className="text-button" onClick={logout}>
              <Icon name="logout" size={15} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">A KEEPSAKE ACCOUNT</p>
            <h2>
              {mode === "sign-in"
                ? "Good to have you here."
                : "Keep your stories together."}
            </h2>
            <p>
              {mode === "sign-in"
                ? "Sign in to your private orders and saved designs."
                : "A verified account keeps your guest purchases within reach."}
            </p>
            {!enabled && (
              <div className="soft-note">
                <Icon name="clock" size={18} />
                <p>
                  Account sign-in needs the project’s Supabase configuration.
                  You can still design, save, and review guest orders in this
                  browser.
                </p>
              </div>
            )}
            <form onSubmit={submit}>
              <label className="field">
                Email address
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="field">
                Password
                <input
                  type="password"
                  required
                  minLength={mode === "sign-up" ? 12 : 1}
                  maxLength={200}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                {mode === "sign-up" && (
                  <span className="field-hint">
                    Use at least 12 characters. Email verification is required.
                  </span>
                )}
              </label>
              <button disabled={busy || !enabled} className="button wide">
                {busy
                  ? "Please wait…"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create verified account"}
                <Icon name="arrow" />
              </button>
            </form>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setError("");
                setNotice("");
              }}
            >
              {mode === "sign-in"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
            <p className="fine-print">
              Linking requires access to the original guest session and a
              verified email. Other people’s orders are never claimed.
            </p>
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="success-message" role="status">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
