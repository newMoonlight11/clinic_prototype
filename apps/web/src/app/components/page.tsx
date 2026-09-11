"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Badge,
  Modal,
  EncounterModal,
  EncounterTimeline,
  EncounterTable,
  FormField,
  inputClass,
  type Encounter,
} from "ui";

const KIND_OPTIONS = [
  { value: "initial", label: "Consulta inicial" },
  { value: "followUp", label: "Control" },
  { value: "urgent", label: "Urgencia" },
];

const INITIAL_ENCOUNTERS: Encounter[] = [
  {
    id: "enc-1",
    date: "2026-09-01T10:30",
    kind: "followUp",
    provider: "Dra. Ibáñez",
    title: "Control periodontal",
    chiefComplaint: "Sensibilidad al frío en molares inferiores.",
    currentIllness: "",
    physicalExam: "",
    impression: "",
    plan: "Aplicar flúor y reevaluar en 3 semanas.",
    diagnoses: ["Hipersensibilidad dentinaria"],
    vitals: { bloodPressure: "118/76" },
    signed: false,
  },
  {
    id: "enc-2",
    date: "2026-08-15T09:00",
    kind: "urgent",
    provider: "Dr. Marín",
    title: "Urgencia por dolor",
    chiefComplaint: "Dolor agudo pieza 36 desde hace 2 días.",
    currentIllness: "Empeora con frío y al masticar.",
    physicalExam: "Sensibilidad a la percusión en 36.",
    impression: "Pulpitis irreversible",
    plan: "Pulpotomía y control en 48h.",
    diagnoses: ["Pulpitis irreversible"],
    vitals: {},
    signed: true,
    versions: 2,
  },
];

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-[13px]" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  const [encounters, setEncounters] = useState<Encounter[]>(INITIAL_ENCOUNTERS);
  const [encounterModalOpen, setEncounterModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encounter | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  function openNewEncounter() {
    setEditing(null);
    setEncounterModalOpen(true);
  }

  function openEditEncounter(encounter: Encounter) {
    setEditing(encounter);
    setEncounterModalOpen(true);
  }

  function handleSaveEncounter(result: Encounter) {
    setEncounters((prev) => {
      if (result.id && prev.some((e) => e.id === result.id)) {
        return prev.map((e) =>
          e.id === result.id ? { ...result, signed: e.signed, versions: (e.versions ?? 1) + 1 } : e
        );
      }
      return [...prev, { ...result, id: crypto.randomUUID(), signed: false, versions: 1 }];
    });
    setEncounterModalOpen(false);
  }

  function handleSign(encounter: Encounter) {
    setEncounters((prev) => prev.map((e) => (e.id === encounter.id ? { ...e, signed: true } : e)));
  }

  function handleDelete(encounter: Encounter) {
    setEncounters((prev) => prev.filter((e) => e.id !== encounter.id));
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b px-8 py-10" style={{ borderColor: "var(--line)" }}>
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Design system · Avance CRM
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Componentes</h1>
        <p className="mt-2 max-w-2xl text-[13px]" style={{ color: "var(--muted)" }}>
          Todo lo que existe hoy en el paquete <code>ui</code>, con datos de ejemplo e interactivo de
          verdad (no son capturas). El detalle de cada propiedad está documentado en Storybook.
        </p>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-8 py-10">
        <Section title="Button" description="Botón base: variantes de color, tamaño y ancho completo.">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Guardar</Button>
            <Button variant="danger">Eliminar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button>Por defecto</Button>
            <Button size="small">Pequeño</Button>
          </div>
        </Section>

        <Section title="Badge" description="Etiquetas de estado: firmada, sin firmar, tipo de consulta.">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Firmada · v2</Badge>
            <Badge tone="warn">Sin firmar</Badge>
            <Badge tone="danger">Crítico</Badge>
            <Badge tone="blue">Control</Badge>
          </div>
        </Section>

        <Section
          title="Modal"
          description="Diálogo base: foco atrapado, Esc para cerrar, aviso de cambios sin guardar. Encima de él se construyen EncounterModal y los que vengan después."
        >
          <Button variant="primary" onClick={() => setDemoModalOpen(true)}>
            Abrir diálogo de ejemplo
          </Button>
          <Modal
            open={demoModalOpen}
            title="Editar paciente"
            subtitle="Ejemplo genérico construido sobre el componente Modal"
            onClose={() => setDemoModalOpen(false)}
          >
            <FormField label="Nombre">
              <input className={inputClass} name="name" placeholder="Escribe algo y cierra para ver el aviso" />
            </FormField>
          </Modal>
        </Section>

        <Section
          title="EncounterTimeline"
          description="Línea de tiempo expandible: cada evolución se abre en el mismo lugar (plantilla Command center)."
        >
          <EncounterTimeline
            encounters={encounters}
            kindOptions={KIND_OPTIONS}
            onNew={openNewEncounter}
            onEdit={openEditEncounter}
            onSign={handleSign}
            onDelete={handleDelete}
          />
        </Section>

        <Section
          title="EncounterTable"
          description="Tabla filtrable con panel de detalle aparte, para historiales largos (plantilla Split workspace)."
        >
          <EncounterTable
            encounters={encounters}
            kindOptions={KIND_OPTIONS}
            onNew={openNewEncounter}
            onEdit={openEditEncounter}
            onSign={handleSign}
            onDelete={handleDelete}
          />
        </Section>
      </main>

      <EncounterModal
        open={encounterModalOpen}
        encounter={editing}
        kindOptions={KIND_OPTIONS}
        defaultProvider="Dr. Marín"
        nextVersion={(editing?.versions ?? 1) + 1}
        onClose={() => setEncounterModalOpen(false)}
        onSave={handleSaveEncounter}
      />
    </div>
  );
}
