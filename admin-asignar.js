let tipoSeleccionado = "";
let editandoId = null; // si no es null, el formulario está en modo edición

function initAsignar() {
  cargarTrabajadoresEnSelect();
  pintarTiposServicio();
  document.getElementById("fecha-programada").value = hoyISO();
  document.getElementById("form-asignar").addEventListener("submit", guardarServicio);
  document.getElementById("btn-cancelar-edicion").addEventListener("click", cancelarEdicion);
}

function cargarTrabajadoresEnSelect() {
  db.collection("usuarios")
    .where("rol", "==", "trabajador")
    .onSnapshot((snap) => {
      const select = document.getElementById("select-trabajador");
      const actual = select.value;
      const activos = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.activo !== false) activos.push({ uid: doc.id, ...d });
      });
      select.innerHTML =
        '<option value="">Selecciona un trabajador</option>' +
        activos.map((t) => `<option value="${t.uid}" data-nombre="${escapeHtml(t.nombre)}">${escapeHtml(t.nombre)}</option>`).join("");
      if (activos.some((t) => t.uid === actual)) select.value = actual;
    });
}

function pintarTiposServicio() {
  const cont = document.getElementById("tipos-servicio-grid");
  cont.innerHTML = TIPOS_SERVICIO.map(
    (t) => `<button type="button" class="service-type-btn" data-tipo="${t.id}">${icon(t.icon, 18)}<span>${t.id}</span></button>`
  ).join("");
  cont.querySelectorAll("[data-tipo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tipoSeleccionado = btn.getAttribute("data-tipo");
      cont.querySelectorAll(".service-type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      actualizarCamposDireccion();
    });
  });
}

function actualizarCamposDireccion() {
  const esDomicilio = tipoSeleccionado === "Domicilios";
  document.getElementById("campo-direccion-unica").classList.toggle("hidden", esDomicilio);
  document.getElementById("campo-direcciones-domicilio").classList.toggle("hidden", !esDomicilio);
}

async function guardarServicio(e) {
  e.preventDefault();
  const errorEl = document.getElementById("asignar-error");
  const successEl = document.getElementById("asignar-success");
  errorEl.textContent = "";
  successEl.textContent = "";

  const selectTrabajador = document.getElementById("select-trabajador");
  const trabajadorUid = selectTrabajador.value;
  const trabajadorNombre = selectTrabajador.selectedOptions[0]?.getAttribute("data-nombre") || "";
  const cliente = document.getElementById("input-cliente").value.trim();
  const telefono = document.getElementById("input-telefono").value.trim();
  const valor = Number(document.getElementById("input-valor").value);
  const metodoPago = document.getElementById("select-metodo-pago").value;
  const notas = document.getElementById("input-notas").value.trim();
  const fechaProgramada = document.getElementById("fecha-programada").value;

  const esDomicilio = tipoSeleccionado === "Domicilios";
  const direccion = document.getElementById("input-direccion").value.trim();
  const direccionRecogida = document.getElementById("input-direccion-recogida").value.trim();
  const direccionEntrega = document.getElementById("input-direccion-entrega").value.trim();

  if (!trabajadorUid || !cliente || !tipoSeleccionado || !valor || !fechaProgramada) {
    errorEl.textContent = "Completa trabajador, cliente, tipo de servicio, valor y fecha.";
    return;
  }
  if (esDomicilio && (!direccionRecogida || !direccionEntrega)) {
    errorEl.textContent = "Completa la dirección de recogida y la de entrega.";
    return;
  }
  if (!esDomicilio && !direccion) {
    errorEl.textContent = "Completa la dirección.";
    return;
  }
  if (valor <= 0) {
    errorEl.textContent = "El valor debe ser mayor a 0.";
    return;
  }

  const datos = {
    trabajadorUid,
    trabajadorNombre,
    clienteNombre: cliente,
    clienteTelefono: telefono,
    tipoServicio: tipoSeleccionado,
    valor,
    metodoPago,
    notas,
    fechaProgramada,
  };

  if (esDomicilio) {
    datos.direccionRecogida = direccionRecogida;
    datos.direccionEntrega = direccionEntrega;
    datos.direccion = direccionEntrega; // se usa como dirección "general" para búsquedas y listados
  } else {
    datos.direccion = direccion;
  }

  try {
    if (editandoId) {
      const datosUpdate = { ...datos };
      if (!esDomicilio) {
        datosUpdate.direccionRecogida = firebase.firestore.FieldValue.delete();
        datosUpdate.direccionEntrega = firebase.firestore.FieldValue.delete();
      }
      await db.collection("servicios").doc(editandoId).update(datosUpdate);
      successEl.textContent = "✓ Servicio actualizado correctamente";
    } else {
      const perfil = await obtenerPerfil(auth.currentUser.uid);
      await db.collection("servicios").add({
        ...datos,
        estado: "pendiente",
        horaInicio: null,
        horaFin: null,
        asignadoPorUid: auth.currentUser.uid,
        asignadoPorNombre: perfil.nombre,
        fechaAsignacion: firebase.firestore.FieldValue.serverTimestamp(),
      });
      successEl.textContent = "✓ Servicio asignado correctamente";
    }
    resetFormAsignar();
    setTimeout(() => (successEl.textContent = ""), 3000);
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Ocurrió un error guardando el servicio. Intenta de nuevo.";
  }
}

function resetFormAsignar() {
  document.getElementById("form-asignar").reset();
  document.getElementById("fecha-programada").value = hoyISO();
  tipoSeleccionado = "";
  document.querySelectorAll(".service-type-btn").forEach((b) => b.classList.remove("active"));
  actualizarCamposDireccion();
  editandoId = null;
  document.getElementById("titulo-form-asignar").textContent = "Asignar servicio";
  document.getElementById("btn-guardar-servicio").innerHTML = icon("plus", 16) + " Asignar servicio";
  document.getElementById("btn-cancelar-edicion").classList.add("hidden");
}

// Llamado desde admin-servicios.js cuando se presiona "editar"
function cargarServicioParaEditar(servicio) {
  editandoId = servicio.id;
  document.getElementById("select-trabajador").value = servicio.trabajadorUid;
  document.getElementById("input-cliente").value = servicio.clienteNombre;
  document.getElementById("input-telefono").value = servicio.clienteTelefono || "";
  document.getElementById("input-direccion").value = servicio.tipoServicio === "Domicilios" ? "" : (servicio.direccion || "");
  document.getElementById("input-direccion-recogida").value = servicio.direccionRecogida || "";
  document.getElementById("input-direccion-entrega").value = servicio.direccionEntrega || "";
  document.getElementById("input-valor").value = servicio.valor;
  document.getElementById("select-metodo-pago").value = servicio.metodoPago;
  document.getElementById("input-notas").value = servicio.notas || "";
  document.getElementById("fecha-programada").value = servicio.fechaProgramada;

  tipoSeleccionado = servicio.tipoServicio;
  document.querySelectorAll(".service-type-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-tipo") === servicio.tipoServicio);
  });
  actualizarCamposDireccion();

  document.getElementById("titulo-form-asignar").textContent = "Editar servicio";
  document.getElementById("btn-guardar-servicio").innerHTML = icon("check", 16) + " Guardar cambios";
  document.getElementById("btn-cancelar-edicion").classList.remove("hidden");

  cambiarTab("asignar");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicion() {
  resetFormAsignar();
}
