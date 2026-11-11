"""
Genera docs/ProyectoFinal_RutaIA.pdf a partir de la documentación del repo.

Requisitos: Python 3 con reportlab y Pillow.
Uso: python docs/generate-pdf.py
"""
from __future__ import annotations

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
FONT_ITALIC = FONT_DIR / "segoeuii.ttf"
FONT_MONO = FONT_DIR / "consola.ttf"

if FONT_REGULAR.exists():
    pdfmetrics.registerFont(TTFont("RutaSans", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("RutaSans-Bold", str(FONT_BOLD)))
    pdfmetrics.registerFont(TTFont("RutaMono", str(FONT_MONO)))
    if FONT_ITALIC.exists():
        pdfmetrics.registerFont(TTFont("RutaSans-Italic", str(FONT_ITALIC)))
        pdfmetrics.registerFontFamily(
            "RutaSans", normal="RutaSans", bold="RutaSans-Bold", italic="RutaSans-Italic"
        )
    SANS = "RutaSans"
    SANS_BOLD = "RutaSans-Bold"
    MONO = "RutaMono"
else:  # pragma: no cover - respaldo fuera de Windows
    SANS = "Helvetica"
    SANS_BOLD = "Helvetica-Bold"
    MONO = "Courier"

# Paleta "atardecer" del rediseño.
SUNSET = colors.HexColor("#d24a6e")
SUNSET_DEEP = colors.HexColor("#5c2a52")
PLUM = colors.HexColor("#331b33")
AMBER = colors.HexColor("#e08a2e")
CORAL = colors.HexColor("#ff8a72")
LILAC = colors.HexColor("#a24cbb")
INK = colors.HexColor("#331b33")
MUTED = colors.HexColor("#7b5c70")
LINE = colors.HexColor("#f0dccd")
SOFT = colors.HexColor("#fdf5ee")

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
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=11, textColor=MUTED)
H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName=SANS_BOLD,
    fontSize=21,
    leading=25,
    textColor=SUNSET_DEEP,
    spaceBefore=6,
    spaceAfter=10,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName=SANS_BOLD,
    fontSize=13,
    leading=17,
    textColor=SUNSET,
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
COVER_SUB = ParagraphStyle(
    "CoverSub",
    parent=BODY,
    fontSize=12,
    leading=18,
    textColor=colors.HexColor("#ffe4d6"),
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
    textColor=colors.HexColor("#ffe7dc"),
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

    # Cielo de atardecer: degradado vertical por bandas.
    bands = [
        ("#ffd9a8", 0.00, 0.18),
        ("#ffb08a", 0.18, 0.34),
        ("#f08a8f", 0.34, 0.52),
        ("#b06a9e", 0.52, 0.76),
        ("#5c3a86", 0.76, 1.00),
    ]
    for hex_color, y0, y1 in bands:
        canvas.setFillColor(colors.HexColor(hex_color))
        canvas.rect(0, height * (1 - y1), width, height * (y1 - y0) + 1, stroke=0, fill=1)

    # Sol y cordilleras.
    canvas.setFillColor(colors.HexColor("#fffaf0"))
    canvas.circle(width * 0.72, height * 0.72, 2.6 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#7a3556"))
    canvas.setFillAlpha(0.5)
    canvas.roundRect(-3 * cm, -6.5 * cm, width + 6 * cm, 11 * cm, 14 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#2f1a3d"))
    canvas.setFillAlpha(0.7)
    canvas.roundRect(-3 * cm, -9 * cm, width + 6 * cm, 11 * cm, 16 * cm, stroke=0, fill=1)
    canvas.setFillAlpha(1)

    # Tarjeta translúcida con el contenido.
    canvas.setFillColor(colors.HexColor("#ffffff"))
    canvas.setFillAlpha(0.92)
    canvas.roundRect(2 * cm, height * 0.22, width - 4 * cm, height * 0.56, 0.7 * cm, stroke=0, fill=1)
    canvas.setFillAlpha(1)

    # Logotipo: placa con degradado aproximado.
    canvas.setFillColor(SUNSET)
    canvas.roundRect(2.8 * cm, height * 0.66, 1.9 * cm, 1.9 * cm, 0.45 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#fffaf2"))
    canvas.setFont(SANS_BOLD, 34)
    canvas.drawCentredString(3.75 * cm, height * 0.665, "R")

    canvas.setFillColor(PLUM)
    canvas.setFont(SANS_BOLD, 17)
    canvas.drawString(5.2 * cm, height * 0.705, "RutaIA")
    canvas.setFont(SANS, 8.5)
    canvas.setFillColor(SUNSET)
    canvas.drawString(5.2 * cm, height * 0.665, "TURISMO INTELIGENTE · GUATEMALA")

    canvas.setFillColor(AMBER)
    canvas.setFont(SANS_BOLD, 9)
    canvas.drawString(2.8 * cm, height * 0.60, "PROYECTO FINAL · PROGRAMACIÓN COMERCIAL")

    canvas.setFillColor(PLUM)
    canvas.setFont(SANS_BOLD, 30)
    canvas.drawString(2.8 * cm, height * 0.545, "Turismo con IA, agentes")
    canvas.drawString(2.8 * cm, height * 0.495, "multi-paso y control de tokens")

    canvas.setFillColor(MUTED)
    canvas.setFont(SANS, 10)
    canvas.drawString(2.8 * cm, height * 0.455, "Chatbot RAG, dos agentes, cuotas y analítica en Power BI")

    canvas.setFillColor(SUNSET)
    canvas.setFont(SANS, 9)
    for index, line in enumerate(
        [
            "React + Vite  ·  Express  ·  PostgreSQL 16  ·  Groq  ·  Power BI",
            "https://rutaia-api-q3y2.onrender.com",
            "Swagger: https://rutaia-api-q3y2.onrender.com/api/docs",
            "Repositorio: github.com/FerMar707501/PFinalTurismo",
        ]
    ):
        canvas.drawString(2.8 * cm, height * 0.395 - index * 0.5 * cm, line)

    canvas.setFillColor(colors.HexColor("#fff3ea"))
    canvas.setFont(SANS, 8.5)
    canvas.drawString(2 * cm, 1.6 * cm, "Entrega académica · Noviembre de 2026")
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
        bulletColor=SUNSET,
        spaceAfter=6,
    )


def code_block(text: str) -> Table:
    pre = Preformatted(text.strip("\n"), CODE, maxLineLength=112)
    table = Table([[pre]], colWidths=[A4[0] - 4 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#2a1230")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def data_table(rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [
        [
            p(cell, SMALL)
            if index > 0
            else Paragraph(cell, ParagraphStyle("TH", parent=SMALL, fontName=SANS_BOLD, textColor=colors.white))
            for cell in row
        ]
        for index, row in enumerate(rows)
    ]
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SUNSET),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
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
        print(f"  · falta la captura {filename}, se omite")
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
    story.append(PageBreak())  # la portada la dibuja cover()

    # 1. Propuesta -------------------------------------------------------
    story.append(section_heading("1. Propuesta y alcance"))
    story.append(
        p(
            "RutaIA es una aplicación web de turismo para <b>Guatemala</b> que combina un "
            "catálogo administrable con tres servicios de inteligencia artificial: un chatbot "
            "con generación aumentada por recuperación (RAG), un agente planificador de "
            "itinerarios y un agente comparador de destinos. La plataforma autentica por roles, "
            "limita el consumo mensual de tokens, registra cada ejecución y expone un reporte "
            "analítico compartido por el panel web y Power BI."
        )
    )
    story.append(
        p(
            "<b>Problema.</b> Planificar un viaje por Guatemala exige consultar fuentes dispersas: "
            "clima por región, distancias reales entre destinos, actividades disponibles y precios "
            "en quetzales. Un asistente conversacional que consulte datos verificables reduce ese "
            "trabajo y, además, permite medir el costo real de cada respuesta en tokens."
        )
    )
    story.append(
        p(
            "<b>Alcance.</b> Turismo exclusivamente en Guatemala: 12 destinos reales, 48 "
            "actividades, precios en quetzales (GTQ) y validación de coordenadas contra el "
            "<i>bounding box</i> del país. Quedan fuera del alcance pagos, reservas reales, "
            "mapas interactivos y aplicaciones móviles nativas."
        )
    )
    story.append(
        bullets(
            [
                "<b>Chat RAG:</b> recuperación léxica sobre 60 documentos, memoria de la conversación y fuentes citadas.",
                "<b>Agentes multi-paso:</b> <i>tool calling</i> con Groq, hasta ocho pasos, herramientas internas y externas.",
                "<b>Control de cuota:</b> estimación previa, bloqueo con HTTP 429 y registro del consumo real posterior.",
                "<b>Administración:</b> usuarios y cuotas, destinos, actividades, servicios de IA y claves de API.",
                "<b>Analítica:</b> un mismo agregado para la web y Power BI, con exportación CSV.",
                "<b>Calidad:</b> 75 pruebas con Vitest, Swagger, colección Postman y CI/CD en GitHub Actions.",
            ]
        )
    )
    story.append(p("Requisitos del curso y su implementación", H2))
    story.append(
        data_table(
            [
                ["Requisito del curso", "Implementación en RutaIA", "Evidencia"],
                ["Chatbot con RAG y memoria", "POST /api/chat con recuperación de 5 documentos y últimos mensajes", "Código, pruebas Fase 4 y captura 04"],
                ["Dos servicios de IA adicionales", "Agentes de itinerario y comparación con hasta 6 pasos y 5 herramientas", "Pruebas Fase 5 y capturas 05-06"],
                ["Login con roles", "JWT, bcrypt y roles admin/user; sin registro público", "Pruebas Fase 3 y captura 01"],
                ["CRUD administrativo", "Usuarios, destinos, actividades y servicios de IA", "Capturas 10-13"],
                ["Límite de tokens", "Cuota mensual, reserva previa, bloqueo 429 y registro real", "Fases 4-5 y captura 08"],
                ["Conversaciones e historial", "Conversaciones por usuario, mensajes, fuentes y ejecuciones de agentes", "Capturas 04 y 07"],
                ["API REST con permisos", "Rutas documentadas en OpenAPI 3.0.3, JWT, API keys y CORS", "Swagger y Postman"],
                ["Power BI conectado", "Endpoint externo /api/bi/usage con X-API-Key y el mismo agregado", "powerbi/README y captura 18"],
                ["Pruebas automatizadas", "75 pruebas con Vitest y Supertest", "CI en verde"],
                ["Despliegue y CI/CD", "Render y GitHub Actions con smoke test", "Workflows ci.yml, smoke.yml y CodeQL"],
            ],
            widths=[3.6 * cm, 8.4 * cm, 5 * cm],
        )
    )

    # 2. Arquitectura -----------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("2. Arquitectura de la solución"))
    story.append(
        code_block(
            """
Usuario ──HTTPS──▶ React SPA (servida por Express)
                     │ JWT
                     ▼
              Express API (Render) ──SQL──▶ PostgreSQL 16 (Render)
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
 Groq API      Open-Meteo           OSRM           Wikipedia
(chat/tools)    (clima)             (rutas)         (contexto)
                     ▲
Power BI ──X-API-Key─┘  (GET /api/bi/usage, mismo agregado)
"""
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Un único servicio web en Render sirve la SPA compilada y la API desde el mismo "
            "dominio, lo que evita configurar CORS entre dos despliegues y simplifica los "
            "enlaces de entrega. La base de datos es un PostgreSQL gestionado por Render."
        )
    )
    story.append(
        data_table(
            [
                ["Capa", "Tecnología", "Responsabilidad"],
                ["Frontend", "React 19 + Vite", "SPA con navegación por hash, roles, chat, agentes, administración y tema claro/oscuro"],
                ["API", "Express 5 (Node 22)", "Rutas REST, validación Zod, JWT, cuotas, Swagger y OpenAPI"],
                ["Datos", "PostgreSQL 16", "Catálogo, usuarios, conversaciones, uso, trazas y caché externa"],
                ["IA", "Groq (gpt-oss-120b / 20b)", "Chat con contexto, decisiones multi-paso y tool calling"],
                ["Fuentes abiertas", "Open-Meteo · OSRM · Wikipedia", "Clima, rutas y contexto cultural sin claves"],
                ["BI", "Power BI Desktop", "Reporte de consumo con API key y refresco programado"],
                ["Despliegue", "Render · GitHub Actions", "CI con pruebas, CodeQL y despliegue automático"],
            ],
            widths=[2.4 * cm, 4.2 * cm, 10.4 * cm],
        )
    )

    # 3. Modelo de datos --------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("3. Modelo de datos"))
    story.append(
        p(
            "El esquema usa <b>PostgreSQL 16</b> con codificación UTF-8 y almacenamiento en UTC. "
            "Aplica claves foráneas para preservar la trazabilidad y disparadores "
            "<i>updated_at</i>. El DDL completo está en "
            "<font name='RutaMono'>db/schema.postgres.sql</font> y los datos de demostración en "
            "<font name='RutaMono'>db/seed.postgres.sql</font>."
        )
    )
    story.append(
        data_table(
            [
                ["Tabla", "Propósito", "Claves y relaciones"],
                ["users", "Usuarios, rol y cuota mensual", "PK id · UQ email"],
                ["destinations", "Catálogo turístico de Guatemala", "PK id · coordenadas validadas"],
                ["activities", "Oferta de cada destino", "FK destination_id → destinations"],
                ["documents", "Fragmentos indexados con tsvector para el RAG", "source_type / source_id"],
                ["ai_services", "Modelo, temperatura, tokens y prompt", "PK code"],
                ["conversations / messages", "Historial del chat y de los agentes", "FK user_id y conversation_id"],
                ["usage_logs", "Hechos de consumo para cuotas y analítica", "FK user_id, service_code, conversation_id"],
                ["agent_runs", "Entrada, salida, pasos y tokens por ejecución", "FK user_id · service_code"],
                ["api_clients", "Claves de API con hash SHA-256 y scope", "PK id · UQ key_hash"],
                ["external_cache", "Caché de clima, rutas y Wikipedia", "PK cache_key · expires_at"],
            ],
            widths=[3.4 * cm, 7.4 * cm, 6.2 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Los datos de demostración contienen 3 usuarios, 12 destinos, 48 actividades, "
            "3 servicios de IA y la clave de Power BI. La ingesta del RAG genera adicionalmente "
            "60 documentos a partir del catálogo."
        )
    )
    story.append(p("Creación de la base de datos", H3))
    story.append(
        p(
            "Con PostgreSQL 16 en ejecución y <font name='RutaMono'>DATABASE_URL</font> en "
            "<font name='RutaMono'>server/.env</font>:"
        )
    )
    story.append(
        code_block(
            """
cd server
npm install
npm run db:setup -- --force   # aplica schema.postgres.sql + seed.postgres.sql
npm run db:ingest             # genera los 60 documentos del RAG
"""
        )
    )
    story.append(
        p(
            "Verificación: <font name='RutaMono'>SELECT COUNT(*) FROM destinations;</font> debe "
            "devolver 12, <font name='RutaMono'>activities</font> 48 y "
            "<font name='RutaMono'>documents</font> 60."
        )
    )

    # 4. API --------------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("4. API REST y documentación"))
    story.append(
        p(
            "La API está documentada en OpenAPI 3.0.3 y disponible en "
            "<b>https://rutaia-api-q3y2.onrender.com/api/docs</b>. La autenticación principal es "
            "JWT; los consumidores externos usan una API key con scope "
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
                ["GET /api/bi/usage", "X-API-Key", "Reporte para Power BI"],
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
                ["400", "VALIDATION_ERROR", "Datos inválidos, rango de fechas incorrecto o coordenadas fuera de Guatemala"],
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

    # 5. Aplicación web ---------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("5. Aplicación web"))
    story.append(
        p(
            "El frontend se construyó con React 19 y Vite, sin librerías adicionales de UI ni de "
            "Markdown. La navegación es por hash, el estado de sesión se guarda en "
            "<font name='RutaMono'>localStorage</font> y cada llamada envía el JWT. El diseño es "
            "responsive desde 320 px e incluye <b>tema claro y oscuro</b> con preferencia "
            "persistente y detección del tema del sistema."
        )
    )
    story.append(
        p(
            "<b>Identidad visual.</b> La interfaz usa una paleta de atardecer (ámbar, coral, "
            "magenta y violeta) sobre fondos cálidos, con tipografía Outfit para el texto y "
            "Fraunces en los títulos. El logotipo es un SVG propio con degradado, sol y "
            "cordillera, reutilizado en el login, la barra lateral y la pantalla de carga."
        )
    )
    story.extend(screenshot("01-login.png", "Inicio de sesión con el diseño de atardecer y cuentas de demostración"))
    story.extend(screenshot("02-inicio.png", "Panel del administrador: catálogo, servicios, cuota y accesos rápidos"))
    story.extend(screenshot("03-catalogo.png", "Catálogo de destinos con búsqueda y filtros"))
    story.append(PageBreak())
    story.extend(screenshot("09-detalle-destino.png", "Ficha de destino con actividades y precios en quetzales"))
    story.extend(screenshot("04-chat-rag.png", "Chat RAG con sugerencias e historial"))
    story.append(PageBreak())
    story.extend(screenshot("05-itinerario.png", "Agente de itinerarios: formulario e información de herramientas"))
    story.extend(screenshot("06-comparador.png", "Comparador de destinos con selección múltiple"))
    story.extend(screenshot("07-historial-agentes.png", "Historial de ejecuciones de agentes"))
    story.append(PageBreak())
    story.extend(screenshot("08-cuota.png", "Portal de cuota de tokens"))
    story.extend(screenshot("10-admin-usuarios.png", "Administración de usuarios y cuotas"))
    story.extend(screenshot("11-admin-destinos.png", "Administración de destinos"))
    story.append(PageBreak())
    story.extend(screenshot("12-admin-actividades.png", "Administración de actividades"))
    story.extend(screenshot("13-admin-servicios-ia.png", "Configuración y activación de servicios de IA"))
    story.append(PageBreak())
    story.append(p("Modo oscuro y vista móvil", H2))
    story.extend(screenshot("21-modo-oscuro.png", "Panel en modo oscuro", 12.4))
    story.extend(screenshot("22-chat-oscuro.png", "Chat RAG en modo oscuro", 12.4))
    story.append(PageBreak())
    story.extend(screenshot("15-movil-inicio.png", "Inicio en vista móvil (414 px)", 15.5))
    story.extend(screenshot("14-movil-chat.png", "Chat en vista móvil", 15.5))
    story.append(PageBreak())
    story.extend(screenshot("17-analitica-movil.png", "Analítica en vista móvil", 15.5))

    # 6. Analítica y Power BI --------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("6. Analítica y Power BI"))
    story.append(
        p(
            "El panel web y Power BI consumen la misma función "
            "<font name='RutaMono'>getUsageAnalytics</font>. La única diferencia es la "
            "autenticación: JWT para el panel y <font name='RutaMono'>X-API-Key</font> para el "
            "endpoint externo. El reporte incluye totales, tasa de éxito, latencia, desglose por "
            "servicio y por usuario, serie diaria e histórico mensual."
        )
    )
    story.extend(screenshot("16-analitica.png", "Panel de analítica con series, distribución y tarjetas de resumen"))
    story.extend(screenshot("18-powerbi-conexion.png", "Conexión de Power BI y gestión de API keys"))
    story.append(p("Conexión desde Power BI Desktop", H2))
    story.append(
        p(
            "El endpoint devuelve un único documento JSON con seis bloques: "
            "<font name='RutaMono'>meta</font>, <font name='RutaMono'>totals</font>, "
            "<font name='RutaMono'>byService</font>, <font name='RutaMono'>byUser</font>, "
            "<font name='RutaMono'>daily</font> y <font name='RutaMono'>monthly</font>. "
            "Los campos son <font name='RutaMono'>requests</font>, "
            "<font name='RutaMono'>totalTokens</font>, <font name='RutaMono'>serviceCode</font> y "
            "<font name='RutaMono'>date</font>."
        )
    )
    story.append(
        code_block(
            """
GET https://rutaia-api-q3y2.onrender.com/api/bi/usage
    ?from=2026-01-01&to=2026-12-31
X-API-Key: rutaia_********************************
"""
        )
    )
    story.append(
        bullets(
            [
                "Crear la API key en <b>Conectar Power BI</b>; solo se muestra una vez.",
                "Obtener datos → Web → Avanzado, pegar la URL y añadir la cabecera <font name='RutaMono'>X-API-Key</font>.",
                "Renombrar la consulta base a <font name='RutaMono'>BI_Usage</font> y desactivar su carga (devuelve un registro).",
                "Crear cinco consultas que la referencien: Totales, Servicios, Usuarios, Diario y Mensual.",
                "Aplicar y construir los visuales; guardar como <font name='RutaMono'>powerbi/reporte_rutaia.pbix</font>.",
            ]
        )
    )
    story.append(
        p(
            "El detalle paso a paso, con las consultas M completas y los nombres de campo de "
            "RutaIA, está en <font name='RutaMono'>powerbi/README.md</font>."
        )
    )

    # 7. Calidad ----------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("7. Calidad y pruebas"))
    story.append(
        p(
            "Las pruebas usan Vitest, Supertest y una base PostgreSQL real. Groq y las APIs "
            "externas se simulan con mocks, de modo que la suite es determinista y no consume "
            "cuota. Cada archivo crea sus propios usuarios y limpia sus datos."
        )
    )
    story.append(
        data_table(
            [
                ["Archivo", "Enfoque", "Pruebas"],
                ["api.test.js", "Salud, errores, 404, rate limit y seguridad básica", "8"],
                ["fase3.test.js", "Login, roles, usuarios y catálogo administrable", "31"],
                ["fase4.test.js", "Chat RAG, memoria, fuentes y cuota", "10"],
                ["fase5.test.js", "Agentes, herramientas, trazas y cuotas", "10"],
                ["fase7.test.js", "Analítica, CSV, API keys y endpoint externo", "10"],
                ["groqClient.test.js", "Contrato del cliente de Groq y recuperación de tool calls", "6"],
                ["Total", "Vitest + Supertest sobre PostgreSQL 16", "75"],
            ],
            widths=[3.4 * cm, 10.4 * cm, 2.8 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Entre las pruebas se incluye una que rechaza coordenadas fuera del <i>bounding box</i> "
            "de Guatemala, de modo que el alcance geográfico del proyecto está cubierto por la "
            "suite y no solo por el texto del prompt."
        )
    )
    story.append(
        p(
            "La CI de GitHub Actions reejecuta las pruebas desde cero contra PostgreSQL 16, "
            "aplica esquema y seed, ejecuta la ingesta del RAG y arranca la API. El workflow "
            "<b>smoke.yml</b> verifica la URL publicada y <b>codeql.yml</b> analiza la seguridad "
            "del código."
        )
    )
    story.append(p("Comandos de verificación", H3))
    story.append(
        code_block(
            """
cd server && npm test              # 75 pruebas
cd client && npm run build         # build de producción
node scripts/capturas.mjs          # capturas de pantalla
node scripts/smoke-api.mjs <url>   # health, login, catálogo y analítica
"""
        )
    )

    # 8. Demostración -----------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("8. Demostración"))
    story.append(
        p(
            "La colección <font name='RutaMono'>docs/postman_collection.json</font> agrupa las "
            "peticiones en siete carpetas. Los scripts de prueba guardan automáticamente el JWT, "
            "la conversación, la ejecución y la API key en variables de colección."
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
    story.append(p("Guion sugerido para 5 minutos", H3))
    story.append(
        data_table(
            [
                ["Tiempo", "Contenido"],
                ["0:00 – 0:40", "Login, cambio de tema claro/oscuro y barra lateral colapsable"],
                ["0:40 – 1:40", "Panel: 12 destinos, 48 actividades, 3 servicios de IA"],
                ["1:40 – 2:30", "Catálogo con filtros y ficha de un destino"],
                ["2:30 – 3:30", "Chat RAG con una pregunta real y sus fuentes citadas"],
                ["3:30 – 4:10", "Cliente externo en Postman: GET /api/bi/usage con X-API-Key"],
                ["4:10 – 4:50", "Reporte de Power BI conectado a la API"],
                ["4:50 – 5:00", "Enlaces: repositorio, aplicación y Swagger"],
            ],
            widths=[3 * cm, 13 * cm],
        )
    )

    # 9. Despliegue -------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("9. Despliegue y operación"))
    story.append(
        data_table(
            [
                ["Componente", "Destino", "Configuración"],
                ["Aplicación", "Render Web Service", "render.yaml · build de cliente y servidor · start node server/src/server.js"],
                ["Base de datos", "PostgreSQL gestionado (Render)", "db/schema.postgres.sql + db/seed.postgres.sql + npm run db:ingest"],
                ["Imagen local", "Docker Compose", "postgres:16-alpine + perfiles opcionales"],
                ["CI/CD", "GitHub Actions", "ci.yml, codeql.yml y smoke.yml"],
            ],
            widths=[3 * cm, 4 * cm, 9.6 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(p("Enlaces de la entrega", H2))
    story.append(
        data_table(
            [
                ["Recurso", "URL"],
                ["Aplicación web", "https://rutaia-api-q3y2.onrender.com"],
                ["Swagger / API docs", "https://rutaia-api-q3y2.onrender.com/api/docs"],
                ["OpenAPI (JSON)", "https://rutaia-api-q3y2.onrender.com/api/docs.json"],
                ["Health check", "https://rutaia-api-q3y2.onrender.com/api/health"],
                ["Power BI", "https://rutaia-api-q3y2.onrender.com/api/bi/usage (X-API-Key)"],
                ["Repositorio", "https://github.com/FerMar707501/PFinalTurismo"],
            ],
            widths=[4 * cm, 12.6 * cm],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "El plan gratuito de Render suspende el servicio tras 15 minutos sin tráfico; la "
            "primera petición puede tardar alrededor de 50 segundos en despertarlo. Conviene "
            "abrir la aplicación unos minutos antes de la demostración.",
            SMALL,
        )
    )
    story.append(p("Variables de entorno", H3))
    story.append(
        data_table(
            [
                ["Variable", "Ámbito", "Descripción"],
                ["DATABASE_URL", "API", "Conexión a PostgreSQL (Render la inyecta)"],
                ["DATABASE_SSL", "API", "TLS hacia la base gestionada"],
                ["JWT_SECRET, JWT_EXPIRES_IN", "API", "Firma y vigencia del JWT"],
                ["GROQ_API_KEY, GROQ_MODEL, GROQ_MODEL_LITE", "API", "Proveedor de IA y modelos"],
                ["CORS_ORIGIN", "API", "Orígenes permitidos"],
                ["TOKEN_QUOTA_DEFAULT", "API", "Cuota inicial de nuevos usuarios"],
            ],
            widths=[6.6 * cm, 2.4 * cm, 7.6 * cm],
        )
    )

    # 10. Seguridad -------------------------------------------------------
    story.append(PageBreak())
    story.append(section_heading("10. Seguridad, limitaciones y trabajo futuro"))
    story.append(
        bullets(
            [
                "Contraseñas con bcrypt y JWT firmados; el token se valida contra el estado actual del usuario.",
                "Las API keys se guardan como hash SHA-256 y se muestran una única vez.",
                "Consultas SQL parametrizadas, validación Zod y límite de intentos de login.",
                "Helmet con CSP explícita, CORS restringido, rate limit y cabecera X-Request-Id en cada respuesta.",
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
                "El RAG usa recuperación léxica con tsvector; no hay embeddings porque Groq no expone esa API.",
                "Wikipedia puede limitar solicitudes frecuentes; la caché y el manejo de errores de herramientas lo mitigan.",
                "El plan gratuito de Render suspende la API por inactividad.",
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
    story.append(Spacer(1, 14))
    story.append(
        p(
            "Documento generado a partir del código y de las capturas verificadas del "
            "repositorio. Las cifras de analítica corresponden a la base de demostración, por lo "
            "que son reproducibles con el mismo seed.",
            SMALL,
        )
    )

    doc.build(story, onFirstPage=cover, onLaterPages=footer)
    print(f"PDF generado: {OUT}")


if __name__ == "__main__":
    build()
