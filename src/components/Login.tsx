// src/components/Login.tsx
import { useState } from "react";
import { auth, provider } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { Toast } from "./Toast";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // Campos adicionales para registro
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  const closeNotification = () => {
    setNotification({ ...notification, show: false });
  };

  // Login con email y contraseña
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuario autenticado:", userCredential.user.email);
      
      const user = userCredential.user;
      const token = await user.getIdToken();
      localStorage.setItem("authToken", token);

      console.log("🔐 Token guardado:", token);
      showNotification(`¡Bienvenido ${userCredential.user.email}!`, 'success');
      
      // Resetear intentos fallidos al iniciar sesión correctamente
      setFailedAttempts(0);
      
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (err: any) {
      console.error("❌ Error en login:", err);
      
      // Incrementar intentos fallidos
      setFailedAttempts(prev => prev + 1);
      
      let errorMessage = "Error al iniciar sesión";
      
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No existe una cuenta con este correo";
          break;
        case "auth/wrong-password":
          errorMessage = "Contraseña incorrecta";
          break;
        case "auth/invalid-email":
          errorMessage = "Formato de correo inválido";
          break;
        case "auth/invalid-credential":
          errorMessage = "Credenciales inválidas. Verifica tu correo y contraseña";
          break;
        case "auth/too-many-requests":
          errorMessage = "Demasiados intentos. Intenta más tarde";
          break;
        default:
          errorMessage = "Error de autenticación. Verifica tus datos";
      }
      
      showNotification(errorMessage, 'error');
      setLoading(false);
    }
  };

  // Registro de nuevo usuario
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (password !== confirmPassword) {
      showNotification("Las contraseñas no coinciden", 'error');
      return;
    }
    
    if (password.length < 6) {
      showNotification("La contraseña debe tener al menos 6 caracteres", 'error');
      return;
    }
    
    if (!displayName.trim()) {
      showNotification("Por favor ingresa tu nombre completo", 'error');
      return;
    }

    setLoading(true);

    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuario registrado:", userCredential.user.email);
      
      // Actualizar el perfil con el nombre
      await updateProfile(userCredential.user, {
        displayName: displayName.trim()
      });
      
      const user = userCredential.user;
      const token = await user.getIdToken();
      localStorage.setItem("authToken", token);

      console.log("🔐 Token guardado:", token);
      showNotification(`¡Cuenta creada exitosamente! Bienvenido ${displayName}`, 'success');
      
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (err: any) {
      console.error("❌ Error en registro:", err);
      
      let errorMessage = "Error al crear la cuenta";
      
      switch (err.code) {
        case "auth/email-already-in-use":
          errorMessage = "Este correo ya está registrado. Intenta iniciar sesión";
          break;
        case "auth/invalid-email":
          errorMessage = "Formato de correo inválido";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Registro de usuarios deshabilitado";
          break;
        case "auth/weak-password":
          errorMessage = "La contraseña es muy débil. Usa al menos 6 caracteres";
          break;
        default:
          errorMessage = "Error al crear la cuenta. Intenta nuevamente";
      }
      
      showNotification(errorMessage, 'error');
      setLoading(false);
    }
  };

  // Recuperar contraseña
  const handlePasswordReset = async () => {
    if (!email) {
      showNotification("Por favor ingresa tu correo electrónico", 'info');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      showNotification(
        `Se ha enviado un correo de recuperación a ${email}. Revisa tu bandeja de entrada.`,
        'success'
      );
      setLoading(false);
    } catch (err: any) {
      console.error("❌ Error al enviar correo de recuperación:", err);
      
      let errorMessage = "Error al enviar correo de recuperación";
      
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No existe una cuenta con este correo";
          break;
        case "auth/invalid-email":
          errorMessage = "Formato de correo inválido";
          break;
        case "auth/too-many-requests":
          errorMessage = "Demasiados intentos. Intenta más tarde";
          break;
        default:
          errorMessage = "Error al enviar correo. Verifica tu dirección";
      }
      
      showNotification(errorMessage, 'error');
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Usuario Google:", result.user.displayName);
      
      const user = result.user;
      const token = await user.getIdToken();
      localStorage.setItem("authToken", token);

      console.log("🔐 Token guardado:", token);
      
      showNotification(`¡Bienvenido ${result.user.displayName || result.user.email}!`, 'success');
      
      // Resetear intentos fallidos
      setFailedAttempts(0);
      
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (err: any) {
      console.error("❌ Error en login con Google:", err);
      showNotification("No se pudo iniciar sesión con Google", 'error');
      setLoading(false);
    }
  };

  // Alternar entre modo login y registro
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setFailedAttempts(0);
  };

  return (
    <>
      {/* Notificación Toast */}
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}

      <div className="login-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        padding: '20px'
      }}>
        <div className="login-card" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
          textAlign: 'center',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ marginBottom: '10px', fontSize: '1.8rem', color: '#2b2b2b' }}>
            {isRegisterMode ? 'Crear Cuenta' : 'Bienvenido'}
          </h2>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '30px' }}>
            {isRegisterMode 
              ? 'Registra tu cuenta institucional' 
              : 'Inicia sesión con tu cuenta institucional'
            }
          </p>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
            {/* Campo de nombre (solo en modo registro) */}
            {isRegisterMode && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            )}

            <input
              type="email"
              placeholder="Correo institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: isRegisterMode ? '15px' : '20px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />

            {/* Campo de confirmar contraseña (solo en modo registro) */}
            {isRegisterMode && (
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginBottom: '20px',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            )}

            <button 
              className="btn-login" 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#2b7a78',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
            >
              {loading 
                ? (isRegisterMode ? "Creando cuenta..." : "Iniciando sesión...") 
                : (isRegisterMode ? "Crear cuenta" : "Iniciar sesión")
              }
            </button>
          </form>

          {/* Botón de recuperar contraseña (solo visible después de 3 intentos fallidos en modo login) */}
          {!isRegisterMode && failedAttempts >= 3 && (
            <button
              onClick={handlePasswordReset}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '15px',
                background: 'none',
                border: 'none',
                color: '#f44336',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                opacity: loading ? 0.6 : 1
              }}
            >
              ¿Olvidaste tu contraseña? Recupérala aquí
            </button>
          )}

          <p style={{ margin: '20px 0', fontSize: '0.9rem', color: '#666' }}>o</p>

          <button 
            className="btn-google" 
            onClick={handleGoogleLogin} 
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background-color 0.3s'
            }}
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google logo"
              style={{ width: '20px', height: '20px' }}
            />
            Iniciar sesión con Google
          </button>

          {/* Botón de alternar entre login y registro */}
          <div style={{ marginTop: '25px', fontSize: '0.9rem', color: '#666' }}>
            {isRegisterMode ? (
              <p>
                ¿Ya tienes una cuenta?{' '}
                <button
                  onClick={toggleMode}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2b7a78',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Inicia sesión aquí
                </button>
              </p>
            ) : (
              <p>
                ¿No tienes una cuenta?{' '}
                <button
                  onClick={toggleMode}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2b7a78',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Créala aquí
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}