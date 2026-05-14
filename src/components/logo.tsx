import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 text-base tracking-tight ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#C9A84C] to-[#B8972E] text-[#0B0F1A] font-bold text-[12px]">
        I
      </span>
      <span className="font-semibold text-white">Implementa AI</span>
    </Link>
  );
}
