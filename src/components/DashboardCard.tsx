// src/components/DashboardCard.tsx
interface DashboardCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

/**
 * Tarjeta reutilizable para mostrar estadísticas en el dashboard
 */
export function DashboardCard({ title, value, icon, color }: DashboardCardProps) {
  const isDarkMode = document.body.classList.contains('dark-mode');
  
  return (
    <div style={{
      background: isDarkMode ? "#2d2d2d" : "white",
      borderRadius: "12px",
      padding: "25px",
      boxShadow: isDarkMode 
        ? "0 2px 10px rgba(0,0,0,0.5)" 
        : "0 2px 10px rgba(0,0,0,0.1)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      borderLeft: `5px solid ${color}`,
      border: isDarkMode ? `1px solid #3d3d3d` : "none",
      borderLeftWidth: "5px",
      borderLeftColor: color
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-5px)";
      e.currentTarget.style.boxShadow = isDarkMode
        ? "0 5px 20px rgba(0,0,0,0.7)"
        : "0 5px 20px rgba(0,0,0,0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = isDarkMode
        ? "0 2px 10px rgba(0,0,0,0.5)"
        : "0 2px 10px rgba(0,0,0,0.1)";
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ 
            margin: "0 0 10px 0", 
            color: isDarkMode ? "#aaa" : "#666", 
            fontSize: "0.9rem",
            fontWeight: "500"
          }}>
            {title}
          </p>
          <p style={{ 
            margin: "0", 
            fontSize: "2.5rem", 
            fontWeight: "bold",
            color: color
          }}>
            {value}
          </p>
        </div>
        <div style={{ fontSize: "3rem", filter: isDarkMode ? "brightness(1.2)" : "none" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}