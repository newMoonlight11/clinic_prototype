/* Opción B · Split workspace
   El paciente queda fijo a la izquierda; a la derecha se recorren las secciones
   reales del expediente (Resumen, Odontograma, Evoluciones, Tratamientos,
   Fórmulas, Documentos, Cuenta) sin perder el contexto. */

(function () {
  const Store = window.ProtoStore;
  const UI = window.ProtoUI;
  const Data = window.ProtoData;
  const Dental = window.ProtoDental;
  const Clinic = window.ProtoClinic;
  const { tpl, raw } = UI;

  const root = document.getElementById('app');

  const SECTION_ICONS = {
    summary: 'user',
    chart: 'tooth',
    perio: 'ruler',
    biofilm: 'droplet',
    evolutions: 'notes',
    treatments: 'clipboard',
    prescriptions: 'pill',
    xrays: 'image',
    documents: 'file',
    appointments: 'calendar',
    account: 'wallet',
  };

  /* Las acciones frecuentes viven arriba, junto al selector de paciente. */
  function contextActions() {
    return tpl`
      <span class="head-actions">
        <button class="btn small" data-action="review">Antecedentes</button>
        <button class="btn small" data-action="prescription">${UI.icon('pill')}<span>Fórmula</span></button>
        <button class="btn small primary" data-action="new-encounter">${UI.icon('plus')}<span>Evolución</span></button>
      </span>`;
  }

  function readHash() {
    const { section, tab } = UI.readView();
    return {
      section: Data.SECTIONS.some((item) => item.key === section) ? section : 'summary',
      treatmentView: Data.TREATMENT_VIEWS.some((item) => item.key === tab) ? tab : 'plans',
    };
  }

  const view = { ...readHash(), filter: '', selectedEncounter: null, sort: 'date-desc', showPrimary: false };

  function writeHash() {
    const params = new URLSearchParams({ view: 'patients', section: view.section });
    if (view.section === 'treatments') params.set('tab', view.treatmentView);
    const next = `#${params}`;
    if (window.location.hash !== next) history.replaceState(null, '', next);
  }

  /* ---------- secciones ---------- */

  function summarySection(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Resumen</h2><p>Datos base de la historia clínica · edición en línea</p></div>
          <button class="btn small" data-action="review">Revisar antecedentes</button>
        </div>
        <div class="card-body"><div class="field-grid" data-fields></div></div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Antecedentes</h2><p>${UI.pendingReviewCount(patient)} pendiente(s) de revisión</p></div></div>
        <div class="card-body">
          ${patient.history.map((section) => {
            const state = Data.REVIEW_STATES[section.review.state];
            return tpl`<div class="history-block">
              <div class="history-block-head">
                <b>${section.label}</b>
                <span class="badge ${state.tone === 'ok' ? '' : 'warn'}">${state.label}</span>
              </div>
              ${section.items.length === 0
                ? tpl`<p class="muted xs">Ninguno referido</p>`
                : tpl`<ul class="plain-list">${section.items.map(
                    (item) => tpl`<li>${item.critical ? tpl`<span class="crit">${UI.icon('alert')}</span>` : ''}<b>${item.value}</b>
                      <span class="muted xs">${Data.HISTORY_SOURCES[item.source]}${item.context ? ` · ${item.context}` : ''}</span></li>`
                  )}</ul>`}
            </div>`;
          })}
        </div>
      </section>`;
  }

  function chartSection(patient) {
    const findings = Dental.findings(patient.dental);
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Odontograma</h2><p>Toque una cara para el hallazgo; el número abre el detalle del diente</p></div>
          <span class="badge ${findings.length ? 'warn' : ''}">${findings.length} hallazgo(s)</span>
        </div>
        <div class="card-body">
          ${Dental.renderOdontogram(patient, { showPrimary: view.showPrimary })}
          ${Dental.renderOdontogramLegend()}
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Diagnóstico Odontograma</h2></div>
        <div class="card-body">${Dental.renderDiagnosis(patient)}</div>
      </section>`;
  }

  function perioSection(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Periodontograma</h2><p>Tab avanza sitio a sitio y salta los ausentes · S sangrado, P supuración</p></div>
        </div>
        ${Dental.renderPerioSummary(patient)}
        <div class="card-body">${Dental.renderPeriodontogram(patient)}</div>
      </section>`;
  }

  function biofilmSection(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Biopelícula</h2><p>Toque cada celda para marcar placa</p></div>
          <button class="btn small" data-clear-biofilm>Limpiar registro</button>
        </div>
        <div class="card-body">${Dental.renderBiofilm(patient, { showPrimary: view.showPrimary })}</div>
      </section>`;
  }

  function evolutionsSection(patient) {
    const query = view.filter.trim().toLowerCase();
    const rows = [...patient.encounters]
      .sort((a, b) => (view.sort === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
      .filter((encounter) =>
        !query ||
        [encounter.title, encounter.plan, encounter.chiefComplaint, encounter.impression, encounter.provider]
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    const selected = patient.encounters.find((e) => e.id === view.selectedEncounter) ?? rows[0] ?? null;

    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Evoluciones</h2><p>${rows.length} de ${patient.encounters.length} registro(s)</p></div>
          <div class="card-tools">
            <label class="search">
              <span class="sr-only">Filtrar evoluciones</span>
              <input class="input input-sm" placeholder="Filtrar por texto…" value="${view.filter}" data-filter>
            </label>
            <button class="btn small" data-sort title="Cambiar el orden">
              ${UI.icon('chart')}<span>${view.sort === 'date-desc' ? 'Más recientes' : 'Más antiguas'}</span>
            </button>
            <button class="btn small primary" data-action="new-encounter">${UI.icon('plus')}<span>Nueva</span></button>
          </div>
        </div>
        <div class="card-body">
          ${rows.length === 0
            ? tpl`<p class="muted">Ninguna evolución coincide con "${view.filter}".</p>`
            : tpl`<div class="scroll-x"><table class="table selectable">
                <thead><tr><th style="width:130px">Fecha</th><th>Título</th><th style="width:110px">Tipo</th><th style="width:110px">Estado</th><th style="width:90px"></th></tr></thead>
                <tbody>${rows.map(
                  (encounter) => tpl`<tr class="${selected && selected.id === encounter.id ? 'selected' : ''}" data-select="${encounter.id}" tabindex="0">
                    <td class="muted">${UI.fmtShort(encounter.date)}<br><small>${UI.fmtTime(encounter.date)}</small></td>
                    <td><b>${encounter.title}</b><div class="muted xs">${encounter.provider}</div></td>
                    <td><span class="badge blue">${Data.ENCOUNTER_KINDS[encounter.kind]}</span></td>
                    <td>${encounter.signed
                      ? tpl`<span class="badge">Firmada v${encounter.versions}</span>`
                      : raw('<span class="badge warn">Sin firmar</span>')}</td>
                    <td>
                      <button class="icon-btn" data-edit-encounter="${encounter.id}" aria-label="Editar ${encounter.title}">${UI.icon('pencil')}</button>
                      <button class="icon-btn" data-delete="${encounter.id}" aria-label="Eliminar ${encounter.title}">${UI.icon('trash')}</button>
                    </td>
                  </tr>`
                )}</tbody>
              </table></div>`}
        </div>
      </section>
      ${selected ? encounterDetail(selected) : ''}`;
  }

  function encounterDetail(encounter) {
    const vitals = Object.entries({
      'Presión arterial': encounter.vitals.bloodPressure,
      'Frecuencia cardíaca': encounter.vitals.heartRate && `${encounter.vitals.heartRate} lpm`,
      'Temperatura': encounter.vitals.temperatureC && `${encounter.vitals.temperatureC} °C`,
      'Peso': encounter.vitals.weightKg && `${encounter.vitals.weightKg} kg`,
    }).filter(([, value]) => value);

    return tpl`
      <section class="card">
        <div class="card-head">
          <div>
            <h2>${encounter.title}</h2>
            <ul class="meta-list">
              <li>${UI.fmtDate(encounter.date)}</li>
              <li>${UI.fmtTime(encounter.date)}</li>
              <li>${encounter.provider}</li>
              <li>Versión ${encounter.versions}</li>
            </ul>
          </div>
          <div class="head-actions">
            ${encounter.signed ? '' : tpl`<button class="btn small" data-sign="${encounter.id}">Firmar</button>`}
            <button class="btn small" data-edit-encounter="${encounter.id}">Editar</button>
          </div>
        </div>
        <div class="card-body">
          ${[
            ['Motivo de consulta', encounter.chiefComplaint],
            ['Enfermedad actual', encounter.currentIllness],
            ['Examen físico', encounter.physicalExam],
            ['Impresión clínica', encounter.impression],
            ['Plan / nota de evolución', encounter.plan],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => tpl`<div class="detail-row"><span>${label}</span><p>${value}</p></div>`)}
          ${encounter.diagnoses.length
            ? tpl`<div class="detail-row"><span>Diagnósticos</span><p>${encounter.diagnoses.join(' · ')}</p></div>`
            : ''}
          ${vitals.length
            ? tpl`<div class="detail-row"><span>Signos vitales</span><p>${vitals.map(([k, v]) => `${k}: ${v}`).join(' · ')}</p></div>`
            : ''}
          ${encounter.procedures.length
            ? tpl`<div class="detail-row"><span>Procedimientos realizados</span><p>${encounter.procedures.map((p) => `${p.name} (${p.tooth})`).join(' · ')}</p></div>`
            : ''}
        </div>
      </section>`;
  }

  function treatmentsSection(patient) {
    const tabs = tpl`
      <div class="tabs" role="tablist">
        ${Data.TREATMENT_VIEWS.map(
          (v) => tpl`<button class="tab ${view.treatmentView === v.key ? 'active' : ''}" role="tab"
            aria-selected="${view.treatmentView === v.key}" data-tab="${v.key}">${v.label}</button>`
        )}
      </div>`;

    let body;
    if (view.treatmentView === 'plans') {
      if (patient.plans.length === 0) {
        body = tpl`<p class="empty-state">Sin planes registrados.
          <button class="btn small primary" data-plan-new="${patient.id}">${UI.icon('plus')}<span>Crear el primero</span></button></p>`;
      } else
      body = patient.plans.map((plan) => {
        const progress = UI.planProgress(plan);
        const balance = UI.planBalance(plan);
        return tpl`<div class="plan-block">
          <div class="plan-head">
            <div><b>${plan.title}</b><div class="muted xs">Creado ${UI.fmtDate(plan.createdAt)} · ${plan.status}</div></div>
            <span class="head-actions">
              <span class="badge blue">${progress.pct}%</span>
              <button class="icon-btn" data-plan-item-new="${plan.id}" data-plan-patient="${patient.id}" aria-label="Agregar procedimiento" title="Agregar procedimiento">${UI.icon('plus')}</button>
              <button class="icon-btn" data-plan-edit="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar ${plan.title}">${UI.icon('pencil')}</button>
              <button class="icon-btn" data-plan-delete="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar ${plan.title}">${UI.icon('trash')}</button>
            </span>
          </div>
          <div class="progress"><i style="width:${progress.pct}%"></i></div>
          <div class="scroll-x"><table class="table">
            <thead><tr><th style="width:44px"></th><th>Procedimiento</th><th style="width:70px">Diente</th><th style="width:120px">Valor</th><th style="width:110px">Fecha</th><th style="width:74px"></th></tr></thead>
            <tbody>${plan.items.map(
              (item) => tpl`<tr>
                <td><input type="checkbox" data-plan="${plan.id}" data-plan-item="${item.id}" ${item.done ? raw('checked') : ''} aria-label="Marcar ${item.name}"></td>
                <td class="${item.done ? 'done' : ''}">${item.name}</td>
                <td class="muted">${item.tooth}</td>
                <td>${UI.fmtMoney(item.price)}</td>
                <td class="muted">${item.done ? UI.fmtDate(item.date) : 'Pendiente'}</td>
                <td><span class="row-actions">
                  <button class="icon-btn" data-plan-item-edit="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar ${item.name}">${UI.icon('pencil')}</button>
                  <button class="icon-btn" data-plan-item-delete="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar ${item.name}">${UI.icon('trash')}</button>
                </span></td>
              </tr>`
            )}</tbody>
            <tfoot><tr><td></td><td colspan="2"><b>Pendiente por ejecutar</b></td><td colspan="3"><b>${UI.fmtMoney(balance.pending)}</b></td></tr></tfoot>
          </table></div>
        </div>`;
      });
    } else if (view.treatmentView === 'estimates') {
      body = tpl`<div class="scroll-x"><table class="table">
        <thead><tr><th>Código</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>${patient.estimates.map(
          (estimate) => tpl`<tr>
            <td><b>${estimate.code}</b></td>
            <td class="muted">${UI.fmtDate(estimate.date)}</td>
            <td>${UI.fmtMoney(estimate.total)}</td>
            <td><span class="badge ${estimate.status === 'Aceptado' ? '' : 'warn'}">${estimate.status}</span></td>
          </tr>`
        )}</tbody>
      </table></div>`;
    } else {
      const performed = patient.plans.flatMap((plan) =>
        plan.items.filter((item) => item.done).map((item) => ({ ...item, plan: plan.title }))
      );
      body = performed.length === 0
        ? tpl`<p class="muted">Aún no hay procedimientos realizados.</p>`
        : tpl`<div class="scroll-x"><table class="table">
            <thead><tr><th>Fecha</th><th>Procedimiento</th><th>Diente</th><th>Plan</th><th>Valor</th></tr></thead>
            <tbody>${performed
              .sort((a, b) => String(b.date).localeCompare(String(a.date)))
              .map(
                (item) => tpl`<tr>
                  <td class="muted">${UI.fmtDate(item.date)}</td>
                  <td><b>${item.name}</b></td>
                  <td class="muted">${item.tooth}</td>
                  <td class="muted">${item.plan}</td>
                  <td>${UI.fmtMoney(item.price)}</td>
                </tr>`
              )}</tbody>
          </table></div>`;
    }

    return tpl`<section class="card">
      <div class="card-head">
        <div><h2>Plan del paciente</h2><p>Planes clínicos, presupuestos y procedimientos realizados</p></div>
        ${view.treatmentView === 'plans'
          ? tpl`<div class="card-tools"><button class="btn small primary" data-plan-new="${patient.id}">${UI.icon('plus')}<span>Nuevo plan</span></button></div>`
          : ''}
      </div>
      ${tabs}
      <div class="card-body">${body}</div>
    </section>`;
  }

  function prescriptionsSection(patient) {
    return tpl`<section class="card">
      <div class="card-head">
        <div><h2>Fórmulas</h2><p>${patient.prescriptions.length} fórmula(s) médica(s)</p></div>
        <button class="btn small primary" data-action="prescription">${UI.icon('plus')}<span>Nueva</span></button>
      </div>
      <div class="card-body">
        ${patient.prescriptions.length === 0
          ? tpl`<p class="empty-state">Este paciente no tiene fórmulas médicas.
              <button class="btn small primary" data-action="prescription">${UI.icon('plus')}<span>Crear la primera</span></button></p>`
          : tpl`<div class="scroll-x"><table class="table">
              <thead><tr><th style="width:104px">Fecha</th><th>Medicamento</th><th>Indicación</th><th style="width:120px">Profesional</th><th style="width:74px"></th></tr></thead>
              <tbody>${patient.prescriptions.map(
                (fx) => tpl`<tr>
                  <td class="muted">${UI.fmtDate(fx.date)}</td>
                  <td><b>${fx.title}</b></td>
                  <td class="muted">${fx.detail}</td>
                  <td class="muted">${fx.provider}</td>
                  <td><span class="row-actions">
                    <button class="icon-btn" data-prescription-edit="${fx.id}" aria-label="Editar ${fx.title}">${UI.icon('pencil')}</button>
                    <button class="icon-btn" data-prescription-delete="${fx.id}" aria-label="Eliminar ${fx.title}">${UI.icon('trash')}</button>
                  </span></td>
                </tr>`
              )}</tbody>
            </table></div>`}
      </div>
    </section>`;
  }

  function xraysSection(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Radiografías</h2><p>${patient.xrays.length} imagen(es) · se tratan como fotos, aparte de Documentos</p></div>
          <div class="card-tools">${Clinic.xraysTools()}</div>
        </div>
        <div class="card-body">${Clinic.renderXrays(patient)}</div>
      </section>`;
  }

  function appointmentsSection(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Citas</h2><p>Historial y próximas citas de este paciente</p></div>
          <a class="btn small" href="#view=agenda">Abrir agenda</a>
        </div>
        <div class="card-body">${Clinic.renderPatientAppointments(patient)}</div>
      </section>`;
  }

  function documentsSection(patient) {
    return tpl`<section class="card">
      <div class="card-head">
        <div><h2>Documentos</h2><p>${patient.documents.length} archivo(s) · las imágenes van en Radiografías</p></div>
        <div class="card-tools">${Clinic.documentsTools()}</div>
      </div>
      <div class="card-body">${Clinic.renderDocuments(patient)}</div>
    </section>`;
  }

  async function prescriptionEditDialog(existing) {
    const result = await UI.modal({
      title: 'Editar fórmula',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Medicamento</span>
          <input class="input" name="title" value="${existing.title}"></label>
        <label class="form-field"><span>Indicación</span>
          <textarea class="input" rows="3" name="detail">${existing.detail}</textarea></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw UI.invalid('Indica el medicamento.', 'title');
        if (!values.detail.trim()) throw UI.invalid('Indica la dosis y duración.', 'detail');
        return { title: values.title.trim(), detail: values.detail.trim() };
      },
    });
    if (!result) return;
    Store.updateRecord('prescriptions', existing.id, result);
    UI.toast('Fórmula actualizada');
  }

  function accountSection(patient) {
    const balance = UI.accountBalance(patient);
    return tpl`<section class="card">
      <div class="card-head">
        <div><h2>Cuenta del paciente</h2><p>Movimientos de facturación de esta historia</p></div>
        <div class="card-tools">
          <span class="badge ${balance > 0 ? 'warn' : ''}">Saldo ${UI.fmtMoney(balance)}</span>
          ${Clinic.billingTools()}
        </div>
      </div>
      <div class="card-body">${Clinic.renderBilling(patient)}</div>
    </section>`;
  }

  const SECTION_RENDERERS = {
    summary: summarySection,
    chart: chartSection,
    perio: perioSection,
    biofilm: biofilmSection,
    evolutions: evolutionsSection,
    treatments: treatmentsSection,
    prescriptions: prescriptionsSection,
    xrays: xraysSection,
    documents: documentsSection,
    appointments: appointmentsSection,
    account: accountSection,
  };

  /* ---------- render ---------- */

  function sectionCount(patient, key) {
    if (key === 'evolutions') return patient.encounters.length;
    if (key === 'treatments') return patient.plans.length;
    if (key === 'prescriptions') return patient.prescriptions.length;
    if (key === 'documents') return patient.documents.length;
    if (key === 'xrays') return patient.xrays.length;
    if (key === 'appointments') return Clinic.patientAppointments(patient).length;
    if (key === 'chart') return Dental.findings(patient.dental).length;
    if (key === 'perio') return null;
    if (key === 'biofilm') return null;
    if (key === 'summary') return UI.pendingReviewCount(patient) || null;
    return null;
  }

  function renderClinicView(nav, patient) {
    root.innerHTML = tpl`
      <div class="app">
        ${UI.sidebar(nav)}
        <div class="main">
          ${UI.topbar(patient, { view: nav })}
          <div class="page">${Clinic.renderView(nav)}</div>
        </div>
      </div>`.__raw;
    UI.wireChrome(root);
    Clinic.wireAll(root);
  }

  function render() {
    const patient = Store.getPatient();
    const focused = UI.rememberFocus(root);
    const nav = UI.readView().view;
    if (nav !== 'patients') {
      renderClinicView(nav, patient);
      return;
    }
    const criticals = patient.history.flatMap((section) =>
      section.items.filter((item) => item.critical).map((item) => ({ section: section.label, ...item }))
    );

    root.innerHTML = tpl`
      <div class="app">
        ${UI.sidebar('patients')}
        <div class="main">
          ${UI.topbar(patient, { actions: contextActions() })}
          <div class="page">
            <div class="split-layout">
              <nav class="section-nav card" aria-label="Secciones del expediente">
                <div class="section-strip">
                  ${Data.SECTIONS.map((section) => {
                    const count = sectionCount(patient, section.key);
                    return tpl`<button class="rail-nav ${view.section === section.key ? 'active' : ''}"
                      data-section="${section.key}" ${view.section === section.key ? raw('aria-current="true"') : ''}>
                      <span class="rail-nav-label">${UI.icon(SECTION_ICONS[section.key])}<span>${section.label}</span></span>
                      ${count ? tpl`<span class="badge">${count}</span>` : ''}
                    </button>`;
                  })}
                </div>
              </nav>
              <aside class="patient-rail card">
                <div class="rail-section">
                  <div class="patient-id">
                    ${Clinic.renderPatientPhoto(patient, { size: 'sm' })}
                    <div><h1 class="rail-patient-name">${patient.shortName}</h1><div class="subline">${patient.chartNumber}</div></div>
                  </div>
                  <span class="badge blue rail-badge">${patient.status}</span>
                </div>
                <div class="rail-section">
                  <h2 class="rail-title">Datos rápidos</h2>
                  <div data-quick></div>
                </div>
                <div class="rail-section">
                  <h2 class="rail-title">Seguridad clínica</h2>
                  ${criticals.length === 0
                    ? tpl`<p class="muted xs">Sin antecedentes críticos registrados.</p>`
                    : criticals.map(
                        (item) => tpl`<div class="alert tone-danger">
                          <div><b>${UI.icon('alert')} ${item.value}</b><div class="muted">${item.section}${item.context ? ` · ${item.context}` : ''}</div></div>
                        </div>`
                      )}
                  <button class="btn small full" data-action="review">Revisar antecedentes (${UI.pendingReviewCount(patient)})</button>
                </div>
                <div class="rail-section">
                  <h2 class="rail-title">Firma</h2>
                  ${Clinic.renderSignature(patient)}
                </div>
              </aside>

              <main class="workspace">
                <div class="workspace-head">
                  <div>
                    <h2>${Data.SECTIONS.find((s) => s.key === view.section).label}</h2>
                    <div class="subline">El panel del paciente permanece visible mientras editas</div>
                  </div>
                </div>
                <div class="workspace-content">${SECTION_RENDERERS[view.section](patient)}</div>
              </main>
            </div>
          </div>
        </div>
      </div>`.__raw;

    mountQuickFields(patient);
    if (view.section === 'summary') mountSummaryFields(patient);
    wire(patient);
    writeHash();
    UI.restoreFocus(root, focused);
  }

  function mountQuickFields(patient) {
    const host = root.querySelector('[data-quick]');
    [
      { label: 'Edad', path: 'birthDate', value: patient.birthDate, type: 'date', format: UI.age },
      { label: 'Teléfono', path: 'phone', value: patient.phone },
      { label: 'Aseguradora', path: 'payer', value: patient.payer, options: Data.PAYERS },
      { label: 'Profesional', path: 'provider', value: patient.provider, options: Store.getDoctors().map((d) => d.name) },
    ].forEach((field) => host.appendChild(UI.inlineField(field)));

    const last = UI.lastEncounter(patient);
    host.appendChild(
      UI.node(tpl`<div class="rail-detail"><span>Última visita</span><b>${last ? UI.fmtDate(last.date) : '—'}</b></div>`)
    );
    host.appendChild(
      UI.node(tpl`<div class="rail-detail"><span>Próxima cita</span><b>${UI.fmtShort(patient.nextAppointment.date)}</b></div>`)
    );
  }

  function mountSummaryFields(patient) {
    const host = root.querySelector('[data-fields]');
    if (!host) return;
    [
      { label: 'Nombre completo', path: 'name', value: patient.name },
      { label: 'Tipo de documento', path: 'documentType', value: patient.documentType, options: Data.DOCUMENT_TYPES },
      { label: 'Número de documento', path: 'documentNumber', value: patient.documentNumber },
      { label: 'Número de historia', path: 'chartNumber', value: patient.chartNumber, readOnly: true },
      { label: 'Fecha de nacimiento', path: 'birthDate', value: patient.birthDate, type: 'date', format: UI.fmtDate },
      { label: 'Correo electrónico', path: 'email', value: patient.email, type: 'email',
        validate: (v) => (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Correo inválido' : null) },
      { label: 'Teléfono', path: 'phone', value: patient.phone,
        validate: (v) => (v.replace(/\D/g, '').length < 7 ? 'Teléfono demasiado corto' : null) },
      { label: 'Dirección', path: 'address', value: patient.address },
      { label: 'Aseguradora', path: 'payer', value: patient.payer, options: Data.PAYERS },
      { label: 'Acudiente', path: 'guardian.name', value: patient.guardian.name },
      { label: 'Parentesco', path: 'guardian.relationship', value: patient.guardian.relationship },
      { label: 'Teléfono del acudiente', path: 'guardian.phone', value: patient.guardian.phone },
    ].forEach((field) => host.appendChild(UI.inlineField(field)));
  }

  function wire(patient) {
    UI.wireChrome(root);
    Dental.wireOdontogram(root);
    Dental.wirePeriodontogram(root);
    Dental.wireBiofilm(root);
    Clinic.wireAll(root);

    const primaryToggle = root.querySelector('[data-show-primary]');
    if (primaryToggle) {
      primaryToggle.addEventListener('change', () => {
        view.showPrimary = primaryToggle.checked;
        render();
      });
    }

    root.querySelectorAll('[data-section]').forEach((button) =>
      button.addEventListener('click', () => {
        view.section = button.dataset.section;
        view.selectedEncounter = null;
        render();
        /* Cada sección arranca desde arriba, no a media página. */
        window.scrollTo({ top: 0, behavior: 'auto' });
      })
    );

    root.querySelectorAll('[data-tab]').forEach((button) =>
      button.addEventListener('click', () => {
        view.treatmentView = button.dataset.tab;
        render();
      })
    );

    root.querySelectorAll('[data-action]').forEach((button) =>
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'new-encounter') UI.encounterDialog(null).then((saved) => {
          if (saved) {
            view.section = 'evolutions';
            view.selectedEncounter = saved.id;
            render();
          }
        });
        if (action === 'review') UI.historyReviewDialog();
        if (action === 'prescription') UI.prescriptionDialog();
      })
    );

    const filter = root.querySelector('[data-filter]');
    if (filter) {
      filter.addEventListener('input', () => {
        view.filter = filter.value;
        render();
        const next = root.querySelector('[data-filter]');
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      });
    }

    const sort = root.querySelector('[data-sort]');
    if (sort) {
      sort.addEventListener('click', () => {
        view.sort = view.sort === 'date-desc' ? 'date-asc' : 'date-desc';
        render();
      });
    }

    root.querySelectorAll('[data-select]').forEach((row) => {
      const select = () => {
        view.selectedEncounter = row.dataset.select;
        render();
      };
      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        select();
      });
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });

    root.querySelectorAll('[data-edit-encounter]').forEach((button) =>
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        UI.encounterDialog(patient.encounters.find((e) => e.id === button.dataset.editEncounter));
      })
    );

    root.querySelectorAll('[data-sign]').forEach((button) =>
      button.addEventListener('click', () => {
        Store.signEncounter(button.dataset.sign);
        UI.toast('Evolución firmada');
      })
    );

    root.querySelectorAll('[data-delete]').forEach((button) =>
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const encounter = patient.encounters.find((e) => e.id === button.dataset.delete);
        UI.deleteWithUndo({
          what: `Evolución «${encounter.title}»`,
          perform: () => {
            if (view.selectedEncounter === encounter.id) view.selectedEncounter = null;
            Store.deleteEncounter(encounter.id);
          },
        });
      })
    );

    root.querySelectorAll('[data-plan-item]').forEach((input) =>
      input.addEventListener('change', () => {
        Store.togglePlanItem(input.dataset.plan, input.dataset.planItem);
        UI.toast(input.checked ? 'Procedimiento marcado como realizado' : 'Procedimiento devuelto a pendiente');
      })
    );

    root.querySelectorAll('[data-prescription-edit]').forEach((button) =>
      button.addEventListener('click', () =>
        prescriptionEditDialog(patient.prescriptions.find((fx) => fx.id === button.dataset.prescriptionEdit))
      )
    );

    root.querySelectorAll('[data-prescription-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const fx = patient.prescriptions.find((item) => item.id === button.dataset.prescriptionDelete);
        UI.deleteWithUndo({
          what: `Fórmula «${fx.title}»`,
          perform: () => Store.deleteRecord('prescriptions', fx.id),
        });
      })
    );

  }

  window.addEventListener('hashchange', () => {
    Object.assign(view, readHash());
    render();
  });

  Store.subscribe(render);
})();
