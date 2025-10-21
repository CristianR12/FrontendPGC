import logoUni from "../assets/imagenes/logo_uni.png";
import iaImg from "../assets/imagenes/IA.png";

interface HeaderProps {
  title: string;  // Título dinámico que cambiará según la página
  showLogout?: boolean;  // Opcional: mostrar botón de logout
  onLogout?: () => void;  // Función opcional para logout
}

export function Header({ title, showLogout = false, onLogout }: HeaderProps) {
  return (
    <div className="cabecera">
      <div style={{ width: "150px", display: "flex", justifyContent: "center" }}>
        <img src={logoUni} alt="Logo Universidad" className="logo-universidad" />
      </div>

      <div className="mensaje-central">{title}</div>

      <div style={{ width: "150px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "10px" }}>
        <img src={iaImg} alt="Imagen IA" className="imagen-ia" />
        {showLogout && onLogout && (
          <button onClick={onLogout} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            Cerrar Sesión
          </button>
        )}
      </div>
    </div>
  );
}