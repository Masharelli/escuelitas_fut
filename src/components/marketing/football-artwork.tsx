import styles from "./football-motion.module.css";

export const plays = {
  pass: [[19, 66], [48, 33], [79, 63]],
  goal: [[21, 65], [49, 57], [79, 43]],
} as const;

export type FootballPlay = keyof typeof plays;

export function FootballArtwork({
  play,
  position = plays[play][0],
  rotation = 0,
  netPulse = 0,
}: {
  play: FootballPlay;
  position?: readonly [number, number];
  rotation?: number;
  netPulse?: number;
}) {
  const route = plays[play];

  return (
    <div className={styles.artwork}>
      <span className={styles.pitch} />
      {route.slice(0, -1).map(([x, y], index) => {
        const [nextX, nextY] = route[index + 1];
        const run = nextX - x;
        const rise = (nextY - y) / 2;

        return (
          <span
            key={x}
            className={styles.passLine}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              // Keep CSS precision identical after server-side serialization.
              width: `${Math.hypot(run, rise).toFixed(4)}%`,
              rotate: `${Math.atan2(rise, run).toFixed(4)}rad`,
            }}
          />
        );
      })}
      {play === "pass" ? (
        route.map(([x, y]) => (
          <span key={x} className={styles.playerPin} style={{ left: `${x}%`, top: `${y}%` }} />
        ))
      ) : (
        <span className={styles.goal} style={{ scale: `${1 + netPulse * 0.12} 1` }} />
      )}
      <span
        className={styles.ball}
        style={{ left: `${position[0]}%`, top: `${position[1]}%`, rotate: `${rotation}deg` }}
      />
    </div>
  );
}
