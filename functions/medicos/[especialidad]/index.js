// functions/medicos/[especialidad]/index.js
// GET /medicos/:especialidad — p. ej. /medicos/cardiologia

import { renderEspecialidad } from '../../_lib/medicos.js';

export async function onRequestGet({ env, params }) {
  return renderEspecialidad(env, params.especialidad, null);
}
