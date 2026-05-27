/**
 * LunaLoader — animación de espera del Builder.
 * Una luna creciente que flota suavemente con halo violeta + estrellas titilando.
 * Referencia visual a "Luna", la IA de Implementa AI.
 */
export function LunaLoader({ size = 112 }: { size?: number }) {
  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Halo violeta blur de fondo */}
      <div
        className="absolute inset-0 m-auto rounded-full blur-2xl luna-halo"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.55), transparent 70%)",
        }}
      />

      {/* Luna flotando */}
      <svg
        className="relative luna-float"
        viewBox="0 0 120 120"
        width={size}
        height={size}
      >
        <defs>
          {/* Gradient de la luna (luz superior izquierda) */}
          <radialGradient id="luna-body" cx="38%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="55%" stopColor="#EDE9FE" stopOpacity="1" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.85" />
          </radialGradient>
          {/* Sombra interior para dar volumen */}
          <radialGradient id="luna-shadow" cx="75%" cy="75%" r="55%">
            <stop offset="0%" stopColor="#6D28D9" stopOpacity="0" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.35" />
          </radialGradient>
        </defs>

        {/* Cuerpo principal */}
        <circle cx="60" cy="60" r="42" fill="url(#luna-body)" />
        <circle cx="60" cy="60" r="42" fill="url(#luna-shadow)" />

        {/* Cráteres sutiles */}
        <circle cx="45" cy="48" r="4.5" fill="rgba(76, 29, 149, 0.15)" />
        <circle cx="72" cy="65" r="3.5" fill="rgba(76, 29, 149, 0.12)" />
        <circle cx="55" cy="78" r="3" fill="rgba(76, 29, 149, 0.10)" />
        <circle cx="78" cy="45" r="2.5" fill="rgba(76, 29, 149, 0.10)" />
      </svg>

      {/* Estrellas titilantes alrededor */}
      <span
        className="absolute luna-sparkle"
        style={{
          top: "-4%",
          left: "12%",
          color: "var(--violet-text)",
          fontSize: 16,
          animationDelay: "0s",
        }}
      >
        ✦
      </span>
      <span
        className="absolute luna-sparkle"
        style={{
          top: "8%",
          right: "-2%",
          color: "var(--violet-text)",
          fontSize: 13,
          animationDelay: "0.6s",
        }}
      >
        ✧
      </span>
      <span
        className="absolute luna-sparkle"
        style={{
          bottom: "10%",
          right: "-4%",
          color: "var(--violet-text-strong)",
          fontSize: 11,
          animationDelay: "1.2s",
        }}
      >
        ✦
      </span>
      <span
        className="absolute luna-sparkle"
        style={{
          bottom: "-2%",
          left: "20%",
          color: "var(--violet-text)",
          fontSize: 14,
          animationDelay: "1.8s",
        }}
      >
        ✧
      </span>
      <span
        className="absolute luna-sparkle"
        style={{
          top: "40%",
          left: "-6%",
          color: "var(--violet-text-strong)",
          fontSize: 10,
          animationDelay: "2.4s",
        }}
      >
        ✦
      </span>

      <style>{`
        @keyframes luna-float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes luna-halo {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }
        @keyframes luna-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50%      { opacity: 1; transform: scale(1.2); }
        }
        .luna-float    { animation: luna-float 4s ease-in-out infinite; transform-origin: center; }
        .luna-halo     { animation: luna-halo 3s ease-in-out infinite; }
        .luna-sparkle  { animation: luna-sparkle 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .luna-float, .luna-halo, .luna-sparkle { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
