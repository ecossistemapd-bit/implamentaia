import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 text-lg tracking-tight ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500 text-white font-bold text-sm">
        I
      </span>
      <span className="font-semibold text-white">Implementa AI</span>
    </Link>
  );
}
