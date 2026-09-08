/* Opción A · Command center
   Una sola pantalla: contexto, alertas y edición sin cambiar de pestaña. */

(function () {
  const Store = window.ProtoStore;
  const UI = window.ProtoUI;
  const Data = window.ProtoData;
  const Dental = window.ProtoDental;
  const Clinic = window.ProtoClinic;
  const { tpl, raw, node } = UI;

  const root = document.getElementById('app');
  const view = { expanded: new Set(['e-3']), dentalTab: 'odontogram', showPrimary: false };

  const DENTAL_TABS = [
    { key: 'odontogram', label: 'Odontograma' },
    { key: 'perio', label: 'Periodontograma' },
    { key: 'biofilm', label: 'Biopelícula' },
  ];

  /* La carta dental vive en la misma pantalla: se cambia de módulo con un
     control segmentado, sin salir del command center. */
  function dentalCard(patient) {
    const findings = Dental.findings(patient.dental);
    const perio = Dental.perioSummary(patient.dental);
    const biofilm = Dental.biofilmSummary(patient.dental);
    return tpl`
      <section class="card wide">
        <div class="card-head">
          <div>
            <h2>Carta dental</h2>
            <p>${findings.length} hallazgo(s) · sangrado ${perio.bleeding}% · placa ${biofilm.index.toFixed(2)}%</p>
          </div>
          <div class="segmented" role="tablist" aria-label="Módulo dental">
            ${DENTAL_TABS.map(
              (tab) => tpl`<button class="segment ${view.dentalTab === tab.key ? 'active' : ''}" role="tab"
                aria-selected="${view.dentalTab === tab.key}" data-dental-tab="${tab.key}">${tab.label}</button>`
            )}
          </div>
        </div>
        <div class="card-body">
          ${view.dentalTab === 'odontogram'
            ? tpl`${Dental.renderOdontogram(patient, { showPrimary: view.showPrimary })}
                ${Dental.renderOdontogramLegend()}
                ${Dental.renderDiagnosis(patient)}`
            : ''}
          ${view.dentalTab === 'perio'
            ? tpl`${Dental.renderPerioSummary(patient)}${Dental.renderPeriodontogram(patient)}`
            : ''}
          ${view.dentalTab === 'biofilm'
            ? tpl`<div class="head-actions end"><button class="btn small" data-clear-biofilm>Limpiar registro</button></div>
                ${Dental.renderBiofilm(patient)}`
            : ''}
        </div>
      </section>`;
  }

  /* Estas acciones viven arriba, junto al selector de paciente. */
  function contextActions() {
    return tpl`
      <span class="head-actions">
        <button class="btn small" data-action="review">Antecedentes</button>
        <button class="btn small" data-action="prescription">${UI.icon('pill')}<span>Fórmula</span></button>
        <button class="btn small primary" data-action="new-encounter">${UI.icon('plus')}<span>Evolución</span></button>
      </span>`;
  }

  function metric(label, value, hint, tone) {
    return tpl`<div class="metric">
      <div class="label">${label}</div>
      <div class="value ${tone ? `tone-${tone}` : ''}">${value}</div>
      ${hint ? tpl`<div class="hint">${hint}</div>` : ''}
    </div>`;
  }

  function historyCard(patient) {
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Antecedentes</h2><p>${UI.pendingReviewCount(patient)} sección(es) pendientes de revisión</p></div>
          <button class="btn small" data-action="review">Revisar antecedentes</button>
        </div>
        <div class="card-body">
          <div class="scroll-x">
          <table class="table">
            <thead><tr><th>Sección</th><th>Información</th><th style="width:150px">Revisión</th></tr></thead>
            <tbody>
              ${patient.history.map((section) => {
                const state = Data.REVIEW_STATES[section.review.state];
                return tpl`<tr>
                  <td><b>${section.label}</b></td>
                  <td>${section.items.length === 0
                    ? tpl`<span class="muted">Ninguno referido</span>`
                    : section.items.map(
                        (item) => tpl`<div class="history-item">
                          ${item.critical ? tpl`<span class="crit" aria-label="Crítico">${UI.icon('alert')}</span>` : ''}
                          <b>${item.value}</b>
                          <span class="muted">${Data.HISTORY_SOURCES[item.source]}${item.context ? ` · ${item.context}` : ''}</span>
                        </div>`
                      )}</td>
                  <td><span class="badge ${state.tone === 'ok' ? '' : 'warn'}">${state.label}</span>
                    ${section.review.at ? tpl`<div class="muted xs">${UI.fmtDate(section.review.at)}</div>` : ''}</td>
                </tr>`;
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>`;
  }

  function encounterCard(patient) {
    const encounters = [...patient.encounters].sort((a, b) => b.date.localeCompare(a.date));
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Evoluciones</h2><p>${encounters.length} registro(s) · la nota completa se abre aquí mismo</p></div>
          <button class="btn small primary" data-action="new-encounter">Nueva evolución</button>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${encounters.map((encounter) => {
              const open = view.expanded.has(encounter.id);
              return tpl`
              <article class="event ${open ? 'open' : ''}" data-encounter="${encounter.id}">
                <div class="event-head">
                  <div>
                    <time>${UI.fmtDateTime(encounter.date)} · ${encounter.provider}</time>
                    <h3 class="event-title">${encounter.title}
                      <span class="badge blue">${Data.ENCOUNTER_KINDS[encounter.kind]}</span>
                      ${encounter.signed
                        ? tpl`<span class="badge">Firmada · v${encounter.versions}</span>`
                        : raw('<span class="badge warn">Sin firmar</span>')}
                    </h3>
                  </div>
                  <div class="event-actions">
                    <button class="btn small" data-toggle="${encounter.id}" aria-expanded="${open}">${open ? 'Ocultar' : 'Ver nota'}</button>
                    <button class="btn small" data-edit-encounter="${encounter.id}">Editar</button>
                    ${encounter.signed ? '' : tpl`<button class="btn small" data-sign="${encounter.id}">Firmar</button>`}
                    <button class="icon-btn" data-delete="${encounter.id}" aria-label="Eliminar evolución">${UI.icon('trash')}</button>
                  </div>
                </div>
                ${open
                  ? tpl`<div class="event-detail">
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
                      ${Object.keys(encounter.vitals).length
                        ? tpl`<div class="detail-row"><span>Signos vitales</span><p>${[
                            encounter.vitals.bloodPressure && `PA ${encounter.vitals.bloodPressure}`,
                            encounter.vitals.heartRate && `FC ${encounter.vitals.heartRate} lpm`,
                            encounter.vitals.temperatureC && `T ${encounter.vitals.temperatureC} °C`,
                            encounter.vitals.weightKg && `Peso ${encounter.vitals.weightKg} kg`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}</p></div>`
                        : ''}
                    </div>`
                  : tpl`<p class="event-preview muted">${encounter.plan}</p>`}
              </article>`;
            })}
          </div>
        </div>
      </section>`;
  }

  function planSection(patient) {
    const plan = UI.activePlan(patient);
    if (!plan) {
      return tpl`<div class="rail-section">
        <div class="rail-head"><h3>Plan de tratamiento</h3></div>
        <p class="empty-state">
          Sin planes registrados.
          <button class="btn small primary" data-plan-new="${patient.id}">${UI.icon('plus')}<span>Crear plan</span></button>
        </p>
      </div>`;
    }
    const progress = UI.planProgress(plan);
    const balance = UI.planBalance(plan);
    return tpl`
      <div class="rail-section">
        <div class="rail-head">
          <h3>Plan de tratamiento</h3>
          <span class="row-actions">
            <span class="badge blue">${progress.pct}%</span>
            <button class="icon-btn" data-plan-item-new="${plan.id}" data-plan-patient="${patient.id}" aria-label="Agregar procedimiento" title="Agregar procedimiento">${UI.icon('plus')}</button>
            <button class="icon-btn" data-plan-edit="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar plan" title="Editar plan">${UI.icon('pencil')}</button>
            <button class="icon-btn" data-plan-delete="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar plan" title="Eliminar plan">${UI.icon('trash')}</button>
          </span>
        </div>
        <p class="muted xs">${plan.title}</p>
        <div>
          <div class="progress"><i style="width:${progress.pct}%"></i></div>
          <p class="muted xs">${progress.done} de ${progress.total} procedimientos · pendiente ${UI.fmtMoney(balance.pending)}</p>
          <ul class="check-list">
            ${plan.items.map(
              (item) => tpl`<li>
                <label>
                  <input type="checkbox" data-plan-item="${item.id}" data-plan="${plan.id}" ${item.done ? raw('checked') : ''}>
                  <span class="${item.done ? 'done' : ''}">${item.name}${item.tooth !== '—' ? ` · ${item.tooth}` : ''}</span>
                </label>
                <span class="head-actions">
                  <span class="muted xs">${item.done ? UI.fmtShort(item.date) : UI.fmtMoney(item.price)}</span>
                  <button class="icon-btn" data-plan-item-edit="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar ${item.name}">${UI.icon('pencil')}</button>
                  <button class="icon-btn" data-plan-item-delete="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar ${item.name}">${UI.icon('trash')}</button>
                </span>
              </li>`
            )}
          </ul>
        </div>
      </div>`;
  }

  function render() {
    const patient = Store.getPatient();
    const nav = UI.readView().view;
    if (nav !== 'patients') {
      renderClinicView(nav, patient);
      return;
    }
    const scroll = root.querySelector('.page')?.scrollTop ?? 0;
    const focused = UI.rememberFocus(root);
    const plan = UI.activePlan(patient);
    const progress = UI.planProgress(plan);
    const last = UI.lastEncounter(patient);
    const balance = UI.accountBalance(patient);
    const alertCount = UI.alerts(patient).length;
    const perioSummary = Dental.perioSummary(patient.dental);
    const biofilmSummary = Dental.biofilmSummary(patient.dental);

    root.innerHTML = tpl`
      <div class="app">
        ${UI.sidebar('patients')}
        <div class="main">
          ${UI.topbar(patient, { actions: contextActions() })}
          <div class="page">
            <div class="patient-head">
              <div class="patient-id">
                ${Clinic.renderPatientPhoto(patient)}
                <div>
                  <h1>${patient.shortName} <span class="badge blue">${patient.status}</span></h1>
                  <div class="subline">${patient.chartNumber} · ${UI.age(patient.birthDate)} · ${patient.payer} · ${patient.provider}</div>
                </div>
              </div>
              <div class="head-actions">
                <span class="badge ${alertCount ? 'warn' : ''}">${alertCount} alerta(s)</span>
                <span class="badge">${patient.documentType} ${patient.documentNumber}</span>
              </div>
            </div>

            <div class="metric-strip card">
              ${metric('Alertas activas', alertCount, alertCount ? 'requieren acción' : 'todo al día', alertCount ? 'warn' : 'ok')}
              ${metric('Última visita', last ? UI.fmtShort(last.date) : '—', last ? UI.relative(last.date) : '')}
              ${metric('Próxima cita', UI.fmtShort(patient.nextAppointment.date), UI.relative(patient.nextAppointment.date))}
              ${metric('Plan activo', `${progress.pct}%`, plan ? plan.title : '—')}
              ${metric('Saldo', UI.fmtMoney(balance), balance > 0 ? 'pendiente de pago' : 'al día', balance > 0 ? 'warn' : 'ok')}
            </div>

            <div class="command-grid">
              <div class="command-left">
                <section class="card wide" id="datos">
                  <div class="card-head">
                    <div><h2>Datos del paciente</h2><p>Clic en cualquier campo para editarlo · Enter guarda, Esc cancela</p></div>
                    <span class="save-stamp" data-save-stamp>${UI.lastSavedLabel() ?? 'Cada campo se guarda al salir'}</span>
                  </div>
                  <div class="card-body"><div class="field-grid" data-fields></div></div>
                </section>
                ${historyCard(patient)}
                ${dentalCard(patient)}
                ${encounterCard(patient)}
                <section class="card">
                  <div class="card-head">
                    <div><h2>Citas</h2><p>${Clinic.patientAppointments(patient).length} en total</p></div>
                    <a class="btn small" href="#view=agenda">Ver agenda</a>
                  </div>
                  <div class="card-body">${Clinic.renderPatientAppointments(patient, { limit: 6 })}</div>
                </section>
                <section class="card">
                  <div class="card-head">
                    <div><h2>Radiografías</h2><p>${patient.xrays.length} imagen(es) · aparte de Documentos</p></div>
                    <div class="card-tools">${Clinic.xraysTools()}</div>
                  </div>
                  <div class="card-body">${Clinic.renderXrays(patient)}</div>
                </section>
              </div>

              <aside class="rail-stack">
                <div class="card rail-card">
                  <div class="rail-section">
                    <div class="rail-head">
                      <h3>Alertas clínicas</h3>
                      <span class="badge ${alertCount ? 'danger' : ''}">${alertCount}</span>
                    </div>
                    ${UI.alertList(patient)}
                  </div>

                  <div class="rail-section">
                    <div class="rail-head">
                      <h3>Próxima cita</h3>
                      <span class="muted xs">${UI.relative(patient.nextAppointment.date)}</span>
                    </div>
                    <strong>${patient.nextAppointment.title}</strong>
                    <ul class="meta-list">
                      <li>${UI.fmtDateTime(patient.nextAppointment.date)}</li>
                      <li>${patient.nextAppointment.provider}</li>
                      <li>${patient.nextAppointment.room}</li>
                    </ul>
                    <span class="badge ${patient.nextAppointment.status === 'Confirmada' ? '' : 'warn'}">${patient.nextAppointment.status}</span>
                  </div>

                  ${planSection(patient)}

                  <div class="rail-section">
                    <div class="rail-head">
                      <h3>Salud periodontal</h3>
                      <span class="muted xs">${perioSummary.sites} sitios</span>
                    </div>
                    <div class="mini-metrics">
                      <div><span>Sangrado</span><b class="${perioSummary.bleeding >= 20 ? 'tone-warn' : ''}">${perioSummary.bleeding}%</b></div>
                      <div><span>PB ≥ 4 mm</span><b class="${perioSummary.deep >= 20 ? 'tone-warn' : ''}">${perioSummary.deep}%</b></div>
                      <div><span>Placa</span><b>${biofilmSummary.index.toFixed(2)}%</b></div>
                    </div>
                    <button class="btn small full spaced" data-dental-tab="perio">Abrir periodontograma</button>
                  </div>

                  <div class="rail-section">
                    <div class="rail-head"><h3>Firma del paciente</h3></div>
                    ${Clinic.renderSignature(patient)}
                  </div>

                  <div class="rail-section">
                    <div class="rail-head">
                      <h3>Documentos</h3>
                      ${Clinic.documentsTools()}
                    </div>
                    ${Clinic.renderDocuments(patient, { compact: true })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>`.__raw;

    mountFields(patient);
    wire(patient);
    const page = root.querySelector('.page');
    if (page) page.scrollTop = scroll;
    UI.restoreFocus(root, focused);
  }

  /* Las vistas de la navegación principal son iguales en las tres opciones:
     lo que se compara es la disposición del expediente, no la agenda. */
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

  function mountFields(patient) {
    const host = root.querySelector('[data-fields]');
    const fields = [
      { label: 'Nombre completo', path: 'name', value: patient.name, validate: (v) => (v.length < 3 ? 'Nombre demasiado corto' : null) },
      { label: 'Tipo de documento', path: 'documentType', value: patient.documentType, options: Data.DOCUMENT_TYPES },
      { label: 'Número de documento', path: 'documentNumber', value: patient.documentNumber },
      { label: 'Número de historia', path: 'chartNumber', value: patient.chartNumber, readOnly: true },
      { label: 'Fecha de nacimiento', path: 'birthDate', value: patient.birthDate, type: 'date', format: UI.fmtDate },
      {
        label: 'Correo electrónico',
        path: 'email',
        value: patient.email,
        type: 'email',
        validate: (v) => (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Correo inválido' : null),
      },
      {
        label: 'Teléfono',
        path: 'phone',
        value: patient.phone,
        validate: (v) => (v.replace(/\D/g, '').length < 7 ? 'Teléfono demasiado corto' : null),
      },
      { label: 'Aseguradora', path: 'payer', value: patient.payer, options: Data.PAYERS },
      { label: 'Zona', path: 'zone', value: patient.zone, options: ['Urbana', 'Rural', 'Sin definir'] },
      { label: 'Dirección', path: 'address', value: patient.address },
      { label: 'Acudiente', path: 'guardian.name', value: patient.guardian.name },
      { label: 'Teléfono del acudiente', path: 'guardian.phone', value: patient.guardian.phone },
      { label: 'Remisor', path: 'referredBy', value: patient.referredBy },
      { label: 'Profesional tratante', path: 'provider', value: patient.provider, options: Store.getDoctors().map((d) => d.name) },
    ];
    fields.forEach((field) => host.appendChild(UI.inlineField(field)));
  }

  function wire(patient) {
    UI.wireChrome(root);
    UI.wireAlerts(root);
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

    root.querySelectorAll('[data-dental-tab]').forEach((button) =>
      button.addEventListener('click', () => {
        view.dentalTab = button.dataset.dentalTab;
        render();
      })
    );

    root.querySelectorAll('[data-action]').forEach((button) =>
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'new-encounter') UI.encounterDialog(null);
        if (action === 'review') UI.historyReviewDialog();
        if (action === 'prescription') UI.prescriptionDialog();
      })
    );

    root.querySelectorAll('[data-toggle]').forEach((button) =>
      button.addEventListener('click', () => {
        const id = button.dataset.toggle;
        if (view.expanded.has(id)) view.expanded.delete(id);
        else view.expanded.add(id);
        render();
      })
    );

    root.querySelectorAll('[data-edit-encounter]').forEach((button) =>
      button.addEventListener('click', () => {
        const encounter = patient.encounters.find((e) => e.id === button.dataset.editEncounter);
        UI.encounterDialog(encounter);
      })
    );

    root.querySelectorAll('[data-sign]').forEach((button) =>
      button.addEventListener('click', () => {
        Store.signEncounter(button.dataset.sign);
        UI.toast('Evolución firmada');
      })
    );

    root.querySelectorAll('[data-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const encounter = patient.encounters.find((e) => e.id === button.dataset.delete);
        UI.deleteWithUndo({
          what: `Evolución «${encounter.title}»`,
          perform: () => Store.deleteEncounter(encounter.id),
        });
      })
    );

    root.querySelectorAll('[data-plan-item]').forEach((input) =>
      input.addEventListener('change', () => {
        Store.togglePlanItem(input.dataset.plan, input.dataset.planItem);
        UI.toast(input.checked ? 'Procedimiento marcado como realizado' : 'Procedimiento devuelto a pendiente');
      })
    );

  }

  window.addEventListener('hashchange', render);
  Store.subscribe(render);
})();
