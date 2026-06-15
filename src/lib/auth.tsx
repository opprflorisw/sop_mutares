import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

// ============================================================
// Auth — now backed by Convex (users table + authenticate query).
// Deliberately simple ("no complicated stuff"): email + password,
// seeded demo accounts, create/delete in the Accounts page. Only the
// current session's user id is kept in localStorage.
// ============================================================

export type Role = "Admin" | "Planner" | "Viewer";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: number;
};

const SESSION_KEY = "sop_session_v2";

type AuthContextValue = {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  createUser: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const usersData = useQuery(api.users.list);
  const users = (usersData ?? []) as User[];
  const loading = usersData === undefined;
  const createMut = useMutation(api.users.create);
  const removeMut = useMutation(api.users.remove);

  const [userId, setUserId] = useState<string | null>(
    () => localStorage.getItem(SESSION_KEY)
  );

  const value = useMemo<AuthContextValue>(() => {
    const current = users.find((u) => u.id === userId) ?? null;
    return {
      user: current,
      users,
      loading,
      login: async (email, password) => {
        const result = (await convex.query(api.users.authenticate, {
          email: email.trim().toLowerCase(),
          password,
        })) as User | null;
        if (!result) return { ok: false, error: "Incorrect email or password." };
        localStorage.setItem(SESSION_KEY, result.id);
        setUserId(result.id);
        return { ok: true };
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        setUserId(null);
      },
      createUser: async ({ name, email, password, role }) => {
        if (password.length < 8)
          return { ok: false, error: "Password must be at least 8 characters." };
        try {
          await createMut({ name, email, role, password });
          return { ok: true };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Could not create user.";
          return { ok: false, error: msg.replace(/^.*Error:\s*/, "") };
        }
      },
      deleteUser: async (id) => {
        await removeMut({ id: id as never });
      },
    };
  }, [users, loading, userId, convex, createMut, removeMut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
