# API RutaIA

Backend Express de RutaIA.

## Estructura prevista

```text
server/
├── src/
│   ├── config/          # env, pool MySQL, Swagger
│   ├── middleware/      # auth, roles, cuota, errores
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── catalog/
│   │   ├── services/
│   │   ├── chat/
│   │   ├── agents/
│   │   └── analytics/
│   ├── ai/              # cliente Groq, RAG, prompts
│   ├── tools/           # herramientas de los agentes
│   └── server.js
├── scripts/             # seed e ingesta de documentos
├── tests/
├── .env.example
└── package.json
```

## Comandos

```powershell
Copy-Item .env.example .env
npm install
npm run dev      # http://localhost:4000 (Fase 2)
npm test
```

## Variables de entorno

Todas están documentadas en `.env.example`. La `GROQ_API_KEY` solo debe existir en el
backend; nunca se expone al frontend ni se sube al repositorio.
