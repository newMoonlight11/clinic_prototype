import type { ReactNode } from "react";
import styles from "./Form.module.css";

/** Clase para aplicar a inputs, textareas y selects nativos dentro de un formulario de diálogo. */
export const inputClass = styles.input;

export interface FormFieldProps {
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <label className={styles.field}>
      <span>
        {label}
        {required ? <i className={styles.req}>obligatorio</i> : null}
      </span>
      {children}
    </label>
  );
}

export interface FormHintProps {
  children: ReactNode;
}

export function FormHint({ children }: FormHintProps) {
  return <p className={styles.hint}>{children}</p>;
}

export interface FormGridProps {
  children: ReactNode;
}

export function FormGrid({ children }: FormGridProps) {
  return <div className={styles.grid}>{children}</div>;
}

export interface FormMoreProps {
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function FormMore({ summary, defaultOpen = false, children }: FormMoreProps) {
  return (
    <details className={styles.more} open={defaultOpen}>
      <summary>{summary}</summary>
      <div className={styles.moreBody}>{children}</div>
    </details>
  );
}
