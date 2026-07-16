let todosLosServicios = [];
let trabajadoresCache = [];
let confirmandoEliminar = null;

function initServicios() {
  db.collection("usuarios").where("rol", "==", "trabajador").onSnapshot((snap) => {
    trabajadoresCache = [];
    snap.forEach((doc) => trabajadoresCache.push({ uid: doc.id, ...doc.data() }));
    pintarSelectFiltroTrabajador();
  });

  db.collection("servicios").onSnapshot(
    (snap) => {
      todosLosServicios = [];
      snap.forEach((doc) => todosLosServicios.push({ id: doc.id, ...doc.data() }));
      todosLosServicios.sort((a, b) => (b.fechaAsignacion?.seconds || 0) - (a.fechaAsignacion?.seconds || 0));
      aplicarFiltros();
    },
    (err) => console.error(err)
  );

  pintarSelectTiposFiltro();
  document.getElementById("filtro-buscar").addEventListener("input", debounce(aplicarFiltros, 200));
  document.getElementById("filtro-trabajador").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-tipo").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-estado").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-desde").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-hasta").addEventListener("change", aplicarFiltros);
  document.getElementById("btn-exportar-csv").addEventListener("click", exportarCSV);
}

function pintarSelectFiltroTrabajador() {
  const select = document.getElementById("filtro-trabajador");
  const actual = select.value;
  select.innerHTML =
    '<option value="">Todos los trabajadores</option>' +
    trabajadoresCache.map((t) => `<option value="${t.uid}">${escapeHtml(t.nombre)}</option>`).join("");
  select.value = actual;
}

function pintarSelectTiposFiltro() {
  const select = document.getElementById("filtro-tipo");
  select.innerHTML =
    '<option value="">Todos los tipos</option>' + TIPOS_SERVICIO.map((t) => `<option value="${t.id}">${t.id}</option>`).join("");
}

function aplicarFiltros() {
  const buscar = document.getElementById("filtro-buscar").value.toLowerCase();
  const trabajador = document.getElementById("filtro-trabajador").value;
  const tipo = document.getElementById("filtro-tipo").value;
  const estado = document.getElementById("filtro-estado").value;
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;

  const filtrados = todosLosServicios.filter((s) => {
    if (trabajador && s.trabajadorUid !== trabajador) return false;
    if (tipo && s.tipoServicio !== tipo) return false;
    if (estado && s.estado !== estado) return false;
    if (desde && s.fechaProgramada < desde) return false;
    if (hasta && s.fechaProgramada > hasta) return false;
    if (buscar && !s.clienteNombre.toLowerCase().includes(buscar) && !s.direccion.toLowerCase().includes(buscar)) return false;
    return true;
  });

  pintarTablaServicios(filtrados);
}

function pintarTablaServicios(servicios) {
  const cont = document.getElementById("lista-todos-servicios");
  const total = servicios.reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
  document.getElementById("contador-servicios").textContent = `${servicios.length} servicio(s)`;
  document.getElementById("total-filtrado").textContent = fmtMoney(total);

  if (servicios.length === 0) {
    cont.innerHTML = `<div class="empty-state">${icon("package", 30)}<div>No hay servicios que coincidan con estos filtros.</div></div>`;
    return;
  }

  cont.innerHTML = servicios.map((s) => renderFilaServicio(s)).join("");

  cont.querySelectorAll("[data-editar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = todosLosServicios.find((x) => x.id === btn.getAttribute("data-editar"));
      if (s) cargarServicioParaEditar(s);
    });
  });
  cont.querySelectorAll("[data-eliminar]").forEach((btn) => {
    btn.addEventListener("click", () => manejarEliminar(btn.getAttribute("data-eliminar")));
  });
}

function renderFilaServicio(s) {
  const est = ESTADOS[s.estado] || ESTADOS.pendiente;
  const enConfirmacion = confirmandoEliminar === s.id;
  return `
    <div class="service-row">
      <div class="icon-wrap">${icon(iconoTipoServicio(s.tipoServicio), 17, "#2F6FD6")}</div>
      <div class="info">
        <div class="title">${escapeHtml(s.clienteNombre)} <span style="color:var(--gray);font-weight:500">· ${escapeHtml(s.tipoServicio)}</span></div>
        <div class="sub">${escapeHtml(s.direccion)} · ${escapeHtml(s.trabajadorNombre)}</div>
      </div>
      <div class="amount">
        <div class="value">${fmtMoney(s.valor)}</div>
        <span class="badge ${est.class}">${est.label}</span>
      </div>
      <div class="actions">
        ${
          enConfirmacion
            ? `<button class="btn btn-danger btn-sm" data-confirmar-si="${s.id}">Confirmar</button>
               <button class="btn btn-outline btn-sm" data-confirmar-no="${s.id}">${icon("x", 13)}</button>`
            : `<button class="btn btn-outline btn-sm" data-editar="${s.id}">${icon("edit", 13)}</button>
               <button class="btn btn-outline btn-sm" data-eliminar="${s.id}" style="color:var(--red)">${icon("trash", 13)}</button>`
        }
      </div>
    </div>
  `;
}

function manejarEliminar(id) {
  if (confirmandoEliminar === id) return;
  confirmandoEliminar = id;
  aplicarFiltros();
  // enlazar confirmación tras re-render
  setTimeout(() => {
    const btnSi = document.querySelector(`[data-confirmar-si="${id}"]`);
    const btnNo = document.querySelector(`[data-confirmar-no="${id}"]`);
    if (btnSi) btnSi.addEventListener("click", () => eliminarServicio(id));
    if (btnNo) btnNo.addEventListener("click", () => { confirmandoEliminar = null; aplicarFiltros(); });
  }, 0);
}

async function eliminarServicio(id) {
  await db.collection("servicios").doc(id).delete();
  confirmandoEliminar = null;
}

function exportarCSV() {
  const buscar = document.getElementById("filtro-buscar").value.toLowerCase();
  const trabajador = document.getElementById("filtro-trabajador").value;
  const tipo = document.getElementById("filtro-tipo").value;
  const estado = document.getElementById("filtro-estado").value;
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;

  const filtrados = todosLosServicios.filter((s) => {
    if (trabajador && s.trabajadorUid !== trabajador) return false;
    if (tipo && s.tipoServicio !== tipo) return false;
    if (estado && s.estado !== estado) return false;
    if (desde && s.fechaProgramada < desde) return false;
    if (hasta && s.fechaProgramada > hasta) return false;
    if (buscar && !s.clienteNombre.toLowerCase().includes(buscar) && !s.direccion.toLowerCase().includes(buscar)) return false;
    return true;
  });

  const header = ["Fecha programada", "Trabajador", "Cliente", "Telefono", "Direccion", "Tipo", "Valor", "Metodo de pago", "Estado", "Notas"];
  const rows = filtrados.map((s) => [
    s.fechaProgramada, s.trabajadorNombre, s.clienteNombre, s.clienteTelefono, s.direccion,
    s.tipoServicio, s.valor, s.metodoPago, ESTADOS[s.estado]?.label || s.estado, (s.notas || "").replace(/\n/g, " "),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hmexpress-servicios-${hoyISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
