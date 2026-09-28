/**
 * AunClick Academy - Certificado de Partner Digital (PDF)
 *
 * Compartido por academia.html (descarga del agente), perfil.html (perfil
 * público con vista previa en modal) y el panel admin.
 *
 * Usa como plantilla el certificado oficial ya diseñado y firmado
 * (/partnerdigimon.pdf: diseño HolaX con las firmas del CEO y del Director)
 * y escribe encima, con pdf-lib, el nombre del Partner, la fecha y el código
 * en el espacio en blanco bajo "OTORGA CERTIFICADO A:". La plantilla no se
 * modifica. Si no se pudiera cargar, genera un certificado de respaldo con
 * jsPDF. La vista previa se dibuja con pdf.js (en móviles los PDF dentro de un
 * iframe no se ven).
 *
 * Uso:
 *   const info = AcademyCertificate.info({ name, userId, issuedAt });
 *   await AcademyCertificate.download(info);
 *   await AcademyCertificate.preview(info, canvasContainer);
 */
(function () {
    'use strict';

    // Plantilla oficial (A4 horizontal, 841.92 x 595.2 pt)
    const TEMPLATE_URL = '/partnerdigimon.pdf';
    const PDFLIB_URLS = [
        'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
        'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    ];
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

    // Prueba cada CDN en orden hasta que uno cargue
    function loadFirst(urls, ready) {
        let chain = Promise.reject(new Error('sin CDN'));
        urls.forEach(function (u) { chain = chain.catch(function () { return loadScript(u, ready); }); });
        return chain;
    }

    function loadPdfLib() {
        return loadFirst(PDFLIB_URLS, function () { return !!(window.PDFLib && window.PDFLib.PDFDocument); })
            .then(function () { return window.PDFLib; });
    }

    let templatePromise = null;
    function loadTemplate() {
        if (!templatePromise) {
            templatePromise = fetch(TEMPLATE_URL).then(function (r) {
                if (!r.ok) throw new Error('Plantilla no disponible');
                return r.arrayBuffer();
            }).catch(function (e) { templatePromise = null; throw e; });
        }
        return templatePromise;
    }

    /** Certificado oficial: plantilla firmada + nombre, fecha y código. */
    async function buildFromTemplate(inf) {
        const [PDFLib, tpl] = await Promise.all([loadPdfLib(), loadTemplate()]);
        const doc = await PDFLib.PDFDocument.load(tpl);
        const page = doc.getPage(0);
        const H = page.getSize().height;
        const top = function (y) { return H - y; };
        const fName = await doc.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic);
        const fReg = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fBold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const NAVY = PDFLib.rgb(0.05, 0.18, 0.36), GOLD = PDFLib.rgb(0.72, 0.53, 0.13), GRAY = PDFLib.rgb(0.35, 0.38, 0.45);
        // Columna izquierda en blanco, bajo "OTORGA CERTIFICADO A:" (la derecha tiene el texto y las firmas)
        const cx = 283, maxW = 470;
        const centered = function (text, y, size, font, color) {
            page.drawText(text, { x: cx - font.widthOfTextAtSize(text, size) / 2, y: top(y), size: size, font: font, color: color });
        };
        let size = 36;
        while (fName.widthOfTextAtSize(inf.name, size) > maxW && size > 16) size -= 1;
        centered(inf.name, 392, size, fName, NAVY);
        page.drawLine({ start: { x: cx - 215, y: top(402) }, end: { x: cx + 215, y: top(402) }, thickness: 1.2, color: GOLD });
        centered('Otorgado el ' + inf.dateText, 424, 11, fReg, GRAY);
        centered('Código: ' + inf.code, 442, 11, fBold, NAVY);
        const url = 'Verifica este certificado en: ' + inf.verifyUrl;
        let urlSize = 7.5;
        while (fReg.widthOfTextAtSize(url, urlSize) > 500 && urlSize > 5) urlSize -= 0.5;
        centered(url, 548, urlSize, fReg, GRAY);
        doc.setTitle('Certificado Partner Digital - ' + inf.name);
        doc.setSubject('Partner Digital Certificado');
        doc.setAuthor('AunClick Academy');
        return await doc.save();
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

    /** Respaldo (si la plantilla no carga): certificado dibujado con jsPDF. */
    async function buildFallback(inf) {
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
        return new Uint8Array(doc.output('arraybuffer'));
    }

    /** Bytes del PDF: plantilla oficial; si falla, el respaldo. */
    async function build(inf) {
        try {
            return await buildFromTemplate(inf);
        } catch (e) {
            console.warn('Certificado: usando respaldo (' + (e && e.message) + ')');
            return await buildFallback(inf);
        }
    }

    function fileName(inf) {
        return 'Certificado-AunClick-' + inf.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
    }

    async function download(inf) {
        const bytes = await build(inf);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName(inf);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }

    /** Muestra la página del PDF dentro de `container` (canvas con pdf.js; si falla, iframe). */
    async function preview(inf, container) {
        const bytes = await build(inf);
        try {
            const pdfjs = await loadPdfJs();
            // pdf.js se queda con el buffer: se le pasa una copia
            const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
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
        return bytes;
    }

    window.AcademyCertificate = { info: info, build: build, download: download, preview: preview, fileName: fileName };
})();
