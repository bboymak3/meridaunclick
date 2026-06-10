// functions/producto/[slug].js
// GET: Serve SEO-optimized product detail page at /producto/:slug
// Full product "ficha" with all characteristics + associated business/store info

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up product by slug (only approved products) with full business info
    const product = await env.DB.prepare(
      `SELECT p.*, 
              b.title as business_name, b.slug as business_slug, b.city, b.state,
              b.phone as business_phone, b.whatsapp as business_whatsapp,
              b.address as business_address, b.cover_image as business_cover,
              b.instagram as business_instagram, b.website as business_website
       FROM products p
       LEFT JOIN businesses b ON p.business_id = b.id
       WHERE p.slug = ? AND (p.status = 'approved' OR p.status IS NULL)`
    ).bind(slug).first();

    if (!product) {
      // Fallback: try by ID
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT p.*, b.title as business_name, b.slug as business_slug,
                  b.city, b.state, b.phone as business_phone, b.whatsapp as business_whatsapp
           FROM products p
           LEFT JOIN businesses b ON p.business_id = b.id
           WHERE p.id = ? AND (p.status = 'approved' OR p.status IS NULL)`
        ).bind(numericSlug).first();
        if (byId && byId.slug) {
          return new Response('', {
            status: 301,
            headers: { 'Location': `/producto/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Producto no encontrado</h1><p>El producto que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const baseUrl = 'https://aunclick.pages.dev';
    const title = product.name || 'Producto';
    const price = product.price ? `$${Number(product.price).toLocaleString('es-VE')}` : '';
    const description = product.description
      ? product.description.substring(0, 160)
      : `${title} - ${price ? price + ' | ' : ''}Disponible en Un Click Marketplace, Venezuela.`;
    const imageUrl = product.image || `${baseUrl}/logo.png`;
    const canonicalUrl = `${baseUrl}/producto/${product.slug}`;

    // Category badge class
    const catBadge = getCategoryBadgeClass(product.category);
    const catLabel = getCategoryLabel(product.category);
    const catIcon = getCategoryIcon(product.category);

    // WhatsApp link
    const waNumber = product.business_whatsapp ? product.business_whatsapp.replace(/[^0-9]/g, '') : '';
    const waMsg = encodeURIComponent('Hola, estoy interesado en: ' + product.name);
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : '';

    // Business link
    const businessLink = product.business_slug ? `/negocio/${product.business_slug}` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}${price ? ' - ' + price : ''} - Un Click Marketplace</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${escapeHtml(title)}${price ? ' - ' + price : ''}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Un Click Marketplace">
    <meta property="og:locale" content="es_VE">
    <meta property="product:price:amount" content="${product.price || '0'}">
    <meta property="product:price:currency" content="USD">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)} - Un Click">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>U</text></svg>">
    <style>
        .pd-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 24px 16px 64px;
        }
        .pd-breadcrumb {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.82rem;
            color: #94a3b8;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .pd-breadcrumb a {
            color: #059669;
            text-decoration: none;
            font-weight: 500;
        }
        .pd-breadcrumb a:hover {
            text-decoration: underline;
        }
        .pd-breadcrumb .sep {
            color: #cbd5e1;
        }
        .pd-card {
            background: #fff;
            border-radius: 20px;
            border: 1.5px solid #e5e7eb;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .pd-image-section {
            position: relative;
            width: 100%;
            background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
            overflow: hidden;
        }
        .pd-image-section img {
            width: 100%;
            max-height: 480px;
            object-fit: contain;
            display: block;
        }
        .pd-image-placeholder {
            width: 100%;
            height: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 10px;
            color: #059669;
        }
        .pd-image-placeholder i {
            font-size: 3.5rem;
            opacity: 0.3;
        }
        .pd-image-placeholder span {
            font-size: 0.9rem;
            color: #6ee7b7;
            opacity: 0.7;
        }
        .pd-category-badge {
            position: absolute;
            top: 16px;
            left: 16px;
            padding: 6px 14px;
            border-radius: 22px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            backdrop-filter: blur(8px);
            z-index: 2;
            color: #fff;
        }
        .pd-body {
            padding: 28px 28px 24px;
        }
        .pd-title {
            font-size: 1.7rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
            line-height: 1.3;
            letter-spacing: -0.3px;
        }
        .pd-price {
            font-size: 1.5rem;
            font-weight: 800;
            color: #059669;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .pd-price .currency {
            font-size: 0.9rem;
            font-weight: 600;
            color: #64748b;
        }
        .pd-description-label {
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
            margin-bottom: 8px;
        }
        .pd-description {
            font-size: 0.95rem;
            color: #475569;
            line-height: 1.75;
            margin: 0 0 24px 0;
        }
        .pd-meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 28px;
        }
        .pd-meta-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
        }
        .pd-meta-item i {
            font-size: 0.9rem;
            color: #059669;
            width: 20px;
            text-align: center;
            flex-shrink: 0;
        }
        .pd-meta-item .label {
            font-size: 0.72rem;
            color: #94a3b8;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .pd-meta-item .value {
            font-size: 0.88rem;
            color: #1e293b;
            font-weight: 600;
        }
        .pd-divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .pd-business-section {
            padding: 0 28px 28px;
        }
        .pd-business-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 18px 20px;
            background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
            border: 1.5px solid #d1fae5;
            border-radius: 16px;
            text-decoration: none;
            transition: all 0.3s;
        }
        .pd-business-card:hover {
            border-color: #059669;
            box-shadow: 0 6px 20px rgba(5, 150, 105, 0.12);
            transform: translateY(-2px);
        }
        .pd-business-icon {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, #059669, #10b981);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        .pd-business-info {
            flex: 1;
            min-width: 0;
        }
        .pd-business-label {
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6ee7b7;
            margin-bottom: 3px;
        }
        .pd-business-name {
            font-size: 1.05rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .pd-business-location {
            font-size: 0.8rem;
            color: #64748b;
        }
        .pd-business-arrow {
            color: #059669;
            font-size: 0.85rem;
            flex-shrink: 0;
        }
        .pd-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 24px;
        }
        .pd-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 13px 28px;
            border-radius: 12px;
            font-size: 0.92rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s;
            font-family: inherit;
            border: none;
        }
        .pd-btn-whatsapp {
            background: linear-gradient(135deg, #25d366, #128c7e);
            color: #fff;
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
        }
        .pd-btn-whatsapp:hover {
            box-shadow: 0 6px 24px rgba(37, 211, 102, 0.5);
            transform: translateY(-1px);
            color: #fff;
        }
        .pd-btn-share {
            background: #fff;
            color: #475569;
            border: 1.5px solid #e2e8f0;
        }
        .pd-btn-share:hover {
            border-color: #059669;
            color: #059669;
            background: #f0fdf4;
        }
        .pd-btn-back {
            background: #fff;
            color: #475569;
            border: 1.5px solid #e2e8f0;
        }
        .pd-btn-back:hover {
            border-color: #059669;
            color: #059669;
            background: #f0fdf4;
        }
        .pd-btn i {
            font-size: 1rem;
        }

        @media (max-width: 640px) {
            .pd-container {
                padding: 16px 12px 48px;
            }
            .pd-body {
                padding: 20px 18px 18px;
            }
            .pd-business-section {
                padding: 0 18px 18px;
            }
            .pd-title {
                font-size: 1.3rem;
            }
            .pd-price {
                font-size: 1.25rem;
            }
            .pd-meta-grid {
                grid-template-columns: 1fr;
            }
            .pd-actions {
                flex-direction: column;
            }
            .pd-btn {
                justify-content: center;
            }
            .pd-image-section img {
                max-height: 280px;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">
                <i class="fas fa-store"></i>
                <span class="brand-name">Un Click</span>
            </a>
        </div>
    </nav>

    <div class="pd-container">
        <!-- Breadcrumb -->
        <div class="pd-breadcrumb">
            <a href="/"><i class="fas fa-home"></i> Inicio</a>
            <span class="sep"><i class="fas fa-chevron-right" style="font-size:0.6rem;"></i></span>
            <a href="/marketplace.html"><i class="fas fa-shopping-bag"></i> Marketplace</a>
            <span class="sep"><i class="fas fa-chevron-right" style="font-size:0.6rem;"></i></span>
            <span>${escapeHtml(title)}</span>
        </div>

        <!-- Product Card -->
        <div class="pd-card">
            <!-- Image -->
            <div class="pd-image-section">
                ${product.image 
                    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(title)}" onerror="this.parentElement.innerHTML='<div class=\\'pd-image-placeholder\\'><i class=\\'fas fa-image\\'></i><span>Sin imagen</span></div>'">` 
                    : `<div class="pd-image-placeholder"><i class="fas fa-image"></i><span>Sin imagen disponible</span></div>`
                }
                <span class="pd-category-badge ${catBadge}">
                    <i class="fas ${catIcon}"></i> ${catLabel}
                </span>
            </div>

            <!-- Body -->
            <div class="pd-body">
                <h1 class="pd-title">${escapeHtml(title)}</h1>
                ${price ? `<div class="pd-price"><span class="currency">USD</span> ${price}</div>` : ''}

                <div class="pd-description-label">Descripcion</div>
                <p class="pd-description">${escapeHtml(product.description || 'Sin descripcion disponible.')}</p>

                <!-- Meta Grid -->
                <div class="pd-meta-grid">
                    <div class="pd-meta-item">
                        <i class="fas fa-tag"></i>
                        <div>
                            <div class="label">Categoria</div>
                            <div class="value">${catLabel}</div>
                        </div>
                    </div>
                    ${product.created_at ? `
                    <div class="pd-meta-item">
                        <i class="far fa-clock"></i>
                        <div>
                            <div class="label">Publicado</div>
                            <div class="value">${formatDate(product.created_at)}</div>
                        </div>
                    </div>` : ''}
                    ${waNumber ? `
                    <div class="pd-meta-item">
                        <i class="fab fa-whatsapp"></i>
                        <div>
                            <div class="label">Contacto</div>
                            <div class="value">WhatsApp disponible</div>
                        </div>
                    </div>` : ''}
                </div>

                <!-- Action Buttons -->
                <div class="pd-actions">
                    ${waLink ? `
                    <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="pd-btn pd-btn-whatsapp">
                        <i class="fab fa-whatsapp"></i> Contactar por WhatsApp
                    </a>` : ''}
                    <button class="pd-btn pd-btn-share" onclick="shareProduct()">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                    <a href="/marketplace.html" class="pd-btn pd-btn-back">
                        <i class="fas fa-arrow-left"></i> Ver Marketplace
                    </a>
                </div>
            </div>

            ${product.business_name ? `
            <hr class="pd-divider">
            <!-- Business Section -->
            <div class="pd-business-section">
                <div class="pd-description-label" style="padding: 0 0 10px 0;">
                    <i class="fas fa-store" style="color:#059669;"></i> Negocio Asociado
                </div>
                ${businessLink ? `
                <a href="${businessLink}" class="pd-business-card">
                    <div class="pd-business-icon">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="pd-business-info">
                        <div class="pd-business-label">Publicado por</div>
                        <div class="pd-business-name">${escapeHtml(product.business_name)}</div>
                        ${product.city ? `<div class="pd-business-location"><i class="fas fa-map-marker-alt" style="font-size:0.7rem;"></i> ${escapeHtml(product.city)}${product.state ? ', ' + escapeHtml(product.state) : ''}</div>` : ''}
                    </div>
                    <div class="pd-business-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </a>
                ` : `
                <div class="pd-business-card" style="cursor:default;">
                    <div class="pd-business-icon">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="pd-business-info">
                        <div class="pd-business-label">Publicado por</div>
                        <div class="pd-business-name">${escapeHtml(product.business_name)}</div>
                        ${product.city ? `<div class="pd-business-location"><i class="fas fa-map-marker-alt" style="font-size:0.7rem;"></i> ${escapeHtml(product.city)}${product.state ? ', ' + escapeHtml(product.state) : ''}</div>` : ''}
                    </div>
                </div>
                `}
            </div>
            ` : ''}
        </div>
    </div>

    <script>
        function shareProduct() {
            if (navigator.share) {
                navigator.share({
                    title: '${escapeJs(title)}${price ? " - " + escapeJs(price) : ""}',
                    text: '${escapeJs(product.description || product.name)}',
                    url: window.location.href
                }).catch(function(){});
            } else {
                var url = encodeURIComponent(window.location.href);
                var text = encodeURIComponent('${escapeJs(title)} - En Un Click Marketplace');
                window.open('https://wa.me/?text=' + text + '%20' + url, '_blank');
            }
        }
    </script>
    <script src="/js/app.js"></script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Link': `<${canonicalUrl}>; rel="canonical"`,
      },
    });
  } catch (error) {
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function getCategoryBadgeClass(cat) {
  const map = {
    'general': 'badge-general',
    'vehiculos': 'badge-vehiculos',
    'inmuebles': 'badge-inmuebles',
    'electronica': 'badge-electronica',
    'servicios': 'badge-servicios',
    'ropa': 'badge-ropa',
    'hogar': 'badge-hogar',
  };
  return map[cat] || 'badge-general';
}

function getCategoryLabel(cat) {
  const map = {
    'general': 'General',
    'vehiculos': 'Vehiculos',
    'inmuebles': 'Inmuebles',
    'electronica': 'Electronica',
    'servicios': 'Servicios',
    'ropa': 'Ropa',
    'hogar': 'Hogar',
  };
  return map[cat] || cat || 'General';
}

function getCategoryIcon(cat) {
  const map = {
    'general': 'fa-tag',
    'vehiculos': 'fa-car',
    'inmuebles': 'fa-building',
    'electronica': 'fa-laptop',
    'servicios': 'fa-wrench',
    'ropa': 'fa-tshirt',
    'hogar': 'fa-couch',
  };
  return map[cat] || 'fa-tag';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  } catch(e) {
    return dateStr;
  }
}
