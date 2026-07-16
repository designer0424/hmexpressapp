let perfilActual = null;
let unsubscribeServicios = null;

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
}

function renderServicioCard(s) {
  const est = ESTADOS[s.estado] || ESTADOS.pendiente;
  let acciones = "";
  if (s.estado === "pendiente") {
    acciones = `<button class="btn btn-primary btn-sm" data-iniciar="${s.id}">${icon("play", 13)} Iniciar</button>`;
  } else if (s.estado === "en_curso") {
    acciones = `<button class="btn btn-outline btn-sm" data-terminar="${s.id}" style="border-color:var(--green);color:var(--green)">${icon("check", 13)} Terminar</button>`;
  }

  return `
    <div class="service-row" style="flex-wrap:wrap">
      <div class="icon-wrap">${icon(iconoTipoServicio(s.tipoServicio), 17, "#2F6FD6")}</div>
      <div class="info">
        <div class="title">${escapeHtml(s.clienteNombre)} <span style="color:var(--gray);font-weight:500">· ${escapeHtml(s.tipoServicio)}</span></div>
        <div class="sub">${escapeHtml(s.direccion)}${s.clienteTelefono ? " · " + escapeHtml(s.clienteTelefono) : ""}</div>
        ${s.notas ? `<div class="sub" style="font-style:italic">${escapeHtml(s.notas)}</div>` : ""}
      </div>
      <div class="amount">
        <div class="value">${fmtMoney(s.valor)}</div>
        <span class="badge ${est.class}">${est.label}</span>
      </div>
      ${acciones ? `<div class="actions" style="width:100%;justify-content:flex-end;margin-top:6px">${acciones}</div>` : ""}
    </div>
  `;
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
