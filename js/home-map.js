/**
 * Un Click - Home Page Mini Map
 * Shows a compact map with business AND property markers on the homepage
 * Supports filtering by type: businesses, properties, or both
 *
 * Performance (mobile):
 * - The map is only created when its section is about to scroll into view.
 * - On touch devices the map starts "locked" so it doesn't trap page scroll;
 *   tapping "Toca para explorar" unlocks drag/zoom, and it locks again when
 *   the map leaves the screen.
 * - Businesses are fetched with ?fields=map (only marker columns).
 * - Icons are created once and reused; popups are built only when opened.
 */

(function () {
    'use strict';

    var VENEZUELA_CENTER = [8.6233, -66.5897];
    var IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    var map = null;
    var markerLayer = null;
    var currentView = 'both'; // 'businesses', 'properties', 'both'
    var allBusinesses = [];
    var allProperties = [];
    var iconCache = {};
    var interactive = !IS_TOUCH;
    var lockOverlay = null;

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function initHomeMap() {
        var mapEl = document.getElementById('homeMap');
        if (!mapEl || typeof L === 'undefined' || map) return;

        try {
            map = L.map('homeMap', {
                center: VENEZUELA_CENTER,
                zoom: 6,
                zoomControl: true,
                scrollWheelZoom: false, // no atrapar el scroll de la pagina
                dragging: interactive,
                touchZoom: interactive,
                doubleClickZoom: interactive,
                tap: false,
                boxZoom: false,
                keyboard: false,
                preferCanvas: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
                updateWhenIdle: true,
                updateWhenZooming: false,
                keepBuffer: IS_TOUCH ? 1 : 2,
            }).addTo(map);

            // Sin clustering: todas las fichas visibles desde el inicio.
            markerLayer = L.layerGroup().addTo(map);

            if (IS_TOUCH) setupTouchLock(mapEl);

            setupToggleButtons();
            loadAllData();

            setTimeout(function () { map.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error loading home map:', error);
        }
    }

    // ─── Touch lock: avoid trapping page scroll on mobile ─────
    function setInteractive(on) {
        if (!map || interactive === on) return;
        interactive = on;
        var handlers = [map.dragging, map.touchZoom, map.doubleClickZoom];
        handlers.forEach(function (h) {
            if (h) { if (on) h.enable(); else h.disable(); }
        });
        if (lockOverlay) lockOverlay.style.display = on ? 'none' : 'flex';
    }

    function setupTouchLock(mapEl) {
        lockOverlay = document.createElement('button');
        lockOverlay.type = 'button';
        lockOverlay.className = 'home-map-lock';
        lockOverlay.innerHTML = '<span><i class="fas fa-hand-pointer"></i> Toca para explorar el mapa</span>';
        lockOverlay.addEventListener('click', function () { setInteractive(true); });
        mapEl.appendChild(lockOverlay);
        L.DomEvent.disableClickPropagation(lockOverlay);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) setInteractive(false);
                });
            }, { threshold: 0 }).observe(mapEl);
        }
    }

    function setupToggleButtons() {
        var btnNegocios = document.getElementById('homeMapToggleNegocios');
        var btnAmbos = document.getElementById('homeMapToggleAmbos');
        var btnPropiedades = document.getElementById('homeMapTogglePropiedades');

        function updateButtons(active) {
            if (active === currentView) return;
            currentView = active;
            if (btnNegocios) {
                btnNegocios.className = active === 'businesses' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            }
            if (btnAmbos) {
                btnAmbos.className = active === 'both' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
                btnAmbos.style.background = active === 'both' ? 'linear-gradient(135deg,#1a73e8,#006EE3)' : '';
            }
            if (btnPropiedades) {
                btnPropiedades.className = active === 'properties' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            }
            renderMarkers();
        }

        if (btnNegocios) btnNegocios.addEventListener('click', function () { updateButtons('businesses'); });
        if (btnAmbos) btnAmbos.addEventListener('click', function () { updateButtons('both'); });
        if (btnPropiedades) btnPropiedades.addEventListener('click', function () { updateButtons('properties'); });
    }

    function loadAllData() {
        if (!map || !markerLayer) return;

        var bizPromise = api.get('/businesses?status=approved&limit=100&fields=map')
            .then(function (data) {
                allBusinesses = data.businesses || [];
            })
            .catch(function (err) {
                console.error('Error loading businesses:', err);
            });

        var propPromise = api.get('/properties?status=approved&limit=100')
            .then(function (data) {
                allProperties = data.properties || [];
            })
            .catch(function (err) {
                console.error('Error loading properties:', err);
            });

        Promise.all([bizPromise, propPromise]).then(function () {
            renderMarkers();

            var overlay = document.getElementById('homeMapOverlay');
            var totalCount = allBusinesses.length + allProperties.length;
            if (overlay && totalCount > 0) {
                overlay.style.display = 'none';
            }
        });
    }

    function createBusinessIcon(businessType) {
        var key = 'biz:' + (businessType ? businessType.toLowerCase() : '');
        if (iconCache[key]) return iconCache[key];

        var colors = {
            'negocio': '#1a73e8',
            'profesional': '#28a745',
            'servicio': '#ff6b35',
            'restaurante': '#e74c3c',
            'tienda': '#9c27b0',
            'otro': '#607d8b',
        };
        var color = (businessType && colors[businessType.toLowerCase()]) || '#1a73e8';

        var icons = {
            'negocio': '\u{1F3EA}',
            'profesional': '\u{1F4BC}',
            'servicio': '\u{1F514}',
            'restaurante': '\u{1F37D}',
            'tienda': '\u{1F6CD}',
            'otro': '\u{1F4CC}',
        };
        var label = icons[businessType && businessType.toLowerCase()] || '\u{1F4CC}';

        iconCache[key] = L.divIcon({
            className: 'custom-map-marker home-marker-lite',
            html: '<div class="marker-pin" style="background-color:' + color + ';">'
                + '<span class="marker-price">' + label + '</span>'
                + '</div>',
            iconSize: [40, 44],
            iconAnchor: [20, 44],
            popupAnchor: [0, -48],
        });
        return iconCache[key];
    }

    function createPropertyIcon() {
        if (iconCache.property) return iconCache.property;
        iconCache.property = L.divIcon({
            className: 'custom-map-marker home-marker-lite',
            html: '<div class="marker-pin" style="background-color:#006EE3;">'
                + '<span class="marker-price" style="font-size:10px;"><i class="fas fa-home"></i></span>'
                + '</div>',
            iconSize: [40, 44],
            iconAnchor: [20, 44],
            popupAnchor: [0, -48],
        });
        return iconCache.property;
    }

    // ─── Fix Corrupted Coordinates ───────────────────────────
    function fixCoord(val) {
        if (val === null || val === undefined || val === '') return null;
        var n = parseFloat(val);
        if (isNaN(n)) return null;
        if (n > 180 || n < -180) {
            var s = String(Math.abs(n));
            var sign = n < 0 ? '-' : '';
            if (s.length > 3) {
                var fixed = sign + s.substring(0, 2) + '.' + s.substring(2);
                var fn = parseFloat(fixed);
                if (!isNaN(fn) && fn >= -180 && fn <= 180) return fn;
            }
            if (s.length > 4) {
                var fixed2 = sign + s.substring(0, 3) + '.' + s.substring(3);
                var fn2 = parseFloat(fixed2);
                if (!isNaN(fn2) && fn2 >= -180 && fn2 <= 180) return fn2;
            }
            return null;
        }
        return n;
    }

    function popupImage(url, title) {
        return url
            ? '<div class="map-popup-image"><img src="' + esc(url) + '" alt="' + esc(title) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>'
            : '';
    }

    function businessPopup(p) {
        var title = p.title || 'Sin titulo';
        var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '';
        var href = (p.category_slug === 'medicina-servicio-medico' ? '/medicina-servicio-medico' : '/negocio') + '/' + encodeURIComponent(p.slug || p.id);
        return '<div class="map-popup">'
            + popupImage(p.cover_image || (p.images && p.images[0] && p.images[0].url), title)
            + '<div class="map-popup-content">'
            + '<h4 class="map-popup-title">' + esc(title) + '</h4>'
            + '<div class="map-popup-badges">'
            + '<span class="map-popup-badge">' + esc(p.business_type || 'Negocio') + '</span>'
            + '</div>'
            + (address ? '<div class="map-popup-location">' + esc(address) + '</div>' : '')
            + '<a href="' + href + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
            + '</div>'
            + '</div>';
    }

    function propertyPopup(p) {
        var title = p.title || 'Propiedad';
        var price = p.price ? '$' + Number(p.price).toLocaleString('es-VE') : '';
        var opLabel = (p.operation_type || '').replace('_', ' ');
        var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '';
        return '<div class="map-popup">'
            + popupImage(p.cover_image, title)
            + '<div class="map-popup-content">'
            + '<h4 class="map-popup-title">' + esc(title) + '</h4>'
            + '<div class="map-popup-badges">'
            + '<span class="map-popup-badge">' + esc(opLabel) + '</span>'
            + (price ? '<span class="map-popup-badge" style="background:#006EE3;">' + esc(price) + '</span>' : '')
            + '</div>'
            + (address ? '<div class="map-popup-location">' + esc(address) + '</div>' : '')
            + '<a href="/property-detail.html?id=' + encodeURIComponent(p.id) + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
            + '</div>'
            + '</div>';
    }

    function addMarker(lat, lng, icon, item, buildPopup, markers) {
        var marker = L.marker([lat, lng], { icon: icon, keyboard: false });
        // Popup HTML is built only when the user opens it
        marker.bindPopup(function () { return buildPopup(item); }, { maxWidth: 300, minWidth: 260, closeButton: true });
        markers.push(marker);
    }

    function renderMarkers() {
        if (!markerLayer) return;

        var bounds = [];
        var markers = [];

        if (currentView === 'businesses' || currentView === 'both') {
            allBusinesses.forEach(function (p) {
                var lat = fixCoord(p.lat);
                var lng = fixCoord(p.lng);
                if (!lat || !lng) return;
                bounds.push([lat, lng]);
                addMarker(lat, lng, createBusinessIcon(p.business_type), p, businessPopup, markers);
            });
        }

        if (currentView === 'properties' || currentView === 'both') {
            allProperties.forEach(function (p) {
                var lat = fixCoord(p.lat);
                var lng = fixCoord(p.lng);
                if (!lat || !lng) return;
                bounds.push([lat, lng]);
                addMarker(lat, lng, createPropertyIcon(), p, propertyPopup, markers);
            });
        }

        // Swap all markers in one go
        markerLayer.clearLayers();
        markers.forEach(function (m) { markerLayer.addLayer(m); });

        if (bounds.length > 0) {
            map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 14, animate: false });
        }
    }

    // ─── Lazy init: create the map only when its section is near the viewport ─
    function scheduleInit() {
        var section = document.getElementById('homeMapSection') || document.getElementById('homeMap');
        if (!section) return;
        if (!('IntersectionObserver' in window)) {
            initHomeMap();
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            if (entries.some(function (e) { return e.isIntersecting; })) {
                io.disconnect();
                initHomeMap();
            }
        }, { rootMargin: '300px 0px' });
        io.observe(section);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleInit);
    } else {
        scheduleInit();
    }

})();
