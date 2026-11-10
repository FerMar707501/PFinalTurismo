# Power BI · RutaIA

El reporte de Power BI consume el mismo agregado que el panel web de analítica:

```text
GET /api/external/analytics/usage?from=YYYY-MM-DD&to=YYYY-MM-DD&serviceCode=CODIGO
Cabecera: X-API-Key: rutaia_...
```

El endpoint usa una API key creada por un administrador en **Analítica y Power BI →
Conectar Power BI**. La clave solo se muestra una vez.

## 1. Crear la clave

1. Inicia sesión como `admin@rutaia.local`.
2. Abre **Conectar Power BI** en el menú lateral.
3. Escribe un nombre, pulsa **Generar API key** y copia la clave.

También se puede crear por API:

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/api/auth/login `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@rutaia.local'; password = 'Admin123!' } | ConvertTo-Json)

$clave = Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/api/analytics/clients `
  -Headers @{ Authorization = "Bearer $($login.token)" } `
  -ContentType 'application/json' `
  -Body (@{ name = 'Power BI · Consumo IA' } | ConvertTo-Json)

$clave.apiKey
```

## 2. Conectar Power BI Desktop

1. **Obtener datos → Web**.
2. URL avanzada (ejemplo):
   `http://localhost:4000/api/external/analytics/usage?from=2026-01-01&to=2026-12-31`
3. En **Encabezados HTTP**, agrega `X-API-Key` con la clave.
4. Al cargar, Power BI recibe un único registro con:

| Campo | Uso sugerido |
|---|---|
| `meta` | Rango consultado y fecha de generación |
| `totals` | KPIs: solicitudes, tokens, tasa de éxito, latencia |
| `byService` | Gráfico de anillos y tabla por servicio |
| `byUser` | Ranking de consumo por usuario |
| `daily` | Serie de tokens y solicitudes por día |
| `monthly` | Comparación mensual |

5. En Power Query usa **Convertir en tabla** y después expande `byService`,
   `byUser`, `daily` y `monthly`. Renombra las consultas y define relaciones por
   `serviceCode` y `userId` si quieres un modelo en estrella.

Para una tabla plana (fecha, servicio, modelo, usuario, estado, tokens y latencia)
descarga el CSV del panel web: `GET /api/analytics/usage.csv` con el JWT del
administrador. Ese CSV también se puede cargar con **Obtener datos → Texto/CSV**.

## 3. Medidas DAX sugeridas

```dax
Total tokens = SUM(daily[totalTokens])
Solicitudes = SUM(daily[requests])
Tasa de éxito =
    DIVIDE(
        SUM(daily[successfulRequests]),
        [Solicitudes]
    )
Tokens promedio por solicitud = DIVIDE([Total tokens], [Solicitudes])
Latencia promedio (ms) = AVERAGE(byService[averageLatencyMs])
```

> Ajusta los nombres de tabla y columna a los que asignes en Power Query. La tasa
> de éxito también está calculada en `totals.successRate` por si se prefiere usar el
> valor del API directamente.

## 4. Validación

El archivo `reporte_rutaia.pbix` debe incluir las mismas cifras que la pestaña
**Analítica** del frontend porque ambas leen el mismo agregado. Para el rango
`2026-10-11 → 2026-11-09` con los datos de demostración:

- 22 solicitudes
- 22.640 tokens
- 90,91 % de éxito
- 1.619 ms de latencia promedio

Las capturas del reporte se guardan en `docs/capturas/`.
