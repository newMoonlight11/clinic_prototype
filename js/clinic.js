/* Módulos de clínica compartidos por las tres opciones de diseño:
   agenda tipo calendario, historial de citas del paciente, radiografías,
   foto y firma del paciente, reseñas y facturación.

   Igual que `dental.js`: cada módulo expone un `render*` que devuelve HTML y
   un `wire*` que engancha eventos, para que cada opción lo coloque donde
   quiera sin duplicar lógica. */

(function () {
  const UI = window.ProtoUI;
  const Store = window.ProtoStore;
  const Data = window.ProtoData;
  const { tpl, raw, qsa } = UI;

  /* ------------------------------------------------------------------ *
   * Fechas
   * ------------------------------------------------------------------ */

  const TODAY = new Date('2026-09-07T09:00:00');
  const DAY_MS = 86400000;

  const dayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: '2-digit' });
  const monthFmt = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
  const longDayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: '2-digit', month: 'long' });

  function toDate(value) {
    if (!value) return null;
    const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Lunes de la semana que contiene la fecha dada. */
  function startOfWeek(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    const weekday = (copy.getDay() + 6) % 7;
    copy.setTime(copy.getTime() - weekday * DAY_MS);
    return copy;
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  const isoDay = (date) => date.toISOString().slice(0, 10);

  function minutesFromStart(iso) {
    const date = toDate(iso);
    return date.getHours() * 60 + date.getMinutes();
  }

  /* ------------------------------------------------------------------ *
   * Agenda
   * ------------------------------------------------------------------ */

  const HOUR_START = 7;
  const HOUR_END = 19;
  const PX_PER_MIN = 1;

  /** Estado local de la agenda; se conserva entre renders. */
  const agenda = {
    weekStart: isoDay(startOfWeek(TODAY)),
    mode: 'week',
    focusDay: isoDay(TODAY),
    hiddenDoctors: new Set(),
  };

  function doctorById(id) {
    return Store.getDoctors().find((doctor) => doctor.id === id) ?? null;
  }

  function patientById(id) {
    return Store.getPatients().find((patient) => patient.id === id) ?? null;
  }

  function visibleAppointments() {
    return Store.getAppointments().filter((item) => !agenda.hiddenDoctors.has(item.doctorId));
  }

  function appointmentsOn(dayIso) {
    return visibleAppointments()
      .filter((item) => item.start.slice(0, 10) === dayIso)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  /** Reparte en columnas las citas que se solapan, como hace Google Calendar. */
  function layoutDay(items) {
    const placed = [];
    items.forEach((item) => {
      const start = minutesFromStart(item.start);
      const end = start + item.minutes;
      const overlapping = placed.filter((other) => start < other.end && end > other.start);
      const usedColumns = new Set(overlapping.map((other) => other.column));
      let column = 0;
      while (usedColumns.has(column)) column += 1;
      placed.push({ item, start, end, column });
    });
    const columnCount = Math.max(1, ...placed.map((entry) => entry.column + 1));
    return { placed, columnCount };
  }

  function appointmentBlock(entry, columnCount) {
    const { item, start, column } = entry;
    const doctor = doctorById(item.doctorId);
    const patient = patientById(item.patientId);
    const top = (start - HOUR_START * 60) * PX_PER_MIN;
    const height = Math.max(22, item.minutes * PX_PER_MIN - 2);
    const width = 100 / columnCount;
    const done = item.status === 'Cumplida';
    const cancelled = item.status === 'Cancelada' || item.status === 'No asistió';
    return tpl`
      <button type="button" class="agenda-event ${done ? 'done' : ''} ${cancelled ? 'cancelled' : ''} ${item.status === 'Por confirmar' ? 'tentative' : ''}"
        data-appointment="${item.id}"
        style="top:${top}px;height:${height}px;left:${column * width}%;width:calc(${width}% - 3px);--doctor:${doctor ? doctor.color : '#6d7c8c'}"
        aria-label="${item.title}, ${patient ? patient.shortName : ''}, ${UI.fmtTime(item.start)}, ${doctor ? doctor.name : ''}, ${item.status}">
        <span class="agenda-time">${UI.fmtTime(item.start)}</span>
        <span class="agenda-title">${item.title}</span>
        <span class="agenda-patient">${patient ? patient.shortName : 'Sin paciente'}</span>
      </button>`;
  }

  function hourColumn() {
    const hours = [];
    for (let hour = HOUR_START; hour <= HOUR_END; hour += 1) hours.push(hour);
    return tpl`
      <div class="agenda-hours">
        ${hours.map(
          (hour) => tpl`<div class="agenda-hour" style="height:${60 * PX_PER_MIN}px"><span>${String(hour).padStart(2, '0')}:00</span></div>`
        )}
      </div>`;
  }

  function dayColumn(dayIso, { showHeader = true } = {}) {
    const date = toDate(dayIso);
    const items = appointmentsOn(dayIso);
    const { placed, columnCount } = layoutDay(items);
    const isToday = dayIso === isoDay(TODAY);
    const hours = HOUR_END - HOUR_START + 1;
    return tpl`
      <div class="agenda-day ${isToday ? 'today' : ''}">
        ${showHeader
          ? tpl`<div class="agenda-day-head">
              <b>${dayFmt.format(date)}</b>
              <span class="muted xs">${items.length} cita(s)</span>
            </div>`
          : ''}
        <div class="agenda-day-body" style="height:${hours * 60 * PX_PER_MIN}px">
          ${Array.from({ length: hours }, (_, index) => tpl`<div class="agenda-line" style="top:${index * 60 * PX_PER_MIN}px"></div>`)}
          ${placed.map((entry) => appointmentBlock(entry, columnCount))}
        </div>
      </div>`;
  }

  function agendaToolbar() {
    const weekStart = toDate(agenda.weekStart);
    const label =
      agenda.mode === 'week'
        ? `${dayFmt.format(weekStart)} – ${dayFmt.format(addDays(weekStart, 5))} · ${monthFmt.format(weekStart)}`
        : longDayFmt.format(toDate(agenda.focusDay));
    return tpl`
      <div class="agenda-toolbar">
        <div class="agenda-nav">
          <button class="btn small" data-agenda-move="-1" aria-label="Semana o día anterior">‹</button>
          <button class="btn small" data-agenda-today>Hoy</button>
          <button class="btn small" data-agenda-move="1" aria-label="Semana o día siguiente">›</button>
          <strong class="agenda-range">${label}</strong>
        </div>
      </div>
      <div class="doctor-filter">
        <span class="section-label">Doctores</span>
        ${Store.getDoctors().map(
          (doctor) => tpl`<button type="button" class="doctor-chip ${agenda.hiddenDoctors.has(doctor.id) ? 'off' : ''}"
            data-doctor-toggle="${doctor.id}" aria-pressed="${!agenda.hiddenDoctors.has(doctor.id)}"
            style="--doctor:${doctor.color}">
            <i></i><span>${doctor.name}</span><em>${doctor.specialty}</em>
          </button>`
        )}
      </div>`;
  }

  /** Controles de vista y alta, para el encabezado de la tarjeta. */
  function agendaTools() {
    return tpl`
      <div class="segmented" role="tablist" aria-label="Vista de agenda">
        <button class="segment ${agenda.mode === 'week' ? 'active' : ''}" role="tab"
          aria-selected="${agenda.mode === 'week'}" data-agenda-mode="week">Semana</button>
        <button class="segment ${agenda.mode === 'day' ? 'active' : ''}" role="tab"
          aria-selected="${agenda.mode === 'day'}" data-agenda-mode="day">Día</button>
      </div>
      <button class="btn small primary" data-new-appointment>${UI.icon('plus')}<span>Nueva cita</span></button>`;
  }

  function renderAgenda() {
    const weekStart = toDate(agenda.weekStart);
    const days = agenda.mode === 'week'
      ? Array.from({ length: 6 }, (_, index) => isoDay(addDays(weekStart, index)))
      : [agenda.focusDay];
    const total = days.reduce((sum, day) => sum + appointmentsOn(day).length, 0);

    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Agenda</h2><p>${total} cita(s) en la vista · cada doctor tiene su color</p></div>
          <div class="card-tools">${agendaTools()}</div>
        </div>
        <div class="card-body">
          ${agendaToolbar()}
          <div class="scroll-x">
            <div class="agenda-grid ${agenda.mode === 'day' ? 'single' : ''}">
              ${hourColumn()}
              ${days.map((day) => dayColumn(day))}
            </div>
          </div>
        </div>
      </section>`;
  }

  async function appointmentDialog(existing) {
    const patients = Store.getPatients();
    const doctors = Store.getDoctors();
    const base = existing ?? {
      patientId: Store.getPatient().id,
      doctorId: doctors[0].id,
      start: `${agenda.focusDay}T09:00`,
      minutes: 30,
      title: '',
      room: Data.ROOMS[0],
      status: 'Por confirmar',
    };

    const result = await UI.modal({
      title: existing ? 'Editar cita' : 'Nueva cita',
      subtitle: 'El color del bloque lo define el doctor asignado',
      submitLabel: 'Guardar cita',
      body: tpl`
        <label class="form-field"><span>Motivo</span>
          <input class="input" name="title" value="${base.title}" placeholder="Ej. Control periodontal"></label>
        <div class="form-grid">
          <label class="form-field"><span>Paciente</span>
            <select class="input" name="patientId">
              ${patients.map((p) => tpl`<option value="${p.id}" ${p.id === base.patientId ? raw('selected') : ''}>${p.shortName}</option>`)}
            </select></label>
          <label class="form-field"><span>Doctor</span>
            <select class="input" name="doctorId">
              ${doctors.map((d) => tpl`<option value="${d.id}" ${d.id === base.doctorId ? raw('selected') : ''}>${d.name}</option>`)}
            </select></label>
          <label class="form-field"><span>Consultorio</span>
            <select class="input" name="room">
              ${Data.ROOMS.map((room) => tpl`<option value="${room}" ${room === base.room ? raw('selected') : ''}>${room}</option>`)}
            </select></label>
        </div>
        <div class="form-grid">
          <label class="form-field"><span>Inicio</span>
            <input class="input" type="datetime-local" name="start" value="${base.start.slice(0, 16)}"></label>
          <label class="form-field"><span>Duración (min)</span>
            <input class="input" name="minutes" inputmode="numeric" value="${base.minutes}"></label>
          <label class="form-field"><span>Estado</span>
            <select class="input" name="status">
              ${Data.APPOINTMENT_STATUS.map((status) => tpl`<option value="${status}" ${status === base.status ? raw('selected') : ''}>${status}</option>`)}
            </select></label>
        </div>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw UI.invalid('Indica el motivo de la cita.', 'title');
        const minutes = Number(values.minutes);
        if (!Number.isFinite(minutes) || minutes < 10 || minutes > 240) {
          throw UI.invalid('La duración debe estar entre 10 y 240 minutos.', 'minutes');
        }
        const startHour = Number(values.start.slice(11, 13));
        if (startHour < HOUR_START || startHour > HOUR_END) {
          throw UI.invalid(`La agenda va de ${HOUR_START}:00 a ${HOUR_END}:00.`, 'start');
        }
        return {
          ...(existing ? { id: existing.id } : {}),
          title: values.title.trim(),
          patientId: values.patientId,
          doctorId: values.doctorId,
          room: values.room,
          start: values.start,
          minutes,
          status: values.status,
        };
      },
    });

    if (!result) return null;
    const saved = Store.saveAppointment(result);
    UI.toast(existing ? 'Cita actualizada' : 'Cita creada');
    return saved;
  }

  async function appointmentDetail(id) {
    const item = Store.getAppointments().find((a) => a.id === id);
    if (!item) return;
    const doctor = doctorById(item.doctorId);
    const patient = patientById(item.patientId);

    const action = await UI.modal({
      title: item.title,
      subtitle: `${UI.fmtDateTime(item.start)} · ${item.minutes} min · ${item.room}`,
      submitLabel: null,
      cancelLabel: 'Cerrar',
      body: tpl`
        <div class="detail-row"><span>Paciente</span><p>${patient ? `${patient.shortName} · ${patient.documentType} ${patient.documentNumber}` : 'Sin paciente'}</p></div>
        <div class="detail-row"><span>Doctor</span><p><i class="doctor-dot" style="--doctor:${doctor ? doctor.color : '#999'}"></i> ${doctor ? `${doctor.name} · ${doctor.specialty}` : '—'}</p></div>
        <div class="form-field">
          <span>Estado de la cita</span>
          <div class="action-row">
            ${Data.APPOINTMENT_STATUS.map(
              (status) => tpl`<button type="button" class="btn small ${status === item.status ? 'primary' : ''}" data-set-status="${status}">${status}</button>`
            )}
          </div>
        </div>`,
      footerActions: tpl`
        <div class="dialog-actions">
          <button type="button" class="btn small" data-edit-appointment>${UI.icon('pencil')}<span>Editar cita</span></button>
          <button type="button" class="btn small" data-open-patient>${UI.icon('user')}<span>Ver paciente</span></button>
          <button type="button" class="btn small danger" data-delete-appointment>${UI.icon('trash')}<span>Eliminar</span></button>
        </div>`,
      onMount: (overlay, close) => {
        qsa(overlay, '[data-set-status]').forEach((button) =>
          button.addEventListener('click', () => {
            Store.setAppointmentStatus(id, button.dataset.setStatus);
            UI.toast(`Cita marcada como ${button.dataset.setStatus.toLowerCase()}`);
            close(null);
          })
        );
        overlay.querySelector('[data-edit-appointment]').addEventListener('click', () => {
          close(null);
          appointmentDialog(item);
        });
        overlay.querySelector('[data-open-patient]').addEventListener('click', () => {
          close(null);
          if (patient) {
            Store.setActivePatient(patient.id);
            window.location.hash = 'view=patients';
          }
        });
        overlay.querySelector('[data-delete-appointment]').addEventListener('click', () => {
          close(null);
          UI.deleteWithUndo({
            what: `Cita «${item.title}»`,
            perform: () => Store.deleteAppointment(id),
          });
        });
      },
    });
    return action;
  }

  function wireAgenda(root) {
    qsa(root, '[data-appointment]').forEach((button) =>
      button.addEventListener('click', () => appointmentDetail(button.dataset.appointment))
    );
    qsa(root, '[data-agenda-move]').forEach((button) =>
      button.addEventListener('click', () => {
        const step = Number(button.dataset.agendaMove);
        if (agenda.mode === 'week') {
          agenda.weekStart = isoDay(addDays(toDate(agenda.weekStart), step * 7));
          agenda.focusDay = agenda.weekStart;
        } else {
          agenda.focusDay = isoDay(addDays(toDate(agenda.focusDay), step));
          agenda.weekStart = isoDay(startOfWeek(toDate(agenda.focusDay)));
        }
        Store.notify();
      })
    );
    const today = root.querySelector('[data-agenda-today]');
    if (today) {
      today.addEventListener('click', () => {
        agenda.weekStart = isoDay(startOfWeek(TODAY));
        agenda.focusDay = isoDay(TODAY);
        Store.notify();
      });
    }
    qsa(root, '[data-agenda-mode]').forEach((button) =>
      button.addEventListener('click', () => {
        agenda.mode = button.dataset.agendaMode;
        Store.notify();
      })
    );
    qsa(root, '[data-doctor-toggle]').forEach((button) =>
      button.addEventListener('click', () => {
        const id = button.dataset.doctorToggle;
        if (agenda.hiddenDoctors.has(id)) agenda.hiddenDoctors.delete(id);
        else agenda.hiddenDoctors.add(id);
        Store.notify();
      })
    );
    const create = root.querySelector('[data-new-appointment]');
    if (create) create.addEventListener('click', () => appointmentDialog(null));
  }

  /* ------------------------------------------------------------------ *
   * Historial de citas del paciente
   * ------------------------------------------------------------------ */

  function patientAppointments(patient) {
    return Store.getAppointments()
      .filter((item) => item.patientId === patient.id)
      .sort((a, b) => b.start.localeCompare(a.start));
  }

  function statusTone(status) {
    if (status === 'Cumplida') return '';
    if (status === 'Cancelada' || status === 'No asistió') return 'danger';
    if (status === 'Por confirmar') return 'warn';
    return 'blue';
  }

  /** @param {{limit?:number, compact?:boolean}} options */
  function renderPatientAppointments(patient, options = {}) {
    const items = patientAppointments(patient);
    const shown = options.limit ? items.slice(0, options.limit) : items;
    if (shown.length === 0) return tpl`<p class="muted">Este paciente no tiene citas registradas.</p>`;

    const upcoming = shown.filter((item) => item.start >= '2026-09-07T09:00');
    const past = shown.filter((item) => item.start < '2026-09-07T09:00');

    const group = (title, list) =>
      list.length === 0
        ? ''
        : tpl`
          <div class="appt-group">
            <p class="section-label">${title}</p>
            <ol class="appt-timeline">
              ${list.map((item) => {
                const doctor = doctorById(item.doctorId);
                return tpl`<li class="appt-item" style="--doctor:${doctor ? doctor.color : '#6d7c8c'}">
                  <div class="appt-when">
                    <b>${UI.fmtShort(item.start)}</b>
                    <span class="muted xs">${UI.fmtTime(item.start)} · ${item.minutes} min</span>
                  </div>
                  <div class="appt-what">
                    <b>${item.title}</b>
                    <span class="muted xs">${doctor ? doctor.name : '—'} · ${item.room}</span>
                  </div>
                  <div class="appt-status">
                    <span class="badge ${statusTone(item.status)}">${item.status}</span>
                    ${item.encounterId ? raw('<span class="muted xs">Con evolución</span>') : ''}
                  </div>
                  <button type="button" class="icon-btn" data-appointment="${item.id}" aria-label="Ver cita ${item.title}">${UI.icon('open')}</button>
                </li>`;
              })}
            </ol>
          </div>`;

    return tpl`
      <div class="appt-history">
        ${group('Próximas', upcoming)}
        ${group('Historial', past)}
        ${options.limit && items.length > options.limit
          ? tpl`<p class="muted xs">Mostrando ${options.limit} de ${items.length} citas.</p>`
          : ''}
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * Radiografías
   * ------------------------------------------------------------------ */

  const XRAY_TYPES = Data.IMAGE_TYPES;

  /** Estado local de la galería. */
  const xrayView = { filter: 'Todas' };

  /**
   * Marcador visual de radiografía. No son imágenes reales: es un SVG
   * generado, para no meter imágenes de pacientes en el prototipo.
   */
  function xrayThumb(xray) {
    if (xray.dataUrl) {
      return tpl`<img class="xray-image" src="${xray.dataUrl}" alt="${xray.title}">`;
    }
    const shapes = {
      pano: '<rect x="4" y="26" width="112" height="30" rx="15"/><rect x="18" y="20" width="84" height="18" rx="9"/><path d="M24 40h72M30 47h60"/>',
      periapical: '<rect x="34" y="14" width="52" height="52" rx="6"/><path d="M46 26h28M46 36h28M52 46h16"/>',
      bitewing: '<rect x="14" y="20" width="92" height="40" rx="5"/><path d="M14 40h92M38 20v40M62 20v40M86 20v40"/>',
      cbct: '<circle cx="60" cy="40" r="24"/><path d="M60 16v48M36 40h48"/><circle cx="60" cy="40" r="10"/>',
      periapical2: '<rect x="34" y="14" width="52" height="52" rx="6"/>',
      ceph: '<path d="M40 16c16 0 30 10 30 24s-12 24-28 24H34l6-12c-8-4-12-12-12-20 0-9 5-16 12-16z"/><path d="M44 40h14"/>',
    };
    return tpl`
      <svg class="xray-thumb tone-${xray.tone}" viewBox="0 0 120 80" role="img" aria-label="Vista previa de ${xray.title}">
        <rect class="xray-bg" width="120" height="80"/>
        <g class="xray-shape">${raw(shapes[xray.tone] ?? shapes.periapical)}</g>
      </svg>`;
  }

  /** Control de alta de imagen, para montarlo en el encabezado de la tarjeta. */
  function xraysTools() {
    return tpl`<button type="button" class="btn small primary" data-xray-new>${UI.icon('plus')}<span>Registrar imagen</span></button>`;
  }

  function renderXrays(patient, options = {}) {
    const types = ['Todas', ...XRAY_TYPES];
    const items = patient.xrays.filter((x) => xrayView.filter === 'Todas' || x.type === xrayView.filter);
    const settings = Store.getSettings();

    return tpl`
      <div class="xray-board">
        ${options.compact
          ? ''
          : tpl`<div class="chip-row">
              ${types.map(
                (type) => tpl`<button type="button" class="chip ${xrayView.filter === type ? 'on' : ''}" data-xray-filter="${type}">${type}</button>`
              )}
            </div>`}

        ${items.length === 0
          ? tpl`<p class="empty-state">No hay imágenes${xrayView.filter === 'Todas' ? '' : ` del tipo ${xrayView.filter}`}.
              <button type="button" class="btn small primary" data-xray-new>${UI.icon('plus')}<span>Registrar imagen</span></button></p>`
          : tpl`<div class="xray-grid">
              ${items.map(
                (xray) => tpl`<figure class="xray-card">
                  <button type="button" class="xray-open" data-xray="${xray.id}" aria-label="Ampliar ${xray.title}">
                    ${xrayThumb(xray)}
                  </button>
                  <figcaption>
                    <b>${xray.title}</b>
                    <span class="muted xs">${UI.fmtDate(xray.date)} · ${xray.type}${xray.tooth ? ` · diente ${xray.tooth}` : ''}</span>
                    <span class="muted xs">${xray.source} · ${xray.size ?? '—'}</span>
                    ${options.compact
                      ? ''
                      : tpl`<span class="xray-actions">
                          <button type="button" class="icon-btn" data-xray-edit="${xray.id}" aria-label="Editar ${xray.title}">${UI.icon('pencil')}</button>
                          <button type="button" class="icon-btn" data-xray-delete="${xray.id}" aria-label="Eliminar ${xray.title}">${UI.icon('trash')}</button>
                        </span>`}
                  </figcaption>
                </figure>`
              )}
            </div>`}

        ${options.compact
          ? ''
          : tpl`<div class="intake-note">
              <div>
                <p class="section-label">Recepción de imágenes por correo</p>
                <p>Las radiografías y tomografías llegan a <b>${settings.intakeEmail}</b>.
                  Pedir siempre <b>nombre completo y número de documento</b> del paciente en el asunto,
                  para poder archivarlas sin ambigüedad.</p>
                <p class="muted xs">Documento de este paciente: <b>${patient.documentType} ${patient.documentNumber}</b></p>
              </div>
              <button type="button" class="btn small" data-copy-intake>${UI.icon('file')}<span>Copiar plantilla</span></button>
            </div>`}
      </div>`;
  }

  async function xrayLightbox(patient, id) {
    const xray = patient.xrays.find((x) => x.id === id);
    if (!xray) return;
    await UI.modal({
      title: xray.title,
      subtitle: `${UI.fmtDate(xray.date)} · ${xray.type}${xray.tooth ? ` · diente ${xray.tooth}` : ''} · ${xray.source}`,
      size: 'lg',
      submitLabel: null,
      cancelLabel: 'Cerrar',
      body: tpl`
        <div class="xray-lightbox">${xrayThumb(xray)}</div>
        <div class="dialog-actions">
          <button type="button" class="btn small danger" data-delete-xray="${xray.id}">Eliminar imagen</button>
        </div>`,
      onMount: (overlay, close) => {
        overlay.querySelector('[data-delete-xray]').addEventListener('click', () => {
          close(null);
          UI.deleteWithUndo({
            what: `Imagen «${xray.title}»`,
            perform: () => Store.deleteRecord('xrays', id),
          });
        });
      },
    });
  }

  function wireXrays(root) {
    const patient = Store.getPatient();
    qsa(root, '[data-xray-filter]').forEach((button) =>
      button.addEventListener('click', () => {
        xrayView.filter = button.dataset.xrayFilter;
        Store.notify();
      })
    );
    qsa(root, '[data-xray]').forEach((button) =>
      button.addEventListener('click', () => xrayLightbox(Store.getPatient(), button.dataset.xray))
    );
    const copy = root.querySelector('[data-copy-intake]');
    if (copy) {
      copy.addEventListener('click', () => {
        const current = Store.getPatient();
        const text = `Asunto: Imagen diagnóstica · ${current.name} · ${current.documentType} ${current.documentNumber}`;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
        UI.toast('Plantilla de asunto copiada');
      });
    }
    const create = root.querySelector('[data-xray-new]');
    if (create) create.addEventListener('click', () => xrayFormDialog(null));
    qsa(root, '[data-xray-edit]').forEach((button) =>
      button.addEventListener('click', () =>
        xrayFormDialog(Store.getPatient().xrays.find((x) => x.id === button.dataset.xrayEdit))
      )
    );
    qsa(root, '[data-xray-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const xray = Store.getPatient().xrays.find((x) => x.id === button.dataset.xrayDelete);
        UI.deleteWithUndo({
          what: `Imagen «${xray.title}»`,
          perform: () => Store.deleteRecord('xrays', xray.id),
        });
      })
    );
  }

  /**
   * Alta y edición de una imagen diagnóstica. El archivo se carga aquí mismo:
   * no hace falta un botón aparte para subir.
   */
  async function xrayFormDialog(existing) {
    const base = existing ?? {
      title: '',
      date: new Date().toISOString().slice(0, 10),
      type: XRAY_TYPES[0],
      tooth: '',
      source: 'Correo',
      size: '',
      dataUrl: null,
    };
    let dataUrl = base.dataUrl ?? null;
    let fileSize = base.size ?? '';

    const result = await UI.modal({
      title: existing ? 'Editar imagen' : 'Registrar imagen',
      subtitle: 'Radiografías y tomografías del paciente',
      submitLabel: 'Guardar',
      body: tpl`
        <div class="file-field">
          <label class="file-drop">
            <input type="file" accept="image/*" name="file" hidden>
            ${UI.icon('upload')}
            <span data-file-label>${base.dataUrl ? 'Imagen cargada · elegir otra' : 'Elegir imagen del equipo (opcional)'}</span>
          </label>
          <div class="file-preview" data-file-preview>
            ${base.dataUrl ? tpl`<img src="${base.dataUrl}" alt="Vista previa">` : ''}
          </div>
        </div>
        <label class="form-field"><span>Título</span>
          <input class="input" name="title" value="${base.title}" placeholder="Ej. Panorámica de control"></label>
        <div class="form-grid">
          <label class="form-field"><span>Categoría</span>
            <select class="input" name="type">
              ${XRAY_TYPES.map((type) => tpl`<option value="${type}" ${type === base.type ? raw('selected') : ''}>${type}</option>`)}
            </select></label>
          <label class="form-field"><span>Fecha</span>
            <input class="input" type="date" name="date" value="${base.date}"></label>
          <label class="form-field"><span>Diente (opcional)</span>
            <input class="input" name="tooth" value="${base.tooth ?? ''}" placeholder="Ej. 36"></label>
        </div>
        <label class="form-field"><span>Origen</span>
          <select class="input" name="source">
            ${['Correo', 'Sensor intraoral', 'Carga manual'].map(
              (source) => tpl`<option value="${source}" ${source === base.source ? raw('selected') : ''}>${source}</option>`
            )}
          </select></label>`,
      onMount: (overlay) => {
        const input = overlay.querySelector('input[name="file"]');
        const label = overlay.querySelector('[data-file-label]');
        const preview = overlay.querySelector('[data-file-preview]');
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            dataUrl = String(reader.result);
            fileSize = `${Math.round(file.size / 1024)} KB`;
            label.textContent = `${file.name} · elegir otra`;
            preview.innerHTML = `<img src="${dataUrl}" alt="Vista previa">`;
            const title = overlay.querySelector('input[name="title"]');
            if (!title.value.trim()) title.value = file.name.replace(/\.[^.]+$/, '');
            const source = overlay.querySelector('select[name="source"]');
            source.value = 'Carga manual';
          });
          reader.readAsDataURL(file);
        });
      },
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw UI.invalid('Escribe el título de la imagen.', 'title');
        return {
          title: values.title.trim(),
          type: values.type,
          date: values.date,
          tooth: values.tooth.trim() || null,
          source: values.source,
          size: fileSize || '—',
          tone: Data.IMAGE_TONES[values.type] ?? 'periapical',
          dataUrl,
        };
      },
    });
    if (!result) return;
    if (existing) {
      Store.updateRecord('xrays', existing.id, result);
      UI.toast('Imagen actualizada');
    } else {
      Store.addRecord('xrays', result);
      UI.toast('Imagen registrada');
    }
  }

  /* ------------------------------------------------------------------ *
   * Documentos
   * ------------------------------------------------------------------ */

  const DOCUMENT_TYPES = ['Consentimiento', 'Exportación', 'Autorización', 'Remisión', 'Otro'];
  const DOCUMENT_STATUS = ['Pendiente de firma', 'Firmado', 'Archivado'];

  /** Controles de documentos, para montarlos en el encabezado de la tarjeta. */
  function documentsTools() {
    return tpl`<button type="button" class="btn small primary" data-document-new>${UI.icon('plus')}<span>Nuevo documento</span></button>`;
  }

  /** @param {{compact?:boolean}} options */
  /** Acciones de una fila de documento, iguales en tabla y en lista. */
  function documentRowActions(doc) {
    return tpl`
      ${doc.status === 'Pendiente de firma'
        ? tpl`<button type="button" class="icon-btn" data-sign-doc="${doc.id}"
            aria-label="Marcar firmado ${doc.title}" title="Marcar firmado">${UI.icon('check')}</button>`
        : ''}
      <button type="button" class="icon-btn" data-document-edit="${doc.id}"
        aria-label="Editar ${doc.title}" title="Editar">${UI.icon('pencil')}</button>
      <button type="button" class="icon-btn" data-document-delete="${doc.id}"
        aria-label="Eliminar ${doc.title}" title="Eliminar">${UI.icon('trash')}</button>`;
  }

  /**
   * En columna angosta la tabla no cabe y la columna de acciones se sale del
   * área visible, así que ahí se dibuja como lista con las acciones a la vista.
   * @param {{compact?:boolean}} options
   */
  function renderDocuments(patient, options = {}) {
    if (patient.documents.length === 0) {
      return tpl`
        <div class="documents-board">
          <p class="empty-state">Sin documentos registrados.
            <button type="button" class="btn small primary" data-document-new>${UI.icon('plus')}<span>Crear el primero</span></button>
          </p>
        </div>`;
    }

    if (options.compact) {
      return tpl`
        <div class="documents-board">
          <ul class="doc-list">
            ${patient.documents.map(
              (doc) => tpl`<li>
                <div class="doc-main">
                  <b>${doc.title}</b>
                  <span class="muted xs">${UI.fmtDate(doc.date)} · ${doc.type}${doc.fileName ? ` · ${doc.fileName}` : ''}</span>
                  <span class="badge ${doc.status === 'Pendiente de firma' ? 'warn' : ''}">${doc.status}</span>
                </div>
                <span class="row-actions">${documentRowActions(doc)}</span>
              </li>`
            )}
          </ul>
        </div>`;
    }

    return tpl`
      <div class="documents-board">
        <div class="scroll-x">
          <table class="table">
            <thead><tr><th style="width:104px">Fecha</th><th>Documento</th><th style="width:118px">Tipo</th><th style="width:138px">Estado</th><th class="actions-cell" style="width:116px"></th></tr></thead>
            <tbody>
              ${patient.documents.map(
                (doc) => tpl`<tr>
                  <td class="muted" data-label="Fecha">${UI.fmtDate(doc.date)}</td>
                  <td data-label="Documento"><b>${doc.title}</b>
                    <div class="muted xs">${doc.fileName ? `${doc.fileName} · ` : ''}${doc.size ?? '—'}</div>
                  </td>
                  <td class="muted" data-label="Tipo">${doc.type}</td>
                  <td data-label="Estado"><span class="badge ${doc.status === 'Pendiente de firma' ? 'warn' : ''}">${doc.status}</span></td>
                  <td class="actions-cell"><span class="row-actions">${documentRowActions(doc)}</span></td>
                </tr>`
              )}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /** Alta y edición de un documento, con carga del archivo. */
  async function documentDialog(existing) {
    const base = existing ?? {
      title: '',
      date: new Date().toISOString().slice(0, 10),
      type: DOCUMENT_TYPES[0],
      status: DOCUMENT_STATUS[0],
      size: '',
      fileName: '',
    };
    let dataUrl = base.dataUrl ?? null;
    let fileName = base.fileName ?? '';
    let fileSize = base.size ?? '';

    const result = await UI.modal({
      title: existing ? 'Editar documento' : 'Nuevo documento',
      submitLabel: 'Guardar',
      body: tpl`
        <div class="file-field">
          <label class="file-drop">
            <input type="file" accept=".pdf,image/*,.doc,.docx" name="file" hidden>
            ${UI.icon('upload')}
            <span data-file-label>${fileName ? `${fileName} · elegir otro` : 'Cargar archivo (PDF o imagen)'}</span>
          </label>
        </div>
        <label class="form-field"><span>Título</span>
          <input class="input" name="title" value="${base.title}" placeholder="Ej. Consentimiento de endodoncia"></label>
        <div class="form-grid">
          <label class="form-field"><span>Tipo</span>
            <select class="input" name="type">
              ${DOCUMENT_TYPES.map((type) => tpl`<option value="${type}" ${type === base.type ? raw('selected') : ''}>${type}</option>`)}
            </select></label>
          <label class="form-field"><span>Fecha</span>
            <input class="input" type="date" name="date" value="${base.date}"></label>
          <label class="form-field"><span>Estado</span>
            <select class="input" name="status">
              ${DOCUMENT_STATUS.map((status) => tpl`<option value="${status}" ${status === base.status ? raw('selected') : ''}>${status}</option>`)}
            </select></label>
        </div>`,
      onMount: (overlay) => {
        const input = overlay.querySelector('input[name="file"]');
        const label = overlay.querySelector('[data-file-label]');
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            dataUrl = String(reader.result);
            fileName = file.name;
            fileSize = `${Math.round(file.size / 1024)} KB`;
            label.textContent = `${file.name} · elegir otro`;
            const title = overlay.querySelector('input[name="title"]');
            if (!title.value.trim()) title.value = file.name.replace(/\.[^.]+$/, '');
          });
          reader.readAsDataURL(file);
        });
      },
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw UI.invalid('Escribe el título del documento.', 'title');
        return {
          title: values.title.trim(),
          type: values.type,
          date: values.date,
          status: values.status,
          size: fileSize || '—',
          fileName,
          dataUrl,
        };
      },
    });

    if (!result) return;
    if (existing) {
      Store.updateRecord('documents', existing.id, result);
      UI.toast('Documento actualizado');
    } else {
      Store.addRecord('documents', result);
      UI.toast('Documento creado');
    }
  }

  function wireDocuments(root) {
    const create = root.querySelector('[data-document-new]');
    if (create) create.addEventListener('click', () => documentDialog(null));

    qsa(root, '[data-document-edit]').forEach((button) =>
      button.addEventListener('click', () =>
        documentDialog(Store.getPatient().documents.find((doc) => doc.id === button.dataset.documentEdit))
      )
    );

    qsa(root, '[data-document-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const doc = Store.getPatient().documents.find((item) => item.id === button.dataset.documentDelete);
        UI.deleteWithUndo({
          what: `Documento «${doc.title}»`,
          perform: () => Store.deleteRecord('documents', doc.id),
        });
      })
    );

    qsa(root, '[data-sign-doc]').forEach((button) =>
      button.addEventListener('click', () => {
        Store.setDocumentStatus(button.dataset.signDoc, 'Firmado');
        UI.toast('Documento marcado como firmado');
      })
    );
  }

  /* ------------------------------------------------------------------ *
   * Foto y firma del paciente
   * ------------------------------------------------------------------ */

  function renderPatientPhoto(patient, options = {}) {
    const size = options.size ?? 'md';
    return tpl`
      <div class="patient-photo ${size}">
        ${patient.photo
          ? tpl`<img src="${patient.photo}" alt="Foto de ${patient.shortName}">`
          : tpl`<span class="photo-initials">${patient.initials}</span>`}
        ${options.editable === false
          ? ''
          : tpl`<label class="photo-upload" title="Cambiar foto">
              <input type="file" accept="image/*" data-photo-upload hidden>
              ${UI.icon('image')}<span class="sr-only">Cambiar foto de ${patient.shortName}</span>
            </label>`}
      </div>`;
  }

  function renderSignature(patient) {
    return tpl`
      <div class="signature-box">
        ${patient.signature
          ? tpl`<figure class="signature-saved">
              <img src="${patient.signature}" alt="Firma registrada de ${patient.shortName}">
              <figcaption class="muted xs">Firma registrada</figcaption>
            </figure>`
          : tpl`<p class="muted">Sin firma registrada.</p>`}
        <div class="signature-actions">
          <button type="button" class="btn small" data-sign-patient>${patient.signature ? 'Volver a firmar' : 'Capturar firma'}</button>
          ${patient.signature ? tpl`<button type="button" class="btn small" data-clear-signature>Borrar</button>` : ''}
        </div>
      </div>`;
  }

  /** Pad de firma en canvas; guarda la firma como data URL en el estado. */
  async function signatureDialog() {
    const patient = Store.getPatient();
    let hasStrokes = false;

    const result = await UI.modal({
      title: 'Firma del paciente',
      subtitle: `${patient.name} · ${patient.documentId}`,
      submitLabel: 'Guardar firma',
      body: tpl`
        <p class="muted">Firme dentro del recuadro con el dedo, el lápiz o el mouse.</p>
        <div class="signature-pad">
          <canvas data-signature-canvas width="640" height="200" aria-label="Área de firma"></canvas>
          <span class="signature-line" aria-hidden="true"></span>
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn small" data-signature-clear>Limpiar</button>
        </div>`,
      onMount: (overlay) => {
        const canvas = overlay.querySelector('[data-signature-canvas]');
        const context = canvas.getContext && canvas.getContext('2d');
        if (!context) return;
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#152638';
        let drawing = false;

        const position = (event) => {
          const rect = canvas.getBoundingClientRect();
          return {
            x: ((event.clientX - rect.left) / rect.width) * canvas.width,
            y: ((event.clientY - rect.top) / rect.height) * canvas.height,
          };
        };

        canvas.addEventListener('pointerdown', (event) => {
          drawing = true;
          hasStrokes = true;
          if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
          const point = position(event);
          context.beginPath();
          context.moveTo(point.x, point.y);
        });
        canvas.addEventListener('pointermove', (event) => {
          if (!drawing) return;
          const point = position(event);
          context.lineTo(point.x, point.y);
          context.stroke();
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) =>
          canvas.addEventListener(type, () => {
            drawing = false;
          })
        );

        overlay.querySelector('[data-signature-clear]').addEventListener('click', () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          hasStrokes = false;
        });
      },
      onSubmit: (form) => {
        const canvas = form.querySelector('[data-signature-canvas]');
        if (!hasStrokes) throw UI.invalid('Todavía no hay ninguna firma en el recuadro.');
        if (!canvas.toDataURL) throw UI.invalid('Este navegador no permite capturar la firma.');
        return canvas.toDataURL('image/png');
      },
    });

    if (!result) return;
    Store.setSignature(result);
    UI.toast('Firma registrada');
  }

  function wirePatientMedia(root) {
    const photo = root.querySelector('[data-photo-upload]');
    if (photo) {
      photo.addEventListener('change', () => {
        const file = photo.files && photo.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          Store.setPatientPhoto(String(reader.result));
          UI.toast('Foto actualizada');
        });
        reader.readAsDataURL(file);
      });
    }
    const sign = root.querySelector('[data-sign-patient]');
    if (sign) sign.addEventListener('click', () => signatureDialog());
    const clear = root.querySelector('[data-clear-signature]');
    if (clear) {
      clear.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({
          title: 'Borrar firma',
          message: 'Se elimina la firma registrada del paciente.',
          confirmLabel: 'Borrar',
        });
        if (ok) {
          Store.setSignature(null);
          UI.toast('Firma borrada', 'warn');
        }
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Reseñas del paciente
   * ------------------------------------------------------------------ */

  function stars(rating) {
    return tpl`<span class="stars" aria-label="${rating} de 5">${Array.from({ length: 5 }, (_, index) =>
      raw(`<i class="${index < rating ? 'on' : ''}"></i>`)
    )}</span>`;
  }

  function averageRating(patient) {
    if (patient.reviews.length === 0) return null;
    const total = patient.reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / patient.reviews.length) * 10) / 10;
  }

  function renderReviews(patient) {
    const average = averageRating(patient);
    return tpl`
      <div class="reviews-board">
        <div class="reviews-head">
          ${average === null
            ? tpl`<p class="muted">Este paciente aún no ha dejado reseñas.</p>`
            : tpl`<div class="reviews-average">${stars(Math.round(average))}<b>${average}</b><span class="muted xs">${patient.reviews.length} reseña(s)</span></div>`}
          <button type="button" class="btn small" data-new-review>Registrar reseña</button>
        </div>
        ${patient.reviews.length === 0
          ? ''
          : tpl`<ul class="reviews-list">
              ${patient.reviews.map(
                (review) => tpl`<li>
                  <div class="review-head">${stars(review.rating)}<span class="muted xs">${UI.fmtDate(review.date)} · ${review.source}</span></div>
                  <p>${review.comment}</p>
                </li>`
              )}
            </ul>`}
      </div>`;
  }

  async function reviewDialog() {
    const patients = Store.getPatients();
    const preselected = clinicView.reviewPatient === 'all' ? Store.getPatient().id : clinicView.reviewPatient;
    const result = await UI.modal({
      title: 'Registrar reseña',
      subtitle: 'Función que traía el software anterior; se mantiene por paridad',
      submitLabel: 'Guardar reseña',
      body: tpl`
        <label class="form-field"><span>Paciente</span>
          <select class="input" name="patientId">
            ${patients.map(
              (patient) => tpl`<option value="${patient.id}" ${patient.id === preselected ? raw('selected') : ''}>${patient.shortName}</option>`
            )}
          </select></label>
        <label class="form-field"><span>Calificación</span>
          <select class="input" name="rating">
            ${[5, 4, 3, 2, 1].map((value) => tpl`<option value="${value}">${value} de 5</option>`)}
          </select></label>
        <label class="form-field"><span>Comentario</span>
          <textarea class="input" rows="3" name="comment" placeholder="Qué dijo el paciente"></textarea></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.comment.trim()) throw UI.invalid('Escribe el comentario de la reseña.', 'comment');
        return { patientId: values.patientId, rating: Number(values.rating), comment: values.comment.trim() };
      },
    });
    if (!result) return;
    Store.setActivePatient(result.patientId);
    Store.addRecord('reviews', {
      date: new Date().toISOString().slice(0, 10),
      source: 'Registro manual',
      rating: result.rating,
      comment: result.comment,
    });
    UI.toast('Reseña registrada');
  }

  function wireReviews(root) {
    const button = root.querySelector('[data-new-review]');
    if (button) button.addEventListener('click', () => reviewDialog());
    qsa(root, '[data-review-delete]').forEach((item) =>
      item.addEventListener('click', () => {
        UI.deleteWithUndo({
          what: 'Reseña',
          perform: () => {
            Store.setActivePatient(item.dataset.reviewPatient);
            Store.deleteRecord('reviews', item.dataset.reviewDelete);
          },
        });
      })
    );
  }

  /* ------------------------------------------------------------------ *
   * Facturación
   * ------------------------------------------------------------------ */

  function accountTotals(patient) {
    return patient.account.reduce(
      (totals, row) => {
        totals.charges += row.charge;
        totals.payments += row.payment;
        return totals;
      },
      { charges: 0, payments: 0 }
    );
  }

  /** Control de alta de movimiento, para el encabezado de la tarjeta. */
  function billingTools() {
    return tpl`<button type="button" class="btn small primary" data-account-new>${UI.icon('plus')}<span>Nuevo movimiento</span></button>`;
  }

  function renderBilling(patient) {
    const totals = accountTotals(patient);
    const balance = totals.charges - totals.payments;
    return tpl`
      <div class="billing-board">
        <div class="mini-metrics spaced-below">
          <div><span>Cargos</span><b>${UI.fmtMoney(totals.charges)}</b></div>
          <div><span>Abonos</span><b>${UI.fmtMoney(totals.payments)}</b></div>
          <div><span>Saldo</span><b class="${balance > 0 ? 'tone-warn' : 'tone-ok'}">${UI.fmtMoney(balance)}</b></div>
        </div>
        ${patient.account.length === 0
          ? tpl`<p class="empty-state">Sin movimientos registrados.
              <button type="button" class="btn small primary" data-account-new>${UI.icon('plus')}<span>Registrar el primero</span></button></p>`
          : tpl`<div class="scroll-x">
              <table class="table">
                <thead><tr><th style="width:104px">Fecha</th><th>Concepto</th><th style="width:100px">Ref.</th><th style="width:112px">Cargo</th><th style="width:112px">Abono</th><th class="actions-cell" style="width:74px"></th></tr></thead>
                <tbody>
                  ${patient.account.map(
                    (row) => tpl`<tr>
                      <td class="muted" data-label="Fecha">${UI.fmtDate(row.date)}</td>
                      <td data-label="Concepto">${row.concept}</td>
                      <td class="muted" data-label="Ref.">${row.ref ?? '—'}</td>
                      <td data-label="Cargo">${row.charge ? UI.fmtMoney(row.charge) : '—'}</td>
                      <td data-label="Abono">${row.payment ? UI.fmtMoney(row.payment) : '—'}</td>
                      <td class="actions-cell"><span class="row-actions">
                        <button type="button" class="icon-btn" data-account-edit="${row.id}" aria-label="Editar ${row.concept}">${UI.icon('pencil')}</button>
                        <button type="button" class="icon-btn" data-account-delete="${row.id}" aria-label="Eliminar ${row.concept}">${UI.icon('trash')}</button>
                      </span></td>
                    </tr>`
                  )}
                </tbody>
              </table>
            </div>`}
      </div>`;
  }

  /** Alta y edición de un movimiento de cuenta. */
  async function accountDialog(existing) {
    const base = existing ?? {
      concept: '',
      date: new Date().toISOString().slice(0, 10),
      charge: 0,
      payment: 0,
      ref: '',
    };
    const result = await UI.modal({
      title: existing ? 'Editar movimiento' : 'Nuevo movimiento',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Concepto</span>
          <input class="input" name="concept" value="${base.concept}" placeholder="Ej. Resina 47"></label>
        <div class="form-grid">
          <label class="form-field"><span>Fecha</span>
            <input class="input" type="date" name="date" value="${base.date}"></label>
          <label class="form-field"><span>Referencia</span>
            <input class="input" name="ref" value="${base.ref ?? ''}" placeholder="Ej. FV-2214"></label>
        </div>
        <div class="form-grid">
          <label class="form-field"><span>Cargo</span>
            <input class="input" name="charge" inputmode="numeric" value="${base.charge || ''}" placeholder="0"></label>
          <label class="form-field"><span>Abono</span>
            <input class="input" name="payment" inputmode="numeric" value="${base.payment || ''}" placeholder="0"></label>
        </div>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        const charge = Number(String(values.charge).replace(/\D/g, '')) || 0;
        const payment = Number(String(values.payment).replace(/\D/g, '')) || 0;
        if (!values.concept.trim()) throw UI.invalid('Escribe el concepto.', 'concept');
        if (charge === 0 && payment === 0) throw UI.invalid('Indica un cargo o un abono.', 'charge');
        return { concept: values.concept.trim(), date: values.date, ref: values.ref.trim() || '—', charge, payment };
      },
    });
    if (!result) return;
    if (existing) {
      Store.updateRecord('account', existing.id, result);
      UI.toast('Movimiento actualizado');
    } else {
      Store.addRecord('account', result);
      UI.toast('Movimiento registrado');
    }
  }

  function wireBilling(root) {
    const create = root.querySelector('[data-account-new]');
    if (create) create.addEventListener('click', () => accountDialog(null));
    qsa(root, '[data-account-edit]').forEach((button) =>
      button.addEventListener('click', () => {
        const patient = patientOwning('account', button.dataset.accountEdit);
        if (patient) Store.setActivePatient(patient.id);
        accountDialog(
          (patient ?? Store.getPatient()).account.find((row) => row.id === button.dataset.accountEdit)
        );
      })
    );
    qsa(root, '[data-account-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const patient = patientOwning('account', button.dataset.accountDelete);
        const row = (patient ?? Store.getPatient()).account.find((item) => item.id === button.dataset.accountDelete);
        UI.deleteWithUndo({
          what: `Movimiento «${row.concept}»`,
          perform: () => {
            if (patient) Store.setActivePatient(patient.id);
            Store.deleteRecord('account', row.id);
          },
        });
      })
    );
  }

  /** Encuentra a quién pertenece un registro, para editarlo desde la vista de clínica. */
  function patientOwning(collection, id) {
    return Store.getPatients().find((patient) => patient[collection].some((row) => row.id === id)) ?? null;
  }

  /* ------------------------------------------------------------------ *
   * Evolución del tratamiento en el tiempo
   * ------------------------------------------------------------------ */

  /** Línea de tiempo por fechas: qué se hizo, cuándo y qué queda pendiente. */
  function renderTreatmentProgress(patient, options = {}) {
    return tpl`
      <div class="progress-board">
        ${patient.plans.map((plan) => {
          const done = plan.items.filter((item) => item.done && item.date).sort((a, b) => a.date.localeCompare(b.date));
          const pending = plan.items.filter((item) => !item.done);
          const progress = UI.planProgress(plan);
          return tpl`
            <div class="progress-plan">
              <div class="progress-head">
                <div><b>${plan.title}</b><div class="muted xs">Inicio ${UI.fmtDate(plan.createdAt)} · ${plan.status}</div></div>
                <span class="head-actions">
                  <span class="badge blue">${progress.pct}%</span>
                  ${options.editable
                    ? tpl`<button type="button" class="icon-btn" data-plan-item-new="${plan.id}" data-plan-patient="${patient.id}" aria-label="Agregar procedimiento a ${plan.title}">${UI.icon('plus')}</button>
                        <button type="button" class="icon-btn" data-plan-edit="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar ${plan.title}">${UI.icon('pencil')}</button>
                        <button type="button" class="icon-btn" data-plan-delete="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar ${plan.title}">${UI.icon('trash')}</button>`
                    : ''}
                </span>
              </div>
              <div class="progress"><i style="width:${progress.pct}%"></i></div>
              <ol class="progress-timeline">
                ${[...done, ...pending].map(
                  (item) => tpl`<li class="${item.done ? 'done' : ''}">
                    <span class="progress-date">${item.done ? UI.fmtShort(item.date) : 'Pendiente'}</span>
                    <span class="progress-name">${item.name}${item.tooth && item.tooth !== '—' ? ` · ${item.tooth}` : ''}</span>
                    <span class="head-actions">
                      <span class="muted xs">${UI.fmtMoney(item.price)}</span>
                      ${options.editable
                        ? tpl`<button type="button" class="icon-btn" data-plan-item-edit="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Editar ${item.name}">${UI.icon('pencil')}</button>
                            <button type="button" class="icon-btn" data-plan-item-delete="${item.id}" data-plan="${plan.id}" data-plan-patient="${patient.id}" aria-label="Eliminar ${item.name}">${UI.icon('trash')}</button>`
                        : ''}
                    </span>
                  </li>`
                )}
                ${plan.items.length === 0 ? tpl`<li class="muted">Sin procedimientos.</li>` : ''}
              </ol>
            </div>`;
        })}
      </div>`;
  }

  async function planDialog(patientId, existing) {
    Store.setActivePatient(patientId);
    const result = await UI.modal({
      title: existing ? 'Editar plan' : 'Nuevo plan de tratamiento',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Título</span>
          <input class="input" name="title" value="${existing ? existing.title : ''}" placeholder="Ej. Rehabilitación superior"></label>
        <label class="form-field"><span>Estado</span>
          <select class="input" name="status">
            ${['En curso', 'Propuesto', 'Terminado', 'Suspendido'].map(
              (status) => tpl`<option value="${status}" ${existing && existing.status === status ? raw('selected') : ''}>${status}</option>`
            )}
          </select></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw UI.invalid('Escribe el título del plan.', 'title');
        return { title: values.title.trim(), status: values.status };
      },
    });
    if (!result) return;
    if (existing) {
      Store.updatePlan(existing.id, result);
      UI.toast('Plan actualizado');
    } else {
      Store.addPlan(result);
      UI.toast('Plan creado');
    }
  }

  async function planItemDialog(patientId, planId, existing) {
    Store.setActivePatient(patientId);
    const base = existing ?? { name: '', tooth: '', price: 0, done: false };
    const result = await UI.modal({
      title: existing ? 'Editar procedimiento' : 'Nuevo procedimiento',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Procedimiento</span>
          <input class="input" name="name" value="${base.name}" placeholder="Ej. Resina clase II"></label>
        <div class="form-grid">
          <label class="form-field"><span>Diente</span>
            <input class="input" name="tooth" value="${base.tooth === '—' ? '' : base.tooth}" placeholder="Ej. 36"></label>
          <label class="form-field"><span>Valor</span>
            <input class="input" name="price" inputmode="numeric" value="${base.price || ''}" placeholder="0"></label>
        </div>
        <label class="chip-check"><input type="checkbox" name="done" ${base.done ? raw('checked') : ''}><span>Ya realizado</span></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.name.trim()) throw UI.invalid('Escribe el procedimiento.', 'name');
        const done = values.done !== undefined;
        return {
          ...(existing ? { id: existing.id } : {}),
          name: values.name.trim(),
          tooth: values.tooth.trim() || '—',
          price: Number(String(values.price).replace(/\D/g, '')) || 0,
          done,
          date: done ? existing?.date ?? new Date().toISOString().slice(0, 10) : null,
        };
      },
    });
    if (!result) return;
    Store.savePlanItem(planId, result);
    UI.toast(existing ? 'Procedimiento actualizado' : 'Procedimiento agregado');
  }

  /* ------------------------------------------------------------------ *
   * Vistas de la navegación principal
   * ------------------------------------------------------------------ */

  /** Estado local de las vistas de clínica. */
  const clinicView = { treatmentPatient: 'all', treatmentSearch: '', reviewPatient: 'all' };

  /** Coincidencia por caracteres sobre el número de documento o el nombre. */
  function matchesSearch(patient, query) {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    const digits = term.replace(/\D/g, '');
    const document = String(patient.documentNumber).toLowerCase();
    const documentDigits = document.replace(/\D/g, '');
    return (
      (digits.length > 0 && documentDigits.includes(digits)) ||
      document.includes(term) ||
      patient.name.toLowerCase().includes(term) ||
      String(patient.chartNumber).toLowerCase().includes(term)
    );
  }

  function patientFilter(value, attribute) {
    return tpl`
      <label class="filter-field">
        <span class="sr-only">Filtrar por paciente</span>
        <select class="input input-sm" ${raw(attribute)}>
          <option value="all" ${value === 'all' ? raw('selected') : ''}>Todos los pacientes</option>
          ${Store.getPatients().map(
            (patient) => tpl`<option value="${patient.id}" ${value === patient.id ? raw('selected') : ''}>${patient.shortName}</option>`
          )}
        </select>
      </label>`;
  }

  function treatmentsView() {
    const patients = Store.getPatients()
      .filter((patient) => clinicView.treatmentPatient === 'all' || patient.id === clinicView.treatmentPatient)
      .filter((patient) => matchesSearch(patient, clinicView.treatmentSearch));
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Tratamientos de la clínica</h2><p>Avance por paciente, con fechas de ejecución</p></div>
          <div class="card-tools">
            <label class="search">
              <span class="sr-only">Buscar por documento o nombre</span>
              <input class="input input-sm" type="search" placeholder="Buscar por cédula o nombre…"
                value="${clinicView.treatmentSearch}" data-treatment-search>
            </label>
            ${patientFilter(clinicView.treatmentPatient, 'data-treatment-filter')}
          </div>
        </div>
        <div class="card-body">
          ${patients.length === 0
            ? tpl`<p class="empty-state">Sin pacientes que coincidan.</p>`
            : patients.map(
                (patient) => tpl`
                  <div class="clinic-block">
                    <div class="clinic-block-head">
                      <button type="button" class="link-button" data-goto-patient="${patient.id}">${patient.shortName}</button>
                      <span class="muted xs">${patient.chartNumber} · ${patient.provider}</span>
                      <button type="button" class="btn small" data-plan-new="${patient.id}">${UI.icon('plus')}<span>Plan</span></button>
                    </div>
                    ${patient.plans.length === 0
                      ? tpl`<p class="empty-state">Sin planes registrados.</p>`
                      : renderTreatmentProgress(patient, { editable: true })}
                  </div>`
              )}
        </div>
      </section>`;
  }

  function billingView() {
    const patients = Store.getPatients();
    const rows = patients
      .flatMap((patient) => patient.account.map((row) => ({ ...row, patient })))
      .sort((a, b) => b.date.localeCompare(a.date));
    const totals = rows.reduce(
      (acc, row) => {
        acc.charges += row.charge;
        acc.payments += row.payment;
        return acc;
      },
      { charges: 0, payments: 0 }
    );

    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Facturación de la clínica</h2><p>Movimientos de todos los pacientes</p></div>
          <button type="button" class="btn small" data-account-new>${UI.icon('plus')}<span>Nuevo movimiento</span></button>
        </div>
        <div class="card-body">
          <div class="mini-metrics spaced-below">
            <div><span>Cargos</span><b>${UI.fmtMoney(totals.charges)}</b></div>
            <div><span>Abonos</span><b>${UI.fmtMoney(totals.payments)}</b></div>
            <div><span>Cartera</span><b class="${totals.charges - totals.payments > 0 ? 'tone-warn' : 'tone-ok'}">${UI.fmtMoney(totals.charges - totals.payments)}</b></div>
          </div>
          <div class="scroll-x">
            <table class="table">
              <thead><tr><th style="width:104px">Fecha</th><th style="width:150px">Paciente</th><th>Concepto</th><th style="width:100px">Ref.</th><th style="width:112px">Cargo</th><th style="width:112px">Abono</th><th class="actions-cell" style="width:74px"></th></tr></thead>
              <tbody>
                ${rows.map(
                  (row) => tpl`<tr>
                    <td class="muted" data-label="Fecha">${UI.fmtDate(row.date)}</td>
                    <td data-label="Paciente"><button type="button" class="link-button" data-goto-patient="${row.patient.id}">${row.patient.shortName}</button></td>
                    <td data-label="Concepto">${row.concept}</td>
                    <td class="muted" data-label="Ref.">${row.ref ?? '—'}</td>
                    <td data-label="Cargo">${row.charge ? UI.fmtMoney(row.charge) : '—'}</td>
                    <td data-label="Abono">${row.payment ? UI.fmtMoney(row.payment) : '—'}</td>
                    <td class="actions-cell"><span class="row-actions">
                      <button type="button" class="icon-btn" data-account-edit="${row.id}" aria-label="Editar ${row.concept}">${UI.icon('pencil')}</button>
                      <button type="button" class="icon-btn" data-account-delete="${row.id}" aria-label="Eliminar ${row.concept}">${UI.icon('trash')}</button>
                    </span></td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>`;
  }

  /** Reseñas de toda la clínica: sección propia, fuera del expediente. */
  function reviewsView() {
    const patients = Store.getPatients().filter(
      (patient) => clinicView.reviewPatient === 'all' || patient.id === clinicView.reviewPatient
    );
    const all = patients.flatMap((patient) => patient.reviews.map((review) => ({ ...review, patient })));
    const average = all.length === 0 ? null : Math.round((all.reduce((sum, r) => sum + r.rating, 0) / all.length) * 10) / 10;

    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Reseñas</h2><p>${all.length} reseña(s)${average === null ? '' : ` · promedio ${average} de 5`}</p></div>
          <div class="card-tools">
            ${patientFilter(clinicView.reviewPatient, 'data-review-filter')}
            <button type="button" class="btn small primary" data-new-review>${UI.icon('plus')}<span>Registrar reseña</span></button>
          </div>
        </div>
        <div class="card-body">
          ${all.length === 0
            ? tpl`<p class="empty-state">Sin reseñas registradas.
                <button type="button" class="btn small primary" data-new-review>${UI.icon('plus')}<span>Registrar la primera</span></button></p>`
            : tpl`<ul class="reviews-list">
                ${all
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(
                    (review) => tpl`<li>
                      <div class="review-head">
                        ${stars(review.rating)}
                        <button type="button" class="link-button" data-goto-patient="${review.patient.id}">${review.patient.shortName}</button>
                        <span class="muted xs">${UI.fmtDate(review.date)} · ${review.source}</span>
                        <span class="row-actions">
                          <button type="button" class="icon-btn" data-review-delete="${review.id}" data-review-patient="${review.patient.id}" aria-label="Eliminar reseña">${UI.icon('trash')}</button>
                        </span>
                      </div>
                      <p>${review.comment}</p>
                    </li>`
                  )}
              </ul>`}
        </div>
      </section>`;
  }

  function settingsView() {
    const settings = Store.getSettings();
    return tpl`
      <section class="card">
        <div class="card-head">
          <div><h2>Doctores</h2><p>Nombre, especialidad y color en la agenda</p></div>
          <button type="button" class="btn small" data-doctor-new>${UI.icon('plus')}<span>Agregar doctor</span></button>
        </div>
        <div class="card-body">
          <ul class="doctor-list">
            ${Store.getDoctors().map((doctor) => {
              const citas = Store.doctorAppointmentCount(doctor.id);
              return tpl`<li style="--doctor:${doctor.color}">
                <i></i>
                <div class="doctor-name"><b>${doctor.name}</b><div class="muted xs">${doctor.specialty} · ${citas} cita(s)</div></div>
                <span class="row-actions">
                  <button type="button" class="icon-btn" data-doctor-edit="${doctor.id}" aria-label="Editar ${doctor.name}">${UI.icon('pencil')}</button>
                  <button type="button" class="icon-btn" data-doctor-delete="${doctor.id}" aria-label="Eliminar ${doctor.name}">${UI.icon('trash')}</button>
                </span>
              </li>`;
            })}
          </ul>
        </div>
      </section>

      <section class="card" style="margin-top:var(--gap)">
        <div class="card-head"><div><h2>Recepción de imágenes</h2><p>Correo al que llegan radiografías y tomografías</p></div></div>
        <div class="card-body">
          <label class="form-field">
            <span>Correo de entrada</span>
            <input class="input" value="${settings.intakeEmail}" data-intake-email>
          </label>
          <p class="muted xs">Se pide nombre completo y número de documento en el asunto para archivar
            las imágenes sin ambigüedad.</p>
        </div>
      </section>`;
  }

  async function doctorDialog(existing) {
    const base = existing ?? { name: '', specialty: '', color: '#2a7f9e' };
    const result = await UI.modal({
      title: existing ? 'Editar doctor' : 'Agregar doctor',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Nombre</span>
          <input class="input" name="name" value="${base.name}" placeholder="Ej. Dra. Rivera"></label>
        <div class="form-grid">
          <label class="form-field"><span>Especialidad</span>
            <input class="input" name="specialty" value="${base.specialty}" placeholder="Ej. Periodoncia"></label>
          <label class="form-field"><span>Color en la agenda</span>
            <input class="input" type="color" name="color" value="${base.color}"></label>
        </div>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.name.trim()) throw UI.invalid('Escribe el nombre del doctor.', 'name');
        return { name: values.name.trim(), specialty: values.specialty.trim() || 'General', color: values.color };
      },
    });
    if (!result) return;
    if (existing) {
      Store.updateDoctor(existing.id, result);
      UI.toast('Doctor actualizado');
    } else {
      Store.addDoctor(result);
      UI.toast('Doctor agregado');
    }
  }

  function wireSettings(root) {
    const create = root.querySelector('[data-doctor-new]');
    if (create) create.addEventListener('click', () => doctorDialog(null));
    qsa(root, '[data-doctor-edit]').forEach((button) =>
      button.addEventListener('click', () =>
        doctorDialog(Store.getDoctors().find((doctor) => doctor.id === button.dataset.doctorEdit))
      )
    );
    qsa(root, '[data-doctor-delete]').forEach((button) =>
      button.addEventListener('click', async () => {
        const id = button.dataset.doctorDelete;
        const doctor = Store.getDoctors().find((item) => item.id === id);
        if (Store.getDoctors().length <= 1) {
          UI.toast('Debe quedar al menos un doctor', 'warn');
          return;
        }
        const citas = Store.doctorAppointmentCount(id);
        if (citas > 0) {
          UI.toast(`${doctor.name} tiene ${citas} cita(s): reasígnalas antes de eliminar`, 'warn');
          return;
        }
        const ok = await UI.confirmDialog({
          title: 'Eliminar doctor',
          message: `¿Eliminar a ${doctor.name}?`,
          confirmLabel: 'Eliminar',
        });
        if (ok) {
          Store.deleteDoctor(id);
          UI.toast('Doctor eliminado', 'warn');
        }
      })
    );
    const email = root.querySelector('[data-intake-email]');
    if (email) {
      email.addEventListener('change', () => {
        Store.setSetting('intakeEmail', email.value.trim());
        UI.toast('Correo de recepción actualizado');
      });
    }
  }

  function agendaView() {
    return renderAgenda();
  }

  const VIEWS = {
    agenda: { label: 'Agenda', render: agendaView },
    treatments: { label: 'Tratamientos', render: treatmentsView },
    billing: { label: 'Facturación', render: billingView },
    reviews: { label: 'Reseñas', render: reviewsView },
    settings: { label: 'Configuración', render: settingsView },
  };

  /** Renderiza una vista de la navegación principal (no la del paciente). */
  function renderView(key) {
    const view = VIEWS[key];
    if (!view) return tpl`<p class="muted">Vista no disponible.</p>`;
    return view.render();
  }

  /** Engancha todo lo que puede aparecer en cualquier vista compartida. */
  function wireAll(root) {
    wireAgenda(root);
    wireXrays(root);
    wirePatientMedia(root);
    wireReviews(root);
    wireBilling(root);
    wireSettings(root);
    wireTreatments(root);
    wireDocuments(root);
    qsa(root, '[data-goto-patient]').forEach((button) =>
      button.addEventListener('click', () => {
        Store.setActivePatient(button.dataset.gotoPatient);
        window.location.hash = 'view=patients';
      })
    );
  }

  function wireTreatments(root) {
    const treatmentFilter = root.querySelector('[data-treatment-filter]');
    if (treatmentFilter) {
      treatmentFilter.addEventListener('change', () => {
        clinicView.treatmentPatient = treatmentFilter.value;
        Store.notify();
      });
    }

    const treatmentSearch = root.querySelector('[data-treatment-search]');
    if (treatmentSearch) {
      treatmentSearch.addEventListener('input', () => {
        clinicView.treatmentSearch = treatmentSearch.value;
        Store.notify();
        /* Tras el re-render se devuelve el foco y el cursor al buscador. */
        const next = document.querySelector('[data-treatment-search]');
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      });
    }
    const reviewFilter = root.querySelector('[data-review-filter]');
    if (reviewFilter) {
      reviewFilter.addEventListener('change', () => {
        clinicView.reviewPatient = reviewFilter.value;
        Store.notify();
      });
    }
    qsa(root, '[data-plan-new]').forEach((button) =>
      button.addEventListener('click', () => planDialog(button.dataset.planNew, null))
    );
    qsa(root, '[data-plan-edit]').forEach((button) =>
      button.addEventListener('click', () => {
        const patient = Store.getPatients().find((item) => item.id === button.dataset.planPatient);
        planDialog(patient.id, patient.plans.find((plan) => plan.id === button.dataset.planEdit));
      })
    );
    qsa(root, '[data-plan-delete]').forEach((button) =>
      button.addEventListener('click', async () => {
        const patient = Store.getPatients().find((item) => item.id === button.dataset.planPatient);
        const plan = patient.plans.find((entry) => entry.id === button.dataset.planDelete);
        const ok = await UI.confirmDialog({
          title: 'Eliminar plan',
          message: `¿Eliminar "${plan.title}" y sus procedimientos?`,
          confirmLabel: 'Eliminar',
        });
        if (ok) {
          Store.setActivePatient(patient.id);
          Store.deletePlan(plan.id);
          UI.toast('Plan eliminado', 'warn');
        }
      })
    );
    qsa(root, '[data-plan-item-new]').forEach((button) =>
      button.addEventListener('click', () => planItemDialog(button.dataset.planPatient, button.dataset.planItemNew, null))
    );
    qsa(root, '[data-plan-item-edit]').forEach((button) =>
      button.addEventListener('click', () => {
        const patient = Store.getPatients().find((item) => item.id === button.dataset.planPatient);
        const plan = patient.plans.find((entry) => entry.id === button.dataset.plan);
        planItemDialog(patient.id, plan.id, plan.items.find((item) => item.id === button.dataset.planItemEdit));
      })
    );
    qsa(root, '[data-plan-item-delete]').forEach((button) =>
      button.addEventListener('click', () => {
        const patient = Store.getPatients().find((item) => item.id === button.dataset.planPatient);
        const plan = patient.plans.find((entry) => entry.id === button.dataset.plan);
        const item = plan.items.find((entry) => entry.id === button.dataset.planItemDelete);
        UI.deleteWithUndo({
          what: `Procedimiento «${item.name}»`,
          perform: () => {
            Store.setActivePatient(patient.id);
            Store.deletePlanItem(plan.id, item.id);
          },
        });
      })
    );
  }

  window.ProtoClinic = {
    VIEWS,
    renderView,
    renderAgenda,
    wireAgenda,
    patientAppointments,
    renderPatientAppointments,
    renderXrays,
    wireXrays,
    renderDocuments,
    documentsTools,
    xraysTools,
    billingTools,
    documentDialog,
    wireDocuments,
    renderPatientPhoto,
    renderSignature,
    wirePatientMedia,
    signatureDialog,
    renderReviews,
    wireReviews,
    averageRating,
    renderBilling,
    wireBilling,
    accountTotals,
    renderTreatmentProgress,
    wireTreatments,
    wireSettings,
    planDialog,
    planItemDialog,
    wireAll,
  };
})();
