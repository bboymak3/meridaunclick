/**
 * HolaX - Dynamic Category & Tipo de Negocio Loader
 * Replaces hardcoded dropdowns with dynamic DB-loaded data.
 * Supports cascading: tipo → categoria with SEO slug preview.
 *
 * Usage:
 *   window.loadAllDynamicCategories()  — auto-detect and populate all selects
 *   window.loadDynamicCategories('#selectId')  — populate specific select
 *   window.invalidateCategoryCache()  — force refetch
 */

(function () {
    'use strict';

    var _cachedTipos = null;   // Full tipos+categories tree
    var _cachedFlat = null;    // Flat category list (for non-cascading pages)

    // Selects that use cascading tipo→categoria (new-business form)
    var CASCADING_TIPO_IDS = ['propTipoNegocio'];
    var CASCADING_CAT_IDS  = ['propCategoria'];

    // Selects that use flat category list (search, dashboard, etc.)
    var FLAT_SELECT_IDS = [
        'searchCategoria',
        'sCategoria',
        'mapTipo',
        'editBizCat'
    ];

    // Slug preview element
    var SLUG_PREVIEW_ID = 'slugPreviewText';
    var TITLE_INPUT_ID = 'propTitle';

    /**
     * Fetch tipos with their categories from API (cached).
     */
    async function fetchTipos() {
        if (_cachedTipos) return _cachedTipos;
        try {
            var resp = await fetch('/api/tipos-negocio?include_categories=1');
            var data = await resp.json();
            _cachedTipos = (data.tipos || []);
            return _cachedTipos;
        } catch (e) {
            console.warn('Failed to load tipos de negocio:', e);
            return [];
        }
    }

    /**
     * Fetch flat category list (for search/filter pages).
     */
    async function fetchFlatCategories() {
        if (_cachedFlat) return _cachedFlat;
        try {
            var resp = await fetch('/api/categories');
            var data = await resp.json();
            _cachedFlat = (data.categories || []);
            return _cachedFlat;
        } catch (e) {
            console.warn('Failed to load categories:', e);
            return [];
        }
    }

    /**
     * Populate a tipo <select> with loaded tipos.
     */
    function populateTipoSelect(el, tipos) {
        var firstOption = el.querySelector('option:first-child');
        var firstHtml = firstOption ? firstOption.outerHTML : '<option value="">Selecciona un tipo de negocio</option>';
        el.innerHTML = firstHtml;

        tipos.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t.slug;
            opt.textContent = t.name;
            opt.setAttribute('data-tipo-id', t.id);
            el.appendChild(opt);
        });
    }

    /**
     * Populate a category <select> filtered by selected tipo.
     */
    function populateCategorySelect(el, categories, opts) {
        opts = opts || {};
        var firstHtml = '<option value="">Selecciona una categoria</option>';
        el.innerHTML = firstHtml;

        categories.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c.slug;
            opt.textContent = c.name;
            if (opts.currentValue && c.slug === opts.currentValue) opt.selected = true;
            el.appendChild(opt);
        });

        // Add "Otro" and suggest option for form selects
        if (opts.isFormSelect) {
            var otroOpt = document.createElement('option');
            otroOpt.value = 'otro';
            otroOpt.textContent = 'Otro';
            if ('otro' === opts.currentValue) otroOpt.selected = true;
            el.appendChild(otroOpt);

            var suggestOpt = document.createElement('option');
            suggestOpt.value = '__suggest__';
            suggestOpt.textContent = '+ Agregar nueva categoria';
            suggestOpt.style.color = '#006EE3';
            suggestOpt.style.fontWeight = '600';
            el.appendChild(suggestOpt);
        }
    }

    /**
     * Populate flat category selects (search, map, dashboard).
     */
    async function loadFlatSelects() {
        var cats = await fetchFlatCategories();

        FLAT_SELECT_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;

            var isFormSelect = (id === 'editBizCat');
            var firstOption = el.querySelector('option:first-child');
            var firstHtml = firstOption ? firstOption.outerHTML : '<option value="">Todas las categorias</option>';
            var currentValue = el.value;

            el.innerHTML = firstHtml;

            cats.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.slug;
                opt.textContent = c.name;
                if (c.slug === currentValue) opt.selected = true;
                el.appendChild(opt);
            });

            if (isFormSelect) {
                var otroOpt = document.createElement('option');
                otroOpt.value = 'otro';
                otroOpt.textContent = 'Otro';
                el.appendChild(otroOpt);

                var suggestOpt = document.createElement('option');
                suggestOpt.value = '__suggest__';
                suggestOpt.textContent = '+ Agregar nueva categoria';
                suggestOpt.style.color = '#006EE3';
                suggestOpt.style.fontWeight = '600';
                el.appendChild(suggestOpt);
            }
        });
    }

    /**
     * Setup cascading tipo→categoria selects (new-business form).
     */
    async function loadCascadingSelects() {
        var tipos = await fetchTipos();

        CASCADING_TIPO_IDS.forEach(function (tipoId) {
            var tipoEl = document.getElementById(tipoId);
            if (!tipoEl) return;

            populateTipoSelect(tipoEl, tipos);

            // When tipo changes, filter categories
            tipoEl.addEventListener('change', function () {
                var selectedSlug = this.value;
                var selectedTipo = tipos.find(function (t) { return t.slug === selectedSlug; });
                var cats = (selectedTipo && selectedTipo.categories) ? selectedTipo.categories : [];

                CASCADING_CAT_IDS.forEach(function (catId) {
                    var catEl = document.getElementById(catId);
                    if (catEl) {
                        populateCategorySelect(catEl, cats, { isFormSelect: true });
                    }
                });

                updateSlugPreview();
            });
        });

        // Also listen to category change for slug preview
        CASCADING_CAT_IDS.forEach(function (catId) {
            var catEl = document.getElementById(catId);
            if (catEl) {
                catEl.addEventListener('change', updateSlugPreview);
            }
        });

        // Show/hide Especialidad field based on tipo + categoria
        function checkEspecialidadVisibility() {
            var tipoEl = document.getElementById('propTipoNegocio');
            var catEl = document.getElementById('propCategoria');
            var wrap = document.getElementById('propEspecialidadWrap');
            if (!tipoEl || !catEl || !wrap) return;
            var isServiciosVarios = tipoEl.value === 'servicios-varios';
            var isMedicina = catEl.value === 'medicina-servicio-medico';
            wrap.style.display = (isServiciosVarios && isMedicina) ? '' : 'none';
        }
        var tipoForEsp = document.getElementById('propTipoNegocio');
        var catForEsp = document.getElementById('propCategoria');
        if (tipoForEsp) tipoForEsp.addEventListener('change', checkEspecialidadVisibility);
        if (catForEsp) catForEsp.addEventListener('change', checkEspecialidadVisibility);

        // Listen to title input for slug preview
        var titleInput = document.getElementById(TITLE_INPUT_ID);
        if (titleInput) {
            titleInput.addEventListener('input', updateSlugPreview);
        }

        // Initial slug preview update
        updateSlugPreview();
    }

    /**
     * Update the slug preview widget.
     */
    function updateSlugPreview() {
        var previewEl = document.getElementById(SLUG_PREVIEW_ID);
        var previewWrap = document.getElementById('slugPreview');
        if (!previewEl || !previewWrap) return;

        var tipoEl = document.getElementById('propTipoNegocio');
        var catEl = document.getElementById('propCategoria');
        var titleEl = document.getElementById(TITLE_INPUT_ID);

        var tipo = tipoEl ? tipoEl.value : '';
        var cat = catEl ? catEl.value : '';
        var title = titleEl ? titleEl.value : '';

        if (!tipo && !cat && !title) {
            previewWrap.style.display = 'none';
            return;
        }

        previewWrap.style.display = 'block';

        // Slugify title
        var slug = (title || 'mi-negocio').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 80) || 'mi-negocio';

        var url = '/' + (tipo || 'tipo') + '/' + (cat || 'categoria') + '/' + slug;
        previewEl.textContent = url;
    }

    /**
     * Legacy: populate a single select by selector (backward compat).
     */
    async function loadDynamicCategories(selectEl, opts) {
        opts = opts || {};
        var el = typeof selectEl === 'string' ? document.querySelector(selectEl) : selectEl;
        if (!el) return;

        var cats = await fetchFlatCategories();

        var firstOption = el.querySelector('option:first-child');
        var firstHtml = firstOption ? firstOption.outerHTML : '<option value="">Selecciona una categoria</option>';
        var currentValue = opts.currentValue || el.value;

        el.innerHTML = firstHtml;

        cats.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c.slug;
            opt.textContent = c.name;
            if (c.slug === currentValue) opt.selected = true;
            el.appendChild(opt);
        });

        var otroOpt = document.createElement('option');
        otroOpt.value = 'otro';
        otroOpt.textContent = 'Otro';
        if ('otro' === currentValue) otroOpt.selected = true;
        el.appendChild(otroOpt);

        if (opts.addSuggestOption) {
            var suggestOpt = document.createElement('option');
            suggestOpt.value = '__suggest__';
            suggestOpt.textContent = '+ Agregar nueva categoria';
            suggestOpt.style.color = '#006EE3';
            suggestOpt.style.fontWeight = '600';
            el.appendChild(suggestOpt);
        }
    }

    /**
     * Populate all known selects on the current page.
     */
    async function loadAllDynamicCategories() {
        // Load cascading tipo→categoria (new-business form)
        loadCascadingSelects();
        // Load flat selects (search, map, dashboard)
        loadFlatSelects();
    }

    /**
     * Invalidate cache.
     */
    function invalidateCategoryCache() {
        _cachedTipos = null;
        _cachedFlat = null;
    }

    // Expose globally
    window.loadDynamicCategories = loadDynamicCategories;
    window.loadAllDynamicCategories = loadAllDynamicCategories;
    window.invalidateCategoryCache = invalidateCategoryCache;
    window.updateSlugPreview = updateSlugPreview;

    // Auto-load on pages that have any known select
    var allIds = CASCADING_TIPO_IDS.concat(CASCADING_CAT_IDS).concat(FLAT_SELECT_IDS);
    var hasAny = allIds.some(function (id) { return document.getElementById(id); });
    if (hasAny) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(loadAllDynamicCategories, 100);
            });
        } else {
            setTimeout(loadAllDynamicCategories, 100);
        }
    }

})();