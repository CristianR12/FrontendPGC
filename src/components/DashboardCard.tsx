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
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "25px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      borderLeft: `5px solid ${color}`
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-5px)";
      e.currentTarget.style.boxShadow = "0 5px 20px rgba(0,0,0,0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ 
            margin: "0 0 10px 0", 
            color: "#666", 
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
        <div style={{ fontSize: "3rem" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}