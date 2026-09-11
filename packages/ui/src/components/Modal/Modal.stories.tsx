import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "../Button/Button";
import { FormField, inputClass } from "../Form/Form";
import { Modal, invalid } from "./Modal";

function ModalDemo({
  size,
  danger,
  requireName,
}: {
  size?: "default" | "lg";
  danger?: boolean;
  requireName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Abrir diálogo
      </Button>
      <Modal
        open={open}
        title={danger ? "Eliminar evolución" : "Editar paciente"}
        subtitle="Ejemplo de diálogo construido sobre el componente Modal"
        size={size}
        danger={danger}
        submitLabel={danger ? "Eliminar" : "Guardar"}
        onClose={() => setOpen(false)}
        onSubmit={(form) => {
          if (requireName) {
            const name = new FormData(form).get("name");
            if (!String(name ?? "").trim()) throw invalid("El nombre es obligatorio.", "name");
          }
        }}
      >
        <FormField label="Nombre" required={requireName}>
          <input className={inputClass} name="name" placeholder="Escribe algo para ensuciar el formulario" />
        </FormField>
      </Modal>
    </>
  );
}

const meta = {
  title: "Componentes/Modal",
  component: ModalDemo,
  tags: ["autodocs", "ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ModalDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ModalDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir diálogo" }));
    await expect(
      canvas.getByRole("dialog", { name: "Editar paciente" })
    ).toBeVisible();
  },
};

export const Large: Story = {
  render: () => <ModalDemo size="lg" />,
};

export const Danger: Story = {
  render: () => <ModalDemo danger />,
};

export const ValidationError: Story = {
  render: () => <ModalDemo requireName />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir diálogo" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar" }));
    await expect(canvas.getByText("El nombre es obligatorio.")).toBeVisible();
  },
};

export const DiscardGuard: Story = {
  name: "Aviso de cambios sin guardar",
  render: () => <ModalDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir diálogo" }));
    await userEvent.type(canvas.getByLabelText("Nombre"), "Algo sin guardar");
    await userEvent.click(canvas.getByRole("button", { name: "Cerrar" }));
    await expect(canvas.getByText(/Tienes cambios sin guardar/)).toBeVisible();
  },
};
