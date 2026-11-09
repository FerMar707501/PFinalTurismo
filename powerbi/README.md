# Power BI

Aquí se guardará el archivo `reporte_rutaia.pbix` conectado a:

```text
GET /api/analytics/usage?from=YYYY-MM-DD&to=YYYY-MM-DD&service=CODIGO
```

Con autenticación mediante `X-API-Key` o `Authorization: Bearer <token>`.
El reporte debe replicar el reporte web: consultas realizadas y consumo
acumulado por servicio, con filtros por fecha y servicio.
