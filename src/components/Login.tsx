// src/components/Login.tsx
import { useState } from "react";
import { auth, provider } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { Toast } from "./Toast";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
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
      // ✅ Obtener token del usuario autenticado
      const user = userCredential.user;
      const token = await user.getIdToken();

      // ✅ Guardarlo en Local Storage
      localStorage.setItem("authToken", token);

      console.log("🔐 Token guardado:", token);
      showNotification(`¡Bienvenido ${userCredential.user.email}!`, 'success');
      
      // Redirigir después de 1.5 segundos para que vean el mensaje
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (err: any) {
      console.error("❌ Error en login:", err);
      
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

  // Login con Google
  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Usuario Google:", result.user.displayName);
      // ✅ Obtener token del usuario autenticado
      const user = result.user;
      const token = await user.getIdToken();

      // ✅ Guardarlo en Local Storage
      localStorage.setItem("authToken", token);

      console.log("🔐 Token guardado:", token);
      
      showNotification(`¡Bienvenido ${result.user.displayName || result.user.email}!`, 'success');
      
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (err: any) {
      console.error("❌ Error en login con Google:", err);
      showNotification("No se pudo iniciar sesión con Google", 'error');
      setLoading(false);
    }
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
            Bienvenido
          </h2>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '30px' }}>
            Inicia sesión con tu cuenta institucional
          </p>

          <form onSubmit={handleLogin}>
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
                marginBottom: '20px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />

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
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

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
        </div>
      </div>
    </>
  );
}