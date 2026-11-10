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
--
-- Alcance: catálogo exclusivo de Guatemala (12 destinos, 48 actividades).
-- Los precios de las actividades están en quetzales (GTQ), no en centavos.
-- ============================================================




-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
INSERT INTO users
  (id, name, email, password_hash, role, token_limit_month, active)
VALUES
  (1, 'Administrador RutaIA', 'admin@rutaia.local',
   '$2b$10$0nh1i7GBkxCsA8a1irITw.YdQE5xwEDetfb2jrkNmd5eQALATG4mG',
   'admin', 500000, TRUE),
  (2, 'Usuario Demo', 'demo@rutaia.local',
   '$2b$10$QmJmEFMmsOdwAtAN1vVMbOopC.dcpXvT9AXRm2yZ6shZgEejiDI1m',
   'user', 50000, TRUE),
  (3, 'María Fernanda', 'maria@rutaia.local',
   '$2b$10$QmJmEFMmsOdwAtAN1vVMbOopC.dcpXvT9AXRm2yZ6shZgEejiDI1m',
   'user', 30000, TRUE);

-- ------------------------------------------------------------
-- Destinos (catálogo nacional de Guatemala)
-- ------------------------------------------------------------
INSERT INTO destinations
  (id, name, region, description, category, tags, lat, lng, price_level, best_season, active)
VALUES
  (1, 'Antigua Guatemala', 'Sacatepéquez',
   'Antigua Guatemala es una de las ciudades coloniales mejor conservadas de América y Patrimonio de la Humanidad desde 1979. Sus calles empedradas, conventos en ruinas, iglesias barrocas y el Arco de Santa Catalina conviven con cafeterías de especialidad y galerías. Está rodeada por los volcanes de Agua, Fuego y Acatenango, a 1.530 metros de altitud, con clima templado todo el año. Es la base ideal para observar lava del volcán de Fuego, visitar aldeas cercanas y aprender de su tradición textil y gastronómica.',
   'Ciudad colonial y volcanes', 'colonial,patrimonio,volcanes,café,gastronomía,fotografía',
   14.5586, -90.7295, 2, 'Noviembre a abril', TRUE),
  (2, 'Lago de Atitlán y Sololá', 'Sololá',
   'El lago de Atitlán ocupa la caldera de un volcán gigante y está rodeado por los volcanes Tolimán, Atitlán y San Pedro. Doce municipios mayas bordean sus 130 kilómetros de costa, cada uno con tejidos, idiomas y panaderías propias: Panajachel, Santa Cruz, San Juan La Laguna, Santiago Atitlán y San Pedro. Es un destino para navegar entre pueblos, conocer cooperativas textiles, hacer senderismo volcánico y desayunar frente a un paisaje que Aldous Huxley llamó el más bello del mundo.',
   'Lago y cultura maya', 'lago,atitlán,cultura maya,navegación,artesanía,volcanes',
   14.6906, -91.2025, 2, 'Noviembre a mayo', TRUE),
  (3, 'Tikal, Petén', 'Petén',
   'Tikal fue una de las ciudades más poderosas del mundo maya clásico y hoy es el mayor atractivo arqueológico de Guatemala. Dentro del Parque Nacional Tikal, declarado Patrimonio de la Humanidad, se levantan templos como el Jaguar, la Serpiente Bicéfala y el Templo IV, desde donde se ve el amanecer sobre la selva. La zona es también un santuario de vida silvestre: monos aulladores, tucanes y coatíes habitan entre las pirámides. Se llega en vuelo a Flores y luego por carretera.',
   'Parque arqueológico maya', 'arqueología maya,selva,patrimonio,templos,amanecer,biodiversidad',
   17.2220, -89.6237, 3, 'Noviembre a abril', TRUE),
  (4, 'Flores e isla Petén Itzá', 'Petén',
   'Flores es una pequeña isla colonial en el lago Petén Itzá, unida a Santa Elena por un puente. Fue fundada sobre el sitio de Noj Petén, la última capital del pueblo itzá, y conserva callejones de colores, iglesias y miradores sobre el agua. Es la puerta de entrada aérea a Petén y una base práctica para visitar Tikal, Yaxhá o disfrutar el lago en lancha. Su ritmo tranquilo la hace ideal para cerrar un recorrido por la selva.',
   'Isla colonial', 'isla,lago,colonial,petén,lancha,pueblos',
   16.9295, -89.8920, 2, 'Noviembre a abril', TRUE),
  (5, 'Semuc Champey y Lanquín', 'Alta Verapaz',
   'Semuc Champey es una serie de pozas escalonadas de agua turquesa sobre un puente natural de roca, bajo el cual corre el río Cahabón. Es uno de los paisajes más fotografiados de Guatemala y se accede desde Lanquín, a cinco horas por carretera desde la capital. Las pozas se recorren a pie por miradores y escaleras de madera; cerca están las cuevas de Kanba y el balneario del río, además de comunidades q’eqchi’ dedicadas al cacao y al turismo comunitario.',
   'Río y naturaleza', 'río,naturaleza,pozas,aventura,cuevas,turismo comunitario',
   15.5378, -89.9147, 2, 'Noviembre a mayo', TRUE),
  (6, 'Volcán de Pacaya', 'Escuintla',
   'El volcán de Pacaya es uno de los pocos del mundo donde puedes caminar cerca de un campo de lava activo y tostar malvaviscos en las grietas calientes. La caminata, de dificultad moderada, parte desde San Vicente Pacaya o Amatitlán y sube entre pinos y ceniza volcánica hasta miradores con vista al lago de Amatitlán y a la ciudad. Es una excursión de medio día desde Antigua o la capital, apta para viajeros con buen estado físico.',
   'Volcán activo', 'volcán,aventura,senderismo,lava,atardecer,excursión',
   14.3800, -90.6000, 2, 'Noviembre a abril', TRUE),
  (7, 'Chichicastenango', 'Quiché',
   'Chichicastenango alberga uno de los mercados indígenas más grandes y coloridos de Centroamérica, celebrado los jueves y domingos. En su plaza se extienden puestos de textiles, máscaras, cerámica, especias y flores, mientras en la escalinata de la iglesia de Santo Tomás se realizan ceremonias mayas con copal. Es un destino de un día desde Antigua o Panajachel y una ventana a la espiritualidad y el comercio del altiplano quiché.',
   'Mercado maya', 'mercado,cultura maya,textiles,artesanía,tradición,altiplano',
   14.9433, -91.1113, 1, 'Todo el año', TRUE),
  (8, 'Monterrico', 'Santa Rosa',
   'Monterrico es la playa más popular de la costa del Pacífico guatemalteco, con arena volcánica oscura, oleaje fuerte y tortugas marinas que anidan entre julio y diciembre. Detrás de la playa se extiende un manglar navegable en lancha, hábitat de garzas, cormoranes y cocodrilos. Es un destino familiar de fin de semana, a dos horas de la capital, con hostales, restaurantes de mariscos y liberación de tortuguitas al atardecer.',
   'Playa del Pacífico', 'playa,pacífico,tortugas,manglar,familia,gastronomía',
   13.8920, -90.4760, 2, 'Noviembre a abril', TRUE),
  (9, 'Izabal y Livingston', 'Izabal',
   'La costa caribeña de Izabal combina río, selva y mar: el río Dulce conecta el lago de Izabal con Livingston, un pueblo garífuna al que solo se llega en lancha, con música punta, tapado de pescado y panes de coco. Cerca están las ruinas mayas de Quiriguá, el Castillo de San Felipe y la playa de Playa Blanca. Es la región más húmeda del país, con selvas tropicales y una cultura afrocaribeña única en Guatemala.',
   'Caribe y cultura garífuna', 'caribe,garífuna,río,selva,playa,cultura',
   15.8283, -88.7517, 2, 'Marzo a junio', TRUE),
  (10, 'Quetzaltenango (Xela)', 'Quetzaltenango',
   'Quetzaltenango, conocida como Xela, es la segunda ciudad del país y el centro cultural del altiplano occidental. A 2.333 metros de altitud, conserva un centro histórico neoclásico, el Teatro Municipal, termas cercanas como Fuentes Georginas y rutas a los volcanes Santa María y Tajumulco. Es famosa por sus escuelas de español y por los pueblos k’iche’ y mam de sus alrededores, con mercados, telares y paisajes de altura.',
   'Ciudad del altiplano', 'altiplano,ciudad,termas,volcanes,español,mercados',
   14.8347, -91.5181, 1, 'Noviembre a abril', TRUE),
  (11, 'Huehuetenango y Cuchumatanes', 'Huehuetenango',
   'Huehuetenango es la puerta a la Sierra de los Cuchumatanes, la cordillera no volcánica más alta de Centroamérica, con páramos por encima de los 3.600 metros. En sus aldeas viven comunidades mam, chuj y q’anjob’al que conservan idiomas, trajes y mercados propios. Destacan Todos Santos Cuchumatán, la laguna de Yolnabaj y la gastronomía de café de altura. Es un destino para viajeros que buscan naturaleza, montaña y autenticidad cultural.',
   'Montaña y cultura maya', 'montaña,cultura maya,café,altiplano,tradición,páramo',
   15.3197, -91.4708, 1, 'Noviembre a marzo', TRUE),
  (12, 'Mazatenango y Suchitepéquez', 'Suchitepéquez',
   'Mazatenango, en el corazón de Suchitepéquez, es la tierra del cacao y del café de la boca costa. Sus haciendas históricas, fincas cafetaleras y ríos de agua templada permiten conocer el proceso del grano y de la pasta de cacao, visitar trapiches y disfrutar de la gastronomía del altiplano cálido. Está a tres horas de la capital y se conecta fácilmente con Retalhuleu y el lago de Atitlán, ideal para una ruta de fincas de dos días.',
   'Haciendas y café', 'café,cacao,haciendas,gastronomía,agroturismo,ríos',
   14.5333, -91.5000, 1, 'Noviembre a abril', TRUE);

-- ------------------------------------------------------------
-- Actividades (precios en quetzales, GTQ)
-- ------------------------------------------------------------
INSERT INTO activities
  (id, destination_id, name, description, category, duration_min, price, lat, lng, active)
VALUES
  (1, 1, 'Tour a pie por el centro histórico',
   'Recorrido guiado por el Parque Central, la Catedral, el Arco de Santa Catalina y los conventos de La Merced y Las Capuchinas, con historias de la época colonial y de la reconstrucción tras los terremotos de 1773.',
   'cultural', 180, 150000, NULL, NULL, TRUE),
  (2, 1, 'Excursión al volcán de Fuego desde Acatenango',
   'Trekking de dos días con campamento en el volcán Acatenango para ver las erupciones del Fuego al amanecer. Incluye guía certificado, equipo de camping y comidas.',
   'aventura', 2880, 950000, NULL, NULL, TRUE),
  (3, 1, 'Tour de café de especialidad',
   'Visita a una finca de café cercana a la ciudad para conocer el cultivo, la fermentación y el secado, con cata guiada de variedades de altura.',
   'gastronomía', 180, 250000, NULL, NULL, TRUE),
  (4, 1, 'Mercado y cocina tradicional',
   'Clase de cocina guatemalteca con compra en el mercado local, preparación de pepián o kak’ik y explicación de ingredientes del altiplano.',
   'gastronomía', 240, 320000, NULL, NULL, TRUE),
  (5, 2, 'Navegación por los pueblos del lago',
   'Paseo en lancha por Panajachel, Santa Cruz y San Pedro La Laguna, con paradas para nadar, caminar y almorzar frente al lago.',
   'lago', 360, 180000, NULL, NULL, TRUE),
  (6, 2, 'Telares y café de San Juan La Laguna',
   'Recorrido por cooperativas textiles y cafetaleras de San Juan La Laguna para conocer el tinturado natural y el café del lago.',
   'cultura maya', 240, 200000, NULL, NULL, TRUE),
  (7, 2, 'Amanecer en el volcán San Pedro',
   'Ascenso guiado al volcán San Pedro antes del amanecer, con guía local y vistas panorámicas del lago y de los volcanes vecinos.',
   'aventura', 300, 250000, NULL, NULL, TRUE),
  (8, 2, 'Kayak al atardecer',
   'Recorrido en kayak por la orilla del lago al atardecer, apto para principiantes, con chaleco salvavidas y guía.',
   'naturaleza', 120, 120000, NULL, NULL, TRUE),
  (9, 3, 'Amanecer en Tikal',
   'Ingreso temprano al parque para ver el amanecer desde el Templo IV y escuchar el despertar de la selva, con guía arqueológico.',
   'arqueología maya', 300, 450000, NULL, NULL, TRUE),
  (10, 3, 'Templos y acrópolis de Tikal',
   'Recorrido interpretativo por la Gran Plaza, el Templo del Gran Jaguar, la Acrópolis del Norte y el Templo de la Serpiente Bicéfala.',
   'arqueología maya', 240, 350000, NULL, NULL, TRUE),
  (11, 3, 'Avistamiento de aves y fauna',
   'Caminata con guía especializado para observar monos aulladores, tucanes, hocofaisanes y huellas de jaguares en el parque nacional.',
   'selva', 210, 280000, NULL, NULL, TRUE),
  (12, 3, 'Yaxhá al atardecer',
   'Excursión al sitio arqueológico de Yaxhá, con pirámides frente a la laguna y vistas del atardecer sobre el agua.',
   'arqueología maya', 300, 400000, NULL, NULL, TRUE),
  (13, 4, 'Atardecer en la isla de Flores',
   'Caminata por la isla, el mirador y la iglesia colonial, con paseo en lancha alrededor del islote al atardecer.',
   'lago', 120, 90000, NULL, NULL, TRUE),
  (14, 4, 'Museo e historia de Noj Petén',
   'Visita guiada al museo local y al sitio itzá para entender la última capital maya del Petén y su conquista en 1697.',
   'colonial', 120, 70000, NULL, NULL, TRUE),
  (15, 4, 'Lago Petén Itzá en lancha',
   'Recorrido en lancha por el lago hasta la isla de los monos y paradas para nadar y observar aves.',
   'lago', 180, 150000, NULL, NULL, TRUE),
  (16, 4, 'Mercado y gastronomía petenera',
   'Tour por el mercado de Santa Elena para probar platillos típicos del Petén y comprar frutas y artesanías locales.',
   'gastronomía', 150, 100000, NULL, NULL, TRUE),
  (17, 5, 'Pozas de Semuc Champey y mirador',
   'Caminata por el mirador de Semuc Champey y baño en las pozas escalonadas de agua turquesa, con guía local q’eqchi’.',
   'naturaleza', 300, 180000, NULL, NULL, TRUE),
  (18, 5, 'Cuevas de Kanba',
   'Exploración de las cuevas de Kanba con linterna, natación en el interior y visitas a formaciones de estalactitas.',
   'aventura', 180, 120000, NULL, NULL, TRUE),
  (19, 5, 'Tubing en el río Cahabón',
   'Descenso en llanta por el río Cahabón con guía, chaleco y casco para los tramos de corriente.',
   'aventura', 120, 90000, NULL, NULL, TRUE),
  (20, 5, 'Cacao y turismo comunitario',
   'Visita a una comunidad q’eqchi’ para aprender el proceso del cacao artesanal y compartir una comida tradicional.',
   'cultura maya', 180, 140000, NULL, NULL, TRUE),
  (21, 6, 'Ascenso al volcán de Pacaya',
   'Caminata guiada de aproximadamente cuatro horas hasta el campo de lava activo, con vista al lago de Amatitlán y a los volcanes cercanos.',
   'volcán', 240, 220000, NULL, NULL, TRUE),
  (22, 6, 'Tour nocturno de lava',
   'Subida al atardecer para ver el resplandor de la lava y el cielo nocturno, con guía y linternas.',
   'volcán', 240, 260000, NULL, NULL, TRUE),
  (23, 6, 'Lago de Amatitlán en lancha',
   'Paseo en lancha por el lago de Amatitlán y visita al mirador municipal antes o después del volcán.',
   'naturaleza', 120, 90000, NULL, NULL, TRUE),
  (24, 6, 'Fincas de café en Escuintla',
   'Recorrido por una finca cafetalera de la boca costa, con cata y explicación del secado al sol.',
   'gastronomía', 180, 160000, NULL, NULL, TRUE),
  (25, 7, 'Mercado de Chichicastenango',
   'Recorrido guiado por el mercado de textiles, máscaras, especias y flores, con explicación de los tejidos del altiplano.',
   'mercado', 180, 100000, NULL, NULL, TRUE),
  (26, 7, 'Ceremonias mayas en Santo Tomás',
   'Visita respetuosa a las ceremonias con copal en la escalinata de la iglesia y al museo de arte maya contemporáneo.',
   'cultura maya', 120, 80000, NULL, NULL, TRUE),
  (27, 7, 'Ruta de aldeas quichés',
   'Excursión a aldeas cercanas para conocer telares de cintura, cerámica y la vida rural del altiplano.',
   'cultura maya', 240, 150000, NULL, NULL, TRUE),
  (28, 7, 'Taller de tejido',
   'Taller práctico con una tejedora local para aprender los puntos básicos del telar de cintura y teñidos naturales.',
   'artesanía', 150, 120000, NULL, NULL, TRUE),
  (29, 8, 'Liberación de tortuguitas',
   'Visita al tortugario de Monterrico para conocer el programa de conservación y liberar crías al atardecer.',
   'playa', 120, 80000, NULL, NULL, TRUE),
  (30, 8, 'Manglar en lancha',
   'Recorrido en lancha por los canales del manglar para observar garzas, cormoranes y cocodrilos.',
   'naturaleza', 120, 100000, NULL, NULL, TRUE),
  (31, 8, 'Clase de surf en el Pacífico',
   'Clase básica de surf en la playa de Monterrico con instructor, tabla y traje incluidos.',
   'aventura', 120, 180000, NULL, NULL, TRUE),
  (32, 8, 'Gastronomía del Pacífico',
   'Ruta gastronómica por comedores locales para probar ceviche, pescado frito, plátanos y coco fresco.',
   'gastronomía', 150, 120000, NULL, NULL, TRUE),
  (33, 9, 'Río Dulce a Livingston',
   'Navegación por el río Dulce desde Fronteras hasta Livingston, con paradas en el Castillo de San Felipe y miradores de la selva.',
   'río', 240, 250000, NULL, NULL, TRUE),
  (34, 9, 'Cultura garífuna en Livingston',
   'Visita guiada por Livingston para conocer la historia garífuna, la música punta y el tapado de pescado.',
   'cultura', 180, 180000, NULL, NULL, TRUE),
  (35, 9, 'Quiriguá y sus estelas',
   'Excursión al sitio arqueológico de Quiriguá para ver las estelas mayas más altas del mundo y el árbol del mundo de piedra.',
   'arqueología maya', 180, 150000, NULL, NULL, TRUE),
  (36, 9, 'Playa Blanca y snorkel',
   'Lancha a Playa Blanca para nadar, hacer snorkel en aguas cálidas y almorzar en la playa.',
   'playa', 240, 220000, NULL, NULL, TRUE),
  (37, 10, 'Centro histórico de Xela',
   'Caminata por el parque central, el Teatro Municipal, la catedral y el mercado de La Democracia, con guía local.',
   'ciudad', 150, 80000, NULL, NULL, TRUE),
  (38, 10, 'Termas de Fuentes Georginas',
   'Excursión a las aguas termales rodeadas de bosque en Zunil, con transporte desde Xela y tiempo libre para bañarse.',
   'naturaleza', 300, 150000, NULL, NULL, TRUE),
  (39, 10, 'Volcán Santa María',
   'Ascenso guiado al volcán Santa María para mirar el cráter del Santiaguito y el altiplano occidental.',
   'volcán', 420, 300000, NULL, NULL, TRUE),
  (40, 10, 'Escuela de español k’iche’',
   'Clase introductoria de español y palabras básicas de k’iche’ con un maestro local del altiplano.',
   'cultura maya', 120, 100000, NULL, NULL, TRUE),
  (41, 11, 'Todos Santos Cuchumatán',
   'Visita a Todos Santos para conocer el traje típico mam, el mercado y los caminos de la sierra de los Cuchumatanes.',
   'cultura maya', 300, 180000, NULL, NULL, TRUE),
  (42, 11, 'Laguna de Yolnabaj',
   'Excursión a la laguna de Yolnabaj, un lago de montaña de aguas tranquilas para caminar, nadar y acampar.',
   'naturaleza', 360, 200000, NULL, NULL, TRUE),
  (43, 11, 'Café de altura y fincas',
   'Visita a una finca de café de altura del occidente para conocer el proceso y catar variedades de Huehuetenango.',
   'gastronomía', 210, 170000, NULL, NULL, TRUE),
  (44, 11, 'Caminata por el páramo',
   'Senderismo guiado por los páramos de los Cuchumatanes, con miradores y explicación de la flora de altura.',
   'montaña', 300, 200000, NULL, NULL, TRUE),
  (45, 12, 'Ruta del cacao',
   'Visita a una finca cacaotera de Suchitepéquez para conocer la fermentación, el secado y la elaboración de chocolate artesanal.',
   'gastronomía', 210, 160000, NULL, NULL, TRUE),
  (46, 12, 'Hacienda cafetalera',
   'Recorrido por una hacienda cafetera histórica con cata, proceso del grano y almuerzo típico.',
   'café', 240, 190000, NULL, NULL, TRUE),
  (47, 12, 'Trapiche y dulces típicos',
   'Visita a un trapiche tradicional para conocer la producción de panela y dulces de la boca costa.',
   'gastronomía', 150, 120000, NULL, NULL, TRUE),
  (48, 12, 'Río Nimá y naturaleza',
   'Caminata junto al río Nimá, pozas de agua templada y picnic en fincas de la zona.',
   'naturaleza', 240, 140000, NULL, NULL, TRUE);

-- ------------------------------------------------------------
-- Servicios de IA
-- ------------------------------------------------------------
INSERT INTO ai_services
  (id, code, name, description, model, temperature, max_tokens, system_prompt, enabled)
VALUES
  (1, 'chat_rag', 'Chatbot RAG de turismo',
   'Responde preguntas sobre destinos y actividades usando la base de datos como contexto.',
   'openai/gpt-oss-120b', 0.20, 1024,
   'Eres RutaIA, un asistente experto en turismo en Guatemala. Responde en español, de forma clara y útil. Usa únicamente la información del CONTEXTO entregado. Cita las fuentes con el formato [1], [2] según corresponda. Si el contexto no contiene información suficiente, dilo explícitamente y sugiere los temas disponibles. No inventes precios, horarios ni datos que no aparezcan en el contexto. Solo cubres Guatemala: si te preguntan por otro país, acláralo amablemente y propone alternativas dentro de Guatemala. Los precios se expresan en quetzales guatemaltecos (GTQ).', TRUE),
  (2, 'agent_itinerary', 'Agente planificador de itinerarios',
   'Construye un itinerario multi-paso consultando el catálogo, el clima y las distancias.',
   'openai/gpt-oss-120b', 0.30, 2048,
   'Eres un planificador de viajes experto en Guatemala. Debes usar las herramientas disponibles para buscar actividades, consultar el clima y calcular distancias antes de responder. Máximo 6 pasos. Presenta el itinerario por día con costos estimados en quetzales (GTQ), duración y fuentes consultadas. Si falta información, indícalo claramente y propone supuestos razonables. Solo planificas viajes dentro de Guatemala.', TRUE),
  (3, 'agent_compare', 'Agente comparador de destinos',
   'Compara destinos según clima, costos y actividades para recomendar la mejor opción.',
   'openai/gpt-oss-120b', 0.20, 2048,
   'Eres un asesor de viajes que compara destinos de Guatemala. Usa las herramientas para consultar las fichas de cada destino, sus actividades, el clima y las distancias desde la ciudad de origen. Presenta una tabla comparativa con costo estimado en quetzales (GTQ), clima y oferta, y termina con una recomendación justificada. Si falta información, dilo. Solo comparas destinos dentro de Guatemala.', TRUE);

-- ------------------------------------------------------------
-- Conversaciones y mensajes de ejemplo
-- ------------------------------------------------------------
INSERT INTO conversations
  (id, user_id, service_code, title, summary, last_message_at, created_at)
VALUES
  (1, 2, 'chat_rag', 'Destinos de playa en Guatemala',
   'El usuario preguntó por destinos de playa para viajar con niños; se recomendaron Monterrico y Livingston.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (2, 2, 'agent_itinerary', 'Itinerario de 3 días en Antigua Guatemala',
   'Itinerario de tres días en Antigua con centro histórico, volcán de Pacaya y tour de café.',
   NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'),
  (3, 3, 'chat_rag', 'Pueblos y lagos cerca de la capital',
   'La usuaria preguntó por escapes cerca de la ciudad de Guatemala; se mencionaron Antigua, Atitlán y Chichicastenango.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

INSERT INTO messages
  (id, conversation_id, role, content, sources_json, tokens_in, tokens_out, created_at)
VALUES
  (1, 1, 'user',
   '¿Qué destinos de playa recomiendas para viajar con niños?',
   NULL, 24, 0, NOW() - INTERVAL '3 days'),
  (2, 1, 'assistant',
   'Para viajar con niños te recomiendo Monterrico, en Santa Rosa, ideal para ver tortugas y navegar el manglar, y Livingston, en Izabal, donde se llega en lancha por el río Dulce. Ten en cuenta la temporada seca entre noviembre y abril para aprovechar mejor la playa.',
   '[{"sourceType": "destination", "sourceId": 8, "title": "Monterrico"}, {"sourceType": "destination", "sourceId": 9, "title": "Izabal y Livingston"}]'::jsonb,
   0, 190, (NOW() - INTERVAL '3 days') + INTERVAL '2 minutes'),
  (3, 2, 'user',
   'Armame un itinerario de 3 días en Antigua Guatemala con presupuesto medio.',
   NULL, 30, 0, NOW() - INTERVAL '1 days'),
  (4, 2, 'assistant',
   'Día 1: llegada a Antigua y tour a pie por el centro histórico. Día 2: excursión al volcán de Pacaya. Día 3: tour de café de especialidad y mercado. El presupuesto estimado incluye transporte local, alimentación y actividades.',
   '[{"sourceType": "destination", "sourceId": 1, "title": "Antigua Guatemala"}, {"sourceType": "activity", "sourceId": 2, "title": "Excursión al volcán de Fuego desde Acatenango"}]'::jsonb,
   0, 420, (NOW() - INTERVAL '1 days') + INTERVAL '3 minutes'),
  (5, 3, 'user',
   '¿Qué escapes puedo hacer cerca de la ciudad de Guatemala?',
   NULL, 20, 0, NOW() - INTERVAL '5 days'),
  (6, 3, 'assistant',
   'Cerca de la capital puedes visitar Antigua Guatemala, a una hora, con su centro colonial y los volcanes; el lago de Atitlán, a tres horas, con sus pueblos mayas; y Chichicastenango, famoso por su mercado de jueves y domingo.',
   '[{"sourceType": "destination", "sourceId": 1, "title": "Antigua Guatemala"}, {"sourceType": "destination", "sourceId": 2, "title": "Lago de Atitlán y Sololá"}]'::jsonb,
   0, 160, (NOW() - INTERVAL '5 days') + INTERVAL '2 minutes');

-- ------------------------------------------------------------
-- Consumo de tokens de ejemplo (para el reporte web y Power BI)
-- ------------------------------------------------------------
INSERT INTO usage_logs
  (user_id, service_code, conversation_id, message_id, model,
   prompt_tokens, completion_tokens, total_tokens, latency_ms, status, error_code, created_at)
VALUES
  (2, 'chat_rag', 1, 2, 'openai/gpt-oss-120b', 180, 320, 500, 1200, 'success', NULL, NOW() - INTERVAL '13 days'),
  (2, 'agent_itinerary', 2, 4, 'openai/gpt-oss-120b', 900, 1400, 2300, 3500, 'success', NULL, NOW() - INTERVAL '12 days'),
  (3, 'chat_rag', 3, 6, 'openai/gpt-oss-120b', 200, 400, 600, 1100, 'success', NULL, NOW() - INTERVAL '11 days'),
  (2, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 800, 1100, 1900, 2800, 'success', NULL, NOW() - INTERVAL '10 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 160, 240, 400, 900, 'success', NULL, NOW() - INTERVAL '9 days'),
  (3, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 700, 1000, 1700, 2600, 'success', NULL, NOW() - INTERVAL '8 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 190, 350, 540, 1000, 'success', NULL, NOW() - INTERVAL '7 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 220, 410, 630, 1100, 'success', NULL, NOW() - INTERVAL '6 days'),
  (3, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 0, 0, 0, 5, 'blocked', 'TOKEN_QUOTA_EXCEEDED', NOW() - INTERVAL '6 days'),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 0, 0, 0, 5, 'blocked', 'TOKEN_QUOTA_EXCEEDED', NOW() - INTERVAL '4 days'),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 210, 390, 600, 1050, 'success', NULL, NOW() - INTERVAL '5 days'),
  (2, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 950, 1300, 2250, 3100, 'success', NULL, NOW() - INTERVAL '4 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 250, 480, 730, 1200, 'success', NULL, NOW() - INTERVAL '3 days'),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 180, 300, 480, 950, 'success', NULL, NOW() - INTERVAL '2 days'),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 880, 1250, 2130, 2900, 'success', NULL, NOW() - INTERVAL '2 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 300, 520, 820, 1300, 'success', NULL, NOW() - INTERVAL '1 days'),
  (3, 'agent_compare', NULL, NULL, 'openai/gpt-oss-120b', 760, 980, 1740, 2500, 'success', NULL, NOW() - INTERVAL '1 days'),
  (3, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 650, 900, 1550, 2400, 'success', NULL, NOW() - INTERVAL '1 days'),
  (2, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 140, 260, 400, 800, 'success', NULL, NOW() - INTERVAL '4 hours'),
  (2, 'agent_itinerary', NULL, NULL, 'openai/gpt-oss-120b', 920, 1400, 2320, 3200, 'success', NULL, NOW() - INTERVAL '2 hours'),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 170, 290, 460, 900, 'success', NULL, NOW() - INTERVAL '3 days'),
  (3, 'chat_rag', NULL, NULL, 'openai/gpt-oss-120b', 210, 380, 590, 1100, 'success', NULL, NOW() - INTERVAL '2 days');


-- ------------------------------------------------------------
-- Sincroniza las secuencias IDENTITY con los IDs insertados
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),
              COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('destinations', 'id'),
              COALESCE((SELECT MAX(id) FROM destinations), 1));
SELECT setval(pg_get_serial_sequence('activities', 'id'),
              COALESCE((SELECT MAX(id) FROM activities), 1));
SELECT setval(pg_get_serial_sequence('ai_services', 'id'),
              COALESCE((SELECT MAX(id) FROM ai_services), 1));
SELECT setval(pg_get_serial_sequence('conversations', 'id'),
              COALESCE((SELECT MAX(id) FROM conversations), 1));
SELECT setval(pg_get_serial_sequence('messages', 'id'),
              COALESCE((SELECT MAX(id) FROM messages), 1));
SELECT setval(pg_get_serial_sequence('usage_logs', 'id'),
              COALESCE((SELECT MAX(id) FROM usage_logs), 1));
