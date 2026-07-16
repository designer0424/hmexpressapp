function initDashboard() {
  db.collection("servicios").onSnapshot((snap) => {
    const servicios = [];
    snap.forEach((doc) => servicios.push({ id: doc.id, ...doc.data() }));
    pintarDashboard(servicios);
  });

  db.collection("usuarios").where("rol", "==", "trabajador").onSnapshot((snap) => {
    document.getElementById("stat-trabajadores").textContent = snap.size;
  });
}

function pintarDashboard(servicios) {
  const hoy = hoyISO();
  const deHoy = servicios.filter((s) => s.fechaProgramada === hoy);
  const terminadosHoy = deHoy.filter((s) => s.estado === "terminado");
  const totalHoy = terminadosHoy.reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
  const totalGeneral = servicios.filter((s) => s.estado === "terminado").reduce((sum, s) => sum + (Number(s.valor) || 0), 0);

  document.getElementById("stat-servicios-hoy").textContent = deHoy.length;
  document.getElementById("stat-ingresos-hoy").textContent = fmtMoney(totalHoy);
  document.getElementById("stat-servicios-total").textContent = servicios.length;

  // Ranking por trabajador (solo servicios terminados)
  const porTrabajador = {};
  servicios.filter((s) => s.estado === "terminado").forEach((s) => {
    porTrabajador[s.trabajadorNombre] = (porTrabajador[s.trabajadorNombre] || 0) + (Number(s.valor) || 0);
  });
  const ranking = Object.entries(porTrabajador).sort((a, b) => b[1] - a[1]);
  const maxVal = ranking.length ? ranking[0][1] : 1;

  const rankingEl = document.getElementById("ranking-trabajadores");
  if (ranking.length === 0) {
    rankingEl.innerHTML = `<div class="empty-state">${icon("package", 26)}<div>Aún no hay servicios completados.</div></div>`;
  } else {
    rankingEl.innerHTML = ranking
      .map(
        ([nombre, val]) => `
        <div class="bar-row">
          <div class="bar-top"><span style="font-weight:600;color:var(--navy)">${escapeHtml(nombre)}</span><span style="font-weight:700;color:var(--blue-dark)">${fmtMoney(val)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(val / maxVal) * 100}%"></div></div>
        </div>`
      )
      .join("");
  }

  // Conteo por tipo de servicio
  const porTipo = {};
  servicios.forEach((s) => (porTipo[s.tipoServicio] = (porTipo[s.tipoServicio] || 0) + 1));
  document.getElementById("conteo-tipos").innerHTML = TIPOS_SERVICIO.map(
    (t) => `
      <div style="display:flex;align-items:center;gap:10px">
        ${icon(t.icon, 15, "#2F6FD6")}
        <span style="font-size:12.5px;color:var(--navy);flex:1">${t.id}</span>
        <span style="font-weight:700;font-size:13px;color:var(--blue-dark)">${porTipo[t.id] || 0}</span>
      </div>`
  ).join("");

  document.getElementById("ingresos-generales").textContent = fmtMoney(totalGeneral);

  // Estados del día (para ver de un vistazo qué está pendiente/en curso)
  const pendientes = deHoy.filter((s) => s.estado === "pendiente").length;
  const enCurso = deHoy.filter((s) => s.estado === "en_curso").length;
  document.getElementById("stat-pendientes-hoy").textContent = pendientes;
  document.getElementById("stat-en-curso-hoy").textContent = enCurso;
}
