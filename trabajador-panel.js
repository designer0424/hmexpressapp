let perfilActual = null;
let unsubscribeServicios = null;
let serviciosPorId = {};

document.addEventListener("DOMContentLoaded", () => {
  protegerPagina("trabajador", (perfil) => {
    perfilActual = perfil;
    escucharServiciosDeHoy();
  });
});

function escucharServiciosDeHoy() {
  const hoy = hoyISO();
  unsubscribeServicios = db
    .collection("servicios")
    .where("trabajadorUid", "==", perfilActual.uid)
    .where("fechaProgramada", "==", hoy)
    .onSnapshot(
      (snap) => {
        const servicios = [];
        snap.forEach((doc) => servicios.push({ id: doc.id, ...doc.data() }));
        servicios.sort((a, b) => (a.fechaAsignacion?.seconds || 0) - (b.fechaAsignacion?.seconds || 0));
        pintarServicios(servicios);
      },
      (err) => {
        console.error(err);
        document.getElementById("lista-servicios").innerHTML =
          '<div class="empty-state">No se pudieron cargar tus servicios. Verifica tu conexión.</div>';
      }
    );
}

function pintarServicios(servicios) {
  serviciosPorId = {};
  servicios.forEach((s) => (serviciosPorId[s.id] = s));

  const cont = document.getElementById("lista-servicios");
  const pendientes = servicios.filter((s) => s.estado === "pendiente" || s.estado === "en_curso");
  const terminados = servicios.filter((s) => s.estado === "terminado" || s.estado === "cancelado");

  document.getElementById("stat-total").textContent = servicios.length;
  document.getElementById("stat-pendientes").textContent = pendientes.length;
  document.getElementById("stat-terminados").textContent = terminados.filter((s) => s.estado === "terminado").length;

  if (servicios.length === 0) {
    cont.innerHTML = `<div class="empty-state">${icon("package", 30)}<div>Todavía no tienes servicios asignados para hoy.</div></div>`;
    return;
  }

  let html = "";
  if (pendientes.length > 0) {
    html += `<h3 style="margin:18px 0 10px">Por hacer</h3>`;
    pendientes.forEach((s) => (html += renderServicioCard(s)));
  }
  if (terminados.length > 0) {
    html += `<h3 style="margin:22px 0 10px">Completados hoy</h3>`;
    terminados.forEach((s) => (html += renderServicioCard(s)));
  }
  cont.innerHTML = html;

  // enlazar botones
  cont.querySelectorAll("[data-iniciar]").forEach((btn) => {
    btn.addEventListener("click", () => iniciarServicio(btn.getAttribute("data-iniciar")));
  });
  cont.querySelectorAll("[data-terminar]").forEach((btn) => {
    btn.addEventListener("click", () => terminarServicio(btn.getAttribute("data-terminar")));
  });
  cont.querySelectorAll("[data-copy-id]").forEach((btn) => {
    btn.addEventListener("click", () => copiarCampo(btn));
  });
  cont.querySelectorAll("[data-detalle]").forEach((el) => {
    el.addEventListener("click", () => abrirDetalle(el.getAttribute("data-detalle")));
  });
}

function renderServicioCard(s) {
  const est = ESTADOS[s.estado] || ESTADOS.pendiente;
  let acciones = "";
  if (s.estado === "pendiente") {
    acciones = `<button class="btn btn-primary btn-sm" data-iniciar="${s.id}">${icon("play", 13)} Iniciar</button>`;
  } else if (s.estado === "en_curso") {
    acciones = `<button class="btn btn-outline btn-sm" data-terminar="${s.id}" style="border-color:var(--green);color:var(--green)">${icon("check", 13)} Terminar</button>`;
  }

  const esDomicilioConDosDirecciones = s.tipoServicio === "Domicilios" && s.direccionRecogida && s.direccionEntrega;

  const direccionesHtml = esDomicilioConDosDirecciones
    ? `
      <div class="copy-row">
        <span class="copy-text">📍 Recoger: ${escapeHtml(s.direccionRecogida)}</span>
        <button class="copy-btn" data-copy-id="${s.id}" data-copy-field="direccionRecogida" title="Copiar dirección de recogida">${icon("copy", 12)}</button>
      </div>
      <div class="copy-row">
        <span class="copy-text">🏁 Entregar: ${escapeHtml(s.direccionEntrega)}</span>
        <button class="copy-btn" data-copy-id="${s.id}" data-copy-field="direccionEntrega" title="Copiar dirección de entrega">${icon("copy", 12)}</button>
      </div>`
    : `
      <div class="copy-row">
        <span class="copy-text">${escapeHtml(s.direccion)}</span>
        <button class="copy-btn" data-copy-id="${s.id}" data-copy-field="direccion" title="Copiar dirección">${icon("copy", 12)}</button>
      </div>`;

  return `
    <div class="service-row" style="flex-wrap:wrap">
      <div class="icon-wrap">${icon(iconoTipoServicio(s.tipoServicio), 17, "#2F6FD6")}</div>
      <div class="info">
        <div class="title clickable-title" data-detalle="${s.id}">${escapeHtml(s.clienteNombre)} <span style="color:var(--gray);font-weight:500">· ${escapeHtml(s.tipoServicio)}</span></div>
        ${direccionesHtml}
        ${s.clienteTelefono ? `
        <div class="copy-row">
          <span class="copy-text">${escapeHtml(s.clienteTelefono)}</span>
          <button class="copy-btn" data-copy-id="${s.id}" data-copy-field="clienteTelefono" title="Copiar teléfono">${icon("copy", 12)}</button>
        </div>` : ""}
      </div>
      <div class="amount">
        <div class="value">${fmtMoney(s.valor)}</div>
        <span class="badge ${est.class}">${est.label}</span>
      </div>
      ${acciones ? `<div class="actions" style="width:100%;justify-content:flex-end;margin-top:6px">${acciones}</div>` : ""}
    </div>
  `;
}

function abrirDetalle(id) {
  const s = serviciosPorId[id];
  if (!s) return;
  const esDomicilioConDosDirecciones = s.tipoServicio === "Domicilios" && s.direccionRecogida && s.direccionEntrega;
  const est = ESTADOS[s.estado] || ESTADOS.pendiente;

  const filaConCopia = (label, valor, campo) => `
    <div class="detalle-row">
      <div class="detalle-label">${label}</div>
      <div class="detalle-with-copy">
        <div class="detalle-value">${escapeHtml(valor)}</div>
        <button class="copy-btn" data-copy-id="${s.id}" data-copy-field="${campo}" title="Copiar">${icon("copy", 13)}</button>
      </div>
    </div>`;

  let html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div class="icon-wrap">${icon(iconoTipoServicio(s.tipoServicio), 18, "#2F6FD6")}</div>
      <div>
        <div style="font-weight:800;font-size:16px;color:var(--navy)">${escapeHtml(s.clienteNombre)}</div>
        <span class="badge ${est.class}">${est.label}</span>
      </div>
    </div>
    <div class="detalle-row"><div class="detalle-label">Tipo de servicio</div><div class="detalle-value">${escapeHtml(s.tipoServicio)}</div></div>
  `;

  if (esDomicilioConDosDirecciones) {
    html += filaConCopia("📍 Dirección de recogida", s.direccionRecogida, "direccionRecogida");
    html += filaConCopia("🏁 Dirección de entrega", s.direccionEntrega, "direccionEntrega");
  } else {
    html += filaConCopia("Dirección", s.direccion, "direccion");
  }

  if (s.clienteTelefono) html += filaConCopia("Teléfono", s.clienteTelefono, "clienteTelefono");

  html += `<div class="detalle-row"><div class="detalle-label">Valor del servicio</div><div class="detalle-value">${fmtMoney(s.valor)}</div></div>`;
  html += `<div class="detalle-row"><div class="detalle-label">Método de pago</div><div class="detalle-value">${escapeHtml(s.metodoPago)}</div></div>`;
  if (s.notas) html += `<div class="detalle-row"><div class="detalle-label">Notas</div><div class="detalle-value" style="font-weight:500">${escapeHtml(s.notas)}</div></div>`;

  document.getElementById("modal-contenido").innerHTML = html;
  document.getElementById("modal-detalle").classList.remove("hidden");
  document.getElementById("modal-contenido").querySelectorAll("[data-copy-id]").forEach((btn) => {
    btn.addEventListener("click", () => copiarCampo(btn));
  });
}

function cerrarDetalle() {
  document.getElementById("modal-detalle").classList.add("hidden");
}

function copiarCampo(btn) {
  const id = btn.getAttribute("data-copy-id");
  const campo = btn.getAttribute("data-copy-field");
  const servicio = serviciosPorId[id];
  if (!servicio) return;
  const texto = servicio[campo] || "";

  const marcarCopiado = () => {
    const original = btn.innerHTML;
    btn.innerHTML = icon("check", 12);
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = icon("copy", 12);
      btn.classList.remove("copied");
    }, 1200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(marcarCopiado).catch(() => copiarConFallback(texto, marcarCopiado));
  } else {
    copiarConFallback(texto, marcarCopiado);
  }
}

function copiarConFallback(texto, onOk) {
  const temp = document.createElement("textarea");
  temp.value = texto;
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand("copy");
    onOk();
  } catch (e) {
    console.error("No se pudo copiar:", e);
  }
  document.body.removeChild(temp);
}

async function iniciarServicio(id) {
  const ref = db.collection("servicios").doc(id);
  await ref.update({
    estado: "en_curso",
    horaInicio: firebase.firestore.FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  notificarPropietario({ id, ...doc.data() }, "inicio");
}

async function terminarServicio(id) {
  const ref = db.collection("servicios").doc(id);
  await ref.update({
    estado: "terminado",
    horaFin: firebase.firestore.FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  notificarPropietario({ id, ...doc.data() }, "fin");
}
