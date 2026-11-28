"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { entranceSeconds, matchDuration, matchFps, MatchScene, matchStepAtFrame, secondsPerStep } from "./match-scene";

function MatchComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = matchStepAtFrame(frame);
  const entered = interpolate(frame % (secondsPerStep * fps), [0, entranceSeconds * fps], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <MatchScene
      step={step}
      style={{ opacity: .36 + entered * .64, translate: `0 ${(1 - entered) * 20}px`, scale: .96 + .04 * entered }}
    />
  );
}

export default function MatchTimelinePlayer({ initialFrame, onReady }: { initialFrame: number; onReady: (player: PlayerRef | null) => void }) {
  return (
    <Player
      ref={onReady}
      component={MatchComposition}
      initialFrame={initialFrame}
      durationInFrames={matchDuration}
      compositionWidth={600}
      compositionHeight={380}
      fps={matchFps}
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
