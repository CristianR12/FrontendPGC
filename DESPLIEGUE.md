# Despliegue del frontend (Netlify)

La guía completa, con el orden de los pasos y los problemas frecuentes, está en el repositorio del backend:
`BackendPGC/DESPLIEGUE.md`.

Resumen del frontend:

1. Netlify → **Import an existing project** → GitHub → este repositorio. Lee `netlify.toml` (build `npm run build`, carpeta `dist`).
2. Variable de entorno: `VITE_API_URL=https://TU-SERVICIO.onrender.com/api` (con `/api`). Se necesita **antes** de compilar; si la agregas después, vuelve a desplegar.
3. Autoriza el dominio de Netlify en Firebase → Authentication → Settings → Authorized domains.
4. Copia la dirección de Netlify en `CORS_ALLOWED_ORIGINS` del backend en Render.

En desarrollo no hace falta nada: Vite redirige `/api` a `http://localhost:8000`.
