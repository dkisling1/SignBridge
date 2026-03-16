import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Dictionary from "@/pages/Dictionary";
import NotFound from "@/pages/not-found";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Nav() {
  const [location] = useLocation();

  const tabs = [
    { href: "/", label: "Translator" },
    { href: "/dictionary", label: "Dictionary" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-inner">
            <span className="text-primary-foreground font-bold text-lg leading-none">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">SignBridge</span>
        </div>

        <nav className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
          {tabs.map((tab) => {
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
      </div>
    </header>
  );
}

function Router() {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/dictionary" component={Dictionary} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="mt-16 py-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>SignBridge &copy; {new Date().getFullYear()}. Designed for educational purposes.</p>
      </footer>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
