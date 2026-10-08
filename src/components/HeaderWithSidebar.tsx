// src/components/HeaderWithSidebar.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { obtenerEstadoSesion, limpiarEstadoSesion } from '../services/sesionService';
import { 
  HomeIcon as HomeIconHero,
  ClipboardIcon,
  CalendarDaysIcon,
  BellIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  MoonIcon,
  SunIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/solid';
import { PerfilModal } from './PerfilModal';
import { PanelCambiosEstudiantes } from './PanelCambiosEstudiantes';
import { PanelAvisos } from './PanelAvisos';
import { PieLegal } from './PieLegal';
import { MisDatosModal } from './MisDatosModal';
import estadisticasApiService from '../services/estadisticasApiService';
import type { AvisoCampana } from '../services/estadisticasApiService';
import registroApiService from '../services/registroApiService';
import type { CambioEstudiante } from '../services/registroApiService';

interface HeaderWithSidebarProps {
  children: React.ReactNode;
}

export function HeaderWithSidebar({ children }: HeaderWithSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showPerfilMenu, setShowPerfilMenu] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [misDatosAbierto, setMisDatosAbierto] = useState(false);
  const [ancho, setAncho] = useState(window.innerWidth);
  const [nombrePersona, setNombrePersona] = useState<string>('Usuario');
  const [esProfesor, setEsProfesor] = useState(false);
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [avisos, setAvisos] = useState<AvisoCampana[]>([]);
  const [avisosVistos, setAvisosVistos] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem('avisosVistos') ?? '[]')); } catch { return new Set<string>(); }
  });
  const [cambios, setCambios] = useState<CambioEstudiante[] | null>(null);
  const [errorCambios, setErrorCambios] = useState<string | null>(null);
  const [vistosHasta, setVistosHasta] = useState<string>(() => {
    try { return localStorage.getItem('cambiosEstudiantesVistos') ?? ''; } catch { return ''; }
  });
  
  const user = auth.currentUser;

  // Cargar tema guardado
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  // Nombre y rol: los decide el servidor (el estado de sesión ya está en caché)
  useEffect(() => {
    if (!user) return;
    obtenerEstadoSesion(user.uid).then((e) => {
      setEsProfesor(e.rol === 'Profesor');
      setEsEstudiante(e.rol === 'Estudiante');
      const partes = (e.nombre || 'Usuario').trim().split(' ');
      setNombrePersona(partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0]);
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    const alRedimensionar = () => setAncho(window.innerWidth);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);
  const compacto = ancho < 720;

  // ¿Es administrador? Lo decide el servidor (el estado de sesión ya está en caché)
  useEffect(() => {
    if (!user) return;
    obtenerEstadoSesion(user.uid).then((e) => setEsAdmin(e.esAdmin)).catch(() => setEsAdmin(false));
  }, [user?.uid]);

  const cargarCambios = () => {
    registroApiService.listarCambiosEstudiantes()
      .then((c) => { setCambios(c); setErrorCambios(null); })
      .catch((e) => setErrorCambios(e.message || 'No se pudieron cargar los cambios.'));
  };

  // El administrador ve en la campana lo que modifican los estudiantes
  useEffect(() => {
    if (esAdmin) cargarCambios();
  }, [esAdmin]);

  const nuevosCambios = cambios ? cambios.filter((c) => c.fecha > vistosHasta).length : 0;

  // Avisos de asistencia: el estudiante los recibe sobre lo suyo; el docente, solo los casos críticos
  const cargarAvisos = () => {
    estadisticasApiService.avisos().then(setAvisos).catch(() => undefined);
  };
  useEffect(() => {
    if (!esProfesor && !esEstudiante) return;
    cargarAvisos();
    const t = setInterval(cargarAvisos, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [esProfesor, esEstudiante]);

  const avisosNuevos = avisos.filter((a) => !avisosVistos.has(a.id)).length;
  const totalNuevos = avisosNuevos + (esAdmin ? nuevosCambios : 0);

  const abrirNotificaciones = () => {
    const abrir = !showNotifs;
    setShowNotifs(abrir);
    setShowPerfilMenu(false);
    if (abrir && esAdmin) cargarCambios();
    if (abrir && (esProfesor || esEstudiante)) cargarAvisos();
    if (!abrir && avisos.length) {
      const vistos = new Set([...avisosVistos, ...avisos.map((a) => a.id)]);
      setAvisosVistos(vistos);
      try { localStorage.setItem('avisosVistos', JSON.stringify([...vistos].slice(-300))); } catch { /* sin almacenamiento */ }
    }
    if (!abrir && cambios?.length) {
      const ultimo = cambios.reduce((m, c) => (c.fecha > m ? c.fecha : m), '');
      setVistosHasta(ultimo);
      try { localStorage.setItem('cambiosEstudiantesVistos', ultimo); } catch { /* sin almacenamiento */ }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de cerrar sesión?')) {
      try {
        limpiarEstadoSesion();
        await signOut(auth);
        navigate('/');
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
    }
  };

  const menuCompleto = [
    {
      category: 'Principal',
      items: [
        { icon: <HomeIconHero style={{ width: 20, height: 20, color: "currentColor" }} />, label: 'Inicio', path: '/home' },
      ]
    },
    {
      category: 'Gestión',
      items: [
        { icon: <ClipboardIcon style={{ width: 20, height: 20 }} />, label: 'Todas las asistencias', path: '/asistencias' },
        ...(esProfesor
          ? [
              { icon: <CalendarDaysIcon style={{ width: 20, height: 20 }} />, label: 'Mi horario', path: '/gestion-horarios' },
            ]
          : []),
        
      ]
    },
    ...(esAdmin
      ? [{
          category: 'Administración',
          items: [{ icon: <ShieldCheckIcon style={{ width: 20, height: 20 }} />, label: 'Docentes y solicitudes', path: '/admin/usuarios' }]
        }]
      : []),
    {
      category: 'Estadísticas',
      items: [
        { icon: <ChartBarIcon style={{ width: 20, height: 20 }} />, label: 'Estadísticas', path: '/estadisticas' },
      ]
    }
  ];
  // El estudiante solo tiene su Inicio (horario y asistencias propias)
  const menuItems = esEstudiante ? menuCompleto.slice(0, 1) : menuCompleto;

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
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Notificaciones */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={abrirNotificaciones}
              title="Notificaciones"
              aria-label="Notificaciones"
              aria-expanded={showNotifs}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                color: darkMode ? '#fff' : '#333'
              }}
            >
              <BellIcon style={{ width: '22px', height: '22px' }} />
              {totalNuevos > 0 && (
                <span aria-label={`${totalNuevos} avisos nuevos`} style={{
                  position: 'absolute', top: '-6px', right: '-8px', minWidth: '16px', height: '16px', padding: '0 4px',
                  borderRadius: '8px', background: '#d32f2f', color: 'white', fontSize: '0.68rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
                }}>
                  {totalNuevos > 9 ? '9+' : totalNuevos}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                {/* Capa transparente: un clic fuera cierra el aviso */}
                <div onClick={abrirNotificaciones} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
                <div role="status" style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  zIndex: 1001,
                  width: esAdmin || avisos.length > 0 ? 'min(380px, 90vw)' : undefined,
                  minWidth: '240px',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  padding: '16px',
                  borderRadius: '10px',
                  background: darkMode ? '#2d2d2d' : 'white',
                  color: darkMode ? '#ddd' : '#444',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  fontSize: '0.9rem'
                }}>
                  {avisos.length === 0 && !esAdmin && 'No tienes notificaciones nuevas.'}
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {avisos.length > 0 && (
                      <PanelAvisos avisos={avisos} vistos={avisosVistos} oscuro={darkMode} encabezado={esEstudiante ? 'Tu asistencia' : 'Casos críticos'} />
                    )}
                    {esAdmin && <PanelCambiosEstudiantes cambios={cambios} error={errorCambios} oscuro={darkMode} vistosHasta={vistosHasta} />}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Perfil: al pulsarlo se abren las opciones */}
          <div style={{ position: 'relative' }}>
            <div
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={showPerfilMenu}
              aria-label="Menú del perfil"
              onClick={() => { setShowPerfilMenu(!showPerfilMenu); setShowNotifs(false); }}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (setShowPerfilMenu(!showPerfilMenu), setShowNotifs(false))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', paddingLeft: '8px' }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: user?.photoURL
                  ? `url(${user.photoURL}) center/cover`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                flexShrink: 0
              }}>
                {!user?.photoURL && (nombrePersona?.[0] || user?.email?.[0] || '?')}
              </div>
              {!compacto && (
                <div style={{ maxWidth: '170px', overflow: 'hidden' }}>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    color: darkMode ? '#fff' : '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {nombrePersona}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: darkMode ? '#aaa' : '#666',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user?.email}
                  </div>
                </div>
              )}
              <ChevronDownIcon style={{
                width: '18px',
                height: '18px',
                flexShrink: 0,
                color: darkMode ? '#aaa' : '#666',
                transform: showPerfilMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }} />
            </div>

            {showPerfilMenu && (
              <>
                {/* Capa transparente: un clic fuera cierra el menú */}
                <div onClick={() => setShowPerfilMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
                <div role="menu" style={{
                  position: 'absolute',
                  top: '56px',
                  right: 0,
                  zIndex: 1001,
                  minWidth: '230px',
                  padding: '8px',
                  borderRadius: '12px',
                  background: darkMode ? '#2d2d2d' : 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  display: 'grid',
                  gap: '4px'
                }}>
                  <button
                    role="menuitem"
                    onClick={() => { setShowPerfilMenu(false); setPerfilAbierto(true); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 12px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      color: darkMode ? '#fff' : '#333'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? '#3d3d3d' : '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Editar perfil
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setShowPerfilMenu(false); handleLogout(); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 12px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      color: '#f44336',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? '#3d2a2a' : '#fdecea'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Cerrar sesión
                    <ArrowRightStartOnRectangleIcon style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>
              </>
            )}
          </div>
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
                      ? (darkMode ? '#2d2d2d' : '#e8f5e9')
                      : 'transparent',
                    color: isActive(item.path)
                      ? (darkMode ? '#fff' : '#388E3C')
                      : (darkMode ? '#ccc' : '#666'),
                    fontWeight: isActive(item.path) ? '600' : '400',
                    transition: 'all 0.2s',
                    borderLeft: isActive(item.path) ? '3px solid #4CAF50' : '3px solid transparent'
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
          © {new Date().getFullYear()} Sistema de Asistencias
        </div>
      </div>

      {/* Contenido Principal: columna flex para que el pie siempre quede al fondo, sin saltar cuando el contenido carga */}
      <div style={{
        marginTop: '70px',
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ flex: 1 }}>{children}</div>
        <PieLegal oscuro={darkMode} onMisDatos={esProfesor || esEstudiante ? () => setMisDatosAbierto(true) : undefined} />
      </div>

      {misDatosAbierto && <MisDatosModal oscuro={darkMode} onCerrar={() => setMisDatosAbierto(false)} />}

      {perfilAbierto && <PerfilModal oscuro={darkMode} onCerrar={() => setPerfilAbierto(false)} />}

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