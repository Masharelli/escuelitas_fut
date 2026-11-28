"use client";

import { Player } from "@remotion/player";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import styles from "./coach-demo.module.css";

function ProgressComposition({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = interpolate(frame, [0, 0.6 * fps], [0, progress * 100], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill className={styles.progressComposition}>
      <span style={{ width: `${width}%` }} />
    </AbsoluteFill>
  );
}

export default function CoachDemoPlayer({ progress }: { progress: number }) {
  return (
    <Player
      component={ProgressComposition}
      inputProps={{ progress }}
      compositionWidth={600}
      compositionHeight={12}
      durationInFrames={22}
      fps={30}
      autoPlay
      initiallyMuted
      numberOfSharedAudioTags={0}
      clickToPlay={false}
      spaceKeyToPlayOrPause={false}
      allowFullscreen={false}
      moveToBeginningWhenEnded={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
