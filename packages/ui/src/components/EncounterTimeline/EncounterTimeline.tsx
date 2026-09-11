"use client";

import { useState } from "react";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";
import { IconButton } from "../IconButton/IconButton";
import { Card, CardHead, CardBody } from "../Card/Card";
import { EncounterDetailRows } from "../EncounterDetailRows/EncounterDetailRows";
import { TrashIcon } from "../../icons/TrashIcon";
import { fmtDateTime } from "../../format";
import type { Encounter, EncounterKindOption } from "../../types/encounter";
import styles from "./EncounterTimeline.module.css";

export interface EncounterTimelineProps {
  encounters: Encounter[];
  kindOptions: EncounterKindOption[];
  onNew?: () => void;
  onEdit?: (encounter: Encounter) => void;
  onSign?: (encounter: Encounter) => void;
  onDelete?: (encounter: Encounter) => void;
}

/** Lista de evoluciones en línea de tiempo: cada tarjeta se expande in-place
 * para ver la nota completa, sin salir de la lista (plantilla "Command center"). */
export function EncounterTimeline({
  encounters,
  kindOptions,
  onNew,
  onEdit,
  onSign,
  onDelete,
}: EncounterTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const kindLabel = (kind: string) => kindOptions.find((option) => option.value === kind)?.label ?? kind;
  const sorted = [...encounters].sort((a, b) => b.date.localeCompare(a.date));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHead title="Evoluciones" subtitle={`${sorted.length} registro(s) · la nota completa se abre aquí mismo`}>
        {onNew ? (
          <Button variant="primary" size="small" onClick={onNew}>
            Nueva evolución
          </Button>
        ) : null}
      </CardHead>
      <CardBody>
        {sorted.length === 0 ? (
          <p className={styles.empty}>Todavía no hay evoluciones registradas.</p>
        ) : (
          <div className={styles.timeline}>
            {sorted.map((encounter) => {
              const id = encounter.id ?? encounter.title;
              const open = expanded.has(id);
              return (
                <article key={id} className={[styles.event, open && styles.eventOpen].filter(Boolean).join(" ")}>
                  <div className={styles.eventHead}>
                    <div>
                      <time>
                        {fmtDateTime(encounter.date)} · {encounter.provider}
                      </time>
                      <h3 className={styles.eventTitle}>
                        {encounter.title}
                        <Badge tone="blue">{kindLabel(encounter.kind)}</Badge>
                        {encounter.signed ? (
                          <Badge>Firmada · v{encounter.versions ?? 1}</Badge>
                        ) : (
                          <Badge tone="warn">Sin firmar</Badge>
                        )}
                      </h3>
                    </div>
                    <div className={styles.eventActions}>
                      <Button size="small" onClick={() => toggle(id)} aria-expanded={open}>
                        {open ? "Ocultar" : "Ver nota"}
                      </Button>
                      {onEdit ? (
                        <Button size="small" onClick={() => onEdit(encounter)}>
                          Editar
                        </Button>
                      ) : null}
                      {!encounter.signed && onSign ? (
                        <Button size="small" onClick={() => onSign(encounter)}>
                          Firmar
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <IconButton aria-label={`Eliminar evolución ${encounter.title}`} onClick={() => onDelete(encounter)}>
                          <TrashIcon />
                        </IconButton>
                      ) : null}
                    </div>
                  </div>
                  {open ? (
                    <div className={styles.eventDetail}>
                      <EncounterDetailRows encounter={encounter} />
                    </div>
                  ) : (
                    <p className={styles.eventPreview}>{encounter.plan}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
