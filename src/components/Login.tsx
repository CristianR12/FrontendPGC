// src/components/Login.tsx
import { useState } from "react";
import { auth, provider } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "./ErrorMessage";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

/**
 * Componente de Login
 * Maneja autenticación con email/password y Google
 * Redirige a /home después de login exitoso
 */
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login con email y contraseña
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuario autenticado:", userCredential.user.email);
      navigate("/home"); // Redirige al dashboard
    } catch (err: any) {
      console.error("❌ Error en login:", err);
      
      // Manejo de errores específicos de Firebase
      if (err.code === "auth/user-not-found") {
        setError("No existe una cuenta con este correo.");
      } else if (err.code === "auth/wrong-password") {
        setError("Contraseña incorrecta.");
      } else if (err.code === "auth/invalid-email") {
        setError("Formato de correo inválido.");
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Usuario Google:", result.user.displayName);
      navigate("/home");
    } catch (err: any) {
      console.error("❌ Error en login con Google:", err);
      setError("No se pudo iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Bienvenido</h2>
        <p>Inicia sesión con tu cuenta institucional</p>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo institucional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p style={{ margin: "15px 0", fontSize: "0.9rem", color: "#666" }}>o</p>

        <button className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google logo"
            style={{ width: "20px", height: "20px" }}
          />
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}