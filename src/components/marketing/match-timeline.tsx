"use client";

import type { PlayerRef } from "@remotion/player";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { EntranceGroup } from "./entrance-group";
import { framesPerStep, MatchScene, matchStepAtFrame, matchSteps, settledFrame } from "./match-scene";
import styles from "./match-timeline.module.css";
import layout from "./recorrido.module.css";

const MatchTimelinePlayer = dynamic(() => import("./match-timeline-player"), { ssr: false });

export function MatchTimeline() {
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const autoplayHandled = useRef(false);

  useEffect(() => {
    if (!player) return;

    let currentStep = matchStepAtFrame(player.getCurrentFrame());
    const syncStep = ({ detail }: { detail: { frame: number } }) => {
      const step = matchStepAtFrame(detail.frame);
      if (step === currentStep) return;
      currentStep = step;
      setActiveStep(step);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      setEnded(true);
    };
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stageElement = stage.current;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      if (autoplayHandled.current) {
        observer?.disconnect();
        return;
      }
      if (entry.intersectionRatio < 0.5 || motionPreference.matches) return;

      autoplayHandled.current = true;
      observer?.disconnect();
      player.seekTo(0);
      player.play();
    }, { threshold: 0.5 });

    const observeAutoplay = () => {
      if (stageElement && !autoplayHandled.current && !motionPreference.matches) observer?.observe(stageElement);
    };
    const onMotionChange = () => {
      if (!motionPreference.matches) {
        observeAutoplay();
        return;
      }

      observer?.disconnect();
      player.pause();
      player.seekTo(currentStep * framesPerStep + settledFrame);
      setEnded(false);
    };

    player.addEventListener("frameupdate", syncStep);
    player.addEventListener("seeked", syncStep);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnd);
    motionPreference.addEventListener("change", onMotionChange);
    observeAutoplay();

    return () => {
      observer?.disconnect();
      player.removeEventListener("frameupdate", syncStep);
      player.removeEventListener("seeked", syncStep);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnd);
      motionPreference.removeEventListener("change", onMotionChange);
    };
  }, [player]);

  function goToStep(step: number) {
    autoplayHandled.current = true;
    player?.pause();
    player?.seekTo(step * framesPerStep + settledFrame);
    setActiveStep(step);
    setEnded(false);
  }

  function togglePlayback() {
    if (!player) return;
    autoplayHandled.current = true;

    if (player.isPlaying()) {
      player.pause();
      return;
    }

    if (ended) {
      player.seekTo(0);
      setEnded(false);
    } else if (player.getCurrentFrame() === activeStep * framesPerStep + settledFrame) {
      player.seekTo(activeStep * framesPerStep);
    }
    player.play();
  }

  const step = matchSteps[activeStep];
  const playLabel = playing ? "Pausar" : ended ? "Volver a ver" : "Reproducir";

  return (
    <section id="partido" tabIndex={-1} aria-labelledby="partido-titulo" className={`${layout.featureSection} ${styles.section}`}>
      <EntranceGroup className={styles.entrance}>
        <header data-intro-item className={styles.heading}>
          <h3 id="partido-titulo" className={layout.featureHeading}>Así se organiza <span>un partido</span></h3>
        </header>

        <div data-intro-item className={styles.story}>
          <div className={styles.details}>
            <ol className={styles.steps} role="list" aria-label="Pasos para organizar un partido">
              {matchSteps.map(({ title }, index) => (
                <li key={title}>
                  <button
                    type="button"
                    data-plain
                    aria-label={`Paso ${index + 1}, ${title}`}
                    aria-current={index === activeStep ? "step" : undefined}
                    aria-controls="partido-detalle"
                    onClick={() => goToStep(index)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
            </ol>

            <div id="partido-detalle" aria-live={playing ? "off" : "polite"} aria-atomic="true">
              <p className={styles.role}>{step.role}</p>
              <h4>{step.title}</h4>
              <p className={styles.description}>{step.description}</p>
              <p className="sr-only">{step.label}. {step.value}. {step.note}.</p>
            </div>
          </div>

          <div ref={stage} className={styles.stage} aria-hidden="true" inert>
            {!player && <MatchScene step={activeStep} />}
            <MatchTimelinePlayer initialFrame={activeStep * framesPerStep + settledFrame} onReady={setPlayer} />
          </div>

          <div className={styles.controls}>
            <button type="button" data-plain onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}>
              <span aria-hidden="true">←</span> Anterior
            </button>
            <button type="button" data-plain className={styles.play} onClick={togglePlayback} disabled={!player}>
              {playLabel}
            </button>
            <button type="button" data-plain onClick={() => goToStep(activeStep + 1)} disabled={activeStep === matchSteps.length - 1}>
              Siguiente <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </EntranceGroup>
    </section>
  );
}
