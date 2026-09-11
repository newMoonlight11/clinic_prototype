/* Formato de fecha/hora compartido, portado de design-prototypes/js/ui.js (líneas 48-76). */

const dateFmt = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" });
const timeFmt = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(value: string | Date): string {
  const date = toDate(value);
  return date ? dateFmt.format(date) : "—";
}

export function fmtShort(value: string | Date): string {
  const date = toDate(value);
  return date ? shortFmt.format(date) : "—";
}

export function fmtTime(value: string | Date): string {
  const date = toDate(value);
  return date ? timeFmt.format(date) : "";
}

export function fmtDateTime(value: string | Date): string {
  const date = toDate(value);
  return date ? `${dateFmt.format(date)} · ${timeFmt.format(date)}` : "—";
}
