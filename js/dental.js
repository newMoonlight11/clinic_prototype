/* Módulos clínicos dentales compartidos por las tres opciones de diseño:
   odontograma, periodontograma y biopelícula.

   Cada módulo expone un `render*` que devuelve HTML y un `wire*` que engancha
   los eventos, para que cada opción los coloque donde quiera sin duplicar
   lógica. Numeración FDI. */

(function () {
  const UI = window.ProtoUI;
  const Store = window.ProtoStore;
  const { tpl, raw, qsa, esc } = UI;

  /* ------------------------------------------------------------------ *
   * Numeración FDI
   * ------------------------------------------------------------------ */

  const Data = window.ProtoData;
  const { ARCH_ROWS, PERMANENT, PRIMARY, ALL_TEETH, UPPER_ROW, LOWER_ROW } = Data;

  /* ------------------------------------------------------------------ *
   * Vocabulario clínico (rótulos del sistema de referencia, sin traducir)
   * ------------------------------------------------------------------ */

  const TOOTH_STATES = {
    present: 'Presente',
    absent: 'Ausente',
    implant: 'Implante',
    crown: 'Corona',
    pontic: 'Póntico',
    residual_root: 'Resto radicular',
    erupting: 'En erupción',
    unerupted: 'No erupcionado',
    extraction_indicated: 'Extracción indicada',
  };

  /** El catálogo de hallazgos es editable desde la interfaz. */
  function findingCatalog() {
    return Store.getSettings().surfaceFindings;
  }

  function findingLabel(key) {
    return findingCatalog().find((item) => item.key === key)?.label ?? key;
  }

  function findingColor(key) {
    return findingCatalog().find((item) => item.key === key)?.color ?? '#8a97a1';
  }

  const TOOTH_FINDINGS = {
    endodontics: 'Endodoncia',
    post: 'Perno',
    mobility: 'Movilidad',
    furcation: 'Furca',
    diastema: 'Diastema',
  };

  const ORTHO_FINDINGS = {
    mesialized: 'Mesializado',
    distalized: 'Distalizado',
    extruded: 'Extruido',
    intruded: 'Intruido',
    rotated: 'Rotado',
  };

  const SURFACES = ['mesial', 'distal', 'buccal', 'lingual', 'occlusal'];
  const PERIO_ROWS = ['PLP', 'PB', 'MG'];

  /** Qué significa cada fila y en qué rango se mueve (recomendación 09). */
  const PERIO_ROW_HELP = {
    PLP: 'Nivel de inserción clínica, 0 a 15 mm',
    PB: 'Profundidad de bolsa al sondaje, 0 a 15 mm',
    MG: 'Margen gingival, −5 a 5 mm; negativo es recesión',
  };
  const PERIO_SITES = ['mesial', 'central', 'distal'];
  const PERIO_RANGES = { PLP: [0, 15], PB: [0, 15], MG: [-5, 5] };
  const BIOFILM_CELLS = ['mesial', 'distal', 'cervical', 'incisal'];
  const MOBILITY_LABELS = ['0', 'I', 'II', 'III'];
  const FURCATION_LABELS = { 1: 'I', 2: 'II', 3: 'III' };

  /* ------------------------------------------------------------------ *
   * Ubicación de la pieza
   * ------------------------------------------------------------------ */

  const quadrantOf = (fdi) => Number(fdi[0]);
  const positionOf = (fdi) => Number(fdi[1]);
  const archOf = (fdi) => ([1, 2, 5, 6].includes(quadrantOf(fdi)) ? 'upper' : 'lower');
  /** Lado del paciente; en pantalla (vista del clínico) `right` va a la izquierda. */
  const sideOf = (fdi) => ([1, 4, 5, 8].includes(quadrantOf(fdi)) ? 'right' : 'left');
  const isAnterior = (fdi) => positionOf(fdi) <= 3;
  const isPrimary = (fdi) => PRIMARY.includes(fdi);

  /** En anteriores la oclusal se rotula «Incisal»; en el maxilar la lingual, «Palatino». */
  function surfaceLabel(fdi, surface) {
    if (surface === 'mesial') return 'Mesial';
    if (surface === 'distal') return 'Distal';
    if (surface === 'buccal') return 'Vestibular';
    if (surface === 'lingual') return archOf(fdi) === 'upper' ? 'Palatino' : 'Lingual';
    return isAnterior(fdi) ? 'Incisal' : 'Oclusal';
  }

  function perioFaceLabel(fdi, face) {
    if (face === 'buccal') return 'Vestibular';
    return archOf(fdi) === 'upper' ? 'Palatino' : 'Lingual';
  }

  /** Piezas sondeables y que cuentan para el índice de placa. */
  function isChartable(tooth) {
    return tooth && tooth.state !== 'absent' && tooth.state !== 'unerupted';
  }

  /**
   * Ubica cada cara en la cruz: la mesial siempre mira a la línea media y la
   * vestibular queda hacia afuera del arco.
   */
  function crossLayout(fdi) {
    const mesialAt = sideOf(fdi) === 'right' ? 'right' : 'left';
    const distalAt = mesialAt === 'right' ? 'left' : 'right';
    const buccalAt = archOf(fdi) === 'upper' ? 'top' : 'bottom';
    const lingualAt = buccalAt === 'top' ? 'bottom' : 'top';
    const layout = { center: 'occlusal' };
    layout[mesialAt] = 'mesial';
    layout[distalAt] = 'distal';
    layout[buccalAt] = 'buccal';
    layout[lingualAt] = 'lingual';
    return layout;
  }

  /* ------------------------------------------------------------------ *
   * Cálculos
   * ------------------------------------------------------------------ */

  const round = (value, decimals = 1) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };

  function perioSites(dental) {
    const list = [];
    [UPPER_ROW, LOWER_ROW].forEach((row) => {
      row.forEach((fdi) => {
        if (!isChartable(dental.teeth[fdi])) return;
        ['buccal', 'lingual'].forEach((face) => {
          PERIO_SITES.forEach((site) => list.push(dental.perio[fdi][face][site]));
        });
      });
    });
    return list;
  }

  function perioSummary(dental) {
    const sites = perioSites(dental);
    if (sites.length === 0) return { bleeding: 0, deep: 0, meanCal: 0, sites: 0 };
    const bleeding = sites.filter((site) => site.bleeding).length;
    const deep = sites.filter((site) => (site.pb ?? 0) >= 4).length;
    const cal = sites.reduce((sum, site) => sum + (site.plp ?? 0), 0);
    return {
      bleeding: round((bleeding / sites.length) * 100),
      deep: round((deep / sites.length) * 100),
      meanCal: round(cal / sites.length, 2),
      sites: sites.length,
    };
  }

  function biofilmSummary(dental) {
    let stained = 0;
    let total = 0;
    ALL_TEETH.forEach((fdi) => {
      if (!isChartable(dental.teeth[fdi])) return;
      ['buccal', 'lingual'].forEach((face) => {
        BIOFILM_CELLS.forEach((cell) => {
          total += 1;
          if (dental.biofilm[fdi][face][cell]) stained += 1;
        });
      });
    });
    return { index: total === 0 ? 0 : round((stained / total) * 100, 2), stained, total };
  }

  /** Dientes con algo registrado, para las listas de hallazgos. */
  function findings(dental) {
    return ALL_TEETH.map((fdi) => dental.teeth[fdi])
      .filter(
        (tooth) =>
          tooth.state !== 'present' &&
          !(isPrimary(tooth.fdi) && tooth.state === 'absent')
      )
      .concat(
        ALL_TEETH.map((fdi) => dental.teeth[fdi]).filter(
          (tooth) => tooth.state === 'present' && (Object.keys(tooth.surfaces).length > 0 || tooth.ortho || tooth.findings.length > 0)
        )
      )
      .filter((tooth, index, list) => list.indexOf(tooth) === index)
      .sort((a, b) => a.fdi.localeCompare(b.fdi));
  }

  /** Resumen textual con el formato del «Diagnóstico Odontograma» de referencia. */
  function diagnosisText(dental) {
    const lines = [];
    [...UPPER_ROW, ...LOWER_ROW, ...PRIMARY].forEach((fdi) => {
      const tooth = dental.teeth[fdi];
      if (!tooth) return;
      if (isPrimary(fdi) && tooth.state === 'absent') return;
      const entries = [];
      if (tooth.state !== 'present') entries.push(`Estado: ${TOOTH_STATES[tooth.state]}`);
      if (tooth.ortho) entries.push(`Ortodoncia: ${ORTHO_FINDINGS[tooth.ortho]}`);
      tooth.findings.forEach((finding) => entries.push(TOOTH_FINDINGS[finding]));
      SURFACES.forEach((surface) => {
        const finding = tooth.surfaces[surface];
        if (finding) entries.push(`${surfaceLabel(fdi, surface)}: ${findingLabel(finding)}`);
      });
      if (tooth.note && tooth.note.trim()) entries.push(`Nota: ${tooth.note.trim()}`);
      if (entries.length === 0) return;
      lines.push(`${fdi}:`);
      entries.forEach((entry) => lines.push(`   - ${entry}`));
    });
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Odontograma
   * ------------------------------------------------------------------ */

  const POSITIONS = ['top', 'left', 'center', 'right', 'bottom'];

  function toothSlot(dental, fdi, options) {
    const tooth = dental.teeth[fdi];
    const layout = crossLayout(fdi);
    const absent = tooth.state === 'absent';
    const badges = [];
    if (tooth.ortho) badges.push(ORTHO_FINDINGS[tooth.ortho].slice(0, 4));
    if (tooth.findings.includes('endodontics')) badges.push('Endo');
    if (tooth.findings.includes('post')) badges.push('Perno');

    return tpl`
      <div class="odo-slot ${options.selected === fdi ? 'selected' : ''}" data-slot="${fdi}">
        <button type="button" class="odo-number" data-tooth="${fdi}"
          aria-label="Diente ${fdi}, ${TOOTH_STATES[tooth.state]}. Abrir detalle">${fdi}</button>
        <div class="odo-cross state-${tooth.state}" role="group" aria-label="Diente ${fdi}">
          ${POSITIONS.map((position) => {
            const surface = layout[position];
            const finding = tooth.surfaces[surface];
            /* El color va en línea para que sirva también con hallazgos
               agregados por la clínica, no solo con los del catálogo base. */
            const fill = finding ? findingColor(finding) : '';
            return tpl`<button type="button" class="odo-surface pos-${position} ${finding ? `fill-${finding}` : ''}"
              data-fdi="${fdi}" data-surface="${surface}"
              ${finding ? raw(`style="background:${esc(fill)};border-color:${esc(fill)}"`) : ''}
              title="${surfaceLabel(fdi, surface)}${finding ? ` · ${findingLabel(finding)}` : ''}${absent ? ' · diente ausente' : ''}"
              aria-label="${surfaceLabel(fdi, surface)} de ${fdi}${finding ? `, ${findingLabel(finding)}` : ', sin hallazgo'}"></button>`;
          })}
          ${absent || tooth.state === 'extraction_indicated'
            ? raw(`<svg class="odo-mark ${tooth.state === 'absent' ? 'absent' : 'extraction'}" viewBox="0 0 30 30" aria-hidden="true"><path d="M5 5 L25 25 M25 5 L5 25"/></svg>`)
            : ''}
          ${tooth.state === 'implant'
            ? raw('<svg class="odo-mark implant" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 5 v20 M10 10 h10 M10 15 h10 M11 20 h8"/></svg>')
            : ''}
          ${tooth.state === 'crown' ? raw('<span class="odo-mark crown" aria-hidden="true"></span>') : ''}
          ${tooth.state === 'pontic' ? raw('<span class="odo-mark pontic" aria-hidden="true"></span>') : ''}
          ${tooth.state === 'residual_root' ? raw('<span class="odo-mark root" aria-hidden="true"></span>') : ''}
        </div>
        ${options.compact ? '' : tpl`<div class="odo-badges">${badges.map((badge) => tpl`<span>${badge}</span>`)}</div>`}
      </div>`;
  }

  /**
   * @param {object} patient
   * @param {{compact?:boolean, showPrimary?:boolean, selected?:string|null}} options
   */
  function renderOdontogram(patient, options = {}) {
    const dental = patient.dental;
    /* La dentición temporal se muestra solo si se pide: en un adulto esas
       piezas están ausentes y solo estorban. */
    const rows = options.showPrimary ? ARCH_ROWS : [ARCH_ROWS[0], ARCH_ROWS[3]];
    return tpl`
      <div class="odo-arch ${options.compact ? 'compact' : ''}">
        <div class="odo-sides">
          <span>Derecho</span>
          <label class="chip-check dentition-toggle">
            <input type="checkbox" data-show-primary ${options.showPrimary ? raw('checked') : ''}>
            <span>Dentición temporal</span>
          </label>
          <span>Izquierdo</span>
        </div>
        <div class="odo-rows">
            ${rows.map(
              (row) => tpl`<div class="odo-row">
                <div class="odo-half">${row.slice(0, row.length / 2).map((fdi) => toothSlot(dental, fdi, options))}</div>
                <div class="odo-midline" aria-hidden="true"></div>
                <div class="odo-half">${row.slice(row.length / 2).map((fdi) => toothSlot(dental, fdi, options))}</div>
              </div>`
            )}
        </div>
      </div>`;
  }

  function renderOdontogramLegend() {
    return tpl`
      <div class="dental-legend">
        ${findingCatalog().map(
          (finding) => tpl`<span class="legend-item"><i class="swatch" style="background:${finding.color};border-color:${finding.color}"></i>${finding.label}</span>`
        )}
        <span class="legend-item"><i class="swatch swatch-absent"></i>Ausente</span>
        <span class="legend-item"><i class="swatch swatch-implant"></i>Implante</span>
        <span class="legend-item"><i class="swatch swatch-crown"></i>Corona</span>
        <button type="button" class="btn small ghost" data-findings-catalog>Editar hallazgos</button>
      </div>`;
  }

  /** CRUD del catálogo de hallazgos por superficie. */
  async function findingsCatalogDialog() {
    await UI.modal({
      title: 'Hallazgos por superficie',
      subtitle: 'Catálogo de la clínica: se puede agregar, renombrar, cambiar color y eliminar',
      submitLabel: null,
      body: tpl`<div data-catalog-list class="catalog-list"></div>
        <button type="button" class="btn small full" data-catalog-add>Agregar hallazgo</button>`,
      onMount: (overlay, close) => {
        const host = overlay.querySelector('[data-catalog-list]');
        const paint = () => {
          host.innerHTML = findingCatalog()
            .map(
              (finding) => `<div class="catalog-row" data-key="${esc(finding.key)}">
                <input type="color" class="catalog-color" value="${esc(finding.color)}" aria-label="Color de ${esc(finding.label)}">
                <input class="input input-sm catalog-label" value="${esc(finding.label)}" aria-label="Nombre de ${esc(finding.label)}">
                <button type="button" class="icon-btn" data-remove aria-label="Eliminar ${esc(finding.label)}">${UI.icon('trash').__raw}</button>
              </div>`
            )
            .join('');
          qsa(host, '.catalog-row').forEach((row) => {
            const key = row.dataset.key;
            row.querySelector('.catalog-color').addEventListener('change', (event) =>
              Store.saveSurfaceFinding({ key, color: event.target.value })
            );
            row.querySelector('.catalog-label').addEventListener('change', (event) =>
              Store.saveSurfaceFinding({ key, label: event.target.value.trim() || key })
            );
            row.querySelector('[data-remove]').addEventListener('click', async () => {
              const ok = await UI.confirmDialog({
                title: 'Eliminar hallazgo',
                message: 'Se quita del catálogo y de todas las caras que lo tuvieran registrado.',
                confirmLabel: 'Eliminar',
              });
              if (ok) {
                Store.deleteSurfaceFinding(key);
                paint();
                UI.toast('Hallazgo eliminado', 'warn');
              }
            });
          });
        };
        paint();
        overlay.querySelector('[data-catalog-add]').addEventListener('click', async () => {
          close(null);
          const created = await UI.modal({
            title: 'Nuevo hallazgo',
            submitLabel: 'Agregar',
            body: tpl`
              <label class="form-field"><span>Nombre</span><input class="input" name="label" placeholder="Ej. Corona provisional"></label>
              <label class="form-field"><span>Color</span><input class="input" type="color" name="color" value="#2a7f9e"></label>`,
            onSubmit: (form) => {
              const values = Object.fromEntries(new FormData(form).entries());
              if (!values.label.trim()) throw UI.invalid('Escribe el nombre del hallazgo.', 'label');
              return {
                key: values.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                label: values.label.trim(),
                color: values.color,
              };
            },
          });
          if (created) {
            Store.saveSurfaceFinding(created);
            UI.toast('Hallazgo agregado');
            findingsCatalogDialog();
          }
        });
      },
    });
  }

  function renderDiagnosis(patient) {
    const text = diagnosisText(patient.dental);
    return tpl`
      <div class="diagnosis-block">
        <p class="section-label">Diagnóstico Odontograma</p>
        <pre class="diagnosis-output" data-diagnosis>${text || 'Sin hallazgos registrados.'}</pre>
        <label class="form-field">
          <span>Diagnósticos Complementarios</span>
          <textarea class="input" rows="3" data-complementary
            placeholder="Texto libre del profesional">${patient.dental.complementaryDiagnosis}</textarea>
        </label>
      </div>`;
  }

  async function openSurfaceMenu(button) {
    const fdi = button.dataset.fdi;
    const surface = button.dataset.surface;
    const current = Store.getPatient().dental.teeth[fdi].surfaces[surface];
    const options = findingCatalog().map((finding) => ({
      value: finding.key,
      label: finding.label,
      color: finding.color,
      active: current === finding.key,
    }));
    const chosen = await UI.popover(button, `${surfaceLabel(fdi, surface)} · diente ${fdi}`, options);
    if (!chosen) return;
    Store.toggleSurfaceFinding(fdi, surface, chosen);
    const now = Store.getPatient().dental.teeth[fdi].surfaces[surface];
    UI.toast(
      now
        ? `${fdi} ${surfaceLabel(fdi, surface)}: ${findingLabel(chosen)}`
        : `${fdi} ${surfaceLabel(fdi, surface)}: hallazgo retirado`,
      now ? 'ok' : 'warn'
    );
  }

  async function openToothDialog(fdi) {
    const tooth = Store.getPatient().dental.teeth[fdi];
    const result = await UI.modal({
      title: `Diente ${fdi}`,
      subtitle: `${isAnterior(fdi) ? 'Anterior' : 'Posterior'} · ${archOf(fdi) === 'upper' ? 'Maxilar' : 'Mandíbula'} · ${sideOf(fdi) === 'right' ? 'Derecho' : 'Izquierdo'}`,
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Estado</span>
          <select class="input" name="state">
            ${Object.keys(TOOTH_STATES).map(
              (state) => tpl`<option value="${state}" ${state === tooth.state ? raw('selected') : ''}>${TOOTH_STATES[state]}</option>`
            )}
          </select></label>
        <fieldset class="form-fieldset"><legend>Hallazgos de diente completo</legend>
          <div class="chip-check-row">
            ${Object.keys(TOOTH_FINDINGS).map(
              (finding) => tpl`<label class="chip-check">
                <input type="checkbox" name="finding" value="${finding}" ${tooth.findings.includes(finding) ? raw('checked') : ''}>
                <span>${TOOTH_FINDINGS[finding]}</span></label>`
            )}
          </div>
        </fieldset>
        <label class="form-field"><span>Ortodoncia</span>
          <select class="input" name="ortho">
            <option value="">Sin hallazgo</option>
            ${Object.keys(ORTHO_FINDINGS).map(
              (ortho) => tpl`<option value="${ortho}" ${ortho === tooth.ortho ? raw('selected') : ''}>${ORTHO_FINDINGS[ortho]}</option>`
            )}
          </select></label>
        <label class="form-field"><span>Nota</span>
          <textarea class="input" rows="3" name="note">${tooth.note}</textarea></label>`,
      onSubmit: (form) => {
        const data = new FormData(form);
        return {
          state: data.get('state'),
          findings: data.getAll('finding'),
          ortho: data.get('ortho') || null,
          note: String(data.get('note') ?? '').trim(),
        };
      },
    });
    if (!result) return;
    Store.updateTooth(fdi, result);
    UI.toast(`Diente ${fdi}: ${TOOTH_STATES[result.state]}`);
  }

  function wireOdontogram(root) {
    qsa(root, '.odo-surface').forEach((button) =>
      button.addEventListener('click', () => {
        const tooth = Store.getPatient().dental.teeth[button.dataset.fdi];
        /* En un diente ausente no hay caras que marcar: el toque abre el
           detalle para poder devolverlo a presente. */
        if (!isChartable(tooth)) openToothDialog(button.dataset.fdi);
        else openSurfaceMenu(button);
      })
    );
    const catalog = root.querySelector('[data-findings-catalog]');
    if (catalog) catalog.addEventListener('click', () => findingsCatalogDialog());
    qsa(root, '[data-tooth]').forEach((button) =>
      button.addEventListener('click', () => openToothDialog(button.dataset.tooth))
    );
    const complementary = root.querySelector('[data-complementary]');
    if (complementary) {
      complementary.addEventListener('input', () =>
        Store.setComplementaryDiagnosis(complementary.value)
      );
    }
  }

  /* ------------------------------------------------------------------ *
   * Periodontograma
   * ------------------------------------------------------------------ */

  const TOOTH_W = 40;
  const STRIP_H = 92;
  const MM = 4;
  const UPPER_GEOMETRY = { cej: 36, apical: -1 };
  const LOWER_GEOMETRY = { cej: 56, apical: 1 };

  /** Orden físico de los sitios: la mesial mira a la línea media. */
  function siteOffsets(fdi) {
    return sideOf(fdi) === 'right'
      ? { distal: 8, central: TOOTH_W / 2, mesial: TOOTH_W - 8 }
      : { mesial: 8, central: TOOTH_W / 2, distal: TOOTH_W - 8 };
  }

  function polylineSegments(dental, row, face, geometry, kind) {
    const segments = [];
    let current = [];
    row.forEach((fdi, index) => {
      if (!isChartable(dental.teeth[fdi])) {
        if (current.length > 1) segments.push(current);
        current = [];
        return;
      }
      const offsets = siteOffsets(fdi);
      PERIO_SITES.forEach((site) => {
        const measurement = dental.perio[fdi][face][site];
        const marginY = geometry.cej - geometry.apical * (measurement.mg ?? 0) * MM;
        const y = kind === 'margin' ? marginY : marginY + geometry.apical * (measurement.pb ?? 0) * MM;
        current.push({ x: index * TOOTH_W + offsets[site], y });
      });
    });
    if (current.length > 1) segments.push(current);
    return segments.map((segment) => segment.slice().sort((a, b) => a.x - b.x));
  }

  const pointsAttr = (points) => points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  function toothShape(index, geometry, absent) {
    const x = index * TOOTH_W + 5;
    const width = TOOTH_W - 10;
    const crownH = 42;
    const rootH = 28;
    const crownY = geometry.apical === -1 ? geometry.cej : geometry.cej - crownH;
    const rootY = geometry.apical === -1 ? geometry.cej - rootH : geometry.cej;
    return tpl`<g class="perio-tooth ${absent ? 'absent' : ''}">
      <rect class="root" x="${x + 5}" y="${rootY}" width="${width - 10}" height="${rootH}" rx="3"></rect>
      <rect class="crown" x="${x}" y="${crownY}" width="${width}" height="${crownH}" rx="4"></rect>
    </g>`;
  }

  function perioStrip(dental, row, face, geometry) {
    const width = row.length * TOOTH_W;
    const label = perioFaceLabel(row[0], face);
    return tpl`
      <div class="perio-strip" data-strip="${row[0]}-${face}">
        <span class="perio-strip-label">${label}</span>
        <svg class="perio-svg" viewBox="0 0 ${width} ${STRIP_H}" preserveAspectRatio="none" role="img"
          aria-label="Dientes por ${label.toLowerCase()}, con línea de margen gingival y fondo de bolsa">
          <line class="cej" x1="0" y1="${geometry.cej}" x2="${width}" y2="${geometry.cej}"></line>
          ${row.map((fdi, index) => toothShape(index, geometry, !isChartable(dental.teeth[fdi])))}
          ${polylineSegments(dental, row, face, geometry, 'pocket').map(
            (segment) => tpl`<polyline class="line-pocket" points="${pointsAttr(segment)}"></polyline>`
          )}
          ${polylineSegments(dental, row, face, geometry, 'margin').map(
            (segment) => tpl`<polyline class="line-margin" points="${pointsAttr(segment)}"></polyline>`
          )}
          ${row.map((fdi, index) => {
            if (!isChartable(dental.teeth[fdi])) return '';
            const offsets = siteOffsets(fdi);
            return PERIO_SITES.map((site) => {
              const measurement = dental.perio[fdi][face][site];
              if (!measurement.bleeding && !measurement.suppuration) return '';
              const marginY = geometry.cej - geometry.apical * (measurement.mg ?? 0) * MM;
              const cx = index * TOOTH_W + offsets[site];
              return tpl`${measurement.bleeding ? tpl`<circle class="dot-bleed" cx="${cx}" cy="${marginY}" r="3"></circle>` : ''}${
                measurement.suppuration
                  ? tpl`<circle class="dot-supp" cx="${cx}" cy="${marginY - geometry.apical * 8}" r="3"></circle>`
                  : ''
              }`;
            });
          })}
        </svg>
      </div>`;
  }

  function perioHeadRow(dental, row) {
    return tpl`
      <div class="perio-row head">
        <span class="perio-label"></span>
        ${row.map((fdi) => {
          const absent = !isChartable(dental.teeth[fdi]);
          const record = dental.perio[fdi];
          return tpl`<span class="perio-col ${absent ? 'absent' : ''}">
            <button type="button" class="perio-fdi" data-perio-tooth="${fdi}"
              title="Editar mediciones del diente ${fdi}" ${absent ? raw('disabled') : ''}>${fdi}</button>
            <span class="perio-flags">
              <button type="button" class="perio-badge ${record.mobility > 0 ? 'on' : ''}" data-mobility="${fdi}"
                ${absent ? raw('disabled') : ''} title="Movilidad ${MOBILITY_LABELS[record.mobility]} · clic para cambiar">M${MOBILITY_LABELS[record.mobility]}</button>
              <button type="button" class="perio-badge ${record.furcation ? 'on' : ''}" data-furcation="${fdi}"
                ${absent ? raw('disabled') : ''} title="${record.furcation ? `Furca ${FURCATION_LABELS[record.furcation]}` : 'Sin furca'} · clic para cambiar">F${record.furcation ? FURCATION_LABELS[record.furcation] : '–'}</button>
            </span>
          </span>`;
        })}
      </div>`;
  }

  function perioMeasurementRow(dental, row, face, perioRow) {
    const field = perioRow === 'PLP' ? 'plp' : perioRow === 'PB' ? 'pb' : 'mg';
    return tpl`
      <div class="perio-row" data-row="${perioRow}" data-face="${face}"
        ${perioRow === 'PLP' ? raw(`id="perio-${row[0] === UPPER_ROW[0] ? 'upper' : 'lower'}-${face}"`) : ''}
        ${perioRow === 'PLP' ? raw('tabindex="-1"') : ''}>
        <span class="perio-label">
          <abbr title="${PERIO_ROW_HELP[perioRow]}">${perioRow}</abbr>
          <i>${perioFaceLabel(row[0], face).charAt(0)}</i>
        </span>
        ${row.map((fdi) => {
          const absent = !isChartable(dental.teeth[fdi]);
          return tpl`<span class="perio-col ${absent ? 'absent' : ''}">
            ${PERIO_SITES.map((site) => {
              const measurement = dental.perio[fdi][face][site];
              const pocket = measurement.pb ?? 0;
              const severity = perioRow === 'PB' ? (pocket >= 6 ? 'deep' : pocket >= 4 ? 'moderate' : '') : '';
              return tpl`<span class="perio-site ${severity}">
                ${perioRow === 'PB'
                  ? tpl`<span class="site-dots">
                      <button type="button" class="site-dot bleed ${measurement.bleeding ? 'on' : ''}" tabindex="-1"
                        data-flag="bleeding" data-fdi="${fdi}" data-face="${face}" data-site="${site}"
                        aria-pressed="${measurement.bleeding}" ${absent ? raw('disabled') : ''}
                        title="Sangrado al sondaje (tecla S sobre el sitio)"></button>
                      <button type="button" class="site-dot supp ${measurement.suppuration ? 'on' : ''}" tabindex="-1"
                        data-flag="suppuration" data-fdi="${fdi}" data-face="${face}" data-site="${site}"
                        aria-pressed="${measurement.suppuration}" ${absent ? raw('disabled') : ''}
                        title="Supuración (tecla P sobre el sitio)"></button>
                    </span>`
                  : ''}
                <input class="site-input" inputmode="numeric" autocomplete="off" maxlength="3"
                  data-fdi="${fdi}" data-face="${face}" data-site="${site}" data-measure="${perioRow}"
                  value="${measurement[field] ?? 0}" ${absent ? raw('disabled') : ''}
                  aria-label="${perioRow} ${site} ${perioFaceLabel(fdi, face).toLowerCase()} del diente ${fdi}">
              </span>`;
            })}
          </span>`;
        })}
      </div>`;
  }

  function perioBand(dental, row, face) {
    return tpl`<div class="perio-band">${PERIO_ROWS.map((perioRow) => perioMeasurementRow(dental, row, face, perioRow))}</div>`;
  }

  function renderPerioSummary(patient) {
    const summary = perioSummary(patient.dental);
    return tpl`
      <div class="perio-summary" data-perio-summary>
        <div class="metric">
          <div class="label">Sitios con sangrado</div>
          <div class="value ${summary.bleeding >= 20 ? 'tone-warn' : ''}">${summary.bleeding}%</div>
        </div>
        <div class="metric">
          <div class="label">Sitios con PB ≥ 4 mm</div>
          <div class="value ${summary.deep >= 20 ? 'tone-warn' : ''}">${summary.deep}%</div>
        </div>
        <div class="metric">
          <div class="label">NIC promedio</div>
          <div class="value">${summary.meanCal} mm</div>
        </div>
        <div class="metric">
          <div class="label">Sitios evaluables</div>
          <div class="value">${summary.sites}</div>
        </div>
      </div>`;
  }

  /** @param {{withStrips?:boolean}} options */
  function renderPeriodontogram(patient, options = {}) {
    const dental = patient.dental;
    const withStrips = options.withStrips !== false;
    return tpl`
      <div class="perio-board">
        <nav class="perio-jumps" aria-label="Saltos dentro del periodontograma">
          <span class="section-label">Ir a</span>
          <a class="btn small" href="#perio-upper-buccal">Maxilar vestibular</a>
          <a class="btn small" href="#perio-upper-lingual">Maxilar palatino</a>
          <a class="btn small" href="#perio-lower-lingual">Mandíbula lingual</a>
          <a class="btn small" href="#perio-lower-buccal">Mandíbula vestibular</a>
        </nav>
        <p class="sr-only" role="status" aria-live="polite" data-perio-status></p>
        <div class="scroll-x">
          <div class="perio-inner">
            <div class="perio-arch">
              ${withStrips ? perioStrip(dental, UPPER_ROW, 'buccal', UPPER_GEOMETRY) : ''}
              <div class="perio-grid">
                ${perioHeadRow(dental, UPPER_ROW)}
                ${perioBand(dental, UPPER_ROW, 'buccal')}
                ${perioBand(dental, UPPER_ROW, 'lingual')}
              </div>
              ${withStrips ? perioStrip(dental, UPPER_ROW, 'lingual', LOWER_GEOMETRY) : ''}
            </div>
            <div class="perio-arch">
              ${withStrips ? perioStrip(dental, LOWER_ROW, 'lingual', UPPER_GEOMETRY) : ''}
              <div class="perio-grid">
                ${perioHeadRow(dental, LOWER_ROW)}
                ${perioBand(dental, LOWER_ROW, 'lingual')}
                ${perioBand(dental, LOWER_ROW, 'buccal')}
              </div>
              ${withStrips ? perioStrip(dental, LOWER_ROW, 'buccal', LOWER_GEOMETRY) : ''}
            </div>
          </div>
        </div>
        <div class="dental-legend">
          ${PERIO_ROWS.map(
            (perioRow) => tpl`<span class="legend-item"><b class="legend-abbr">${perioRow}</b>${PERIO_ROW_HELP[perioRow]}</span>`
          )}
          <span class="legend-item"><i class="swatch swatch-margin"></i>Margen gingival</span>
          <span class="legend-item"><i class="swatch swatch-pocket"></i>Fondo de bolsa</span>
          <span class="legend-item"><i class="swatch swatch-bleed"></i>Sangrado</span>
          <span class="legend-item"><i class="swatch swatch-supp"></i>Supuración</span>
          <span class="legend-item"><i class="swatch swatch-moderate"></i>PB 4–5 mm</span>
          <span class="legend-item"><i class="swatch swatch-deep"></i>PB ≥ 6 mm</span>
        </div>
      </div>`;
  }

  /** Redibuja resumen y gráficos sin re-render global, para no perder el foco. */
  function patchPerio(root) {
    const patient = Store.getPatient();
    const summary = root.querySelector('[data-perio-summary]');
    if (summary) {
      summary.outerHTML = renderPerioSummary(patient).__raw;
    }
    const definitions = [
      [UPPER_ROW, 'buccal', UPPER_GEOMETRY],
      [UPPER_ROW, 'lingual', LOWER_GEOMETRY],
      [LOWER_ROW, 'lingual', UPPER_GEOMETRY],
      [LOWER_ROW, 'buccal', LOWER_GEOMETRY],
    ];
    qsa(root, '.perio-strip').forEach((element, index) => {
      const definition = definitions[index];
      if (!definition) return;
      element.outerHTML = perioStrip(patient.dental, definition[0], definition[1], definition[2]).__raw;
    });
  }

  /**
   * Editor completo de un diente del periodontograma. Es la alternativa a los
   * inputs de la grilla: sirve en pantalla angosta y permite borrar la
   * medición de golpe.
   */
  async function perioToothDialog(fdi) {
    const record = Store.getPatient().dental.perio[fdi];
    if (!record) return;

    const faceBlock = (face) => tpl`
      <fieldset class="form-fieldset">
        <legend>${perioFaceLabel(fdi, face)}</legend>
        <div class="perio-form">
          <span></span>
          ${PERIO_SITES.map((site) => tpl`<span class="perio-form-head">${site}</span>`)}
          ${PERIO_ROWS.map((row) => {
            const field = row === 'PLP' ? 'plp' : row === 'PB' ? 'pb' : 'mg';
            return tpl`<b class="perio-form-label">${row}</b>
              ${PERIO_SITES.map(
                (site) => tpl`<input class="input input-sm" inputmode="numeric"
                  name="${face}-${site}-${row}" value="${record[face][site][field] ?? 0}"
                  aria-label="${row} ${site} ${perioFaceLabel(fdi, face)}">`
              )}`;
          })}
          <b class="perio-form-label">Sangrado</b>
          ${PERIO_SITES.map(
            (site) => tpl`<label class="perio-form-check"><input type="checkbox" name="${face}-${site}-bleeding"
              ${record[face][site].bleeding ? raw('checked') : ''}><span class="sr-only">Sangrado ${site}</span></label>`
          )}
          <b class="perio-form-label">Supuración</b>
          ${PERIO_SITES.map(
            (site) => tpl`<label class="perio-form-check"><input type="checkbox" name="${face}-${site}-suppuration"
              ${record[face][site].suppuration ? raw('checked') : ''}><span class="sr-only">Supuración ${site}</span></label>`
          )}
        </div>
      </fieldset>`;

    const result = await UI.modal({
      title: `Periodontograma · diente ${fdi}`,
      subtitle: 'PLP y PB de 0 a 15 mm; MG de −5 a 5 mm (negativo = recesión)',
      size: 'lg',
      submitLabel: 'Guardar mediciones',
      footerActions: tpl`<button type="button" class="btn small" data-clear-tooth>Limpiar diente</button>`,
      body: tpl`
        ${faceBlock('buccal')}
        ${faceBlock('lingual')}
        <div class="form-grid">
          <label class="form-field"><span>Movilidad</span>
            <select class="input" name="mobility">
              ${MOBILITY_LABELS.map(
                (label, value) => tpl`<option value="${value}" ${value === record.mobility ? raw('selected') : ''}>${label}</option>`
              )}
            </select></label>
          <label class="form-field"><span>Furca</span>
            <select class="input" name="furcation">
              <option value="">Sin compromiso</option>
              ${[1, 2, 3].map(
                (value) => tpl`<option value="${value}" ${value === record.furcation ? raw('selected') : ''}>${FURCATION_LABELS[value]}</option>`
              )}
            </select></label>
        </div>`,
      onMount: (overlay, close) => {
        overlay.querySelector('[data-clear-tooth]').addEventListener('click', async () => {
          close(null);
          const ok = await UI.confirmDialog({
            title: `Limpiar diente ${fdi}`,
            message: 'Se ponen en cero las seis mediciones y se quitan sangrado y supuración.',
            confirmLabel: 'Limpiar',
          });
          if (ok) {
            Store.clearPerioTooth(fdi);
            UI.toast(`Diente ${fdi} limpiado`, 'warn');
          }
        });
      },
      onSubmit: (form) => {
        const data = new FormData(form);
        const faces = {};
        ['buccal', 'lingual'].forEach((face) => {
          faces[face] = {};
          PERIO_SITES.forEach((site) => {
            faces[face][site] = {
              plp: data.get(`${face}-${site}-PLP`),
              pb: data.get(`${face}-${site}-PB`),
              mg: data.get(`${face}-${site}-MG`),
              bleeding: data.get(`${face}-${site}-bleeding`) !== null,
              suppuration: data.get(`${face}-${site}-suppuration`) !== null,
            };
          });
        });
        return {
          faces,
          mobility: Number(data.get('mobility')),
          furcation: data.get('furcation') === '' ? null : Number(data.get('furcation')),
        };
      },
    });

    if (!result) return;
    Store.savePerioTooth(fdi, result);
    UI.toast(`Diente ${fdi} actualizado`);
  }

  function wirePeriodontogram(root) {
    qsa(root, '.site-input').forEach((input) => {
      input.addEventListener('focus', () => {
        input.select();
        /* Anuncia dónde está quien navega con teclado (recomendación 06). */
        const status = root.querySelector('[data-perio-status]');
        if (status) {
          const { fdi, face, site, measure } = input.dataset;
          status.textContent = `${measure}, ${site}, ${perioFaceLabel(fdi, face).toLowerCase()}, diente ${fdi}`;
        }
      });

      input.addEventListener('change', () => {
        const { fdi, face, site, measure } = input.dataset;
        const value = Store.setPerioMeasurement(fdi, face, site, measure, input.value);
        input.value = String(value ?? 0);
        const cell = input.closest('.perio-site');
        if (cell && measure === 'PB') {
          const pocket = Store.getPatient().dental.perio[fdi][face][site].pb ?? 0;
          cell.classList.toggle('moderate', pocket >= 4 && pocket < 6);
          cell.classList.toggle('deep', pocket >= 6);
        }
        patchPerio(root);
      });

      input.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        const { fdi, face, site } = input.dataset;
        if (key === 's' || key === 'p') {
          event.preventDefault();
          Store.togglePerioFlag(fdi, face, site, key === 's' ? 'bleeding' : 'suppuration', true);
          const dot = root.querySelector(
            `.site-dot.${key === 's' ? 'bleed' : 'supp'}[data-fdi="${fdi}"][data-face="${face}"][data-site="${site}"]`
          );
          if (dot) {
            const on = Store.getPatient().dental.perio[fdi][face][site][key === 's' ? 'bleeding' : 'suppuration'];
            dot.classList.toggle('on', on);
            dot.setAttribute('aria-pressed', String(on));
          }
          patchPerio(root);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const inputs = qsa(root, '.site-input:not([disabled])');
          const next = inputs[inputs.indexOf(input) + 1];
          if (next) next.focus();
        }
      });
    });

    qsa(root, '[data-flag]').forEach((button) =>
      button.addEventListener('click', () => {
        const { fdi, face, site, flag } = button.dataset;
        Store.togglePerioFlag(fdi, face, site, flag);
      })
    );

    qsa(root, '[data-perio-tooth]').forEach((button) =>
      button.addEventListener('click', () => perioToothDialog(button.dataset.perioTooth))
    );

    qsa(root, '[data-mobility]').forEach((button) =>
      button.addEventListener('click', () => {
        const fdi = button.dataset.mobility;
        const next = (Store.getPatient().dental.perio[fdi].mobility + 1) % 4;
        Store.setMobility(fdi, next);
        UI.toast(`Diente ${fdi} · movilidad ${MOBILITY_LABELS[next]}`);
      })
    );

    qsa(root, '[data-furcation]').forEach((button) =>
      button.addEventListener('click', () => {
        const fdi = button.dataset.furcation;
        const current = Store.getPatient().dental.perio[fdi].furcation;
        const next = current === null ? 1 : current === 3 ? null : current + 1;
        Store.setFurcation(fdi, next);
        UI.toast(`Diente ${fdi} · furca ${next ? FURCATION_LABELS[next] : 'sin compromiso'}`);
      })
    );
  }

  /* ------------------------------------------------------------------ *
   * Biopelícula
   * ------------------------------------------------------------------ */

  const BIOFILM_CELL_LABELS = {
    mesial: 'Mesial',
    distal: 'Distal',
    cervical: 'Cervical',
    incisal: 'Incisal',
  };

  function biofilmSlot(dental, fdi, face) {
    const absent = !isChartable(dental.teeth[fdi]);
    const cells = dental.biofilm[fdi][face];
    const faceLabel = face === 'buccal' ? 'vestibular' : 'lingual';
    return tpl`
      <div class="bio-slot ${absent ? 'absent' : ''}">
        <span class="bio-number">${fdi}</span>
        <div class="bio-cross" role="group" aria-label="Diente ${fdi}, ${faceLabel}">
          ${BIOFILM_CELLS.map(
            (cell) => tpl`<button type="button" class="bio-cell cell-${cell} ${cells[cell] ? 'stained' : ''}"
              data-fdi="${fdi}" data-face="${face}" data-cell="${cell}" ${absent ? raw('disabled') : ''}
              aria-pressed="${cells[cell]}"
              title="${BIOFILM_CELL_LABELS[cell]} ${faceLabel} · ${fdi}"
              aria-label="${BIOFILM_CELL_LABELS[cell]} ${faceLabel} del diente ${fdi}"></button>`
          )}
        </div>
      </div>`;
  }

  function biofilmBlock(dental, face, showPrimary) {
    const rows = showPrimary ? ARCH_ROWS : [ARCH_ROWS[0], ARCH_ROWS[3]];
    return tpl`
      <div class="bio-block" data-face="${face}">
        <p class="section-label">${face === 'buccal' ? 'Vestibular' : 'Lingual'}</p>
        <div class="bio-rows">
            ${rows.map(
              (row) => tpl`<div class="bio-row">
                <div class="bio-half">${row.slice(0, row.length / 2).map((fdi) => biofilmSlot(dental, fdi, face))}</div>
                <div class="odo-midline" aria-hidden="true"></div>
                <div class="bio-half">${row.slice(row.length / 2).map((fdi) => biofilmSlot(dental, fdi, face))}</div>
              </div>`
            )}
        </div>
      </div>`;
  }

  function renderBiofilm(patient, options = {}) {
    const summary = biofilmSummary(patient.dental);
    return tpl`
      <div class="bio-board">
        ${biofilmBlock(patient.dental, 'buccal', options.showPrimary)}
        <div class="bio-divider">
          <span>Derecho</span>
          <b>Lingual</b>
          <span>Izquierdo</span>
        </div>
        ${biofilmBlock(patient.dental, 'lingual', options.showPrimary)}
        <div class="bio-footer">
          <p class="plaque-index">Índice de Placa: <b>${summary.index.toFixed(2)}%</b></p>
          <p class="muted xs">${summary.stained} de ${summary.total} superficies de dientes presentes</p>
        </div>
      </div>`;
  }

  function wireBiofilm(root) {
    qsa(root, '.bio-cell').forEach((button) =>
      button.addEventListener('click', () =>
        Store.toggleBiofilmCell(button.dataset.fdi, button.dataset.face, button.dataset.cell)
      )
    );
    const clear = root.querySelector('[data-clear-biofilm]');
    if (clear) {
      clear.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({
          title: 'Limpiar registro de biopelícula',
          message: 'Se despintan todas las superficies marcadas.',
          confirmLabel: 'Limpiar',
        });
        if (ok) {
          Store.clearBiofilm();
          UI.toast('Registro de biopelícula limpiado', 'warn');
        }
      });
    }
  }

  window.ProtoDental = {
    ARCH_ROWS,
    PERMANENT,
    PRIMARY,
    UPPER_ROW,
    LOWER_ROW,
    TOOTH_STATES,
    findingCatalog,
    findingLabel,
    findingColor,
    TOOTH_FINDINGS,
    ORTHO_FINDINGS,
    PERIO_RANGES,
    PERIO_SITES,
    MOBILITY_LABELS,
    FURCATION_LABELS,
    BIOFILM_CELLS,
    archOf,
    sideOf,
    isAnterior,
    isPrimary,
    isChartable,
    surfaceLabel,
    perioFaceLabel,
    crossLayout,
    findings,
    diagnosisText,
    perioSummary,
    biofilmSummary,
    renderOdontogram,
    renderOdontogramLegend,
    renderDiagnosis,
    wireOdontogram,
    renderPeriodontogram,
    renderPerioSummary,
    perioToothDialog,
    findingsCatalogDialog,
    wirePeriodontogram,
    patchPerio,
    renderBiofilm,
    wireBiofilm,
  };
})();
