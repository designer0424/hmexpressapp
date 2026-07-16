document.addEventListener("DOMContentLoaded", () => {
  protegerPagina("admin", () => {
    initDashboard();
    initAsignar();
    initServicios();
    initTrabajadores();
    initTabs();
  });
});

function initTabs() {
  document.querySelectorAll(".tabnav button[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => cambiarTab(btn.getAttribute("data-tab")));
  });
}

function cambiarTab(tab) {
  document.querySelectorAll(".tabnav button[data-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== "tab-" + tab);
  });
}
