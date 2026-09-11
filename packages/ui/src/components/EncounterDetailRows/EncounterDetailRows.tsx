import type { Encounter } from "../../types/encounter";
import styles from "./EncounterDetailRows.module.css";

export interface EncounterDetailRowsProps {
  encounter: Encounter;
}

const TEXT_FIELDS: [keyof Encounter, string][] = [
  ["chiefComplaint", "Motivo de consulta"],
  ["currentIllness", "Enfermedad actual"],
  ["physicalExam", "Examen físico"],
  ["impression", "Impresión clínica"],
  ["plan", "Plan / nota de evolución"],
];

/** Filas de detalle de una evolución: mismo contenido que abre el timeline (plantilla A)
 * y el panel de la tabla (plantilla B), para que no diverjan. */
export function EncounterDetailRows({ encounter }: EncounterDetailRowsProps) {
  const vitalsText = [
    encounter.vitals.bloodPressure && `PA ${encounter.vitals.bloodPressure}`,
    encounter.vitals.heartRate && `FC ${encounter.vitals.heartRate} lpm`,
    encounter.vitals.temperatureC && `T ${encounter.vitals.temperatureC} °C`,
    encounter.vitals.weightKg && `Peso ${encounter.vitals.weightKg} kg`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {TEXT_FIELDS.map(([key, label]) => {
        const value = encounter[key];
        if (!value) return null;
        return (
          <div key={key} className={styles.row}>
            <span>{label}</span>
            <p>{String(value)}</p>
          </div>
        );
      })}
      {encounter.diagnoses.length ? (
        <div className={styles.row}>
          <span>Diagnósticos</span>
          <p>{encounter.diagnoses.join(" · ")}</p>
        </div>
      ) : null}
      {vitalsText ? (
        <div className={styles.row}>
          <span>Signos vitales</span>
          <p>{vitalsText}</p>
        </div>
      ) : null}
      {encounter.procedures?.length ? (
        <div className={styles.row}>
          <span>Procedimientos realizados</span>
          <p>{encounter.procedures.map((p) => `${p.name} (${p.tooth})`).join(" · ")}</p>
        </div>
      ) : null}
    </>
  );
}
