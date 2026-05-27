import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Ticket,
  Radio,
  CheckCircle2,
  ExternalLink,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Route ──────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/mentoria/")({
  component: MentoriaPage,
});

// ── Types ──────────────────────────────────────────────────────
interface Mentor {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[];
}

interface Mentoria {
  id: string;
  title: string;
  mentor_id: string | null;
  day_of_week: number; // 1=Lun ... 5=Vie
  time_slot: TimeSlot;
  starts_at: string;   // "09:00:00"
  duration_minutes: number;
  meeting_url: string | null;
  mentor: Mentor | null;
}

interface MentoriaBooking {
  id: string;
  mentoria_id: string;
  week_date: string;
}

// ── Constants ──────────────────────────────────────────────────
const DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];
const TIME_SLOTS = [
  "morning_1",
  "morning_2",
  "afternoon_1",
  "afternoon_2",
] as const;
type TimeSlot = (typeof TIME_SLOTS)[number];

const SLOT_META: Record<TimeSlot, { label: string; period: string }> = {
  morning_1:   { label: "09:00", period: "Mañana" },
  morning_2:   { label: "10:30", period: "Mañana" },
  afternoon_1: { label: "15:00", period: "Tarde"  },
  afternoon_2: { label: "16:30", period: "Tarde"  },
};

// ── Date helpers ───────────────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom … 6=Sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const m = monday.toLocaleDateString("es-AR", opts);
  const f = friday.toLocaleDateString("es-AR", opts);
  return `${m} — ${f}`;
}

/** Hora actual en zona Argentina */
function getARTime(): { h: number; m: number; dow: number } {
  const str = new Date().toLocaleString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const ar = new Date(str);
  const dow = ar.getDay(); // 0=Dom, 1=Lun … 5=Vie, 6=Sáb
  return { h: ar.getHours(), m: ar.getMinutes(), dow };
}

function isLiveNow(m: Mentoria): boolean {
  const { h, m: min, dow } = getARTime();
  if (dow !== m.day_of_week) return false;
  const [sh, sm] = m.starts_at.slice(0, 5).split(":").map(Number);
  const start = sh * 60 + sm;
  const end   = start + m.duration_minutes;
  const cur   = h * 60 + min;
  return cur >= start && cur < end;
}

function isSessionPast(m: Mentoria, dayDate: Date, todayStr: string): boolean {
  const ds = toISODate(dayDate);
  if (ds < todayStr) return true;
  if (ds > todayStr) return false;
  // Hoy: verificar si ya terminó
  const { h, m: min } = getARTime();
  const [sh, sm] = m.starts_at.slice(0, 5).split(":").map(Number);
  return h * 60 + min >= sh * 60 + sm + m.duration_minutes;
}

// ── MentorAvatar ───────────────────────────────────────────────
function MentorAvatar({
  mentor,
  size = "md",
}: {
  mentor: Mentor | null;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-12 w-12 text-[15px]"
        : "h-9 w-9 text-[12px]";
  const initials = mentor?.full_name
    ? mentor.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "M";

  if (mentor?.avatar_url) {
    return (
      <img
        src={mentor.avatar_url}
        alt={mentor.full_name}
        className={`${sz} rounded-full object-cover shrink-0 border border-[var(--violet-border)]`}
      />
    );
  }
  return (
    <div
      className={`${sz} rounded-full shrink-0 bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] flex items-center justify-center font-semibold [color:var(--violet-text)]`}
    >
      {initials}
    </div>
  );
}

// ── SessionCard ────────────────────────────────────────────────
function SessionCard({
  mentoria,
  isBooked,
  tickets,
  onBook,
  isPast,
}: {
  mentoria: Mentoria;
  isBooked: boolean;
  tickets: number;
  onBook: (m: Mentoria) => void;
  isPast: boolean;
}) {
  const live = isLiveNow(mentoria);

  return (
    <div
      className={[
        "app-card flex flex-col gap-2 p-3 h-full transition-all",
        live ? "!ring-1 ring-red-500/40" : "",
        isBooked && !live ? "!ring-1 ring-[var(--violet-border)]" : "",
        isPast ? "opacity-45 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Live badge */}
      {live && (
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          En vivo ahora
        </span>
      )}

      {/* Mentor */}
      {mentoria.mentor && (
        <div className="flex items-center gap-1.5 min-w-0">
          <MentorAvatar mentor={mentoria.mentor} size="sm" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
              {mentoria.mentor.full_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">
              {mentoria.mentor.role}
            </p>
          </div>
        </div>
      )}

      {/* Title */}
      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 flex-1 min-h-[28px]">
        {mentoria.title}
      </p>

      {/* CTA */}
      {isPast ? (
        <span className="text-[10px] text-muted-foreground/40">Finalizada</span>
      ) : isBooked ? (
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 text-[10px] font-medium [color:var(--violet-text)]">
            <CheckCircle2 className="h-3 w-3" />
            Reservado
          </span>
          {live && mentoria.meeting_url && (
            <a
              href={mentoria.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500 hover:text-red-400 transition"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Unirse
            </a>
          )}
        </div>
      ) : (
        <button
          onClick={() => onBook(mentoria)}
          disabled={tickets < 1}
          className="app-cta-primary !text-[10px] !py-1 !px-2 !gap-1 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Ticket className="h-2.5 w-2.5 shrink-0" />
          {tickets < 1 ? "Sin tickets" : "Reservar · 1 ticket"}
        </button>
      )}
    </div>
  );
}

// ── MentorPanel ────────────────────────────────────────────────
function MentorPanel({ mentores }: { mentores: Mentor[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 [color:var(--violet-text)]" />
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
          Nuestros Mentores
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {mentores.map((m) => (
          <div key={m.id} className="app-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <MentorAvatar mentor={m} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground leading-tight">
                  {m.full_name}
                </p>
                <span className="app-pill-violet inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium [color:var(--violet-text-strong)]">
                  {m.role}
                </span>
              </div>
            </div>
            {m.bio && (
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {m.bio}
              </p>
            )}
            {m.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full border border-[var(--violet-border)]/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div>
      {/* Header row */}
      <div className="grid mb-2" style={{ gridTemplateColumns: "64px repeat(5, 1fr)", gap: "8px" }}>
        <div />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
      {/* 4 slot rows */}
      {Array.from({ length: 4 }).map((_, row) => (
        <div key={row} className="grid mb-2" style={{ gridTemplateColumns: "64px repeat(5, 1fr)", gap: "8px" }}>
          <div className="h-[120px] rounded-lg bg-muted/20 animate-pulse" />
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="h-[120px] rounded-xl bg-muted/30 animate-pulse" style={{ animationDelay: `${(row * 5 + col) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
function MentoriaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookTarget, setBookTarget] = useState<Mentoria | null>(null);

  // Semana actual
  const monday = useMemo(() => {
    const base = getMondayOfWeek(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDateStr = toISODate(monday); // clave canónica de la semana
  const weekDays    = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(monday, i)),
    [monday],
  );
  const todayStr    = toISODate(new Date());

  // ── Queries ──────────────────────────────────────────────────

  const { data: mentorias = [], isLoading } = useQuery({
    queryKey: ["mentorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorias")
        .select("*, mentor:mentores(*)")
        .eq("is_active", true)
        .order("day_of_week")
        .order("time_slot");
      if (error) throw error;
      return data as unknown as Mentoria[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["mentoria-bookings", user?.id, weekDateStr],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentoria_bookings")
        .select("id, mentoria_id, week_date")
        .eq("user_id", user!.id)
        .eq("week_date", weekDateStr);
      if (error) throw error;
      return data as MentoriaBooking[];
    },
  });

  const { data: ticketCount = 0, refetch: refetchTickets } = useQuery({
    queryKey: ["user-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.tickets as number) ?? 0;
    },
  });

  // IDs de sesiones reservadas esta semana
  const bookedIds = useMemo(
    () => new Set(bookings.map((b) => b.mentoria_id)),
    [bookings],
  );

  // Grilla: [day_of_week][time_slot] → Mentoria
  const grid = useMemo(() => {
    const g: Record<number, Record<TimeSlot, Mentoria | undefined>> = {};
    for (let d = 1; d <= 5; d++) {
      g[d] = {
        morning_1: undefined,
        morning_2: undefined,
        afternoon_1: undefined,
        afternoon_2: undefined,
      };
    }
    for (const m of mentorias) {
      if (g[m.day_of_week]) g[m.day_of_week][m.time_slot] = m;
    }
    return g;
  }, [mentorias]);

  // Lista de mentores únicos (para el panel derecho)
  const mentores = useMemo(() => {
    const seen = new Set<string>();
    return mentorias.reduce<Mentor[]>((acc, m) => {
      if (m.mentor && !seen.has(m.mentor.id)) {
        seen.add(m.mentor.id);
        acc.push(m.mentor);
      }
      return acc;
    }, []);
  }, [mentorias]);

  // Sesiones en vivo ahora
  const liveCount = useMemo(
    () => mentorias.filter(isLiveNow).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mentorias],
  );

  // ── Booking mutation ─────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: async (m: Mentoria) => {
      const { data, error } = await supabase.rpc(
        "consume_ticket_for_mentoria",
        { p_mentoria_id: m.id, p_week_date: weekDateStr },
      );
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "error");
      return result;
    },
    onSuccess: () => {
      toast.success("¡Lugar reservado! Se consumió 1 ticket.", { duration: 4000 });
      refetchBookings();
      refetchTickets();
      qc.invalidateQueries({ queryKey: ["user-tickets", user?.id] });
      setBookTarget(null);
    },
    onError: (e: Error) => {
      const messages: Record<string, string> = {
        sin_tickets: "No tenés tickets disponibles.",
        ya_reservado: "Ya reservaste esta sesión para esta semana.",
        no_auth: "Sesión expirada. Volvé a iniciar sesión.",
      };
      toast.error(messages[e.message] ?? "No se pudo reservar. Intentá de nuevo.", {
        duration: 5000,
      });
      setBookTarget(null);
    },
  });

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1340px] px-4 sm:px-8 py-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-2">
            Mentoría semanal
          </p>
          <h1 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground">
            Sesiones{" "}
            <span className="[color:var(--violet-text)]">en vivo</span>
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground max-w-[480px] leading-relaxed">
            Reservá tu lugar en las sesiones grupales. Lunes a viernes, mañana y
            tarde. Cada sesión cuesta 1 ticket.
          </p>
        </div>

        {/* Badges: live + tickets */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[12px] font-semibold text-red-500">
              <Radio className="h-3 w-3 animate-pulse" />
              {liveCount === 1 ? "1 sesión en vivo" : `${liveCount} en vivo`}
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] px-3 py-1.5">
            <Ticket className="h-3.5 w-3.5 [color:var(--violet-text)]" />
            <span className="text-[14px] font-bold [color:var(--violet-text)]">
              {ticketCount}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {ticketCount === 1 ? "ticket" : "tickets"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Week navigation ────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground min-w-[190px] text-center">
          {formatWeekRange(monday)}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[12px] [color:var(--violet-text)] hover:underline transition-colors"
          >
            Esta semana
          </button>
        )}
      </div>

      {/* ── Main layout: calendario + panel mentores ───────── */}
      <div className="flex gap-6 items-start">

        {/* ── Calendario ───────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <div style={{ minWidth: 560 }}>

                {/* Fila de días */}
                <div
                  className="grid mb-2"
                  style={{ gridTemplateColumns: "64px repeat(5, 1fr)", gap: "8px" }}
                >
                  <div /> {/* esquina vacía */}
                  {weekDays.map((d, i) => {
                    const isToday = toISODate(d) === todayStr;
                    return (
                      <div
                        key={i}
                        className={`text-center rounded-xl py-2 ${
                          isToday
                            ? "bg-[var(--violet-pill-bg)] border border-[var(--violet-border)]"
                            : ""
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isToday
                              ? "[color:var(--violet-text)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {DAY_LABELS[i]}
                        </p>
                        <p
                          className={`text-[18px] font-bold mt-0.5 leading-none ${
                            isToday
                              ? "[color:var(--violet-text)]"
                              : "text-foreground"
                          }`}
                        >
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Filas de franjas horarias */}
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    className="grid mb-2"
                    style={{ gridTemplateColumns: "64px repeat(5, 1fr)", gap: "8px" }}
                  >
                    {/* Etiqueta horaria */}
                    <div className="flex flex-col items-end justify-start pt-3 pr-2">
                      <span className="text-[12px] font-semibold text-foreground">
                        {SLOT_META[slot].label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {SLOT_META[slot].period}
                      </span>
                    </div>

                    {/* Celdas de sesión (5 días) */}
                    {Array.from({ length: 5 }, (_, di) => {
                      const dow      = di + 1; // 1=Lun … 5=Vie
                      const mentoria = grid[dow]?.[slot];
                      if (!mentoria) {
                        return (
                          <div
                            key={di}
                            className="min-h-[120px] rounded-xl border border-dashed border-border/30 flex items-center justify-center"
                          >
                            <span className="text-[10px] text-muted-foreground/30">
                              —
                            </span>
                          </div>
                        );
                      }
                      const past = isSessionPast(mentoria, weekDays[di], todayStr);
                      return (
                        <SessionCard
                          key={di}
                          mentoria={mentoria}
                          isBooked={bookedIds.has(mentoria.id)}
                          tickets={ticketCount}
                          onBook={setBookTarget}
                          isPast={past}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Panel de mentores (solo desktop) ─────────────── */}
        {mentores.length > 0 && (
          <div className="hidden lg:block w-[272px] xl:w-[304px] shrink-0">
            <MentorPanel mentores={mentores} />
          </div>
        )}
      </div>

      {/* ── Diálogo de confirmación de reserva ─────────────── */}
      <AlertDialog
        open={!!bookTarget}
        onOpenChange={(open) => {
          if (!open) setBookTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmás la reserva?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-[14px]">
                  Vas a reservar{" "}
                  <strong>"{bookTarget?.title}"</strong> con{" "}
                  <strong>
                    {bookTarget?.mentor?.full_name ?? "el mentor"}
                  </strong>
                  .
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] px-3 py-2.5">
                  <Ticket className="h-4 w-4 [color:var(--violet-text)] shrink-0" />
                  <span className="text-[13px] [color:var(--violet-text)] font-medium">
                    Se va a consumir 1 ticket
                    {ticketCount > 0 && (
                      <span className="text-muted-foreground font-normal">
                        {" "}({ticketCount} disponibles → {ticketCount - 1} restantes)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                bookTarget && bookMutation.mutate(bookTarget)
              }
              disabled={bookMutation.isPending}
              className="bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-bg-hover)] text-[var(--cta-primary-text)]"
            >
              {bookMutation.isPending ? "Reservando…" : "Confirmar · 1 ticket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
