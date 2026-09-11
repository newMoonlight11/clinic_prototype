import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Badge } from "./Badge";

const meta = {
  title: "Componentes/Badge",
  component: Badge,
  tags: ["autodocs", "ai-generated"],
  args: {
    children: "Firmada · v2",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Firmada · v2")).toBeVisible();
  },
};

export const Warn: Story = {
  args: { tone: "warn", children: "Sin firmar" },
};

export const Danger: Story = {
  args: { tone: "danger", children: "Crítico" },
};

export const Blue: Story = {
  args: { tone: "blue", children: "Control" },
};

export const CssCheck: Story = {
  args: { tone: "blue", children: "Control" },
  play: async ({ canvas }) => {
    const badge = canvas.getByText("Control");
    // Badge.module.css .blue usa var(--primary-soft) = #e7eff3.
    await expect(getComputedStyle(badge).backgroundColor).toBe("rgb(231, 239, 243)");
  },
};
