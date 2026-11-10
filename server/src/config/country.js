/**
 * RutaIA opera únicamente sobre Guatemala: este módulo centraliza el alcance
 * geográfico para validar coordenadas y construir prompts.
 */
export const COUNTRY_NAME = 'Guatemala';
export const CURRENCY_CODE = 'GTQ';
export const CURRENCY_LABEL = 'quetzales (GTQ)';

export const BOUNDS = {
  north: 17.82,
  south: 13.74,
  west: -92.23,
  east: -88.22,
};

export function isInsideCountry(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  return (
    latitude <= BOUNDS.north &&
    latitude >= BOUNDS.south &&
    longitude >= BOUNDS.west &&
    longitude <= BOUNDS.east
  );
}

/** Regla de alcance incluida en todos los prompts de IA. */
export const SCOPE_RULE =
  'Alcance geográfico: solo Guatemala. Si el usuario pregunta por otro país, ' +
  'aclara amablemente que RutaIA cubre únicamente destinos de Guatemala y ' +
  'ofrece alternativas equivalentes dentro del país. Los precios se expresan ' +
  'en quetzales guatemaltecos (GTQ).';
