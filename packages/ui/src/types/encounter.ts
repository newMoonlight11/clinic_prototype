export interface EncounterVitals {
  bloodPressure?: string;
  heartRate?: string;
  temperatureC?: string;
  weightKg?: string;
}

export interface EncounterProcedure {
  name: string;
  tooth: string;
}

export interface Encounter {
  id?: string;
  date: string;
  kind: string;
  provider: string;
  title: string;
  chiefComplaint: string;
  currentIllness: string;
  physicalExam: string;
  impression: string;
  plan: string;
  diagnoses: string[];
  vitals: EncounterVitals;
  /** Campos de solo lectura que llenan las listas (EncounterTimeline/EncounterTable),
   * no el formulario del EncounterModal. */
  signed?: boolean;
  versions?: number;
  procedures?: EncounterProcedure[];
}

export interface EncounterKindOption {
  value: string;
  label: string;
}
