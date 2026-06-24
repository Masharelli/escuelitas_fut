"use client";

import { useEffect, useRef } from "react";

import { markMyNotificationsRead } from "./actions";

/**
 * Al abrir la lista de avisos, marca todo como leído (una sola vez) para que la
 * campana se limpie. No renderiza nada.
 */
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const done = useRef(false);
  useEffect(() => {
    if (hasUnread && !done.current) {
      done.current = true;
      markMyNotificationsRead();
    }
  }, [hasUnread]);
  return null;
}
