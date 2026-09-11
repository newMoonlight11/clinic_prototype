"use client";

import { useMemo } from "react";
import { Modal, invalid } from "../Modal/Modal";
import { FormField, FormGrid, FormHint, FormMore, inputClass } from "../Form/Form";
import type { Encounter, EncounterKindOption, EncounterVitals } from "../../types/encounter";

export type { Encounter, EncounterKindOption, EncounterVitals, EncounterProcedure } from "../../types/encounter";

export interface EncounterModalProps {
  open: boolean;
  /** Evolución a editar. `null`/`undefined` crea una nueva. */
  encounter?: Encounter | null;
  kindOptions: EncounterKindOption[];
  defaultProvider: string;
  /** Número de versión que tendrá al guardar (solo se usa para el subtítulo al editar). */
  nextVersion?: number;
  onClose: () => void;
  onSave: (encounter: Encounter) => void;
}

const REQUIRED_FIELDS: [string, string][] = [
  ["title", "El título de la evolución es obligatorio."],
  ["chiefComplaint", "Registra el motivo de consulta."],
  ["plan", "La nota de plan / evolución es obligatoria."],
];

const VITAL_KEYS = ["bloodPressure", "heartRate", "temperatureC", "weightKg"] as const;

function blankEncounter(defaultProvider: string): Encounter {
  return {
    date: new Date().toISOString().slice(0, 16),
    kind: "followUp",
    provider: defaultProvider,
    title: "",
    chiefComplaint: "",
    currentIllness: "",
    physicalExam: "",
    impression: "",
    plan: "",
    diagnoses: [],
    vitals: {},
  };
}

export function EncounterModal({
  open,
  encounter,
  kindOptions,
  defaultProvider,
  nextVersion,
  onClose,
  onSave,
}: EncounterModalProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draft = useMemo(() => encounter ?? blankEncounter(defaultProvider), [open]);
  const isEditing = Boolean(encounter);

  function handleSubmit(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    for (const [field, message] of REQUIRED_FIELDS) {
      if (!String(values[field] ?? "").trim()) throw invalid(message, field);
    }
    if (values.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(values.bloodPressure.trim())) {
      throw invalid("La presión arterial debe tener el formato 120/80.", "bloodPressure");
    }
    if (values.heartRate && !(Number(values.heartRate) > 20 && Number(values.heartRate) < 220)) {
      throw invalid("La frecuencia cardíaca debe estar entre 20 y 220 lpm.", "heartRate");
    }

    const vitals: EncounterVitals = {};
    VITAL_KEYS.forEach((key) => {
      if (String(values[key] ?? "").trim()) vitals[key] = String(values[key]).trim();
    });

    onSave({
      ...(encounter?.id ? { id: encounter.id } : {}),
      date: values.date,
      kind: values.kind,
      provider: values.provider.trim() || defaultProvider,
      title: values.title.trim(),
      chiefComplaint: values.chiefComplaint.trim(),
      currentIllness: values.currentIllness.trim(),
      physicalExam: values.physicalExam.trim(),
      impression: values.impression.trim(),
      plan: values.plan.trim(),
      diagnoses: values.diagnoses.split("\n").map((line) => line.trim()).filter(Boolean),
      vitals,
    });
  }

  return (
    <Modal
      open={open}
      title={isEditing ? "Editar evolución" : "Nueva evolución clínica"}
      subtitle={
        isEditing
          ? `Se guardará como versión ${nextVersion ?? 2}. El original se conserva.`
          : "Consulta estructurada · los campos siguen la historia clínica del CRM"
      }
      size="lg"
      submitLabel={isEditing ? "Guardar versión" : "Guardar evolución"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <FormHint>
        Con el título, el motivo y el plan basta para guardar. El examen y los signos vitales quedan a un
        clic.
      </FormHint>

      <FormField label="Título" required>
        <input className={inputClass} name="title" defaultValue={draft.title} placeholder="Ej. Control periodontal" />
      </FormField>
      <FormField label="Motivo de consulta" required>
        <textarea className={inputClass} name="chiefComplaint" rows={2} defaultValue={draft.chiefComplaint} />
      </FormField>
      <FormField label="Plan / nota de evolución" required>
        <textarea className={inputClass} name="plan" rows={3} defaultValue={draft.plan} />
      </FormField>

      <FormMore
        summary="Añadir examen y diagnóstico"
        defaultOpen={Boolean(
          draft.currentIllness || draft.physicalExam || draft.impression || draft.diagnoses.length
        )}
      >
        <FormField label="Enfermedad actual">
          <textarea className={inputClass} name="currentIllness" rows={2} defaultValue={draft.currentIllness} />
        </FormField>
        <FormField label="Examen físico">
          <textarea className={inputClass} name="physicalExam" rows={2} defaultValue={draft.physicalExam} />
        </FormField>
        <FormField label="Impresión clínica">
          <textarea className={inputClass} name="impression" rows={2} defaultValue={draft.impression} />
        </FormField>
        <FormField label="Diagnósticos (uno por línea)">
          <textarea className={inputClass} name="diagnoses" rows={2} defaultValue={draft.diagnoses.join("\n")} />
        </FormField>
      </FormMore>

      <FormMore summary="Añadir signos vitales" defaultOpen={Object.keys(draft.vitals).length > 0}>
        <FormGrid>
          <FormField label="Presión arterial">
            <input className={inputClass} name="bloodPressure" defaultValue={draft.vitals.bloodPressure ?? ""} placeholder="120/80" />
          </FormField>
          <FormField label="FC (lpm)">
            <input className={inputClass} name="heartRate" inputMode="numeric" defaultValue={draft.vitals.heartRate ?? ""} />
          </FormField>
          <FormField label="Temperatura (°C)">
            <input className={inputClass} name="temperatureC" inputMode="decimal" defaultValue={draft.vitals.temperatureC ?? ""} />
          </FormField>
          <FormField label="Peso (kg)">
            <input className={inputClass} name="weightKg" inputMode="decimal" defaultValue={draft.vitals.weightKg ?? ""} />
          </FormField>
        </FormGrid>
      </FormMore>

      <FormMore summary="Cambiar fecha, tipo o profesional">
        <FormGrid>
          <FormField label="Fecha clínica">
            <input className={inputClass} type="datetime-local" name="date" defaultValue={draft.date.slice(0, 16)} />
          </FormField>
          <FormField label="Tipo de consulta">
            <select className={inputClass} name="kind" defaultValue={draft.kind}>
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Profesional tratante">
            <input className={inputClass} name="provider" defaultValue={draft.provider} />
          </FormField>
        </FormGrid>
      </FormMore>
    </Modal>
  );
}
