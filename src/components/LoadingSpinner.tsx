export function LoadingSpinner({ message = "Cargando..." }: { message?: string }) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '300px',
        gap: '20px'
      }}>
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    );
  }