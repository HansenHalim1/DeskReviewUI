"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import "@/components/deskreview/desk-review.css";
import "./login.css";

export default function LoginForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, next }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Access could not be verified.");
        setPending(false);
        return;
      }
      setKey("");
      window.location.assign(result.next);
    } catch {
      setError("The server could not be reached. Please try again.");
      setPending(false);
    }
  }
  return (
    <main className="desk-app access-page" data-theme="system">
      <section className="access-card">
        <span className="access-lock">
          <LockKeyhole size={24} />
        </span>
        <div className="page-eyebrow">DESKREVIEW · REVIEWER ACCESS</div>
        <h1>Enter your access key</h1>
        <p>This workspace is reserved for the review team.</p>
        <form onSubmit={submit}>
          <label htmlFor="access-key">Website access key</label>
          <div className="access-input">
            <input
              id="access-key"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Paste your 64-character key"
              maxLength={64}
              required
              disabled={!configured || pending}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? "Hide access key" : "Show access key"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          {!configured && (
            <p className="access-error" role="alert">
              Access has not been configured. Contact the website administrator.
            </p>
          )}
          <button
            className="primary-button full-width"
            disabled={!configured || !key.trim() || pending}
          >
            {pending ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            {pending ? "Verifying access…" : "Enter workspace"}
          </button>
        </form>
        <div className="access-note">
          <ShieldCheck size={14} />
          <span>
            Access expires after 8 hours. Your review drafts remain saved on
            this browser.
          </span>
        </div>
      </section>
    </main>
  );
}
