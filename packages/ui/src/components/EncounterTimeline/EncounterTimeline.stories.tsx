import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { EncounterTimeline } from "./EncounterTimeline";
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
  title: "Clínica/EncounterTimeline",
  component: EncounterTimeline,
  tags: ["autodocs", "ai-generated"],
  args: {
    encounters: ENCOUNTERS,
    kindOptions: KIND_OPTIONS,
  },
} satisfies Meta<typeof EncounterTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { encounters: [] },
};

export const ExpandToSeeNote: Story = {
  name: "Expandir para ver la nota",
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "Ver nota" })[0]);
    await expect(canvas.getByText("Sensibilidad al frío en molares inferiores.")).toBeVisible();
  },
};
