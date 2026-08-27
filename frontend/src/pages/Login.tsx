import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@salon.com" },
  { role: "Manager", email: "manager@salon.com" },
  { role: "Stylist", email: "jordan@salon.com" },
  { role: "Front desk", email: "front@salon.com" },
];

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@salon.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blush-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-blush-400 text-white shadow-lg shadow-brand-200">
            <Sparkles size={22} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Bloom Salon Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to run your salon</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="card mt-4">
          <p className="mb-2 text-xs font-medium text-slate-400">Demo accounts (password: password123)</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("password123");
                }}
                className="rounded-lg border border-slate-100 px-2 py-1.5 text-left text-xs hover:border-brand-200 hover:bg-brand-50"
              >
                <div className="font-medium text-slate-700">{a.role}</div>
                <div className="text-slate-400">{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
