/**
 * Un Click - Dynamic Category Loader
 * Replaces hardcoded category <option> lists with dynamic DB-loaded categories.
 * Loaded on pages that have category dropdowns.
 *
 * Usage: Call window.loadDynamicCategories('#selectId') for each select,
 * or call window.loadAllDynamicCategories() to auto-detect and populate all.
 */

(function () {
    'use strict';

    var _cachedCategories = null;

    // The known select IDs that hold business category dropdowns
    var SELECT_IDS = [
        'searchCategoria',   // index.html - hero search filter
        'sCategoria',        // search.html - search page filter
        'mapTipo',           // map.html - map category filter
        'propCategoria',     // new-business.html - business form
        'editBizCat'         // dashboard.html - edit business modal (user)
    ];

    /**
     * Fetch categories from API (cached after first call).
     * Returns Promise<Array> of { id, name, slug, icon, color, business_count }
     */
    async function fetchCategories() {
        if (_cachedCategories) return _cachedCategories;
        try {
            var resp = await fetch('/api/categories');
            var data = await resp.json();
            _cachedCategories = (data.categories || []);
            return _cachedCategories;
        } catch (e) {
            console.warn('Failed to load categories from API, using fallback.');
            return [];
        }
    }

    /**
     * Populate a <select> element with dynamic categories.
     * Preserves the first <option> (usually "Selecciona...").
     * Adds "Agregar nueva categoria" option at the end.
     *
     * @param {string|HTMLElement} selectEl - CSS selector or DOM element
     * @param {object} opts
     * @param {boolean} opts.addSuggestOption - Add "+ Agregar nueva categoria" option
     * @param {string} opts.currentValue - Pre-select this slug value (for edit mode)
     */
    async function loadDynamicCategories(selectEl, opts) {
        opts = opts || {};
        var el = typeof selectEl === 'string' ? document.querySelector(selectEl) : selectEl;
        if (!el) return;

        var cats = await fetchCategories();

        // Save the first placeholder option
        var firstOption = el.querySelector('option:first-child');
        var firstHtml = firstOption ? firstOption.outerHTML : '<option value="">Selecciona una categoria</option>';
        var currentValue = opts.currentValue || el.value;

        // Clear and rebuild
        el.innerHTML = firstHtml;

        cats.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c.slug;
            opt.textContent = c.name;
            if (c.slug === currentValue) opt.selected = true;
            el.appendChild(opt);
        });

        // Add "Otro" as fallback
        var otroOpt = document.createElement('option');
        otroOpt.value = 'otro';
        otroOpt.textContent = 'Otro';
        if ('otro' === currentValue) otroOpt.selected = true;
        el.appendChild(otroOpt);

        // Add suggest option
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
     * Populate all known category selects on the current page.
     * The "suggest" option is only added to the business form select.
     */
    async function loadAllDynamicCategories() {
        var cats = await fetchCategories();

        SELECT_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;

            var isFormSelect = (id === 'propCategoria');
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
     * Invalidate cache (call after admin creates a new category).
     */
    function invalidateCategoryCache() {
        _cachedCategories = null;
    }

    // Expose globally
    window.loadDynamicCategories = loadDynamicCategories;
    window.loadAllDynamicCategories = loadAllDynamicCategories;
    window.invalidateCategoryCache = invalidateCategoryCache;

    // Auto-load on pages that have any known select
    var hasAny = SELECT_IDS.some(function (id) { return document.getElementById(id); });
    if (hasAny) {
        // Small delay to let other scripts initialize first
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(loadAllDynamicCategories, 50);
            });
        } else {
            setTimeout(loadAllDynamicCategories, 50);
        }
    }

})();