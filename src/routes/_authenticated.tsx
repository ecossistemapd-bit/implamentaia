import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  BookOpen,
  Settings as SettingsIcon,
  Settings2,
  LogOut,
  Menu,
  ChevronRight,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { FEATURES } from "@/lib/features";
import { Logo } from "@/components/logo";
import { ScrollToTop } from "@/components/scroll-to-top";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type RoutePath =
  | "/dashboard"
  | "/solutions"
  | "/cursos"
  | "/mi-progreso"
  | "/implementador"
  | "/projects"
  | "/contratar-experto"
  | "/settings"
  | "/admin";

type NavItem = {
  to: RoutePath;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  implOnly?: boolean;
  adminOnly?: boolean;
};

type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/solutions", label: "Soluciones", icon: Sparkles },
    ],
  },
  {
    label: "Aprendizaje",
    items: [
      { to: "/cursos", label: "Cursos", icon: BookOpen, badge: "NUEVO" },
      { to: "/mi-progreso", label: "Mi Progreso", icon: TrendingUp },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { to: "/projects", label: "Mis Proyectos", icon: FolderKanban },
      { to: "/contratar-experto", label: "Contratar Experto", icon: HeartHandshake },
      { to: "/implementador", label: "Panel Impl.", icon: LayoutDashboard, implOnly: true },
      { to: "/admin", label: "Admin", icon: Settings2, adminOnly: true },
    ],
  },
  {
    label: "Cuenta",
    items: [{ to: "/settings", label: "Configuración", icon: SettingsIcon }],
  },
];

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Force dark theme inside the authenticated app shell.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="dark flex min-h-screen bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <ScrollToTop />
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-white/6 bg-[#0A0A0A] lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <NavList />
      <UserMenu />
    </aside>
  );
}

function MobileTopBar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar/90 px-4 py-3 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <div className="flex h-full flex-col">
            <div className="px-5 py-5"><Logo /></div>
            <div onClick={() => setOpen(false)}><NavList /></div>
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
      <Logo />
      <div className="w-10" />
    </header>
  );
}

function NavList() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isImplementer, isAdmin } = useRole();
  const [cursosVisited, setCursosVisited] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cursos_visited") === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/cursos")) {
      if (localStorage.getItem("cursos_visited") !== "true") {
        localStorage.setItem("cursos_visited", "true");
      }
      if (!cursosVisited) setCursosVisited(true);
    }
  }, [pathname, cursosVisited]);

  const sections = useMemo(
    () =>
      SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items
          .filter((it) => (!it.implOnly || isImplementer) && (!it.adminOnly || isAdmin))
          .map((it) => (it.to === "/cursos" && cursosVisited ? { ...it, badge: undefined } : it)),
      })).filter((sec) => sec.items.length > 0),
    [isImplementer, isAdmin, cursosVisited],
  );

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {sections.map((sec) => (
        <div key={sec.label} className="mb-4">
          <div className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            {sec.label}
          </div>
          <div className="space-y-1">
            {sec.items.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/dashboard" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    active
                      ? "bg-zinc-900 text-white font-medium"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="border-t border-zinc-800/50 px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-900">
            <Avatar className="h-8 w-8">
              <AvatarImage src={(user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url} />
              <AvatarFallback className="bg-zinc-800 text-zinc-300">{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-zinc-400">{email}</span>
              <span className="text-xs text-zinc-600">Mi cuenta</span>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-56">
          <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
            <SettingsIcon className="mr-2 h-4 w-4" /> Configuración
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

void redirect;
