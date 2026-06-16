import { useRef, useState } from "react";
import { useAuth, type User } from "../lib/auth";
import { useUserProfile } from "../lib/settingsStore";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import { IconPlus, IconUsers, IconUserCircle, IconUpload } from "../components/icons";

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
            Your profile, and the users who can access the S&OP Planner.
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen((o) => !o)}>
          <IconPlus size={15} /> New account
        </Button>
      </div>

      <MyProfile />


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

// Your own profile — first/last name + avatar, shown throughout the tool.
function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useUserProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const seedFirst = profile.firstName ?? user?.name?.split(" ")[0] ?? "";
  const seedLast = profile.lastName ?? user?.name?.split(" ").slice(1).join(" ") ?? "";
  const [first, setFirst] = useState(seedFirst);
  const [last, setLast] = useState(seedLast);
  const [saved, setSaved] = useState(false);

  function onAvatar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setProfile({ ...profile, avatar: String(reader.result) });
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }
  function save() {
    const fullName = `${first.trim()} ${last.trim()}`.trim();
    setProfile({ ...profile, firstName: first.trim(), lastName: last.trim(), fullName: fullName || profile.fullName });
    setSaved(true);
  }
  const initials = (first || user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <Card className="mb-5">
      <CardTitle right={<Tag tone="info">Shown throughout the tool</Tag>}>
        <span className="flex items-center gap-2"><IconUserCircle size={16} /> My profile</span>
      </CardTitle>
      <div className="flex flex-wrap items-start gap-5">
        {/* avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-100)] text-[24px] font-semibold text-[var(--color-brand-700)] ring-1 ring-inset ring-[var(--color-brand-200)]">
            {profile.avatar ? <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" /> : initials}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); e.target.value = ""; }} />
          <div className="flex items-center gap-1.5">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded-md border border-[var(--color-line-strong)] px-2 py-1 text-[11px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"><IconUpload size={12} /> Upload</button>
            {profile.avatar && <button onClick={() => setProfile({ ...profile, avatar: null })} className="rounded-md px-2 py-1 text-[11px] text-[var(--color-bad)] hover:underline">Remove</button>}
          </div>
        </div>
        {/* fields */}
        <div className="min-w-[260px] flex-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name"><input value={first} onChange={(e) => { setFirst(e.target.value); setSaved(false); }} className={inputCls} placeholder="Jane" /></Field>
            <Field label="Last name"><input value={last} onChange={(e) => { setLast(e.target.value); setSaved(false); }} className={inputCls} placeholder="Planner" /></Field>
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-3)]">{user?.email}</div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" onClick={save}>Save profile</Button>
            {saved && <span className="text-[12px] text-[var(--color-good-2)]">Saved ✓</span>}
          </div>
        </div>
      </div>
    </Card>
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
