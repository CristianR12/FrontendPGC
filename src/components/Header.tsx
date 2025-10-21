// src/components/Header.tsx
import logoUni from "../assets/imagenes/logo_uni.png";
import iaImg from "../assets/imagenes/IA.png";

interface HeaderProps {
  title: string;
  showLogout?: boolean;
  onLogout?: () => void;
}

/**
 * Header reutilizable que cambia su contenido según el contexto
 * - En Login: solo muestra el título sin botón de logout
 * - En páginas autenticadas: muestra título + botón de cerrar sesión
 */
export function Header({ title, showLogout = false, onLogout }: HeaderProps) {
  return (
    <div className="cabecera">
      {/* Logo Universidad - Izquierda */}
      <div style={{ width: "150px", display: "flex", justifyContent: "center" }}>
        <img src={logoUni} alt="Logo Universidad" className="logo-universidad" />
      </div>

      {/* Título dinámico - Centro */}
      <div className="mensaje-central">{title}</div>

      {/* Imagen IA + Botón Logout condicional - Derecha */}
      <div style={{ 
        width: "150px", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        flexDirection: "column", 
        gap: "10px" 
      }}>
        <img src={iaImg} alt="Imagen IA" className="imagen-ia" />
        
        {showLogout && onLogout && (
          <button 
            onClick={onLogout} 
            className="btn-logout"
            style={{ 
              padding: "8px 16px", 
              fontSize: "0.9rem",
              backgroundColor: "#d32f2f",
              color: "white"
            }}
          >
            Cerrar Sesión
          </button>
        )}
      </div>
    </div>
  );
}