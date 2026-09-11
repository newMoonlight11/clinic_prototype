import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Componentes/Button",
  component: Button,
  tags: ["autodocs", "ai-generated"],
  args: {
    children: "Guardar",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Guardar" })).toBeVisible();
  },
};

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Eliminar" },
};

export const Ghost: Story = {
  args: { variant: "ghost" },
};

export const Small: Story = {
  args: { size: "small" },
};

export const Full: Story = {
  args: { full: true },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 320 }}>
        <StoryFn />
      </div>
    ),
  ],
};

export const CssCheck: Story = {
  args: { variant: "primary" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Guardar" });
    // Button.module.css .primary usa var(--primary) = #1f4b60.
    await expect(getComputedStyle(button).backgroundColor).toBe("rgb(31, 75, 96)");
  },
};
