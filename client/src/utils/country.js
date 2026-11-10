/* RutaIA opera únicamente sobre el territorio de Guatemala. */

export const COUNTRY = {
  name: 'Guatemala',
  adjective: 'guatemalteco',
  currency: 'GTQ',
  locale: 'es-GT',
  timezone: 'America/Guatemala',
  bounds: { north: 17.82, south: 13.74, west: -92.23, east: -88.22 },
};

export const COUNTRIES = [COUNTRY];

/** Departamentos (regiones administrativas) de Guatemala. */
export const REGIONS = [
  'Alta Verapaz',
  'Baja Verapaz',
  'Chimaltenango',
  'Chiquimula',
  'El Progreso',
  'Escuintla',
  'Guatemala',
  'Huehuetenango',
  'Izabal',
  'Jalapa',
  'Jutiapa',
  'Petén',
  'Quetzaltenango',
  'Quiché',
  'Retalhuleu',
  'Sacatepéquez',
  'San Marcos',
  'Santa Rosa',
  'Sololá',
  'Suchitepéquez',
  'Totonicapán',
  'Zacapa',
];

/** Ciudades de origen sugeridas para los agentes (OSRM + geocodificación). */
export const ORIGIN_CITIES = [
  'Guatemala',
  'Quetzaltenango',
  'Cobán',
  'Huehuetenango',
  'Escuintla',
  'Puerto Barrios',
  'Flores',
  'Mazatenango',
  'Antigua Guatemala',
  'Chiquimula',
];

/** Curiosidades usadas en los estados vacíos y el login. */
export const FACTS = [
  'Tikal, en Petén, fue una de las ciudades más grandes del mundo maya clásico.',
  'El lago de Atitlán se formó en la caldera de un volcán y está rodeado por tres volcanes.',
  'Antigua Guatemala conserva su trazado colonial y es Patrimonio de la Humanidad desde 1979.',
  'Semuc Champey, en Alta Verapaz, es una serie de pozas turquesa sobre un río subterráneo.',
  'El volcán de Pacaya es uno de los pocos del mundo donde puedes acercarte a la lava activa.',
];

export function inGuatemala(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  const { north, south, west, east } = COUNTRY.bounds;

  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    la <= north &&
    la >= south &&
    ln >= west &&
    ln <= east
  );
}
