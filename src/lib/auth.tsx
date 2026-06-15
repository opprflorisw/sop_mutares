import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ============================================================
// Simple auth — Phase 0.
// Seeded users + create-account, persisted to localStorage.
// Deliberately lightweight ("no complicated stuff"). The shape
// mirrors the Convex `users` table so swapping the storage layer
// to Convex in a later phase is a localised change.
// ============================================================

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Planner" | "Viewer";
  password: string; // plain for the MVP scaffold only; hashed in Convex later
  createdAt: number;
};

export type PublicUser = Omit<User, "password">;

const STORAGE_KEY = "sop_users_v1";
const SESSION_KEY = "sop_session_v1";

const SEED_USERS: User[] = [
  { id: "u_floris", name: "Floris", email: "floris@oppr.ai", role: "Admin", password: "12345678", createdAt: 0 },
  { id: "u_sanchay", name: "Sanchay", email: "sanchay@oppr.ai", role: "Admin", password: "12345678", createdAt: 0 },
];

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return JSON.parse(raw) as User[];
  } catch {
    return SEED_USERS;
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function toPublic(u: User): PublicUser {
  const { password: _pw, ...rest } = u;
  return rest;
}

type AuthContextValue = {
  user: PublicUser | null;
  users: PublicUser[];
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  createUser: (input: {
    name: string;
    email: string;
    password: string;
    role: User["role"];
  }) => { ok: boolean; error?: string };
  deleteUser: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [userId, setUserId] = useState<string | null>(
    () => localStorage.getItem(SESSION_KEY)
  );

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const value = useMemo<AuthContextValue>(() => {
    const current = users.find((u) => u.id === userId) ?? null;
    return {
      user: current ? toPublic(current) : null,
      users: users.map(toPublic),
      login: (email, password) => {
        const match = users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!match) return { ok: false, error: "No account with that email." };
        if (match.password !== password)
          return { ok: false, error: "Incorrect password." };
        localStorage.setItem(SESSION_KEY, match.id);
        setUserId(match.id);
        return { ok: true };
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        setUserId(null);
      },
      createUser: ({ name, email, password, role }) => {
        const exists = users.some(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (exists) return { ok: false, error: "Email already in use." };
        if (password.length < 8)
          return { ok: false, error: "Password must be at least 8 characters." };
        const newUser: User = {
          id: `u_${Math.random().toString(36).slice(2, 10)}`,
          name: name.trim(),
          email: email.trim(),
          role,
          password,
          createdAt: Date.now(),
        };
        setUsers((prev) => [...prev, newUser]);
        return { ok: true };
      },
      deleteUser: (id) => {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      },
    };
  }, [users, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
