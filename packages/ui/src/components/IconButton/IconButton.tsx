import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: este botón no tiene texto visible. */
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({ className, children, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={[styles.iconBtn, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
