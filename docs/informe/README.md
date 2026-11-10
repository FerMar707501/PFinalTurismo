# Informe final

- `ProyectoFinal_RutaIA.pdf`: documento técnico y funcional (25 páginas) con
  arquitectura, modelo de datos, API, capturas de la aplicación, analítica, Power BI,
  pruebas, Postman y despliegue.
- `generate-pdf.py`: genera el PDF a partir de este repositorio. Requiere Python 3 con
  `reportlab` y `Pillow`:

```powershell
python -m pip install reportlab pillow
python docs/generate-pdf.py
```

Las capturas usadas están en `docs/capturas/` y se regeneran con
`scripts/qa-frontend.mjs`, `scripts/qa-analytics-ui.mjs`, `scripts/qa-powerbi-ui.mjs` y
`scripts/qa-swagger*.mjs` (ver README raíz). `docs/openapi.json` se exporta desde
`/api/docs.json`.

## Estructura sugerida del informe

1. Resumen ejecutivo y objetivos.
2. Requisitos y alcance.
3. Arquitectura y modelo de datos.
4. API REST y seguridad.
5. Aplicación web y experiencia de usuario.
6. Agentes multi-paso y RAG.
7. Cuotas y trazabilidad de tokens.
8. Analítica web y Power BI.
9. Pruebas, CI/CD y despliegue.
10. Limitaciones, trabajo futuro y conclusiones.
