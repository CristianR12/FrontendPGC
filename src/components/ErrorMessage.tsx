interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
  }
  
  export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h3>Error</h3>
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} style={{ marginTop: '10px' }}>
            Reintentar
          </button>
        )}
      </div>
    );
  }