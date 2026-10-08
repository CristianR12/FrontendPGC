// src/pages/LoginPage.tsx
import { Header } from "../components/Header";
import { Login } from "../components/Login";
import { PieLegal } from "../components/PieLegal";

export function LoginPage() {
  return (
    <>
      <Header title="Sistema de Asistencias" showLogout={false} />
      <Login />
      <PieLegal oscuro={document.body.classList.contains('dark-mode')} />
    </>
  );
}