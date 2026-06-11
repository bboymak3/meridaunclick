/**
 * Un Click - Home Page Mini Map
 * Shows a compact map with business AND property markers on the homepage
 * Supports filtering by type: businesses, properties, or both
 */

(function () {
    'use strict';

    var VENEZUELA_CENTER = [8.6233, -66.5897];
    var map = null;
    var markerLayer = null;
    var currentView = 'both'; // 'businesses', 'properties', 'both'
    var allBusinesses = [];
    var allProperties = [];

    function initHomeMap() {
        var mapEl = document.getElementById('homeMap');
        if (!mapEl || typeof L === 'undefined') return;

        try {
            map = L.map('homeMap', {
                center: VENEZUELA_CENTER,
                zoom: 6,
                zoomControl: false,
                scrollWheelZoom: false,
                dragging: true,
                tap: true,
                touchZoom: true,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            markerLayer = L.layerGroup().addTo(map);

            // Setup toggle buttons
            setupToggleButtons();

            // Load both businesses and properties
            loadAllData();

            // Fix size after render
            setTimeout(function () { map.invalidateSize(); }, 300);

            // Also invalidate when map section becomes visible (IntersectionObserver)
            var mapSection = document.getElementById('homeMapSection');
            if (mapSection && 'IntersectionObserver' in window) {
                var observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            setTimeout(function () { map.invalidateSize(); }, 100);
                        }
                    });
                }, { threshold: 0.1 });
                observer.observe(mapSection);
            }
        } catch (error) {
            console.error('Error loading home map:', error);
        }
    }

    function setupToggleButtons() {
        var btnNegocios = document.getElementById('homeMapToggleNegocios');
        var btnAmbos = document.getElementById('homeMapToggleAmbos');
        var btnPropiedades = document.getElementById('homeMapTogglePropiedades');

        function updateButtons(active) {
            currentView = active;
            if (btnNegocios) {
                btnNegocios.className = active === 'businesses' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
                btnNegocios.style.flex = '1';
                btnNegocios.style.fontSize = '0.85rem';
            }
            if (btnAmbos) {
                btnAmbos.className = active === 'both' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
                btnAmbos.style.flex = '1';
                btnAmbos.style.fontSize = '0.85rem';
                btnAmbos.style.background = active === 'both' ? 'linear-gradient(135deg,#1a73e8,#059669)' : '';
                if (active === 'both') btnAmbos.style.background = 'linear-gradient(135deg,#1a73e8,#059669)';
            }
            if (btnPropiedades) {
                btnPropiedades.className = active === 'properties' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
                btnPropiedades.style.flex = '1';
                btnPropiedades.style.fontSize = '0.85rem';
            }
            renderMarkers();
        }

        if (btnNegocios) btnNegocios.addEventListener('click', function () { updateButtons('businesses'); });
        if (btnAmbos) btnAmbos.addEventListener('click', function () { updateButtons('both'); });
        if (btnPropiedades) btnPropiedades.addEventListener('click', function () { updateButtons('properties'); });
    }

    function loadAllData() {
        if (!map || !markerLayer) return;

        var bizPromise = api.get('/businesses?status=approved&limit=100')
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

            // Hide overlay if markers exist
            var overlay = document.getElementById('homeMapOverlay');
            var totalCount = allBusinesses.length + allProperties.length;
            if (overlay && totalCount > 0) {
                overlay.style.display = 'none';
            }
        });
    }

    function createBusinessIcon(businessType) {
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

        return L.divIcon({
            className: 'custom-map-marker',
            html: '<div class="marker-pin" style="background-color:' + color + ';">'
                + '<span class="marker-price">' + label + '</span>'
                + '</div>'
                + '<div class="marker-shadow"></div>',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            popupAnchor: [0, -56],
        });
    }

    function createPropertyIcon() {
        return L.divIcon({
            className: 'custom-map-marker',
            html: '<div class="marker-pin" style="background-color:#059669;">'
                + '<span class="marker-price" style="font-size:10px;"><i class="fas fa-home"></i></span>'
                + '</div>'
                + '<div class="marker-shadow"></div>',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            popupAnchor: [0, -56],
        });
    }

    function renderMarkers() {
        if (!markerLayer) return;

        markerLayer.clearLayers();

        var bounds = [];

        // Add business markers
        if (currentView === 'businesses' || currentView === 'both') {
            allBusinesses.forEach(function (p) {
                if (!p.lat || !p.lng) return;
                bounds.push([p.lat, p.lng]);

                var icon = createBusinessIcon(p.business_type);
                var coverImage = p.cover_image || (p.images && p.images[0] && p.images[0].url) || '';
                var title = p.title || 'Sin titulo';
                var typeLabel = p.business_type || 'Negocio';

                var imgTag = coverImage
                    ? '<div class="map-popup-image"><img src="' + coverImage + '" alt="' + title + '" onerror="this.parentElement.style.display=\'none\'"></div>'
                    : '';

                var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '';

                var popupHTML = '<div class="map-popup">'
                    + imgTag
                    + '<div class="map-popup-content">'
                    + '<h4 class="map-popup-title">' + title + '</h4>'
                    + '<div class="map-popup-badges">'
                    + '<span class="map-popup-badge">' + typeLabel + '</span>'
                    + '</div>'
                    + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
                    + '<a href="/negocio/' + (p.slug || p.id) + '" class="map-popup-link">Ver m\u00e1s <i class="fas fa-arrow-right"></i></a>'
                    + '</div>'
                    + '</div>';

                var marker = L.marker([p.lat, p.lng], { icon: icon });
                marker.bindPopup(popupHTML, { maxWidth: 300, minWidth: 260, closeButton: true });
                markerLayer.addLayer(marker);
            });
        }

        // Add property markers
        if (currentView === 'properties' || currentView === 'both') {
            allProperties.forEach(function (p) {
                if (!p.lat || !p.lng) return;
                bounds.push([p.lat, p.lng]);

                var icon = createPropertyIcon();
                var coverImage = p.cover_image || '';
                var title = p.title || 'Propiedad';
                var price = p.price ? '$' + Number(p.price).toLocaleString('es-VE') : '';
                var opLabel = (p.operation_type || '').replace('_', ' ');

                var imgTag = coverImage
                    ? '<div class="map-popup-image"><img src="' + coverImage + '" alt="' + title + '" onerror="this.parentElement.style.display=\'none\'"></div>'
                    : '';

                var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '';

                var popupHTML = '<div class="map-popup">'
                    + imgTag
                    + '<div class="map-popup-content">'
                    + '<h4 class="map-popup-title">' + title + '</h4>'
                    + '<div class="map-popup-badges">'
                    + '<span class="map-popup-badge">' + opLabel + '</span>'
                    + (price ? '<span class="map-popup-badge" style="background:#059669;">' + price + '</span>' : '')
                    + '</div>'
                    + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
                    + '<a href="/property-detail.html?id=' + p.id + '" class="map-popup-link">Ver m\u00e1s <i class="fas fa-arrow-right"></i></a>'
                    + '</div>'
                    + '</div>';

                var marker = L.marker([p.lat, p.lng], { icon: icon });
                marker.bindPopup(popupHTML, { maxWidth: 300, minWidth: 260, closeButton: true });
                markerLayer.addLayer(marker);
            });
        }

        // Fit bounds
        if (bounds.length > 0) {
            var latLngBounds = L.latLngBounds(bounds);
            map.fitBounds(latLngBounds, { padding: [30, 30], maxZoom: 14 });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHomeMap);
    } else {
        initHomeMap();
    }

})();
