/**
 * AunClick Academy - Certificado de Partner Digital (PDF)
 *
 * Compartido por academia.html (descarga del agente) y perfil.html (perfil
 * público con vista previa en modal). Genera el PDF en el navegador con jsPDF
 * y lo muestra con pdf.js (funciona también en móviles, donde los PDF dentro
 * de un iframe no se ven).
 *
 * Uso:
 *   const info = AcademyCertificate.info({ name, userId, issuedAt });
 *   await AcademyCertificate.download(info);
 *   await AcademyCertificate.preview(info, canvasContainer);
 */
(function () {
    'use strict';

    const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const LOGO_URL = '/images/favicon.jpeg';

    const scripts = {};
    function loadScript(src, ready) {
        if (ready()) return Promise.resolve();
        if (scripts[src]) return scripts[src];
        scripts[src] = new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = src;
            s.onload = function () { ready() ? resolve() : reject(new Error('No se pudo cargar ' + src)); };
            s.onerror = function () { delete scripts[src]; reject(new Error('No se pudo cargar el generador del certificado. Revisa tu conexión.')); };
            document.head.appendChild(s);
        });
        return scripts[src];
    }

    function loadJsPdf() {
        return loadScript(JSPDF_URL, function () { return !!(window.jspdf && window.jspdf.jsPDF); })
            .then(function () { return window.jspdf.jsPDF; });
    }

    function loadPdfJs() {
        return loadScript(PDFJS_URL, function () { return !!window.pdfjsLib; })
            .then(function () {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
                return window.pdfjsLib;
            });
    }

    let logoPromise = null;
    function loadLogo() {
        if (logoPromise) return logoPromise;
        logoPromise = new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth; c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    resolve(c.toDataURL('image/jpeg', 0.92));
                } catch (e) { resolve(null); }
            };
            img.onerror = function () { resolve(null); };
            img.src = LOGO_URL;
        });
        return logoPromise;
    }

    /** Datos del certificado. issuedAt: fecha del servidor ("YYYY-MM-DD HH:MM:SS", UTC). */
    function info(opts) {
        const raw = String((opts && opts.issuedAt) || '').trim();
        let date = raw ? new Date(raw.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? '' : 'Z')) : new Date();
        if (isNaN(date.getTime())) date = new Date();
        const id = String((opts && opts.userId) || '0');
        const year = /^\d{4}/.test(raw) ? raw.slice(0, 4) : String(date.getUTCFullYear());
        let dateText;
        try {
            dateText = date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Caracas' });
        } catch (e) {
            dateText = date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return {
            name: String((opts && opts.name) || 'Agente AunClick').trim() || 'Agente AunClick',
            userId: id,
            date: date,
            dateText: dateText,
            code: 'AC-' + year + '-' + id.padStart(5, '0'),
            verifyUrl: window.location.origin + '/perfil.html?id=' + encodeURIComponent(id),
        };
    }

    async function build(inf) {
        const [JsPDF, logo] = await Promise.all([loadJsPdf(), loadLogo()]);
        const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const W = 297, H = 210, cx = W / 2;
        const PURPLE = [124, 58, 237], DARK = [31, 41, 55], GRAY = [107, 114, 128], GOLD = [217, 119, 6];
        const color = function (fn, c) { doc[fn](c[0], c[1], c[2]); };

        // Marco
        doc.setFillColor(250, 248, 255); doc.rect(0, 0, W, H, 'F');
        color('setDrawColor', PURPLE); doc.setLineWidth(3); doc.rect(8, 8, W - 16, H - 16);
        color('setDrawColor', GOLD); doc.setLineWidth(0.6); doc.rect(13, 13, W - 26, H - 26);

        // Encabezado
        let y = 24;
        if (logo) { try { doc.addImage(logo, 'JPEG', cx - 10, y, 20, 20); y += 26; } catch (e) { y += 4; } } else { y += 4; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); color('setTextColor', PURPLE);
        doc.text('AUNCLICK ACADEMY', cx, y, { align: 'center' });
        y += 16;
        doc.setFontSize(36); color('setTextColor', DARK);
        doc.text('CERTIFICADO', cx, y, { align: 'center' });
        y += 9;
        doc.setFontSize(13); color('setTextColor', GOLD);
        doc.text('PARTNER DIGITAL CERTIFICADO', cx, y, { align: 'center' });

        // Nombre
        y += 15;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12); color('setTextColor', GRAY);
        doc.text('Se otorga el presente certificado a', cx, y, { align: 'center' });
        y += 15;
        doc.setFont('helvetica', 'bold'); color('setTextColor', DARK);
        let size = 30; doc.setFontSize(size);
        while (doc.getTextWidth(inf.name) > 220 && size > 16) { size -= 2; doc.setFontSize(size); }
        doc.text(inf.name, cx, y, { align: 'center' });
        color('setDrawColor', PURPLE); doc.setLineWidth(0.5); doc.line(cx - 75, y + 4, cx + 75, y + 4);

        // Texto
        y += 14;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12); color('setTextColor', GRAY);
        const body = 'por haber completado satisfactoriamente la ruta de formación de la Academia de Agentes AunClick y aprobado su evaluación final, acreditándose como Partner Digital Certificado.';
        doc.text(doc.splitTextToSize(body, 200), cx, y, { align: 'center' });

        // Pie: fecha, firma, código
        const fy = H - 40;
        color('setDrawColor', GRAY); doc.setLineWidth(0.3);
        doc.line(35, fy, 95, fy); doc.line(cx - 30, fy, cx + 30, fy); doc.line(W - 95, fy, W - 35, fy);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); color('setTextColor', DARK);
        doc.text(inf.dateText, 65, fy - 3, { align: 'center' });
        doc.text('AunClick Academy', cx, fy - 3, { align: 'center' });
        doc.text(inf.code, W - 65, fy - 3, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); color('setTextColor', GRAY);
        doc.text('Fecha de emisión', 65, fy + 5, { align: 'center' });
        doc.text('Dirección académica', cx, fy + 5, { align: 'center' });
        doc.text('Código del certificado', W - 65, fy + 5, { align: 'center' });

        doc.setFontSize(8.5);
        doc.text('Verifica este certificado en: ' + inf.verifyUrl, cx, H - 19, { align: 'center' });

        doc.setProperties({ title: 'Certificado AunClick Academy - ' + inf.name, subject: 'Partner Digital Certificado', author: 'AunClick Academy' });
        return doc;
    }

    function fileName(inf) {
        return 'Certificado-AunClick-' + inf.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
    }

    async function download(inf) {
        const doc = await build(inf);
        doc.save(fileName(inf));
    }

    /** Muestra la página del PDF dentro de `container` (canvas con pdf.js; si falla, iframe). */
    async function preview(inf, container) {
        const doc = await build(inf);
        const bytes = doc.output('arraybuffer');
        try {
            const pdfjs = await loadPdfJs();
            const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
            const page = await pdf.getPage(1);
            const base = page.getViewport({ scale: 1 });
            const width = Math.max(280, container.clientWidth || 600);
            const ratio = window.devicePixelRatio || 1;
            const vp = page.getViewport({ scale: (width / base.width) * ratio });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.display = 'block';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Certificado de ' + inf.name);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            container.innerHTML = '';
            container.appendChild(canvas);
        } catch (e) {
            const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            container.innerHTML = '<iframe title="Certificado" src="' + url + '" style="width:100%;aspect-ratio:297/210;border:0"></iframe>';
        }
        return doc;
    }

    window.AcademyCertificate = { info: info, build: build, download: download, preview: preview, fileName: fileName };
})();
