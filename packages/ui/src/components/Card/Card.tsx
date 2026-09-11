import type { ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return <section className={styles.card}>{children}</section>;
}

export interface CardHeadProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Controles a la derecha del título (buscador, botones, filtros). */
  children?: ReactNode;
}

export function CardHead({ title, subtitle, children }: CardHeadProps) {
  return (
    <div className={styles.head}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
      </div>
      {children ? <div className={styles.tools}>{children}</div> : null}
    </div>
  );
}

export interface CardBodyProps {
  children: ReactNode;
}

export function CardBody({ children }: CardBodyProps) {
  return <div className={styles.body}>{children}</div>;
}
