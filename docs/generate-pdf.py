"""
Genera docs/ProyectoFinal_RutaIA.pdf a partir de la documentación del repo.

Requisitos: Python 3 con reportlab y Pillow.
Uso: python docs/generate-pdf.py
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image as PdfImage,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "ProyectoFinal_RutaIA.pdf"
CAPTURAS = Path(__file__).resolve().parent / "capturas"

# Fuentes con cobertura de tildes y eñes.
FONT_DIR = Path("C:/Windows/Fonts")
FONT_REGULAR = FONT_DIR / "segoeui.ttf"
FONT_BOLD = FONT_DIR / "segoeuib.ttf"
FONT_MONO = FONT_DIR / "consola.ttf"

if FONT_REGULAR.exists():
    pdfmetrics.registerFont(TTFont("RutaSans", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("RutaSans-Bold", str(FONT_BOLD)))
    pdfmetrics.registerFont(TTFont("RutaMono", str(FONT_MONO)))
    SANS = "RutaSans"
    SANS_BOLD = "RutaSans-Bold"
    MONO = "RutaMono"
else:  # pragma: no cover - respaldo fuera de Windows
    SANS = "Helvetica"
    SANS_BOLD = "Helvetica-Bold"
    MONO = "Courier"

TEAL = colors.HexColor("#0f766e")
TEAL_DARK = colors.HexColor("#0b332f")
INK = colors.HexColor("#172a27")
MUTED = colors.HexColor("#697a74")
LINE = colors.HexColor("#dfe7e2")
SOFT = colors.HexColor("#f4f6f2")
AMBER = colors.HexColor("#d97706")

styles = getSampleStyleSheet()

BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName=SANS,
    fontSize=9.6,
    leading=14,
    textColor=INK,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
)
BODY_LEFT = ParagraphStyle("BodyLeft", parent=BODY, alignment=TA_LEFT)
SMALL = ParagraphStyle(
    "Small", parent=BODY, fontSize=8, leading=11, textColor=MUTED
)
H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName=SANS_BOLD,
    fontSize=21,
    leading=25,
    textColor=TEAL_DARK,
    spaceBefore=6,
    spaceAfter=10,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName=SANS_BOLD,
    fontSize=13,
    leading=17,
    textColor=TEAL,
    spaceBefore=12,
    spaceAfter=6,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName=SANS_BOLD,
    fontSize=10.5,
    leading=14,
    textColor=INK,
    spaceBefore=8,
    spaceAfter=4,
)
COVER_TITLE = ParagraphStyle(
    "CoverTitle",
    parent=H1,
    fontSize=34,
    leading=39,
    alignment=TA_LEFT,
    textColor=colors.white,
    spaceAfter=14,
)
COVER_SUB = ParagraphStyle(
    "CoverSub",
    parent=BODY,
    fontSize=12,
    leading=18,
    textColor=colors.HexColor("#d9f2ed"),
    alignment=TA_LEFT,
)
CAPTION = ParagraphStyle(
    "Caption",
    parent=SMALL,
    alignment=TA_CENTER,
    fontSize=8,
    leading=10.5,
    spaceBefore=3,
    spaceAfter=10,
)
CODE = ParagraphStyle(
    "Code",
    parent=BODY_LEFT,
    fontName=MONO,
    fontSize=7.4,
    leading=9.6,
    textColor=colors.HexColor("#cce7df"),
)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(2 * cm, 1.55 * cm, A4[0] - 2 * cm, 1.55 * cm)
    canvas.setFont(SANS, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.1 * cm, "RutaIA · Proyecto final de Programación Comercial")
    canvas.drawRightString(A4[0] - 2 * cm, 1.1 * cm, f"Página {doc.page}")
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#11453f"))
    canvas.circle(width * 0.9, height * 0.92, 5.4 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#fbbf24"))
    canvas.roundRect(2 * cm, height - 4.6 * cm, 1.6 * cm, 1.6 * cm, 0.32 * cm, stroke=0, fill=1)
    canvas.setFillColor(TEAL_DARK)
    canvas.setFont(SANS_BOLD, 30)
    canvas.drawCentredString(2.8 * cm, height - 3.95 * cm, "R")
    canvas.setFillColor(colors.white)
    canvas.setFont(SANS_BOLD, 15)
    canvas.drawString(3.9 * cm, height - 3.55 * cm, "RutaIA")
    canvas.setFont(SANS, 8.5)
    canvas.setFillColor(colors.HexColor("#9fd8cd"))
    canvas.drawString(3.9 * cm, height - 3.95 * cm, "TURISMO INTELIGENTE PARA COLOMBIA")
    canvas.setFillColor(colors.HexColor("#fbbf24"))
    canvas.setFont(SANS_BOLD, 9)
    canvas.drawString(2 * cm, height - 8.3 * cm, "PROYECTO FINAL · PROGRAMACIÓN COMERCIAL")
    canvas.setFillColor(colors.white)
    canvas.setFont(SANS_BOLD, 33)
    canvas.drawString(2 * cm, height - 10.1 * cm, "RutaIA")
    canvas.setFillColor(colors.HexColor("#d9f2ed"))
    canvas.setFont(SANS, 14)
    canvas.drawString(2 * cm, height - 11.2 * cm, "Turismo con IA, agentes multi-paso y control de tokens")
    canvas.setFont(SANS, 9.5)
    canvas.setFillColor(colors.HexColor("#9fd8cd"))
    for index, line in enumerate(
        [
            "React + Vite  ·  Express  ·  MySQL 8  ·  Groq  ·  Power BI",
            "Repositorio: github.com/FerMar707501/PFinalTurismo",
            "API: http://localhost:4000  ·  Swagger: /api/docs",
        ]
    ):
        canvas.drawString(2 * cm, height - 13.3 * cm - index * 0.58 * cm, line)
    canvas.setStrokeColor(colors.HexColor("#fbbf24"))
    canvas.setLineWidth(1.2)
    canvas.line(2 * cm, height - 12.1 * cm, 6.2 * cm, height - 12.1 * cm)
    canvas.setFont(SANS, 8.5)
    canvas.setFillColor(colors.HexColor("#7fb7ac"))
    canvas.drawString(2 * cm, 2.2 * cm, "Entrega académica · Noviembre de 2026")
    canvas.restoreState()


def p(text: str, style: ParagraphStyle = BODY) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: list[str], style=BODY) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=12) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=14,
        bulletFontName=SANS,
        bulletFontSize=7,
        bulletColor=TEAL,
        spaceAfter=6,
    )


def code_block(text: str) -> Table:
    pre = Preformatted(text.strip("\n"), CODE, maxLineLength=110)
    table = Table([[pre]], colWidths=[A4[0] - 4 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10221f")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def data_table(rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [[p(cell, SMALL) if index > 0 else Paragraph(cell, ParagraphStyle(
        "TH", parent=SMALL, fontName=SANS_BOLD, textColor=colors.white
    )) for cell in row] for index, row in enumerate(rows)]
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7faf8")]),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def screenshot(filename: str, caption: str, max_height_cm: float = 17.5) -> list:
    path = CAPTURAS / filename
    if not path.exists():
        return []
    with Image.open(path) as img:
        width_px, height_px = img.size
    max_width = A4[0] - 4 * cm
    max_height = max_height_cm * cm
    ratio = min(max_width / width_px, max_height / height_px)
    image = PdfImage(str(path), width_px * ratio, height_px * ratio)
    image.hAlign = "CENTER"
    return [KeepTogether([image, p(caption, CAPTION)])]


def section_heading(text: str) -> Paragraph:
    return p(text, H1)


def build() -> None:
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="RutaIA · Proyecto final de Programación Comercial",
        author="RutaIA",
        subject="Documentación técnica y funcional",
    )

    story: list = []
    story.append(Spacer(1, 22.5 * cm))
    story.append(p("Documentación técnica y funcional", COVER_SUB))
    story.append(PageBreak())

    # 1. Resumen ---------------------------------------------------------
    story.append(section_heading("1. Resumen del proyecto"))
    story.append(
        p(
            "RutaIA es una aplicación web de turismo colombiano que combina un catálogo "
            "administrable con tres servicios de inteligencia artificial: un chatbot con "
            "generación aumentada por recuperación (RAG), un agente planificador de "
            "itinerarios y un agente comparador de destinos. La plataforma autentica por "
            "roles, limita el consumo mensual de tokens por usuario, registra cada "
            "ejecución y expone un reporte analítico compartido por el panel web y Power BI."
        )
    )
    story.append(
        bullets(
            [
                "<b>Chat RAG:</b> recuperación <i>FULLTEXT</i> sobre 60 documentos, memoria de la conversación y fuentes citadas.",
                "<b>Agentes multi-paso:</b> tool calling con Groq, hasta seis pasos y herramientas internas y externas.",
                "<b>Control de cuota:</b> estimación previa, bloqueo con HTTP 429 y registro del consumo real posterior.",
                "<b>Administración:</b> usuarios y cuotas, destinos, actividades, servicios de IA y claves de API.",
                "<b>Analítica:</b> un mismo agregado para la web y Power BI, con exportación CSV.",
                "<b>Calidad:</b> 68 pruebas de integración, Swagger, colección Postman y CI/CD en GitHub Actions.",
            ]
        )
    )
    story.append(p("Arquitectura de la solución", H2))
    story.append(
        code_block(
            """
Usuario ──HTTPS──▶ React SPA (Vercel)
                       │ JWT
                       ▼
                 Express API (Render) ──SQL──▶ MySQL 8 (Aiven)
                       │
        ┌──────────────┼────────────────┐
        ▼              ▼                ▼
    Groq API      Open-Meteo            OSRM            Wikipedia
   (chat/tools)   (clima)             (rutas)           (contexto)
                       ▲
Power BI ──X-API-Key───┘  (mismo agregado de /api/analytics/usage)
"""
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        data_table(
            [
                ["Capa", "Tecnología", "Responsabilidad"],
                ["Frontend", "React 19 + Vite", "SPA con navegación por hash, roles, chat, agentes y administración"],
                ["API", "Express 5 (Node 22)", "Rutas REST, validación Zod, JWT, cuotas, SSE de errores y OpenAPI"],
                ["Datos", "MySQL 8.4", "Catálogo, usuarios, conversaciones, uso, trazas y caché externa"],
                ["IA", "Groq (gpt-oss-120b/20b)", "Chat con contexto, decisiones multi-paso y tool calling"],
                ["Fuentes abiertas", "Open-Meteo · OSRM · Wikipedia", "Clima, rutas y contexto cultural sin claves"],
                ["BI", "Power BI Desktop", "Reporte de consumo con API key y refresco programado"],
                ["Despliegue", "Render · Vercel · GitHub Actions", "CI con pruebas y despliegue condicionado"],
            ],
            widths=[2.4 * cm, 4.2 * cm, 10.4 * cm],
        )
    )

    # 2. Requisitos -------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("2. Requisitos y alcance"))
    story.append(
        data_table(
            [
                ["Requisito del curso", "Implementación en RutaIA", "Evidencia"],
                ["Chatbot con RAG y memoria", "POST /api/chat con recuperación FULLTEXT de 5 documentos y últimos 10 mensajes", "Código, pruebas Fase 4 y captura 04"],
                ["Dos servicios de IA adicionales", "Agentes de itinerario y comparación con hasta 6 pasos y 5 herramientas", "Pruebas Fase 5 y capturas 05-06"],
                ["Login con roles", "JWT, bcrypt y roles admin/user; sin registro público", "Pruebas Fase 3 y captura 01"],
                ["CRUD administrativo", "Usuarios, destinos, actividades y servicios de IA", "Capturas 10-13"],
                ["Límite de tokens", "Cuota mensual, reserva previa, bloqueo 429 y registro real", "Fase 4-5 y captura 08"],
                ["Conversaciones e historial", "Conversaciones por usuario, mensajes, fuentes y ejecuciones de agentes", "Capturas 04 y 07"],
                ["API REST con permisos", "26 rutas documentadas, JWT, API keys y CORS", "Swagger y Postman"],
                ["Power BI conectado", "Endpoint externo con X-API-Key y mismo agregado", "powerbi/README y captura 18"],
                ["Pruebas automatizadas", "68 pruebas de integración con Vitest y Supertest", "CI en verde"],
                ["Despliegue y CI/CD", "Render, Vercel y GitHub Actions con smoke test", "Workflows ci.yml, smoke.yml y CodeQL"],
            ],
            widths=[3.6 * cm, 8.4 * cm, 5 * cm],
        )
    )
    story.append(
        p(
            "Quedan fuera del alcance del curso: pagos, reservas reales, mapas interactivos y "
            "aplicaciones móviles nativas. El diseño mantiene una ruta de crecimiento clara "
            "hacia esos módulos sin cambiar el modelo de datos principal.",
            SMALL,
        )
    )

    # 3. Modelo de datos --------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("3. Modelo de datos"))
    story.append(
        p(
            "El esquema usa <b>utf8mb4_spanish_ci</b>, almacena fechas en UTC y aplica claves "
            "foráneas para preservar la trazabilidad. El DDL completo está en "
            "<font name='RutaMono'>db/schema.sql</font> y los datos de demostración en "
            "<font name='RutaMono'>db/seed.sql</font>."
        )
    )
    story.append(
        data_table(
            [
                ["Tabla", "Propósito", "Claves y relaciones"],
                ["users", "Usuarios, rol y cuota mensual", "PK id · UQ email"],
                ["destinations", "Catálogo turístico administrable", "PK id · índice nombre/región"],
                ["activities", "Oferta de cada destino", "FK destination_id → destinations"],
                ["documents", "Fragmentos con índice FULLTEXT para el RAG", "source_type/source_id"],
                ["ai_services", "Modelo, temperatura, tokens y prompt", "PK code"],
                ["conversations / messages", "Historial del chat y de los agentes", "FK user_id y conversation_id"],
                ["usage_logs", "Hechos de consumo para cuotas y analítica", "FK user_id, service_code, conversation_id"],
                ["agent_runs", "Entrada, salida, pasos y tokens por ejecución", "FK user_id · service_code"],
                ["api_clients", "Claves de API con hash y scope", "PK id · UQ key_hash"],
                ["external_cache", "Caché de clima, rutas y Wikipedia", "PK cache_key · expires_at"],
            ],
            widths=[3.4 * cm, 7.4 * cm, 6.2 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Los datos de demostración contienen 3 usuarios, 12 destinos, 48 actividades, "
            "3 conversaciones, 6 mensajes, 22 registros de consumo, 3 servicios de IA y 60 "
            "documentos. La ingesta se puede repetir con "
            "<font name='RutaMono'>npm run db:ingest</font>."
        )
    )
    story.append(p("Vistas de apoyo", H3))
    story.append(
        p(
            "v_usage_daily y v_usage_by_service resumen el consumo para consultas rápidas; "
            "la API de analítica usa las tablas base con parámetros para respetar el rango "
            "y el filtro por servicio sin depender de las vistas."
        )
    )

    # 4. API --------------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("4. API REST y documentación"))
    story.append(
        p(
            "La API está documentada en OpenAPI 3.0.3 y disponible en "
            "<b>http://localhost:4000/api/docs</b>. La autenticación principal es JWT; "
            "los consumidores externos usan una API key con scope "
            "<font name='RutaMono'>analytics:read</font>."
        )
    )
    story.append(
        data_table(
            [
                ["Método y ruta", "Autenticación", "Descripción"],
                ["POST /api/auth/login", "Pública", "Entrega JWT y cuota del usuario"],
                ["GET /api/auth/me", "JWT", "Perfil y cuota vigente"],
                ["GET/POST /api/users", "JWT admin", "Listado y creación de usuarios"],
                ["PATCH/DELETE /api/users/:id", "JWT admin", "Edición y baja lógica"],
                ["GET /api/destinations, /:id", "Pública", "Catálogo y ficha con actividades"],
                ["POST/PATCH/DELETE /api/destinations", "JWT admin", "CRUD y sincronización del RAG"],
                ["GET /api/activities", "Pública", "Actividades con filtros"],
                ["POST/PATCH/DELETE /api/activities", "JWT admin", "CRUD y sincronización del RAG"],
                ["GET /api/services", "Pública/JWT", "Servicios activos; admin ve todos"],
                ["PATCH /api/services/:code(/status)", "JWT admin", "Configuración y activación"],
                ["GET /api/usage/me", "JWT", "Cuota mensual del usuario"],
                ["POST /api/chat", "JWT", "Mensaje al chatbot RAG"],
                ["GET /api/chat/conversations(/:id)", "JWT", "Historial y fuentes propias"],
                ["POST /api/agents/itinerary", "JWT", "Agente de itinerarios"],
                ["POST /api/agents/compare", "JWT", "Agente comparador"],
                ["GET /api/agents/runs(/:id)", "JWT", "Trazabilidad de ejecuciones"],
                ["GET /api/analytics/usage(.csv)", "JWT admin", "Reporte agregado y exportación"],
                ["GET/POST/PATCH /api/analytics/clients", "JWT admin", "Gestión de API keys"],
                ["GET /api/external/analytics/usage", "X-API-Key", "Reporte para Power BI"],
            ],
            widths=[6.4 * cm, 3.2 * cm, 7.4 * cm],
        )
    )
    story.append(Spacer(1, 4))
    story.append(p("Códigos de error relevantes", H3))
    story.append(
        data_table(
            [
                ["HTTP", "Código", "Cuándo ocurre"],
                ["400", "VALIDATION_ERROR", "Datos inválidos o rango de fechas incorrecto"],
                ["401", "INVALID_TOKEN / API_KEY_REQUIRED", "JWT inválido o falta X-API-Key"],
                ["403", "FORBIDDEN / USER_INACTIVE", "Sin rol admin o cuenta desactivada"],
                ["409", "SERVICE_DISABLED / EMAIL_IN_USE", "Servicio apagado o correo repetido"],
                ["429", "TOKEN_QUOTA_EXCEEDED", "La reserva de tokens supera la cuota"],
                ["503", "AI_NOT_CONFIGURED", "No está configurada la clave de Groq"],
            ],
            widths=[1.4 * cm, 5 * cm, 10.6 * cm],
        )
    )
    story.extend(screenshot("19-swagger.png", "Swagger UI con los grupos de la API"))
    story.extend(screenshot("20-swagger-analitica.png", "Endpoints de analítica y API externa en Swagger"))

    # 5. Frontend ---------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("5. Aplicación web"))
    story.append(
        p(
            "El frontend se construyó con React 19 y Vite, sin librerías adicionales de UI "
            "ni de Markdown. La navegación es por hash, el estado de sesión se guarda en "
            "localStorage y cada llamada envía el JWT. El diseño es responsive desde 320 px."
        )
    )
    story.extend(screenshot("01-login.png", "Pantalla de inicio de sesión con cuentas de demostración"))
    story.extend(screenshot("02-inicio.png", "Inicio: catálogo, servicios activos, cuota y últimas ejecuciones"))
    story.extend(screenshot("03-catalogo.png", "Catálogo con búsqueda, filtros y paginación"))
    story.append(PageBreak())
    story.extend(screenshot("09-detalle-destino.png", "Ficha de destino con actividades y precios"))
    story.extend(screenshot("04-chat-rag.png", "Chat RAG con sugerencias e historial"))
    story.extend(screenshot("05-itinerario.png", "Agente de itinerarios: formulario e información de herramientas"))
    story.append(PageBreak())
    story.extend(screenshot("06-comparador.png", "Comparador de destinos con selección múltiple"))
    story.extend(screenshot("07-historial-agentes.png", "Historial de ejecuciones de agentes"))
    story.extend(screenshot("08-cuota.png", "Portal de cuota de tokens"))
    story.append(PageBreak())
    story.extend(screenshot("10-admin-usuarios.png", "Administración de usuarios y cuotas"))
    story.extend(screenshot("11-admin-destinos.png", "Administración de destinos"))
    story.extend(screenshot("13-admin-servicios-ia.png", "Configuración y activación de servicios de IA"))
    story.append(PageBreak())
    story.extend(screenshot("14-movil-chat.png", "Vista móvil del chat", 13.6))
    story.extend(screenshot("15-movil-inicio.png", "Vista móvil del inicio", 13.6))

    # 6. Analítica y Power BI --------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("6. Analítica y Power BI"))
    story.append(
        p(
            "El panel web y Power BI consumen la misma función "
            "<font name='RutaMono'>getUsageAnalytics</font>. La única diferencia es la "
            "autenticación: JWT para el panel y <font name='RutaMono'>X-API-Key</font> para "
            "el endpoint externo. El reporte incluye totales, tasa de éxito, latencia, "
            "desglose por servicio y por usuario, serie diaria e histórico mensual."
        )
    )
    story.extend(screenshot("16-analitica.png", "Panel de analítica con los datos de demostración"))
    story.append(
        p(
            "Para el rango 11 de octubre a 9 de noviembre de 2026 el reporte devuelve 22 "
            "solicitudes, 22.640 tokens, 90,91 % de éxito y 1.619 ms de latencia promedio. "
            "Estas cifras son la referencia de validación del reporte de Power BI."
        )
    )
    story.extend(screenshot("18-powerbi-conexion.png", "Alta de API keys e instrucciones de conexión para Power BI"))
    story.append(p("Pasos para Power BI Desktop", H2))
    story.append(
        bullets(
            [
                "Crear una API key en <b>Conectar Power BI</b>; solo se muestra una vez.",
                "Obtener datos → Web → Avanzado y pegar la URL del endpoint externo.",
                "Añadir la cabecera <font name='RutaMono'>X-API-Key</font> con la clave.",
                "Convertir el registro en tabla y expandir byService, byUser, daily y monthly.",
                "Publicar en el servicio de Power BI y programar la actualización diaria.",
            ]
        )
    )
    story.append(
        code_block(
            """
GET https://rutaia-api.onrender.com/api/external/analytics/usage
    ?from=2026-10-11&to=2026-11-09
X-API-Key: rutaia_********************************
"""
        )
    )

    # 7. Calidad ----------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("7. Calidad y pruebas"))
    story.append(
        p(
            "Las pruebas usan Vitest, Supertest y una base MySQL real. Groq y las APIs "
            "externas se simulan con mocks, de modo que la suite es determinista y no "
            "consume cuota. Cada archivo crea sus propios usuarios y limpia sus datos."
        )
    )
    story.append(
        data_table(
            [
                ["Archivo", "Enfoque", "Pruebas"],
                ["api.test.js", "Salud, errores, 404, rate limit y seguridad básica", "20"],
                ["fase3.test.js", "Login, roles, usuarios y catálogo administrable", "28"],
                ["fase4.test.js", "Chat RAG, memoria, fuentes y cuota", "8"],
                ["fase5.test.js", "Agentes, herramientas, trazas y cuotas", "9"],
                ["fase7.test.js", "Analítica, CSV, API keys y endpoint externo", "10"],
                ["Total", "Vitest + Supertest sobre MySQL 8", "68"],
            ],
            widths=[3.4 * cm, 10.4 * cm, 2.8 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "La CI de GitHub Actions reejecuta las 68 pruebas desde cero contra MySQL 8.4, "
            "aplica esquema y seed, ejecuta la ingesta del RAG y arranca la API en modo "
            "producción. El workflow <b>smoke.yml</b> verifica la URL publicada y "
            "<b>codeql.yml</b> analiza la seguridad del código."
        )
    )
    story.append(p("Comandos de verificación", H3))
    story.append(
        code_block(
            """
cd server && npm test              # 68 pruebas de integración
cd client && npm run build         # build de producción
cd client && npm run lint          # oxlint (0 errores)
node scripts/smoke-api.mjs <url>   # health, login, catálogo y analítica
node scripts/qa-frontend.mjs       # capturas y detección de desbordes
"""
        )
    )
    story.append(p("Resultados obtenidos", H3))
    story.append(
        bullets(
            [
                "Backend: 5 archivos y 68 pruebas en verde (~8 s).",
                "Frontend: build de ~368 kB (102 kB gzip) y lint sin errores.",
                "Docker: imagen multipropósito con usuario sin privilegios y health check.",
                "CI: jobs de backend, frontend y despliegue en verde; el despliegue se omite con un aviso si no hay secretos.",
                "Base posterior a las pruebas: 3 usuarios, 12 destinos, 48 actividades y 60 documentos.",
            ]
        )
    )

    # 8. Postman ----------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("8. Demostración con Postman"))
    story.append(
        p(
            "La colección <font name='RutaMono'>docs/postman_collection.json</font> contiene "
            "28 peticiones agrupadas en siete carpetas. Los scripts de prueba guardan "
            "automáticamente el JWT, la conversación, la ejecución y la API key en variables "
            "de colección. El entorno está en "
            "<font name='RutaMono'>docs/postman_environment.json</font>."
        )
    )
    story.append(
        data_table(
            [
                ["Carpeta", "Contenido", "Variables que produce"],
                ["00 Sistema", "Health check y OpenAPI", "—"],
                ["01 Autenticación", "Login admin/demo, perfil y error 401", "adminToken, userToken"],
                ["02 Usuarios", "Listado, alta, cuota y 403", "—"],
                ["03 Catálogo", "Destinos, actividades y alta", "destinationId"],
                ["04 Chat RAG", "Mensaje, memoria, historial y cuota", "conversationId"],
                ["05 Agentes", "Itinerario, comparación, historial y detalle", "runId"],
                ["06 Analítica", "Reporte, CSV, API key y reporte externo", "apiKey"],
            ],
            widths=[3.2 * cm, 9 * cm, 4.4 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Orden recomendado: ejecutar 01 completo, luego 03 para obtener un destino, 04 "
            "para el chat y la cuota, 05 para los agentes y 06 para la analítica. La API key "
            "creada en la última carpeta alimenta el reporte externo de Power BI."
        )
    )

    # 9. Despliegue -------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("9. Despliegue y operación"))
    story.append(
        data_table(
            [
                ["Componente", "Destino", "Configuración"],
                ["API", "Render Web Service", "render.yaml · build npm ci --omit=dev · start npm start · health /api/health"],
                ["Frontend", "Vercel (static)", "client/vercel.json · VITE_API_URL · reescritura a index.html"],
                ["Base de datos", "MySQL 8 gestionado", "db/schema.sql + db/seed.sql + npm run db:ingest"],
                ["Imagen local", "Docker", "docker compose --profile full up -d --build"],
                ["CI/CD", "GitHub Actions", "ci.yml, codeql.yml, smoke.yml y Dependabot"],
            ],
            widths=[3 * cm, 4 * cm, 9.6 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "El pipeline se activa en cada push y pull request a main. Solo el push a main "
            "ejecuta el job de despliegue, y este se salta de forma controlada si faltan "
            "los secretos de Render o Vercel. El detalle de secretos y variables está en "
            "<font name='RutaMono'>docs/deployment.md</font>."
        )
    )
    story.append(p("Variables de entorno", H2))
    story.append(
        data_table(
            [
                ["Variable", "Ámbito", "Descripción"],
                ["DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME", "API", "Conexión MySQL"],
                ["JWT_SECRET, JWT_EXPIRES_IN", "API", "Firma y vigencia del JWT"],
                ["GROQ_API_KEY, GROQ_MODEL, GROQ_MODEL_LITE", "API", "Proveedor de IA y modelos"],
                ["CORS_ORIGIN", "API", "Orígenes permitidos (coma separada)"],
                ["TOKEN_QUOTA_DEFAULT", "API", "Cuota inicial de nuevos usuarios"],
                ["VITE_API_URL", "Frontend", "URL pública de la API"],
            ],
            widths=[6.6 * cm, 2.4 * cm, 7.6 * cm],
        )
    )

    # 10. Seguridad y limitaciones ---------------------------------------
    story.append(PageBreak())
    story.append(section_heading("10. Seguridad, limitaciones y trabajo futuro"))
    story.append(
        bullets(
            [
                "Contraseñas con bcrypt y JWT firmados; el token se valida contra el estado actual del usuario.",
                "Las API keys se guardan como hash SHA-256 y se muestran una única vez.",
                "Consultas SQL parametrizadas, validación Zod y límite de intentos de login.",
                "Helmet, CORS restringido, rate limit y cabecera X-Request-Id en cada respuesta.",
                "El system_prompt de los servicios solo se expone a administradores.",
                "La GROQ_API_KEY vive únicamente en el backend.",
            ]
        )
    )
    story.append(p("Limitaciones conocidas", H2))
    story.append(
        bullets(
            [
                "La cuota se controla con una reserva estimada; dos solicitudes simultáneas podrían competir por el último margen.",
                "El RAG usa recuperación léxica FULLTEXT; no hay embeddings porque Groq no expone esa API.",
                "Wikipedia puede limitar solicitudes frecuentes; la caché y el manejo de errores de herramientas lo mitigan.",
                "El plan gratuito de un proveedor puede suspender la API por inactividad.",
            ]
        )
    )
    story.append(p("Trabajo futuro", H2))
    story.append(
        bullets(
            [
                "Reserva atómica de cuota dentro de una transacción y conciliación posterior.",
                "Embeddings con un proveedor dedicado y búsqueda híbrida.",
                "Panel de auditoría de API keys con rotación programada.",
                "Reservas y pagos integrados con el catálogo.",
                "Pruebas end-to-end de navegador en la CI con Playwright.",
            ]
        )
    )
    story.append(p("Repositorio y enlaces", H2))
    story.append(
        code_block(
            """
Repositorio: https://github.com/FerMar707501/PFinalTurismo
API local:   http://localhost:4000
Swagger:     http://localhost:4000/api/docs
Frontend:    http://localhost:5173
Power BI:    https://rutaia-api.onrender.com/api/external/analytics/usage
"""
        )
    )
    story.append(Spacer(1, 16))
    story.append(
        p(
            "Documento generado a partir del código y de las capturas verificadas del "
            "repositorio. Las cifras de analítica corresponden a los datos de demostración "
            "del seed, por lo que son reproducibles con la misma base.",
            SMALL,
        )
    )

    doc.build(story, onFirstPage=cover, onLaterPages=footer)
    print(f"PDF generado: {OUT}")


if __name__ == "__main__":
    build()
