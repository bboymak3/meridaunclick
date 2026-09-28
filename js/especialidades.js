/**
 * HolaX - Catalogo de especialidades medicas
 *
 * Compartido por el navegador (<script type="module">, llena los <datalist>
 * de los formularios) y por las Pages Functions (/medicos/...).
 *
 * El campo businesses.especialidad es texto libre; matchEspecialidades()
 * lo normaliza contra este catalogo usando sinonimos/raices sin acentos,
 * asi "cardiologo", "Cardiología" o "cardio" apuntan a la misma pagina.
 */

export const ESPECIALIDADES = [
    { slug: 'medicina-general', name: 'Medicina General', plural: 'médicos generales', desc: 'Diagnóstico preventivo, chequeos de rutina y control de enfermedades comunes.', match: ['medicina general', 'medico general', 'medicina familiar', 'medico familiar', 'medico de familia'] },
    { slug: 'medicina-interna', name: 'Medicina Interna', plural: 'internistas', desc: 'Diagnóstico integral y control de enfermedades crónicas en adultos.', match: ['medicina interna', 'internista'] },
    { slug: 'cardiologia', name: 'Cardiología', plural: 'cardiólogos', desc: 'Evaluaciones cardiovasculares, electrocardiogramas y control de hipertensión.', match: ['cardio'] },
    { slug: 'pediatria', name: 'Pediatría', plural: 'pediatras', desc: 'Cuidado integral de la salud y el desarrollo de bebés, niños y adolescentes.', match: ['pediatr', 'neonatolog'] },
    { slug: 'ginecologia-obstetricia', name: 'Ginecología y Obstetricia', plural: 'ginecólogos', desc: 'Salud femenina, control prenatal, ecografías y planificación familiar.', match: ['ginecolog', 'obstetr'] },
    { slug: 'dermatologia', name: 'Dermatología', plural: 'dermatólogos', desc: 'Salud de la piel, el cabello y las uñas; acné, manchas y lunares.', match: ['dermatolog'] },
    { slug: 'traumatologia', name: 'Traumatología y Ortopedia', plural: 'traumatólogos', desc: 'Lesiones deportivas, fracturas, dolores articulares y rehabilitación.', match: ['traumatolog', 'ortoped'] },
    { slug: 'odontologia', name: 'Odontología', plural: 'odontólogos', desc: 'Salud bucal, ortodoncia, profilaxis y cirugías dentales.', match: ['odontolog', 'dentist', 'ortodonc', 'endodonc', 'periodonc', 'dental'] },
    { slug: 'oftalmologia', name: 'Oftalmología', plural: 'oftalmólogos', desc: 'Evaluación de la vista, lentes, cataratas y enfermedades de los ojos.', match: ['oftalmolog'] },
    { slug: 'otorrinolaringologia', name: 'Otorrinolaringología', plural: 'otorrinos', desc: 'Oído, nariz y garganta: sinusitis, audición y amígdalas.', match: ['otorrino'] },
    { slug: 'neurologia', name: 'Neurología', plural: 'neurólogos', desc: 'Dolores de cabeza, epilepsia, mareos y enfermedades del sistema nervioso.', match: ['neurolog'] },
    { slug: 'neurocirugia', name: 'Neurocirugía', plural: 'neurocirujanos', desc: 'Cirugía de columna, cerebro y nervios periféricos.', match: ['neurocirug', 'neurocirujan'] },
    { slug: 'psiquiatria', name: 'Psiquiatría', plural: 'psiquiatras', desc: 'Diagnóstico y tratamiento de la salud mental.', match: ['psiquiatr'] },
    { slug: 'psicologia', name: 'Psicología', plural: 'psicólogos', desc: 'Terapia individual, de pareja y familiar; ansiedad y estrés.', match: ['psicolog'] },
    { slug: 'nutricion', name: 'Nutrición y Dietética', plural: 'nutricionistas', desc: 'Planes de alimentación, control de peso y nutrición clínica.', match: ['nutricio', 'nutriolog', 'dietet'] },
    { slug: 'endocrinologia', name: 'Endocrinología', plural: 'endocrinólogos', desc: 'Diabetes, tiroides, hormonas y metabolismo.', match: ['endocrin'] },
    { slug: 'gastroenterologia', name: 'Gastroenterología', plural: 'gastroenterólogos', desc: 'Estómago, intestino e hígado; endoscopias y digestión.', match: ['gastroenter', 'gastroent'] },
    { slug: 'urologia', name: 'Urología', plural: 'urólogos', desc: 'Salud del sistema urinario y de la próstata.', match: ['urolog'] },
    { slug: 'nefrologia', name: 'Nefrología', plural: 'nefrólogos', desc: 'Salud de los riñones, hipertensión y diálisis.', match: ['nefrolog'] },
    { slug: 'neumonologia', name: 'Neumonología', plural: 'neumonólogos', desc: 'Asma, bronquitis, alergias respiratorias y salud pulmonar.', match: ['neumolog', 'neumonolog', 'neumolo'] },
    { slug: 'oncologia', name: 'Oncología', plural: 'oncólogos', desc: 'Diagnóstico y tratamiento del cáncer.', match: ['oncolog'] },
    { slug: 'reumatologia', name: 'Reumatología', plural: 'reumatólogos', desc: 'Artritis, lupus, dolores articulares y enfermedades autoinmunes.', match: ['reumatolog'] },
    { slug: 'hematologia', name: 'Hematología', plural: 'hematólogos', desc: 'Anemias, coagulación y enfermedades de la sangre.', match: ['hematolog'] },
    { slug: 'alergologia', name: 'Alergología e Inmunología', plural: 'alergólogos', desc: 'Alergias, asma, pruebas de alergia e inmunología.', match: ['alergolog', 'alergia', 'inmunolog'] },
    { slug: 'infectologia', name: 'Infectología', plural: 'infectólogos', desc: 'Infecciones, vacunas y enfermedades tropicales.', match: ['infectolog'] },
    { slug: 'geriatria', name: 'Geriatría', plural: 'geriatras', desc: 'Atención integral de la salud del adulto mayor.', match: ['geriatr'] },
    { slug: 'cirugia-general', name: 'Cirugía General', plural: 'cirujanos generales', desc: 'Cirugías de vesícula, hernias, apéndice y procedimientos generales.', match: ['cirugia general', 'cirujano general'] },
    { slug: 'cirugia-plastica', name: 'Cirugía Plástica', plural: 'cirujanos plásticos', desc: 'Cirugía estética y reconstructiva.', match: ['cirugia plastica', 'cirujano plastico', 'plastica y reconstructiva'] },
    { slug: 'medicina-estetica', name: 'Medicina Estética', plural: 'médicos estéticos', desc: 'Tratamientos faciales y corporales no quirúrgicos.', match: ['medicina estetica', 'medico estetico'] },
    { slug: 'anestesiologia', name: 'Anestesiología', plural: 'anestesiólogos', desc: 'Anestesia y manejo del dolor en procedimientos.', match: ['anestesi'] },
    { slug: 'fisioterapia', name: 'Fisioterapia y Rehabilitación', plural: 'fisioterapeutas', desc: 'Rehabilitación física, terapia de lesiones y dolor muscular.', match: ['fisioterap', 'fisiatr', 'rehabilitac', 'terapia fisica'] },
    { slug: 'radiologia', name: 'Radiología e Imagenología', plural: 'radiólogos', desc: 'Rayos X, ecografías, tomografías y resonancias.', match: ['radiolog', 'imagenolog', 'ecograf', 'ultrasonid'] },
    { slug: 'laboratorio-clinico', name: 'Laboratorio Clínico', plural: 'laboratorios clínicos', desc: 'Exámenes de sangre, orina y pruebas de diagnóstico.', match: ['laboratorio', 'bioanalis'] },
];

export function normalizeText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** All catalog specialties mentioned in a free-text especialidad value. */
export function matchEspecialidades(text) {
    const t = normalizeText(text);
    if (!t) return [];
    return ESPECIALIDADES.filter(e => e.match.some(m => t.includes(m)));
}

export function findEspecialidad(slug) {
    return ESPECIALIDADES.find(e => e.slug === slug) || null;
}

// ─── Browser: fill <datalist id="especialidadesList"> for the form inputs ───
function fillDatalists() {
    let list = document.getElementById('especialidadesList');
    if (!list) {
        list = document.createElement('datalist');
        list.id = 'especialidadesList';
        document.body.appendChild(list);
    }
    list.innerHTML = ESPECIALIDADES.map(e => '<option value="' + e.name + '"></option>').join('');
    ['propEspecialidad', 'editBizEspecialidad', 'ebEspecialidad', 'sEspecialidad'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.setAttribute('list', 'especialidadesList');
    });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.HolaxEspecialidades = { list: ESPECIALIDADES, match: matchEspecialidades };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillDatalists);
    else fillDatalists();
    // Inputs rendered later (e.g. admin edit form) get the list on focus
    document.addEventListener('focusin', (ev) => {
        const el = ev.target;
        if (el && /Especialidad$/.test(el.id || '') && !el.getAttribute('list')) el.setAttribute('list', 'especialidadesList');
    });
}
