/* Store del prototipo: estado en memoria + persistencia en localStorage.
   Las tres opciones de diseño comparten este store, así que un cambio hecho en una
   se ve en las otras (incluso en otra pestaña, vía el evento `storage`). */

(function () {

  const Data = window.ProtoData;
  const seedData = Data.seedData;

  const KEY = 'avance-clinical-prototype';
  const listeners = new Set();

  function clone(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seedData();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== seedData().version) return seedData();
      return parsed;
    } catch {
      return seedData();
    }
  }

  let state = read();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* modo incógnito o storage bloqueado: el prototipo sigue en memoria */
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  }

  /** Fuerza un re-render sin cambiar el estado; lo usan las vistas con estado
      local, como la agenda (semana visible, filtro de doctores). */
  function notify() {
    emit();
  }

  function getState() {
    return state;
  }

  function getPatients() {
    return state.patients;
  }

  function getPatient(id = state.activePatientId) {
    return state.patients.find((p) => p.id === id) ?? state.patients[0];
  }

  /* --- deshacer (recomendación 04) --- */

  /** Última instantánea antes de una acción reversible. */
  let undoEntry = null;

  /**
   * Guarda el estado completo antes de un borrado, para poder revertirlo.
   * Solo se conserva la última: es un deshacer inmediato, no un historial.
   */
  function snapshot(label) {
    undoEntry = { label, state: clone(state), at: Date.now() };
  }

  function canUndo() {
    return undoEntry !== null;
  }

  function undoLabel() {
    return undoEntry ? undoEntry.label : null;
  }

  function undo() {
    if (!undoEntry) return null;
    const { label } = undoEntry;
    state = undoEntry.state;
    undoEntry = null;
    persist();
    emit();
    return label;
  }

  function clearUndo() {
    undoEntry = null;
  }

  /* --- sello de guardado (recomendación 16) --- */

  let lastSave = null;

  function markSaved(what) {
    lastSave = { what, at: Date.now(), by: 'Dra. Rivera' };
  }

  function getLastSave() {
    return lastSave;
  }

  function commit(mutator) {
    const draft = clone(state);
    const result = mutator(draft, draft.patients.find((p) => p.id === draft.activePatientId));
    state = draft;
    persist();
    emit();
    return result;
  }

  /* --- mutaciones --- */

  function setActivePatient(id) {
    if (!state.patients.some((p) => p.id === id)) return;
    commit((draft) => {
      draft.activePatientId = id;
    });
  }

  /** Escribe una ruta con puntos, p. ej. 'guardian.phone' o 'email'. */
  function setPatientField(path, value) {
    markSaved(path);
    commit((_draft, patient) => {
      const parts = path.split('.');
      let target = patient;
      for (const part of parts.slice(0, -1)) {
        if (target[part] == null || typeof target[part] !== 'object') target[part] = {};
        target = target[part];
      }
      target[parts[parts.length - 1]] = value;
    });
  }

  function saveEncounter(encounter) {
    return commit((_draft, patient) => {
      if (encounter.id) {
        const index = patient.encounters.findIndex((e) => e.id === encounter.id);
        if (index >= 0) {
          const previous = patient.encounters[index];
          patient.encounters[index] = {
            ...previous,
            ...encounter,
            versions: (previous.versions ?? 1) + 1,
          };
          return patient.encounters[index];
        }
      }
      const created = {
        diagnoses: [],
        vitals: {},
        procedures: [],
        signed: false,
        versions: 1,
        ...encounter,
        id: `e-${Date.now()}`,
      };
      patient.encounters.unshift(created);
      patient.encounters.sort((a, b) => b.date.localeCompare(a.date));
      return created;
    });
  }

  function deleteEncounter(id) {
    commit((_draft, patient) => {
      patient.encounters = patient.encounters.filter((e) => e.id !== id);
    });
  }

  function signEncounter(id) {
    commit((_draft, patient) => {
      const found = patient.encounters.find((e) => e.id === id);
      if (found) found.signed = true;
    });
  }

  function addHistoryItem(sectionKey, item) {
    commit((_draft, patient) => {
      const section = patient.history.find((s) => s.key === sectionKey);
      if (!section) return;
      section.items.push({
        id: `hi-${Date.now()}`,
        source: 'clinician',
        active: true,
        context: '',
        ...item,
      });
      section.review = { state: 'changed', at: section.review.at, by: section.review.by };
    });
  }

  /** Edita un dato de antecedentes; queda pendiente de revisión otra vez. */
  function updateHistoryItem(sectionKey, itemId, patch) {
    commit((_draft, patient) => {
      const section = patient.history.find((s) => s.key === sectionKey);
      const item = section?.items.find((i) => i.id === itemId);
      if (!item) return;
      Object.assign(item, patch);
      section.review = { state: 'changed', at: section.review.at, by: section.review.by };
    });
  }

  function removeHistoryItem(sectionKey, itemId) {
    commit((_draft, patient) => {
      const section = patient.history.find((s) => s.key === sectionKey);
      if (!section) return;
      section.items = section.items.filter((i) => i.id !== itemId);
      section.review = { state: 'changed', at: section.review.at, by: section.review.by };
    });
  }

  function reviewHistorySection(sectionKey, by = 'Dra. Rivera') {
    commit((_draft, patient) => {
      const section = patient.history.find((s) => s.key === sectionKey);
      if (!section) return;
      section.review = { state: 'reviewed', at: new Date().toISOString().slice(0, 10), by };
    });
  }

  function togglePlanItem(planId, itemId) {
    commit((_draft, patient) => {
      const plan = patient.plans.find((p) => p.id === planId);
      const item = plan?.items.find((i) => i.id === itemId);
      if (!item) return;
      item.done = !item.done;
      item.date = item.done ? new Date().toISOString().slice(0, 10) : null;
    });
  }

  function savePrescription(prescription) {
    return commit((_draft, patient) => {
      const created = {
        id: `fx-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        provider: patient.provider,
        status: 'Vigente',
        ...prescription,
      };
      patient.prescriptions.unshift(created);
      return created;
    });
  }

  function setDocumentStatus(id, status) {
    commit((_draft, patient) => {
      const doc = patient.documents.find((d) => d.id === id);
      if (doc) doc.status = status;
    });
  }

  /* --- expediente dental: odontograma, periodontograma y biopelícula --- */

  /**
   * Aplica un cambio sin avisar a los suscriptores. Lo usa la carga de sondaje
   * por teclado, que actualiza en el sitio para no perder el foco del input.
   */
  function commitSilent(mutator) {
    const result = mutator(state, state.patients.find((p) => p.id === state.activePatientId));
    persist();
    return result;
  }

  function updateTooth(fdi, patch) {
    commit((_draft, patient) => {
      const tooth = patient.dental.teeth[fdi];
      if (!tooth) return;
      Object.assign(tooth, patch);
    });
  }

  /** Asignar el hallazgo que la cara ya tenía lo quita. */
  function toggleSurfaceFinding(fdi, surface, finding) {
    commit((_draft, patient) => {
      const surfaces = patient.dental.teeth[fdi].surfaces;
      if (surfaces[surface] === finding) delete surfaces[surface];
      else surfaces[surface] = finding;
    });
  }

  function setComplementaryDiagnosis(text) {
    commitSilent((_draft, patient) => {
      patient.dental.complementaryDiagnosis = text;
    });
  }

  const PERIO_FIELD = { PLP: 'plp', PB: 'pb', MG: 'mg' };
  const PERIO_RANGE = { PLP: [0, 15], PB: [0, 15], MG: [-5, 5] };

  /** Recorta al rango clínico de la fila; texto vacío deja el sitio en 0. */
  function parseMeasurement(row, input) {
    const trimmed = String(input ?? '').trim();
    if (trimmed === '') return 0;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return 0;
    const [min, max] = PERIO_RANGE[row] ?? [0, 15];
    return Math.min(Math.max(Math.round(parsed), min), max);
  }

  /** Devuelve el valor efectivamente guardado, ya recortado. */
  function setPerioMeasurement(fdi, face, site, row, input) {
    const value = parseMeasurement(row, input);
    commitSilent((_draft, patient) => {
      patient.dental.perio[fdi][face][site][PERIO_FIELD[row]] = value;
    });
    return value;
  }

  function togglePerioFlag(fdi, face, site, flag, silent = false) {
    const apply = (_draft, patient) => {
      const target = patient.dental.perio[fdi][face][site];
      target[flag] = !target[flag];
    };
    if (silent) commitSilent(apply);
    else commit(apply);
  }

  /** Guarda de una vez las seis mediciones de un diente y sus banderas. */
  function savePerioTooth(fdi, values) {
    commit((_draft, patient) => {
      const record = patient.dental.perio[fdi];
      if (!record) return;
      ['buccal', 'lingual'].forEach((face) => {
        ['mesial', 'central', 'distal'].forEach((site) => {
          const input = values.faces[face][site];
          record[face][site] = {
            plp: parseMeasurement('PLP', input.plp),
            pb: parseMeasurement('PB', input.pb),
            mg: parseMeasurement('MG', input.mg),
            bleeding: Boolean(input.bleeding),
            suppuration: Boolean(input.suppuration),
          };
        });
      });
      record.mobility = values.mobility;
      record.furcation = values.furcation;
    });
  }

  function clearPerioTooth(fdi) {
    commit((_draft, patient) => {
      const record = patient.dental.perio[fdi];
      if (!record) return;
      ['buccal', 'lingual'].forEach((face) => {
        ['mesial', 'central', 'distal'].forEach((site) => {
          record[face][site] = { plp: 0, pb: 0, mg: 0, bleeding: false, suppuration: false };
        });
      });
      record.mobility = 0;
      record.furcation = null;
    });
  }

  function setMobility(fdi, mobility) {
    commit((_draft, patient) => {
      patient.dental.perio[fdi].mobility = mobility;
    });
  }

  function setFurcation(fdi, furcation) {
    commit((_draft, patient) => {
      patient.dental.perio[fdi].furcation = furcation;
    });
  }

  function toggleBiofilmCell(fdi, face, cell) {
    commit((_draft, patient) => {
      const target = patient.dental.biofilm[fdi][face];
      target[cell] = !target[cell];
    });
  }

  function clearBiofilm() {
    commit((_draft, patient) => {
      Object.values(patient.dental.biofilm).forEach((record) => {
        ['buccal', 'lingual'].forEach((face) => {
          Object.keys(record[face]).forEach((cell) => {
            record[face][cell] = false;
          });
        });
      });
    });
  }

  /* --- agenda, imágenes, firma, reseñas y ajustes de clínica --- */

  function getDoctors() {
    return state.doctors;
  }

  function getAppointments() {
    return state.appointments;
  }

  function getSettings() {
    return state.settings;
  }

  function saveAppointment(appointment) {
    return commit((draft) => {
      if (appointment.id) {
        const index = draft.appointments.findIndex((a) => a.id === appointment.id);
        if (index >= 0) {
          draft.appointments[index] = { ...draft.appointments[index], ...appointment };
          return draft.appointments[index];
        }
      }
      const created = { status: 'Por confirmar', minutes: 30, encounterId: null, ...appointment, id: `ap-${Date.now()}` };
      draft.appointments.push(created);
      draft.appointments.sort((a, b) => a.start.localeCompare(b.start));
      return created;
    });
  }

  function setAppointmentStatus(id, status) {
    commit((draft) => {
      const found = draft.appointments.find((a) => a.id === id);
      if (found) found.status = status;
    });
  }

  function deleteAppointment(id) {
    commit((draft) => {
      draft.appointments = draft.appointments.filter((a) => a.id !== id);
    });
  }

  /** La foto y la firma se guardan como data URL; nunca salen del navegador. */
  function setPatientPhoto(dataUrl) {
    commit((_draft, patient) => {
      patient.photo = dataUrl;
    });
  }

  function setSignature(dataUrl) {
    commit((_draft, patient) => {
      patient.signature = dataUrl;
    });
  }

  function addXray(xray) {
    return commit((_draft, patient) => {
      const created = { id: `rx-${Date.now()}`, source: 'Carga manual', tone: 'periapical', tooth: null, ...xray };
      patient.xrays.unshift(created);
      return created;
    });
  }

  function deleteXray(id) {
    commit((_draft, patient) => {
      patient.xrays = patient.xrays.filter((x) => x.id !== id);
    });
  }

  function addReview(review) {
    return commit((_draft, patient) => {
      const created = { id: `rv-${Date.now()}`, date: new Date().toISOString().slice(0, 10), source: 'Registro manual', ...review };
      patient.reviews.unshift(created);
      return created;
    });
  }


  function setSetting(key, value) {
    commit((draft) => {
      draft.settings[key] = value;
    });
  }

  /* --- CRUD genérico sobre las colecciones del paciente --- */

  const COLLECTIONS = ['xrays', 'documents', 'prescriptions', 'account', 'reviews', 'estimates'];

  function nextId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /** Crea un registro en una colección del paciente activo. */
  function addRecord(collection, record) {
    if (!COLLECTIONS.includes(collection)) return null;
    return commit((_draft, patient) => {
      const created = { id: nextId(collection.slice(0, 2)), ...record };
      patient[collection].unshift(created);
      return created;
    });
  }

  function updateRecord(collection, id, patch) {
    if (!COLLECTIONS.includes(collection)) return;
    commit((_draft, patient) => {
      const found = patient[collection].find((item) => item.id === id);
      if (found) Object.assign(found, patch);
    });
  }

  function deleteRecord(collection, id) {
    if (!COLLECTIONS.includes(collection)) return;
    commit((_draft, patient) => {
      patient[collection] = patient[collection].filter((item) => item.id !== id);
    });
  }

  /* --- pacientes --- */

  function addPatient(values) {
    return commit((draft) => {
      const created = Data.emptyPatient(draft.patients, values);
      draft.patients.push(created);
      draft.activePatientId = created.id;
      return created;
    });
  }

  function updatePatient(id, patch) {
    commit((draft) => {
      const patient = draft.patients.find((item) => item.id === id);
      if (patient) Object.assign(patient, patch);
    });
  }

  function deletePatient(id) {
    commit((draft) => {
      if (draft.patients.length <= 1) return;
      draft.patients = draft.patients.filter((patient) => patient.id !== id);
      draft.appointments = draft.appointments.filter((item) => item.patientId !== id);
      if (draft.activePatientId === id) draft.activePatientId = draft.patients[0].id;
    });
  }

  /* --- doctores --- */

  function addDoctor(values) {
    return commit((draft) => {
      const initials = values.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
      const created = { id: nextId('dr'), initials: initials || 'DR', ...values };
      draft.doctors.push(created);
      return created;
    });
  }

  function updateDoctor(id, patch) {
    commit((draft) => {
      const doctor = draft.doctors.find((item) => item.id === id);
      if (doctor) Object.assign(doctor, patch);
    });
  }

  /** Un doctor con citas no se borra: primero hay que reasignarlas. */
  function doctorAppointmentCount(id) {
    return state.appointments.filter((item) => item.doctorId === id).length;
  }

  function deleteDoctor(id) {
    commit((draft) => {
      if (draft.doctors.length <= 1) return;
      draft.doctors = draft.doctors.filter((doctor) => doctor.id !== id);
    });
  }

  /* --- planes de tratamiento --- */

  function addPlan(values) {
    return commit((_draft, patient) => {
      const created = {
        id: nextId('pl'),
        status: 'En curso',
        createdAt: new Date().toISOString().slice(0, 10),
        items: [],
        ...values,
      };
      patient.plans.unshift(created);
      return created;
    });
  }

  function updatePlan(planId, patch) {
    commit((_draft, patient) => {
      const plan = patient.plans.find((item) => item.id === planId);
      if (plan) Object.assign(plan, patch);
    });
  }

  function deletePlan(planId) {
    commit((_draft, patient) => {
      patient.plans = patient.plans.filter((plan) => plan.id !== planId);
    });
  }

  function savePlanItem(planId, item) {
    commit((_draft, patient) => {
      const plan = patient.plans.find((entry) => entry.id === planId);
      if (!plan) return;
      if (item.id) {
        const found = plan.items.find((entry) => entry.id === item.id);
        if (found) Object.assign(found, item);
        return;
      }
      plan.items.push({ id: nextId('pi'), done: false, date: null, ...item });
    });
  }

  function deletePlanItem(planId, itemId) {
    commit((_draft, patient) => {
      const plan = patient.plans.find((entry) => entry.id === planId);
      if (plan) plan.items = plan.items.filter((item) => item.id !== itemId);
    });
  }

  /* --- catálogo de hallazgos del odontograma --- */

  function saveSurfaceFinding(finding) {
    commit((draft) => {
      const list = draft.settings.surfaceFindings;
      const found = list.find((item) => item.key === finding.key);
      if (found) Object.assign(found, finding);
      else list.push(finding);
    });
  }

  /** Al borrar un hallazgo se limpia de todas las caras que lo usaban. */
  function deleteSurfaceFinding(key) {
    commit((draft) => {
      draft.settings.surfaceFindings = draft.settings.surfaceFindings.filter((item) => item.key !== key);
      draft.patients.forEach((patient) => {
        Object.values(patient.dental.teeth).forEach((tooth) => {
          Object.keys(tooth.surfaces).forEach((surface) => {
            if (tooth.surfaces[surface] === key) delete tooth.surfaces[surface];
          });
        });
      });
    });
  }

  function resetDemo() {
    state = seedData();
    persist();
    emit();
  }

  /* Sincroniza entre pestañas abiertas del prototipo. */
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    state = read();
    emit();
  });

  window.ProtoStore = {
    subscribe,
    notify,
    getState,
    getPatients,
    getPatient,
    setActivePatient,
    setPatientField,
    saveEncounter,
    deleteEncounter,
    signEncounter,
    addHistoryItem,
    updateHistoryItem,
    removeHistoryItem,
    reviewHistorySection,
    togglePlanItem,
    savePrescription,
    setDocumentStatus,
    resetDemo,
    snapshot,
    undo,
    canUndo,
    undoLabel,
    clearUndo,
    markSaved,
    getLastSave,
    getDoctors,
    getAppointments,
    getSettings,
    saveAppointment,
    setAppointmentStatus,
    deleteAppointment,
    setPatientPhoto,
    setSignature,
    addXray,
    deleteXray,
    addReview,
    setSetting,
    addRecord,
    updateRecord,
    deleteRecord,
    addPatient,
    updatePatient,
    deletePatient,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    doctorAppointmentCount,
    addPlan,
    updatePlan,
    deletePlan,
    savePlanItem,
    deletePlanItem,
    saveSurfaceFinding,
    deleteSurfaceFinding,
    updateTooth,
    toggleSurfaceFinding,
    setComplementaryDiagnosis,
    parseMeasurement,
    setPerioMeasurement,
    togglePerioFlag,
    setMobility,
    setFurcation,
    savePerioTooth,
    clearPerioTooth,
    toggleBiofilmCell,
    clearBiofilm,
  };
})();
