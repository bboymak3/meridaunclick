/**
 * Mérida Un Click - Map Module
 * Clean restructure: Uses Leaflet native popups (works on desktop & mobile)
 * No custom modal overlays — just native Leaflet popups that work everywhere
 */

(function () {
    'use strict';

    // ─── Configuration ──────────────────────────────────────────
    const VENEZUELA_CENTER = [8.6233, -66.5897];
    const DEFAULT_ZOOM = 6;

    // ─── State ──────────────────────────────────────────────────
    let map = null;
    let markers = [];
    let markerLayer = null;
    let isMapView = false;
    let allBusinesses = [];
    let activeCardId = null;
    let miniMapInitialized = false;

    // ─── DOM Elements ───────────────────────────────────────────
    const mapContainer = document.getElementById('map');
    const mapBusinessList = document.getElementById('mapBusinessList');
    const mapLoading = document.getElementById('mapLoading');
    const mapResultCount = document.getElementById('mapCountText');
    const mapSidebar = document.getElementById('mapSidebar');
    const mapSidebarToggle = document.getElementById('mapSidebarToggle');

    // Filter elements
    const mapTipo = document.getElementById('mapTipo');
    const mapEstado = document.getElementById('mapEstado');
    const mapCiudad = document.getElementById('mapCiudad');
    const mapSearchBtn = document.getElementById('mapSearchBtn');
    const mapResetBtn = document.getElementById('mapResetBtn');

    // Search.html mini map elements
    const searchMapContainer = document.getElementById('searchMapContainer');
    const searchMiniMap = document.getElementById('searchMiniMap');
    const mapToggleBtn = document.getElementById('mapToggleBtn');
    const closeMapBtn = document.getElementById('closeMapBtn');

    // ─── Determine Context ──────────────────────────────────────
    isMapView = !!mapContainer;

    // ─── Initialize ─────────────────────────────────────────────
    function initMap() {
        if (isMapView) {
            initFullMap();
            setupSidebarToggle();
            setupMapFilters();
        }
        setupMiniMapToggle();
    }

    // ─── Initialize Full Map ────────────────────────────────────
    function initFullMap() {
        if (!mapContainer || typeof L === 'undefined') return;

        try {
            map = L.map('map', {
                center: VENEZUELA_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: false,
                scrollWheelZoom: true,
                tap: true,
                closePopupOnClick: true,
            });

            // OpenStreetMap tiles (free)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19,
            }).addTo(map);

            // Remove the small attribution icon in the corner
            map.attributionControl.remove();

            // ─── Custom map controls ─────────────────────────────
            var Lc = L.control;

            // Zoom controls
            var zoomCtrl = Lc.zoom({ position: 'bottomright' });
            zoomCtrl.addTo(map);

            // Center map button
            var centerBtn = Lc({ position: 'bottomright' });
            centerBtn.onAdd = function () {
                var div = L.DomUtil.create('div', 'leaflet-bar map-ctrl-center');
                div.innerHTML = '<a href="#" title="Centrar mapa" role="button" aria-label="Centrar mapa"><i class="fas fa-crosshairs"></i></a>';
                div.onclick = function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    fitAllMarkers();
                };
                return div;
            };
            centerBtn.addTo(map);

            // Go back button
            var backBtn = Lc({ position: 'bottomright' });
            backBtn.onAdd = function () {
                var div = L.DomUtil.create('div', 'leaflet-bar map-ctrl-back');
                div.innerHTML = '<a href="#" title="Ir atrás" role="button" aria-label="Ir atrás"><i class="fas fa-arrow-left"></i></a>';
                div.onclick = function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'index.html';
                    }
                };
                return div;
            };
            backBtn.addTo(map);

            // Marker layer group
            markerLayer = L.layerGroup().addTo(map);

            // Load businesses
            loadMapBusinesses();

            // Fix rendering
            setTimeout(function () { map.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error initializing map:', error);
            mapContainer.innerHTML = '<div class="map-no-results"><i class="fas fa-exclamation-circle"></i><p>Error al cargar el mapa</p></div>';
        }
    }

    // ─── Safe helpers (fallback if app.js functions not loaded) ──
    function safeGetTypeLabel(type) {
        try {
            if (typeof getBusinessTypeLabel === 'function') return getBusinessTypeLabel(type);
        } catch (e) { /* ignore */ }
        return type || 'Negocio';
    }

    function safeGetTypeIcon(type) {
        var icons = {
            'negocio': '🏪',
            'profesional': '💼',
            'servicio': '🔔',
            'restaurante': '🍽️',
            'tienda': '🛍️',
            'otro': '📌',
        };
        return icons[type?.toLowerCase()] || '📌';
    }

    // ─── Create Marker ──────────────────────────────────────────
    function createMarker(business) {
        if (!business.lat || !business.lng || typeof L === 'undefined') return null;

        try {
            var coverImage = '';
            if (business.cover_image && typeof business.cover_image === 'string') {
                coverImage = business.cover_image;
            } else if (business.images && Array.isArray(business.images) && business.images.length > 0 && business.images[0].url) {
                coverImage = business.images[0].url;
            }

            var typeLabel = safeGetTypeLabel(business.business_type);
            var title = business.title || 'Sin título';

            // Color by business type
            var iconColor = getMarkerColor(business.business_type);

            // Custom pin icon with emoji
            var icon = L.divIcon({
                className: 'custom-map-marker',
                html: '<div class="marker-pin" style="background-color: ' + iconColor + ';">'
                    + '<span class="marker-price">' + safeGetTypeIcon(business.business_type) + '</span>'
                    + '</div>'
                    + '<div class="marker-shadow"></div>',
                iconSize: [40, 52],
                iconAnchor: [20, 52],
                popupAnchor: [0, -56],
            });

            var marker = L.marker([business.lat, business.lng], { icon: icon });

            // Build popup content
            var imgTag = coverImage
                ? '<div class="map-popup-image"><img src="' + coverImage + '" alt="' + title + '" onerror="this.parentElement.style.display=\'none\'"></div>'
                : '';

            var address = business.city ? (business.state ? business.city + ', ' + business.state : business.city) : '';

            var popupHTML = '<div class="map-popup">'
                + imgTag
                + '<div class="map-popup-content">'
                + '<h4 class="map-popup-title">' + title + '</h4>'
                + '<div class="map-popup-badges">'
                + '<span class="map-popup-badge">' + typeLabel + '</span>'
                + '</div>'
                + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
                + '<a href="business.html?id=' + business.id + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
                + '</div>'
                + '</div>';

            // Safety check: popupHTML must be a non-empty string
            if (typeof popupHTML !== 'string' || popupHTML.length === 0) {
                popupHTML = '<div class="map-popup"><div class="map-popup-content"><h4>' + title + '</h4><p>Negocio</p></div></div>';
            }

            // Bind popup to marker
            marker.bindPopup(popupHTML, {
                maxWidth: 300,
                minWidth: 260,
                closeButton: true,
                autoPan: true,
                autoPanPaddingTopLeft: [20, 60],
                autoPanPaddingBottomRight: [20, 20],
            });

            // On marker click, highlight card in sidebar
            marker.on('click', function () {
                highlightCard(business.id);
            });

            return marker;
        } catch (err) {
            console.error('Error creating marker for business ' + (business.id || '?') + ':', err);
            return null;
        }
    }

    function getMarkerColor(businessType) {
        var colors = {
            'negocio': '#1a73e8',
            'profesional': '#28a745',
            'servicio': '#ff6b35',
            'restaurante': '#e74c3c',
            'tienda': '#9c27b0',
            'otro': '#607d8b',
        };
        try {
            return (businessType && colors[businessType.toLowerCase()]) || '#1a73e8';
        } catch (e) {
            return '#1a73e8';
        }
    }

    // ─── Load Map Businesses ───────────────────────────────────
    function loadMapBusinesses() {
        if (!isMapView) return;

        if (mapLoading) mapLoading.style.display = '';

        var filters = getFilterValues();
        var endpoint = '/businesses?status=approved&limit=100';

        if (filters.business_type) endpoint += '&business_type=' + encodeURIComponent(filters.business_type);
        if (filters.state) endpoint += '&state=' + encodeURIComponent(filters.state);
        if (filters.city) endpoint += '&city=' + encodeURIComponent(filters.city);

        api.get(endpoint).then(function (data) {
            allBusinesses = data.businesses || [];

            // Clear markers
            if (markerLayer) markerLayer.clearLayers();
            markers = [];

            // Update count
            if (mapResultCount) {
                mapResultCount.textContent = allBusinesses.length + ' negocios encontrados';
            }

            // Add markers
            var validItems = allBusinesses.filter(function (p) { return p.lat && p.lng; });

            validItems.forEach(function (business) {
                var marker = createMarker(business);
                if (marker) {
                    markers.push({ marker: marker, business: business });
                    markerLayer.addLayer(marker);
                }
            });

            // Fit map to show all markers
            if (validItems.length > 0) {
                fitAllMarkers();
            }

            // Render sidebar list
            renderBusinessList(allBusinesses);

        }).catch(function (error) {
            console.error('Error loading map businesses:', error);
            showToast('Error al cargar negocios en el mapa', 'error');
        }).finally(function () {
            if (mapLoading) mapLoading.style.display = 'none';
        });
    }

    // ─── Sidebar Toggle ─────────────────────────────────────────
    function setupSidebarToggle() {
        if (mapSidebarToggle && mapSidebar) {
            mapSidebarToggle.addEventListener('click', function () {
                mapSidebar.classList.toggle('collapsed');
                mapSidebarToggle.classList.toggle('shifted');
                setTimeout(function () {
                    if (map) map.invalidateSize();
                }, 350);
            });
        }

        // Close button (visible on mobile)
        var closeBtn = document.getElementById('mapSidebarClose');
        if (closeBtn && mapSidebar) {
            closeBtn.addEventListener('click', function () {
                mapSidebar.classList.add('collapsed');
                if (mapSidebarToggle) mapSidebarToggle.classList.add('shifted');
                setTimeout(function () {
                    if (map) map.invalidateSize();
                }, 350);
            });
        }
    }

    // ─── Map Filters ────────────────────────────────────────────
    function setupMapFilters() {
        if (mapSearchBtn) {
            mapSearchBtn.addEventListener('click', function () { loadMapBusinesses(); });
        }
        if (mapResetBtn) {
            mapResetBtn.addEventListener('click', resetFilters);
        }
        [mapCiudad, mapEstado].forEach(function (input) {
            if (input) {
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') loadMapBusinesses();
                });
            }
        });
    }

    function getFilterValues() {
        return {
            business_type: mapTipo ? mapTipo.value : '',
            state: mapEstado ? mapEstado.value : '',
            city: mapCiudad ? (mapCiudad.value || '').trim() : '',
        };
    }

    function resetFilters() {
        if (mapTipo) mapTipo.value = '';
        if (mapEstado) mapEstado.value = '';
        if (mapCiudad) mapCiudad.value = '';
        loadMapBusinesses();
    }

    // ─── Render Sidebar Business List ───────────────────────────
    function renderBusinessList(businesses) {
        if (!mapBusinessList) return;

        if (businesses.length === 0) {
            mapBusinessList.innerHTML = '<div class="map-no-results"><i class="fas fa-search"></i><p>No se encontraron negocios.</p></div>';
            return;
        }

        mapBusinessList.innerHTML = businesses.map(function (p) {
            var coverImage = p.cover_image || (p.images && p.images[0] && p.images[0].url) || '';
            var typeLabel = safeGetTypeLabel(p.business_type);
            var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '--';

            return '<div class="map-business-card" data-business-id="' + p.id + '" data-lat="' + (p.lat || '') + '" data-lng="' + (p.lng || '') + '">'
                + '<img src="' + coverImage + '" alt="' + (p.title || 'Negocio') + '" onerror="this.style.display=\'none\'">'
                + '<div class="card-info">'
                + '<div class="card-title" title="' + (p.title || '') + '">' + (p.title || 'Sin título') + '</div>'
                + '<div class="card-location">' + address + '</div>'
                + '<div class="card-badges">'
                + '<span class="card-badge badge-type">' + typeLabel + '</span>'
                + '</div>'
                + '</div>'
                + '</div>';
        }).join('');

        // Click on sidebar card -> fly to marker & open popup
        mapBusinessList.querySelectorAll('.map-business-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = parseInt(card.dataset.businessId);
                var lat = parseFloat(card.dataset.lat);
                var lng = parseFloat(card.dataset.lng);

                highlightCard(id);

                if (!isNaN(lat) && !isNaN(lng) && map) {
                    flyToBusiness(id);
                } else {
                    window.location.href = 'business.html?id=' + id;
                }
            });
        });
    }

    // ─── Highlight Card & Open Popup ────────────────────────────
    function highlightCard(businessId) {
        activeCardId = businessId;

        // Highlight in sidebar
        if (mapBusinessList) {
            mapBusinessList.querySelectorAll('.map-business-card').forEach(function (card) {
                card.classList.toggle('active', parseInt(card.dataset.businessId) === businessId);
            });
        }

        // Open popup on marker
        var found = markers.find(function (m) { return m.business.id === businessId; });
        if (found && found.marker) {
            found.marker.openPopup();
        }
    }

    function flyToBusiness(businessId) {
        if (!map) return;

        var found = markers.find(function (m) { return m.business.id === businessId; });
        if (found && found.marker) {
            map.flyTo(found.marker.getLatLng(), 15, { duration: 1 });
            setTimeout(function () {
                found.marker.openPopup();
            }, 1100);
        }
    }

    function fitAllMarkers() {
        if (!map || markers.length === 0) return;

        var bounds = L.latLngBounds(markers.map(function (m) { return m.marker.getLatLng(); }));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }

    // ─── Mini Map (search.html) ─────────────────────────────────
    function setupMiniMapToggle() {
        if (!mapToggleBtn || !searchMapContainer || !searchMiniMap) return;

        mapToggleBtn.addEventListener('click', function () {
            var isHidden = searchMapContainer.classList.contains('hidden');
            if (isHidden) {
                searchMapContainer.classList.remove('hidden');
                mapToggleBtn.classList.add('active');
                if (!miniMapInitialized) {
                    initMiniMap();
                    miniMapInitialized = true;
                } else {
                    setTimeout(function () { if (window._miniMap) window._miniMap.invalidateSize(); }, 100);
                }
            } else {
                searchMapContainer.classList.add('hidden');
                mapToggleBtn.classList.remove('active');
            }
        });

        if (closeMapBtn) {
            closeMapBtn.addEventListener('click', function () {
                searchMapContainer.classList.add('hidden');
                mapToggleBtn.classList.remove('active');
            });
        }
    }

    function initMiniMap() {
        if (!searchMiniMap || typeof L === 'undefined') return;

        try {
            window._miniMap = L.map('searchMiniMap', {
                center: VENEZUELA_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: false,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19,
            }).addTo(window._miniMap);
            window._miniMap.attributionControl.remove();
            L.control.zoom({ position: 'bottomright' }).addTo(window._miniMap);

            window._miniMarkerLayer = L.layerGroup().addTo(window._miniMap);
            loadMiniMapBusinesses();

            setTimeout(function () { window._miniMap.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error initializing mini map:', error);
        }
    }

    function loadMiniMapBusinesses() {
        if (!window._miniMap || !window._miniMarkerLayer) return;

        var params = getSearchParams();
        var endpoint = '/businesses?status=approved&limit=50';
        if (params.estado) endpoint += '&state=' + encodeURIComponent(params.estado);
        if (params.categoria) endpoint += '&categoria=' + encodeURIComponent(params.categoria);
        if (params.city) endpoint += '&city=' + encodeURIComponent(params.city);
        if (params.business_type) endpoint += '&business_type=' + encodeURIComponent(params.business_type);
        if (params.search) endpoint += '&search=' + encodeURIComponent(params.search);

        api.get(endpoint).then(function (data) {
            var businesses = data.businesses || [];
            window._miniMarkerLayer.clearLayers();
            var validItems = businesses.filter(function (p) { return p.lat && p.lng; });

            validItems.forEach(function (business) {
                var marker = createMarker(business);
                if (marker) window._miniMarkerLayer.addLayer(marker);
            });

            if (validItems.length > 0) {
                var bounds = L.latLngBounds(validItems.map(function (p) { return [p.lat, p.lng]; }));
                window._miniMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
            }
        }).catch(function (error) {
            console.error('Error loading mini map businesses:', error);
        });
    }

    // ─── Expose for external use ────────────────────────────────
    window.casasMap = {
        flyToBusiness: flyToBusiness,
        fitAllMarkers: fitAllMarkers,
        filterBusinesses: loadMapBusinesses,
        loadMapBusinesses: loadMapBusinesses,
        invalidateSize: function () {
            if (map) map.invalidateSize();
            if (window._miniMap) window._miniMap.invalidateSize();
        },
    };

    // ─── Start ──────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        initMap();
    }

})();
