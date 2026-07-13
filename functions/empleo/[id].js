// functions/empleo/[id].js
// GET: Serve SEO-optimized job detail page at /empleo/:id

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    const jobId = parseInt(id);
    if (isNaN(jobId)) {
      return new Response('<h1>Empleo no encontrado</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Fetch job with business info
    const job = await env.DB.prepare(
      `SELECT j.*,
              b.title as business_name, b.slug as business_slug,
              b.city as business_city, b.state as business_state,
              b.phone as business_phone, b.whatsapp as business_whatsapp,
              b.instagram as business_instagram, b.facebook as business_facebook,
              b.logo as business_logo
       FROM job_listings j
       LEFT JOIN businesses b ON j.business_id = b.id
       WHERE j.id = ? AND j.status = 'approved'`
    ).bind(jobId).first();

    if (!job) {
      return new Response(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Empleo no encontrado - HolaX</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h1 style="color:#1e293b">Empleo no encontrado</h1><p style="color:#64748b">La oferta que buscas no existe o fue eliminada.</p><a href="/empleo" style="color:#4f46e5;text-decoration:none;margin-top:20px;display:inline-block">Ver todos los empleos</a></body></html>`, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Increment views
    try { await env.DB.prepare('UPDATE job_listings SET views = views + 1 WHERE id = ?').bind(jobId).run(); } catch(e) {}

    // Parse images
    let jobImages = [];
    if (job.images) {
      try {
        const parsed = JSON.parse(job.images);
        if (Array.isArray(parsed)) jobImages = parsed.filter(u => u && u.trim());
      } catch(e) {
        if (job.images.trim()) jobImages = [job.images.trim()];
      }
    }

    // Parse videos
    let jobVideos = [];
    if (job.video_url) {
      try {
        const parsed = JSON.parse(job.video_url);
        if (Array.isArray(parsed)) jobVideos = parsed.filter(u => u && u.trim());
      } catch(e) {
        if (job.video_url.trim()) jobVideos = [job.video_url.trim()];
      }
    }

    // Job type label
    const typeLabels = {
      'tiempo_completo': 'Tiempo Completo',
      'medio_tiempo': 'Medio Tiempo',
      'contrato': 'Contrato',
      'remoto': 'Remoto',
      'freelance': 'Freelance',
    };
    const typeLabel = typeLabels[job.job_type] || job.job_type || 'No especificado';

    const typeColors = {
      'tiempo_completo': '#4f46e5',
      'medio_tiempo': '#0891b2',
      'contrato': '#d97706',
      'remoto': '#059669',
      'freelance': '#7c3aed',
    };
    const typeColor = typeColors[job.job_type] || '#4f46e5';

    const location = [job.city, job.state].filter(Boolean).join(', ') || 'Venezuela';
    const postedDate = job.created_at ? new Date(job.created_at + 'Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha no disponible';
    const salaryText = job.salary || 'No especificado';
    const companyInitials = (job.company_name || 'E').substring(0, 2).toUpperCase();

    // WhatsApp link
    const whatsappMsg = encodeURIComponent(`Hola, vi la oferta de empleo "${job.title}" en HolaX y me interesa aplicar.`);
    const whatsappLink = job.business_whatsapp
      ? `https://wa.me/${job.business_whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`
      : job.contact_phone
        ? `https://wa.me/${job.contact_phone.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`
        : null;

    const businessLink = job.business_slug ? `/negocio/${job.business_slug}` : null;

    // Build gallery HTML
    let galleryHtml = '';
    if (jobImages.length > 0) {
      galleryHtml = `
        <div class="ej-gallery" id="ejGallery">
          <div class="ej-gallery-main" id="ejGalleryMain">
            <img src="${jobImages[0]}" alt="${esc(job.title)}" id="ejMainImg" onclick="openEjLightbox(0)">
          </div>
          ${jobImages.length > 1 ? `
          <div class="ej-gallery-thumbs">
            ${jobImages.map((img, i) => `<img src="${img}" alt="Foto ${i+1}" class="ej-thumb ${i === 0 ? 'active' : ''}" onclick="changeEjImg(${i}, this)">`).join('')}
          </div>` : ''}
        </div>`;
    }

    // Build video HTML
    let videoHtml = '';
    if (jobVideos.length > 0) {
      videoHtml = `<div class="ej-videos">${jobVideos.map(v => embedVideo(v)).join('')}</div>`;
    }

    // Build requirements HTML
    let reqHtml = '';
    if (job.requirements) {
      const reqs = job.requirements.split('\n').filter(r => r.trim());
      reqHtml = `<div class="ej-section"><h3><i class="fas fa-list-check"></i> Requisitos</h3><ul>${reqs.map(r => `<li>${esc(r.trim())}</li>`).join('')}</ul></div>`;
    }

    // Build benefits HTML
    let benHtml = '';
    if (job.benefits) {
      const bens = job.benefits.split('\n').filter(b => b.trim());
      benHtml = `<div class="ej-section"><h3><i class="fas fa-gift"></i> Beneficios</h3><ul>${bens.map(b => `<li>${esc(b.trim())}</li>`).join('')}</ul></div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${esc((job.description || job.title).substring(0, 160))}">
    <title>${esc(job.title)} - ${esc(job.company_name)} - HolaX Empleo</title>
    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .ej-container { max-width: 800px; margin: 0 auto; padding: calc(var(--navbar-height, 64px) + 32px) 20px 60px; }
        .ej-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #64748b; margin-bottom: 28px; flex-wrap: wrap; }
        .ej-breadcrumb a { color: #4f46e5; text-decoration: none; }
        .ej-breadcrumb a:hover { text-decoration: underline; }

        .ej-card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 24px; }
        .ej-card-header { padding: 32px 28px 24px; border-bottom: 1px solid #f1f5f9; }
        .ej-company-row { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .ej-company-logo { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; color: #4f46e5; flex-shrink: 0; overflow: hidden; }
        .ej-company-logo img { width: 100%; height: 100%; object-fit: cover; }
        .ej-company-info { flex: 1; }
        .ej-company-name { font-size: 0.95rem; font-weight: 600; color: #1e293b; }
        .ej-company-name a { color: inherit; text-decoration: none; }
        .ej-company-name a:hover { color: #4f46e5; }
        .ej-posted { font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }

        .ej-title { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin: 0 0 16px; line-height: 1.3; }

        .ej-badges { display: flex; flex-wrap: wrap; gap: 10px; }
        .ej-badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 500; }
        .ej-badge-type { background: ${typeColor}12; color: ${typeColor}; }
        .ej-badge-location { background: #f1f5f9; color: #475569; }
        .ej-badge-salary { background: #ecfdf5; color: #059669; font-weight: 600; }
        .ej-badge-views { background: #f8fafc; color: #94a3b8; }

        .ej-body { padding: 28px; }
        .ej-section { margin-bottom: 28px; }
        .ej-section h3 { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
        .ej-section h3 i { font-size: 0.9rem; color: #4f46e5; }
        .ej-section p { color: #475569; line-height: 1.75; font-size: 0.92rem; margin: 0; white-space: pre-wrap; }
        .ej-section ul { padding-left: 0; list-style: none; margin: 0; }
        .ej-section ul li { padding: 6px 0 6px 24px; position: relative; color: #475569; font-size: 0.9rem; line-height: 1.6; }
        .ej-section ul li::before { content: '\\f00c'; font-family: 'Font Awesome 6 Free'; font-weight: 900; position: absolute; left: 0; color: #4f46e5; font-size: 0.75rem; top: 8px; }

        .ej-cta { padding: 24px 28px; background: linear-gradient(135deg, #f8faff, #eef2ff); border-top: 1px solid #e0e7ff; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ej-cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; transition: all 0.2s; }
        .ej-cta-btn:hover { transform: translateY(-1px); }
        .ej-cta-whatsapp { background: #25D366; color: #fff; }
        .ej-cta-whatsapp:hover { background: #1da851; box-shadow: 0 4px 14px rgba(37,211,102,0.35); }
        .ej-cta-email { background: #fff; color: #4f46e5; border: 2px solid #e0e7ff; }
        .ej-cta-email:hover { background: #eef2ff; }
        .ej-cta-phone { background: #fff; color: #475569; border: 2px solid #e2e8f0; }
        .ej-cta-phone:hover { background: #f8fafc; }

        /* Gallery */
        .ej-gallery { margin-bottom: 24px; }
        .ej-gallery-main { border-radius: 16px; overflow: hidden; background: #f8fafc; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .ej-gallery-main img { width: 100%; height: 100%; object-fit: cover; }
        .ej-gallery-thumbs { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 4px; }
        .ej-thumb { width: 72px; height: 54px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid transparent; opacity: 0.65; transition: all 0.2s; flex-shrink: 0; }
        .ej-thumb.active, .ej-thumb:hover { border-color: #4f46e5; opacity: 1; }

        .ej-videos { margin-bottom: 24px; }
        .ej-videos iframe, .ej-videos video { width: 100%; border-radius: 12px; margin-bottom: 12px; aspect-ratio: 16/9; }

        /* Lightbox */
        .ej-lightbox { display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.92); align-items: center; justify-content: center; flex-direction: column; }
        .ej-lightbox.active { display: flex; }
        .ej-lightbox img { max-width: 92vw; max-height: 82vh; object-fit: contain; border-radius: 8px; }
        .ej-lightbox-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer; z-index: 10001; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .ej-lightbox-close:hover { background: rgba(255,255,255,0.15); }
        .ej-lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.12); border: none; color: #fff; font-size: 1.5rem; cursor: pointer; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10001; }
        .ej-lightbox-nav:hover { background: rgba(255,255,255,0.3); }
        .ej-lightbox-prev { left: 16px; }
        .ej-lightbox-next { right: 16px; }
        .ej-lightbox-counter { color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-top: 12px; }
    </style>
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/index.html" class="nav-logo">
                <img src="/images/favicon.jpeg" alt="HolaX" style="height:32px;width:auto;border-radius:6px;margin-right:4px;">
                <span class="brand-name"><span id="brandCity"></span> HolaX</span>
            </a>
            <button class="nav-toggle" id="navToggle" aria-label="Abrir menú"><i class="fas fa-bars"></i></button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/index.html" class="nav-link">Inicio</a></li>
                <li><a href="/search.html" class="nav-link">Negocios</a></li>
                <li><a href="/properties.html" class="nav-link">Inmuebles</a></li>
                <li><a href="/empleo" class="nav-link active">Empleo</a></li>
                <li><a href="/marketplace.html" class="nav-link">Marketplace</a></li>
                <li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li>
            </ul>
        </div>
    </nav>

    <div class="ej-container">
        <div class="ej-breadcrumb">
            <a href="/"><i class="fas fa-home"></i> Inicio</a>
            <i class="fas fa-chevron-right" style="font-size:0.65rem"></i>
            <a href="/empleo">Empleo</a>
            <i class="fas fa-chevron-right" style="font-size:0.65rem"></i>
            <span>${esc(job.title)}</span>
        </div>

        ${galleryHtml}
        ${videoHtml}

        <div class="ej-card">
            <div class="ej-card-header">
                <div class="ej-company-row">
                    <div class="ej-company-logo">
                        ${job.business_logo ? `<img src="${job.business_logo}" alt="${esc(job.company_name)}">` : companyInitials}
                    </div>
                    <div class="ej-company-info">
                        <div class="ej-company-name">
                            ${businessLink ? `<a href="${businessLink}">${esc(job.company_name)}</a>` : esc(job.company_name)}
                        </div>
                        <div class="ej-posted"><i class="far fa-clock"></i> Publicado ${postedDate}</div>
                    </div>
                </div>

                <h1 class="ej-title">${esc(job.title)}</h1>

                <div class="ej-badges">
                    <span class="ej-badge ej-badge-type"><i class="fas fa-briefcase"></i> ${typeLabel}</span>
                    <span class="ej-badge ej-badge-location"><i class="fas fa-map-marker-alt"></i> ${esc(location)}</span>
                    <span class="ej-badge ej-badge-salary"><i class="fas fa-dollar-sign"></i> ${esc(salaryText)}</span>
                    <span class="ej-badge ej-badge-views"><i class="far fa-eye"></i> ${job.views || 0} vistas</span>
                </div>
            </div>

            ${job.description ? `<div class="ej-body"><div class="ej-section"><h3><i class="fas fa-align-left"></i> Descripcion</h3><p>${esc(job.description)}</p></div>${reqHtml}${benHtml}</div>` : ''}

            ${(whatsappLink || job.contact_email || job.contact_phone) ? `
            <div class="ej-cta">
                ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" class="ej-cta-btn ej-cta-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
                ${job.contact_email ? `<a href="mailto:${esc(job.contact_email)}" class="ej-cta-btn ej-cta-email"><i class="fas fa-envelope"></i> Email</a>` : ''}
                ${job.contact_phone ? `<a href="tel:${esc(job.contact_phone)}" class="ej-cta-btn ej-cta-phone"><i class="fas fa-phone"></i> Llamar</a>` : ''}
            </div>` : ''}
        </div>
    </div>

    <!-- Lightbox -->
    <div class="ej-lightbox" id="ejLightbox">
        <button class="ej-lightbox-close" onclick="closeEjLightbox()">&times;</button>
        <button class="ej-lightbox-nav ej-lightbox-prev" onclick="event.stopPropagation();navEjLightbox(-1)"><i class="fas fa-chevron-left"></i></button>
        <button class="ej-lightbox-nav ej-lightbox-next" onclick="event.stopPropagation();navEjLightbox(1)"><i class="fas fa-chevron-right"></i></button>
        <div class="ej-lightbox-counter" id="ejLightboxCounter"></div>
    </div>

    <script src="/js/app.js"></script>
    <script>
        const _ejImages = ${JSON.stringify(jobImages)};

        function changeEjImg(idx, thumbEl) {
            document.getElementById('ejMainImg').src = _ejImages[idx];
            document.querySelectorAll('.ej-thumb').forEach(t => t.classList.remove('active'));
            if (thumbEl) thumbEl.classList.add('active');
        }

        let _ejLbIdx = 0;
        function openEjLightbox(idx) {
            _ejLbIdx = idx;
            const lb = document.getElementById('ejLightbox');
            lb.classList.add('active');
            renderEjLightbox();
        }
        function closeEjLightbox() {
            document.getElementById('ejLightbox').classList.remove('active');
        }
        function navEjLightbox(dir) {
            _ejLbIdx = (_ejLbIdx + dir + _ejImages.length) % _ejImages.length;
            renderEjLightbox();
        }
        function renderEjLightbox() {
            const lb = document.getElementById('ejLightbox');
            let existing = lb.querySelector('img');
            if (!existing) {
                existing = document.createElement('img');
                lb.insertBefore(existing, lb.querySelector('.ej-lightbox-close'));
            }
            existing.src = _ejImages[_ejLbIdx];
            document.getElementById('ejLightboxCounter').textContent = _ejImages.length > 1 ? (_ejLbIdx + 1) + ' / ' + _ejImages.length : '';
            lb.querySelector('.ej-lightbox-prev').style.display = _ejImages.length > 1 ? '' : 'none';
            lb.querySelector('.ej-lightbox-next').style.display = _ejImages.length > 1 ? '' : 'none';
        }
        document.getElementById('ejLightbox').addEventListener('click', function(e) { if (e.target === this) closeEjLightbox(); });
        document.addEventListener('keydown', function(e) {
            if (!document.getElementById('ejLightbox').classList.contains('active')) return;
            if (e.key === 'Escape') closeEjLightbox();
            if (e.key === 'ArrowLeft') navEjLightbox(-1);
            if (e.key === 'ArrowRight') navEjLightbox(1);
        });

        if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }
    </script>
</body>
</html>`;

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function embedVideo(url) {
        if (!url) return '';
        const ytMatch = url.match(/(?:youtube\\.com\\/(?:watch\\?v=|embed\\/)|youtu\\.be\\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
        if (url.match(/\\.(mp4|webm|ogg)$/i)) return `<video src="${url}" controls preload="metadata"></video>`;
        return `<iframe src="${url}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new Response(`<h1>Error</h1><p>${error.message}</p>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}