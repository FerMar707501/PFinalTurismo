# Power BI · RutaIA

El reporte de Power BI consume el mismo agregado que el panel web de analítica.

**Conexión de la entrega (producción):**

```text
URL:      https://rutaia-api-q3y2.onrender.com/api/bi/usage?from=2026-01-01&to=2026-12-31
Cabecera: X-API-Key: demo-bi-key-123
```

`/api/bi/usage` es un alias de `/api/external/analytics/usage`; ambos devuelven la
misma estructura `{ meta, totals, byService, byUser, daily, monthly }`.

La clave `demo-bi-key-123` ya está registrada en la base (solo se guarda su
SHA-256). Para crear otra, un administrador puede usar **Analítica y Power BI →
Conectar Power BI** o la API.

---

## Paso a paso para generar `reporte_rutaia.pbix` (5 minutos)

> Un `.pbix` solo puede escribirlo Power BI Desktop: su `DataModel` interno usa
> compresión XPress9, propietaria de Microsoft. Ninguna herramienta externa puede
> generarlo, por eso el repositorio incluye el modelo y la consulta listos.

### 1. Abrir Power BI Desktop y conectar

1. **Inicio → Obtener datos → Web**.
2. En **Básico** pega:
   `https://rutaia-api-q3y2.onrender.com/api/bi/usage?from=2026-01-01&to=2026-12-31`
3. Pulsa **Avanzado** y agrega la cabecera:

   | Nombre | Valor |
   |---|---|
   | `X-API-Key` | `demo-bi-key-123` |

4. **Aceptar**.

### 2. Crear las cinco tablas

Power BI deja un registro con `meta`, `totals`, `byService`, `byUser`, `daily` y
`monthly`. Para cada tabla:

1. **Transformar datos** para abrir Power Query.
2. **Nueva consulta → Consulta en blanco → Editor avanzado**.
3. Pega la consulta de la sección *Consultas M* de este documento cambiando la
   última línea (`in totales`, `in servicios`, `in usuarios`, `in diario`,
   `in mensual`).
4. **Cerrar y aplicar** y renombra cada consulta como se indica.

Las columnas vienen tipadas; no hace falta expandir registros a mano.

### 3. Crear las visualizaciones

| Página | Visual | Campos |
|---|---|---|
| Consumo de IA | 4 tarjetas | `totalTokens`, `requests`, `successRate`, `averageLatencyMs` |
| Servicios y usuarios | Anillo + tabla | `Servicios[serviceCode]`, `Servicios[totalTokens]`, `Usuarios[name]`, `Usuarios[totalTokens]` |
| Evolución | Línea + columnas | `Diario[date]`, `Diario[totalTokens]`, `Mensual[month]` |

Medidas DAX útiles (ya vienen en `powerbi/modelo/`):

```dax
Total de tokens = SUM ( Totales[totalTokens] )
Solicitudes = SUM ( Totales[requests] )
Tasa de éxito = DIVIDE ( SUM ( Totales[successfulRequests] ), SUM ( Totales[requests] ) )
Latencia media = AVERAGE ( Totales[averageLatencyMs] )
Promedio diario de tokens = DIVIDE ( SUM ( Totales[totalTokens] ), COUNTROWS ( Diario ) )
```

### 4. Guardar

**Archivo → Guardar como** → `powerbi/reporte_rutaia.pbix`.

---

## Consultas M

Reemplaza `in totales` por `in servicios`, `in usuarios`, `in diario` o
`in mensual` para las otras tablas.

```m
let
    url = "https://rutaia-api-q3y2.onrender.com/api/bi/usage?from=2026-01-01&to=2026-12-31",
    respuesta = Web.Contents(url, [Headers = [#"X-API-Key" = "demo-bi-key-123"]]),
    json = Json.Document(respuesta),

    totales = #table(
        Record.FieldNames(json[totals]),
        {Record.FieldValues(json[totals])}
    ),

    servicios = Table.FromRecords(json[byService]),
    usuarios  = Table.FromRecords(json[byUser]),
    diario    = Table.FromRecords(json[daily]),
    mensual   = Table.FromRecords(json[monthly])
in
    totales
```

## Modelo TMDL

`powerbi/modelo/` contiene las cinco tablas (`Totales`, `Servicios`, `Usuarios`,
`Diario`, `Mensual`), sus columnas y las medidas DAX. Se regenera con:

```powershell
node scripts/build-pbit.mjs https://rutaia-api-q3y2.onrender.com/api/bi/usage
```

Valores de control (últimos 30 días del seed): 22 solicitudes, 22 640 tokens,
90,91 % de éxito, 1 619 ms de latencia media.
