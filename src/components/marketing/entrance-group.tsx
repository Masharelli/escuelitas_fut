"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./recorrido.module.css";

export function EntranceGroup({ className, children }: { className: string; children: ReactNode }) {
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = group.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const items = container.querySelectorAll<HTMLElement>(":scope > [data-intro-item]");
    const threshold = 0.16;
    const observer = new IntersectionObserver((entries) => {
      for (const { target, intersectionRatio } of entries) {
        const item = target as HTMLElement;
        if (intersectionRatio < threshold) {
          item.dataset.introState = "waiting";
          continue;
        }

        item.dataset.introState = "entered";
        observer.unobserve(item);
      }
    }, { threshold });

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return <div ref={group} className={`${styles.entranceGroup} ${className}`}>{children}</div>;
}
