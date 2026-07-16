// ---------- Login (usado en index.html) ----------
function initLoginForm() {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      errorEl.textContent = "Completa usuario y contraseña";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Ingresando...";

    try {
      const email = usernameToEmail(username);
      await auth.signInWithEmailAndPassword(email, password);
      // El redireccionamiento lo maneja onAuthStateChanged más abajo
    } catch (err) {
      console.error(err);
      // NOTA TEMPORAL DE DIAGNÓSTICO: esto muestra el error real de Firebase
      // para poder identificar la causa exacta. Luego lo volvemos al mensaje normal.
      errorEl.textContent = "Error real: " + err.code + " — " + err.message;
      btn.disabled = false;
      btn.textContent = "Iniciar sesión";
    }
  });

  // Si ya hay sesión activa, redirige directo
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const perfil = await obtenerPerfil(user.uid);
      redirigirSegunRol(perfil);
    }
  });
}

async function obtenerPerfil(uid) {
  const doc = await db.collection("usuarios").doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...doc.data() };
}

function redirigirSegunRol(perfil) {
  if (!perfil || perfil.activo === false) {
    auth.signOut();
    return;
  }
  if (perfil.rol === "admin") {
    window.location.href = "panel-admin.html";
  } else {
    window.location.href = "panel-trabajador.html";
  }
}

// ---------- Protección de páginas internas ----------
// Llamar al inicio de panel-admin.html / panel-trabajador.html
// rolRequerido: "admin" | "trabajador"
function protegerPagina(rolRequerido, onListo) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const perfil = await obtenerPerfil(user.uid);
    if (!perfil || perfil.activo === false) {
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    if (perfil.rol !== rolRequerido) {
      redirigirSegunRol(perfil);
      return;
    }
    pintarTopbar(perfil);
    onListo(perfil);
  });
}

function pintarTopbar(perfil) {
  const nameEl = document.getElementById("topbar-user-name");
  const roleEl = document.getElementById("topbar-user-role");
  if (nameEl) nameEl.textContent = perfil.nombre;
  if (roleEl) roleEl.textContent = perfil.rol === "admin" ? "Administrador" : "Domiciliario";

  const logoutBtn = document.getElementById("topbar-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = "index.html";
    });
  }
}
