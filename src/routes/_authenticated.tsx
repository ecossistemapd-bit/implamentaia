import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Wrench,
  FolderKanban,
  BookOpen,
  Settings as SettingsIcon,
  Settings2,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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

type NavItem = {
  to: "/dashboard" | "/solutions" | "/cursos" | "/implementador" | "/projects" | "/settings" | "/admin";
  label: string;
  icon: typeof LayoutDashboard;
  search?: Record<string, string>;
  badge?: string;
  implOnly?: boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/solutions", label: "Soluciones", icon: Sparkles },
  { to: "/solutions", label: "Builder", icon: Wrench, search: { mode: "builder" } },
  { to: "/cursos", label: "Cursos", icon: BookOpen, badge: "NUEVO" },
  { to: "/implementador", label: "Panel Impl.", icon: LayoutDashboard, implOnly: true },
  { to: "/projects", label: "Mis Proyectos", icon: FolderKanban },
  { to: "/admin", label: "Admin", icon: Settings2, adminOnly: true },
  { to: "/settings", label: "Configuración", icon: SettingsIcon },
];

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[200px] shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
      <div className="px-4 py-4">
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <div className="px-6 py-6"><Logo /></div>
            <div onClick={() => setOpen(false)}><NavList /></div>
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
      <Logo />
      <ThemeToggle />
    </header>
  );
}

function NavList() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string> });
  const { isImplementer, isAdmin } = useRole();
  return (
    <nav className="flex-1 space-y-0.5 px-2">
      {NAV.filter((item) => (!item.implOnly || isImplementer) && (!item.adminOnly || isAdmin)).map((item) => {
        const isBuilder = item.label === "Builder";
        const isSolutions = item.label === "Soluciones";
        const inBuilderMode = pathname.startsWith("/solutions") && search?.mode === "builder";
        let active: boolean;
        if (isBuilder) active = inBuilderMode;
        else if (isSolutions) active = pathname.startsWith("/solutions") && !inBuilderMode;
        else active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            to={item.to}
            search={item.search as never}
            className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-black px-1.5 py-0.5 text-[10px] text-white">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
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
    <div className="border-t border-sidebar-border px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={(user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{email}</span>
              <span className="text-xs text-muted-foreground">Mi cuenta</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
      <div className="mt-2 flex justify-end">
        <ThemeToggle />
      </div>
    </div>
  );
}

// eslint silencer for unused redirect import (kept for future beforeLoad use)
void redirect;
