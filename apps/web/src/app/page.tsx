import Link from "next/link";
import { Button } from "ui";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-16 text-foreground">
      <h1 className="text-2xl font-semibold">Next.js + Storybook, puente funcionando</h1>
      <p className="max-w-md text-center" style={{ color: "var(--muted)" }}>
        Este botón viene del paquete <code>ui</code>, documentado en Storybook
        (<code>npm run storybook</code>) e importado aquí sin volver a
        escribirlo.
      </p>
      <div className="flex gap-3">
        <Button variant="primary">Guardar</Button>
        <Button variant="danger">Eliminar</Button>
        <Button variant="ghost">Cancelar</Button>
      </div>
      <Link href="/components" className="text-[13px] font-semibold underline" style={{ color: "var(--primary)" }}>
        Ver todos los componentes →
      </Link>
    </div>
  );
}
