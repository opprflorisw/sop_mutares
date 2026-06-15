import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = login(email, password);
    if (res.ok) navigate("/workspace");
    else setError(res.error ?? "Login failed.");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[var(--color-brand-800)] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[15px] font-bold">
            M
          </div>
          <span className="text-[15px] font-semibold">Mutares · S&OP Planner</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-[28px] font-semibold leading-tight">
            Sales & Operations Planning, without the PhD.
          </h1>
          <p className="mt-3 max-w-md text-[14px] text-white/70">
            Demand, supply and production in one intuitive picture — upload your
            data in a standard format and plan with confidence.
          </p>
          <div className="mt-6 flex gap-2">
            {["Demand", "Supply", "Production"].map((m) => (
              <span
                key={m}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px]"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-white/50">
          © {new Date().getFullYear()} Mutares — internal tool
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center bg-[var(--color-surface-2)] p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7"
        >
          <h2 className="text-[18px] font-semibold">Sign in</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-2)]">
            Welcome back. Enter your credentials.
          </p>

          <label className="mt-6 block text-[12px] font-medium text-[var(--color-ink-2)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@oppr.ai"
            className="mt-1.5 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]"
            autoFocus
          />

          <label className="mt-4 block text-[12px] font-medium text-[var(--color-ink-2)]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]"
          />

          {error && (
            <div className="mt-3 rounded-md bg-[#FCEBEB] px-3 py-2 text-[12px] text-[#A32D2D]">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" className="mt-5 w-full py-2">
            Sign in
          </Button>

          <div className="mt-5 rounded-md border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[11px] text-[var(--color-ink-2)]">
            <div className="font-medium text-[var(--color-ink)]">Demo accounts</div>
            floris@oppr.ai · sanchay@oppr.ai — password <code>12345678</code>
          </div>
        </form>
      </div>
    </div>
  );
}
