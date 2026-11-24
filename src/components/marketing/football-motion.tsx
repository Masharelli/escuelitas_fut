"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { FootballArtwork, type FootballPlay } from "./football-artwork";

const FootballPlayer = dynamic(() => import("./football-player"), { ssr: false });
const visibilityThreshold = 0.55;

export function FootballMotion({ play }: { play: FootballPlay }) {
  const container = useRef<HTMLDivElement>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < visibilityThreshold || reducedMotion.matches) return;

      setShowPlayer(true);
      observer.disconnect();
    }, { threshold: visibilityThreshold });

    const syncMotion = () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        setShowPlayer(false);
      } else {
        observer.observe(element);
      }
    };

    if (!reducedMotion.matches) observer.observe(element);
    reducedMotion.addEventListener("change", syncMotion);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  return (
    <div ref={container} aria-hidden="true" inert className="relative aspect-[2/1] w-full max-w-72 overflow-hidden rounded-xl border border-white/25">
      <FootballArtwork play={play} />
      {showPlayer && <FootballPlayer play={play} />}
    </div>
  );
}
