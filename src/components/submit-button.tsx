"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-pitch px-5 py-2.5 text-center font-semibold text-chalk shadow-sm transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-60 ${inline ? "text-sm" : "w-full"}`}
    >
      {pending && (
        <svg
          className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-30"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {pending ? "Un momento…" : children}
    </button>
  );
}
