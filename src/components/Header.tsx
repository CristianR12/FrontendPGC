// src/components/Header.tsx
import { useEffect, useState } from "react";
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
 * - El logo se adapta automáticamente al modo oscuro
 */
export function Header({ title, showLogout = false, onLogout }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Verificar el estado inicial del dark mode
    const checkDarkMode = () => {
      const hasDarkMode = document.body.classList.contains('dark-mode');
      setIsDarkMode(hasDarkMode);
    };

    checkDarkMode();

    // Observar cambios en la clase del body
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="cabecera">
      {/* Logo Universidad - Izquierda */}
      <div style={{ width: "150px", display: "flex", justifyContent: "center" }}>
        <img 
          src={logoUni} 
          alt="Logo Universidad" 
          className="logo-universidad" 
          style={{
            filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
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
      </div>
    </div>
  );
}