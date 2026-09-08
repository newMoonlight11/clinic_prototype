/* Kit compartido de UI para los tres prototipos: formato, selectores derivados,
   toasts, modales accesibles, edición en línea y diálogos clínicos. */

(function () {
  const Store = window.ProtoStore;
  const Data = window.ProtoData;

  /* ---------- plantillas seguras ---------- */

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function raw(value) {
    return { __raw: String(value ?? '') };
  }

  function render(value) {
    if (value == null || value === false) return '';
    if (Array.isArray(value)) return value.map(render).join('');
    if (typeof value === 'object' && '__raw' in value) return value.__raw;
    return esc(value);
  }

  function tpl(strings, ...values) {
    let out = strings[0];
    for (let i = 0; i < values.length; i += 1) out += render(values[i]) + strings[i + 1];
    return raw(out);
  }

  function qsa(root, selector) {
    return [...root.querySelectorAll(selector)];
  }

  function node(template) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = typeof template === 'string' ? template : template.__raw;
    return wrapper.children.length === 1 ? wrapper.firstElementChild : wrapper;
  }

  /* ---------- formato ---------- */

  const dateFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const shortFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

  function toDate(value) {
    if (!value) return null;
    const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function fmtDate(value) {
    const d = toDate(value);
    return d ? dateFmt.format(d) : '—';
  }

  function fmtShort(value) {
    const d = toDate(value);
    return d ? shortFmt.format(d) : '—';
  }

  function fmtTime(value) {
    const d = toDate(value);
    return d ? timeFmt.format(d) : '';
  }

  function fmtDateTime(value) {
    const d = toDate(value);
    return d ? `${dateFmt.format(d)} · ${timeFmt.format(d)}` : '—';
  }

  const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  function fmtMoney(value) {
    return moneyFmt.format(Number(value ?? 0));
  }

  const TODAY = new Date('2026-09-07T09:00:00');

  function age(birthDate) {
    const d = toDate(birthDate);
    if (!d) return '—';
    let years = TODAY.getFullYear() - d.getFullYear();
    const monthDiff = TODAY.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && TODAY.getDate() < d.getDate())) years -= 1;
    return `${years} años`;
  }

  function daysUntil(value) {
    const d = toDate(value);
    if (!d) return null;
    return Math.round((d - TODAY) / 86400000);
  }

  function relative(value) {
    const days = daysUntil(value);
    if (days == null) return '—';
    if (days === 0) return 'hoy';
    if (days === 1) return 'mañana';
    if (days === -1) return 'ayer';
    return days > 0 ? `en ${days} días` : `hace ${Math.abs(days)} días`;
  }

  /* ---------- selectores derivados ---------- */

  function lastEncounter(patient) {
    return [...patient.encounters].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }

  function activePlan(patient) {
    return patient.plans.find((p) => p.status === 'En curso') ?? patient.plans[0] ?? null;
  }

  function planProgress(plan) {
    if (!plan || plan.items.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = plan.items.filter((i) => i.done).length;
    return { done, total: plan.items.length, pct: Math.round((done / plan.items.length) * 100) };
  }

  function planBalance(plan) {
    if (!plan) return { billed: 0, pending: 0 };
    return plan.items.reduce(
      (acc, item) => {
        if (item.done) acc.billed += item.price;
        else acc.pending += item.price;
        return acc;
      },
      { billed: 0, pending: 0 }
    );
  }

  function accountBalance(patient) {
    return patient.account.reduce((acc, row) => acc + row.charge - row.payment, 0);
  }

  /** Alertas clínicas calculadas: no están escritas a mano en los datos. */
  function alerts(patient) {
    const list = [];
    patient.history.forEach((section) => {
      section.items
        .filter((item) => item.critical && item.active)
        .forEach((item) => {
          list.push({
            tone: 'danger',
            title: `${section.label}: ${item.value}`,
            detail: item.context || Data.HISTORY_SOURCES[item.source],
            action: { label: 'Revisar antecedentes', kind: 'history' },
          });
        });
    });
    patient.history
      .filter((section) => section.review.state !== 'reviewed')
      .forEach((section) => {
        list.push({
          tone: 'warn',
          title: `${section.label} · ${Data.REVIEW_STATES[section.review.state].label}`,
          detail: section.review.at ? `Última revisión: ${fmtDate(section.review.at)}` : 'Nunca revisado',
          action: { label: 'Revisar ahora', kind: 'history' },
        });
      });
    patient.documents
      .filter((doc) => doc.status === 'Pendiente de firma')
      .forEach((doc) => {
        list.push({
          tone: 'warn',
          title: `Consentimiento pendiente: ${doc.title}`,
          detail: `Cargado el ${fmtDate(doc.date)}`,
          action: { label: 'Marcar firmado', kind: 'sign-document', id: doc.id },
        });
      });
    patient.encounters
      .filter((e) => !e.signed)
      .forEach((e) => {
        list.push({
          tone: 'warn',
          title: `Evolución sin firmar: ${e.title}`,
          detail: fmtDateTime(e.date),
          action: { label: 'Firmar', kind: 'sign-encounter', id: e.id },
        });
      });
    return list;
  }

  /** Texto del último guardado, para mostrarlo junto a los campos editables. */
  function lastSavedLabel() {
    const save = Store.getLastSave();
    if (!save) return null;
    const seconds = Math.round((Date.now() - save.at) / 1000);
    const when = seconds < 60 ? 'hace un momento' : `hace ${Math.round(seconds / 60)} min`;
    return `Guardado ${when} · ${save.by}`;
  }

  function pendingReviewCount(patient) {
    return patient.history.filter((s) => s.review.state !== 'reviewed').length;
  }


  /* ---------- iconos ---------- */

  /** Iconos de línea, 20×20, heredan el color del texto. */
  const ICON_PATHS = {
    calendar: '<rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.5h14M7 2.5v4M13 2.5v4"/>',
    users: '<circle cx="8" cy="7" r="2.8"/><path d="M2.8 16.5c0-2.7 2.3-4.5 5.2-4.5s5.2 1.8 5.2 4.5"/><path d="M13.4 4.6a2.6 2.6 0 0 1 0 4.9M15 16.5c0-2 .6-3.4-.9-4.3"/>',
    tooth: '<path d="M5.4 2.8C3.6 2.8 2.5 4.4 2.5 6.4c0 2.2 1 3.2 1.4 5.3.3 1.7.2 5.5 1.7 5.5 1.3 0 1.2-3.4 2.4-3.4h.1c1.2 0 1.1 3.4 2.4 3.4 1.5 0 1.4-3.8 1.7-5.5.4-2.1 1.4-3.1 1.4-5.3 0-2-1.1-3.6-2.9-3.6-1.3 0-1.8.7-2.6.7s-1.3-.7-2.7-.7Z"/>',
    clipboard: '<rect x="4" y="3.5" width="12" height="14" rx="2"/><path d="M7.5 3.5V2.6c0-.6.5-1.1 1.1-1.1h2.8c.6 0 1.1.5 1.1 1.1v.9"/><path d="M7.5 8.5h5M7.5 12h3.5"/>',
    receipt: '<path d="M4.5 2.5h11v15l-2-1.3-1.8 1.3-1.7-1.3-1.8 1.3-1.7-1.3-2 1.3z"/><path d="M7.5 6.5h5M7.5 10h5"/>',
    gear: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7"/>',
    chart: '<path d="M3 17h14"/><rect x="4.5" y="9" width="3" height="5.5" rx="1"/><rect x="9" y="5.5" width="3" height="9" rx="1"/><rect x="13.5" y="11" width="3" height="3.5" rx="1"/>',
    droplet: '<path d="M10 2.5S4.8 8 4.8 11.6a5.2 5.2 0 0 0 10.4 0C15.2 8 10 2.5 10 2.5Z"/>',
    notes: '<rect x="3.5" y="3" width="13" height="14" rx="2"/><path d="M6.5 7h7M6.5 10h7M6.5 13h4"/>',
    pill: '<rect x="2.6" y="7.4" width="14.8" height="5.2" rx="2.6" transform="rotate(-45 10 10)"/><path d="M7.2 7.2l5.6 5.6"/>',
    file: '<path d="M11 2.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7z"/><path d="M11 2.5V7h4.5"/>',
    wallet: '<rect x="2.5" y="4.5" width="15" height="11" rx="2"/><path d="M2.5 8.5h15"/><circle cx="14" cy="12" r="1"/>',
    ruler: '<rect x="2.5" y="6.5" width="15" height="7" rx="1.5"/><path d="M6 6.5v2.5M9 6.5v3.5M12 6.5v2.5M15 6.5v3.5"/>',
    image: '<rect x="2.5" y="4" width="15" height="12" rx="2"/><circle cx="7" cy="8" r="1.4"/><path d="M3.5 14.5 8 10.5l3 2.6 2.5-2 3 2.9"/>',
    user: '<circle cx="10" cy="6.8" r="3"/><path d="M4 16.8c0-3 2.7-5 6-5s6 2 6 5"/>',
    activity: '<path d="M2.5 10.5h3l2-5.5 3.5 11 2.2-5.5h4.3"/>',
    pencil: '<path d="M13.6 3.4a1.9 1.9 0 0 1 2.7 2.7L7 15.4l-3.5.9.9-3.5z"/><path d="M12.2 4.8l2.7 2.7"/>',
    trash: '<path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/><path d="M5.5 5.5 6.2 16a1.4 1.4 0 0 0 1.4 1.3h4.8A1.4 1.4 0 0 0 13.8 16l.7-10.5"/><path d="M8.5 8.5v6M11.5 8.5v6"/>',
    close: '<path d="M5 5l10 10M15 5 5 15"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    check: '<path d="M4 10.5 8 14.5l8-9"/>',
    alert: '<path d="M10 3.2 2.8 16.2h14.4z"/><path d="M10 8v3.4M10 13.6v.1"/>',
    open: '<path d="M8 4.5H4.5v11h11V12"/><path d="M11.5 3.5h5v5M16.5 3.5 9.5 10.5"/>',
    dots: '<circle cx="5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/>',
    menu: '<path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"/>',
    undo: '<path d="M7 7.5H12.5a4 4 0 0 1 0 8H7"/><path d="M9.5 5 7 7.5 9.5 10"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/>',
    upload: '<path d="M10 13.5V3.5M6 7.5 10 3.5l4 4"/><path d="M3.5 12.5v3a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
  };

  function icon(name, extraClass = '') {
    const path = ICON_PATHS[name];
    if (!path) return raw('');
    return raw(
      `<svg class="icon ${extraClass}" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" ` +
        `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
    );
  }

  /* ---------- foco entre renders (recomendación 08) ---------- */

  /** Atributos estables con los que se puede volver a encontrar un control. */
  const FOCUS_KEYS = [
    'planItem', 'planItemEdit', 'planItemDelete', 'section', 'dentalTab', 'tooth', 'perioTooth',
    'fdi', 'action', 'xrayFilter', 'cardToggle', 'agendaMode', 'doctorToggle',
  ];

  /**
   * Describe el elemento enfocado para poder devolverle el foco tras volver a
   * pintar la pantalla. Sin esto, cada acción deja el foco en el `body` y quien
   * navega con teclado pierde su sitio.
   */
  function rememberFocus(root) {
    const active = document.activeElement;
    if (!active || !root.contains(active)) return null;
    for (const key of FOCUS_KEYS) {
      const value = active.dataset[key];
      if (value !== undefined) {
        const attribute = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        const extra = active.dataset.measure ? `[data-measure="${active.dataset.measure}"]` : '';
        const face = active.dataset.face ? `[data-face="${active.dataset.face}"]` : '';
        const site = active.dataset.site ? `[data-site="${active.dataset.site}"]` : '';
        return `[data-${attribute}="${CSS.escape ? CSS.escape(value) : value}"]${face}${site}${extra}`;
      }
    }
    return null;
  }

  function restoreFocus(root, selector) {
    if (!selector) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    const target = root.querySelector(selector);
    if (target) target.focus();
  }

  /* ---------- toasts ---------- */

  /* La región viva se monta vacía al cargar: si se creara junto con el primer
     aviso, los lectores de pantalla no lo anunciarían (recomendación 08). */
  const toastHost = node('<div class="toast-host" role="status" aria-live="polite"></div>');
  if (document.body) document.body.appendChild(toastHost);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(toastHost));

  function toast(message, tone = 'ok') {
    const item = node(tpl`<div class="toast toast-${tone}">${message}</div>`);
    toastHost.appendChild(item);
    requestAnimationFrame(() => item.classList.add('in'));
    setTimeout(() => {
      item.classList.remove('in');
      setTimeout(() => item.remove(), 220);
    }, 2600);
    return item;
  }

  /**
   * Aviso con deshacer (recomendación 04). Reemplaza a la confirmación en las
   * acciones reversibles: la acción ocurre ya y se puede revertir 8 segundos.
   * @param {string} message
   * @param {() => void} onUndo
   */
  function toastUndo(message, onUndo) {
    const item = node(tpl`
      <div class="toast toast-warn with-action" role="alert">
        <span>${message}</span>
        <button type="button" class="toast-action" data-undo>${icon('undo')}<span>Deshacer</span></button>
      </div>`);
    toastHost.appendChild(item);
    requestAnimationFrame(() => item.classList.add('in'));

    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      item.classList.remove('in');
      setTimeout(() => item.remove(), 220);
    };
    const timer = setTimeout(dismiss, 8000);

    item.querySelector('[data-undo]').addEventListener('click', () => {
      clearTimeout(timer);
      dismiss();
      onUndo();
    });
    return item;
  }

  /* ---------- modal accesible ---------- */

  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /**
   * @param {{title:string, subtitle?:string, body:string|{__raw:string}, size?:string,
   *          submitLabel?:string, cancelLabel?:string, danger?:boolean,
   *          onSubmit?:(form:HTMLFormElement)=>any}} options
   * @returns {Promise<any|null>} resuelve con lo que devuelva onSubmit, o null si se cancela
   */
  function modal(options) {
    return new Promise((resolve) => {
      const previousFocus = document.activeElement;
      const overlay = node(tpl`
        <div class="overlay" role="presentation">
          <div class="dialog ${options.size === 'lg' ? 'dialog-lg' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <form novalidate>
              <header class="dialog-head">
                <div>
                  <h2 id="dialog-title">${options.title}</h2>
                  ${options.subtitle ? tpl`<p>${options.subtitle}</p>` : ''}
                </div>
                <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button>
              </header>
              <div class="dialog-body">${options.body}</div>
              <div class="discard-guard" data-discard-guard hidden role="alertdialog" aria-label="Cambios sin guardar">
                <p><b>Tienes cambios sin guardar.</b> Si cierras ahora se pierde lo que escribiste.</p>
                <div class="discard-actions">
                  <button type="button" class="btn small primary" data-keep>Seguir editando</button>
                  <button type="button" class="btn small" data-discard>Descartar</button>
                </div>
              </div>
              <footer class="dialog-foot">
                <div class="dialog-error" data-error hidden></div>
                ${options.footerActions ?? ''}
                <div class="dialog-buttons">
                  ${options.submitLabel === null
                    ? ''
                    : tpl`<button type="submit" class="btn ${options.danger ? 'danger' : 'primary'}">${options.submitLabel ?? 'Guardar'}</button>`}
                </div>
              </footer>
            </form>
          </div>
        </div>`);

      const form = overlay.querySelector('form');
      const errorBox = overlay.querySelector('[data-error]');

      /* Un formulario con algo escrito no se descarta en silencio
         (recomendación 02). */
      let dirty = false;
      let snapshotOfForm = '';

      function formValues() {
        if (!form) return '';
        return [...form.querySelectorAll('input, select, textarea')]
          .map((field) => (field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value))
          .join('\u0000');
      }

      function close(result) {
        document.removeEventListener('keydown', onKeydown, true);
        overlay.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
        resolve(result);
      }

      /** Cierre a petición del usuario: pregunta si hay cambios sin guardar. */
      function requestClose() {
        if (form) dirty = formValues() !== snapshotOfForm;
        if (!dirty || options.submitLabel === null) {
          close(null);
          return;
        }
        const guard = overlay.querySelector('[data-discard-guard]');
        if (guard) {
          guard.hidden = false;
          const keep = guard.querySelector('[data-keep]');
          if (keep) keep.focus();
          return;
        }
        close(null);
      }

      function onKeydown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          requestClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const items = [...overlay.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      overlay.addEventListener('mousedown', (event) => {
        if (event.target === overlay) requestClose();
      });
      overlay.querySelectorAll('[data-close]').forEach((btn) =>
        btn.addEventListener('click', () => requestClose())
      );

      if (form) {
        snapshotOfForm = formValues();
        form.addEventListener('input', () => {
          dirty = formValues() !== snapshotOfForm;
        });
        form.addEventListener('change', () => {
          dirty = formValues() !== snapshotOfForm;
        });
      }

      const guard = overlay.querySelector('[data-discard-guard]');
      if (guard) {
        guard.querySelector('[data-keep]').addEventListener('click', () => {
          guard.hidden = true;
          const firstField = overlay.querySelector('input, textarea, select');
          if (firstField) firstField.focus();
        });
        guard.querySelector('[data-discard]').addEventListener('click', () => close(null));
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        errorBox.hidden = true;
        try {
          const result = options.onSubmit ? options.onSubmit(form) : true;
          if (result === false) return;
          close(result);
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.hidden = false;
          const field = error.field && form.elements[error.field];
          if (field) {
            /* Si el campo con error está dentro de un bloque plegado, se abre
               para que el usuario vea qué corregir (recomendación 01). */
            const folded = field.closest('details');
            if (folded) folded.open = true;
            field.focus();
          }
        }
      });

      document.addEventListener('keydown', onKeydown, true);
      document.body.appendChild(overlay);
      /* Permite enganchar controles propios dentro del diálogo (botones de
         acción, canvas de firma) y cerrarlo desde ellos. */
      if (options.onMount) options.onMount(overlay, close);
      const firstField = overlay.querySelector('input,textarea,select,button[type="submit"]');
      if (firstField) firstField.focus();
    });
  }

  function invalid(message, field) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  /**
   * Borrado reversible (recomendación 04): ejecuta ya y ofrece deshacer 8 s.
   * Se usa en todo lo que se puede reponer; lo que arrastra otros datos
   * —paciente, plan, doctor, catálogo— sigue pidiendo confirmación.
   * @param {{what:string, perform:() => void}} options
   */
  function deleteWithUndo({ what, perform }) {
    Store.snapshot(what);
    perform();
    toastUndo(`${what} · eliminado`, () => {
      const restored = Store.undo();
      if (restored) toast(`${restored} · restaurado`);
    });
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = true }) {
    return modal({
      title,
      body: tpl`<p class="dialog-text">${message}</p>`,
      submitLabel: confirmLabel,
      danger,
      onSubmit: () => true,
    }).then((result) => result === true);
  }


  /* ---------- popover anclado ---------- */

  /**
   * Menú anclado a un elemento. Resuelve con el valor elegido o `null`.
   * Un valor ya activo se devuelve igual: quien llama decide si eso lo quita.
   */
  function popover(anchor, title, options) {
    return new Promise((resolve) => {
      const previousFocus = document.activeElement;
      const layer = node(tpl`
        <div class="popover-layer" role="presentation">
          <div class="popover" role="dialog" aria-modal="true" aria-label="${title}">
            <p class="popover-title">${title}</p>
            <div class="popover-options">
              ${options.map(
                (option) => tpl`<button type="button" class="popover-option ${option.active ? 'active' : ''}" data-value="${option.value}">
                  ${option.color
                    ? raw(`<i class="swatch" style="background:${esc(option.color)};border-color:${esc(option.color)}"></i>`)
                    : option.swatch
                      ? tpl`<i class="swatch ${option.swatch}"></i>`
                      : ''}
                  <span>${option.label}</span>
                  ${option.active ? tpl`<b>${icon('check')}</b>` : ''}
                </button>`
              )}
            </div>
          </div>
        </div>`);

      const panel = layer.querySelector('.popover');

      function close(value) {
        document.removeEventListener('keydown', onKeydown, true);
        window.removeEventListener('resize', reposition);
        layer.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
        resolve(value);
      }

      function onKeydown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          close(null);
        }
      }

      function reposition() {
        const rect = anchor.getBoundingClientRect();
        const width = panel.offsetWidth || 230;
        const height = panel.offsetHeight || 220;
        const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
        const below = rect.bottom + 8;
        const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below;
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
      }

      layer.addEventListener('mousedown', (event) => {
        if (event.target === layer) close(null);
      });
      qsa(layer, '[data-value]').forEach((button) =>
        button.addEventListener('click', () => close(button.dataset.value))
      );

      document.addEventListener('keydown', onKeydown, true);
      document.body.appendChild(layer);
      reposition();
      const first = layer.querySelector('.popover-option');
      if (first) first.focus();
    });
  }

  /* ---------- edición en línea ---------- */

  /**
   * Campo editable: click o Enter abre el input, Enter/blur guarda, Esc cancela.
   * @param {{label:string, path:string, value:any, type?:string, options?:string[],
   *          format?:(v:any)=>string, validate?:(v:string)=>string|null}} config
   */
  function inlineField(config) {
    const wrap = node(tpl`
      <div class="ifield" data-path="${config.path}">
        <label id="lbl-${config.path.replace(/\./g, '-')}">${config.label}</label>
        <button type="button" class="ifield-value" aria-labelledby="lbl-${config.path.replace(/\./g, '-')}">
          <span>${config.format ? config.format(config.value) : config.value || '—'}</span>
          ${icon('pencil', 'ifield-pencil')}
        </button>
      </div>`);

    const button = wrap.querySelector('.ifield-value');

    /* Los campos generados por el sistema (como el número de historia) se
       muestran pero no se editan. */
    if (config.readOnly) {
      button.disabled = true;
      button.classList.add('readonly');
      button.title = 'Se genera automáticamente';
      return wrap;
    }

    function openEditor() {
      const editor = node(
        config.options
          ? tpl`<select class="input input-sm"></select>`
          : config.type === 'textarea'
            ? tpl`<textarea class="input input-sm" rows="2"></textarea>`
            : tpl`<input class="input input-sm" type="${config.type ?? 'text'}">`
      );
      if (config.options) {
        config.options.forEach((option) => {
          const opt = document.createElement('option');
          opt.value = option;
          opt.textContent = option;
          if (option === config.value) opt.selected = true;
          editor.appendChild(opt);
        });
      } else {
        editor.value = config.value ?? '';
      }

      let settled = false;
      function cancel() {
        if (settled) return;
        settled = true;
        editor.replaceWith(button);
        button.focus();
      }
      function commit() {
        if (settled) return;
        const next = editor.value.trim();
        const error = config.validate ? config.validate(next) : null;
        if (error) {
          editor.setCustomValidity(error);
          editor.reportValidity();
          settled = false;
          return;
        }
        settled = true;
        editor.replaceWith(button);
        if (next !== String(config.value ?? '')) {
          Store.setPatientField(config.path, next);
          toast(`${config.label} guardado · Dra. Rivera`);
        }
      }

      editor.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          cancel();
        }
        if (event.key === 'Enter' && config.type !== 'textarea') {
          event.preventDefault();
          commit();
        }
      });
      editor.addEventListener('blur', commit);
      editor.addEventListener('input', () => editor.setCustomValidity(''));

      button.replaceWith(editor);
      editor.focus();
      if (editor.select) editor.select();
    }

    button.addEventListener('click', openEditor);
    return wrap;
  }

  /* ---------- diálogos clínicos ---------- */

  const REQUIRED_ENCOUNTER_FIELDS = [
    ['title', 'El título de la evolución es obligatorio.'],
    ['chiefComplaint', 'Registra el motivo de consulta.'],
    ['plan', 'La nota de plan / evolución es obligatoria.'],
  ];

  async function encounterDialog(existing) {
    const encounter = existing ?? {
      date: new Date().toISOString().slice(0, 16),
      kind: 'followUp',
      provider: Store.getPatient().provider,
      title: '',
      chiefComplaint: '',
      currentIllness: '',
      physicalExam: '',
      impression: '',
      plan: '',
      diagnoses: [],
      vitals: {},
    };

    const kindOptions = Object.entries(Data.ENCOUNTER_KINDS)
      .map(([value, label]) => tpl`<option value="${value}" ${value === encounter.kind ? raw('selected') : ''}>${label}</option>`);

    const result = await modal({
      title: existing ? 'Editar evolución' : 'Nueva evolución clínica',
      subtitle: existing
        ? `Se guardará como versión ${(existing.versions ?? 1) + 1}. El original se conserva.`
        : 'Consulta estructurada · los campos siguen la historia clínica del CRM',
      size: 'lg',
      submitLabel: existing ? 'Guardar versión' : 'Guardar evolución',
      body: tpl`
        <p class="form-hint">Con el título, el motivo y el plan basta para guardar.
          El examen y los signos vitales quedan a un clic.</p>

        <label class="form-field"><span>Título <i class="req">obligatorio</i></span>
          <input class="input" name="title" value="${encounter.title}" placeholder="Ej. Control periodontal"></label>
        <label class="form-field"><span>Motivo de consulta <i class="req">obligatorio</i></span>
          <textarea class="input" name="chiefComplaint" rows="2">${encounter.chiefComplaint}</textarea></label>
        <label class="form-field"><span>Plan / nota de evolución <i class="req">obligatorio</i></span>
          <textarea class="input" name="plan" rows="3">${encounter.plan}</textarea></label>

        <details class="form-more" ${encounter.currentIllness || encounter.physicalExam || encounter.impression || encounter.diagnoses.length ? raw('open') : ''}>
          <summary>Añadir examen y diagnóstico</summary>
          <div class="form-more-body">
            <label class="form-field"><span>Enfermedad actual</span>
              <textarea class="input" name="currentIllness" rows="2">${encounter.currentIllness}</textarea></label>
            <label class="form-field"><span>Examen físico</span>
              <textarea class="input" name="physicalExam" rows="2">${encounter.physicalExam}</textarea></label>
            <label class="form-field"><span>Impresión clínica</span>
              <textarea class="input" name="impression" rows="2">${encounter.impression}</textarea></label>
            <label class="form-field"><span>Diagnósticos (uno por línea)</span>
              <textarea class="input" name="diagnoses" rows="2">${encounter.diagnoses.join('\n')}</textarea></label>
          </div>
        </details>

        <details class="form-more" ${Object.keys(encounter.vitals).length ? raw('open') : ''}>
          <summary>Añadir signos vitales</summary>
          <div class="form-more-body">
            <div class="form-grid form-grid-4">
              <label class="form-field"><span>Presión arterial</span><input class="input" name="bloodPressure" value="${encounter.vitals.bloodPressure ?? ''}" placeholder="120/80"></label>
              <label class="form-field"><span>FC (lpm)</span><input class="input" name="heartRate" inputmode="numeric" value="${encounter.vitals.heartRate ?? ''}"></label>
              <label class="form-field"><span>Temperatura (°C)</span><input class="input" name="temperatureC" inputmode="decimal" value="${encounter.vitals.temperatureC ?? ''}"></label>
              <label class="form-field"><span>Peso (kg)</span><input class="input" name="weightKg" inputmode="decimal" value="${encounter.vitals.weightKg ?? ''}"></label>
            </div>
          </div>
        </details>

        <details class="form-more">
          <summary>Cambiar fecha, tipo o profesional</summary>
          <div class="form-more-body">
            <div class="form-grid">
              <label class="form-field"><span>Fecha clínica</span>
                <input class="input" type="datetime-local" name="date" value="${encounter.date.slice(0, 16)}"></label>
              <label class="form-field"><span>Tipo de consulta</span>
                <select class="input" name="kind">${kindOptions}</select></label>
              <label class="form-field"><span>Profesional tratante</span>
                <input class="input" name="provider" value="${encounter.provider}"></label>
            </div>
          </div>
        </details>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        REQUIRED_ENCOUNTER_FIELDS.forEach(([field, message]) => {
          if (!String(values[field] ?? '').trim()) throw invalid(message, field);
        });
        if (values.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(values.bloodPressure.trim())) {
          throw invalid('La presión arterial debe tener el formato 120/80.', 'bloodPressure');
        }
        if (values.heartRate && !(Number(values.heartRate) > 20 && Number(values.heartRate) < 220)) {
          throw invalid('La frecuencia cardíaca debe estar entre 20 y 220 lpm.', 'heartRate');
        }
        const vitals = {};
        ['bloodPressure', 'heartRate', 'temperatureC', 'weightKg'].forEach((key) => {
          if (String(values[key]).trim()) vitals[key] = String(values[key]).trim();
        });
        return {
          ...(existing ? { id: existing.id } : {}),
          date: values.date,
          kind: values.kind,
          provider: values.provider.trim() || Store.getPatient().provider,
          title: values.title.trim(),
          chiefComplaint: values.chiefComplaint.trim(),
          currentIllness: values.currentIllness.trim(),
          physicalExam: values.physicalExam.trim(),
          impression: values.impression.trim(),
          plan: values.plan.trim(),
          diagnoses: values.diagnoses.split('\n').map((d) => d.trim()).filter(Boolean),
          vitals,
          procedures: existing?.procedures ?? [],
        };
      },
    });

    if (!result) return null;
    const saved = Store.saveEncounter(result);
    toast(existing ? 'Evolución guardada como nueva versión' : 'Evolución creada');
    return saved;
  }

  async function historyReviewDialog() {
    const patient = Store.getPatient();
    const sections = patient.history
      .map(
        (section) => tpl`
        <section class="review-section" data-section="${section.key}">
          <header>
            <div>
              <h3>${section.label}</h3>
              <p class="muted">${section.review.at
                ? `Última revisión ${fmtDate(section.review.at)} · ${section.review.by}`
                : 'Sin revisión registrada'}</p>
            </div>
            <span class="badge ${Data.REVIEW_STATES[section.review.state].tone === 'ok' ? '' : 'warn'}">${Data.REVIEW_STATES[section.review.state].label}</span>
          </header>
          <ul class="review-items">
            ${section.items.length === 0
              ? tpl`<li class="muted">Ninguno referido</li>`
              : section.items.map(
                  (item) => tpl`<li>
                    <div><b>${item.value}</b>${item.critical ? raw('<span class="badge danger">Crítico</span>') : ''}
                      <div class="muted">${Data.HISTORY_SOURCES[item.source]}${item.context ? ` · ${item.context}` : ''}</div>
                    </div>
                    <span class="row-actions">
                      <button type="button" class="icon-btn" data-edit-history="${item.id}" aria-label="Editar ${item.value}">${icon('pencil')}</button>
                      <button type="button" class="icon-btn" data-remove="${item.id}" aria-label="Quitar ${item.value}">${icon('trash')}</button>
                    </span>
                  </li>`
                )}
          </ul>
          <div class="review-add">
            <input class="input input-sm" data-new placeholder="Agregar dato a ${section.label.toLowerCase()}">
            <button type="button" class="btn small" data-add>Agregar</button>
          </div>
          <label class="review-confirm">
            <input type="checkbox" data-confirm ${section.review.state === 'reviewed' ? raw('checked disabled') : ''}>
            <span>Revisé ${section.label.toLowerCase()} con la información disponible.</span>
          </label>
        </section>`
      );

    const overlayResult = await modal({
      title: 'Revisar antecedentes',
      subtitle: 'Desconocido es una respuesta, no una revisión pendiente.',
      size: 'lg',
      submitLabel: 'Guardar y registrar revisión',
      body: tpl`<div class="review-list">${sections}</div>`,
      onSubmit: (form) => {
        const confirmed = [...form.querySelectorAll('[data-section]')]
          .filter((el) => el.querySelector('[data-confirm]').checked && !el.querySelector('[data-confirm]').disabled)
          .map((el) => el.dataset.section);
        if (confirmed.length === 0) throw invalid('Marca al menos una sección revisada, o cierra el diálogo.');
        return confirmed;
      },
    });

    if (!overlayResult) return;
    overlayResult.forEach((key) => Store.reviewHistorySection(key));
    toast(`${overlayResult.length} sección(es) marcadas como revisadas`);
  }

  /* Los botones agregar/quitar dentro del diálogo de antecedentes se delegan aquí,
     porque el diálogo se reconstruye en cada apertura. */
  document.addEventListener('click', (event) => {
    const addBtn = event.target.closest('[data-add]');
    if (addBtn && addBtn.closest('[data-section]')) {
      const section = addBtn.closest('[data-section]');
      const input = section.querySelector('[data-new]');
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      Store.addHistoryItem(section.dataset.section, { value });
      input.value = '';
      toast('Dato agregado · queda pendiente de revisión', 'warn');
      const overlay = section.closest('.overlay');
      if (overlay) overlay.remove();
      historyReviewDialog();
      return;
    }
    const editBtn = event.target.closest('[data-edit-history]');
    if (editBtn && editBtn.closest('[data-section]')) {
      const section = editBtn.closest('[data-section]');
      const sectionKey = section.dataset.section;
      const item = Store.getPatient()
        .history.find((entry) => entry.key === sectionKey)
        .items.find((entry) => entry.id === editBtn.dataset.editHistory);
      const overlay = section.closest('.overlay');
      if (overlay) overlay.remove();
      historyItemDialog(sectionKey, item);
      return;
    }

    const removeBtn = event.target.closest('[data-remove]');
    if (removeBtn && removeBtn.closest('[data-section]')) {
      const section = removeBtn.closest('[data-section]');
      Store.removeHistoryItem(section.dataset.section, removeBtn.dataset.remove);
      toast('Dato retirado · queda pendiente de revisión', 'warn');
      const overlay = section.closest('.overlay');
      if (overlay) overlay.remove();
      historyReviewDialog();
    }
  });

  /** Edición de un dato de antecedentes. */
  async function historyItemDialog(sectionKey, item) {
    const result = await modal({
      title: 'Editar antecedente',
      subtitle: item.value,
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Dato</span>
          <input class="input" name="value" value="${item.value}"></label>
        <div class="form-grid">
          <label class="form-field"><span>Fuente</span>
            <select class="input" name="source">
              ${Object.keys(Data.HISTORY_SOURCES).map(
                (key) => tpl`<option value="${key}" ${key === item.source ? raw('selected') : ''}>${Data.HISTORY_SOURCES[key]}</option>`
              )}
            </select></label>
          <label class="form-field"><span>Estado</span>
            <select class="input" name="active">
              <option value="true" ${item.active ? raw('selected') : ''}>Activo</option>
              <option value="false" ${item.active ? '' : raw('selected')}>Inactivo</option>
            </select></label>
        </div>
        <label class="form-field"><span>Contexto / incertidumbre</span>
          <textarea class="input" rows="2" name="context">${item.context ?? ''}</textarea></label>
        <label class="chip-check"><input type="checkbox" name="critical" ${item.critical ? raw('checked') : ''}>
          <span>Marcar como crítico (genera alerta clínica)</span></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.value.trim()) throw invalid('El dato no puede quedar vacío.', 'value');
        return {
          value: values.value.trim(),
          source: values.source,
          active: values.active === 'true',
          context: values.context.trim(),
          critical: values.critical !== undefined,
        };
      },
    });
    if (result) {
      Store.updateHistoryItem(sectionKey, item.id, result);
      toast('Antecedente actualizado · queda pendiente de revisión', 'warn');
    }
    /* Se vuelve al listado de antecedentes, se haya guardado o no. */
    historyReviewDialog();
  }

  async function prescriptionDialog() {
    const result = await modal({
      title: 'Nueva fórmula médica',
      submitLabel: 'Guardar fórmula',
      body: tpl`
        <label class="form-field"><span>Medicamento</span>
          <input class="input" name="title" placeholder="Ej. Amoxicilina 500 mg"></label>
        <label class="form-field"><span>Indicación</span>
          <textarea class="input" name="detail" rows="3" placeholder="Dosis, frecuencia y duración"></textarea></label>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.title.trim()) throw invalid('Indica el medicamento.', 'title');
        if (!values.detail.trim()) throw invalid('Indica la dosis y duración.', 'detail');
        return { title: values.title.trim(), detail: values.detail.trim() };
      },
    });
    if (!result) return;
    Store.savePrescription(result);
    toast('Fórmula creada');
  }

  /* ---------- cromo compartido (barra lateral y superior) ---------- */

  const PROTOTYPES = [
    { key: 'a', href: 'option-a-command-center.html', label: 'Command center' },
    { key: 'b', href: 'option-b-split-workspace.html', label: 'Split workspace' },
  ];

  /** Vistas de la navegación principal. `patients` es el espacio clínico. */
  const NAV_ITEMS = [
    { key: 'agenda', label: 'Agenda', icon: 'calendar' },
    { key: 'patients', label: 'Pacientes', icon: 'users' },
    { key: 'treatments', label: 'Tratamientos', scope: 'Tratamientos de la clínica', icon: 'clipboard' },
    { key: 'billing', label: 'Facturación', scope: 'Facturación de la clínica', icon: 'receipt' },
    { key: 'reviews', label: 'Reseñas', icon: 'activity' },
    { key: 'settings', label: 'Configuración', icon: 'gear' },
  ];

  /** Lee `#view=...&section=...&tab=...` del hash. */
  function readView() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const view = params.get('view');
    return {
      view: NAV_ITEMS.some((item) => item.key === view) ? view : 'patients',
      section: params.get('section'),
      tab: params.get('tab'),
    };
  }

  function navLabel(key) {
    const item = NAV_ITEMS.find((entry) => entry.key === key);
    /* En el título se usa el rótulo con alcance, para no confundir la vista de
       clínica con la sección del paciente (recomendación 10). */
    return item ? item.scope ?? item.label : key;
  }

  function navShortLabel(key) {
    return NAV_ITEMS.find((entry) => entry.key === key)?.label ?? key;
  }

  /** En pantalla angosta la navegación se abre como panel; se recuerda entre renders. */
  let navOpen = false;

  function sidebar(activeView = 'patients') {
    return tpl`
      <aside class="sidebar ${navOpen ? 'open' : ''}">
        <div class="sidebar-bar">
          <a class="brand" href="index.html">avance<small>CRM</small></a>
          <button type="button" class="nav-toggle" data-nav-toggle aria-expanded="${navOpen}"
            aria-controls="nav-panel" aria-label="Abrir la navegación">${icon('menu')}</button>
        </div>
        <button type="button" class="nav-backdrop" data-nav-close aria-label="Cerrar el menú" tabindex="-1"></button>
        <nav class="sidebar-nav" id="nav-panel" aria-label="Navegación principal">
          <p class="nav-label">Clínica</p>
          ${NAV_ITEMS.map(
            (item) => tpl`
            <a class="nav-item ${item.key === activeView ? 'active' : ''}" href="#view=${item.key}"
              ${item.key === activeView ? raw('aria-current="page"') : ''}>
              ${icon(item.icon)}<span>${item.label}</span>
            </a>`
          )}
          <div class="sidebar-foot">
            <p class="nav-label">Prototipos</p>
            ${PROTOTYPES.map((p) => tpl`<a class="nav-item small" href="${p.href}"><span>${p.label}</span></a>`)}
          </div>
        </nav>
      </aside>`;
  }

  /**
   * Barra superior. Junto al selector de paciente van el CRUD de pacientes y
   * las acciones de contexto que pase cada opción, para no ensuciar el cuerpo.
   */
  /**
   * Barra superior de una sola línea: migas, paciente, su CRUD, las acciones
   * frecuentes y la sesión. Si no cabe, se desliza en vez de envolver.
   */
  function topbar(patient, { crumb, view = 'patients', actions } = {}) {
    const patients = Store.getPatients();
    const trail = view === 'patients' ? 'Pacientes' : navLabel(view);
    return tpl`
      <header class="topbar">
        <div class="topbar-row tools">
          <div class="crumbs">Clínica <span aria-hidden="true">›</span> ${trail}${
            view === 'patients' ? tpl` <span aria-hidden="true">›</span> <strong>${crumb ?? patient.shortName}</strong>` : ''
          }</div>
          ${view === 'patients' ? '' : tpl`<h1 class="view-title">${navLabel(view)}</h1>`}
          ${view === 'patients'
            ? tpl`
              <button type="button" class="patient-switcher" data-patient-switcher>
                ${icon('search')}
                <span class="patient-switcher-main">
                  <b>${patient.shortName}</b>
                  <span>${patient.chartNumber} · ${patients.length} paciente(s)</span>
                </span>
              </button>
              <span class="row-actions">
                <button class="icon-btn" data-patient-new aria-label="Nuevo paciente" title="Nuevo paciente">${icon('plus')}</button>
                <button class="icon-btn" data-patient-edit aria-label="Editar paciente" title="Editar datos del paciente">${icon('pencil')}</button>
                <button class="icon-btn" data-patient-delete aria-label="Eliminar paciente" title="Eliminar paciente">${icon('trash')}</button>
              </span>
              ${actions ?? ''}`
            : ''}
          <span class="topbar-end">
            <span class="demo-flag" title="Ningún dato de esta pantalla corresponde a un paciente real">Datos de demostración</span>
            <button class="btn small" data-reset>Reiniciar demo</button>
            <span class="avatar" title="Dra. Rivera">DR</span>
          </span>
        </div>
      </header>`;
  }

  /**
   * Buscador de pacientes (recomendación 05). Sustituye al desplegable, que
   * solo funcionaba con tres pacientes. Busca por número de documento, nombre
   * o número de historia, y arranca mostrando los atendidos recientemente.
   */
  async function patientPicker() {
    const patients = Store.getPatients();
    const appointments = Store.getAppointments();

    /** Últimos atendidos, por la cita más reciente ya cumplida. */
    function recency(patient) {
      const last = appointments
        .filter((item) => item.patientId === patient.id)
        .sort((a, b) => b.start.localeCompare(a.start))[0];
      return last ? last.start : '';
    }

    const ordered = [...patients].sort((a, b) => recency(b).localeCompare(recency(a)));

    function rows(list, query) {
      if (list.length === 0) {
        return `<p class="empty-state">Ningún paciente coincide con «${esc(query)}».</p>`;
      }
      return list
        .map(
          (patient) => `<button type="button" class="picker-row" data-pick="${esc(patient.id)}">
            <span class="picker-avatar">${esc(patient.initials)}</span>
            <span class="picker-main">
              <b>${esc(patient.shortName)}</b>
              <span class="muted xs">${esc(patient.documentType)} ${esc(patient.documentNumber)} · ${esc(patient.chartNumber)}</span>
            </span>
            <span class="muted xs">${esc(patient.provider)}</span>
          </button>`
        )
        .join('');
    }

    const chosen = await modal({
      title: 'Buscar paciente',
      subtitle: 'Por número de documento, nombre o número de historia',
      submitLabel: null,
      body: tpl`
        <label class="form-field">
          <span class="sr-only">Buscar paciente</span>
          <input class="input" type="search" data-picker-search autocomplete="off"
            placeholder="Escribe la cédula o el nombre…">
        </label>
        <p class="section-label" data-picker-title>Atendidos recientemente</p>
        <div class="picker-list" data-picker-list>${raw(rows(ordered, ''))}</div>`,
      onMount: (overlay, close) => {
        const search = overlay.querySelector('[data-picker-search]');
        const list = overlay.querySelector('[data-picker-list]');
        const title = overlay.querySelector('[data-picker-title]');

        function bind() {
          qsa(list, '[data-pick]').forEach((row) =>
            row.addEventListener('click', () => close(row.dataset.pick))
          );
        }

        function paint() {
          const query = search.value.trim().toLowerCase();
          const digits = query.replace(/\D/g, '');
          const matches = ordered.filter((patient) => {
            if (!query) return true;
            const document = String(patient.documentNumber).toLowerCase();
            return (
              (digits.length > 0 && document.replace(/\D/g, '').includes(digits)) ||
              document.includes(query) ||
              patient.name.toLowerCase().includes(query) ||
              String(patient.chartNumber).toLowerCase().includes(query)
            );
          });
          title.textContent = query ? `${matches.length} coincidencia(s)` : 'Atendidos recientemente';
          list.innerHTML = rows(matches, search.value);
          bind();
        }

        search.addEventListener('input', paint);
        bind();
        search.focus();
      },
    });

    if (!chosen) return;
    Store.setActivePatient(chosen);
    toast(`Paciente activo: ${Store.getPatient().shortName}`);
  }

  /** Alta y edición de los datos base del paciente. */
  async function patientDialog(existing) {
    const doctors = Store.getDoctors().map((doctor) => doctor.name);
    const base = existing ?? {
      name: '',
      documentType: Data.DOCUMENT_TYPES[0],
      documentNumber: '',
      birthDate: '',
      sex: 'Femenino',
      phone: '',
      email: '',
      payer: Data.PAYERS[0],
      provider: doctors[0],
    };

    const result = await modal({
      title: existing ? 'Editar paciente' : 'Nuevo paciente',
      subtitle: existing
        ? `Número de historia ${existing.chartNumber}`
        : 'El número de historia se genera automáticamente',
      submitLabel: 'Guardar',
      body: tpl`
        <label class="form-field"><span>Nombre completo</span>
          <input class="input" name="name" value="${base.name}" placeholder="Nombres y apellidos"></label>
        <div class="form-grid">
          <label class="form-field"><span>Tipo de documento</span>
            <select class="input" name="documentType">
              ${Data.DOCUMENT_TYPES.map(
                (type) => tpl`<option value="${type}" ${type === base.documentType ? raw('selected') : ''}>${type}</option>`
              )}
            </select></label>
          <label class="form-field"><span>Número de documento</span>
            <input class="input" name="documentNumber" value="${base.documentNumber}" placeholder="Solo el número"></label>
          <label class="form-field"><span>Fecha de nacimiento</span>
            <input class="input" type="date" name="birthDate" value="${base.birthDate}"></label>
        </div>
        <div class="form-grid">
          <label class="form-field"><span>Sexo</span>
            <select class="input" name="sex">
              ${['Femenino', 'Masculino', 'Otro'].map(
                (value) => tpl`<option value="${value}" ${value === base.sex ? raw('selected') : ''}>${value}</option>`
              )}
            </select></label>
          <label class="form-field"><span>Teléfono</span>
            <input class="input" name="phone" value="${base.phone}" placeholder="+57 300 000 0000"></label>
          <label class="form-field"><span>Correo</span>
            <input class="input" type="email" name="email" value="${base.email}"></label>
        </div>
        <div class="form-grid">
          <label class="form-field"><span>Aseguradora</span>
            <select class="input" name="payer">
              ${Data.PAYERS.map(
                (payer) => tpl`<option value="${payer}" ${payer === base.payer ? raw('selected') : ''}>${payer}</option>`
              )}
            </select></label>
          <label class="form-field"><span>Profesional tratante</span>
            <select class="input" name="provider">
              ${doctors.map(
                (name) => tpl`<option value="${name}" ${name === base.provider ? raw('selected') : ''}>${name}</option>`
              )}
            </select></label>
        </div>`,
      onSubmit: (form) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (values.name.trim().length < 3) throw invalid('Escribe el nombre del paciente.', 'name');
        if (!values.documentNumber.trim()) throw invalid('Escribe el número de documento.', 'documentNumber');
        if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
          throw invalid('El correo no es válido.', 'email');
        }
        return {
          name: values.name.trim(),
          documentType: values.documentType,
          documentNumber: values.documentNumber.trim(),
          birthDate: values.birthDate,
          sex: values.sex,
          phone: values.phone.trim(),
          email: values.email.trim(),
          payer: values.payer,
          provider: values.provider,
        };
      },
    });

    if (!result) return;
    if (existing) {
      Store.updatePatient(existing.id, {
        ...result,
        shortName: result.name.split(/\s+/).slice(0, 2).join(' '),
      });
      toast('Paciente actualizado');
    } else {
      const created = Store.addPatient(result);
      toast(`Paciente creado · ${created.chartNumber}`);
    }
  }

  function wireChrome(root) {
    const navToggle = root.querySelector('[data-nav-toggle]');
    const sidebar = root.querySelector('.sidebar');

    function setNav(open) {
      navOpen = open;
      if (sidebar) sidebar.classList.toggle('open', open);
      if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
    }

    if (navToggle) navToggle.addEventListener('click', () => setNav(!navOpen));

    const backdrop = root.querySelector('[data-nav-close]');
    if (backdrop) backdrop.addEventListener('click', () => setNav(false));

    /* Al elegir una sección el cajón se cierra solo. */
    qsa(root, '.sidebar-nav .nav-item').forEach((link) =>
      link.addEventListener('click', () => setNav(false))
    );

    if (navOpen) {
      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape') setNav(false);
        },
        { once: true }
      );
    }

    const create = root.querySelector('[data-patient-new]');
    if (create) create.addEventListener('click', () => patientDialog(null));

    const edit = root.querySelector('[data-patient-edit]');
    if (edit) edit.addEventListener('click', () => patientDialog(Store.getPatient()));

    const remove = root.querySelector('[data-patient-delete]');
    if (remove) {
      remove.addEventListener('click', async () => {
        const patient = Store.getPatient();
        if (Store.getPatients().length <= 1) {
          toast('Debe quedar al menos un paciente', 'warn');
          return;
        }
        const ok = await confirmDialog({
          title: 'Eliminar paciente',
          message: `¿Eliminar a ${patient.name} y todo su expediente? También se borran sus citas.`,
          confirmLabel: 'Eliminar',
        });
        if (ok) {
          Store.deletePatient(patient.id);
          toast('Paciente eliminado', 'warn');
        }
      });
    }

    const switcher = root.querySelector('[data-patient-switcher]');
    if (switcher) switcher.addEventListener('click', () => patientPicker());
    const reset = root.querySelector('[data-reset]');
    if (reset) {
      reset.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Reiniciar datos de demostración',
          message: 'Se descartan todos los cambios hechos en los prototipos y se vuelve al estado inicial.',
          confirmLabel: 'Reiniciar',
        });
        if (ok) {
          Store.resetDemo();
          toast('Datos de demostración reiniciados');
        }
      });
    }
  }

  /* Atajos: Alt+1/2/3 saltan entre prototipos. */
  document.addEventListener('keydown', (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const index = ['1', '2', '3'].indexOf(event.key);
    if (index === -1) return;
    event.preventDefault();
    window.location.href = PROTOTYPES[index].href;
  });

  /* ---------- fragmentos reutilizables ---------- */

  function alertList(patient) {
    const list = alerts(patient);
    if (list.length === 0) return tpl`<p class="muted">Sin alertas activas.</p>`;
    return tpl`<ul class="alert-list">
      ${list.map(
        (alert) => tpl`<li class="alert tone-${alert.tone}">
          <div><b>${alert.title}</b><div class="muted">${alert.detail}</div></div>
          <button type="button" class="btn small" data-alert-action="${alert.action.kind}" data-alert-id="${alert.action.id ?? ''}">${alert.action.label}</button>
        </li>`
      )}
    </ul>`;
  }

  function wireAlerts(root) {
    root.querySelectorAll('[data-alert-action]').forEach((button) =>
      button.addEventListener('click', () => {
        const { alertAction, alertId } = button.dataset;
        if (alertAction === 'history') historyReviewDialog();
        if (alertAction === 'sign-document') {
          Store.setDocumentStatus(alertId, 'Firmado');
          toast('Consentimiento marcado como firmado');
        }
        if (alertAction === 'sign-encounter') {
          Store.signEncounter(alertId);
          toast('Evolución firmada');
        }
      })
    );
  }

  window.ProtoUI = {
    esc,
    raw,
    tpl,
    node,
    fmtDate,
    fmtShort,
    fmtTime,
    fmtDateTime,
    fmtMoney,
    age,
    relative,
    daysUntil,
    lastEncounter,
    activePlan,
    planProgress,
    planBalance,
    accountBalance,
    alerts,
    alertList,
    wireAlerts,
    pendingReviewCount,
    lastSavedLabel,
    rememberFocus,
    restoreFocus,
    patientPicker,
    toast,
    toastUndo,
    modal,
    confirmDialog,
    deleteWithUndo,
    invalid,
    inlineField,
    encounterDialog,
    historyReviewDialog,
    prescriptionDialog,
    sidebar,
    topbar,
    wireChrome,
    icon,
    qsa,
    popover,
    readView,
    navLabel,
    navShortLabel,
    patientDialog,
    NAV_ITEMS,
    PROTOTYPES,
  };
})();
