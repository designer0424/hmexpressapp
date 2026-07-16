/*
  CONFIGURACIÓN DE FIREBASE — HM Express
  ----------------------------------------
  1. Ve a https://console.firebase.google.com
  2. Crea un proyecto (o usa uno existente)
  3. En "Compilación" activa:
       - Authentication → método "Correo electrónico/contraseña"
       - Firestore Database → crear en modo producción
  4. Ve a Configuración del proyecto → Tus apps → Web (</>) y copia el objeto de configuración aquí abajo.
*/

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

// Dominio interno usado para convertir "usuario" en un correo válido para Firebase Auth.
// El trabajador nunca ve ni necesita este correo, solo su "usuario".
const DOMINIO_INTERNO = "hmexpress.local";

// App principal: la que usan admin y trabajadores para iniciar sesión normalmente.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// App secundaria: SOLO se usa para crear cuentas nuevas de trabajadores desde el
// panel de administrador, sin cerrar la sesión del admin que las está creando.
// (Es un patrón estándar de Firebase para "admin crea usuarios desde el cliente").
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = secondaryApp.auth();

function usernameToEmail(username) {
  return username.trim().toLowerCase().replace(/\s+/g, "") + "@" + DOMINIO_INTERNO;
}
