# RutaIA — Cliente

Frontend SPA construido con **React + Vite**.

## Comandos

```powershell
Copy-Item .env.example .env
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, por ejemplo `http://localhost:4000/api` |

> Solo variables con prefijo `VITE_` llegan al navegador. Nunca coloques aquí la
> `GROQ_API_KEY` ni secretos del backend.

La interfaz completa se implementará en la Fase 6.
