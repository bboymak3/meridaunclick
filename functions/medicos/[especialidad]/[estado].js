// functions/medicos/[especialidad]/[estado].js
// GET /medicos/:especialidad/:estado — p. ej. /medicos/cardiologia/merida

import { renderEspecialidad } from '../../_lib/medicos.js';

export async function onRequestGet({ env, params }) {
  return renderEspecialidad(env, params.especialidad, params.estado);
}
