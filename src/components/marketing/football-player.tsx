"use client";

import { Player } from "@remotion/player";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { FootballArtwork, plays, type FootballPlay } from "./football-artwork";

const fps = 30;

function PlayComposition({ play }: { play: FootballPlay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [start, middle, finish] = plays[play];
  const times = [0.16 * fps, 0.82 * fps, 1.64 * fps];
  const motion = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  } as const;

  return (
    <FootballArtwork
      play={play}
      position={[
        interpolate(frame, times, [start[0], middle[0], finish[0]], motion),
        interpolate(frame, times, [start[1], middle[1], finish[1]], motion),
      ]}
      rotation={interpolate(frame, times, [0, 200, 470], motion)}
      netPulse={interpolate(frame, [1.55 * fps, 1.74 * fps, 2.12 * fps], [0, 1, 0], motion)}
    />
  );
}

export default function FootballPlayer({ play }: { play: FootballPlay }) {
  return (
    <Player
      component={PlayComposition}
      inputProps={{ play }}
      durationInFrames={Math.round(2.4 * fps)}
      compositionWidth={320}
      compositionHeight={160}
      fps={fps}
      autoPlay
      initiallyMuted
      numberOfSharedAudioTags={0}
      moveToBeginningWhenEnded={false}
      allowFullscreen={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
