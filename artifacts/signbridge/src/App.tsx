import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Dictionary from "@/pages/Dictionary";
import Accounts from "@/pages/Accounts";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut, Users, Loader2, Sun, Moon } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function Nav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const mainTabs = [
    { href: "/", label: "Translator" },
    { href: "/dictionary", label: "Dictionary" },
  ];

  const canManageAccounts = user?.role === "master" || user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-inner">
            <span className="text-primary-foreground font-bold text-lg leading-none">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">SignBridge</span>
        </div>

        <nav className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
          {mainTabs.map((tab) => {
            const active = location === tab.href || (tab.href !== "/" && location.startsWith(tab.href));
            return (
              <Link key={tab.href} href={tab.href}>
                <span className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {canManageAccounts && (
            <Link href="/accounts">
              <span className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                location.startsWith("/accounts")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Accounts</span>
              </span>
            </Link>
          )}

          <ThemeToggle />

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={() => navigate("/")} />;
  }

  const canManageAccounts = user.role === "master" || user.role === "admin";

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/dictionary" component={Dictionary} />
          {canManageAccounts && (
            <Route path="/accounts" component={Accounts} />
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="mt-16 py-8 border-t border-border text-center text-sm text-muted-foreground print:hidden">
        <p>SignBridge &copy; {new Date().getFullYear()}. Designed for educational purposes.</p>
      </footer>
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ProtectedApp />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
