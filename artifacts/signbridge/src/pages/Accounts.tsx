import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Trash2, Loader2, ShieldCheck, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: number;
  username: string;
  role: "admin" | "user";
  createdAt: string;
  createdBy: string | null;
}

const ROLE_CONFIG = {
  master: { label: "Master", icon: Crown, color: "text-yellow-600 bg-yellow-500/10" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-primary bg-primary/10" },
  user: { label: "User", icon: User, color: "text-muted-foreground bg-muted" },
};

function RoleBadge({ role }: { role: "master" | "admin" | "user" }) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreateAdmin = user?.role === "master";
  const availableRoles: Array<"admin" | "user"> = canCreateAdmin ? ["admin", "user"] : ["user"];

  const fetchAccounts = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/accounts", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load accounts.");
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create account.");
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      await fetchAccounts();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account.");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (target: Account) => {
    if (user?.role === "master") return target.role === "admin" || target.role === "user";
    if (user?.role === "admin") return target.role === "user";
    return false;
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <section className="space-y-1 pt-2">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
          Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-topic">Management</span>
        </h2>
        <p className="text-muted-foreground">
          {user?.role === "master"
            ? "Create and manage admin and user accounts."
            : "Create and manage user accounts."}
        </p>
      </section>

      {/* Create Account Form */}
      <div className="bg-card rounded-2xl border border-border shadow-md p-6 space-y-5">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-lg">Create New Account</h3>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. jsmith"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors text-sm"
                disabled={creating}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors text-sm"
                disabled={creating}
              />
            </div>
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <div className="flex gap-2">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      newRole === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !newUsername.trim() || !newPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-primary-foreground bg-primary shadow hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>

          {createError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{createError}</p>
          )}
        </form>
      </div>

      {/* Account List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">
          Existing Accounts
          {accounts.length > 0 && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">({accounts.length})</span>
          )}
        </h3>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        {loadingList ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl border border-border/50">
            No accounts yet. Create one above.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between px-5 py-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <RoleBadge role={account.role} />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{account.username}</p>
                    {account.createdBy && (
                      <p className="text-xs text-muted-foreground">Created by {account.createdBy}</p>
                    )}
                  </div>
                </div>

                {canDelete(account) && (
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id}
                    title="Delete account"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
