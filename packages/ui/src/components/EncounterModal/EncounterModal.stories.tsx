import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "../Button/Button";
import { EncounterModal, type Encounter } from "./EncounterModal";

const KIND_OPTIONS = [
  { value: "initial", label: "Consulta inicial" },
  { value: "followUp", label: "Control" },
  { value: "urgent", label: "Urgencia" },
];

const EXISTING_ENCOUNTER: Encounter = {
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
};

function EncounterModalDemo({ encounter }: { encounter?: Encounter | null }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Encounter | null>(null);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {encounter ? "Editar evolución" : "Nueva evolución"}
      </Button>
      {saved ? <p data-testid="saved-title">Guardado: {saved.title}</p> : null}
      <EncounterModal
        open={open}
        encounter={encounter}
        kindOptions={KIND_OPTIONS}
        defaultProvider="Dr. Marín"
        nextVersion={2}
        onClose={() => setOpen(false)}
        onSave={(result) => {
          setSaved(result);
          setOpen(false);
        }}
      />
    </>
  );
}

const meta = {
  title: "Clínica/EncounterModal",
  component: EncounterModalDemo,
  tags: ["autodocs", "ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EncounterModalDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {
  render: () => <EncounterModalDemo />,
};

export const EditExisting: Story = {
  render: () => <EncounterModalDemo encounter={EXISTING_ENCOUNTER} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Editar evolución" }));
    await expect(
      canvas.getByText(/Se guardará como versión 2/)
    ).toBeVisible();
    await expect(canvas.getByDisplayValue("Control periodontal")).toBeVisible();
  },
};

export const RequiredFieldValidation: Story = {
  render: () => <EncounterModalDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Nueva evolución" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar evolución" }));
    await expect(canvas.getByText("El título de la evolución es obligatorio.")).toBeVisible();
  },
};

export const FullSaveFlow: Story = {
  name: "Flujo completo: llenar y guardar",
  render: () => <EncounterModalDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Nueva evolución" }));
    await userEvent.type(canvas.getByLabelText(/Título/), "Urgencia por dolor");
    await userEvent.type(canvas.getByLabelText(/Motivo de consulta/), "Dolor agudo pieza 36");
    await userEvent.type(canvas.getByLabelText(/Plan \/ nota de evolución/), "Pulpotomía y control en 48h");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar evolución" }));
    await expect(await canvas.findByTestId("saved-title")).toHaveTextContent("Urgencia por dolor");
  },
};
