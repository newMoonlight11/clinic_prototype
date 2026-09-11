import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { EncounterTable } from "./EncounterTable";
import type { Encounter } from "../../types/encounter";

const KIND_OPTIONS = [
  { value: "initial", label: "Consulta inicial" },
  { value: "followUp", label: "Control" },
  { value: "urgent", label: "Urgencia" },
];

const ENCOUNTERS: Encounter[] = [
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

const meta = {
  title: "Clínica/EncounterTable",
  component: EncounterTable,
  tags: ["autodocs", "ai-generated"],
  args: {
    encounters: ENCOUNTERS,
    kindOptions: KIND_OPTIONS,
  },
} satisfies Meta<typeof EncounterTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    // La primera fila queda seleccionada por defecto, así que el título
    // aparece dos veces: en la tabla y en el encabezado del panel de detalle.
    await expect(canvas.getByRole("heading", { name: "Control periodontal" })).toBeVisible();
    await expect(canvas.getByRole("cell", { name: /Control periodontal/ })).toBeVisible();
  },
};

export const Empty: Story = {
  args: { encounters: [] },
};

export const FilterRows: Story = {
  name: "Filtrar por texto",
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByPlaceholderText("Filtrar por texto…"), "urgencia");
    await expect(canvas.getByRole("cell", { name: /Urgencia por dolor/ })).toBeVisible();
    await expect(canvas.queryByRole("cell", { name: /Control periodontal/ })).not.toBeInTheDocument();
  },
};

export const SelectRow: Story = {
  name: "Seleccionar una fila muestra el detalle",
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("cell", { name: /Urgencia por dolor/ }));
    await expect(canvas.getByRole("heading", { name: "Urgencia por dolor" })).toBeVisible();
    await expect(canvas.getByText("Pulpotomía y control en 48h.")).toBeVisible();
  },
};
