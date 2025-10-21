import { useState } from "react";
import { auth, provider } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import {ErrorMessage} from "../components/ErrorMessage";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

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
      console.log("Usuario logueado:", userCredential.user.email);
      navigate("/home"); // Redirige a home después de login exitoso
    } catch (err: any) {
      console.error("Error en login:", err);
      setError("Correo o contraseña incorrectos.");
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
      console.log("Usuario Google:", result.user.displayName);
      navigate("/home");
    } catch (err: any) {
      console.error("Error en login con Google:", err);
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