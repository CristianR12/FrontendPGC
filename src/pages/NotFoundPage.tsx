// src/pages/NotFoundPage.tsx
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <Header title="Página No Encontrada" showLogout={false} />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{ marginBottom: '20px', opacity: 0.6 }}>
          <SearchX size={120} strokeWidth={1.25} />
        </div>
        
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '20px',
          color: '#333'
        }}>
          404
        </h1>
        
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '20px',
          color: '#666'
        }}>
          Página No Encontrada
        </h2>
        
        <p style={{ 
          fontSize: '1.1rem',
          marginBottom: '30px',
          color: '#888',
          maxWidth: '500px'
        }}>
          La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
        </p>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '15px 30px',
              fontSize: '1.1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Ir al Inicio
          </button>
          
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '15px 30px',
              fontSize: '1.1rem',
              backgroundColor: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Volver Atrás
          </button>
        </div>
      </div>
    </>
  );
}