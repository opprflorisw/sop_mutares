import { useState } from "react";
import { useAuth, type User } from "../lib/auth";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import { IconPlus, IconUsers } from "../components/icons";

export default function AccountManagementPage() {
  const { users, user, createUser, deleteUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("Planner");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await createUser({ name, email, password, role });
    if (res.ok) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("Planner");
      setError(null);
      setOpen(false);
    } else {
      setError(res.error ?? "Could not create user.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Account management</h1>
          <p className="text-[13px] text-[var(--color-ink-2)]">
            Create and manage users who can access the S&OP Planner.
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen((o) => !o)}>
          <IconPlus size={15} /> New account
        </Button>
      </div>

      {open && (
        <Card className="mb-5">
          <CardTitle>Create a new account</CardTitle>
          <form
            onSubmit={submit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputCls}
                placeholder="Jane Planner"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                placeholder="jane@oppr.ai"
              />
            </Field>
            <Field label="Password (min 8 chars)">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
                className={inputCls}
              >
                <option value="Admin">Admin</option>
                <option value="Planner">Planner</option>
                <option value="Viewer">Viewer</option>
              </select>
            </Field>
            {error && (
              <div className="sm:col-span-2 rounded-md bg-[#FCEBEB] px-3 py-2 text-[12px] text-[#A32D2D]">
                {error}
              </div>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="primary">
                Create account
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card pad={false}>
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <IconUsers size={16} />
          <span className="text-[13px] font-semibold">
            Users ({users.length})
          </span>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[11px] text-[var(--color-ink-2)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t border-[var(--color-line)]"
              >
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-ink-2)]">
                  {u.email}
                </td>
                <td className="px-4 py-2.5">
                  <Tag tone={u.role === "Admin" ? "info" : "neutral"}>
                    {u.role}
                  </Tag>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.id === user?.id ? (
                    <span className="text-[11px] text-[var(--color-ink-3)]">
                      You
                    </span>
                  ) : (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-[11px] font-medium text-[var(--color-bad)] hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-2)]">
        {label}
      </span>
      {children}
    </label>
  );
}
