// src/pages/LoginPage.tsx
import { Header } from "../components/Header";
import { Login } from "../components/Login";

/**
 * Página de Login
 * - Header sin botón de cerrar sesión
 * - Título: "Sistema de Asistencias"
 */
export function LoginPage() {
  return (
    <>
      <Header title="Sistema de Asistencias" showLogout={false} />
      <Login />
    </>
  );
}