// functions/_lib/estados-data.js
// Datos de referencia de las 24 entidades federales de Venezuela para la wiki
// de estados (/estados y /estado/:slug) y la deteccion de estado por IP.
//
// Fuentes: INE (Censo 2011) y Wikipedia en español (enlazada en cada estado,
// licencia CC BY-SA). Las reseñas son textos propios basados en esas fuentes.
// Superficie en km² y poblacion del Censo 2011: valores de referencia.
//
// iso: codigo ISO 3166-2:VE (Cloudflare lo expone como request.cf.regionCode).
// dbNames: como puede venir escrito el estado en la tabla businesses.
// lat/lng: coordenadas de la capital (clima en vivo).

export const ESTADOS = [
  {
    slug: 'amazonas', name: 'Amazonas', iso: 'Z', dbNames: ['Amazonas'],
    capital: 'Puerto Ayacucho', lat: 5.6639, lng: -67.6236,
    area: 180145, population: 146480, region: 'Guayana', gentilicio: 'Amazonense',
    wiki: 'Estado_Amazonas',
    resena: 'Amazonas es el segundo estado más extenso de Venezuela y el menos poblado. Ocupa buena parte de la selva amazónica venezolana y es hogar de numerosos pueblos indígenas, como los yanomami, piaroa y ye\'kuana. Su territorio incluye tepuyes, ríos caudalosos y áreas protegidas de enorme biodiversidad.',
    clima: 'Tropical lluvioso de selva, cálido y húmedo todo el año, con temperaturas entre 24 °C y 32 °C y lluvias abundantes, sobre todo de abril a octubre.',
    economia: ['Turismo de naturaleza y aventura', 'Pesca artesanal', 'Agricultura de subsistencia (yuca, plátano, frutas amazónicas)', 'Artesanía indígena', 'Comercio y administración pública'],
    atractivos: ['Cerro Autana', 'Raudales de Atures', 'Parque Nacional Parima-Tapirapecó', 'Tobogán de la Selva', 'Río Orinoco'],
    municipios: ['Alto Orinoco', 'Atabapo', 'Atures', 'Autana', 'Manapiare', 'Maroa', 'Río Negro'],
  },
  {
    slug: 'anzoategui', name: 'Anzoátegui', iso: 'B', dbNames: ['Anzoátegui', 'Anzoategui'],
    capital: 'Barcelona', lat: 10.1363, lng: -64.6862,
    area: 43300, population: 1469747, region: 'Nororiental', gentilicio: 'Anzoatiguense',
    wiki: 'Estado_Anzoátegui',
    resena: 'Anzoátegui se ubica en el oriente del país y combina costas del mar Caribe con extensas mesetas y llanos. Es uno de los principales polos petroleros de Venezuela gracias a la Faja del Orinoco y al complejo de Jose. Su conurbación Barcelona–Puerto La Cruz–Lechería es un importante centro comercial y turístico.',
    clima: 'Cálido tropical; seco y soleado en la costa, con temperaturas de 26 °C a 33 °C, y lluvias concentradas entre mayo y octubre en el interior.',
    economia: ['Petróleo y gas (Faja del Orinoco, complejo petroquímico de Jose)', 'Turismo de playa', 'Pesca', 'Ganadería y agricultura (maíz, sorgo)', 'Comercio y servicios portuarios'],
    atractivos: ['Parque Nacional Mochima', 'Playa Colorada', 'Lechería y El Morro', 'Casco histórico de Barcelona', 'Isla de Plata'],
    municipios: ['Anaco', 'Aragua', 'Diego Bautista Urbaneja', 'Fernando de Peñalver', 'Francisco del Carmen Carvajal', 'Francisco de Miranda', 'General Sir Arthur McGregor', 'Guanta', 'Independencia', 'José Gregorio Monagas', 'Juan Antonio Sotillo', 'Juan Manuel Cajigal', 'Libertad', 'Manuel Ezequiel Bruzual', 'Pedro María Freites', 'Píritu', 'San José de Guanipa', 'San Juan de Capistrano', 'Santa Ana', 'Simón Bolívar', 'Simón Rodríguez'],
  },
  {
    slug: 'apure', name: 'Apure', iso: 'C', dbNames: ['Apure'],
    capital: 'San Fernando de Apure', lat: 7.8878, lng: -67.4724,
    area: 76500, population: 459025, region: 'Llanos', gentilicio: 'Apureño',
    wiki: 'Estado_Apure',
    resena: 'Apure es el corazón de los llanos venezolanos, una inmensa planicie surcada por los ríos Apure, Arauca y Meta. Es tierra de tradición ganadera y cuna del joropo y la música llanera. Sus sabanas inundables albergan chigüires, caimanes del Orinoco y cientos de especies de aves.',
    clima: 'Tropical de sabana, muy cálido (27 °C a 35 °C), con una marcada temporada de lluvias (mayo–octubre) que inunda las sabanas y una estación seca (noviembre–abril).',
    economia: ['Ganadería bovina', 'Agricultura (arroz, maíz, plátano)', 'Pesca de río', 'Turismo de llano y hatos', 'Comercio fronterizo con Colombia'],
    atractivos: ['Parque Nacional Santos Luzardo', 'Parque Nacional Cinaruco-Capanaparo', 'Hatos llaneros', 'Río Apure', 'Médanos de Apure'],
    municipios: ['Achaguas', 'Biruaca', 'Muñoz', 'Páez', 'Pedro Camejo', 'Rómulo Gallegos', 'San Fernando'],
  },
  {
    slug: 'aragua', name: 'Aragua', iso: 'D', dbNames: ['Aragua'],
    capital: 'Maracay', lat: 10.2469, lng: -67.5958,
    area: 7014, population: 1630308, region: 'Central', gentilicio: 'Aragüeño',
    wiki: 'Estado_Aragua',
    resena: 'Aragua está en el centro-norte del país, entre la cordillera de la Costa y el lago de Valencia. Su capital, Maracay, es conocida como la "Ciudad Jardín" y es un importante centro industrial y militar. El estado alberga el Parque Nacional Henri Pittier, el más antiguo de Venezuela, con playas como Choroní y Cata.',
    clima: 'Tropical templado por la altitud en los valles (24 °C a 30 °C) y más fresco en la montaña; lluvias de mayo a noviembre.',
    economia: ['Industria manufacturera (alimentos, textiles, química)', 'Agricultura (caña de azúcar, cacao, hortalizas)', 'Turismo de playa y montaña', 'Comercio y servicios', 'Aviación y actividad militar'],
    atractivos: ['Parque Nacional Henri Pittier', 'Choroní y Puerto Colombia', 'Bahía de Cata', 'Colonia Tovar', 'Museo Aeronáutico de Maracay'],
    municipios: ['Bolívar', 'Camatagua', 'Francisco Linares Alcántara', 'Girardot', 'José Ángel Lamas', 'José Félix Ribas', 'José Rafael Revenga', 'Libertador', 'Mario Briceño Iragorry', 'Ocumare de la Costa de Oro', 'San Casimiro', 'San Sebastián', 'Santiago Mariño', 'Santos Michelena', 'Sucre', 'Tovar', 'Urdaneta', 'Zamora'],
  },
  {
    slug: 'barinas', name: 'Barinas', iso: 'E', dbNames: ['Barinas'],
    capital: 'Barinas', lat: 8.6226, lng: -70.2075,
    area: 35200, population: 816264, region: 'Llanos', gentilicio: 'Barinés',
    wiki: 'Estado_Barinas',
    resena: 'Barinas une el piedemonte andino con los llanos occidentales, lo que le da paisajes que van de ríos de montaña a extensas sabanas. Es uno de los grandes productores agropecuarios del país. Su capital es una ciudad en crecimiento y puerta de entrada a destinos de aventura como Barinitas y el río Acequias.',
    clima: 'Tropical cálido (26 °C a 34 °C) en el llano y más templado en el piedemonte; lluvias intensas de abril a noviembre.',
    economia: ['Ganadería bovina y lechera', 'Agricultura (maíz, arroz, plátano, caña)', 'Petróleo y gas', 'Agroindustria', 'Turismo de aventura (rafting, parapente)'],
    atractivos: ['Barinitas y el piedemonte andino', 'Río Acequias y río Canaguá', 'Parque Nacional Aguaro-Guariquito (cercano)', 'Casco histórico de Barinas', 'Parque Los Mangos'],
    municipios: ['Alberto Arvelo Torrealba', 'Andrés Eloy Blanco', 'Antonio José de Sucre', 'Arismendi', 'Barinas', 'Bolívar', 'Cruz Paredes', 'Ezequiel Zamora', 'Obispos', 'Pedraza', 'Rojas', 'Sosa'],
  },
  {
    slug: 'bolivar', name: 'Bolívar', iso: 'F', dbNames: ['Bolívar', 'Bolivar'],
    capital: 'Ciudad Bolívar', lat: 8.1222, lng: -63.5497,
    area: 240528, population: 1410964, region: 'Guayana', gentilicio: 'Bolivarense',
    wiki: 'Estado_Bolívar',
    resena: 'Bolívar es el estado más extenso de Venezuela. En su territorio se encuentran el Parque Nacional Canaima, el Salto Ángel —la caída de agua más alta del mundo— y la Gran Sabana con sus tepuyes. Ciudad Guayana (Puerto Ordaz y San Félix) es el principal polo industrial del país, con la siderúrgica y las hidroeléctricas del río Caroní.',
    clima: 'Tropical cálido y húmedo en las zonas bajas (25 °C a 33 °C) y fresco en la Gran Sabana (15 °C a 25 °C); lluvias de mayo a octubre.',
    economia: ['Minería (hierro, bauxita, oro)', 'Industria siderúrgica y del aluminio', 'Generación hidroeléctrica (Guri, Caruachi, Macagua)', 'Turismo (Canaima, Gran Sabana)', 'Comercio y servicios'],
    atractivos: ['Salto Ángel (Kerepakupai Merú)', 'Parque Nacional Canaima', 'Gran Sabana y Roraima', 'Casco histórico de Ciudad Bolívar', 'Parque Cachamay en Puerto Ordaz'],
    municipios: ['Angostura', 'Caroní', 'Cedeño', 'El Callao', 'Gran Sabana', 'Heres', 'Padre Pedro Chien', 'Piar', 'Roscio', 'Sifontes', 'Sucre'],
  },
  {
    slug: 'carabobo', name: 'Carabobo', iso: 'G', dbNames: ['Carabobo'],
    capital: 'Valencia', lat: 10.1620, lng: -68.0077,
    area: 4650, population: 2245744, region: 'Central', gentilicio: 'Carabobeño',
    wiki: 'Estado_Carabobo',
    resena: 'Carabobo es uno de los estados más industrializados y densamente poblados de Venezuela. En su territorio se libró la Batalla de Carabobo (1821), decisiva para la independencia. Valencia es la tercera ciudad del país y Puerto Cabello, el principal puerto comercial de Venezuela.',
    clima: 'Tropical cálido (24 °C a 32 °C), con lluvias de mayo a noviembre y temporada seca el resto del año.',
    economia: ['Industria manufacturera (automotriz, alimentos, química)', 'Actividad portuaria (Puerto Cabello)', 'Petroquímica (Morón) y refinación (El Palito)', 'Comercio y servicios', 'Agricultura (cítricos, hortalizas)'],
    atractivos: ['Campo de Carabobo', 'Puerto Cabello y su casco colonial', 'Parque Nacional San Esteban', 'Playas de Morrocoy (cercanas)', 'Catedral y Plaza Bolívar de Valencia'],
    municipios: ['Bejuma', 'Carlos Arvelo', 'Diego Ibarra', 'Guacara', 'Juan José Mora', 'Libertador', 'Los Guayos', 'Miranda', 'Montalbán', 'Naguanagua', 'Puerto Cabello', 'San Diego', 'San Joaquín', 'Valencia'],
  },
  {
    slug: 'cojedes', name: 'Cojedes', iso: 'H', dbNames: ['Cojedes'],
    capital: 'San Carlos', lat: 9.6612, lng: -68.5827,
    area: 14800, population: 323165, region: 'Central', gentilicio: 'Cojedeño',
    wiki: 'Estado_Cojedes',
    resena: 'Cojedes es un estado de transición entre la región central y los llanos. Su paisaje de sabanas, ríos y morichales lo convierte en zona ganadera y agrícola. Es tierra de tradición llanera y guarda episodios importantes de la historia republicana, como la Batalla de Taguanes.',
    clima: 'Tropical de sabana, cálido (26 °C a 34 °C), con lluvias de mayo a octubre.',
    economia: ['Ganadería bovina', 'Agricultura (arroz, maíz, sorgo)', 'Agroindustria', 'Explotación forestal', 'Comercio'],
    atractivos: ['Hato Piñero', 'Parque Nacional Tirgua', 'Casco histórico de San Carlos', 'Río Cojedes', 'Tinaquillo'],
    municipios: ['Anzoátegui', 'Ezequiel Zamora', 'Girardot', 'Lima Blanco', 'Pao de San Juan Bautista', 'Ricaurte', 'Rómulo Gallegos', 'Tinaco', 'Tinaquillo'],
  },
  {
    slug: 'delta-amacuro', name: 'Delta Amacuro', iso: 'Y', dbNames: ['Delta Amacuro'],
    capital: 'Tucupita', lat: 9.0581, lng: -62.0500,
    area: 40200, population: 167676, region: 'Guayana', gentilicio: 'Deltano',
    wiki: 'Estado_Delta_Amacuro',
    resena: 'Delta Amacuro abarca el delta del río Orinoco, un laberinto de caños, islas y manglares que desemboca en el océano Atlántico. Es territorio ancestral del pueblo warao, cuyas viviendas palafíticas son emblema del estado. Su biodiversidad y paisajes fluviales lo hacen un destino único de ecoturismo.',
    clima: 'Tropical húmedo, cálido todo el año (25 °C a 32 °C) y con lluvias abundantes, sobre todo de mayo a noviembre.',
    economia: ['Pesca', 'Agricultura (arroz, ocumo, plátano)', 'Petróleo (zona de Pedernales)', 'Ecoturismo fluvial', 'Artesanía warao (moriche)'],
    atractivos: ['Delta del Orinoco', 'Caños y comunidades warao', 'Tucupita y su paseo Manamo', 'Parque Nacional Mariusa', 'Pedernales'],
    municipios: ['Antonio Díaz', 'Casacoima', 'Pedernales', 'Tucupita'],
  },
  {
    slug: 'distrito-capital', name: 'Distrito Capital', iso: 'A', dbNames: ['Distrito Capital', 'Caracas', 'Distrito Federal'],
    capital: 'Caracas', lat: 10.4806, lng: -66.9036,
    area: 433, population: 1943901, region: 'Capital', gentilicio: 'Caraqueño',
    wiki: 'Distrito_Capital_(Venezuela)',
    resena: 'El Distrito Capital comprende el municipio Libertador de Caracas, sede de los poderes públicos nacionales. Caracas, fundada en 1567, es el principal centro político, financiero y cultural del país. La ciudad se extiende en un valle a los pies del Waraira Repano (El Ávila), su gran pulmón vegetal.',
    clima: 'Tropical de altura, templado y agradable (18 °C a 28 °C) por estar a unos 900 m sobre el nivel del mar; lluvias de mayo a noviembre.',
    economia: ['Administración pública nacional', 'Comercio y servicios', 'Banca y finanzas', 'Industria cultural y medios', 'Turismo urbano'],
    atractivos: ['Parque Nacional Waraira Repano (El Ávila)', 'Casco histórico y Plaza Bolívar', 'Panteón Nacional', 'Museo de Arte Contemporáneo y Parque Central', 'Teleférico Warairarepano'],
    municipios: ['Libertador'],
  },
  {
    slug: 'falcon', name: 'Falcón', iso: 'I', dbNames: ['Falcón', 'Falcon'],
    capital: 'Santa Ana de Coro', lat: 11.4045, lng: -69.6734,
    area: 24800, population: 902847, region: 'Centro-Occidental', gentilicio: 'Falconiano',
    wiki: 'Estado_Falcón',
    resena: 'Falcón ocupa el extremo noroccidental del país y tiene la costa más extensa de Venezuela. Su capital, Coro, fue la primera capital de Venezuela y su casco colonial es Patrimonio de la Humanidad de la UNESCO. El estado combina médanos, la península de Paraguaná, la sierra de San Luis y los cayos de Morrocoy.',
    clima: 'Semiárido y cálido en la costa y Paraguaná (27 °C a 34 °C), con pocas lluvias; más fresco y húmedo en la sierra de San Luis.',
    economia: ['Refinación de petróleo (Complejo Refinador Paraguaná)', 'Turismo de playa', 'Pesca', 'Ganadería caprina', 'Comercio (zona libre de Paraguaná)'],
    atractivos: ['Coro y La Vela (Patrimonio UNESCO)', 'Parque Nacional Médanos de Coro', 'Parque Nacional Morrocoy', 'Península de Paraguaná', 'Sierra de San Luis'],
    municipios: ['Acosta', 'Bolívar', 'Buchivacoa', 'Cacique Manaure', 'Carirubana', 'Colina', 'Dabajuro', 'Democracia', 'Falcón', 'Federación', 'Jacura', 'Los Taques', 'Mauroa', 'Miranda', 'Monseñor Iturriza', 'Palmasola', 'Petit', 'Píritu', 'San Francisco', 'Silva', 'Sucre', 'Tocópero', 'Unión', 'Urumaco', 'Zamora'],
  },
  {
    slug: 'guarico', name: 'Guárico', iso: 'J', dbNames: ['Guárico', 'Guarico'],
    capital: 'San Juan de los Morros', lat: 9.9116, lng: -67.3538,
    area: 64986, population: 747739, region: 'Llanos', gentilicio: 'Guariqueño',
    wiki: 'Estado_Guárico',
    resena: 'Guárico, en el centro del país, es la puerta de entrada a los llanos venezolanos. Su capital, San Juan de los Morros, es famosa por sus aguas termales y por los Morros que la rodean. Es uno de los estados con mayor producción de arroz y ganado de Venezuela.',
    clima: 'Tropical de sabana, cálido (26 °C a 35 °C), con lluvias de mayo a octubre y una estación seca muy marcada.',
    economia: ['Agricultura (arroz, maíz, sorgo)', 'Ganadería bovina', 'Petróleo y gas', 'Pesca en embalses', 'Turismo termal'],
    atractivos: ['Los Morros de San Juan', 'Aguas termales de San Juan de los Morros', 'Parque Nacional Aguaro-Guariquito', 'Embalse de Guárico (Calabozo)', 'Ortiz, pueblo de Doña Bárbara'],
    municipios: ['Camaguán', 'Chaguaramas', 'El Socorro', 'Francisco de Miranda', 'José Félix Ribas', 'José Tadeo Monagas', 'Juan Germán Roscio', 'Julián Mellado', 'Las Mercedes', 'Leonardo Infante', 'Ortiz', 'Pedro Zaraza', 'San Gerónimo de Guayabal', 'San José de Guaribe', 'Santa María de Ipire'],
  },
  {
    slug: 'lara', name: 'Lara', iso: 'K', dbNames: ['Lara'],
    capital: 'Barquisimeto', lat: 10.0678, lng: -69.3474,
    area: 19800, population: 1774867, region: 'Centro-Occidental', gentilicio: 'Larense',
    wiki: 'Estado_Lara',
    resena: 'Lara es conocido como el "estado musical" de Venezuela por su tradición de tamunangue, golpe larense y grandes intérpretes. Barquisimeto, su capital, es la cuarta ciudad del país y un gran centro comercial. Destacan la devoción a la Divina Pastora y su artesanía, además de sus viñedos en Carora.',
    clima: 'Semiárido y cálido en el centro y norte (24 °C a 32 °C); más fresco y lluvioso hacia el sur montañoso (Sanare, El Tocuyo).',
    economia: ['Agricultura (caña de azúcar, cebolla, tomate, uva)', 'Agroindustria (vinos de Carora, azúcar)', 'Comercio y servicios', 'Industria manufacturera', 'Artesanía'],
    atractivos: ['Barquisimeto y la procesión de la Divina Pastora', 'Carora y sus viñedos', 'Parque Nacional Yacambú', 'Parque Nacional Dinira', 'Quíbor y Sanare'],
    municipios: ['Andrés Eloy Blanco', 'Crespo', 'Iribarren', 'Jiménez', 'Morán', 'Palavecino', 'Simón Planas', 'Torres', 'Urdaneta'],
  },
  {
    slug: 'merida', name: 'Mérida', iso: 'L', dbNames: ['Mérida', 'Merida'],
    capital: 'Mérida', lat: 8.5897, lng: -71.1561,
    area: 11300, population: 828592, region: 'Andes', gentilicio: 'Merideño',
    wiki: 'Estado_Mérida',
    resena: 'Mérida es el estado andino por excelencia, con los picos más altos de Venezuela, como el Pico Bolívar (4.978 m). Su capital es una ciudad universitaria, sede de la Universidad de Los Andes, y un destino turístico todo el año. El estado combina páramos, lagunas glaciares, pueblos coloniales y el teleférico más alto y largo del mundo, Mukumbarí.',
    clima: 'De montaña: templado en la ciudad de Mérida (15 °C a 26 °C) y frío en los páramos (puede bajar de 0 °C); lluvias de abril a noviembre.',
    economia: ['Turismo de montaña', 'Agricultura (papa, hortalizas, café, fresas)', 'Educación universitaria (ULA)', 'Ganadería lechera y quesos andinos', 'Comercio y servicios'],
    atractivos: ['Teleférico Mukumbarí', 'Parque Nacional Sierra Nevada', 'Laguna de Mucubají', 'Los Aleros y Jají', 'Heladería Coromoto y centro de Mérida'],
    municipios: ['Alberto Adriani', 'Andrés Bello', 'Antonio Pinto Salinas', 'Aricagua', 'Arzobispo Chacón', 'Campo Elías', 'Caracciolo Parra Olmedo', 'Cardenal Quintero', 'Guaraque', 'Julio César Salas', 'Justo Briceño', 'Libertador', 'Miranda', 'Obispo Ramos de Lora', 'Padre Noguera', 'Pueblo Llano', 'Rangel', 'Rivas Dávila', 'Santos Marquina', 'Sucre', 'Tovar', 'Tulio Febres Cordero', 'Zea'],
  },
  {
    slug: 'miranda', name: 'Miranda', iso: 'M', dbNames: ['Miranda'],
    capital: 'Los Teques', lat: 10.3444, lng: -67.0433,
    area: 7950, population: 2675165, region: 'Capital', gentilicio: 'Mirandino',
    wiki: 'Estado_Miranda',
    resena: 'Miranda rodea a Caracas y es el segundo estado más poblado de Venezuela. Incluye buena parte del área metropolitana (Chacao, Baruta, Sucre, El Hatillo), los Valles del Tuy, Barlovento y los Altos Mirandinos. Barlovento es famoso por su cacao y sus tambores afrovenezolanos, y la costa ofrece playas como Higuerote.',
    clima: 'Variado: templado en los Altos Mirandinos (16 °C a 26 °C) y cálido y húmedo en Barlovento y la costa (25 °C a 32 °C); lluvias de mayo a diciembre.',
    economia: ['Comercio y servicios', 'Industria manufacturera', 'Agricultura (cacao de Barlovento, frutas)', 'Turismo de playa (Higuerote, Río Chico)', 'Construcción'],
    atractivos: ['Higuerote y Parque Nacional Laguna de Tacarigua', 'Barlovento y sus tambores', 'El Hatillo', 'Altos Mirandinos y San Antonio de los Altos', 'Parque Nacional Guatopo'],
    municipios: ['Acevedo', 'Andrés Bello', 'Baruta', 'Brión', 'Buroz', 'Carrizal', 'Chacao', 'Cristóbal Rojas', 'El Hatillo', 'Guaicaipuro', 'Independencia', 'Lander', 'Los Salias', 'Páez', 'Paz Castillo', 'Pedro Gual', 'Plaza', 'Simón Bolívar', 'Sucre', 'Urdaneta', 'Zamora'],
  },
  {
    slug: 'monagas', name: 'Monagas', iso: 'N', dbNames: ['Monagas'],
    capital: 'Maturín', lat: 9.7457, lng: -63.1832,
    area: 28900, population: 905443, region: 'Nororiental', gentilicio: 'Monaguense',
    wiki: 'Estado_Monagas',
    resena: 'Monagas, en el oriente venezolano, es uno de los grandes productores de petróleo del país, con yacimientos como El Furrial y Punta de Mata. Su territorio va de las montañas de Caripe a los llanos y morichales del sur. La Cueva del Guácharo, primer monumento natural de Venezuela, es su atractivo más conocido.',
    clima: 'Cálido tropical en la llanura (26 °C a 33 °C) y fresco en la serranía de Caripe (18 °C a 26 °C); lluvias de mayo a noviembre.',
    economia: ['Petróleo y gas', 'Agricultura (yuca, maíz, frutas, café en Caripe)', 'Ganadería', 'Comercio y servicios', 'Turismo de naturaleza'],
    atractivos: ['Cueva del Guácharo (Caripe)', 'Valle de Caripe', 'Morichales del sur de Monagas', 'Parque La Guaricha en Maturín', 'Río Guarapiche'],
    municipios: ['Acosta', 'Aguasay', 'Bolívar', 'Caripe', 'Cedeño', 'Ezequiel Zamora', 'Libertador', 'Maturín', 'Piar', 'Punceres', 'Santa Bárbara', 'Sotillo', 'Uracoa'],
  },
  {
    slug: 'nueva-esparta', name: 'Nueva Esparta', iso: 'O', dbNames: ['Nueva Esparta', 'Margarita'],
    capital: 'La Asunción', lat: 11.0333, lng: -63.8628,
    area: 1150, population: 491610, region: 'Insular', gentilicio: 'Neoespartano',
    wiki: 'Estado_Nueva_Esparta',
    resena: 'Nueva Esparta es el único estado insular de Venezuela y está formado por las islas de Margarita, Coche y Cubagua. Conocida como la "Perla del Caribe", Margarita es uno de los principales destinos turísticos del país por sus playas, su puerto libre y sus castillos coloniales. Su capital, La Asunción, conserva un valioso patrimonio histórico.',
    clima: 'Tropical seco y soleado (26 °C a 32 °C), con brisas constantes y pocas lluvias, concentradas entre octubre y enero.',
    economia: ['Turismo de playa', 'Comercio (puerto libre)', 'Pesca', 'Artesanía (hamacas, cestería)', 'Servicios'],
    atractivos: ['Playa El Agua y Playa Parguito', 'Parque Nacional Laguna de La Restinga', 'Castillo de Santa Rosa y La Asunción', 'Juan Griego y su atardecer', 'Isla de Coche'],
    municipios: ['Antolín del Campo', 'Arismendi', 'Díaz', 'García', 'Gómez', 'Maneiro', 'Marcano', 'Mariño', 'Península de Macanao', 'Tubores', 'Villalba'],
  },
  {
    slug: 'portuguesa', name: 'Portuguesa', iso: 'P', dbNames: ['Portuguesa'],
    capital: 'Guanare', lat: 9.0418, lng: -69.7421,
    area: 15200, population: 876496, region: 'Llanos', gentilicio: 'Portugueseño',
    wiki: 'Estado_Portuguesa',
    resena: 'Portuguesa es conocido como el "granero de Venezuela" por su gran producción de arroz, maíz y otros cereales. Guanare, su capital, es la capital espiritual del país gracias al Santuario Nacional de la Virgen de Coromoto, patrona de Venezuela. El estado une el piedemonte andino con fértiles llanos.',
    clima: 'Tropical cálido (26 °C a 34 °C), con lluvias de abril a noviembre.',
    economia: ['Agricultura (arroz, maíz, sorgo, caña de azúcar)', 'Agroindustria', 'Ganadería', 'Comercio', 'Turismo religioso'],
    atractivos: ['Santuario Nacional de la Virgen de Coromoto', 'Casco histórico de Guanare', 'Araure y Acarigua', 'Parque Nacional Guaramacal (cercano)', 'Ríos del piedemonte'],
    municipios: ['Agua Blanca', 'Araure', 'Esteller', 'Guanare', 'Guanarito', 'Monseñor José Vicente de Unda', 'Ospino', 'Páez', 'Papelón', 'San Genaro de Boconoíto', 'San Rafael de Onoto', 'Santa Rosalía', 'Sucre', 'Turén'],
  },
  {
    slug: 'sucre', name: 'Sucre', iso: 'R', dbNames: ['Sucre'],
    capital: 'Cumaná', lat: 10.4564, lng: -64.1675,
    area: 11800, population: 896291, region: 'Nororiental', gentilicio: 'Sucrense',
    wiki: 'Estado_Sucre',
    resena: 'Sucre se ubica en el nororiente y su capital, Cumaná, es considerada la primera ciudad fundada por europeos en tierra firme sudamericana. El estado es cuna del Mariscal Antonio José de Sucre y del poeta Andrés Eloy Blanco. Sus costas en la península de Paria y Araya ofrecen playas vírgenes y una fuerte tradición pesquera y cacaotera.',
    clima: 'Cálido tropical (26 °C a 33 °C); seco en Araya y la costa oeste, y húmedo y lluvioso en la península de Paria.',
    economia: ['Pesca e industria atunera y sardinera', 'Cacao (Paria)', 'Turismo de playa', 'Salinas de Araya', 'Agricultura (coco, frutas)'],
    atractivos: ['Península de Paria y Playa Medina', 'Castillo de Araya y sus salinas', 'Mochima (compartido con Anzoátegui)', 'Casco histórico de Cumaná', 'Parque Nacional Turuépano'],
    municipios: ['Andrés Eloy Blanco', 'Andrés Mata', 'Arismendi', 'Benítez', 'Bermúdez', 'Bolívar', 'Cajigal', 'Cruz Salmerón Acosta', 'Libertador', 'Mariño', 'Mejía', 'Montes', 'Ribero', 'Sucre', 'Valdez'],
  },
  {
    slug: 'tachira', name: 'Táchira', iso: 'S', dbNames: ['Táchira', 'Tachira'],
    capital: 'San Cristóbal', lat: 7.7669, lng: -72.2250,
    area: 11100, population: 1168908, region: 'Andes', gentilicio: 'Tachirense',
    wiki: 'Estado_Táchira',
    resena: 'Táchira es un estado andino y fronterizo con Colombia, con intensa actividad comercial a través de San Antonio y Ureña. San Cristóbal, la "Ciudad de la Cordialidad", es famosa por su Feria Internacional de San Sebastián. El estado tiene gran tradición agrícola, cafetalera y deportiva.',
    clima: 'De montaña: templado en San Cristóbal (18 °C a 28 °C), frío en los páramos y cálido en las tierras bajas; lluvias de abril a noviembre.',
    economia: ['Comercio fronterizo', 'Agricultura (café, hortalizas, caña)', 'Ganadería y lácteos', 'Industria manufacturera', 'Turismo de montaña'],
    atractivos: ['Feria Internacional de San Sebastián', 'Páramo El Zumbador', 'Parque Nacional El Tamá', 'Capacho y Peribeca', 'San Pedro del Río (pueblo colonial)'],
    municipios: ['Andrés Bello', 'Antonio Rómulo Costa', 'Ayacucho', 'Bolívar', 'Cárdenas', 'Córdoba', 'Fernández Feo', 'Francisco de Miranda', 'García de Hevia', 'Guásimos', 'Independencia', 'Jáuregui', 'José María Vargas', 'Junín', 'Libertad', 'Libertador', 'Lobatera', 'Michelena', 'Panamericano', 'Pedro María Ureña', 'Rafael Urdaneta', 'Samuel Darío Maldonado', 'San Cristóbal', 'San Judas Tadeo', 'Seboruco', 'Simón Rodríguez', 'Sucre', 'Torbes', 'Uribante'],
  },
  {
    slug: 'trujillo', name: 'Trujillo', iso: 'T', dbNames: ['Trujillo'],
    capital: 'Trujillo', lat: 9.3667, lng: -70.4333,
    area: 7400, population: 686367, region: 'Andes', gentilicio: 'Trujillano',
    wiki: 'Estado_Trujillo',
    resena: 'Trujillo es el estado andino más septentrional y combina montañas, valles cafetaleros y costas sobre el lago de Maracaibo. En su capital se firmó el Decreto de Guerra a Muerte (1813) y allí se levanta el Monumento a la Virgen de la Paz, uno de los más altos del continente. Valera es su principal ciudad comercial.',
    clima: 'Templado de montaña en Trujillo, Boconó y Valera (18 °C a 28 °C) y cálido en la zona del lago; lluvias de abril a noviembre.',
    economia: ['Agricultura (café, caña de azúcar, hortalizas)', 'Comercio (Valera)', 'Ganadería', 'Turismo religioso y de montaña', 'Agroindustria'],
    atractivos: ['Monumento a la Virgen de la Paz', 'Boconó, "Jardín de Venezuela"', 'Parque Nacional Guaramacal', 'Isnotú y el santuario del Dr. José Gregorio Hernández', 'Casco histórico de Trujillo'],
    municipios: ['Andrés Bello', 'Boconó', 'Bolívar', 'Candelaria', 'Carache', 'Escuque', 'José Felipe Márquez Cañizales', 'Juan Vicente Campo Elías', 'La Ceiba', 'Miranda', 'Monte Carmelo', 'Motatán', 'Pampán', 'Pampanito', 'Rafael Rangel', 'San Rafael de Carvajal', 'Sucre', 'Trujillo', 'Urdaneta', 'Valera'],
  },
  {
    slug: 'vargas', name: 'La Guaira', iso: 'X', dbNames: ['Vargas', 'La Guaira'],
    capital: 'La Guaira', lat: 10.6010, lng: -66.9330,
    area: 1496, population: 352920, region: 'Capital', gentilicio: 'Guaireño',
    wiki: 'Estado_La_Guaira',
    resena: 'La Guaira (antes estado Vargas) es la franja costera al norte de Caracas, entre el mar Caribe y el Waraira Repano. Allí se encuentran el Aeropuerto Internacional Simón Bolívar de Maiquetía y el puerto de La Guaira, principales puertas de entrada al país. Sus pueblos costeros, como Macuto, Naiguatá y Los Caracas, son destinos de playa cercanos a la capital.',
    clima: 'Cálido y seco (26 °C a 33 °C), con brisa marina y lluvias escasas, más frecuentes entre noviembre y enero.',
    economia: ['Actividad portuaria y aeroportuaria', 'Turismo de playa', 'Pesca artesanal', 'Comercio y servicios', 'Administración pública'],
    atractivos: ['Casco colonial de La Guaira', 'Macuto y su malecón', 'Playas de Naiguatá y Los Caracas', 'Parque Nacional Waraira Repano (vertiente norte)', 'Colonia Tovar (acceso por la costa)'],
    municipios: ['Vargas'],
  },
  {
    slug: 'yaracuy', name: 'Yaracuy', iso: 'U', dbNames: ['Yaracuy'],
    capital: 'San Felipe', lat: 10.3399, lng: -68.7425,
    area: 7100, population: 600852, region: 'Centro-Occidental', gentilicio: 'Yaracuyano',
    wiki: 'Estado_Yaracuy',
    resena: 'Yaracuy es un estado de valles fértiles y montañas en el centro-occidente del país. Es conocido por la montaña de Sorte, centro del culto a María Lionza, y por su producción de caña de azúcar y cítricos. San Felipe, su capital, conserva el parque arqueológico San Felipe El Fuerte.',
    clima: 'Tropical cálido y húmedo en los valles (24 °C a 32 °C), más fresco en las montañas; lluvias de mayo a noviembre.',
    economia: ['Agricultura (caña de azúcar, naranja, maíz)', 'Agroindustria (centrales azucareros)', 'Ganadería', 'Comercio', 'Turismo religioso y de naturaleza'],
    atractivos: ['Montaña de Sorte', 'Parque San Felipe El Fuerte', 'Parque Nacional Yurubí', 'Chivacoa', 'Nirgua'],
    municipios: ['Arístides Bastidas', 'Bolívar', 'Bruzual', 'Cocorote', 'Independencia', 'José Antonio Páez', 'La Trinidad', 'Manuel Monge', 'Nirgua', 'Peña', 'San Felipe', 'Sucre', 'Urachiche', 'Veroes'],
  },
  {
    slug: 'zulia', name: 'Zulia', iso: 'V', dbNames: ['Zulia'],
    capital: 'Maracaibo', lat: 10.6545, lng: -71.6417,
    area: 63100, population: 3704404, region: 'Zuliana', gentilicio: 'Zuliano',
    wiki: 'Estado_Zulia',
    resena: 'Zulia es el estado más poblado de Venezuela y rodea el lago de Maracaibo, el más grande de Sudamérica. Históricamente ha sido el gran centro petrolero del país. Maracaibo, la "Tierra del Sol Amada", es famosa por la gaita zuliana, la Basílica de la Chinita y el puente General Rafael Urdaneta; al sur del lago ocurre el Relámpago del Catatumbo.',
    clima: 'Muy cálido y húmedo (28 °C a 35 °C) en Maracaibo; semiárido en la Guajira y lluvioso al sur del lago.',
    economia: ['Petróleo y gas (lago de Maracaibo, costa oriental)', 'Ganadería y producción láctea (sur del lago)', 'Agricultura (plátano, frutas)', 'Petroquímica (El Tablazo)', 'Comercio y servicios'],
    atractivos: ['Basílica de Nuestra Señora de Chiquinquirá', 'Puente General Rafael Urdaneta', 'Relámpago del Catatumbo', 'Casco histórico y calle Carabobo de Maracaibo', 'Sierra de Perijá'],
    municipios: ['Almirante Padilla', 'Baralt', 'Cabimas', 'Catatumbo', 'Colón', 'Francisco Javier Pulgar', 'Guajira', 'Jesús Enrique Lossada', 'Jesús María Semprún', 'La Cañada de Urdaneta', 'Lagunillas', 'Machiques de Perijá', 'Mara', 'Maracaibo', 'Miranda', 'Rosario de Perijá', 'San Francisco', 'Santa Rita', 'Simón Bolívar', 'Sucre', 'Valmore Rodríguez'],
  },
];

// Numeros y organismos nacionales (validos en todo el pais).
export const EMERGENCIAS_NACIONALES = [
  { name: 'VEN 911 – Emergencias (policía, bomberos, ambulancias)', phone: '911', icon: 'fa-phone-volume' },
  { name: 'Número de emergencias tradicional (aún activo en algunas zonas)', phone: '171', icon: 'fa-phone' },
  { name: 'CICPC – Denuncias', phone: '0800-2427224', display: '0800-CICPC-24', icon: 'fa-user-shield' },
];

// Organismos para tramites (enlaces oficiales; las oficinas locales varian).
export const ORGANISMOS = [
  { name: 'SAREN – Registros y Notarías', desc: 'Registros principales, mercantiles, inmobiliarios y notarías públicas.', url: 'https://www.saren.gob.ve', icon: 'fa-file-signature' },
  { name: 'Registro Civil (CNE)', desc: 'Partidas de nacimiento, matrimonio y defunción.', url: 'https://www.cne.gob.ve', icon: 'fa-id-card' },
  { name: 'INTT – Tránsito Terrestre', desc: 'Licencias de conducir, placas y certificados de circulación.', url: 'https://www.intt.gob.ve', icon: 'fa-car' },
  { name: 'SAIME – Identificación y Extranjería', desc: 'Cédula de identidad y pasaporte.', url: 'https://www.saime.gob.ve', icon: 'fa-passport' },
  { name: 'CICPC – Investigaciones Penales', desc: 'Denuncias y certificados.', url: 'http://www.cicpc.gob.ve', icon: 'fa-user-shield' },
];

export function slugifyState(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ALIASES = {
  'distrito-federal': 'distrito-capital',
  'capital': 'distrito-capital',
  'caracas': 'distrito-capital',
  'la-guaira': 'vargas',
  'margarita': 'nueva-esparta',
};

/** Find a state by slug, name, alias or ISO 3166-2 code ("L" or "VE-L"). */
export function findEstado(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.toUpperCase().replace(/^VE-/, '');
  if (/^[A-Z]$/.test(iso)) {
    const byIso = ESTADOS.find(e => e.iso === iso);
    if (byIso) return byIso;
  }
  let slug = slugifyState(raw).replace(/^estado-/, '');
  slug = ALIASES[slug] || slug;
  return ESTADOS.find(e => e.slug === slug) ||
    ESTADOS.find(e => e.dbNames.some(n => slugifyState(n) === slug)) || null;
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('es-VE');
}
