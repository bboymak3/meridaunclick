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
    { slug: 'medicina-general', name: 'Medicina General', plural: 'médicos generales', match: ['medicina general', 'medico general', 'medicina familiar', 'medico familiar', 'medico de familia'] },
    { slug: 'medicina-interna', name: 'Medicina Interna', plural: 'internistas', match: ['medicina interna', 'internista'] },
    { slug: 'cardiologia', name: 'Cardiología', plural: 'cardiólogos', match: ['cardio'] },
    { slug: 'pediatria', name: 'Pediatría', plural: 'pediatras', match: ['pediatr', 'neonatolog'] },
    { slug: 'ginecologia-obstetricia', name: 'Ginecología y Obstetricia', plural: 'ginecólogos', match: ['ginecolog', 'obstetr'] },
    { slug: 'dermatologia', name: 'Dermatología', plural: 'dermatólogos', match: ['dermatolog'] },
    { slug: 'traumatologia', name: 'Traumatología y Ortopedia', plural: 'traumatólogos', match: ['traumatolog', 'ortoped'] },
    { slug: 'odontologia', name: 'Odontología', plural: 'odontólogos', match: ['odontolog', 'dentist', 'ortodonc', 'endodonc', 'periodonc', 'dental'] },
    { slug: 'oftalmologia', name: 'Oftalmología', plural: 'oftalmólogos', match: ['oftalmolog'] },
    { slug: 'otorrinolaringologia', name: 'Otorrinolaringología', plural: 'otorrinos', match: ['otorrino'] },
    { slug: 'neurologia', name: 'Neurología', plural: 'neurólogos', match: ['neurolog'] },
    { slug: 'neurocirugia', name: 'Neurocirugía', plural: 'neurocirujanos', match: ['neurocirug', 'neurocirujan'] },
    { slug: 'psiquiatria', name: 'Psiquiatría', plural: 'psiquiatras', match: ['psiquiatr'] },
    { slug: 'psicologia', name: 'Psicología', plural: 'psicólogos', match: ['psicolog'] },
    { slug: 'nutricion', name: 'Nutrición y Dietética', plural: 'nutricionistas', match: ['nutricio', 'nutriolog', 'dietet'] },
    { slug: 'endocrinologia', name: 'Endocrinología', plural: 'endocrinólogos', match: ['endocrin'] },
    { slug: 'gastroenterologia', name: 'Gastroenterología', plural: 'gastroenterólogos', match: ['gastroenter', 'gastroent'] },
    { slug: 'urologia', name: 'Urología', plural: 'urólogos', match: ['urolog'] },
    { slug: 'nefrologia', name: 'Nefrología', plural: 'nefrólogos', match: ['nefrolog'] },
    { slug: 'neumonologia', name: 'Neumonología', plural: 'neumonólogos', match: ['neumolog', 'neumonolog', 'neumolo'] },
    { slug: 'oncologia', name: 'Oncología', plural: 'oncólogos', match: ['oncolog'] },
    { slug: 'reumatologia', name: 'Reumatología', plural: 'reumatólogos', match: ['reumatolog'] },
    { slug: 'hematologia', name: 'Hematología', plural: 'hematólogos', match: ['hematolog'] },
    { slug: 'alergologia', name: 'Alergología e Inmunología', plural: 'alergólogos', match: ['alergolog', 'alergia', 'inmunolog'] },
    { slug: 'infectologia', name: 'Infectología', plural: 'infectólogos', match: ['infectolog'] },
    { slug: 'geriatria', name: 'Geriatría', plural: 'geriatras', match: ['geriatr'] },
    { slug: 'cirugia-general', name: 'Cirugía General', plural: 'cirujanos generales', match: ['cirugia general', 'cirujano general'] },
    { slug: 'cirugia-plastica', name: 'Cirugía Plástica', plural: 'cirujanos plásticos', match: ['cirugia plastica', 'cirujano plastico', 'plastica y reconstructiva'] },
    { slug: 'medicina-estetica', name: 'Medicina Estética', plural: 'médicos estéticos', match: ['medicina estetica', 'medico estetico'] },
    { slug: 'anestesiologia', name: 'Anestesiología', plural: 'anestesiólogos', match: ['anestesi'] },
    { slug: 'fisioterapia', name: 'Fisioterapia y Rehabilitación', plural: 'fisioterapeutas', match: ['fisioterap', 'fisiatr', 'rehabilitac', 'terapia fisica'] },
    { slug: 'radiologia', name: 'Radiología e Imagenología', plural: 'radiólogos', match: ['radiolog', 'imagenolog', 'ecograf', 'ultrasonid'] },
    { slug: 'laboratorio-clinico', name: 'Laboratorio Clínico', plural: 'laboratorios clínicos', match: ['laboratorio', 'bioanalis'] },
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
