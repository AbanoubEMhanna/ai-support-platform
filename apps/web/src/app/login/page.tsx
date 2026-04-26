"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="surface-dark">
        <div className="eyebrow text-orange-300">Welcome back</div>
        <h1 className="mt-3 text-5xl font-black leading-none tracking-[-0.06em] text-white">
          Login to your support workspace.
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-300">
          Continue ingesting documents, testing retrieval quality, and managing
          escalations.
        </p>
      </section>
      <section className="surface">
        <h2 className="text-3xl font-black tracking-[-0.05em]">Login</h2>
        {error ? <div className="error-box">{error}</div> : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-bold">Email</label>
            <input
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold">Password</label>
            <input
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
        <div className="text-sm text-stone-600">
          No account?{" "}
          <a
            className="font-bold underline decoration-orange-500 underline-offset-4"
            href="/register"
          >
            Register
          </a>
        </div>
      </section>
    </div>
  );
}
