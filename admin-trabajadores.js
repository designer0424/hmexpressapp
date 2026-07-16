function initTrabajadores() {
  document.getElementById("form-trabajador").addEventListener("submit", crearTrabajador);
  db.collection("usuarios").where("rol", "==", "trabajador").onSnapshot(
    (snap) => {
      const lista = [];
      snap.forEach((doc) => lista.push({ uid: doc.id, ...doc.data() }));
      lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      pintarTrabajadores(lista);
    },
    (err) => console.error(err)
  );
}

async function crearTrabajador(e) {
  e.preventDefault();
  const errorEl = document.getElementById("trabajador-error");
  const successEl = document.getElementById("trabajador-success");
  const btn = document.getElementById("btn-crear-trabajador");
  errorEl.textContent = "";
  successEl.textContent = "";

  const nombre = document.getElementById("input-nombre-trabajador").value.trim();
  const username = document.getElementById("input-username-trabajador").value.trim().toLowerCase();
  const password = document.getElementById("input-password-trabajador").value;

  if (!nombre || !username || !password) {
    errorEl.textContent = "Completa todos los campos.";
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = "La contraseña debe tener al menos 6 caracteres (mínimo de Firebase).";
    return;
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    errorEl.textContent = "El usuario solo puede tener letras, números, puntos y guiones (sin espacios ni tildes).";
    return;
  }

  const email = usernameToEmail(username);
  btn.disabled = true;
  btn.textContent = "Creando...";

  try {
    // Se crea con la app secundaria para no cerrar la sesión del admin actual
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    await db.collection("usuarios").doc(cred.user.uid).set({
      nombre,
      username,
      email,
      rol: "trabajador",
      activo: true,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await secondaryAuth.signOut();

    document.getElementById("form-trabajador").reset();
    successEl.textContent = `✓ Cuenta creada. El trabajador puede entrar con el usuario "${username}".`;
    setTimeout(() => (successEl.textContent = ""), 5000);
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      errorEl.textContent = "Ese usuario ya existe.";
    } else {
      errorEl.textContent = "No se pudo crear la cuenta. Intenta de nuevo.";
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon("user-plus", 16) + " Crear acceso";
  }
}

function pintarTrabajadores(lista) {
  const cont = document.getElementById("lista-trabajadores");
  document.getElementById("titulo-equipo").textContent = `Equipo (${lista.length})`;

  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state">${icon("users", 28)}<div>Todavía no has creado accesos para tus domiciliarios.</div></div>`;
    return;
  }

  cont.innerHTML = lista
    .map(
      (t) => `
      <div class="service-row" style="margin-bottom:8px">
        <div class="info">
          <div class="title">${escapeHtml(t.nombre)} ${t.activo === false ? '<span class="badge badge-cancelado">Desactivado</span>' : ""}</div>
          <div class="sub">usuario: ${escapeHtml(t.username)}</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-toggle-activo="${t.uid}" data-estado="${t.activo === false ? "activar" : "desactivar"}">
            ${t.activo === false ? "Activar" : "Desactivar"}
          </button>
        </div>
      </div>`
    )
    .join("");

  cont.querySelectorAll("[data-toggle-activo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-toggle-activo");
      const activar = btn.getAttribute("data-estado") === "activar";
      db.collection("usuarios").doc(uid).update({ activo: activar });
    });
  });
}
