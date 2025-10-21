// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDF3JbaIXh7niaPJcshu1KnJl9dNGPCUHk",
  authDomain: "asistenciaconreconocimiento.firebaseapp.com",
  projectId: "asistenciaconreconocimiento",
  storageBucket: "asistenciaconreconocimiento.firebasestorage.app",
  messagingSenderId: "973062515655",
  appId: "1:973062515655:web:d249787d1c89a9f27147e2",
  measurementId: "G-PSGDE2EG85"
};

const app = initializeApp(firebaseConfig);

// 🔹 Exportamos para usar en otros componentes
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
