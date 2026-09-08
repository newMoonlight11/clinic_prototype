/* Datos de demostración del expediente clínico.
   El vocabulario sigue el del CRM real (workspaceSections, clinicalRecord, historyReview). */

(function () {

  const SECTIONS = [
    { key: 'summary', label: 'Resumen' },
    { key: 'chart', label: 'Odontograma' },
    { key: 'perio', label: 'Periodontograma' },
    { key: 'biofilm', label: 'Biopelícula' },
    { key: 'evolutions', label: 'Evoluciones' },
    { key: 'treatments', label: 'Tratamientos' },
    { key: 'prescriptions', label: 'Fórmulas' },
    { key: 'xrays', label: 'Radiografías' },
    { key: 'documents', label: 'Documentos' },
    { key: 'appointments', label: 'Citas' },
    { key: 'account', label: 'Cuenta' },
  ];

  const TREATMENT_VIEWS = [
    { key: 'plans', label: 'Planes' },
    { key: 'estimates', label: 'Presupuestos' },
    { key: 'performed', label: 'Realizados' },
  ];

  const ENCOUNTER_KINDS = {
    initial: 'Consulta inicial',
    followUp: 'Control',
    urgent: 'Urgencia',
  };

  const REVIEW_STATES = {
    reviewed: { label: 'Revisado', tone: 'ok' },
    changed: { label: 'Cambió desde la revisión', tone: 'warn' },
    none: { label: 'Sin revisión', tone: 'warn' },
  };

  const HISTORY_SOURCES = {
    patient: 'Paciente',
    guardian: 'Acudiente',
    clinician: 'Profesional',
    record: 'Registro externo',
  };

  /* ---------- Agenda de la clínica ---------- */

  /** Cada doctor tiene su color; es el identificador de color de la agenda. */
  const DOCTORS = [
    { id: 'dr-rivera', name: 'Dra. Rivera', specialty: 'Periodoncia', color: '#246bce', initials: 'DR' },
    { id: 'dr-pena', name: 'Dr. Peña', specialty: 'Endodoncia', color: '#0d8c87', initials: 'DP' },
    { id: 'dr-solano', name: 'Dra. Solano', specialty: 'Ortodoncia', color: '#a3559b', initials: 'DS' },
  ];

  const APPOINTMENT_STATUS = ['Confirmada', 'Por confirmar', 'Cumplida', 'Cancelada', 'No asistió'];

  /** Tipos de documento de identidad; se guardan aparte del número. */
  const DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'RC', 'PA', 'NIT'];

  /** Categorías de imagen diagnóstica. Tomografía va aparte de radiografía. */
  const IMAGE_TYPES = ['Panorámica', 'Periapical', 'Bitewing', 'Cefálica', 'Tomografía'];

  /** Tono del marcador visual por categoría. */
  const IMAGE_TONES = {
    'Panorámica': 'pano',
    'Periapical': 'periapical',
    'Bitewing': 'bitewing',
    'Cefálica': 'ceph',
    'Tomografía': 'cbct',
  };

  const PAYERS = ['Sura', 'Colsanitas', 'Nueva EPS', 'Particular'];

  /** Consultorios disponibles. */
  const ROOMS = ['Consultorio 1', 'Consultorio 2', 'Consultorio 3'];

  /** Semana de demostración: lunes 7 a sábado 12 de septiembre de 2026. */
  function appointments() {
    return [
      // Historial (semanas anteriores)
      { id: 'ap-h1', patientId: 'p-maria', doctorId: 'dr-pena', start: '2026-08-15T09:00', minutes: 60, title: 'Profilaxis y valoración inicial', room: 'Consultorio 1', status: 'Cumplida', encounterId: 'e-1' },
      { id: 'ap-h2', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-08-28T16:10', minutes: 30, title: 'Revisión de plan de tratamiento', room: 'Consultorio 2', status: 'Cumplida', encounterId: 'e-2' },
      { id: 'ap-h3', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-04T10:30', minutes: 60, title: 'Control periodontal', room: 'Consultorio 2', status: 'Cumplida', encounterId: 'e-3' },
      { id: 'ap-h4', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-08-20T11:00', minutes: 45, title: 'Valoración inicial', room: 'Consultorio 1', status: 'Cumplida', encounterId: 'ce-1' },
      { id: 'ap-h5', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-02T15:00', minutes: 60, title: 'Urgencia · pulpitis 36', room: 'Consultorio 1', status: 'Cumplida', encounterId: 'ce-2' },
      { id: 'ap-h6', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-08-14T09:00', minutes: 30, title: 'Control de ortodoncia', room: 'Consultorio 3', status: 'Cumplida', encounterId: 'le-1' },
      { id: 'ap-h7', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-07-17T09:00', minutes: 30, title: 'Control de ortodoncia', room: 'Consultorio 3', status: 'Cumplida', encounterId: null },
      { id: 'ap-h8', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-07-30T08:30', minutes: 30, title: 'Valoración periodontal', room: 'Consultorio 2', status: 'No asistió', encounterId: null },

      // Semana en curso
      { id: 'ap-1', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-07T08:00', minutes: 60, title: 'Endodoncia 36 · sesión 1', room: 'Consultorio 1', status: 'Cumplida', encounterId: null },
      { id: 'ap-2', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-09-07T10:00', minutes: 30, title: 'Control de ortodoncia', room: 'Consultorio 3', status: 'Confirmada', encounterId: null },
      { id: 'ap-3', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-07T14:00', minutes: 45, title: 'Higiene y control', room: 'Consultorio 2', status: 'Confirmada', encounterId: null },
      { id: 'ap-4', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-08T09:30', minutes: 45, title: 'Resina 47', room: 'Consultorio 1', status: 'Confirmada', encounterId: null },
      { id: 'ap-5', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-09-08T11:00', minutes: 30, title: 'Cambio de ligaduras', room: 'Consultorio 3', status: 'Por confirmar', encounterId: null },
      { id: 'ap-6', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-08T15:00', minutes: 60, title: 'RAR cuadrante 4', room: 'Consultorio 2', status: 'Confirmada', encounterId: null },
      { id: 'ap-7', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-09T15:00', minutes: 90, title: 'Endodoncia 36 · sesión 2', room: 'Consultorio 1', status: 'Confirmada', encounterId: null },
      { id: 'ap-8', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-09-09T08:30', minutes: 30, title: 'Control de ortodoncia', room: 'Consultorio 3', status: 'Confirmada', encounterId: null },
      { id: 'ap-9', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-10T09:00', minutes: 45, title: 'Reevaluación periodontal', room: 'Consultorio 2', status: 'Por confirmar', encounterId: null },
      { id: 'ap-10', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-10T11:30', minutes: 60, title: 'Corona 36 · toma de impresión', room: 'Consultorio 1', status: 'Confirmada', encounterId: null },
      { id: 'ap-11', patientId: 'p-lucia', doctorId: 'dr-solano', start: '2026-09-11T09:00', minutes: 30, title: 'Control de ortodoncia', room: 'Consultorio 3', status: 'Por confirmar', encounterId: null },
      { id: 'ap-12', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-11T16:00', minutes: 30, title: 'Firma de consentimiento', room: 'Consultorio 2', status: 'Confirmada', encounterId: null },
      { id: 'ap-13', patientId: 'p-carlos', doctorId: 'dr-pena', start: '2026-09-12T08:00', minutes: 45, title: 'Control postoperatorio', room: 'Consultorio 1', status: 'Confirmada', encounterId: null },
      { id: 'ap-14', patientId: 'p-maria', doctorId: 'dr-rivera', start: '2026-09-19T10:30', minutes: 60, title: 'Control periodontal', room: 'Consultorio 2', status: 'Confirmada', encounterId: null },
    ];
  }

  /* ---------- Numeración FDI y expediente dental ---------- */

  const Q1 = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const Q2 = ['21', '22', '23', '24', '25', '26', '27', '28'];
  const Q3 = ['31', '32', '33', '34', '35', '36', '37', '38'];
  const Q4 = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const Q5 = ['55', '54', '53', '52', '51'];
  const Q6 = ['61', '62', '63', '64', '65'];
  const Q7 = ['71', '72', '73', '74', '75'];
  const Q8 = ['85', '84', '83', '82', '81'];

  const PERMANENT = [...Q1, ...Q2, ...Q3, ...Q4];
  const PRIMARY = [...Q5, ...Q6, ...Q7, ...Q8];
  const ALL_TEETH = [...PERMANENT, ...PRIMARY];

  /** Filas del arco tal como se dibujan, de arriba hacia abajo. */
  const ARCH_ROWS = [
    [...Q1, ...Q2],
    [...Q5, ...Q6],
    [...Q8, ...Q7],
    [...Q4, ...Q3],
  ];
  const UPPER_ROW = [...Q1, ...Q2];
  const LOWER_ROW = [...Q4, ...Q3];

  const PERIO_SITES = ['mesial', 'central', 'distal'];

  /** Perfiles de sondaje usados para sembrar el caso de demostración. */
  const PERIO_PROFILES = {
    healthy: [
      { pb: 2, mg: 0 },
      { pb: 2, mg: 0 },
      { pb: 3, mg: 0 },
    ],
    mild: [
      { pb: 3, mg: 0, bleeding: true },
      { pb: 3, mg: 0 },
      { pb: 4, mg: -1, bleeding: true },
    ],
    severe: [
      { pb: 6, mg: -2, bleeding: true },
      { pb: 5, mg: -1, bleeding: true },
      { pb: 7, mg: -2, bleeding: true, suppuration: true },
    ],
  };

  function perioSiteFrom(seed) {
    const recession = seed.mg < 0 ? Math.abs(seed.mg) : 0;
    return {
      plp: seed.pb + recession,
      pb: seed.pb,
      mg: seed.mg,
      bleeding: Boolean(seed.bleeding),
      suppuration: Boolean(seed.suppuration),
    };
  }

  function perioFaceFrom(profile) {
    const seeds = PERIO_PROFILES[profile] ?? PERIO_PROFILES.healthy;
    const face = {};
    PERIO_SITES.forEach((site, index) => {
      face[site] = perioSiteFrom(seeds[index]);
    });
    return face;
  }

  const emptyBiofilmFace = () => ({ mesial: false, distal: false, cervical: false, incisal: false });

  /**
   * Expande la semilla compacta de un paciente al expediente dental completo:
   * 52 dientes, 32 registros periodontales y 52 de biopelícula.
   */
  function buildDentalChart(seed = {}) {
    const teeth = {};
    ALL_TEETH.forEach((fdi) => {
      const toothSeed = (seed.teeth && seed.teeth[fdi]) || {};
      const primary = PRIMARY.includes(fdi);
      teeth[fdi] = {
        fdi,
        state: toothSeed.state ?? (primary && !seed.primaryPresent ? 'absent' : 'present'),
        surfaces: { ...(toothSeed.surfaces ?? {}) },
        findings: [...(toothSeed.findings ?? [])],
        ortho: toothSeed.ortho ?? null,
        note: toothSeed.note ?? '',
      };
    });

    const perio = {};
    PERMANENT.forEach((fdi) => {
      const profile = (seed.perio && seed.perio[fdi]) || 'healthy';
      perio[fdi] = {
        fdi,
        buccal: perioFaceFrom(profile),
        lingual: perioFaceFrom(profile === 'severe' ? 'mild' : profile),
        mobility: (seed.mobility && seed.mobility[fdi]) ?? 0,
        furcation: (seed.furcation && seed.furcation[fdi]) ?? null,
      };
    });

    const biofilm = {};
    ALL_TEETH.forEach((fdi) => {
      const record = { fdi, buccal: emptyBiofilmFace(), lingual: emptyBiofilmFace() };
      ((seed.biofilm && seed.biofilm[fdi]) || []).forEach((face) => {
        record[face].cervical = true;
        record[face].mesial = true;
      });
      biofilm[fdi] = record;
    });

    return { teeth, perio, biofilm, complementaryDiagnosis: '' };
  }

  function patientMaria() {
    return {
      id: 'p-maria',
      name: 'María González López',
      shortName: 'María González',
      initials: 'MG',
      chartNumber: 'HC-02481',
      documentType: 'CC',
      documentNumber: '1.020.312.884',
      birthDate: '1992-03-12',
      sex: 'Femenino',
      phone: '+57 320 481 9902',
      email: 'maria.gonzalez@email.com',
      address: 'Cra 43A #18-11, Medellín',
      payer: 'Sura',
      zone: 'Urbana',
      birthplaceCity: 'Medellín',
      referredBy: 'Dra. Patricia Ruiz',
      guardian: { name: '—', relationship: '—', phone: '—' },
      isPregnant: false,
      provider: 'Dra. Rivera',
      status: 'En consulta',
      nextAppointment: {
        title: 'Control periodontal',
        date: '2026-09-19T10:30',
        room: 'Consultorio 2',
        status: 'Confirmada',
        provider: 'Dra. Rivera',
      },
      history: [
        {
          key: 'allergies',
          label: 'Alergias',
          review: { state: 'reviewed', at: '2026-09-02', by: 'Dra. Rivera' },
          items: [
            {
              id: 'h1',
              value: 'Penicilina',
              source: 'patient',
              active: true,
              context: 'Reacción cutánea referida en 2019',
              critical: true,
            },
          ],
        },
        {
          key: 'medications',
          label: 'Medicamentos actuales',
          review: { state: 'reviewed', at: '2026-09-02', by: 'Dra. Rivera' },
          items: [
            { id: 'h2', value: 'Ibuprofeno 400 mg (ocasional)', source: 'patient', active: true, context: '' },
          ],
        },
        {
          key: 'medicalHistory',
          label: 'Antecedentes médicos',
          review: { state: 'none', at: null, by: null },
          items: [
            { id: 'h3', value: 'Gastritis en tratamiento', source: 'patient', active: true, context: 'Diagnóstico 2024' },
          ],
        },
        {
          key: 'dentalHistory',
          label: 'Antecedentes odontológicos',
          review: { state: 'changed', at: '2026-08-15', by: 'Dr. Peña' },
          items: [
            { id: 'h4', value: 'Periodontitis crónica localizada', source: 'clinician', active: true, context: '' },
            { id: 'h5', value: 'Bruxismo nocturno', source: 'patient', active: true, context: 'Usa placa desde 2023' },
          ],
        },
      ],
      encounters: [
        {
          id: 'e-3',
          date: '2026-09-04T10:30',
          kind: 'followUp',
          provider: 'Dra. Rivera',
          title: 'Control periodontal',
          chiefComplaint: 'Sangrado al cepillado en zona posterior derecha.',
          currentIllness: 'Refiere disminución del sangrado tras raspaje realizado el 15 de agosto.',
          physicalExam: 'Encía marginal con eritema leve en 16 y 46. Profundidad al sondaje 4 mm en 16 distal.',
          impression: 'Periodontitis estadio II localizada, en respuesta favorable al tratamiento.',
          plan: 'Continuar higiene con técnica de Bass. Control en 4 semanas con reevaluación de bolsas.',
          diagnoses: ['K05.3 Periodontitis crónica'],
          vitals: { bloodPressure: '118/76', heartRate: '72', temperatureC: '36.6', weightKg: '61', heightCm: '164' },
          procedures: [{ name: 'Control periodontal', tooth: '—', quantity: 1 }],
          signed: true,
          versions: 2,
        },
        {
          id: 'e-2',
          date: '2026-08-28T16:10',
          kind: 'followUp',
          provider: 'Dra. Rivera',
          title: 'Revisión de plan de tratamiento',
          chiefComplaint: 'Revisión de propuesta terapéutica.',
          currentIllness: '',
          physicalExam: '',
          impression: 'Requiere raspaje y alisado radicular en cuadrante superior derecho.',
          plan: 'Se agrega RAR cuadrante 1 al plan. Se explica alcance y costo a la paciente.',
          diagnoses: [],
          vitals: {},
          procedures: [],
          signed: true,
          versions: 1,
        },
        {
          id: 'e-1',
          date: '2026-08-15T09:00',
          kind: 'initial',
          provider: 'Dr. Peña',
          title: 'Profilaxis y valoración inicial',
          chiefComplaint: 'Limpieza dental de rutina.',
          currentIllness: 'Sin dolor. Última limpieza hace 18 meses.',
          physicalExam: 'Cálculo supragingival generalizado. Sangrado al sondaje 32%.',
          impression: 'Gingivitis generalizada con periodontitis localizada.',
          plan: 'Profilaxis realizada. Programar raspaje por cuadrantes.',
          diagnoses: ['K05.1 Gingivitis crónica'],
          vitals: { bloodPressure: '120/78', heartRate: '76' },
          procedures: [{ name: 'Profilaxis', tooth: '—', quantity: 1 }],
          signed: true,
          versions: 1,
        },
      ],
      plans: [
        {
          id: 'pl-1',
          title: 'Tratamiento periodontal 2026',
          status: 'En curso',
          createdAt: '2026-08-15',
          items: [
            { id: 'pi-1', name: 'Valoración inicial', tooth: '—', price: 0, done: true, date: '2026-08-15' },
            { id: 'pi-2', name: 'Profilaxis', tooth: '—', price: 120000, done: true, date: '2026-08-15' },
            { id: 'pi-3', name: 'Raspaje y alisado radicular C1', tooth: '16', price: 260000, done: true, date: '2026-09-04' },
            { id: 'pi-4', name: 'Raspaje y alisado radicular C4', tooth: '46', price: 260000, done: false, date: null },
            { id: 'pi-5', name: 'Reevaluación periodontal', tooth: '—', price: 90000, done: false, date: null },
            { id: 'pi-6', name: 'Resina clase II', tooth: '16', price: 210000, done: false, date: null },
          ],
        },
      ],
      estimates: [
        { id: 'es-1', code: 'PRE-1042', date: '2026-08-28', total: 820000, status: 'Aceptado' },
        { id: 'es-2', code: 'PRE-1067', date: '2026-09-04', total: 210000, status: 'Pendiente' },
      ],
      prescriptions: [
        { id: 'fx-1', date: '2026-09-04', title: 'Clorhexidina 0.12%', detail: 'Enjuague 15 ml cada 12 h por 10 días', provider: 'Dra. Rivera', status: 'Vigente' },
        { id: 'fx-2', date: '2026-08-15', title: 'Ibuprofeno 400 mg', detail: '1 tableta cada 8 h por 3 días si hay dolor', provider: 'Dr. Peña', status: 'Vigente' },
      ],
      documents: [
        { id: 'dc-1', date: '2026-09-04', title: 'Consentimiento periodontal', type: 'Consentimiento', status: 'Pendiente de firma', size: '1.2 MB' },
        { id: 'dc-2', date: '2026-08-15', title: 'Radiografía panorámica', type: 'Imagen', status: 'Archivado', size: '3.8 MB' },
        { id: 'dc-3', date: '2026-08-15', title: 'Historia clínica inicial', type: 'Exportación', status: 'Archivado', size: '640 KB' },
      ],
      account: [
        { id: 'ac-1', date: '2026-09-04', concept: 'Raspaje y alisado radicular C1', charge: 260000, payment: 0, ref: 'FV-2214' },
        { id: 'ac-2', date: '2026-08-15', concept: 'Profilaxis', charge: 120000, payment: 120000, ref: 'FV-2180' },
        { id: 'ac-3', date: '2026-09-04', concept: 'Abono tratamiento periodontal', charge: 0, payment: 160000, ref: 'FV-2214' },
      ],
      photo: null,
      signature: null,
      xrays: [
        { id: 'rx-1', date: '2026-08-15', title: 'Panorámica inicial', type: 'Panorámica', tooth: null, source: 'Correo', size: '3.8 MB', tone: 'pano' },
        { id: 'rx-2', date: '2026-09-04', title: 'Periapical 16', type: 'Periapical', tooth: '16', source: 'Sensor intraoral', size: '820 KB', tone: 'periapical' },
        { id: 'rx-3', date: '2026-09-04', title: 'Periapical 46', type: 'Periapical', tooth: '46', source: 'Sensor intraoral', size: '790 KB', tone: 'periapical' },
        { id: 'rx-5', date: '2026-08-28', title: 'Tomografía sector posterior', type: 'Tomografía', tooth: null, source: 'Correo', size: '22.4 MB', tone: 'cbct' },
        { id: 'rx-4', date: '2026-08-28', title: 'Serie de aletas mordida', type: 'Bitewing', tooth: null, source: 'Sensor intraoral', size: '1.4 MB', tone: 'bitewing' },
      ],
      reviews: [
        { id: 'rv-1', date: '2026-09-04', rating: 5, comment: 'Muy buena atención, me explicaron todo el plan antes de empezar.', source: 'Encuesta post-consulta' },
        { id: 'rv-2', date: '2026-08-15', rating: 4, comment: 'La limpieza quedó bien, la espera fue un poco larga.', source: 'Encuesta post-consulta' },
      ],
      dentalSeed: {
        teeth: {
          '18': { state: 'absent' },
          '17': { state: 'implant', note: 'Implante colocado en 2024, en carga.' },
          '16': { surfaces: { occlusal: 'restoration_amalgam' }, findings: ['furcation'] },
          '15': { ortho: 'mesialized', surfaces: { occlusal: 'restoration_resin' } },
          '14': { state: 'absent' },
          '13': { ortho: 'distalized' },
          '12': { surfaces: { distal: 'fracture' } },
          '11': { surfaces: { mesial: 'restoration_resin' }, findings: ['diastema'] },
          '21': { surfaces: { mesial: 'restoration_resin' }, findings: ['diastema'] },
          '23': { ortho: 'distalized' },
          '24': { state: 'absent' },
          '25': { ortho: 'mesialized', surfaces: { distal: 'caries' } },
          '26': { surfaces: { occlusal: 'caries', mesial: 'restoration_resin' }, findings: ['endodontics'] },
          '27': { surfaces: { occlusal: 'sealant' } },
          '28': { state: 'absent' },
          '31': { surfaces: { occlusal: 'wear' } },
          '35': { surfaces: { occlusal: 'restoration_ionomer' } },
          '36': { surfaces: { occlusal: 'restoration_amalgam', distal: 'caries' }, findings: ['furcation'] },
          '37': { surfaces: { buccal: 'wear' } },
          '38': { state: 'absent' },
          '41': { surfaces: { occlusal: 'wear' } },
          '44': { state: 'absent' },
          '45': { ortho: 'mesialized' },
          '46': { state: 'crown', findings: ['endodontics', 'post'] },
          '47': { ortho: 'extruded', surfaces: { occlusal: 'restoration_amalgam' } },
          '48': { state: 'absent' },
        },
        perio: {
          '16': 'severe', '17': 'severe', '26': 'severe', '27': 'severe',
          '36': 'severe', '37': 'severe', '46': 'severe', '47': 'severe',
          '15': 'mild', '25': 'mild', '34': 'mild', '35': 'mild', '45': 'mild',
        },
        mobility: { '47': 2, '36': 1, '37': 1 },
        furcation: { '36': 2, '47': 1 },
        biofilm: {
          '16': ['buccal', 'lingual'], '17': ['buccal'], '26': ['buccal', 'lingual'],
          '27': ['lingual'], '36': ['buccal', 'lingual'], '37': ['lingual'],
          '46': ['buccal'], '47': ['buccal', 'lingual'], '31': ['lingual'], '41': ['lingual'],
        },
      },
    };
  }

  function patientCarlos() {
    return {
      id: 'p-carlos',
      name: 'Carlos Andrés Mejía',
      shortName: 'Carlos Mejía',
      initials: 'CM',
      chartNumber: 'HC-02599',
      documentType: 'CC',
      documentNumber: '71.884.201',
      birthDate: '1978-11-02',
      sex: 'Masculino',
      phone: '+57 311 220 4410',
      email: 'carlos.mejia@email.com',
      address: 'Calle 10 #40-22, Medellín',
      payer: 'Particular',
      zone: 'Urbana',
      birthplaceCity: 'Rionegro',
      referredBy: 'Google Ads',
      guardian: { name: '—', relationship: '—', phone: '—' },
      isPregnant: null,
      provider: 'Dr. Peña',
      status: 'En sala de espera',
      nextAppointment: { title: 'Endodoncia 36 · sesión 2', date: '2026-09-09T15:00', room: 'Consultorio 1', status: 'Confirmada', provider: 'Dr. Peña' },
      history: [
        { key: 'allergies', label: 'Alergias', review: { state: 'none', at: null, by: null }, items: [] },
        { key: 'medications', label: 'Medicamentos actuales', review: { state: 'reviewed', at: '2026-09-01', by: 'Dr. Peña' }, items: [{ id: 'c2', value: 'Losartán 50 mg', source: 'patient', active: true, context: 'Hipertensión controlada' }] },
        { key: 'medicalHistory', label: 'Antecedentes médicos', review: { state: 'reviewed', at: '2026-09-01', by: 'Dr. Peña' }, items: [{ id: 'c3', value: 'Hipertensión arterial', source: 'patient', active: true, context: 'Diagnóstico 2018', critical: true }] },
        { key: 'dentalHistory', label: 'Antecedentes odontológicos', review: { state: 'none', at: null, by: null }, items: [{ id: 'c4', value: 'Endodoncia 26 (2019)', source: 'record', active: true, context: '' }] },
      ],
      encounters: [
        { id: 'ce-2', date: '2026-09-02T15:00', kind: 'urgent', provider: 'Dr. Peña', title: 'Pulpitis irreversible 36', chiefComplaint: 'Dolor espontáneo nocturno en molar inferior izquierdo.', currentIllness: 'Dolor de 4 días, no cede con analgésico.', physicalExam: 'Caries profunda oclusal 36, prueba térmica positiva prolongada.', impression: 'Pulpitis irreversible sintomática 36.', plan: 'Apertura cameral y medicación. Endodoncia en 2 sesiones.', diagnoses: ['K04.0 Pulpitis'], vitals: { bloodPressure: '138/88', heartRate: '80' }, procedures: [{ name: 'Apertura cameral', tooth: '36', quantity: 1 }], signed: true, versions: 1 },
        { id: 'ce-1', date: '2026-08-20T11:00', kind: 'initial', provider: 'Dr. Peña', title: 'Valoración inicial', chiefComplaint: 'Chequeo general.', currentIllness: '', physicalExam: 'Múltiples restauraciones. Caries 36 y 47.', impression: 'Caries dental múltiple.', plan: 'Plan de operatoria por cuadrantes.', diagnoses: ['K02.1 Caries de la dentina'], vitals: {}, procedures: [], signed: true, versions: 1 },
      ],
      plans: [
        { id: 'cpl-1', title: 'Operatoria y endodoncia', status: 'En curso', createdAt: '2026-08-20', items: [
          { id: 'cpi-1', name: 'Apertura cameral 36', tooth: '36', price: 180000, done: true, date: '2026-09-02' },
          { id: 'cpi-2', name: 'Endodoncia 36', tooth: '36', price: 690000, done: false, date: null },
          { id: 'cpi-3', name: 'Corona 36', tooth: '36', price: 950000, done: false, date: null },
          { id: 'cpi-4', name: 'Resina 47', tooth: '47', price: 210000, done: false, date: null },
        ] },
      ],
      estimates: [{ id: 'ces-1', code: 'PRE-1050', date: '2026-08-20', total: 2030000, status: 'Aceptado' }],
      prescriptions: [{ id: 'cfx-1', date: '2026-09-02', title: 'Amoxicilina 500 mg', detail: '1 cápsula cada 8 h por 7 días', provider: 'Dr. Peña', status: 'Vigente' }],
      documents: [{ id: 'cdc-1', date: '2026-09-02', title: 'Radiografía periapical 36', type: 'Imagen', status: 'Archivado', size: '820 KB' }],
      account: [
        { id: 'cac-1', date: '2026-09-02', concept: 'Apertura cameral 36', charge: 180000, payment: 0, ref: 'FV-2203' },
        { id: 'cac-2', date: '2026-09-02', concept: 'Abono apertura cameral', charge: 0, payment: 180000, ref: 'FV-2203' },
      ],
      photo: null,
      signature: null,
      xrays: [
        { id: 'rx-1', date: '2026-08-15', title: 'Panorámica inicial', type: 'Panorámica', tooth: null, source: 'Correo', size: '3.8 MB', tone: 'pano' },
        { id: 'rx-2', date: '2026-09-04', title: 'Periapical 16', type: 'Periapical', tooth: '16', source: 'Sensor intraoral', size: '820 KB', tone: 'periapical' },
        { id: 'rx-3', date: '2026-09-04', title: 'Periapical 46', type: 'Periapical', tooth: '46', source: 'Sensor intraoral', size: '790 KB', tone: 'periapical' },
        { id: 'rx-5', date: '2026-08-28', title: 'Tomografía sector posterior', type: 'Tomografía', tooth: null, source: 'Correo', size: '22.4 MB', tone: 'cbct' },
        { id: 'rx-4', date: '2026-08-28', title: 'Serie de aletas mordida', type: 'Bitewing', tooth: null, source: 'Sensor intraoral', size: '1.4 MB', tone: 'bitewing' },
      ],
      reviews: [
        { id: 'rv-1', date: '2026-09-04', rating: 5, comment: 'Muy buena atención, me explicaron todo el plan antes de empezar.', source: 'Encuesta post-consulta' },
        { id: 'rv-2', date: '2026-08-15', rating: 4, comment: 'La limpieza quedó bien, la espera fue un poco larga.', source: 'Encuesta post-consulta' },
      ],
      photo: null,
      signature: null,
      xrays: [
        { id: 'crx-1', date: '2026-09-02', title: 'Periapical 36', type: 'Periapical', tooth: '36', source: 'Sensor intraoral', size: '820 KB', tone: 'periapical' },
        { id: 'crx-2', date: '2026-08-20', title: 'Panorámica', type: 'Panorámica', tooth: null, source: 'Correo', size: '4.1 MB', tone: 'pano' },
        { id: 'crx-3', date: '2026-09-02', title: 'Tomografía 36', type: 'Tomografía', tooth: '36', source: 'Correo', size: '18.6 MB', tone: 'cbct' },
      ],
      reviews: [],
      dentalSeed: {
        teeth: {
          '18': { state: 'absent' },
          '28': { state: 'absent' },
          '16': { surfaces: { occlusal: 'restoration_amalgam' } },
          '26': { state: 'crown', findings: ['endodontics', 'post'] },
          '36': { surfaces: { occlusal: 'caries' }, findings: ['endodontics'], note: 'Endodoncia en curso, sesión 2 pendiente.' },
          '46': { surfaces: { occlusal: 'restoration_resin' } },
          '47': { surfaces: { occlusal: 'caries' } },
        },
        perio: { '16': 'mild', '26': 'mild', '36': 'severe', '37': 'mild', '46': 'mild', '47': 'severe' },
        mobility: { '36': 1 },
        furcation: { '36': 1 },
        biofilm: { '36': ['buccal', 'lingual'], '47': ['buccal'], '16': ['lingual'] },
      },
    };
  }

  function patientLucia() {
    return {
      id: 'p-lucia',
      name: 'Lucía Fernanda Torres',
      shortName: 'Lucía Torres',
      initials: 'LT',
      chartNumber: 'HC-02612',
      documentType: 'TI',
      documentNumber: '1.098.554.201',
      birthDate: '2013-06-24',
      sex: 'Femenino',
      phone: '+57 300 118 7742',
      email: 'familia.torres@email.com',
      address: 'Cra 70 #C 34-09, Medellín',
      payer: 'Colsanitas',
      zone: 'Urbana',
      birthplaceCity: 'Medellín',
      referredBy: 'Remisión odontopediatría',
      guardian: { name: 'Marcela Torres', relationship: 'Madre', phone: '+57 300 118 7742' },
      isPregnant: null,
      provider: 'Dra. Rivera',
      status: 'Programada',
      nextAppointment: { title: 'Control de ortodoncia', date: '2026-09-11T09:00', room: 'Consultorio 3', status: 'Por confirmar', provider: 'Dra. Rivera' },
      history: [
        { key: 'allergies', label: 'Alergias', review: { state: 'reviewed', at: '2026-08-30', by: 'Dra. Rivera' }, items: [{ id: 'l1', value: 'Ninguna referida', source: 'guardian', active: true, context: '' }] },
        { key: 'medications', label: 'Medicamentos actuales', review: { state: 'reviewed', at: '2026-08-30', by: 'Dra. Rivera' }, items: [] },
        { key: 'medicalHistory', label: 'Antecedentes médicos', review: { state: 'changed', at: '2026-07-10', by: 'Dra. Rivera' }, items: [{ id: 'l3', value: 'Asma leve intermitente', source: 'guardian', active: true, context: 'Inhalador de rescate', critical: true }] },
        { key: 'dentalHistory', label: 'Antecedentes odontológicos', review: { state: 'none', at: null, by: null }, items: [{ id: 'l4', value: 'Ortodoncia fija desde 2025', source: 'clinician', active: true, context: '' }] },
      ],
      encounters: [
        { id: 'le-1', date: '2026-08-14T09:00', kind: 'followUp', provider: 'Dra. Rivera', title: 'Control de ortodoncia', chiefComplaint: 'Control mensual.', currentIllness: '', physicalExam: 'Buena higiene. Se cambian ligaduras.', impression: 'Evolución favorable, fase de alineación.', plan: 'Control en 4 semanas.', diagnoses: [], vitals: {}, procedures: [{ name: 'Control de ortodoncia', tooth: '—', quantity: 1 }], signed: true, versions: 1 },
      ],
      plans: [
        { id: 'lpl-1', title: 'Ortodoncia fija', status: 'En curso', createdAt: '2025-04-02', items: [
          { id: 'lpi-1', name: 'Instalación bracket superior', tooth: '—', price: 1400000, done: true, date: '2025-04-02' },
          { id: 'lpi-2', name: 'Instalación bracket inferior', tooth: '—', price: 1400000, done: true, date: '2025-05-06' },
          { id: 'lpi-3', name: 'Controles mensuales (18)', tooth: '—', price: 1800000, done: false, date: null },
          { id: 'lpi-4', name: 'Retenedores', tooth: '—', price: 480000, done: false, date: null },
        ] },
      ],
      estimates: [{ id: 'les-1', code: 'PRE-0912', date: '2025-03-28', total: 5080000, status: 'Aceptado' }],
      prescriptions: [],
      documents: [{ id: 'ldc-1', date: '2025-03-28', title: 'Consentimiento ortodoncia', type: 'Consentimiento', status: 'Firmado', size: '900 KB' }],
      account: [
        { id: 'lac-1', date: '2026-08-14', concept: 'Control mensual', charge: 100000, payment: 0, ref: 'FV-2191' },
        { id: 'lac-2', date: '2026-08-14', concept: 'Abono control mensual', charge: 0, payment: 5000, ref: 'FV-2191' },
      ],
      photo: null,
      signature: null,
      xrays: [
        { id: 'lrx-1', date: '2025-03-28', title: 'Panorámica de ortodoncia', type: 'Panorámica', tooth: null, source: 'Correo', size: '3.2 MB', tone: 'pano' },
        { id: 'lrx-2', date: '2025-03-28', title: 'Cefálica lateral', type: 'Cefálica', tooth: null, source: 'Correo', size: '2.7 MB', tone: 'ceph' },
      ],
      reviews: [
        { id: 'lrv-1', date: '2026-08-14', rating: 5, comment: 'Mi hija sale feliz de cada control.', source: 'Encuesta post-consulta' },
      ],
      dentalSeed: {
        teeth: {
          '11': { surfaces: { buccal: 'restoration_resin' }, note: 'Bracket instalado.' },
          '21': { surfaces: { buccal: 'restoration_resin' }, note: 'Bracket instalado.' },
          '13': { state: 'erupting' },
          '23': { state: 'erupting' },
          '18': { state: 'unerupted' },
          '28': { state: 'unerupted' },
          '36': { surfaces: { occlusal: 'sealant' } },
          '38': { state: 'unerupted' },
          '46': { surfaces: { occlusal: 'sealant' } },
          '48': { state: 'unerupted' },
        },
        perio: { '16': 'mild', '26': 'mild', '36': 'mild', '46': 'mild' },
        biofilm: { '11': ['buccal'], '21': ['buccal'], '16': ['buccal'], '26': ['buccal'], '36': ['lingual'], '46': ['lingual'] },
      },
    };
  }

  function withDental(patient) {
    const dental = buildDentalChart(patient.dentalSeed);
    delete patient.dentalSeed;
    return { ...patient, dental };
  }

  /** Catálogo inicial de hallazgos; la clínica puede editarlo. */
  function defaultSurfaceFindings() {
    return [
      { key: 'caries', label: 'Caries', color: '#c8434c' },
      { key: 'restoration_resin', label: 'Restauración en resina', color: '#3f7fd6' },
      { key: 'restoration_amalgam', label: 'Restauración en amalgama', color: '#22415f' },
      { key: 'restoration_ionomer', label: 'Restauración en ionómero', color: '#9dc4f0' },
      { key: 'sealant', label: 'Sellante', color: '#2c9169' },
      { key: 'fracture', label: 'Fractura', color: '#6c55be' },
      { key: 'wear', label: 'Desgaste', color: '#c99331' },
    ];
  }

  /** El número de historia se genera solo, nunca se escribe a mano. */
  function nextChartNumber(patients) {
    const numbers = patients
      .map((patient) => Number(String(patient.chartNumber).replace(/\D/g, '')))
      .filter((value) => Number.isFinite(value));
    const next = (numbers.length ? Math.max(...numbers) : 2400) + 1;
    return `HC-${String(next).padStart(5, '0')}`;
  }

  /** Paciente nuevo con la estructura completa, listo para editar. */
  function emptyPatient(patients, values) {
    const id = `p-${Date.now()}`;
    const initials = values.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
    return {
      id,
      name: values.name,
      shortName: values.name.split(/\s+/).slice(0, 2).join(' '),
      initials: initials || 'NN',
      chartNumber: nextChartNumber(patients),
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      birthDate: values.birthDate,
      sex: values.sex,
      phone: values.phone,
      email: values.email,
      address: '',
      payer: values.payer,
      zone: 'Urbana',
      birthplaceCity: '',
      referredBy: '',
      guardian: { name: '', relationship: '', phone: '' },
      isPregnant: null,
      provider: values.provider,
      status: 'Programada',
      nextAppointment: { title: 'Sin cita programada', date: '', room: '', status: 'Por confirmar', provider: values.provider },
      photo: null,
      signature: null,
      xrays: [],
      reviews: [],
      history: [
        { key: 'allergies', label: 'Alergias', review: { state: 'none', at: null, by: null }, items: [] },
        { key: 'medications', label: 'Medicamentos actuales', review: { state: 'none', at: null, by: null }, items: [] },
        { key: 'medicalHistory', label: 'Antecedentes médicos', review: { state: 'none', at: null, by: null }, items: [] },
        { key: 'dentalHistory', label: 'Antecedentes odontológicos', review: { state: 'none', at: null, by: null }, items: [] },
      ],
      encounters: [],
      plans: [],
      estimates: [],
      prescriptions: [],
      documents: [],
      account: [],
      dental: buildDentalChart({}),
    };
  }

  function seedData() {
    return {
      version: 6,
      activePatientId: 'p-maria',
      patients: [patientMaria(), patientCarlos(), patientLucia()].map(withDental),
      doctors: DOCTORS,
      appointments: appointments(),
      settings: {
        intakeEmail: 'imagenes@clinicasonrisa.com',
        clinicName: 'Clínica Sonrisa',
        /* Catálogo editable de hallazgos por superficie del odontograma. */
        surfaceFindings: defaultSurfaceFindings(),
      },
    };
  }

  window.ProtoData = {
    SECTIONS,
    TREATMENT_VIEWS,
    ENCOUNTER_KINDS,
    REVIEW_STATES,
    HISTORY_SOURCES,
    ARCH_ROWS,
    PERMANENT,
    PRIMARY,
    ALL_TEETH,
    UPPER_ROW,
    LOWER_ROW,
    PERIO_SITES,
    DOCTORS,
    ROOMS,
    APPOINTMENT_STATUS,
    DOCUMENT_TYPES,
    IMAGE_TYPES,
    IMAGE_TONES,
    PAYERS,
    buildDentalChart,
    defaultSurfaceFindings,
    nextChartNumber,
    emptyPatient,
    seedData,
  };
})();
