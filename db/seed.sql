-- ============================================================
-- RutaIA — Datos de demostración
--
-- Usuarios de prueba:
--   admin@rutaia.local  / Admin123!   (administrador)
--   demo@rutaia.local   / Demo123!    (usuario)
--   maria@rutaia.local  / Demo123!    (usuario)
--
-- Las contraseñas están almacenadas con bcrypt (10 rondas).
-- Cambiar en producción.
-- ============================================================

USE rutaia;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
INSERT INTO users
  (id, name, email, password_hash, role, token_limit_month, active)
VALUES
  (1, 'Administrador RutaIA', 'admin@rutaia.local',
   '$2b$10$0nh1i7GBkxCsA8a1irITw.YdQE5xwEDetfb2jrkNmd5eQALATG4mG',
   'admin', 500000, 1),
  (2, 'Usuario Demo', 'demo@rutaia.local',
   '$2b$10$QmJmEFMmsOdwAtAN1vVMbOopC.dcpXvT9AXRm2yZ6shZgEejiDI1m',
   'user', 50000, 1),
  (3, 'María Fernanda', 'maria@rutaia.local',
   '$2b$10$QmJmEFMmsOdwAtAN1vVMbOopC.dcpXvT9AXRm2yZ6shZgEejiDI1m',
   'user', 30000, 1);

-- ------------------------------------------------------------
-- Destinos
-- ------------------------------------------------------------
INSERT INTO destinations
  (id, name, region, description, category, tags, lat, lng, price_level, best_season, active)
VALUES
  (1, 'Cartagena de Indias', 'Bolívar',
   'Cartagena de Indias es una ciudad amurallada frente al mar Caribe, declarada Patrimonio de la Humanidad por la UNESCO. Su centro histórico combina calles coloniales, plazas, iglesias y murallas con playas cercanas y una intensa vida gastronómica y nocturna. Es ideal para viajes culturales, románticos y familiares, con opciones de islas, buceo y paseos en lancha. El clima es cálido durante todo el año, con temporada seca entre diciembre y abril.',
   'Ciudad histórica y playa', 'playa,historia,gastronomía,vida nocturna,familia,romántico',
   10.3910000, -75.4794000, 3, 'Diciembre a abril', 1),
  (2, 'Medellín', 'Antioquia',
   'Medellín, la capital de Antioquia, es conocida como la Ciudad de la Eterna Primavera por su clima templado. Ofrece museos, parques, el Metrocable, la Comuna 13 y una escena gastronómica y nocturna muy activa. Es un destino urbano con fácil acceso a naturaleza cercana como el Parque Arví y Guatapé. El clima es agradable todo el año, con lluvias entre abril y mayo y entre septiembre y noviembre.',
   'Ciudad cultural', 'cultura,gastronomía,vida nocturna,naturaleza,ciudad',
   6.2442000, -75.5812000, 2, 'Todo el año', 1),
  (3, 'Bogotá', 'Cundinamarca',
   'Bogotá es la capital de Colombia y el principal centro cultural del país. La Candelaria, el Museo del Oro, Monserrate y una amplia oferta gastronómica permiten combinar historia, arte y comida en pocos días. Su altitud de 2.640 metros puede requerir adaptación, y el clima es frío y cambiante. Es una base ideal para excursiones a Villa de Leyva, Zipaquirá y la sabana.',
   'Capital cultural', 'museos,historia,gastronomía,ciudad,arte',
   4.7110000, -74.0721000, 2, 'Diciembre a marzo', 1),
  (4, 'Santa Marta', 'Magdalena',
   'Santa Marta es la ciudad más antigua de Colombia y la puerta de entrada al Parque Nacional Tayrona. Combina playas, buceo en Taganga, selva, aves y la posibilidad de caminar a Ciudad Perdida. Su oferta va desde hostales económicos hasta hoteles boutique frente al mar. La temporada seca, de diciembre a abril, es la mejor para playa y senderismo.',
   'Caribe y naturaleza', 'playa,buceo,naturaleza,aventura,senderismo',
   11.2408000, -74.1990000, 3, 'Diciembre a abril', 1),
  (5, 'San Andrés', 'Archipiélago de San Andrés, Providencia y Santa Catalina',
   'San Andrés es una isla del Caribe colombiano famosa por el mar de los siete colores, sus arrecifes y el buceo. Ofrece playas como Spratt Bight, cayos cercanos, snorkel, duty free y una gastronomía con influencia raizal. Es un destino ideal para descansar y practicar deportes acuáticos. La mejor época para visitarla es de enero a abril, fuera de la temporada de huracanes.',
   'Isla y buceo', 'playa,snorkel,buceo,familia,compras',
   12.5847000, -81.7006000, 4, 'Enero a abril', 1),
  (6, 'Salento', 'Quindío',
   'Salento es un pueblo colorido del Eje Cafetero, rodeado de montañas y fincas cafeteras. Es la puerta de entrada al Valle de Cocora, hogar de la palma de cera, y permite aprender sobre el café colombiano. Su ambiente tranquilo, su artesanía y sus paisajes lo hacen ideal para viajes de naturaleza y gastronomía. El clima es templado y lluvioso, con mejores meses entre diciembre y marzo.',
   'Eje Cafetero', 'café,naturaleza,paisaje,gastronomía,pueblo',
   4.6375000, -75.5705000, 2, 'Diciembre a marzo', 1),
  (7, 'Villa de Leyva', 'Boyacá',
   'Villa de Leyva es un pueblo colonial de calles empedradas y una plaza mayor enorme, declarado Patrimonio de la Humanidad. Rodeada de fósiles, viñedos, pozos azules y paisajes desérticos, combina historia, naturaleza y gastronomía. Es un destino tranquilo para escapadas de fin de semana desde Bogotá. El clima es seco y templado, con mañanas frías.',
   'Pueblo colonial', 'historia,pueblo,vino,naturaleza,familia',
   5.6333000, -73.5250000, 2, 'Diciembre a marzo', 1),
  (8, 'Guatapé', 'Antioquia',
   'Guatapé es un municipio antioqueño conocido por la Piedra del Peñol, su embalse y los zócalos coloridos de sus casas. Se puede subir a la piedra, navegar en lancha, recorrer el pueblo y probar la gastronomía local. Es una excursión clásica desde Medellín y funciona para viajes de un día o fines de semana. El clima es cálido y agradable durante todo el año.',
   'Embalse y aventura', 'aventura,naturaleza,pueblo,gastronomía,familia',
   6.2325000, -75.1586000, 2, 'Todo el año', 1),
  (9, 'Providencia', 'Archipiélago de San Andrés, Providencia y Santa Catalina',
   'Providencia es una isla del archipiélago de San Andrés, famosa por sus arrecifes, aguas cristalinas y ambiente tranquilo. Es uno de los mejores lugares de Colombia para buceo y snorkel, con opciones como Crab Cay y Bahía Aguadulce. Su oferta es más rural y dispersa que la de San Andrés, ideal para desconectarse. La mejor temporada va de marzo a junio.',
   'Isla y buceo', 'buceo,snorkel,naturaleza,playa,descanso',
   13.3489000, -81.3747000, 4, 'Marzo a junio', 1),
  (10, 'Cali', 'Valle del Cauca',
   'Cali es la capital del Valle del Cauca y la capital mundial de la salsa. Ofrece clases de baile, gastronomía, el barrio San Antonio, museos y naturaleza cercana en Pance. Es un destino urbano con ambiente festivo y una escena cultural diversa. El clima es cálido, con temporada seca entre diciembre y marzo.',
   'Ciudad y salsa', 'salsa,cultura,gastronomía,vida nocturna,naturaleza',
   3.4516000, -76.5320000, 2, 'Diciembre a marzo', 1),
  (11, 'Bucaramanga', 'Santander',
   'Bucaramanga es conocida como la Ciudad de los Parques y es la puerta de entrada al cañón del Chicamocha. Desde allí se puede practicar rafting en San Gil, visitar Barichara y recorrer pueblos coloniales de Santander. La gastronomía santandereana, con hormigas culonas y cabro, es parte de la experiencia. El clima es cálido y la mejor época es de diciembre a marzo.',
   'Aventura y pueblos', 'aventura,naturaleza,pueblos,gastronomía,rafting',
   7.1193000, -73.1227000, 2, 'Diciembre a marzo', 1),
  (12, 'Leticia', 'Amazonas',
   'Leticia es la capital del Amazonas colombiano y la puerta de entrada a la selva. Desde allí se navega el río Amazonas, se visitan comunidades indígenas y se observan aves, delfines rosados y una biodiversidad única. Es un destino de naturaleza y aventura que requiere vacunas y planificación. La mejor época para viajar es de junio a septiembre, en temporada de aguas bajas.',
   'Amazonía', 'selva,naturaleza,aventura,biodiversidad,cultura',
   -4.2153000, -69.9406000, 3, 'Junio a septiembre', 1);

-- ------------------------------------------------------------
-- Actividades
-- ------------------------------------------------------------
INSERT INTO activities
  (id, destination_id, name, description, category, duration_min, price, lat, lng, active)
VALUES
  -- Cartagena
  (1, 1, 'Tour por la ciudad amurallada',
   'Recorrido guiado por plazas, iglesias, murallas y callejones coloniales del centro histórico de Cartagena. Incluye historias de piratas, arquitectura republicana y recomendaciones gastronómicas.',
   'cultural', 180, 120000, 10.4236000, -75.5253000, 1),
  (2, 1, 'Islas del Rosario en lancha',
   'Paseo en lancha hacia el archipiélago del Rosario, con paradas para nadar, snorkel básico y almuerzo típico. Ideal para familias y parejas que buscan playas de agua clara.',
   'playa', 480, 250000, 10.1769000, -75.7500000, 1),
  (3, 1, 'Buceo en Barú',
   'Inmersión guiada para principiantes y certificados en los arrecifes cercanos a Barú. Incluye equipo, instructor y transporte en lancha.',
   'aventura', 240, 300000, 10.1500000, -75.6900000, 1),
  (4, 1, 'Ruta gastronómica del Caribe',
   'Recorrido por restaurantes y puestos tradicionales para probar arepas de huevo, ceviche, cocadas y comida de mar. Incluye degustaciones y explicación de ingredientes locales.',
   'gastronomía', 180, 150000, 10.4260000, -75.5310000, 1),

  -- Medellín
  (5, 2, 'Comuna 13: arte y memoria',
   'Tour por las escaleras eléctricas, murales y miradores de la Comuna 13, con relatos sobre transformación social, música y cultura urbana.',
   'cultural', 180, 80000, 6.2518000, -75.5906000, 1),
  (6, 2, 'Metrocable y Parque Arví',
   'Paseo en metrocable hasta Santo Domingo y recorrido por los senderos del Parque Arví. Actividad de naturaleza y paisajismo dentro de la ciudad.',
   'naturaleza', 240, 60000, 6.2780000, -75.4990000, 1),
  (7, 2, 'Museo de Antioquia y Plaza Botero',
   'Visita al museo con obras de Botero y artistas antioqueños, seguida de un recorrido por las esculturas de la Plaza Botero y el centro histórico.',
   'cultural', 120, 40000, 6.2523000, -75.5683000, 1),
  (8, 2, 'Sabores de El Poblado',
   'Ruta gastronómica por El Poblado con paradas de comida paisa, cocina de autor y postres. Incluye tres degustaciones y una bebida.',
   'gastronomía', 180, 180000, 6.2088000, -75.5670000, 1),

  -- Bogotá
  (9, 3, 'Monserrate y mirador de Bogotá',
   'Subida en teleférico o funicular al cerro de Monserrate, con recorrido por el santuario y vistas panorámicas de la ciudad.',
   'cultural', 120, 30000, 4.6056000, -74.0556000, 1),
  (10, 3, 'Museo del Oro',
   'Visita guiada al Museo del Oro, con una de las colecciones de orfebrería precolombina más importantes del mundo.',
   'cultural', 120, 20000, 4.6018000, -74.0720000, 1),
  (11, 3, 'Caminata por La Candelaria',
   'Recorrido a pie por el centro histórico: Plaza de Bolívar, Botero, iglesias coloniales y calles llenas de arte urbano y librerías.',
   'cultural', 180, 70000, 4.5964000, -74.0731000, 1),
  (12, 3, 'Ruta del café bogotano',
   'Tour por cafeterías de especialidad y una finca urbana de café. Incluye cata guiada, historia del grano y métodos de preparación.',
   'gastronomía', 120, 60000, 4.6533000, -74.0559000, 1),

  -- Santa Marta
  (13, 4, 'Parque Nacional Tayrona',
   'Caminata por senderos del Tayrona hasta playas como Cabo San Juan, con guía local y tiempo para nadar. Se recomienda llevar agua, protector solar y calzado cómodo.',
   'naturaleza', 480, 70000, 11.3367000, -73.9250000, 1),
  (14, 4, 'Buceo en Taganga',
   'Inmersión en el corall reef de Taganga, apta para principiantes, con instructor certificado y equipo completo.',
   'aventura', 240, 280000, 11.2683000, -74.1911000, 1),
  (15, 4, 'Ciudad Perdida (4 días)',
   'Trekking de cuatro días por la Sierra Nevada hasta la ciudad arqueológica de Teyuna, con guías indígenas, alimentación y alojamiento en campamentos.',
   'aventura', 5760, 1800000, 11.0333000, -74.0167000, 1),
  (16, 4, 'Playa Cristal',
   'Excursión en lancha a Playa Cristal, dentro del Parque Tayrona, con aguas tranquilas y arrecifes para snorkel. Incluye transporte y tiempo libre.',
   'playa', 360, 150000, 11.3170000, -74.0500000, 1),

  -- San Andrés
  (17, 5, 'Snorkel en Johnny Cay',
   'Salida en lancha al cayo Johnny Cay con snorkel, playa y música caribeña. Ideal para ver peces tropicales en aguas poco profundas.',
   'playa', 300, 180000, 12.6000000, -81.6900000, 1),
  (18, 5, 'Bautizo de buceo',
   'Primera inmersión supervisada por un instructor certificado, con teoría básica, práctica en aguas poco profundas y equipo incluido.',
   'aventura', 300, 450000, 12.5400000, -81.7200000, 1),
  (19, 5, 'Vuelta a la isla en carrito',
   'Recorrido en carrito de golf por los principales miradores, playas y puntos culturales de San Andrés. Se puede conducir con licencia vigente.',
   'cultural', 240, 120000, 12.5600000, -81.7100000, 1),
  (20, 5, 'Atardecer en Spratt Bight',
   'Tarde libre en la playa principal de San Andrés, ideal para caminar, nadar y ver el atardecer. Actividad sin costo.',
   'playa', 120, 0, 12.5847000, -81.7006000, 1),

  -- Salento
  (21, 6, 'Valle de Cocora y palmas de cera',
   'Caminata guiada por el Valle de Cocora entre palmas de cera, bosque de niebla y fincas cafeteras. Incluye transporte desde Salento y opción de cabalgata.',
   'naturaleza', 300, 50000, 4.6400000, -75.4900000, 1),
  (22, 6, 'Finca cafetera y cata de café',
   'Visita a una finca tradicional del Eje Cafetero para aprender el proceso del café, recorrer los cultivos y participar en una cata guiada.',
   'gastronomía', 180, 90000, 4.6300000, -75.5800000, 1),
  (23, 6, 'Pueblos del café',
   'Recorrido por Salento, Filandia y Quimbaya para conocer su arquitectura, artesanías y miradores. Incluye transporte y almuerzo típico.',
   'cultural', 240, 80000, 4.6600000, -75.6400000, 1),
  (24, 6, 'Cabalgata por el Eje Cafetero',
   'Paseo a caballo por caminos rurales entre cafetales y montañas, con guía local y paradas para fotografías.',
   'aventura', 180, 120000, 4.6200000, -75.6000000, 1),

  -- Villa de Leyva
  (25, 7, 'Plaza Mayor y museos',
   'Recorrido por la Plaza Mayor, el Museo El Fósil y el Museo del Carmen, con historias sobre la época colonial y los fósiles de la región.',
   'cultural', 180, 40000, 5.6333000, -73.5250000, 1),
  (26, 7, 'Pozos Azules',
   'Visita a los Pozos Azules, formaciones de agua turquesa rodeadas de vegetación, ideales para caminar y tomar fotografías.',
   'naturaleza', 180, 30000, 5.6500000, -73.5500000, 1),
  (27, 7, 'Ruta del vino y viñedos',
   'Recorrido por viñedos de la región con explicación del proceso, degustación de vinos y maridaje con quesos locales.',
   'gastronomía', 180, 100000, 5.6200000, -73.5400000, 1),
  (28, 7, 'Observatorio astronómico',
   'Visita guiada al observatorio astronómico de Villa de Leyva, con observación del cielo nocturno y explicación de constelaciones.',
   'cultural', 120, 25000, 5.6400000, -73.5300000, 1),

  -- Guatapé
  (29, 8, 'Piedra del Peñol',
   'Ascenso por las escaleras de la Piedra del Peñol hasta el mirador, con vistas al embalse y a los municipios cercanos.',
   'aventura', 120, 30000, 6.2200000, -75.1800000, 1),
  (30, 8, 'Paseo en lancha por el embalse',
   'Recorrido en lancha por el embalse de Guatapé, con paradas en islas, miradores y puntos históricos.',
   'naturaleza', 120, 80000, 6.2300000, -75.1600000, 1),
  (31, 8, 'Zócalos y calles de Guatapé',
   'Caminata por el pueblo para conocer los zócalos, la calle de los recuerdos y la historia de sus fachadas coloridas.',
   'cultural', 120, 0, 6.2325000, -75.1586000, 1),
  (32, 8, 'Almuerzo típico antioqueño',
   'Almuerzo en un restaurante local con bandeja paisa, trucha o arepas, acompañado de jugos naturales y postre.',
   'gastronomía', 90, 60000, 6.2330000, -75.1590000, 1),

  -- Providencia
  (33, 9, 'Buceo en el arrecife',
   'Inmersión guiada en los arrecifes de Providencia, con posibilidad de ver tortugas, rayas y peces de colores. Incluye equipo y lancha.',
   'aventura', 300, 500000, 13.3500000, -81.3800000, 1),
  (34, 9, 'Bahía Aguadulce',
   'Día de playa en Bahía Aguadulce, una de las más tranquilas de la isla, ideal para nadar y descansar.',
   'playa', 180, 0, 13.3600000, -81.3900000, 1),
  (35, 9, 'Cayo Cangrejo',
   'Excursión a Cayo Cangrejo, un pequeño cayo con aguas cristalinas, arena blanca y senderos para observar aves.',
   'naturaleza', 240, 100000, 13.3700000, -81.3500000, 1),
  (36, 9, 'Ruta en bicicleta por la isla',
   'Recorrido en bicicleta por caminos costeros y miradores de Providencia, con paradas para nadar y fotografiar.',
   'aventura', 180, 60000, 13.3400000, -81.3700000, 1),

  -- Cali
  (37, 10, 'Clase de salsa para principiantes',
   'Clase de salsa caleña con instructor profesional, música en vivo y práctica de pasos básicos. No se requiere experiencia.',
   'cultural', 120, 80000, 3.4516000, -76.5320000, 1),
  (38, 10, 'San Antonio y mirador',
   'Caminata por el barrio San Antonio, sus calles coloridas, talleres de arte y miradores con vista a la ciudad.',
   'cultural', 120, 0, 3.4450000, -76.5400000, 1),
  (39, 10, 'Ruta gastronómica caleña',
   'Recorrido por puestos y restaurantes para probar cholado, lulada, marranitas, aborrajados y comida del Pacífico.',
   'gastronomía', 180, 120000, 3.4500000, -76.5350000, 1),
  (40, 10, 'Pance: río y naturaleza',
   'Excursión al corregimiento de Pance para caminar junto al río, nadar en pozas naturales y almorzar en fincas de la zona.',
   'naturaleza', 300, 50000, 3.3700000, -76.5700000, 1),

  -- Bucaramanga
  (41, 11, 'Parque Nacional del Chicamocha',
   'Visita al cañón del Chicamocha con teleférico, miradores y actividades de aventura. Incluye transporte desde Bucaramanga.',
   'naturaleza', 480, 150000, 6.8500000, -73.0200000, 1),
  (42, 11, 'Barichara y San Gil',
   'Recorrido por Barichara, uno de los pueblos más lindos de Colombia, y San Gil, capital de la aventura. Incluye transporte y almuerzo.',
   'cultural', 480, 180000, 6.6358000, -73.2236000, 1),
  (43, 11, 'Rafting en el río Fonce',
   'Descenso en balsa por rápidos del río Fonce con guías certificados, equipo de seguridad y transporte.',
   'aventura', 240, 160000, 6.5550000, -73.1300000, 1),
  (44, 11, 'Sabores santandereanos',
   'Ruta gastronómica para probar cabro, hormigas culonas, arepas de maíz y dulces tradicionales de Santander.',
   'gastronomía', 120, 70000, 7.1193000, -73.1227000, 1),

  -- Leticia
  (45, 12, 'Río Amazonas y comunidad indígena',
   'Navegación por el río Amazonas con visita a una comunidad indígena, caminata por la selva y explicación de plantas medicinales.',
   'naturaleza', 300, 200000, -4.1300000, -69.9500000, 1),
  (46, 12, 'Avistamiento de aves',
   'Salida temprana con guía especializado para observar aves del Amazonas, incluyendo tucanes, guacamayas y garzas.',
   'naturaleza', 240, 120000, -4.1800000, -69.9400000, 1),
  (47, 12, 'Reserva natural y delfines rosados',
   'Excursión a una reserva natural para navegar, observar delfines rosados y conocer los ecosistemas del río.',
   'naturaleza', 360, 180000, -4.1000000, -70.0000000, 1),
  (48, 12, 'Mercado y gastronomía amazónica',
   'Visita al mercado de Leticia para probar frutas exóticas, pescados de río y platos típicos de la Amazonía.',
   'gastronomía', 120, 50000, -4.2153000, -69.9406000, 1);

-- ------------------------------------------------------------
-- Servicios de IA
-- ------------------------------------------------------------
INSERT INTO ai_services
  (id, code, name, description, model, temperature, max_tokens, system_prompt, enabled)
VALUES
  (1, 'chat_rag', 'Chatbot RAG de turismo',
   'Responde preguntas sobre destinos y actividades usando la base de datos como contexto.',
   'openai/gpt-oss-120b', 0.20, 1024,
   'Eres RutaIA, un asistente experto en turismo en Colombia. Responde en español, de forma clara y útil. Usa únicamente la información del CONTEXTO entregado. Cita las fuentes con el formato [1], [2] según corresponda. Si el contexto no contiene información suficiente, dilo explícitamente y sugiere los temas disponibles. No inventes precios, horarios ni datos que no aparezcan en el contexto.',
   1),
  (2, 'agent_itinerary', 'Agente planificador de itinerarios',
   'Construye un itinerario multi-paso consultando el catálogo, el clima y las distancias.',
   'openai/gpt-oss-120b', 0.30, 2048,
   'Eres un planificador de viajes experto en Colombia. Debes usar las herramientas disponibles para buscar actividades, consultar el clima y calcular distancias antes de responder. Máximo 6 pasos. Presenta el itinerario por día con costos estimados, duración y fuentes consultadas. Si falta información, indícalo claramente y propone supuestos razonables.',
   1),
  (3, 'agent_compare', 'Agente comparador de destinos',
   'Compara destinos según clima, costos y actividades para recomendar la mejor opción.',
   'openai/gpt-oss-120b', 0.20, 2048,
   'Eres un asesor de viajes que compara destinos de Colombia. Usa las herramientas para consultar las fichas de cada destino, sus actividades, el clima y las distancias desde la ciudad de origen. Presenta una tabla comparativa con costo estimado, clima y oferta, y termina con una recomendación justificada. Si falta información, dilo.',
   1);

-- ------------------------------------------------------------
-- Conversaciones y mensajes de ejemplo
-- ------------------------------------------------------------
INSERT INTO conversations
  (id, user_id, service_code, title, summary, last_message_at, created_at)
VALUES
  (1, 2, 'chat_rag', 'Destinos de playa en Colombia',
   'El usuario preguntó por destinos de playa para viajar con niños; se recomendaron Cartagena, Santa Marta y San Andrés.',
   DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (2, 2, 'agent_itinerary', 'Itinerario de 3 días en Salento',
   'Itinerario de tres días en Salento con café, Cocora y pueblos del Eje Cafetero.',
   DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3, 3, 'chat_rag', 'Pueblos coloniales cerca de Bogotá',
   'La usuaria preguntó por pueblos coloniales cercanos a Bogotá; se mencionaron Villa de Leyva y Barichara.',
   DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY));

INSERT INTO messages
  (id, conversation_id, role, content, sources_json, tokens_in, tokens_out, created_at)
VALUES
  (1, 1, 'user',
   '¿Qué destinos de playa recomiendas para viajar con niños?',
   NULL, 24, 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (2, 1, 'assistant',
   'Para viajar con niños te recomiendo Cartagena, Santa Marta y San Andrés. Cartagena combina historia y playas cercanas; Santa Marta ofrece Tayrona y Taganga; San Andrés tiene aguas tranquilas y snorkel. Ten en cuenta la temporada seca para aprovechar mejor la playa.',
   JSON_ARRAY(
     JSON_OBJECT('sourceType', 'destination', 'sourceId', 1, 'title', 'Cartagena de Indias'),
     JSON_OBJECT('sourceType', 'destination', 'sourceId', 4, 'title', 'Santa Marta'),
     JSON_OBJECT('sourceType', 'destination', 'sourceId', 5, 'title', 'San Andrés')
   ),
   0, 190, DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 2 MINUTE)),
  (3, 2, 'user',
   'Armame un itinerario de 3 días en Salento con presupuesto medio.',
   NULL, 30, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (4, 2, 'assistant',
   'Día 1: llegada a Salento y recorrido por el pueblo. Día 2: Valle de Cocora y finca cafetera. Día 3: pueblos del café y regreso. El presupuesto estimado incluye transporte local, alimentación y actividades.',
   JSON_ARRAY(
     JSON_OBJECT('sourceType', 'destination', 'sourceId', 6, 'title', 'Salento'),
     JSON_OBJECT('sourceType', 'activity', 'sourceId', 21, 'title', 'Valle de Cocora y palmas de cera')
   ),
   0, 420, DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 3 MINUTE)),
  (5, 3, 'user',
   '¿Qué pueblos coloniales puedo visitar cerca de Bogotá?',
   NULL, 20, 0, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (6, 3, 'assistant',
   'Cerca de Bogotá puedes visitar Villa de Leyva, un pueblo colonial con plaza mayor, museos y viñedos, y Barichara, en Santander, aunque requiere un viaje más largo. También puedes considerar Zipaquirá y la sabana.',
   JSON_ARRAY(
     JSON_OBJECT('sourceType', 'destination', 'sourceId', 7, 'title', 'Villa de Leyva')
   ),
   0, 160, DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 2 MINUTE));

-- ------------------------------------------------------------
-- Consumo de tokens de ejemplo (para el reporte web y Power BI)
-- ------------------------------------------------------------
INSERT INTO usage_logs
  (user_id, service_code, conversation_id, message_id, model,
   prompt_tokens, completion_tokens, total_tokens, latency_ms, status, error_code, created_at)
VALUES
  (2, 'chat_rag', 1, 2, 'openai/gpt-oss-120b', 180, 320, 500, 1200, 'success', NULL, DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (2, 'agent_itinerary', 2, 4, 'openai/gpt-oss-120b', 900, 1400, 2300, 3500, 'success', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (3, 'chat_rag', 3, 6, 'openai/gpt-oss-120b', 200, 400, 600, 1100, 'success', NULL, DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (2, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 800, 1100, 1900, 2800, 'success', NULL, DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 160, 240, 400, 900, 'success', NULL, DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (3, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 700, 1000, 1700, 2600, 'success', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 190, 350, 540, 1000, 'success', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 220, 410, 630, 1100, 'success', NULL, DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (3, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 0, 0, 0, 5, 'blocked', 'TOKEN_QUOTA_EXCEEDED', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 0, 0, 0, 5, 'blocked', 'TOKEN_QUOTA_EXCEEDED', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 210, 390, 600, 1050, 'success', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (2, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 950, 1300, 2250, 3100, 'success', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 250, 480, 730, 1200, 'success', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 180, 300, 480, 950, 'success', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 880, 1250, 2130, 2900, 'success', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 300, 520, 820, 1300, 'success', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 760, 980, 1740, 2500, 'success', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 650, 900, 1550, 2400, 'success', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 140, 260, 400, 800, 'success', NULL, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 920, 1400, 2320, 3200, 'success', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 170, 290, 460, 900, 'success', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 210, 380, 590, 1100, 'success', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY));
