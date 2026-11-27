import type { ReactNode } from "react";

import { EntranceGroup } from "./entrance-group";
import styles from "./recorrido.module.css";

export function FeatureIntro({ copy, preview }: { copy: ReactNode; preview: ReactNode }) {
  return (
    <EntranceGroup className={`${styles.intro} ${styles.sideEntrance} grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-12`}>
      <div data-intro-item className="min-w-0">{copy}</div>
      <div data-intro-item className="min-w-0">{preview}</div>
    </EntranceGroup>
  );
}
