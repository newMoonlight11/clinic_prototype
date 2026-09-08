# Expediente clínico · prototipos de escritorio

Tres formas distintas de mostrar y editar el expediente clínico en pantalla grande, como
alternativa a la navegación por pestañas de la app actual. Son páginas estáticas: no hay
backend ni build, pero **funcionan de verdad** (crear, editar, validar, firmar, filtrar).

## Cómo abrirlos

Doble clic en `index.html` funciona. Para que el estado se comparta entre las tres páginas
conviene servirlas por HTTP (en `file://` algunos navegadores bloquean `localStorage`):

```bash
cd design-prototypes/clinical-desktop
python -m http.server 8080
# abrir http://localhost:8080
```

## Las tres opciones

| | Idea | Fuerte en | Débil en |
|---|---|---|---|
| **A · Command center** | Una sola pantalla con todo: datos, antecedentes, evoluciones y una carta dental con los tres módulos en un control segmentado | Triage y consultas cortas: cero navegación | Se hace larga con historiales grandes |
| **B · Split workspace** | Paciente fijo a la izquierda; a la derecha las 11 secciones del expediente, una a la vez | Trabajo largo en una sección; los módulos dentales usan todo el ancho | El riel cuesta ~300 px de ancho |

Las dos muestran la **misma información** y tienen la **navegación completa habilitada**
(Agenda · Pacientes · Tratamientos · Facturación · Reseñas · Configuración). Lo que cambia es la
disposición del expediente: A lo apila en una sola pantalla con selectores y B le da una sección
propia a pantalla completa. Las vistas que no son el expediente son iguales en las dos, porque lo
que se compara es la historia clínica.

## Qué se puede hacer en los prototipos

- Editar cualquier dato del paciente **en línea** (clic → Enter guarda, Esc cancela) con
  validación de correo y teléfono.
- Crear una evolución con la nota estructurada real del CRM (Motivo de consulta, Enfermedad
  actual, Examen físico, Impresión clínica, Plan, Diagnósticos, Signos vitales), con
  validación de campos obligatorios y del formato de presión arterial.
- Editar una evolución existente: se guarda como **versión nueva**, no se sobrescribe.
- Firmar y eliminar evoluciones (con confirmación).
- Revisar antecedentes por sección, agregar y quitar datos; el estado de revisión pasa a
  «Cambió desde la revisión» automáticamente al modificar.
- Marcar procedimientos del plan: el porcentaje y el valor pendiente se recalculan.
- **Odontograma** FDI de 52 dientes (permanentes y temporales), cada pieza como cruz de cinco caras.
  Clic en una cara abre el menú de hallazgos —caries, resina, amalgama, ionómero, sellante, fractura,
  desgaste— y volver a elegir el mismo lo quita. Clic en el número abre estado del diente, hallazgos
  de diente completo, ortodoncia y nota. Ausente se dibuja con X, implante con tornillo, corona con
  el contorno relleno.
- El **«Diagnóstico Odontograma»** se redacta solo a partir de lo cargado, y debajo queda un campo
  libre de diagnósticos complementarios.
- **Periodontograma**: PLP, PB y MG por vestibular y por palatino/lingual, tres sitios por cara
  (mesial, central, distal). Se carga entero con Tab —el orden del DOM es el orden clínico y los
  dientes ausentes se saltan solos—; `S` marca sangrado y `P` supuración sobre el sitio enfocado.
  Sobre los dientes se dibujan la línea de margen gingival y la de fondo de bolsa, cortadas donde
  falta una pieza. Encabezado en vivo con % de sangrado, % de PB ≥ 4 mm y NIC promedio.
- **Biopelícula**: bloque vestibular y bloque lingual, cuatro celdas por cara, con índice de placa
  recalculado al instante sobre los dientes presentes.
- Un diente marcado como ausente en el odontograma queda deshabilitado en el periodontograma y en
  la biopelícula, y sale de los denominadores, sin recargar.

### Agenda y clínica

- **Agenda** tipo calendario con vista de semana (lunes a sábado) y de día, de 07:00 a 19:00.
  Cada doctor tiene su color, se puede filtrar por profesional, navegar entre semanas, crear citas
  con validación de duración y horario, y cambiar el estado desde el detalle. Las citas que se
  solapan se reparten en columnas.
- **Historial de citas** del paciente en línea de tiempo, separando próximas de pasadas, con el
  color del doctor y marca de cuáles tienen evolución asociada.
- **Radiografías** en su propia sección, separada de Documentos, tratadas como fotos: filtro por
  tipo (panorámica, periapical, bitewing, CBCT, cefálica), ampliación y carga de imágenes desde el
  equipo. Incluye la nota del correo de recepción, que pide **nombre y número de cédula** en el
  asunto, con la cédula del paciente a la mano para copiar la plantilla.
- **Foto del paciente** y **captura de firma** en un pad de canvas, para consentimientos.
- **Reseñas** del paciente, con calificación y comentario (paridad con el software anterior).
- **Facturación** con cargos, abonos y saldo, y una vista de toda la clínica que cruza a todos los
  pacientes.
- **Evolución del tratamiento por fechas**: qué se ejecutó, cuándo y qué queda pendiente.
- Marcar consentimientos como firmados; crear fórmulas médicas.
- Cambiar entre 3 pacientes con perfiles clínicos distintos y reiniciar la demo.

Las **alertas son calculadas**, no escritas a mano: salen de antecedentes críticos,
secciones sin revisar, consentimientos pendientes y evoluciones sin firmar.

## CRUD disponible

Todo lo que se lista se puede crear, editar y eliminar desde la interfaz, con validación:

| Entidad | Dónde |
|---|---|
| Pacientes | Junto al selector de paciente, arriba. El número de historia se genera solo; el tipo y el número de documento son campos separados |
| Doctores | Configuración. Nombre, especialidad y color de agenda; no deja borrar a un doctor con citas |
| Citas | Agenda: crear, editar, cambiar estado y eliminar |
| Planes y procedimientos | Tratamientos, con búsqueda escrita por cédula o nombre y filtro por paciente |
| Fórmulas | Su sección del expediente |
| Documentos | Módulo compartido por las dos plantillas, con carga de archivo (PDF o imagen) |
| Imágenes | Radiografías: un solo botón «Registrar imagen» que incluye la carga del archivo. Categorías separadas, incluida **Tomografía** |
| Movimientos de cuenta | Cuenta del paciente y Facturación de la clínica |
| Reseñas | Sección propia del navbar, fuera del expediente, con filtro por paciente |
| Antecedentes | Cada dato se edita (valor, fuente, contexto, crítico); al tocarlo la sección vuelve a quedar pendiente de revisión |
| Hallazgos del odontograma | «Editar hallazgos» bajo la leyenda: nombre y color, y al borrar uno se limpia de todas las caras |
| Mediciones periodontales | En la grilla o en el editor por diente, que abre con el número de la pieza |

## Auditoría resuelta (7 sep 2026)

Las 17 recomendaciones de la auditoría CRO/UX están aplicadas. Los cambios de fondo:

- **Evolución progresiva**: abre con 3 campos obligatorios; examen, signos vitales y metadatos
  quedan en bloques plegables. Un error dentro de un bloque plegado lo abre solo.
- **Nada se pierde al cerrar**: si el formulario tiene contenido, avisa antes de descartar.
- **Deshacer 8 s** en los diez borrados reversibles. La confirmación se reserva para lo que
  arrastra otros datos: paciente, plan, doctor y catálogo de hallazgos.
- **Buscador de pacientes** por cédula, nombre o número de historia, con los atendidos
  recientemente como punto de partida. Sustituye al desplegable.
- **Táctil**: con puntero grueso el diente pasa a 78 px (26 por cara, sobre el mínimo de 24 de
  WCAG 2.5.8) y el punto de sondaje gana un área de toque de 26 px.
- **Periodontograma navegable**: cuatro puntos de salto por arco y cara, y una región viva que
  anuncia en qué sitio está el foco.
- **Siglas explicadas**: PLP, PB y MG llevan `abbr` con su significado y rango, y la leyenda las
  desarrolla.
- **Marca permanente de «datos de demostración»** en la barra superior.
- **Sello de guardado** con hora y autoría junto a los campos editables.
- El foco sobrevive a cada re-render, los avisos se anuncian, todas las pantallas tienen `h1`
  y ninguna salta niveles de encabezado. Cero pares de color por debajo de AA.

## Decisiones y notas

- **Dientes que parecían bloqueados**: 18, 28, 38, 48 y los temporales (55–75) están **ausentes**
  en el caso sembrado, no bloqueados. Un diente ausente no tiene caras que marcar; tocarlo abre su
  detalle para devolverlo a «Presente». La dentición temporal se muestra con el interruptor del
  arco, apagado por defecto porque en un adulto solo estorba.
- **Vista de mes en la agenda**: hoy hay semana y día; falta confirmar si se necesita mes.

## Preguntas para los doctores

1. ¿Cuánta información cabe antes de que la pantalla estorbe?
2. ¿La nota clínica se edita mejor en modal (A y C) o en un panel fijo (B)?
3. ¿El riel de contexto de B compensa el ancho que ocupa?
4. ¿Vale la pena que cada doctor configure su propio tablero, como en C?
5. ¿Qué debería estar siempre visible sin un clic? (alergias, saldo, próxima cita, plan)

## Estructura

```
index.html                     galería comparativa
option-a-command-center.html   ┐ cascarones; la pantalla la arma el JS
option-b-split-workspace.html  ┘
styles.css                     estilos de todo
js/data.js                     datos de demostración, numeración FDI y expediente dental
js/dental.js                   odontograma, periodontograma y biopelícula compartidos
js/clinic.js                   agenda, citas, radiografías, foto, firma, reseñas y facturación
js/store.js                    estado compartido + persistencia + sincronía entre pestañas
js/ui.js                       formato, selectores, modales, edición en línea, odontograma
js/option-{a,b}.js             el render de cada concepto
```

Las tres opciones leen del mismo store: lo que edites en una se ve en las otras, incluso en
otra pestaña abierta. «Reiniciar demo» vuelve al estado inicial.

## Cómo se verifica el responsive

`styles.css` termina con **todas** las media queries y ninguna regla suelta después. Es una regla
del archivo, no una preferencia: a igual especificidad gana la última declaración, así que una
regla añadida al final deshace en silencio el comportamiento por ancho. Hay un script que lo
comprueba y otro que mide el render real en Edge a 360, 414, 768, 1024, 1280 y 1600 px buscando
desbordes horizontales, solapes y texto recortado. jsdom no calcula layout: para esto hace falta
un motor de render de verdad.

## Responsive

Todo el layout es **mobile-first**: la base es la pantalla angosta y las media queries van
ampliando (640 px, 900 px, 1100 px, 1400 px).

- El **navbar** es una barra superior con botón de menú en móvil y tableta: la navegación entra
  como **cajón lateral** desde la izquierda, con fondo oscurecido, y se cierra al elegir sección,
  al tocar el fondo o con `Esc`. Desde 1100 px pasa a columna lateral con `position: fixed` (y el
  contenido corrido con `margin-left`), así el color cubre toda la altura sin importar el scroll.
  El logo escala con `clamp()`.
- El body usa `overflow-x: clip` en lugar de `hidden`: `hidden` convierte al body en contenedor de
  scroll y rompe `position: sticky` de los elementos hijos.
- La **barra superior** es una sola línea: migas, selector de paciente, su CRUD, las acciones
  frecuentes y la sesión. Nunca envuelve; si no cabe, se desliza. Las migas se ocultan por debajo de
  1100 px para dejarle el ancho a los controles.
- Los **controles de cada sección** (buscadores, filtros, botones de alta) van en la línea del
  título. Hasta 900 px el encabezado apila título y controles, y los controles ocupan el ancho
  completo para que todas las secciones se vean iguales.
- En la plantilla 2, las **once secciones del expediente** son una tira horizontal fija en pantalla
  angosta —solo la activa muestra su nombre, el resto van por icono— y vuelven a lista vertical
  desde 900 px. Al cambiar de sección la página sube al inicio.
- Los espaciados y tamaños de letra usan `clamp()`, así que no hay saltos bruscos.
- Las rejillas usan `repeat(auto-fit, minmax(...))`: se reacomodan solas sin media queries.
- El **arco dental** se parte por cuadrantes y envuelve en pantalla angosta, en vez de scrollear.
- El único bloque con scroll horizontal propio es la **grilla del periodontograma**: 16 dientes ×
  3 sitios no caben en un teléfono, y comprimirlos los volvería inservibles. Para esos casos está
  el editor por diente, que se abre tocando el número de la pieza.
- `html, body { overflow-x: hidden }`: la página nunca scrollea en horizontal.

## Notas de implementación

- Sin dependencias ni build. Scripts clásicos (no módulos ES) para que abran desde `file://`.
- Iconografía de línea en SVG inline, sin emoji y sin fuentes de iconos.
- Todo lo que puede desbordar a lo ancho (arcos, grilla periodontal, tablas) scrollea dentro de su
  propia caja: la página nunca hace scroll horizontal.
- Los módulos dentales se escriben una sola vez en `js/dental.js` y cada opción los coloca donde
  quiera; por eso las tres muestran exactamente la misma información.
- Todo el texto que viene de datos pasa por escapado de HTML.
- Modales con foco atrapado, cierre con `Esc` y devolución del foco al abridor.
- Atajos: `Alt`+`1`/`2`/`3` saltan entre prototipos. En B, la sección queda en la URL.
- El vocabulario clínico sigue el del CRM real
  (`modules/healthcare/pacientes/_i18n/text/es.ts`): secciones, tipos de consulta, estados
  de revisión de antecedentes y sub-vistas de tratamientos.
