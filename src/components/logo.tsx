import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 text-lg tracking-tight ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-sky-500 text-white font-bold text-sm shadow-sm">
        I
      </span>
      <span className="font-semibold">Implementa</span>
      <span className="font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        AI
      </span>
    </Link>
  );
}
