import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Settings2,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
  HeartHandshake,
  Lock,
} from "lucide-react";
import type { PlanFeatureKey } from "@/lib/plans";
import { usePlan } from "@/hooks/use-plan";

/* ------------------------------------------------------------------
 * Sidebar custom icons (subpartes nombradas → animaciones temáticas).
 * Las clases CSS .nav-{name}:hover .{subparte} viven en styles.css.
 * ------------------------------------------------------------------ */
type IconProps = { className?: string; strokeWidth?: number };

function IconDashboardGrid({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect className="db-tile db-tile-1" x="3" y="3" width="7" height="9" />
      <rect className="db-tile db-tile-2" x="14" y="3" width="7" height="5" />
      <rect className="db-tile db-tile-3" x="14" y="12" width="7" height="9" />
      <rect className="db-tile db-tile-4" x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function IconStarSoluciones({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="star-trail" d="M3 21 L8 14" opacity={0} />
      <path className="star-shape" d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" />
    </svg>
  );
}

function IconBookCursos({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="book-cover" d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM4 19h14" />
      <path className="book-page" d="M7 7h8M7 11h8M7 15h5" strokeWidth={1.4} opacity={0} />
    </svg>
  );
}

function IconTrendProgreso({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="trend-line" d="M3 17l6-6 4 4 8-8" />
      <path className="trend-arrow" d="M14 7h7v7" />
    </svg>
  );
}

function IconFolderProyectos({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="folder-shape" d="M3 7h6l2-2h10v14H3z" />
      <rect className="folder-file" x="10" y="2" width="6" height="7" rx="0.5" fill="currentColor" stroke="none" opacity={0} />
    </svg>
  );
}

function IconWandBuilder({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="wand-stick" d="M5 19L15 9" />
      <path className="wand-tip" d="M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
      <circle className="wand-spark wand-spark-1" cx="20" cy="6" r="0.7" fill="currentColor" stroke="none" opacity={0} />
      <circle className="wand-spark wand-spark-2" cx="7" cy="5" r="0.6" fill="currentColor" stroke="none" opacity={0} />
      <circle className="wand-spark wand-spark-3" cx="19" cy="14" r="0.6" fill="currentColor" stroke="none" opacity={0} />
    </svg>
  );
}

function IconClockMentoria({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle className="clock-face" cx="12" cy="12" r="9" />
      <line className="clock-hand-minute" x1="12" y1="12" x2="12" y2="6" />
      <line className="clock-hand-hour" x1="12" y1="12" x2="15.5" y2="12" strokeWidth={2.2} />
      <circle className="clock-pivot" cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCogConfig({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg className={`nav-icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { FEATURES } from "@/lib/features";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
  | "/builder"
  | "/contratar-experto"
  | "/mentoria"
  | "/settings"
  | "/admin";

type NavItem = {
  to: RoutePath;
  label: string;
  icon: ComponentType<IconProps>;
  navClass?: string; // clase nav-* para disparar animaciones del icono en hover
  badge?: string;
  implOnly?: boolean;
  adminOnly?: boolean;
  /** Si está seteado y el plan no la incluye, aparece con candadito. */
  feature?: PlanFeatureKey;
};

type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: IconDashboardGrid, navClass: "nav-dashboard" },
      { to: "/solutions", label: "Soluciones", icon: IconStarSoluciones, navClass: "nav-soluciones", feature: "catalogo" },
    ],
  },
  {
    label: "Aprendizaje",
    items: [
      { to: "/cursos", label: "Cursos", icon: IconBookCursos, navClass: "nav-cursos", badge: "NUEVO" },
      { to: "/mi-progreso", label: "Mi Progreso", icon: IconTrendProgreso, navClass: "nav-progreso" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { to: "/projects", label: "Mis Proyectos", icon: IconFolderProyectos, navClass: "nav-proyectos" },
      { to: "/builder", label: "Builder", icon: IconWandBuilder, navClass: "nav-builder", badge: "NUEVO" },
      { to: "/contratar-experto", label: "Contratar Experto", icon: HeartHandshake },
      { to: "/mentoria", label: "Mentoría", icon: IconClockMentoria, navClass: "nav-mentorias", feature: "mentorias" },
      { to: "/implementador", label: "Panel Impl.", icon: LayoutDashboard, implOnly: true },
      { to: "/admin", label: "Admin", icon: Settings2, adminOnly: true },
    ],
  },
  {
    label: "Cuenta",
    items: [{ to: "/settings", label: "Configuración", icon: IconCogConfig, navClass: "nav-config" }],
  },
];

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // El tema (claro/oscuro) lo controla useTheme/ThemeToggle + el script
  // anti-FOUC de __root (default = sistema operativo). Ya NO se fuerza dark.
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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Wash violeta atmosférico global — visible en TODAS las rutas autenticadas.
       * Theme-aware (alpha sube en light, baja en dark). Fixed → no scroll. */}
      <div className="app-violet-wash" aria-hidden />

      <DesktopSidebar collapsed={sidebarCollapsed} />

      {/* Pestaña de toggle — fixed, sigue el borde de la sidebar sin heredar su fondo */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
        style={{ left: sidebarCollapsed ? 0 : 220, transition: "left 300ms ease-in-out" }}
        className="fixed top-1/2 z-50 hidden -translate-y-1/2 lg:flex h-14 w-[14px] items-center justify-center rounded-r-md border border-l-0 border-border bg-sidebar text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors duration-200"
      >
        {sidebarCollapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <ScrollToTop />
    </div>
  );
}

function DesktopSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    // overflow-hidden clipea el contenido limpiamente al colapsar — sin sangrado de fondo
    <div
      className={`hidden lg:block shrink-0 sticky top-0 h-screen overflow-hidden transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-0" : "w-[220px]"
      }`}
    >
      <aside className="flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center justify-between px-5 py-5 shrink-0">
          <Logo />
          <ThemeToggle />
        </div>
        <NavList />
        <UserMenu />
      </aside>
    </div>
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
      <ThemeToggle />
    </header>
  );
}

function NavList() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isImplementer, isAdmin } = useRole();
  const { hasFeature } = usePlan();
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
          .filter((it) => FEATURES.MARKETPLACE || (it.to !== "/contratar-experto" && it.to !== "/implementador"))
          .filter((it) => (!it.implOnly || isImplementer) && (!it.adminOnly || isAdmin))
          .map((it) => (it.to === "/cursos" && cursosVisited ? { ...it, badge: undefined } : it)),
      })).filter((sec) => sec.items.length > 0),
    [isImplementer, isAdmin, cursosVisited],
  );

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {sections.map((sec) => (
        <div key={sec.label} className="mb-4">
          <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {sec.label}
          </div>
          <div className="space-y-1">
            {sec.items.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/dashboard" && pathname.startsWith(item.to));
              const Icon = item.icon;
              const locked = !!item.feature && !hasFeature(item.feature);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  title={locked ? "Función bloqueada por tu plan" : undefined}
                  className={`${item.navClass ?? ""} group flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-[13px] transition-colors duration-200 ${
                    active
                      ? "border-primary bg-primary/[0.08] font-medium text-foreground"
                      : "border-transparent font-normal text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                  } ${locked ? "opacity-60" : ""}`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                  {locked && (
                    <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {!locked && item.badge && (
                    <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
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
    <div className="border-t border-sidebar-border px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.08]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={(user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url} />
              <AvatarFallback className="bg-muted text-primary">{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{email}</span>
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
    </div>
  );
}

void redirect;
