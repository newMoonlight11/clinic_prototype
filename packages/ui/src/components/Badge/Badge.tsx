import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "default" | "warn" | "danger" | "blue";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = "default", children }: BadgeProps) {
  const classes = [styles.badge, tone !== "default" && styles[tone]].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
