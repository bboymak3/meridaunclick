// functions/medicos/index.js
// GET /medicos — indice de medicos por especialidad (ver functions/_lib/medicos.js)

import { renderMedicosIndex } from '../_lib/medicos.js';

export async function onRequestGet({ env }) {
  return renderMedicosIndex(env);
}
