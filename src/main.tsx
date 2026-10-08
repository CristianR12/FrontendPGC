import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import App from "./App";

// Aplica el tema guardado desde el arranque, para que la pantalla de carga ya salga en claro u oscuro
try {
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
} catch {
  /* sin almacenamiento: queda el tema claro */
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);

