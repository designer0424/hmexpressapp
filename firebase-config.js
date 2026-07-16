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
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-SxqNP1o1V8Cl668yRnxBdSe2L3uE0WA",
  authDomain: "hmexpressapp.firebaseapp.com",
  projectId: "hmexpressapp",
  storageBucket: "hmexpressapp.firebasestorage.app",
  messagingSenderId: "829349252271",
  appId: "1:829349252271:web:92c9a63cb9c818dd60985a",
  measurementId: "G-T7BVT8GYFR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
