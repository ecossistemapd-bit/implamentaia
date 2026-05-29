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
  CalendarDays,
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
import { Paywall } from "@/components/Paywall";

// ── Route ──────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/mentoria/")({
  component: MentoriaGate,
});

function MentoriaGate() {
  return (
    <Paywall feature="mentorias">
      <MentoriaPage />
    </Paywall>
  );
}

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
  day_of_week: number; // 1=Lun … 5=Vie
  time_slot: string;
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

// ── Calendario — constantes ────────────────────────────────────
const DAY_LABELS  = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];
const GRID_START  = 9;    // 09:00
const GRID_END    = 17;   // 17:00 (última sesión termina 16:30)
const PX_PER_HOUR = 72;   // altura en px por hora
const TOTAL_H     = (GRID_END - GRID_START) * PX_PER_HOUR; // 648px
const HOURS       = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i);

// ── Helpers de fecha ───────────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toISODate(d: Date)  { return d.toISOString().split("T")[0]; }
function fmtWeekRange(mon: Date) {
  const fri  = addDays(mon, 4);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${mon.toLocaleDateString("es-AR", opts)} — ${fri.toLocaleDateString("es-AR", opts)}`;
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// Hora actual en Buenos Aires
function getARTime() {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
  const ar  = new Date(str);
  return { h: ar.getHours(), m: ar.getMinutes(), dow: ar.getDay() };
}
function isLiveNow(m: Mentoria): boolean {
  const { h, m: min, dow } = getARTime();
  if (dow !== m.day_of_week) return false;
  const [sh, sm] = m.starts_at.slice(0, 5).split(":").map(Number);
  const start = sh * 60 + sm, end = start + m.duration_minutes;
  return h * 60 + min >= start && h * 60 + min < end;
}
function isSessionPast(m: Mentoria, dayDate: Date, todayStr: string) {
  const ds = toISODate(dayDate);
  if (ds < todayStr) return true;
  if (ds > todayStr) return false;
  const { h, m: min } = getARTime();
  const [sh, sm] = m.starts_at.slice(0, 5).split(":").map(Number);
  return h * 60 + min >= sh * 60 + sm + m.duration_minutes;
}

// Posicionamiento en la grilla
function timeToTop(timeStr: string): number {
  const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
  return (h - GRID_START + m / 60) * PX_PER_HOUR;
}
function durationToPx(min: number): number { return (min / 60) * PX_PER_HOUR; }

// ── MentorAvatar ───────────────────────────────────────────────
function MentorAvatar({ mentor, size = "md" }: { mentor: Mentor | null; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-6 w-6 text-[9px]" : size === "lg" ? "h-11 w-11 text-[14px]" : "h-8 w-8 text-[11px]";
  const initials = mentor?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "M";
  if (mentor?.avatar_url)
    return <img src={mentor.avatar_url} alt={mentor.full_name} className={`${sz} rounded-full object-cover shrink-0 border border-[var(--violet-border)]`} />;
  return (
    <div className={`${sz} rounded-full shrink-0 bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] flex items-center justify-center font-bold [color:var(--violet-text)]`}>
      {initials}
    </div>
  );
}

// ── Tarjeta de sesión en la grilla (estilo calendario) ─────────
function CalendarCard({
  mentoria, isBooked, live, isPast, onClick,
}: {
  mentoria: Mentoria; isBooked: boolean; live: boolean; isPast: boolean; onClick: () => void;
}) {
  const top    = timeToTop(mentoria.starts_at);
  const height = durationToPx(mentoria.duration_minutes) - 4;
  return (
    <button
      onClick={onClick}
      disabled={isPast}
      style={{ top, height, left: 4, right: 4 }}
      className={[
        "absolute rounded-xl px-2 py-1.5 text-left overflow-hidden transition-all",
        "flex flex-col gap-0.5 group",
        isPast
          ? "opacity-35 cursor-default bg-muted/30 border border-border/30"
          : live
            ? "bg-red-500/15 border border-red-500/40 hover:bg-red-500/25 hover:border-red-500/60"
            : isBooked
              ? "bg-[var(--violet-pill-bg)] border-2 border-[var(--violet-border-hover)] hover:border-[var(--violet-border-hover)]"
              : "bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] hover:border-[var(--violet-border-hover)] hover:bg-[var(--violet-pill-bg)]",
      ].filter(Boolean).join(" ")}
    >
      {live && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      <span className="text-[11px] font-bold text-foreground truncate leading-tight">
        {mentoria.mentor?.full_name ?? "Mentor"}
      </span>
      <span className="text-[10px] text-muted-foreground truncate leading-none">
        {mentoria.title}
      </span>
      {isBooked && !live && (
        <span className="text-[9px] font-semibold [color:var(--violet-text)] mt-auto">✓ Reservado</span>
      )}
      {isBooked && live && (
        <span className="text-[9px] font-semibold text-red-400 mt-auto animate-pulse">● En vivo</span>
      )}
    </button>
  );
}

// ── Panel de mentores ──────────────────────────────────────────
function MentorPanel({ mentores }: { mentores: Mentor[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1">
        <Users className="h-3.5 w-3.5 [color:var(--violet-text)]" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
          Nuestros Mentores
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {mentores.map((m) => (
          <div key={m.id} className="app-card p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <MentorAvatar mentor={m} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground leading-tight truncate">{m.full_name}</p>
                <span className="app-pill-violet inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium [color:var(--violet-text-strong)]">
                  {m.role}
                </span>
              </div>
            </div>
            {m.bio && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{m.bio}</p>
            )}
            {m.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.specialties.map(s => (
                  <span key={s} className="inline-flex items-center rounded-full border border-[var(--violet-border)]/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
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

// ── Página principal ───────────────────────────────────────────
function MentoriaPage() {
  const { user }     = useAuth();
  const qc           = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookTarget, setBookTarget] = useState<Mentoria | null>(null);

  const monday      = useMemo(() => addDays(getMondayOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekDateStr = toISODate(monday);
  const weekDays    = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday]);
  const todayStr    = toISODate(new Date());

  // ── Queries ──────────────────────────────────────────────────
  const { data: mentorias = [], isLoading } = useQuery({
    queryKey: ["mentorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorias")
        .select("*, mentor:mentores(*)")
        .eq("is_active", true)
        .order("day_of_week").order("starts_at");
      if (error) throw error;
      return data as unknown as Mentoria[];
    },
    staleTime: 5 * 60_000,
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
        .from("profiles").select("tickets").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data?.tickets as number) ?? 0;
    },
  });

  const bookedIds    = useMemo(() => new Set(bookings.map(b => b.mentoria_id)), [bookings]);
  const sessionCount = mentorias.length;
  const liveCount    = useMemo(() => mentorias.filter(isLiveNow).length, [mentorias]);

  // Sesiones indexadas por [day_of_week] → array (puede haber varias por franja)
  const byDay = useMemo(() => {
    const m: Record<number, Mentoria[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const s of mentorias) if (m[s.day_of_week]) m[s.day_of_week].push(s);
    return m;
  }, [mentorias]);

  const mentores = useMemo(() => {
    const seen = new Set<string>();
    return mentorias.reduce<Mentor[]>((acc, m) => {
      if (m.mentor && !seen.has(m.mentor.id)) { seen.add(m.mentor.id); acc.push(m.mentor); }
      return acc;
    }, []);
  }, [mentorias]);

  // ── Booking mutation ─────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: async (m: Mentoria) => {
      const { data, error } = await supabase.rpc("consume_ticket_for_mentoria" as never, {
        p_mentoria_id: m.id, p_week_date: weekDateStr,
      });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "error");
      return r;
    },
    onSuccess: () => {
      toast.success("¡Lugar reservado! Se consumió 1 ticket.", { duration: 4000 });
      refetchBookings(); refetchTickets();
      qc.invalidateQueries({ queryKey: ["user-tickets", user?.id] });
      setBookTarget(null);
    },
    onError: (e: Error) => {
      const msgs: Record<string, string> = {
        sin_tickets: "No tenés tickets disponibles.",
        ya_reservado: "Ya reservaste esta sesión esta semana.",
        no_auth: "Sesión expirada. Iniciá sesión nuevamente.",
      };
      toast.error(msgs[e.message] ?? "No se pudo reservar.", { duration: 5000 });
      setBookTarget(null);
    },
  });

  const live = bookTarget ? isLiveNow(bookTarget) : false;
  const alreadyBooked = bookTarget ? bookedIds.has(bookTarget.id) : false;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-7">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-1.5">
            Mentoría semanal
          </p>
          <h1 className="text-[38px] sm:text-[46px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground">
            Mentoría <span className="[color:var(--violet-text)]">en vivo</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
            <CalendarDays className="inline h-3.5 w-3.5 mr-1 opacity-60" />
            {fmtMonth(monday)} · {sessionCount} sesiones en la semana
          </p>
        </div>

        {/* Badges top-right */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[12px] font-bold text-red-500">
              <Radio className="h-3 w-3 animate-pulse" />
              {liveCount === 1 ? "1 en vivo ahora" : `${liveCount} en vivo`}
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] px-3 py-1.5">
            <Ticket className="h-3.5 w-3.5 [color:var(--violet-text)]" />
            <span className="text-[14px] font-bold [color:var(--violet-text)]">{ticketCount}</span>
            <span className="text-[12px] text-muted-foreground">{ticketCount === 1 ? "ticket" : "tickets"}</span>
          </div>
        </div>
      </div>

      {/* ── Navegación de semana ────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Semana anterior"
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground min-w-[200px] text-center">
          {fmtWeekRange(monday)}
        </span>
        <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Semana siguiente"
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center">
          <ChevronRight className="h-4 w-4" />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)}
            className="text-[12px] [color:var(--violet-text)] hover:underline transition-colors">
            Hoy
          </button>
        )}
      </div>

      {/* ── Layout principal ────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Grilla de calendario ─────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div style={{ minWidth: 520 }}>

            {/* Cabecera de días */}
            <div className="flex mb-1" style={{ paddingLeft: 52 }}>
              {weekDays.map((d, i) => {
                const isToday = toISODate(d) === todayStr;
                return (
                  <div key={i} className={`flex-1 text-center py-2 mx-0.5 rounded-xl ${isToday ? "bg-[var(--violet-pill-bg)] border border-[var(--violet-border)]" : ""}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "[color:var(--violet-text)]" : "text-muted-foreground"}`}>
                      {DAY_LABELS[i]}
                    </p>
                    <p className={`text-[20px] font-bold leading-none mt-0.5 ${isToday ? "[color:var(--violet-text)]" : "text-foreground"}`}>
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Grilla horaria */}
            <div className="flex">

              {/* Eje de horas */}
              <div style={{ width: 52, flexShrink: 0 }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: PX_PER_HOUR }} className="relative">
                    <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground/60 font-medium select-none">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Columnas por día */}
              <div className="flex flex-1 gap-0.5 border border-border/30 rounded-xl overflow-hidden">
                {weekDays.map((d, di) => {
                  const dow      = di + 1;
                  const sessions = byDay[dow] ?? [];
                  const isToday  = toISODate(d) === todayStr;
                  return (
                    <div key={di} className={`flex-1 relative border-r border-border/20 last:border-r-0 ${isToday ? "bg-[var(--violet-pill-bg)]/30" : ""}`}
                         style={{ height: TOTAL_H }}>
                      {/* Líneas de horas */}
                      {HOURS.map(h => (
                        <div key={h} style={{ top: (h - GRID_START) * PX_PER_HOUR }}
                             className="absolute w-full border-t border-border/15 pointer-events-none" />
                      ))}

                      {/* Sesiones */}
                      {isLoading ? (
                        <div className="absolute inset-x-1 top-1 h-16 rounded-xl bg-muted/40 animate-pulse" />
                      ) : (
                        sessions.map(m => (
                          <CalendarCard
                            key={m.id}
                            mentoria={m}
                            isBooked={bookedIds.has(m.id)}
                            live={isLiveNow(m)}
                            isPast={isSessionPast(m, d, todayStr)}
                            onClick={() => setBookTarget(m)}
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Panel de mentores (solo desktop) ─────────────── */}
        {mentores.length > 0 && (
          <div className="hidden xl:block w-[268px] shrink-0">
            <MentorPanel mentores={mentores} />
          </div>
        )}
      </div>

      {/* ── Diálogo de reserva / unirse ─────────────────────── */}
      <AlertDialog open={!!bookTarget} onOpenChange={open => { if (!open) setBookTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alreadyBooked
                ? live ? "Sesión en vivo ahora" : "Ya reservaste esta sesión"
                : "¿Confirmás la reserva?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-[14px]">
                  <strong>"{bookTarget?.title}"</strong>
                  {bookTarget?.mentor && <> con <strong>{bookTarget.mentor.full_name}</strong></>}
                </p>

                {alreadyBooked ? (
                  live && bookTarget?.meeting_url ? (
                    <a href={bookTarget.meeting_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-500/20 transition w-fit">
                      <ExternalLink className="h-4 w-4" />
                      Unirse a la sesión ahora
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 [color:var(--violet-text)] shrink-0" />
                      <span className="text-[13px] [color:var(--violet-text)]">Tu lugar ya está reservado</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] px-3 py-2.5">
                    <Ticket className="h-4 w-4 [color:var(--violet-text)] shrink-0" />
                    <span className="text-[13px] [color:var(--violet-text)] font-medium">
                      Se consume 1 ticket
                      {ticketCount > 0 && (
                        <span className="text-muted-foreground font-normal">
                          {" "}({ticketCount} disponibles → {ticketCount - 1} restantes)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            {!alreadyBooked && (
              <AlertDialogAction
                onClick={() => bookTarget && bookMutation.mutate(bookTarget)}
                disabled={bookMutation.isPending || ticketCount < 1}
                className="bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-bg-hover)] text-[var(--cta-primary-text)] disabled:opacity-50"
              >
                {bookMutation.isPending
                  ? "Reservando…"
                  : ticketCount < 1
                    ? "Sin tickets"
                    : "Confirmar · 1 ticket"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
