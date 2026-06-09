/**
 * Un Click - Core Application Module
 * Common module loaded on ALL pages
 * Directorio Nacional de Negocios de Venezuela
 */

// ─── API Configuration ──────────────────────────────────────────
const API = '/api';
const API_BASE = '';

// ─── Token Management ──────────────────────────────────────────
const TOKEN_KEY = 'meridaunclick_token';
const USER_KEY = 'meridaunclick_user';

// ─── Venezuela States ────────────────────────────────────────────
const VENEZUELA_STATES = [
  { name: 'Amazonas', slug: 'amazonas' },
  { name: 'Anzoátegui', slug: 'anzoategui' },
  { name: 'Apure', slug: 'apure' },
  { name: 'Aragua', slug: 'aragua' },
  { name: 'Barinas', slug: 'barinas' },
  { name: 'Bolívar', slug: 'bolivar' },
  { name: 'Carabobo', slug: 'carabobo' },
  { name: 'Cojedes', slug: 'cojedes' },
  { name: 'Delta Amacuro', slug: 'delta-amacuro' },
  { name: 'Distrito Capital', slug: 'distrito-capital' },
  { name: 'Falcón', slug: 'falcon' },
  { name: 'Guárico', slug: 'guarico' },
  { name: 'Lara', slug: 'lara' },
  { name: 'Mérida', slug: 'merida' },
  { name: 'Miranda', slug: 'miranda' },
  { name: 'Monagas', slug: 'monagas' },
  { name: 'Nueva Esparta', slug: 'nueva-esparta' },
  { name: 'Portuguesa', slug: 'portuguesa' },
  { name: 'Sucre', slug: 'sucre' },
  { name: 'Táchira', slug: 'tachira' },
  { name: 'Trujillo', slug: 'trujillo' },
  { name: 'Vargas', slug: 'vargas' },
  { name: 'Yaracuy', slug: 'yaracuy' },
  { name: 'Zulia', slug: 'zulia' },
];

const LOCATION_KEY = 'aunclick_selected_state';

// ─── Location Selector System ───────────────────────────────────
function getSelectedState() {
  return localStorage.getItem(LOCATION_KEY) || '';
}

function setSelectedState(stateName) {
  if (stateName) {
    localStorage.setItem(LOCATION_KEY, stateName);
  } else {
    localStorage.removeItem(LOCATION_KEY);
  }
  updateBrandDisplay(stateName);
  updateLocationLabel(stateName);
  // Reload businesses if on index or search page
  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    loadFeaturedProperties();
  }
  const searchGrid = document.getElementById('searchResultsGrid');
  if (searchGrid) {
    executeSearch(1);
  }
}

function updateBrandDisplay(stateName) {
  // Update all #brandCity elements
  document.querySelectorAll('#brandCity').forEach(el => {
    el.textContent = stateName ? stateName + ' ' : '';
  });
  // Update page title dynamically
  if (stateName) {
    document.title = stateName + ' Un Click - Directorio de Negocios en Venezuela';
  } else {
    document.title = 'Un Click - Directorio de Negocios en Venezuela';
  }
}

function updateLocationLabel(stateName) {
  const label = document.getElementById('locationLabel');
  if (label) {
    label.textContent = stateName || 'Todo Venezuela';
  }
}

function initLocationSelector() {
  const locationBtn = document.getElementById('locationBtn');
  const locationDropdown = document.getElementById('locationDropdown');
  const locationList = document.getElementById('locationList');
  const locationSearchInput = document.getElementById('locationSearchInput');
  const locationSelector = document.getElementById('locationSelector');

  if (!locationBtn || !locationDropdown || !locationList) return;

  // Populate states list
  locationList.innerHTML = VENEZUELA_STATES.map(state => `
    <div class="location-option" data-state="${state.name}">
      <i class="fas fa-map-marker-alt"></i>
      <span>${state.name}</span>
    </div>
  `).join('');

  // Toggle dropdown
  locationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    locationDropdown.classList.toggle('hidden');
    locationBtn.classList.toggle('active');
    if (!locationDropdown.classList.contains('hidden') && locationSearchInput) {
      locationSearchInput.value = '';
      filterLocations('');
      locationSearchInput.focus();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!locationSelector.contains(e.target)) {
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    }
  });

  // State option click
  locationList.addEventListener('click', (e) => {
    const option = e.target.closest('.location-option');
    if (option) {
      const stateName = option.dataset.state || '';
      setSelectedState(stateName);
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    }
  });

  // "Todo Venezuela" option click
  const allVzlaOption = locationDropdown.querySelector('.location-option[data-state=""]');
  if (allVzlaOption) {
    allVzlaOption.addEventListener('click', () => {
      setSelectedState('');
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    });
  }

  // Search/filter states
  if (locationSearchInput) {
    locationSearchInput.addEventListener('input', (e) => {
      filterLocations(e.target.value.toLowerCase());
    });
    // Prevent form submission
    locationSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
  }

  // Restore saved state
  const savedState = getSelectedState();
  if (savedState) {
    updateBrandDisplay(savedState);
    updateLocationLabel(savedState);
  }
}

function filterLocations(query) {
  const locationList = document.getElementById('locationList');
  if (!locationList) return;

  const options = locationList.querySelectorAll('.location-option');
  options.forEach(option => {
    const stateName = (option.dataset.state || '').toLowerCase();
    option.style.display = (!query || stateName.includes(query)) ? '' : 'none';
  });
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    // Check if token is expired (simple JWT check)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            removeToken();
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// ─── API Helper ────────────────────────────────────────────────
async function apiCall(endpoint, options = {}) {
    const url = `${API}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    // Add auth header if token exists
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Remove headers from config if it's FormData (let browser set Content-Type with boundary)
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
        config.body = options.body;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle 401 - token expired or invalid
            // Only clear the token; do NOT auto-redirect.
            // Each page decides if it needs auth via requireAuth().
            if (response.status === 401) {
                removeToken();
            }
            throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        throw error;
    }
}

// Shorthand API methods
const api = {
    get(url) {
        return apiCall(url, { method: 'GET' });
    },
    post(url, data) {
        return apiCall(url, {
            method: 'POST',
            body: typeof data === 'string' ? data : JSON.stringify(data),
        });
    },
    put(url, data) {
        return apiCall(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete(url) {
        return apiCall(url, { method: 'DELETE' });
    },
    postFormData(url, formData) {
        return apiCall(url, {
            method: 'POST',
            body: formData,
        });
    },
};

// ─── User Functions ────────────────────────────────────────────
function getCachedUser() {
    try {
        const cached = localStorage.getItem(USER_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

function setCachedUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function getCurrentUser() {
    if (!isAuthenticated()) return null;

    // Try cache first
    const cached = getCachedUser();
    if (cached) return cached;

    try {
        const data = await api.get('/auth/me');
        if (data.user) {
            setCachedUser(data.user);
            return data.user;
        }
        return null;
    } catch {
        return null;
    }
}

function updateNav() {
    const navLoginItem = document.getElementById('navLoginItem');
    const navUserItem = document.getElementById('navUserItem');
    const navUserName = document.getElementById('navUserName');

    if (!navLoginItem || !navUserItem) return;

    if (isAuthenticated()) {
        navLoginItem.classList.add('hidden');
        navUserItem.classList.remove('hidden');

        const user = getCachedUser();
        if (user && navUserName) {
            navUserName.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name || 'Mi Cuenta'}`;
        }

        // Show admin link for admin users
        let adminLinkItem = document.getElementById('navAdminItem');
        if (user && user.role === 'admin') {
            if (!adminLinkItem) {
                adminLinkItem = document.createElement('li');
                adminLinkItem.id = 'navAdminItem';
                adminLinkItem.innerHTML = `<a href="admin.html" class="nav-link nav-admin-link"><i class="fas fa-shield-alt"></i> Admin</a>`;
                // Insert before the user item
                navUserItem.parentNode.insertBefore(adminLinkItem, navUserItem);
            } else {
                adminLinkItem.classList.remove('hidden');
            }
        } else if (adminLinkItem) {
            adminLinkItem.remove();
        }
    } else {
        navLoginItem.classList.remove('hidden');
        navUserItem.classList.add('hidden');

        // Remove admin link if exists
        const adminLinkItem = document.getElementById('navAdminItem');
        if (adminLinkItem) adminLinkItem.remove();

        // Make "Publicar" link require login
        const publishLinks = document.querySelectorAll('a[href="new-business.html"]');
        publishLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const redirect = encodeURIComponent('new-business.html');
                window.location.href = `login.html?redirect=${redirect}`;
            });
        });
    }
}

// ─── UI Helpers ────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoading(element) {
    if (!element) return;
    element.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
        </div>
    `;
}

function hideLoading(element) {
    if (!element) return;
    const spinner = element.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

function formatPrice(price, currency = 'USD') {
    if (price == null || isNaN(price)) return '--';

    const formatted = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);

    const symbols = {
        'USD': '$',
        'EUR': '€',
        'Bs': 'Bs.',
    };

    const symbol = symbols[currency] || '$';
    return `${symbol} ${formatted}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-VE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-VE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

function truncateText(text, maxLen = 100) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + '...';
}

function slugify(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ─── Favorites ─────────────────────────────────────────────────
async function toggleFavorite(businessId) {
    if (!isAuthenticated()) {
        showToast('Inicia sesión para guardar favoritos', 'warning');
        setTimeout(() => {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1500);
        return;
    }

    try {
        const response = await api.post('/favorites', { business_id: parseInt(businessId) });
        showToast('Negocio guardado en favoritos', 'success');
        updateFavoriteButtons(businessId, true);
        return true;
    } catch (error) {
        // Check if it's a 409 (already favorited) - then remove it
        if (error.message.includes('ya está en tus favoritos')) {
            try {
                await api.delete(`/favorites?business_id=${businessId}`);
                showToast('Negocio removido de favoritos', 'info');
                updateFavoriteButtons(businessId, false);
                return false;
            } catch (removeError) {
                showToast(removeError.message, 'error');
            }
        } else {
            showToast(error.message, 'error');
        }
        return null;
    }
}

function updateFavoriteButtons(businessId, isFavorited) {
    document.querySelectorAll(`.btn-favorite[data-business-id="${businessId}"]`).forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isFavorited ? 'fas fa-heart' : 'far fa-heart';
        }
        if (isFavorited) {
            btn.classList.add('favorited');
        } else {
            btn.classList.remove('favorited');
        }
    });
}

async function checkFavorite(businessId) {
    if (!isAuthenticated()) return false;
    try {
        const data = await api.get(`/favorites/check?business_id=${businessId}`);
        return data.is_favorited || false;
    } catch {
        return false;
    }
}

// ─── Business Type Display Names ───────────────────────────────
const BUSINESS_TYPE_LABELS = {
    'negocio': 'Negocio',
    'profesional': 'Profesional',
    'servicio': 'Servicio',
    'restaurante': 'Restaurante',
    'tienda': 'Tienda',
    'otro': 'Otro',
};

function getBusinessTypeLabel(type) {
    if (!type) return '--';
    return BUSINESS_TYPE_LABELS[type?.toLowerCase()] || type;
}

function getBusinessTypeIcon(type) {
    const icons = {
        'negocio': 'fa-store',
        'profesional': 'fa-briefcase',
        'servicio': 'fa-concierge-bell',
        'restaurante': 'fa-utensils',
        'tienda': 'fa-shopping-bag',
        'otro': 'fa-ellipsis',
    };
    return icons[type?.toLowerCase()] || 'fa-store';
}

// ─── WhatsApp Share ────────────────────────────────────────────
function shareBusinessWhatsApp(business) {
    if (!business) return;
    const type = getBusinessTypeLabel(business.business_type);
    const url = `https://aunclick.pages.dev/business.html?id=${business.id}`;
    const title = business.title || 'Negocio';

    let msg = `🏪 *${title}*\n`;
    msg += `📌 ${type}\n`;
    if (business.city) msg += `📍 ${business.city}${business.state ? ', ' + business.state : ''}\n`;
    msg += `\n🔗 ${url}`;
    msg += `\n\n📌 Publicado en Un Click`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── Status Helpers ────────────────────────────────────────────
const STATUS_LABELS = {
    'pending': 'Pendiente',
    'approved': 'Publicada',
    'rejected': 'Rechazada',
    'closed': 'Cerrada',
};

function getStatusLabel(status) {
    return STATUS_LABELS[status?.toLowerCase()] || status || '--';
}

function getStatusBadge(status) {
    const classes = {
        'pending': 'badge badge-warning',
        'approved': 'badge badge-success',
        'rejected': 'badge badge-danger',
        'closed': 'badge badge-info',
    };
    const cls = classes[status?.toLowerCase()] || 'badge';
    return `<span class="${cls}">${getStatusLabel(status)}</span>`;
}

// ─── Business Card HTML Generator ──────────────────────────────
function createBusinessCard(business) {
    if (!business) return '';

    const coverImage = business.cover_image || business.images?.[0]?.url || '';
    const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e0e0e0"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16" font-family="sans-serif">Sin imagen</text></svg>'
    );
    const imgSrc = coverImage || placeholderImg;
    const typeLabel = business.category_name || getBusinessTypeLabel(business.business_type);
    const address = business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : '--';
    const descSnippet = business.description ? `<p class="business-card-desc">${truncateText(business.description, 80)}</p>` : '';

    const featuredBadge = business.featured ? '<span class="card-badge badge-featured"><i class="fas fa-star"></i> Destacada</span>' : '';
    const statusBadge = business.status && business.status !== 'approved' ? `<span class="card-badge badge-${business.status}">${getStatusLabel(business.status)}</span>` : '';

    return `
        <article class="business-card" data-business-id="${business.id}">
            <a href="business.html?id=${business.id}" class="business-card-link">
                <div class="business-card-image">
                    <img src="${imgSrc}" alt="${business.title || 'Sin título'}" loading="lazy" onerror="this.src='${placeholderImg}'">
                    <div class="business-card-badges">
                        <span class="card-badge badge-type">${typeLabel}</span>
                        ${featuredBadge}${statusBadge}
                    </div>
                    <button class="btn-favorite business-card-fav" data-business-id="${business.id}" aria-label="Agregar a favoritos" onclick="event.preventDefault(); event.stopPropagation(); toggleFavorite(${business.id});">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="btn-share-wa-card" data-business-id="${business.id}" aria-label="Compartir por WhatsApp" onclick="event.preventDefault(); event.stopPropagation();">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${business.title || 'Sin título'}</h3>
                    <p class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${address}</p>
                    ${descSnippet}
                </div>
            </a>
        </article>
    `;
}

// ─── WhatsApp Share Delegation for Cards ─────────────────────
document.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('.btn-share-wa-card');
    if (!shareBtn) return;
    const businessId = parseInt(shareBtn.dataset.businessId);
    if (!businessId) return;

    // Fetch business data then share
    api.get(`/businesses/${businessId}`).then(business => {
        shareBusinessWhatsApp(business);
    }).catch(() => {
        // Minimal share with just the link
        window.open(`https://wa.me/?text=${encodeURIComponent('🏪 Mira este negocio en Un Click:\nhttps://aunclick.pages.dev/business.html?id=' + businessId)}`, '_blank');
    });
});

// ─── Search Params Helper ──────────────────────────────────────
function getSearchParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        estado: params.get('estado') || '',
        categoria: params.get('categoria') || '',
        city: params.get('ciudad') || params.get('city') || '',
        search: params.get('q') || params.get('search') || '',
        business_type: params.get('tipo_negocio') || '',
        page: params.get('page') || 1,
        limit: params.get('limit') || 12,
    };
}

function buildSearchURL(params) {
    const url = new URL('search.html', window.location.origin);
    const mapping = {
        estado: 'estado',
        categoria: 'categoria',
        city: 'ciudad',
        search: 'q',
        business_type: 'tipo_negocio',
    };

    for (const [key, value] of Object.entries(params)) {
        if (value && value !== '' && value !== 0) {
            const paramName = mapping[key] || key;
            url.searchParams.set(paramName, value);
        }
    }

    return url.toString();
}

// ─── Auth Redirect Helper ──────────────────────────────────────
function requireAuth() {
    if (!isAuthenticated()) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?redirect=${redirect}`;
        return false;
    }
    return true;
}

// ─── Logout Handler ────────────────────────────────────────────
function handleLogout() {
    removeToken();
    showToast('Has cerrado sesión', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ─── Mobile Search Modal ──────────────────────────────────────
function initMobileSearchModal() {
    const trigger = document.getElementById('mobileSearchTrigger');
    const searchForm = document.getElementById('heroSearchForm');
    const backdrop = document.getElementById('mobileSearchBackdrop');
    const closeBtn = document.getElementById('searchModalClose');

    if (!trigger || !searchForm) return;

    function openSearchModal() {
        searchForm.classList.add('mobile-open');
        trigger.classList.add('active');
        if (backdrop) backdrop.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeSearchModal() {
        searchForm.classList.remove('mobile-open');
        trigger.classList.remove('active');
        if (backdrop) backdrop.classList.remove('visible');
        document.body.style.overflow = '';
    }

    trigger.addEventListener('click', () => {
        if (searchForm.classList.contains('mobile-open')) {
            closeSearchModal();
        } else {
            openSearchModal();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSearchModal();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeSearchModal);
    }

    // Allow form submission (search) to work normally
    searchForm.addEventListener('submit', () => {
        // Let the form submit naturally to search.html
        document.body.style.overflow = '';
    });
}

// ─── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Update navigation bar
    updateNav();

    // Initialize location selector (loads saved state, updates brand)
    initLocationSelector();

    // Initialize mobile search modal
    initMobileSearchModal();

    // Hamburger menu toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }

    // Logout button handler
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Handle redirect param after login
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam && isAuthenticated()) {
        window.location.href = redirectParam;
    }

    // Load featured businesses on index page
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        loadFeaturedProperties();
    }

    // Load stats on index page
    const statProperties = document.getElementById('statProperties');
    if (statProperties) {
        loadSiteStats();
    }
});

// ─── Index Page: Featured Properties ───────────────────────────
async function loadFeaturedProperties() {
    const grid = document.getElementById('featuredGrid');
    const emptyState = document.getElementById('featuredEmpty');
    const loading = document.getElementById('featuredLoading');
    if (!grid) return;

    try {
        // Respect selected state
        const selectedState = getSelectedState();
        let endpoint = '/businesses?status=approved&limit=8&featured=1';
        if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;

        const data = await api.get(endpoint);
        let businesses = data.businesses || [];

        // If no featured businesses, get latest approved
        if (businesses.length === 0) {
            let fallbackEndpoint = '/businesses?status=approved&limit=8';
            if (selectedState) fallbackEndpoint += `&state=${encodeURIComponent(selectedState)}`;
            const allData = await api.get(fallbackEndpoint);
            businesses = allData.businesses || [];
        }

        if (loading) loading.remove();

        if (businesses.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = businesses.map(p => createBusinessCard(p)).join('');
    } catch (error) {
        if (loading) loading.remove();
        if (emptyState) emptyState.style.display = '';
        console.error('Error loading featured businesses:', error);
    }
}

// ─── Index Page: Site Stats ────────────────────────────────────
async function loadSiteStats() {
    const statProps = document.getElementById('statProperties');
    const statUsers = document.getElementById('statUsers');
    if (!statProps) return;

    try {
        const data = await api.get('/businesses?status=approved&limit=1');
        const totalApproved = data.pagination?.total || 0;
        statProps.textContent = totalApproved;
    } catch {
        statProps.textContent = '0';
    }

    try {
        // Try to get users count (may fail without auth)
        const data = await api.get('/stats');
        if (data.stats) {
            statProps.textContent = data.stats.approved_businesses || 0;
            if (statUsers) statUsers.textContent = data.stats.total_users || 0;
        }
    } catch {
        // Stats endpoint requires auth/admin - use fallback
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH PAGE (search.html)
// ═══════════════════════════════════════════════════════════════
(function initSearchPage() {
    document.addEventListener('DOMContentLoaded', () => {
        const searchGrid = document.getElementById('searchResultsGrid');
        if (!searchGrid) return; // Not on search page

        // Populate filter fields from URL params
        const params = getSearchParams();
        if (params.estado && document.getElementById('sEstado')) document.getElementById('sEstado').value = params.estado;
        if (params.categoria && document.getElementById('sCategoria')) document.getElementById('sCategoria').value = params.categoria;
        if (params.city && document.getElementById('sCiudad')) document.getElementById('sCiudad').value = params.city;
        if (params.business_type && document.getElementById('sTipoNegocio')) document.getElementById('sTipoNegocio').value = params.business_type;
        if (params.search && document.getElementById('sBusqueda')) document.getElementById('sBusqueda').value = params.search;

        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                executeSearch(1);
            });
        }

        // Sort change
        const sSort = document.getElementById('sSort');
        if (sSort) {
            sSort.addEventListener('change', () => executeSearch(params.page));
        }

        // Extended sort (in collapsible filters)
        const sOrdenar = document.getElementById('sOrdenar');
        if (sOrdenar) {
            sOrdenar.addEventListener('change', () => executeSearch(params.page));
        }

        // Toggle extended filters
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const extendedFilters = document.getElementById('extendedFilters');
        if (toggleFiltersBtn && extendedFilters) {
            toggleFiltersBtn.addEventListener('click', () => {
                extendedFilters.classList.toggle('hidden');
            });
        }

        // View toggle (grid/list)
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                searchGrid.classList.remove('list-view');
                searchGrid.classList.add('grid-view');
                gridViewBtn.classList.add('active');
                listViewBtn.classList.remove('active');
            });
            listViewBtn.addEventListener('click', () => {
                searchGrid.classList.remove('grid-view');
                searchGrid.classList.add('list-view');
                listViewBtn.classList.add('active');
                gridViewBtn.classList.remove('active');
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                window.location.href = 'search.html';
            });
        }

        // Execute initial search
        executeSearch(params.page);
    });

    async function executeSearch(page = 1) {
        const searchLoading = document.getElementById('searchLoading');
        const noResults = document.getElementById('noResults');
        const searchGrid = document.getElementById('searchResultsGrid');
        const resultsCount = document.getElementById('resultsCount');
        const activeFiltersEl = document.getElementById('activeFilters');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const paginationEl = document.getElementById('pagination');

        if (!searchGrid) return;

        // Show loading
        if (searchLoading) searchLoading.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');
        searchGrid.innerHTML = '';
        if (paginationEl) paginationEl.classList.add('hidden');

        // Gather filter values
        const estado = document.getElementById('sEstado')?.value || '';
        const categoria = document.getElementById('sCategoria')?.value || '';
        const ciudad = document.getElementById('sCiudad')?.value?.trim() || '';
        const tipoNegocio = document.getElementById('sTipoNegocio')?.value || '';
        const q = document.getElementById('sBusqueda')?.value?.trim() || '';
        const sort = document.getElementById('sSort')?.value || document.getElementById('sOrdenar')?.value || '';

        // Build API endpoint
        let endpoint = `/businesses?status=approved&page=${page}&limit=12`;
        if (estado) endpoint += `&state=${encodeURIComponent(estado)}`;
        if (categoria) endpoint += `&categoria=${encodeURIComponent(categoria)}`;
        if (ciudad) endpoint += `&city=${encodeURIComponent(ciudad)}`;
        if (tipoNegocio) endpoint += `&business_type=${encodeURIComponent(tipoNegocio)}`;
        if (q) endpoint += `&search=${encodeURIComponent(q)}`;

        // Sort mapping
        const sortMap = {
            'reciente': 'newest',
            'visto': 'views_desc',
        };
        if (sort && sort !== 'relevancia') endpoint += `&sort=${sortMap[sort] || sort}`;

        try {
            const data = await api.get(endpoint);
            const businesses = data.businesses || [];
            const paginationData = data.pagination || {};

            if (searchLoading) searchLoading.classList.add('hidden');

            // Results count
            if (resultsCount) {
                resultsCount.textContent = `${paginationData.total || 0} resultados encontrados`;
            }

            // Active filter tags
            if (activeFiltersEl) {
                let tags = '';
                if (estado) tags += `<span class="active-filter-tag"><i class="fas fa-map"></i> ${estado} <button onclick="this.parentElement.remove(); document.getElementById('sEstado').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (categoria) tags += `<span class="active-filter-tag"><i class="fas fa-tag"></i> ${categoria} <button onclick="this.parentElement.remove(); document.getElementById('sCategoria').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (ciudad) tags += `<span class="active-filter-tag"><i class="fas fa-map-marker-alt"></i> ${ciudad} <button onclick="this.parentElement.remove(); document.getElementById('sCiudad').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (tipoNegocio) tags += `<span class="active-filter-tag">${getBusinessTypeLabel(tipoNegocio)} <button onclick="this.parentElement.remove(); document.getElementById('sTipoNegocio').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (q) tags += `<span class="active-filter-tag"><i class="fas fa-search"></i> "${truncateText(q, 20)}" <button onclick="this.parentElement.remove(); document.getElementById('sBusqueda').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                activeFiltersEl.innerHTML = tags;
                if (clearFiltersBtn) {
                    clearFiltersBtn.classList.toggle('hidden', !tags);
                }
            }

            // No results
            if (businesses.length === 0) {
                if (noResults) noResults.classList.remove('hidden');
                return;
            }

            // Render business cards
            searchGrid.innerHTML = businesses.map(p => createBusinessCard(p)).join('');

            // Pagination
            renderPagination(paginationEl, paginationData, executeSearch);

            // Update URL without reload
            updateSearchURL(estado, categoria, ciudad, tipoNegocio, q, page);

        } catch (error) {
            if (searchLoading) searchLoading.classList.add('hidden');
            searchGrid.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-circle fa-3x"></i><h2>Error de búsqueda</h2><p>No se pudieron cargar los resultados. Intenta nuevamente.</p></div>';
            console.error('Search error:', error);
        }
    }

    function updateSearchURL(estado, categoria, ciudad, tipoNegocio, q, page) {
        const url = new URL(window.location);
        url.searchParams.delete('estado');
        url.searchParams.delete('categoria');
        url.searchParams.delete('ciudad');
        url.searchParams.delete('tipo_negocio');
        url.searchParams.delete('q');
        url.searchParams.delete('page');

        if (estado) url.searchParams.set('estado', estado);
        if (categoria) url.searchParams.set('categoria', categoria);
        if (ciudad) url.searchParams.set('ciudad', ciudad);
        if (tipoNegocio) url.searchParams.set('tipo_negocio', tipoNegocio);
        if (q) url.searchParams.set('q', q);
        if (page && page > 1) url.searchParams.set('page', page);

        window.history.replaceState({}, '', url.toString());
    }

    function renderPagination(container, paginationData, onPageChange) {
        if (!container || !paginationData) return;

        const { page, totalPages, total } = paginationData;

        if (totalPages <= 1) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        const prevBtn = document.getElementById('paginationPrev');
        const nextBtn = document.getElementById('paginationNext');
        const pagesContainer = document.getElementById('paginationPages');

        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= totalPages;

        if (pagesContainer) {
            let html = '';
            const maxVisible = 5;
            let start = Math.max(1, page - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

            if (start > 1) {
                html += `<button class="pagination-btn" data-page="1">1</button>`;
                if (start > 2) html += '<span class="pagination-dots">...</span>';
            }
            for (let i = start; i <= end; i++) {
                html += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            if (end < totalPages) {
                if (end < totalPages - 1) html += '<span class="pagination-dots">...</span>';
                html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            pagesContainer.innerHTML = html;

            pagesContainer.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = parseInt(btn.dataset.page);
                    if (p) onPageChange(p);
                });
            });
        }

        if (prevBtn) {
            prevBtn.onclick = () => { if (page > 1) onPageChange(page - 1); };
        }
        if (nextBtn) {
            nextBtn.onclick = () => { if (page < totalPages) onPageChange(page + 1); };
        }
    }
})();
