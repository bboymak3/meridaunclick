/**
 * Un Click - Business Detail Page Loader
 * Loads business data from API and populates business.html
 */

(function initBusinessDetail() {
    document.addEventListener('DOMContentLoaded', async () => {
        const loadingEl = document.getElementById('businessLoading');
        const errorEl = document.getElementById('businessError');
        const contentEl = document.getElementById('businessContent');
        const breadcrumbTitle = document.getElementById('breadcrumbTitle');

        // Must have the loading/content/error elements
        if (!loadingEl || !contentEl) return;

        // Get business ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('id');

        if (!businessId) {
            showError();
            return;
        }

        try {
            // Fetch business data
            const business = await api.get(`/businesses/${businessId}`);

            // Populate page
            populateBusinessDetail(business);

            // Show content, hide loading
            loadingEl.classList.add('hidden');
            contentEl.classList.remove('hidden');

            // Update page title
            document.title = `${business.title || 'Negocio'} - Un Click`;

            // Load similar businesses
            loadSimilarBusinesses(business);

        } catch (error) {
            console.error('Error loading business:', error);
            if (error.message.includes('no encontrado') || error.message.includes('404')) {
                showError();
            } else {
                loadingEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle fa-spin fa-3x" style="color:#f59e0b;"></i>
                    <p>Error al cargar. Intenta nuevamente.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                `;
            }
        }

        function showError() {
            loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    });
})();

function populateBusinessDetail(b) {
    // ─── Breadcrumb ──────────────────────────────────────────
    const breadcrumbTitle = document.getElementById('breadcrumbTitle');
    if (breadcrumbTitle) {
        breadcrumbTitle.textContent = b.title || 'Negocio';
    }

    // ─── Gallery ──────────────────────────────────────────────
    const images = b.images || [];
    const mainImage = document.getElementById('mainImage');
    const galleryThumbnails = document.getElementById('galleryThumbnails');
    const galleryCurrent = document.getElementById('galleryCurrent');
    const galleryTotal = document.getElementById('galleryTotal');
    const galleryBadges = document.getElementById('galleryBadges');
    const businessGallery = document.getElementById('businessGallery');

    const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%23e0e0e0"><rect width="800" height="600"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="20" font-family="sans-serif">Sin imagen</text></svg>'
    );

    if (images.length === 0) {
        if (mainImage) mainImage.src = placeholderImg;
        if (mainImage) mainImage.alt = b.title || 'Sin imagen';
        if (businessGallery) {
            // Hide navigation if no images
            const prevBtn = document.getElementById('galleryPrev');
            const nextBtn = document.getElementById('galleryNext');
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        }
        if (galleryThumbnails) galleryThumbnails.style.display = 'none';
    } else {
        // Set main image
        if (mainImage) {
            mainImage.src = images[0].url || placeholderImg;
            mainImage.alt = b.title || 'Negocio';
        }
        if (galleryCurrent) galleryCurrent.textContent = '1';
        if (galleryTotal) galleryTotal.textContent = images.length;

        // Build thumbnails
        if (galleryThumbnails) {
            galleryThumbnails.innerHTML = images.map((img, i) => `
                <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="setGalleryImage(${i})">
                    <img src="${img.url}" alt="Imagen ${i + 1}" loading="lazy" onerror="this.src='${placeholderImg}'">
                </div>
            `).join('');
        }

        // Init gallery navigation
        initGallery(images);
    }

    // Gallery badges (type, featured, status)
    if (galleryBadges) {
        let badges = '';
        if (b.category_name) {
            badges += `<span class="gallery-badge badge-type">${escapeHtml(b.category_name)}</span>`;
        }
        if (b.featured) {
            badges += `<span class="gallery-badge badge-featured"><i class="fas fa-star"></i> Destacado</span>`;
        }
        galleryBadges.innerHTML = badges;
    }

    // ─── Title ────────────────────────────────────────────────
    const titleEl = document.getElementById('propDetailTitle');
    if (titleEl) titleEl.textContent = b.title || 'Sin título';

    // ─── Price (hidden for businesses) ─────────────────────────
    const priceEl = document.getElementById('propDetailPrice');
    if (priceEl) priceEl.style.display = 'none';

    // ─── Address ───────────────────────────────────────────────
    const locationEl = document.getElementById('propDetailLocation');
    if (locationEl) {
        let addr = b.address || '';
        if (b.city) addr += (addr ? ', ' : '') + b.city;
        if (b.state) addr += (addr ? ', ' : '') + b.state;
        locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(addr || 'Sin dirección')}</span>`;
    }

    // ─── Feature Chips ────────────────────────────────────────
    // State/City
    const stateCity = document.getElementById('statStateCity');
    const stateCityWrap = document.getElementById('statStateCityWrap');
    if (stateCity) {
        let loc = '';
        if (b.city) loc += b.city;
        if (b.state) loc += (loc ? ', ' : '') + b.state;
        stateCity.textContent = loc || '--';
        if (stateCityWrap) stateCityWrap.style.display = loc ? '' : 'none';
    }

    // Category
    const catEl = document.getElementById('statCategoria');
    const catWrap = document.getElementById('statCategoriaWrap');
    if (catEl) {
        catEl.textContent = b.category_name || '--';
        if (catWrap) catWrap.style.display = b.category_name ? '' : 'none';
    }

    // Schedule
    const schedEl = document.getElementById('statSchedule');
    const schedWrap = document.getElementById('statScheduleWrap');
    if (schedWrap) {
        if (b.schedule) {
            schedEl.textContent = b.schedule;
            schedWrap.style.display = '';
        } else {
            schedWrap.style.display = 'none';
        }
    }

    // Phone
    const phoneEl = document.getElementById('statPhone');
    const phoneWrap = document.getElementById('statPhoneWrap');
    if (phoneWrap) {
        if (b.phone) {
            phoneEl.textContent = b.phone;
            phoneWrap.style.display = '';
        } else {
            phoneWrap.style.display = 'none';
        }
    }

    // WhatsApp
    const waEl = document.getElementById('statWhatsApp');
    const waWrap = document.getElementById('statWhatsAppWrap');
    if (waWrap) {
        if (b.whatsapp) {
            waEl.textContent = b.whatsapp;
            waWrap.style.display = '';
        } else {
            waWrap.style.display = 'none';
        }
    }

    // Feature: Parking
    const featParking = document.getElementById('statFeatureParking');
    if (featParking) featParking.style.display = b.has_parking ? '' : 'none';

    // Feature: WiFi
    const featWifi = document.getElementById('statFeatureWifi');
    if (featWifi) featWifi.style.display = b.has_wifi ? '' : 'none';

    // Feature: Cards
    const featCards = document.getElementById('statFeatureCards');
    if (featCards) featCards.style.display = b.has_card ? '' : 'none';

    // Feature: Delivery
    const featDelivery = document.getElementById('statFeatureDelivery');
    if (featDelivery) featDelivery.style.display = b.has_delivery ? '' : 'none';

    // Feature: Outdoor
    const featOutdoor = document.getElementById('statFeatureOutdoor');
    if (featOutdoor) featOutdoor.style.display = b.has_outdoor ? '' : 'none';

    // ─── Description ──────────────────────────────────────────
    const descEl = document.getElementById('propDescription');
    const descToggle = document.getElementById('descriptionToggle');
    if (descEl) {
        if (b.description) {
            descEl.innerHTML = `<p>${escapeHtml(b.description)}</p>`;
            // Check if description is long enough for collapse
            if (b.description.length > 200) {
                descEl.classList.add('collapsed');
                if (descToggle) {
                    descToggle.style.display = '';
                    descToggle.onclick = () => {
                        descEl.classList.toggle('collapsed');
                        descToggle.innerHTML = descEl.classList.contains('collapsed')
                            ? 'Leer más <i class="fas fa-chevron-down"></i>'
                            : 'Leer menos <i class="fas fa-chevron-up"></i>';
                    };
                }
            } else {
                descEl.classList.remove('collapsed');
            }
        } else {
            descEl.innerHTML = '<p>Sin descripción disponible.</p>';
            if (descToggle) descToggle.style.display = 'none';
        }
    }

    // ─── Features Section ───────────────────────────────────────
    const featuresSection = document.getElementById('featuresSection');
    const featuresList = document.getElementById('featuresList');
    if (featuresSection && featuresList) {
        const features = [];
        if (b.has_parking) features.push('<div class="feature-item"><i class="fas fa-parking"></i> Estacionamiento</div>');
        if (b.has_wifi) features.push('<div class="feature-item"><i class="fas fa-wifi"></i> WiFi</div>');
        if (b.has_card) features.push('<div class="feature-item"><i class="fas fa-credit-card"></i> Acepta tarjetas</div>');
        if (b.has_delivery) features.push('<div class="feature-item"><i class="fas fa-motorcycle"></i> Delivery</div>');
        if (b.has_outdoor) features.push('<div class="feature-item"><i class="fas fa-umbrella-beach"></i> Área al aire libre</div>');
        if (b.website) features.push(`<div class="feature-item"><i class="fas fa-globe"></i> <a href="${escapeHtml(b.website)}" target="_blank" rel="noopener">${escapeHtml(b.website)}</a></div>`);
        if (b.instagram) features.push(`<div class="feature-item"><i class="fab fa-instagram"></i> <a href="https://instagram.com/${escapeHtml(b.instagram.replace('@',''))}" target="_blank" rel="noopener">${escapeHtml(b.instagram)}</a></div>`);
        if (b.facebook) features.push(`<div class="feature-item"><i class="fab fa-facebook"></i> <a href="${escapeHtml(b.facebook)}" target="_blank" rel="noopener">${escapeHtml(b.facebook)}</a></div>`);
        if (b.email_contact) features.push(`<div class="feature-item"><i class="fas fa-envelope"></i> <a href="mailto:${escapeHtml(b.email_contact)}">${escapeHtml(b.email_contact)}</a></div>`);

        if (features.length > 0) {
            featuresList.innerHTML = features.join('');
            featuresSection.classList.remove('hidden');
        }
    }

    // ─── Map Section ──────────────────────────────────────────
    const mapSection = document.getElementById('mapSection');
    const businessMap = document.getElementById('businessMap');
    const openMapModalBtn = document.getElementById('openMapModalBtn');

    if (mapSection && b.lat && b.lng) {
        mapSection.classList.remove('hidden');

        try {
            const map = L.map('businessMap').setView([b.lat, b.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            const marker = L.marker([b.lat, b.lng]).addTo(map);
            if (b.title) marker.bindPopup(`<strong>${escapeHtml(b.title)}</strong>`);
            if (b.address) marker.bindPopup(`<strong>${escapeHtml(b.title || 'Negocio')}</strong><br>${escapeHtml(b.address)}`);

            // Full-screen map modal
            if (openMapModalBtn) {
                openMapModalBtn.onclick = () => {
                    const modal = document.getElementById('mapModal');
                    if (!modal) return;
                    modal.classList.add('visible');
                    document.body.style.overflow = 'hidden';

                    // Create map in modal after a short delay for DOM to update
                    setTimeout(() => {
                        const modalMapEl = document.getElementById('mapModalMap');
                        if (modalMapEl && !modalMapEl._leafletMap) {
                            const modalMap = L.map('mapModalMap').setView([b.lat, b.lng], 15);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; OpenStreetMap'
                            }).addTo(modalMap);
                            L.marker([b.lat, b.lng]).addTo(modalMap).bindPopup(`<strong>${escapeHtml(b.title || 'Negocio')}</strong><br>${escapeHtml(b.address || '')}`).openPopup();
                            modalMapEl._leafletMap = modalMap;
                            setTimeout(() => modalMap.invalidateSize(), 200);
                        }
                    }, 100);
                };
            }

            // Map modal close
            const mapModalClose = document.getElementById('mapModalClose');
            if (mapModalClose) {
                mapModalClose.onclick = () => {
                    const modal = document.getElementById('mapModal');
                    if (modal) {
                        modal.classList.remove('visible');
                        document.body.style.overflow = '';
                    }
                };
            }

            // Close modal on backdrop click
            const mapModal = document.getElementById('mapModal');
            if (mapModal) {
                mapModal.addEventListener('click', (e) => {
                    if (e.target === mapModal) {
                        mapModal.classList.remove('visible');
                        document.body.style.overflow = '';
                    }
                });
            }
        } catch (mapError) {
            console.warn('Error initializing map:', mapError);
        }
    } else if (mapSection) {
        mapSection.classList.add('hidden');
    }

    // ─── Contact Actions ──────────────────────────────────────
    const mainWhatsApp = document.getElementById('mainWhatsApp');
    if (mainWhatsApp) {
        const waNumber = b.whatsapp || b.phone || b.owner_whatsapp || '';
        if (waNumber) {
            const cleanNumber = waNumber.replace(/[^0-9+]/g, '');
            const msg = encodeURIComponent(`Hola, vi tu negocio "${b.title}" en Un Click y me interesa saber más.`);
            mainWhatsApp.href = `https://wa.me/${cleanNumber}?text=${msg}`;
            mainWhatsApp.style.display = '';
        } else {
            mainWhatsApp.style.display = 'none';
        }
    }

    // Open chat button
    const openChatBtn = document.getElementById('openChatBtn');
    if (openChatBtn) {
        openChatBtn.onclick = () => {
            if (typeof UnClickChat !== 'undefined' && UnClickChat.openChatWith) {
                UnClickChat.openChatWith(b.id, `Hola, vi tu negocio "${b.title}" en Un Click`);
            } else {
                showToast('Chat no disponible', 'warning');
            }
        };
    }

    // Share WhatsApp button
    const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
    if (shareWhatsAppBtn) {
        shareWhatsAppBtn.onclick = () => {
            shareBusinessWhatsApp(b);
        };
    }

    // ─── Favorite Button ──────────────────────────────────────
    const btnFavorite = document.getElementById('btnFavorite');
    if (btnFavorite) {
        btnFavorite.dataset.businessId = b.id;
        btnFavorite.onclick = () => toggleFavorite(b.id);

        // Check if already favorited
        checkFavorite(b.id).then(isFav => {
            const icon = btnFavorite.querySelector('i');
            if (icon) icon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
            if (isFav) btnFavorite.classList.add('favorited');
        });
    }

    // ─── Fullscreen Gallery ───────────────────────────────────
    const fullscreenBtn = document.getElementById('galleryFullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.onclick = () => {
            const lightbox = document.getElementById('lightbox');
            if (lightbox) lightbox.classList.remove('hidden');
        };
    }

    // Lightbox init
    initLightbox(images);

    // ─── SEO Meta Description ─────────────────────────────────
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = `${b.title || 'Negocio'} - ${b.category_name || ''} en ${b.city || 'Mérida'}, ${b.state || 'Venezuela'}. ${b.description ? b.description.substring(0, 150) : 'Visita Un Click para más información.'}`;

    // ─── Load Business Products, Jobs, Services ─────────────
    loadBusinessProducts(b.id);
    loadBusinessJobs(b.id);
    loadBusinessServices(b.id);
}

// ─── Gallery Navigation ─────────────────────────────────────
let currentGalleryIndex = 0;
let galleryImages = [];

function initGallery(images) {
    galleryImages = images;
    currentGalleryIndex = 0;

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');

    if (prevBtn) {
        prevBtn.onclick = () => setGalleryImage(currentGalleryIndex - 1);
    }
    if (nextBtn) {
        nextBtn.onclick = () => setGalleryImage(currentGalleryIndex + 1);
    }
}

function setGalleryImage(index) {
    if (galleryImages.length === 0) return;

    // Wrap around
    if (index < 0) index = galleryImages.length - 1;
    if (index >= galleryImages.length) index = 0;

    currentGalleryIndex = index;

    const mainImage = document.getElementById('mainImage');
    const galleryCurrent = document.getElementById('galleryCurrent');

    const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%23e0e0e0"><rect width="800" height="600"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="20" font-family="sans-serif">Sin imagen</text></svg>'
    );

    if (mainImage) {
        mainImage.src = galleryImages[index].url || placeholderImg;
    }
    if (galleryCurrent) galleryCurrent.textContent = index + 1;

    // Update active thumbnail
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// ─── Lightbox ────────────────────────────────────────────────
function initLightbox(images) {
    let lightboxIndex = currentGalleryIndex;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxCounter = document.getElementById('lightboxCounter');

    if (!lightbox || images.length === 0) return;

    function updateLightbox() {
        const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%23e0e0e0"><rect width="800" height="600"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="20" font-family="sans-serif">Sin imagen</text></svg>'
        );
        if (lightboxImage) lightboxImage.src = images[lightboxIndex]?.url || placeholderImg;
        if (lightboxCounter) lightboxCounter.textContent = `${lightboxIndex + 1} / ${images.length}`;
    }

    if (lightboxPrev) {
        lightboxPrev.onclick = (e) => {
            e.stopPropagation();
            lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
            updateLightbox();
        };
    }

    if (lightboxNext) {
        lightboxNext.onclick = (e) => {
            e.stopPropagation();
            lightboxIndex = (lightboxIndex + 1) % images.length;
            updateLightbox();
        };
    }

    if (lightboxClose) {
        lightboxClose.onclick = () => lightbox.classList.add('hidden');
    }

    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.classList.add('hidden');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'Escape') lightbox.classList.add('hidden');
        if (e.key === 'ArrowLeft') {
            lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
            updateLightbox();
        }
        if (e.key === 'ArrowRight') {
            lightboxIndex = (lightboxIndex + 1) % images.length;
            updateLightbox();
        }
    });

    updateLightbox();
}

// ─── Similar Businesses ─────────────────────────────────────
async function loadSimilarBusinesses(currentBusiness) {
    const similarSection = document.getElementById('similarSection');
    const similarGrid = document.getElementById('similarGrid');

    if (!similarSection || !similarGrid) return;

    try {
        let endpoint = `/businesses?status=approved&limit=4`;
        if (currentBusiness.category_id) {
            endpoint += `&category_id=${currentBusiness.category_id}`;
        } else if (currentBusiness.category_slug) {
            endpoint += `&categoria=${encodeURIComponent(currentBusiness.category_slug)}`;
        }
        if (currentBusiness.state) {
            endpoint += `&state=${encodeURIComponent(currentBusiness.state)}`;
        }

        const data = await api.get(endpoint);
        let businesses = (data.businesses || []).filter(b => b.id !== currentBusiness.id);

        if (businesses.length > 0) {
            similarGrid.innerHTML = businesses.slice(0, 4).map(b => createBusinessCard(b)).join('');
            similarSection.classList.remove('hidden');
        }
    } catch (error) {
        console.warn('Error loading similar businesses:', error);
    }
}

// ─── Business Products ──────────────────────────────────────
async function loadBusinessProducts(businessId) {
    const section = document.getElementById('productsSection');
    const grid = document.getElementById('businessProductsGrid');
    const viewAll = document.getElementById('viewAllProducts');
    if (!section || !grid) return;

    try {
        const data = await api.get(`/marketplace?business_id=${businessId}&status=approved&limit=12`);
        const products = data.products || [];
        
        if (products.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        if (viewAll) viewAll.href = `marketplace.html?business_id=${businessId}`;

        grid.innerHTML = products.map(p => {
            const imgSrc = p.image || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160" fill="%23f1f5f9"><rect width="200" height="160"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14" font-family="sans-serif">Sin imagen</text></svg>');
            return `<a href="marketplace.html" class="product-card">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none'">
                <div class="product-card-body">
                    <div class="product-card-name">${escapeHtml(p.name || 'Sin nombre')}</div>
                    <div class="product-card-price">$${parseFloat(p.price || 0).toFixed(2)}</div>
                </div>
            </a>`;
        }).join('');
    } catch (err) {
        console.warn('Error loading business products:', err);
    }
}

// ─── Business Jobs ───────────────────────────────────────────
async function loadBusinessJobs(businessId) {
    const section = document.getElementById('jobsSection');
    const list = document.getElementById('businessJobsList');
    const viewAll = document.getElementById('viewAllJobs');
    if (!section || !list) return;

    try {
        const data = await api.get(`/jobs?business_id=${businessId}&limit=10`);
        const jobs = data.jobs || [];

        if (jobs.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        if (viewAll) viewAll.href = `empleo.html?business_id=${businessId}`;

        list.innerHTML = jobs.map(j => `
            <a href="empleo.html" class="job-item" style="text-decoration:none;color:inherit;">
                <div class="job-item-icon"><i class="fas fa-briefcase"></i></div>
                <div class="job-item-info">
                    <div class="job-item-title">${escapeHtml(j.title)}</div>
                    <div class="job-item-meta">${escapeHtml(j.job_type || 'Tiempo completo')} · ${escapeHtml(j.city || j.state || 'Venezuela')}</div>
                </div>
            </a>
        `).join('');
    } catch (err) {
        console.warn('Error loading business jobs:', err);
    }
}

// ─── Business Services ──────────────────────────────────────
async function loadBusinessServices(businessId) {
    const section = document.getElementById('servicesSection');
    const list = document.getElementById('businessServicesList');
    if (!section || !list) return;

    try {
        const data = await api.get(`/businesses/${businessId}/services`);
        const services = data.services || [];

        if (services.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        list.innerHTML = services.map(s => `
            <div class="service-item">
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.description || '')}</p>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading business services:', err);
    }
}

// ─── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
