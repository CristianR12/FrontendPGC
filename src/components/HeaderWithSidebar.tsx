// src/components/HeaderWithSidebar.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { 
  HomeIcon as HomeIconHero,
  ClipboardIcon,
  PlusIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MoonIcon,
  SunIcon,
  Cog6ToothIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/solid';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface HeaderWithSidebarProps {
  children: React.ReactNode;
}

export function HeaderWithSidebar({ children }: HeaderWithSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nombrePersona, setNombrePersona] = useState<string>('Usuario');
  
  const user = auth.currentUser;

  // Cargar tema guardado
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  // Cargar nombre de la base de datos
  useEffect(() => {
    const cargarNombre = async () => {
      if (!user) return;

      try {
        const personsRef = collection(db, 'person');
        const q = query(personsRef, where('profesorUID', '==', user.uid), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          const nombre = data.namePerson || 'Usuario';
          
          // Extraer primer nombre y primer apellido
          const partes = nombre.trim().split(' ');
          const nombreFormato = partes.length >= 2 
            ? `${partes[0]} ${partes[1]}`
            : partes[0];
          
          setNombrePersona(nombreFormato);
        }
      } catch (error) {
        console.error('Error al cargar nombre:', error);
      }
    };

    cargarNombre();
  }, [user]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de cerrar sesión?')) {
      try {
        await signOut(auth);
        navigate('/');
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
    }
  };

  const menuItems = [
    {
      category: 'Principal',
      items: [
        { icon: <HomeIconHero style={{ width: 20, height: 20, color: "#2196F3" }} />, label: 'Inicio', path: '/home' },
      ]
    },
    {
      category: 'Gestión',
      items: [
        { icon: <ClipboardIcon style={{ width: 20, height: 20 }} />, label: 'Asistencias', path: '/asistencias' },
        
      ]
    },
    {
      category: 'Reportes',
      items: [
        { icon: <DocumentTextIcon style={{ width: 20, height: 20 }} />, label: 'Generar Reportes', path: '/reportes' },
      ]
    },
    {
      category: 'Estadísticas y Análisis',
      items: [
        { icon: <ChartBarIcon style={{ width: 20, height: 20 }} />, label: 'Estadísticas', path: '/estadisticas' },
        { icon: <ArrowTrendingUpIcon style={{ width: 20, height: 20 }} />, label: 'Análisis', path: '/analisis' },
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Header Superior */}
      <div style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: darkMode ? '#1e1e1e' : 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        transition: 'all 0.3s ease'
      }}>
        {/* Botón Menú + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              padding: 0,
              color: darkMode ? '#fff' : '#333'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {sidebarOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem',
            color: darkMode ? '#fff' : '#2b7a78',
            fontWeight: '700'
          }}>
            Sistema de Asistencias
          </h1>
        </div>

        {/* Controles Derecha */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Modo Oscuro/Claro */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              padding: 0,
              color: darkMode ? '#FFD700' : '#4a5568'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2) rotate(20deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Configuraciones */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Configuraciones"
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                padding: 0,
                color: darkMode ? '#fff' : '#333'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2) rotate(90deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              }}
            >
              <Cog6ToothIcon />
            </button>

            {/* Menú Configuraciones */}
            {showSettings && (
              <div style={{
                position: 'absolute',
                top: '55px',
                right: 0,
                background: darkMode ? '#2d2d2d' : 'white',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                minWidth: '200px',
                padding: '10px',
                zIndex: 1001,
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  color: darkMode ? '#fff' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? '#3d3d3d' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  👤 Perfil
                </div>
                <div style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  color: darkMode ? '#fff' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? '#3d3d3d' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🔔 Notificaciones
                </div>
                <div style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  color: darkMode ? '#fff' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? '#3d3d3d' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🎨 Preferencias
                </div>
              </div>
            )}
          </div>

          {/* Cerrar Sesión */}
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            style={{
              width: 'auto',
              height: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              padding: 0,
              gap: '8px',
              color: '#f44336',
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.color = '#d32f2f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.color = '#f44336';
            }}
          >
            Cerrar sesión
            <ArrowRightStartOnRectangleIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      </div>

      {/* Overlay cuando sidebar está abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: '70px',
        left: sidebarOpen ? 0 : '-300px',
        width: '280px',
        height: 'calc(100vh - 70px)',
        background: darkMode ? '#1e1e1e' : 'white',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        zIndex: 999,
        transition: 'left 0.3s ease',
        overflowY: 'auto',
        paddingTop: '20px'
      }}>
        {/* Perfil Usuario */}
        <div style={{
          padding: '20px',
          borderBottom: `2px solid ${darkMode ? '#2d2d2d' : '#f0f0f0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: user?.photoURL 
              ? `url(${user.photoURL}) center/cover` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            {!user?.photoURL && (nombrePersona?.[0] || user?.email?.[0] || '👤')}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ 
              fontWeight: 'bold',
              fontSize: '1rem',
              color: darkMode ? '#fff' : '#333',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {nombrePersona}
            </div>
            <div style={{ 
              fontSize: '0.85rem',
              color: darkMode ? '#aaa' : '#666',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Menú de Navegación */}
        <div style={{ padding: '10px 0' }}>
          {menuItems.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '10px 20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: darkMode ? '#888' : '#999',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {section.category}
              </div>
              
              {section.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  style={{
                    padding: '12px 20px',
                    margin: '2px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isActive(item.path) 
                      ? (darkMode ? '#2d2d2d' : '#e3f2fd')
                      : 'transparent',
                    color: isActive(item.path)
                      ? (darkMode ? '#fff' : '#2196F3')
                      : (darkMode ? '#ccc' : '#666'),
                    fontWeight: isActive(item.path) ? '600' : '400',
                    transition: 'all 0.2s',
                    borderLeft: isActive(item.path) ? '3px solid #2196F3' : '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = darkMode ? '#2d2d2d' : '#f5f5f5';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer Sidebar */}
        <div style={{
          padding: '15px 20px',
          marginTop: '20px',
          borderTop: `2px solid ${darkMode ? '#2d2d2d' : '#f0f0f0'}`,
          fontSize: '0.75rem',
          color: darkMode ? '#666' : '#999',
          textAlign: 'center'
        }}>
          © 2025 Sistema de Asistencias
        </div>
      </div>

      {/* Contenido Principal */}
      <div style={{ 
        marginTop: '70px',
        minHeight: 'calc(100vh - 70px)',
        transition: 'all 0.3s ease'
      }}>
        {children}
      </div>

      {/* Estilos globales para animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        body.dark-mode::before {
          background: rgba(0, 0, 0, 0.8) !important;
        }

        /* Scrollbar personalizado */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${darkMode ? '#1e1e1e' : '#f1f1f1'};
        }

        ::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#3d3d3d' : '#888'};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#555' : '#555'};
        }
      `}</style>
    </>
  );
}