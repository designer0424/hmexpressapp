let fechaHistorialSeleccionada = null;

function initHistorial() {
  document.getElementById("historial-fecha").addEventListener("change", (e) => {
    fechaHistorialSeleccionada = e.target.value || null;
    pintarHistorial();
  });
}

// Se llama automáticamente cada vez que la lista de servicios se actualiza
// (ver el hook agregado en admin-servicios.js)
function pintarHistorial() {
  const porDia = {};
  todosLosServicios.forEach((s) => {
    if (!porDia[s.fechaProgramada]) porDia[s.fechaProgramada] = { count: 0, total: 0, terminados: 0 };
    porDia[s.fechaProgramada].count++;
    if (s.estado === "terminado") {
      porDia[s.fechaProgramada].terminados++;
      porDia[s.fechaProgramada].total += Number(s.valor) || 0;
    }
  });

  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a));
  const listaEl = document.getElementById("lista-dias-historial");

  if (dias.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">${icon("calendar", 26)}<div>Todavía no hay días con servicios registrados.</div></div>`;
    document.getElementById("detalle-historial").innerHTML = "";
    return;
  }

  if (!fechaHistorialSeleccionada || !porDia[fechaHistorialSeleccionada]) {
    fechaHistorialSeleccionada = dias[0];
  }
  document.getElementById("historial-fecha").value = fechaHistorialSeleccionada;

  listaEl.innerHTML = dias
    .map((d) => {
      const info = porDia[d];
      const activo = d === fechaHistorialSeleccionada;
      const esHoy = d === hoyISO();
      return `
        <button class="dia-btn ${activo ? "active" : ""}" data-dia="${d}">
          <div class="dia-fecha">${fmtFechaLegible(d)} ${esHoy ? '<span class="badge badge-en_curso">Hoy</span>' : ""}</div>
          <div class="dia-meta">${info.count} servicio(s) · ${fmtMoney(info.total)}</div>
        </button>`;
    })
    .join("");

  listaEl.querySelectorAll("[data-dia]").forEach((btn) => {
    btn.addEventListener("click", () => {
      fechaHistorialSeleccionada = btn.getAttribute("data-dia");
      pintarHistorial();
    });
  });

  pintarDetalleHistorial(fechaHistorialSeleccionada);
}

function pintarDetalleHistorial(fecha) {
  const servicios = todosLosServicios.filter((s) => s.fechaProgramada === fecha);
  const terminados = servicios.filter((s) => s.estado === "terminado");
  const totalDia = terminados.reduce((sum, s) => sum + (Number(s.valor) || 0), 0);

  const porTrabajador = {};
  terminados.forEach((s) => (porTrabajador[s.trabajadorNombre] = (porTrabajador[s.trabajadorNombre] || 0) + (Number(s.valor) || 0)));
  const ranking = Object.entries(porTrabajador).sort((a, b) => b[1] - a[1]);

  const cont = document.getElementById("detalle-historial");
  cont.innerHTML = `
    <div class="flex-between" style="margin-bottom:14px">
      <h3 style="margin:0">${fmtFechaLegible(fecha)}</h3>
    </div>

    <div class="grid-stats" style="margin-bottom:16px">
      <div class="stat-pill">
        <div class="pill-head">${icon("package", 14)} Servicios</div>
        <div class="pill-value">${servicios.length}</div>
      </div>
      <div class="stat-pill">
        <div class="pill-head">${icon("check", 14)} Terminados</div>
        <div class="pill-value">${terminados.length}</div>
      </div>
      <div class="stat-pill highlight">
        <div class="pill-head">${icon("dollar", 14)} Ingresos del día</div>
        <div class="pill-value">${fmtMoney(totalDia)}</div>
      </div>
    </div>

    ${
      ranking.length > 0
        ? `<div style="margin-bottom:18px">
             <h3>Por trabajador</h3>
             ${ranking
               .map(
                 ([nombre, val]) => `
                <div class="bar-row">
                  <div class="bar-top"><span style="font-weight:600;color:var(--navy)">${escapeHtml(nombre)}</span><span style="font-weight:700;color:var(--blue-dark)">${fmtMoney(val)}</span></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${(val / ranking[0][1]) * 100}%"></div></div>
                </div>`
               )
               .join("")}
           </div>`
        : ""
    }

    <h3>Todos los servicios de este día</h3>
    <div>
      ${
        servicios.length === 0
          ? `<div class="empty-state">${icon("package", 26)}<div>No hay servicios este día.</div></div>`
          : servicios.map((s) => renderFilaServicio(s)).join("")
      }
    </div>
  `;

  cont.querySelectorAll("[data-editar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = todosLosServicios.find((x) => x.id === btn.getAttribute("data-editar"));
      if (s) cargarServicioParaEditar(s);
    });
  });
  cont.querySelectorAll("[data-eliminar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      db.collection("servicios").doc(btn.getAttribute("data-eliminar")).delete();
    });
  });
}
