/**
 * Un Click - Home Page Mini Map
 * Shows a compact map with business markers on the homepage
 */

(function () {
    'use strict';

    var VENEZUELA_CENTER = [8.6233, -66.5897];
    var map = null;
    var markerLayer = null;

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

            // Load businesses
            loadBusinesses();

            // Fix size after render
            setTimeout(function () { map.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error loading home map:', error);
        }
    }

    function createMarkerIcon(businessType) {
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
            'negocio': '🏪',
            'profesional': '💼',
            'servicio': '🔔',
            'restaurante': '🍽️',
            'tienda': '🛍️',
            'otro': '📌',
        };
        var label = icons[businessType?.toLowerCase()] || '📌';

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

    function loadBusinesses() {
        if (!map || !markerLayer) return;

        fetch('/api/businesses?status=approved&limit=100')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var businesses = data.businesses || [];
                var validItems = businesses.filter(function (p) { return p.lat && p.lng; });

                markerLayer.clearLayers();

                validItems.forEach(function (p) {
                    var icon = createMarkerIcon(p.business_type);
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
                        + '<a href="/negocio/' + p.slug + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
                        + '</div>'
                        + '</div>';

                    var marker = L.marker([p.lat, p.lng], { icon: icon });
                    marker.bindPopup(popupHTML, {
                        maxWidth: 300,
                        minWidth: 260,
                        closeButton: true,
                    });

                    markerLayer.addLayer(marker);
                });

                // Fit bounds to show all markers
                if (validItems.length > 0) {
                    var bounds = L.latLngBounds(validItems.map(function (p) { return [p.lat, p.lng]; }));
                    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
                }

                // Hide overlay if businesses exist
                var overlay = document.getElementById('homeMapOverlay');
                if (overlay && validItems.length > 0) {
                    overlay.style.display = 'none';
                }
            })
            .catch(function (err) {
                console.error('Error loading map businesses:', err);
            });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHomeMap);
    } else {
        initHomeMap();
    }

})();
