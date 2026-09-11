"use client";

import { useMemo, useState } from "react";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";
import { IconButton } from "../IconButton/IconButton";
import { Card, CardHead, CardBody } from "../Card/Card";
import { inputClass } from "../Form/Form";
import { EncounterDetailRows } from "../EncounterDetailRows/EncounterDetailRows";
import { PencilIcon } from "../../icons/PencilIcon";
import { TrashIcon } from "../../icons/TrashIcon";
import { fmtDate, fmtShort, fmtTime } from "../../format";
import type { Encounter, EncounterKindOption } from "../../types/encounter";
import styles from "./EncounterTable.module.css";

export interface EncounterTableProps {
  encounters: Encounter[];
  kindOptions: EncounterKindOption[];
  onNew?: () => void;
  onEdit?: (encounter: Encounter) => void;
  onSign?: (encounter: Encounter) => void;
  onDelete?: (encounter: Encounter) => void;
}

/** Tabla filtrable de evoluciones con panel de detalle aparte, para historiales
 * largos que necesitan buscar (plantilla "Split workspace"). */
export function EncounterTable({ encounters, kindOptions, onNew, onEdit, onSign, onDelete }: EncounterTableProps) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"date-desc" | "date-asc">("date-desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const kindLabel = (kind: string) => kindOptions.find((option) => option.value === kind)?.label ?? kind;

  const rows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return [...encounters]
      .sort((a, b) => (sort === "date-asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
      .filter(
        (encounter) =>
          !query ||
          [encounter.title, encounter.plan, encounter.chiefComplaint, encounter.impression, encounter.provider]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
  }, [encounters, filter, sort]);

  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  return (
    <>
      <Card>
        <CardHead title="Evoluciones" subtitle={`${rows.length} de ${encounters.length} registro(s)`}>
          <label className={styles.search}>
            <span className="sr-only">Filtrar evoluciones</span>
            <input
              className={`${inputClass} ${styles.searchInput}`}
              placeholder="Filtrar por texto…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <Button size="small" onClick={() => setSort((s) => (s === "date-desc" ? "date-asc" : "date-desc"))}>
            {sort === "date-desc" ? "Más recientes" : "Más antiguas"}
          </Button>
          {onNew ? (
            <Button variant="primary" size="small" onClick={onNew}>
              Nueva
            </Button>
          ) : null}
        </CardHead>
        <CardBody>
          {rows.length === 0 ? (
            <p className={styles.empty}>Ninguna evolución coincide con &quot;{filter}&quot;.</p>
          ) : (
            <div className={styles.scrollX}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Fecha</th>
                    <th>Título</th>
                    <th style={{ width: 110 }}>Tipo</th>
                    <th style={{ width: 110 }}>Estado</th>
                    <th style={{ width: 90 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((encounter) => {
                    const id = encounter.id ?? encounter.title;
                    return (
                      <tr
                        key={id}
                        className={selected?.id === encounter.id ? "selected" : undefined}
                        tabIndex={0}
                        onClick={() => setSelectedId(id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(id);
                          }
                        }}
                      >
                        <td>
                          {fmtShort(encounter.date)}
                          <br />
                          <small>{fmtTime(encounter.date)}</small>
                        </td>
                        <td>
                          <b>{encounter.title}</b>
                          <div className="muted xs">{encounter.provider}</div>
                        </td>
                        <td>
                          <Badge tone="blue">{kindLabel(encounter.kind)}</Badge>
                        </td>
                        <td>
                          {encounter.signed ? (
                            <Badge>Firmada v{encounter.versions ?? 1}</Badge>
                          ) : (
                            <Badge tone="warn">Sin firmar</Badge>
                          )}
                        </td>
                        <td>
                          <span className={styles.rowActions}>
                            {onEdit ? (
                              <IconButton
                                aria-label={`Editar ${encounter.title}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEdit(encounter);
                                }}
                              >
                                <PencilIcon />
                              </IconButton>
                            ) : null}
                            {onDelete ? (
                              <IconButton
                                aria-label={`Eliminar ${encounter.title}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDelete(encounter);
                                }}
                              >
                                <TrashIcon />
                              </IconButton>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {selected ? (
        <Card>
          <CardHead
            title={selected.title}
            subtitle={
              <ul className={styles.metaList}>
                <li>{fmtDate(selected.date)}</li>
                <li>{fmtTime(selected.date)}</li>
                <li>{selected.provider}</li>
                <li>Versión {selected.versions ?? 1}</li>
              </ul>
            }
          >
            {!selected.signed && onSign ? (
              <Button size="small" onClick={() => onSign(selected)}>
                Firmar
              </Button>
            ) : null}
            {onEdit ? (
              <Button size="small" onClick={() => onEdit(selected)}>
                Editar
              </Button>
            ) : null}
          </CardHead>
          <CardBody>
            <EncounterDetailRows encounter={selected} />
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
