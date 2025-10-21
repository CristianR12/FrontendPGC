// src/pages/LoginPage.tsx
import { Header } from "../components/Header";
import { Login } from "../components/Login";

export function LoginPage() {
  return (
    <>
      <Header title="Sistema de Asistencias" showLogout={false} />
      <Login />
    </>
  );
}