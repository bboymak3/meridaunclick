/**
 * HolaX — Optimizador de imágenes antes de subir a R2
 *
 * Intercepta TODAS las subidas a /api/upload (fetch y XMLHttpRequest) de
 * cualquier página que cargue este script y, antes de enviar, reduce la
 * resolución y el peso de cada imagen:
 *   - Redimensiona según el tipo (product_type) al lado mayor indicado.
 *   - Convierte a WebP (o JPEG si el navegador no codifica WebP; PNG solo
 *     si la imagen tiene transparencia y no hay WebP).
 *   - No toca GIF (pueden ser animados), SVG ni videos.
 *   - Si la imagen ya es liviana y del tamaño correcto, la deja igual.
 * Marca la subida con optimized=1 para que el servidor lo registre en R2.
 *
 * También expone window.HxImage.optimize(file, productType) para usarlo a mano.
 */
(function () {
    'use strict';
    if (window.HxImage) return;

    // Lado mayor máximo (px) por tipo de imagen
    var PROFILES = {
        avatar: 800,
        logo: 800,
        banner: 1920,
        category_banner: 1920,
        popup: 1600,
        marketplace: 1600,
        business: 1600,
        business_image: 1600,
        property: 1600,
        job: 1600,
        wiki: 1600,
        default: 1600
    };
    var QUALITY = 0.82;
    var SKIP_BYTES = 180 * 1024; // imágenes ya livianas y chicas se dejan igual
    var UPLOAD_RE = /\/api\/upload(?:[?#]|$)/;

    var webpSupport = null;
    function canEncodeWebp() {
        if (webpSupport !== null) return webpSupport;
        try {
            var c = document.createElement('canvas');
            c.width = c.height = 2;
            webpSupport = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) { webpSupport = false; }
        return webpSupport;
    }

    function loadImage(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () { resolve({ img: img, url: url }); };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
            img.src = url;
        });
    }

    function hasAlpha(ctx, w, h) {
        try {
            // Muestra una cuadrícula para no recorrer imágenes enormes píxel a píxel
            var data = ctx.getImageData(0, 0, w, h).data;
            var step = Math.max(4, Math.floor(data.length / 4 / 40000) * 4);
            for (var i = 3; i < data.length; i += step) if (data[i] < 250) return true;
        } catch (e) {}
        return false;
    }

    function toBlob(canvas, type, quality) {
        return new Promise(function (resolve) { canvas.toBlob(resolve, type, quality); });
    }

    function baseName(name) {
        return String(name || 'imagen').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'imagen';
    }

    /** Optimiza un File de imagen. Devuelve el File original si no conviene cambiarlo. */
    async function optimize(file, productType) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) return file;
        if (/image\/(gif|svg\+xml)/.test(file.type)) return file;
        var maxSide = PROFILES[productType] || PROFILES.default;
        var loaded;
        try { loaded = await loadImage(file); } catch (e) { return file; }
        var img = loaded.img;
        try {
            var w = img.naturalWidth, h = img.naturalHeight;
            if (!w || !h) return file;
            var scale = Math.min(1, maxSide / Math.max(w, h));
            var alreadyGood = scale === 1 && file.size <= SKIP_BYTES && /image\/(jpeg|webp)/.test(file.type);
            if (alreadyGood) return file;
            var tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = tw; canvas.height = th;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, tw, th);

            var type, ext;
            if (canEncodeWebp()) { type = 'image/webp'; ext = 'webp'; }
            else if (/image\/png/.test(file.type) && hasAlpha(ctx, tw, th)) { type = 'image/png'; ext = 'png'; }
            else {
                type = 'image/jpeg'; ext = 'jpg';
                // JPEG no tiene transparencia: fondo blanco
                var bg = document.createElement('canvas');
                bg.width = tw; bg.height = th;
                var bctx = bg.getContext('2d');
                bctx.fillStyle = '#fff'; bctx.fillRect(0, 0, tw, th);
                bctx.drawImage(canvas, 0, 0);
                canvas = bg;
            }
            var blob = await toBlob(canvas, type, QUALITY);
            if (!blob || !blob.size) return file;
            // Si no se ganó nada (y no hubo que achicar), mantener el original
            if (blob.size >= file.size && scale === 1) return file;
            return new File([blob], baseName(file.name) + '.' + ext, { type: blob.type || type, lastModified: Date.now() });
        } finally {
            URL.revokeObjectURL(loaded.url);
        }
    }

    /** Devuelve un FormData nuevo con las imágenes optimizadas. */
    async function optimizeFormData(fd) {
        var productType = fd.get('product_type') || 'default';
        var out = new FormData();
        var changed = false;
        var entries = [];
        fd.forEach(function (value, key) { entries.push([key, value]); });
        for (var i = 0; i < entries.length; i++) {
            var key = entries[i][0], value = entries[i][1];
            if (value instanceof File && value.type && value.type.indexOf('image/') === 0) {
                var opt = value;
                try { opt = await optimize(value, productType); } catch (e) { opt = value; }
                if (opt !== value) changed = true;
                out.append(key, opt, opt.name);
            } else if (value instanceof File) {
                out.append(key, value, value.name);
            } else {
                out.append(key, value);
            }
        }
        if (!out.has('optimized')) out.append('optimized', '1');
        return { formData: out, changed: changed };
    }

    function isUploadUrl(url) {
        try { return UPLOAD_RE.test(new URL(String(url), location.href).pathname); } catch (e) { return false; }
    }

    // ── fetch ──
    var origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function (input, init) {
            var url = typeof input === 'string' || input instanceof URL ? input : (input && input.url);
            if (init && init.body instanceof FormData && isUploadUrl(url)) {
                var self = this;
                return optimizeFormData(init.body).then(function (res) {
                    var next = Object.assign({}, init, { body: res.formData });
                    return origFetch.call(self, input, next);
                }, function () { return origFetch.call(self, input, init); });
            }
            return origFetch.apply(this, arguments);
        };
    }

    // ── XMLHttpRequest ──
    var XHR = window.XMLHttpRequest;
    if (XHR && XHR.prototype) {
        var origOpen = XHR.prototype.open;
        var origSend = XHR.prototype.send;
        XHR.prototype.open = function (method, url) {
            this.__hxUpload = isUploadUrl(url);
            return origOpen.apply(this, arguments);
        };
        XHR.prototype.send = function (body) {
            if (this.__hxUpload && body instanceof FormData) {
                var xhr = this;
                optimizeFormData(body).then(function (res) { origSend.call(xhr, res.formData); },
                    function () { origSend.call(xhr, body); });
                return;
            }
            return origSend.apply(this, arguments);
        };
    }

    window.HxImage = { optimize: optimize, optimizeFormData: optimizeFormData, profiles: PROFILES, canEncodeWebp: canEncodeWebp };
})();
