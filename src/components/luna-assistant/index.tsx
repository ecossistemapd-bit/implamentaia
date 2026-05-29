import "./luna-assistant.css";
/**
 * LunaAssistant — chat conversacional con Luna (la IA de Implementa AI).
 *
 * UI:
 *  - Botón flotante abajo-derecha (FAB con Luna).
 *  - Click → panel deslizante tipo Intercom/Crisp con chat + input.
 *  - Streaming SSE: la respuesta se "escribe" palabra por palabra (premium feel).
 *  - Function calling: cuando Luna decide navegar (ej: "llevame a /solutions"),
 *    el cliente captura el tool_call y ejecuta el navigate real.
 *
 * Backend: edge function `luna-chat` (Supabase + OpenAI GPT-4o).
 * Historial: localStorage por usuario (v1, sin DB).
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LunaLoader } from "@/components/builder/luna-loader";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean; // true while streaming
};

const LS_KEY = (uid: string) => `luna-chat-history-${uid}`;
const MAX_HISTORY = 20; // últimos N mensajes para no saturar el contexto

const QUICK_PROMPTS = [
  "¿Qué solución hay para automatizar ventas?",
  "Mostrame el catálogo",
  "¿Cómo voy con mis implementaciones?",
  "Llevame al builder",
];

export function LunaAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history desde localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(LS_KEY(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        setMessages(parsed.slice(-MAX_HISTORY));
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  // Persist history
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(
        LS_KEY(user.id),
        JSON.stringify(messages.slice(-MAX_HISTORY)),
      );
    } catch {
      /* ignore */
    }
  }, [messages, user]);

  // Autoscroll al final cuando entran mensajes nuevos
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // ESC cierra el panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || !user) return;
    setInput("");

    // Push del mensaje del user + placeholder de Luna
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const lunaMsg: ChatMessage = { role: "assistant", content: "", pending: true };
    const newMessages = [...messages, userMsg, lunaMsg];
    setMessages(newMessages);
    setSending(true);

    // Preparar history para enviar (sin el placeholder vacío)
    const historyForAPI = newMessages
      .slice(0, -1)
      .filter((m) => m.content.length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    // Llamar edge function con streaming SSE
    abortRef.current = new AbortController();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/luna-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnon,
          Authorization: `Bearer ${token ?? supabaseAnon}`,
        },
        body: JSON.stringify({
          messages: historyForAPI,
          userId: user.id,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const event = JSON.parse(data);
            if (event.type === "text" && event.delta) {
              accumulated += event.delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: accumulated,
                  pending: true,
                };
                return copy;
              });
            } else if (event.type === "tool_call") {
              // Ejecutar tool del lado cliente si corresponde
              if (event.name === "navigate" && event.args?.path) {
                navigate({ to: event.args.path as never });
                // Cerrar el panel después de navegar para no tapar la página
                setTimeout(() => setOpen(false), 300);
              }
              // search_solutions + get_user_progress se ejecutan en el server,
              // acá sólo recibimos la señal informativa.
            } else if (event.type === "done") {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: accumulated || "…",
                  pending: false,
                };
                return copy;
              });
            } else if (event.type === "error") {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: `Tuve un problema: ${event.message}. Probá de nuevo en un toque.`,
                  pending: false,
                };
                return copy;
              });
            }
          } catch {
            /* chunk parse fail */
          }
        }
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Algo falló de mi lado. Probá refrescar e intentar de nuevo.",
            pending: false,
          };
          return copy;
        });
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const clearHistory = () => {
    setMessages([]);
    if (user) localStorage.removeItem(LS_KEY(user.id));
  };

  if (!user) return null;

  return (
    <>
      {/* FAB — botón flotante con Luna */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="luna-fab"
          aria-label="Abrir chat con Luna"
          type="button"
        >
          <LunaLoader size={42} />
          <span className="luna-fab-label">Luna</span>
          <span className="luna-fab-pulse" aria-hidden />
        </button>
      )}

      {/* PANEL — chat */}
      {open && (
        <div className="luna-panel app-card" role="dialog" aria-label="Chat con Luna">
          {/* Header */}
          <div className="luna-panel-header">
            <div className="flex items-center gap-3">
              <LunaLoader size={36} />
              <div className="leading-tight">
                <div className="text-[14px] font-semibold text-foreground">Luna</div>
                <div className="text-[11px] text-muted-foreground">
                  Tu asistente de Implementa AI
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Borrar historial"
                >
                  Borrar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="luna-panel-messages">
            {messages.length === 0 && (
              <div className="luna-empty">
                <div className="mb-4">
                  <LunaLoader size={72} />
                </div>
                <h3 className="text-[16px] font-semibold text-foreground">
                  ¿En qué te ayudo?
                </h3>
                <p className="mt-1 text-[12.5px] text-muted-foreground max-w-[260px]">
                  Recomendaciones, navegación, dudas sobre tus implementaciones. Dale.
                </p>
                <div className="mt-5 flex flex-col gap-1.5 w-full">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="luna-quick-prompt"
                      type="button"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`luna-msg ${
                  m.role === "user" ? "luna-msg--user" : "luna-msg--assistant"
                }`}
              >
                <div className="luna-msg-bubble">
                  {m.content || (m.pending && <span className="luna-typing">●●●</span>)}
                  {m.pending && m.content && <span className="luna-cursor">▌</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            className="luna-panel-input"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntale a Luna…"
              disabled={sending}
              autoFocus
              className="luna-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="luna-send"
              aria-label="Enviar"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
