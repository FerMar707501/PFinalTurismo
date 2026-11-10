# RutaIA - Cliente

Frontend SPA construido con **React + Vite** para la API de RutaIA.

## Comandos

```powershell
Copy-Item .env.example .env
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
npm run preview  # sirve dist/
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, por ejemplo `http://localhost:4000/api` |

> Solo variables con prefijo `VITE_` llegan al navegador. Nunca coloques aquí la
> `GROQ_API_KEY` ni secretos del backend.

## Estructura

```text
src/
├── api/client.js          # Cliente fetch, JWT y envoltorios de endpoints
├── components/            # Layout, modales, tablas, RichText, cuota, estados
├── context/               # Sesión (AuthContext) y notificaciones (ToastContext)
├── hooks/                 # Debounce para búsquedas
├── pages/                 # Login, inicio, catálogo, chat, agentes, historial, consumo
│   └── admin/             # Usuarios, destinos, actividades y servicios de IA
├── utils/format.js        # Formatos es-CO, etiquetas y estilos por categoría
├── App.jsx                # Rutas por hash y control por rol
└── App.css                # Sistema visual completo y responsive
```

## Funcionalidad

- **Login** con JWT, sesión persistida en `localStorage` y cierre automático ante `401`.
- **Inicio** con catálogo destacado, servicios activos, cuota y últimas ejecuciones.
- **Catálogo** con búsqueda, filtros, paginación y ficha con actividades.
- **Chat RAG** con historial, memoria, fuentes y renderizado de Markdown/tablas.
- **Itinerario** y **comparador** con formularios validados, resultado del agente, pasos,
  herramientas, fuentes y consumo.
- **Historial de agentes** con filtros y detalle de la trazabilidad guardada.
- **Mi consumo** con anillo de cuota, saldo, solicitudes y reglas de bloqueo.
- **Administración** (solo rol `admin`): usuarios/cuotas, destinos, actividades,
  configuración de servicios y activación/desactivación de la IA.
- **Analítica** (solo `admin`): reporte de consumo con filtros de fecha y servicio,
  gráficos y exportación CSV.
- **Conectar Power BI** (solo `admin`): alta y baja de API keys para el reporte.

La navegación usa el hash (`#/dashboard`, `#/catalog`, `#/chat`, `#/itinerary`,
`#/compare`, `#/runs`, `#/usage`, `#/admin`), por lo que no requiere servidor con
reglas de reescritura.

## Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@rutaia.local` | `Admin123!` |
| Usuario | `demo@rutaia.local` | `Demo123!` |
| Usuario | `maria@rutaia.local` | `Demo123!` |

## Accesibilidad y UX

- Controles con etiquetas, botones con `aria-label` y foco visible.
- Mensajes de error de la API mostrados en contexto (cuota, servicio desactivado,
  conexión, validación).
- Diseño responsive desde 320 px; menú lateral tipo drawer en móvil.
- Sin dependencias de UI o Markdown adicionales: iconos SVG propios y renderizador
  `RichText` para tablas listas, listas, citas y enlaces.
