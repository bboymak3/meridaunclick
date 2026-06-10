// functions/web/[slug].js
// GET: Standalone landing page for a business at /web/:slug
// Full one-page website generated from business data, SEO-friendly, shareable

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Business data
    const business = await env.DB.prepare(
      `SELECT 
        b.*,
        c.name as category_name,
        (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT COUNT(*) FROM products WHERE business_id = b.id AND (status = 'approved' OR status IS NULL)) as product_count,
        (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.slug = ? AND b.status = 'approved'`
    ).bind(slug).first();

    if (!business) {
      return new Response('<h1>Negocio no encontrado</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Products
    const products = await env.DB.prepare(
      `SELECT id, name, price, slug, image, description
       FROM products WHERE business_id = ? AND (status = 'approved' OR status IS NULL)
       ORDER BY sort_order ASC, created_at DESC LIMIT 12`
    ).bind(business.id).all();

    // Images gallery
    const images = await env.DB.prepare(
      `SELECT url, is_cover FROM images WHERE business_id = ? ORDER BY is_cover DESC, id ASC LIMIT 10`
    ).bind(business.id).all();

    const baseUrl = 'https://aunclick.pages.dev';
    const title = business.title || 'Negocio';
    const fullDescription = business.description || '';
    const metaDescription = fullDescription
      ? fullDescription.substring(0, 160)
      : `Visita ${title} - ${business.category_name || 'Negocio'} en ${business.city || 'Venezuela'}. ${fullDescription ? fullDescription.substring(0, 100) : ''}`;
    const imageUrl = business.cover_image || `${baseUrl}/logo.png`;
    const whatsappNumber = (business.whatsapp || business.phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, vi tu pagina web en Un Click y me interesa conocer mas sobre ' + title)}`
      : '#';
    const phoneClean = (business.phone || '').replace(/[^0-9]/g, '');
    const mapQuery = encodeURIComponent(`${business.address || ''} ${business.city || ''} ${business.state || ''} Venezuela`);

    // Generate "Why choose us" points from business data
    const whyUs = [];
    if (business.category_name) whyUs.push({ icon: 'fas fa-award', title: `Expertos en ${business.category_name}`, desc: `Somos un negocio especializado en ${business.category_name.toLowerCase()} con compromiso de calidad.` });
    if (business.city || business.state) whyUs.push({ icon: 'fas fa-map-marker-alt', title: `Ubicados en ${business.city || business.state || 'Venezuela'}`, desc: `Atendemos directamente en ${business.city || business.state || 'tu zona'} con atencion personalizada.` });
    if (business.has_delivery) whyUs.push({ icon: 'fas fa-motorcycle', title: 'Servicio de Delivery', desc: 'Te llevamos nuestros productos directamente a la puerta de tu casa.' });
    if (business.has_parking) whyUs.push({ icon: 'fas fa-car', title: 'Estacionamiento Disponible', desc: 'Contamos con parking para que visites con comodidad.' });
    if (business.has_wifi) whyUs.push({ icon: 'fas fa-wifi', title: 'WiFi Gratuito', desc: 'Disfruta de conexion WiFi gratis mientras nos visitas.' });
    if (business.has_card) whyUs.push({ icon: 'fas fa-credit-card', title: 'Pago con Tarjeta', desc: 'Aceptamos pagos con tarjeta por tu comodidad.' });
    if (business.has_outdoor) whyUs.push({ icon: 'fas fa-umbrella-beach', title: 'Area al Aire Libre', desc: 'Disfruta de un ambiente al aire libre en nuestras instalaciones.' });
    if (whatsappNumber) whyUs.push({ icon: 'fab fa-whatsapp', title: 'Atencion por WhatsApp', desc: 'Escribenos al instante y te respondemos rapidamente.' });
    if (business.schedule) whyUs.push({ icon: 'fas fa-clock', title: 'Horarios Flexibles', desc: `Abierto: ${business.schedule}. Siempre disponibles para ti.` });
    if (fullDescription.length > 50) whyUs.push({ icon: 'fas fa-heart', title: 'Compromiso con el Cliente', desc: 'Nuestra prioridad es brindarte la mejor experiencia y atencion.' });
    // Ensure at least 4 items
    if (whyUs.length < 4) {
      whyUs.push({ icon: 'fas fa-star', title: 'Calidad Garantizada', desc: 'Trabajamos cada dia para ofrecerte los mejores productos y servicios.' });
    }
    if (whyUs.length < 4) {
      whyUs.push({ icon: 'fas fa-users', title: 'Clientes Satisfechos', desc: 'La satisfaccion de nuestros clientes es nuestro mayor reconocimiento.' });
    }

    // Generate FAQ from business data
    const faqs = [];
    faqs.push({ q: `Que es ${title}?`, a: `${title} es un negocio de ${business.category_name ? business.category_name.toLowerCase() : 'servicios'}${business.city ? ' ubicado en ' + business.city + (business.state ? ', ' + business.state : '') : ' en Venezuela'}.${fullDescription ? ' ' + fullDescription : ''}` });
    if (business.address) faqs.push({ q: `Cual es la direccion de ${title}?`, a: `${title} se encuentra en ${business.address}${business.city ? ', ' + business.city : ''}. Puedes visitarnos o contactarnos para mayor informacion.` });
    if (whatsappNumber) faqs.push({ q: `Como puedo contactar a ${title}?`, a: `Puedes contactarnos por WhatsApp al ${business.whatsapp || business.phone}${phoneClean ? ', o llamar al ' + business.phone : ''}. Tambien puedes escribirnos a traves del boton de WhatsApp en esta pagina.` });
    if (business.schedule) faqs.push({ q: `Cual es el horario de atencion?`, a: `Nuestro horario de atencion es: ${business.schedule}. Te recomendamos contactarnos por WhatsApp para confirmar disponibilidad.` });
    if (business.has_delivery) faqs.push({ q: `Hacen delivery?`, a: `Si! ${title} cuenta con servicio de delivery. Contactanos por WhatsApp para hacer tu pedido y te lo llevamos a la puerta de tu casa.` });
    if (business.has_card) faqs.push({ q: `Aceptan pagos con tarjeta?`, a: `Si, aceptamos pagos con tarjeta de credito y debito para tu mayor comodidad.` });
    faqs.push({ q: `Tienen redes sociales?`, a: `Puedes seguirnos${business.instagram ? ' en Instagram: ' + business.instagram : ''}${business.facebook ? ' y en Facebook: ' + business.facebook : ''}. Ahi publicamos nuestras novedades y promociones.` });

    // Generate services from description keywords
    const services = extractServices(fullDescription, business);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <title>${escapeHtml(title)} - ${escapeHtml(business.category_name || 'Negocio')} en ${escapeHtml(business.city || 'Venezuela')} | Un Click</title>
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="${baseUrl}/negocio/${business.slug}">

    <!-- Open Graph -->
    <meta property="og:type" content="business.business">
    <meta property="og:title" content="${escapeHtml(title)} - ${escapeHtml(business.category_name || '')} en ${escapeHtml(business.city || '')}">
    <meta property="og:description" content="${escapeHtml(metaDescription)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${baseUrl}/web/${business.slug}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
    <meta name="twitter:image" content="${imageUrl}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1a1a2e; line-height: 1.6; background: #fff;
        }
        a { text-decoration: none; color: inherit; }
        img { max-width: 100%; }

        /* === NAV === */
        .lp-nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 20px;
            display: flex; align-items: center; justify-content: space-between;
            transition: box-shadow 0.3s;
        }
        .lp-nav.scrolled { box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
        .lp-nav-brand {
            font-size: 1.1rem; font-weight: 700; color: #059669;
            display: flex; align-items: center; gap: 6px;
        }
        .lp-nav-brand i { font-size: 1.3rem; }
        .lp-nav-links { display: flex; gap: 16px; align-items: center; }
        .lp-nav-links a {
            font-size: 0.82rem; font-weight: 600; color: #64748b; transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: #059669; }
        .lp-nav-cta {
            background: #25d366 !important; color: #fff !important;
            padding: 8px 16px; border-radius: 8px;
            font-size: 0.82rem !important; font-weight: 600 !important;
            display: flex; align-items: center; gap: 6px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(37,211,102,0.3); }
        @media (max-width: 768px) {
            .lp-nav-links a:not(.lp-nav-cta) { display: none; }
        }

        /* === HERO === */
        .lp-hero {
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            position: relative; overflow: hidden;
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
            padding: 100px 20px 60px;
        }
        .lp-hero-bg {
            position: absolute; inset: 0;
            background-image: url('${business.cover_image || ''}');
            background-size: cover; background-position: center;
            opacity: 0.15;
        }
        .lp-hero-pattern {
            position: absolute; inset: 0; opacity: 0.05;
            background-image: radial-gradient(circle at 25px 25px, white 2%, transparent 0%);
            background-size: 50px 50px;
        }
        .lp-hero-content {
            position: relative; z-index: 2;
            text-align: center; max-width: 700px;
        }
        .lp-hero-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
            padding: 8px 20px; border-radius: 50px;
            font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.9);
            margin-bottom: 24px;
        }
        .lp-hero-title {
            font-size: 3.2rem; font-weight: 800; color: #fff;
            line-height: 1.15; margin-bottom: 16px; letter-spacing: -0.5px;
        }
        .lp-hero-subtitle {
            font-size: 1.15rem; color: rgba(255,255,255,0.85);
            margin-bottom: 32px; max-width: 550px; margin-left: auto; margin-right: auto;
            line-height: 1.7;
        }
        .lp-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .lp-hero-stats {
            display: flex; gap: 32px; justify-content: center; margin-top: 48px;
            flex-wrap: wrap;
        }
        .lp-hero-stat {
            text-align: center;
        }
        .lp-hero-stat-value {
            font-size: 1.5rem; font-weight: 800; color: #fff;
        }
        .lp-hero-stat-label {
            font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase;
            letter-spacing: 1px;
        }
        .lp-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 28px; border-radius: 12px;
            font-size: 1rem; font-weight: 700;
            transition: all 0.3s; border: none; cursor: pointer;
        }
        .lp-btn-whatsapp {
            background: #25d366; color: #fff;
            box-shadow: 0 4px 20px rgba(37,211,102,0.4);
        }
        .lp-btn-whatsapp:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(37,211,102,0.5); }
        .lp-btn-phone {
            background: rgba(255,255,255,0.15); color: #fff;
            backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.25);
        }
        .lp-btn-phone:hover { background: rgba(255,255,255,0.25); }
        .lp-btn-outline {
            background: transparent; color: #059669; border: 2px solid #059669;
        }
        .lp-btn-outline:hover { background: #059669; color: #fff; }
        @media (max-width: 768px) {
            .lp-hero { min-height: 90vh; padding: 80px 20px 40px; }
            .lp-hero-title { font-size: 2.2rem; }
            .lp-hero-subtitle { font-size: 1rem; }
            .lp-btn { padding: 12px 22px; font-size: 0.9rem; }
            .lp-hero-stats { gap: 20px; }
        }

        /* === SECTIONS === */
        .lp-section { padding: 80px 20px; }
        .lp-section-grey { background: #f8fafb; }
        .lp-container { max-width: 960px; margin: 0 auto; }
        .lp-section-header { text-align: center; margin-bottom: 48px; }
        .lp-section-label {
            font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 2px; color: #059669; margin-bottom: 8px;
        }
        .lp-section-title {
            font-size: 2rem; font-weight: 800; color: #0f172a;
            line-height: 1.3; margin-bottom: 12px;
        }
        .lp-section-desc {
            font-size: 1rem; color: #64748b; max-width: 550px; margin: 0 auto; line-height: 1.7;
        }

        /* === ABOUT / QUIENES SOMOS === */
        .lp-about-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
        }
        .lp-about-image {
            width: 100%; border-radius: 20px; object-fit: cover; aspect-ratio: 4/3;
            box-shadow: 0 12px 40px rgba(0,0,0,0.1);
        }
        .lp-about-text {
            font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;
        }
        .lp-about-highlights {
            display: flex; flex-direction: column; gap: 12px; margin-top: 20px;
        }
        .lp-about-highlight {
            display: flex; align-items: center; gap: 12px;
            font-size: 0.95rem; color: #334155; font-weight: 500;
        }
        .lp-about-highlight i {
            color: #059669; font-size: 0.85rem; width: 24px; height: 24px;
            background: #ecfdf5; border-radius: 50%; display: flex; align-items: center;
            justify-content: center; flex-shrink: 0;
        }
        @media (max-width: 768px) {
            .lp-about-grid { grid-template-columns: 1fr; gap: 24px; }
        }

        /* === SERVICES === */
        .lp-services-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;
        }
        .lp-service-card {
            background: #fff; border-radius: 16px; padding: 28px;
            border: 1px solid #e5e7eb;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-service-card:hover {
            transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }
        .lp-service-icon {
            width: 52px; height: 52px; border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem; margin-bottom: 16px;
        }
        .lp-service-icon.green { background: #ecfdf5; color: #059669; }
        .lp-service-icon.blue { background: #eff6ff; color: #2563eb; }
        .lp-service-icon.amber { background: #fffbeb; color: #d97706; }
        .lp-service-icon.purple { background: #faf5ff; color: #7c3aed; }
        .lp-service-icon.rose { background: #fff1f2; color: #e11d48; }
        .lp-service-icon.teal { background: #f0fdfa; color: #0d9488; }
        .lp-service-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .lp-service-desc { font-size: 0.9rem; color: #64748b; line-height: 1.6; }

        /* === WHY US === */
        .lp-why-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;
        }
        .lp-why-card {
            background: #fff; border-radius: 16px; padding: 28px;
            border: 1px solid #e5e7eb; transition: transform 0.2s, box-shadow 0.2s;
            display: flex; gap: 16px; align-items: flex-start;
        }
        .lp-why-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        .lp-why-icon {
            width: 48px; height: 48px; border-radius: 12px;
            background: linear-gradient(135deg, #059669, #047857);
            color: #fff; display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .lp-why-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .lp-why-desc { font-size: 0.88rem; color: #64748b; line-height: 1.6; }

        /* === PRODUCTS === */
        .lp-products-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;
        }
        .lp-product-card {
            background: #fff; border-radius: 16px; overflow: hidden;
            border: 1px solid #e5e7eb; transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-product-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        .lp-product-img { width: 100%; height: 180px; object-fit: cover; background: #f1f5f9; }
        .lp-product-body { padding: 18px; }
        .lp-product-name {
            font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 6px;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .lp-product-desc {
            font-size: 0.82rem; color: #64748b; line-height: 1.5; margin-bottom: 10px;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .lp-product-price { font-size: 1.15rem; font-weight: 800; color: #059669; }
        .lp-product-footer {
            padding: 0 18px 18px;
        }
        .lp-product-wa {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;
            background: #ecfdf5; color: #059669; transition: all 0.2s;
        }
        .lp-product-wa:hover { background: #059669; color: #fff; }

        /* === INFO CARDS === */
        .lp-info-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 32px;
        }
        .lp-info-card {
            background: #fff; border-radius: 16px; padding: 24px;
            border: 1px solid #e5e7eb;
            display: flex; align-items: flex-start; gap: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-info-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        .lp-info-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem; flex-shrink: 0;
        }
        .lp-info-icon.green { background: #ecfdf5; color: #059669; }
        .lp-info-icon.blue { background: #eff6ff; color: #2563eb; }
        .lp-info-icon.amber { background: #fffbeb; color: #d97706; }
        .lp-info-icon.purple { background: #faf5ff; color: #7c3aed; }
        .lp-info-icon.red { background: #fef2f2; color: #dc2626; }
        .lp-info-icon.pink { background: #fdf2f8; color: #db2777; }
        .lp-info-card-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 2px; }
        .lp-info-card-value { font-size: 1rem; font-weight: 700; color: #0f172a; }
        .lp-info-card-value a { color: #059669; }
        .lp-info-card-value a:hover { text-decoration: underline; }

        /* === GALLERY === */
        .lp-gallery-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;
        }
        .lp-gallery-img {
            width: 100%; height: 180px; object-fit: cover;
            border-radius: 12px; cursor: pointer; transition: transform 0.3s;
        }
        .lp-gallery-img:hover { transform: scale(1.03); }

        /* === FAQ === */
        .lp-faq-list { max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .lp-faq-item {
            background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
            overflow: hidden; transition: box-shadow 0.2s;
        }
        .lp-faq-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
        .lp-faq-q {
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 22px; cursor: pointer; font-weight: 600; color: #0f172a;
            font-size: 0.95rem; gap: 12px; user-select: none;
        }
        .lp-faq-q i { color: #059669; transition: transform 0.3s; font-size: 0.8rem; flex-shrink: 0; }
        .lp-faq-item.open .lp-faq-q i { transform: rotate(180deg); }
        .lp-faq-a {
            max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease;
            padding: 0 22px; font-size: 0.92rem; color: #475569; line-height: 1.7;
        }
        .lp-faq-item.open .lp-faq-a { max-height: 300px; padding: 0 22px 18px; }

        /* === SOCIAL === */
        .lp-social-grid {
            display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
        }
        .lp-social-card {
            display: flex; align-items: center; gap: 14px;
            padding: 18px 28px; border-radius: 14px;
            border: 1px solid #e5e7eb; background: #fff;
            transition: transform 0.2s, box-shadow 0.2s;
            font-weight: 600; font-size: 0.95rem; color: #0f172a;
        }
        .lp-social-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.06); }
        .lp-social-card i { font-size: 1.4rem; }
        .lp-social-card.ig i { color: #e4405f; }
        .lp-social-card.fb i { color: #1877f2; }
        .lp-social-card.wa i { color: #25d366; }
        .lp-social-card.web i { color: #0ea5e9; }

        /* === MAP === */
        .lp-map-container { border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; height: 350px; }
        .lp-map-container iframe { width: 100%; height: 100%; border: none; }

        /* === CTA === */
        .lp-cta { background: linear-gradient(135deg, #059669 0%, #047857 100%); text-align: center; color: #fff; }
        .lp-cta-title { font-size: 2rem; font-weight: 800; margin-bottom: 12px; }
        .lp-cta-text { font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.7; }
        .lp-cta-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* === FOOTER === */
        .lp-footer { background: #0f172a; color: #94a3b8; text-align: center; padding: 40px 20px; font-size: 0.85rem; }
        .lp-footer-brand { color: #059669; font-weight: 700; }
        .lp-footer a { color: #059669; }
        .lp-footer a:hover { text-decoration: underline; }
        .lp-footer-links { display: flex; gap: 20px; justify-content: center; margin-top: 12px; }
        .lp-footer-copy { margin-top: 20px; font-size: 0.78rem; color: #475569; }

        /* === MOBILE CTA BAR === */
        .lp-mobile-cta {
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
            background: #fff; border-top: 1px solid #e5e7eb;
            padding: 12px 20px; display: none; gap: 10px;
        }
        .lp-mobile-cta a {
            flex: 1; text-align: center; padding: 12px;
            border-radius: 10px; font-size: 0.85rem; font-weight: 700;
            display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .lp-mobile-cta .wa-btn { background: #25d366; color: #fff; }
        .lp-mobile-cta .call-btn { background: #059669; color: #fff; }
        @media (max-width: 768px) {
            .lp-mobile-cta { display: flex; }
            .lp-section { padding: 60px 16px; }
            .lp-cta { padding-bottom: 80px; }
            .lp-fab { bottom: 80px; }
            .lp-hero-stats { gap: 16px; }
        }

        /* === Floating WhatsApp FAB === */
        .lp-fab {
            position: fixed; bottom: 28px; right: 28px; z-index: 200;
            width: 60px; height: 60px; border-radius: 50%;
            background: #25d366; color: #fff; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.8rem; box-shadow: 0 4px 20px rgba(37,211,102,0.4);
            transition: transform 0.3s, box-shadow 0.3s;
            animation: fabPulse 2s ease-in-out infinite;
        }
        .lp-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(37,211,102,0.5); }
        .lp-fab-tooltip {
            position: absolute; right: 72px; top: 50%; transform: translateY(-50%);
            background: #fff; color: #0f172a; padding: 8px 14px; border-radius: 10px;
            font-size: 0.82rem; font-weight: 600; white-space: nowrap;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            opacity: 0; pointer-events: none; transition: opacity 0.2s;
        }
        .lp-fab-tooltip::after {
            content: ''; position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
            border: 6px solid transparent; border-left-color: #fff;
        }
        .lp-fab:hover .lp-fab-tooltip { opacity: 1; }
        @keyframes fabPulse {
            0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.4); }
            50% { box-shadow: 0 4px 30px rgba(37,211,102,0.6), 0 0 0 8px rgba(37,211,102,0.1); }
        }
    </style>
</head>
<body>

<!-- NAV -->
<nav class="lp-nav" id="lpNav">
    <a href="${baseUrl}/index.html" class="lp-nav-brand">
        <i class="fas fa-store"></i> Un Click
    </a>
    <div class="lp-nav-links">
        <a href="#about">Nosotros</a>
        <a href="#services">Servicios</a>
        ${products.results.length > 0 ? '<a href="#products">Productos</a>' : ''}
        <a href="#faq">FAQ</a>
        <a href="#contact">Contacto</a>
        ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-nav-cta"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
    </div>
</nav>

<!-- HERO -->
<section class="lp-hero" id="hero">
    ${business.cover_image ? '<div class="lp-hero-bg"></div>' : ''}
    <div class="lp-hero-pattern"></div>
    <div class="lp-hero-content">
        <div class="lp-hero-badge">
            <i class="fas fa-map-marker-alt"></i>
            ${escapeHtml(business.city || '')}${business.state ? ', ' + escapeHtml(business.state) : ''}
            ${business.category_name ? ' &middot; ' + escapeHtml(business.category_name) : ''}
        </div>
        <h1 class="lp-hero-title">${escapeHtml(title)}</h1>
        <p class="lp-hero-subtitle">${escapeHtml(fullDescription || business.category_name || 'Conoce nuestros servicios y productos. Estamos para atenderte.')}</p>
        <div class="lp-hero-actions">
            ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-btn lp-btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>` : ''}
            ${phoneClean ? `<a href="tel:${phoneClean}" class="lp-btn lp-btn-phone"><i class="fas fa-phone"></i> ${escapeHtml(business.phone || '')}</a>` : ''}
        </div>
        <div class="lp-hero-stats">
            ${business.category_name ? `<div class="lp-hero-stat"><div class="lp-hero-stat-value">${escapeHtml(business.category_name)}</div><div class="lp-hero-stat-label">Categoria</div></div>` : ''}
            ${business.product_count > 0 ? `<div class="lp-hero-stat"><div class="lp-hero-stat-value">${business.product_count}</div><div class="lp-hero-stat-label">Productos</div></div>` : ''}
            ${business.image_count > 1 ? `<div class="lp-hero-stat"><div class="lp-hero-stat-value">${business.image_count}</div><div class="lp-hero-stat-label">Fotos</div></div>` : ''}
            <div class="lp-hero-stat"><div class="lp-hero-stat-value">${business.city || 'Venezuela'}</div><div class="lp-hero-stat-label">Ubicacion</div></div>
        </div>
    </div>
</section>

<!-- ABOUT / QUIENES SOMOS -->
<section class="lp-section ${fullDescription ? '' : 'lp-section-grey'}" id="about">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Quienes Somos</div>
            <h2 class="lp-section-title">Conoce ${escapeHtml(title)}</h2>
            <p class="lp-section-desc">${fullDescription ? escapeHtml(fullDescription.substring(0, 120)) + '...' : 'Nos dedicamos a ofrecer los mejores servicios en ' + (business.city || 'Venezuela') + '.'}</p>
        </div>
        ${fullDescription && business.cover_image ? `
        <div class="lp-about-grid">
            <div>
                <p class="lp-about-text">${escapeHtml(fullDescription)}</p>
                <div class="lp-about-highlights">
                    ${business.category_name ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Especialistas en ${escapeHtml(business.category_name.toLowerCase())}</div>` : ''}
                    ${business.city ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Ubicados en ${escapeHtml(business.city + (business.state ? ', ' + business.state : ''))}</div>` : ''}
                    ${whatsappNumber ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Atencion inmediata por WhatsApp</div>` : ''}
                    ${business.schedule ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Horario: ${escapeHtml(business.schedule)}</div>` : ''}
                </div>
            </div>
            <img src="${escapeHtml(business.cover_image)}" alt="${escapeHtml(title)}" class="lp-about-image" loading="lazy">
        </div>
        ` : `
        <div class="lp-about-grid" style="max-width:700px;margin:0 auto;">
            <div>
                <p class="lp-about-text">${fullDescription ? escapeHtml(fullDescription) : escapeHtml(title) + ' es un negocio de ' + (business.category_name ? business.category_name.toLowerCase() : 'servicios generales') + ' ubicado en ' + (business.city || 'Venezuela') + '. Nos caracterizamos por ofrecer un servicio de calidad y atencion personalizada a cada uno de nuestros clientes.'}</p>
                <div class="lp-about-highlights">
                    ${business.category_name ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Especialistas en ${escapeHtml(business.category_name.toLowerCase())}</div>` : ''}
                    ${business.city ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Ubicados en ${escapeHtml(business.city + (business.state ? ', ' + business.state : ''))}</div>` : ''}
                    ${whatsappNumber ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Atencion inmediata por WhatsApp</div>` : ''}
                    ${business.has_delivery ? `<div class="lp-about-highlight"><i class="fas fa-check"></i> Servicio de delivery disponible</div>` : ''}
                </div>
            </div>
        </div>
        `}
    </div>
</section>

<!-- SERVICES / QUE OFRECEMOS -->
${services.length > 0 ? `
<section class="lp-section lp-section-grey" id="services">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Nuestros Servicios</div>
            <h2 class="lp-section-title">Que Ofrecemos</h2>
            <p class="lp-section-desc">Conoce todo lo que ${escapeHtml(title)} tiene para ofrecerte.</p>
        </div>
        <div class="lp-services-grid">
            ${services.map(s => `
                <div class="lp-service-card">
                    <div class="lp-service-icon ${s.color}"><i class="${s.icon}"></i></div>
                    <div class="lp-service-title">${escapeHtml(s.title)}</div>
                    <div class="lp-service-desc">${escapeHtml(s.desc)}</div>
                </div>
            `).join('')}
        </div>
    </div>
</section>
` : ''}

<!-- WHY US / POR QUE ELEGIRNOS -->
<section class="lp-section">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Por Que Elegirnos</div>
            <h2 class="lp-section-title">Razones para confiar en ${escapeHtml(title)}</h2>
        </div>
        <div class="lp-why-grid">
            ${whyUs.slice(0, 6).map(w => `
                <div class="lp-why-card">
                    <div class="lp-why-icon"><i class="${w.icon}"></i></div>
                    <div>
                        <div class="lp-why-title">${escapeHtml(w.title)}</div>
                        <div class="lp-why-desc">${escapeHtml(w.desc)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</section>

<!-- PRODUCTS -->
${products.results.length > 0 ? `
<section class="lp-section lp-section-grey" id="products">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Productos</div>
            <h2 class="lp-section-title">Nuestros Productos</h2>
            <p class="lp-section-desc">Explora nuestro catalogo de productos disponibles.</p>
        </div>
        <div class="lp-products-grid">
            ${products.results.map(p => `
                <div class="lp-product-card">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="lp-product-img" loading="lazy" onerror="this.style.display='none'">` : '<div style="height:180px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="font-size:2.5rem;color:#cbd5e1;"></i></div>'}
                    <div class="lp-product-body">
                        <div class="lp-product-name">${escapeHtml(p.name)}</div>
                        ${p.description ? `<div class="lp-product-desc">${escapeHtml(p.description)}</div>` : ''}
                        ${p.price ? `<div class="lp-product-price">${escapeHtml(String(p.price))}</div>` : ''}
                    </div>
                    ${whatsappNumber ? `<div class="lp-product-footer"><a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-product-wa"><i class="fab fa-whatsapp"></i> Consultar</a></div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</section>
` : ''}

<!-- INFO -->
<section class="lp-section" id="info">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Informacion</div>
            <h2 class="lp-section-title">Datos del Negocio</h2>
        </div>
        <div class="lp-info-grid">
            <div class="lp-info-card">
                <div class="lp-info-icon green"><i class="fas fa-map-marker-alt"></i></div>
                <div>
                    <div class="lp-info-card-label">Direccion</div>
                    <div class="lp-info-card-value">${escapeHtml(business.address || business.city || 'No disponible')}</div>
                </div>
            </div>
            ${business.category_name ? `
            <div class="lp-info-card">
                <div class="lp-info-icon blue"><i class="fas fa-tag"></i></div>
                <div>
                    <div class="lp-info-card-label">Categoria</div>
                    <div class="lp-info-card-value">${escapeHtml(business.category_name)}</div>
                </div>
            </div>` : ''}
            ${business.phone ? `
            <div class="lp-info-card">
                <div class="lp-info-icon amber"><i class="fas fa-phone"></i></div>
                <div>
                    <div class="lp-info-card-label">Telefono</div>
                    <div class="lp-info-card-value"><a href="tel:${phoneClean}">${escapeHtml(business.phone)}</a></div>
                </div>
            </div>` : ''}
            ${business.whatsapp ? `
            <div class="lp-info-card">
                <div class="lp-info-icon green"><i class="fab fa-whatsapp"></i></div>
                <div>
                    <div class="lp-info-card-label">WhatsApp</div>
                    <div class="lp-info-card-value"><a href="${whatsappLink}" target="_blank" rel="noopener">${escapeHtml(business.whatsapp)}</a></div>
                </div>
            </div>` : ''}
            ${business.schedule ? `
            <div class="lp-info-card">
                <div class="lp-info-icon purple"><i class="fas fa-clock"></i></div>
                <div>
                    <div class="lp-info-card-label">Horario</div>
                    <div class="lp-info-card-value">${escapeHtml(business.schedule)}</div>
                </div>
            </div>` : ''}
            ${business.email || business.email_contact ? `
            <div class="lp-info-card">
                <div class="lp-info-icon red"><i class="fas fa-envelope"></i></div>
                <div>
                    <div class="lp-info-card-label">Email</div>
                    <div class="lp-info-card-value"><a href="mailto:${escapeHtml(business.email_contact || business.email)}">${escapeHtml(business.email_contact || business.email)}</a></div>
                </div>
            </div>` : ''}
            ${business.website ? `
            <div class="lp-info-card">
                <div class="lp-info-icon pink"><i class="fas fa-globe"></i></div>
                <div>
                    <div class="lp-info-card-label">Sitio Web</div>
                    <div class="lp-info-card-value"><a href="${escapeHtml(business.website)}" target="_blank" rel="noopener">${escapeHtml(business.website.replace(/^https?:\/\//, ''))}</a></div>
                </div>
            </div>` : ''}
        </div>
    </div>
</section>

<!-- GALLERY -->
${images.results.length > 1 ? `
<section class="lp-section lp-section-grey" id="gallery">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Galeria</div>
            <h2 class="lp-section-title">Nuestras Fotos</h2>
        </div>
        <div class="lp-gallery-grid">
            ${images.results.map((img, i) => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(title)} foto ${i + 1}" class="lp-gallery-img" loading="lazy">`).join('')}
        </div>
    </div>
</section>
` : ''}

<!-- FAQ -->
<section class="lp-section" id="faq">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Preguntas Frecuentes</div>
            <h2 class="lp-section-title">FAQ</h2>
            <p class="lp-section-desc">Las preguntas mas comunes sobre ${escapeHtml(title)}.</p>
        </div>
        <div class="lp-faq-list">
            ${faqs.slice(0, 6).map((f, i) => `
                <div class="lp-faq-item${i === 0 ? ' open' : ''}" onclick="this.classList.toggle('open')">
                    <div class="lp-faq-q">${escapeHtml(f.q)} <i class="fas fa-chevron-down"></i></div>
                    <div class="lp-faq-a">${escapeHtml(f.a)}</div>
                </div>
            `).join('')}
        </div>
    </div>
</section>

<!-- SOCIAL -->
${(business.instagram || business.facebook || business.website) ? `
<section class="lp-section lp-section-grey">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Sigenos</div>
            <h2 class="lp-section-title">Nuestras Redes Sociales</h2>
        </div>
        <div class="lp-social-grid">
            ${business.instagram ? `<a href="${escapeHtml(business.instagram)}" target="_blank" rel="noopener" class="lp-social-card ig"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
            ${business.facebook ? `<a href="${escapeHtml(business.facebook)}" target="_blank" rel="noopener" class="lp-social-card fb"><i class="fab fa-facebook"></i> Facebook</a>` : ''}
            ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-social-card wa"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
            ${business.website ? `<a href="${escapeHtml(business.website)}" target="_blank" rel="noopener" class="lp-social-card web"><i class="fas fa-globe"></i> Sitio Web</a>` : ''}
        </div>
    </div>
</section>
` : ''}

<!-- MAP -->
${(business.lat || business.latitude || business.address) ? `
<section class="lp-section" id="location">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Ubicacion</div>
            <h2 class="lp-section-title">Como Llegar</h2>
        </div>
        <div class="lp-map-container">
            <iframe
                src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=15"
                allowfullscreen loading="lazy"
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        </div>
    </div>
</section>
` : ''}

<!-- CTA -->
<section class="lp-section lp-cta" id="contact">
    <div class="lp-container">
        <h2 class="lp-cta-title">Quieres contactar a ${escapeHtml(title)}?</h2>
        <p class="lp-cta-text">Escribenos ahora por WhatsApp o llamanos directamente. Te respondemos rapido.</p>
        <div class="lp-cta-buttons">
            ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-btn lp-btn-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
            ${phoneClean ? `<a href="tel:${phoneClean}" class="lp-btn lp-btn-outline" style="border-color:#fff;color:#fff;"><i class="fas fa-phone"></i> Llamar</a>` : ''}
        </div>
    </div>
</section>

<!-- FOOTER -->
<footer class="lp-footer">
    <p>La pagina web de <span class="lp-footer-brand">${escapeHtml(title)}</span> esta disponible gracias a <a href="${baseUrl}" target="_blank">Un Click</a></p>
    <div class="lp-footer-links">
        <a href="${baseUrl}/negocio/${business.slug}" target="_blank">Ver en Un Click</a>
        ${business.instagram ? `<a href="${escapeHtml(business.instagram)}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
        ${business.facebook ? `<a href="${escapeHtml(business.facebook)}" target="_blank" rel="noopener"><i class="fab fa-facebook"></i> Facebook</a>` : ''}
    </div>
    <div class="lp-footer-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(title)}. Todos los derechos reservados.</div>
</footer>

<!-- MOBILE CTA BAR -->
<div class="lp-mobile-cta">
    ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="wa-btn"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
    ${phoneClean ? `<a href="tel:${phoneClean}" class="call-btn"><i class="fas fa-phone"></i> Llamar</a>` : ''}
</div>

<!-- FLOATING WHATSAPP FAB -->
${whatsappNumber ? `
<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-fab" aria-label="Contactar por WhatsApp">
    <i class="fab fa-whatsapp"></i>
    <span class="lp-fab-tooltip">Escribenos por WhatsApp</span>
</a>` : ''}

<script>
// Sticky nav shadow
window.addEventListener('scroll', () => {
    const nav = document.getElementById('lpNav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});
</script>

</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Link': `<${baseUrl}/negocio/${business.slug}>; rel="canonical"`,
      },
    });
  } catch (error) {
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Extract service highlights from description text
function extractServices(description, business) {
  const services = [];
  const colors = ['green', 'blue', 'amber', 'purple', 'rose', 'teal'];
  const icons = ['fas fa-star', 'fas fa-heart', 'fas fa-bolt', 'fas fa-gem', 'fas fa-trophy', 'fas fa-rocket'];
  let ci = 0;

  if (!description || description.length < 30) {
    // Generate default services from business features
    if (business.category_name) services.push({ icon: 'fas fa-tag', color: 'green', title: business.category_name, desc: `Servicios profesionales de ${business.category_name.toLowerCase()} con la mejor calidad y atencion al cliente.` });
    if (business.has_delivery) services.push({ icon: 'fas fa-motorcycle', color: 'blue', title: 'Delivery', desc: 'Te llevamos nuestros productos directamente a tu puerta. Rapido y seguro.' });
    if (business.has_parking) services.push({ icon: 'fas fa-car', color: 'amber', title: 'Estacionamiento', desc: 'Amplio parking disponible para tu comodidad al visitarnos.' });
    if (business.has_wifi) services.push({ icon: 'fas fa-wifi', color: 'purple', title: 'WiFi Gratuito', desc: 'Conexión WiFi gratuita para nuestros clientes.' });
    if (business.has_card) services.push({ icon: 'fas fa-credit-card', color: 'teal', title: 'Pagos con Tarjeta', desc: 'Aceptamos todas las tarjetas de credito y debito.' });
    if (business.has_outdoor) services.push({ icon: 'fas fa-umbrella-beach', color: 'rose', title: 'Area Exterior', desc: 'Disfruta de un ambiente al aire libre en nuestras instalaciones.' });
    if (services.length === 0) {
      services.push({ icon: 'fas fa-handshake', color: 'green', title: 'Atencion Personalizada', desc: 'Nos comprometemos a brindarte la mejor atencion en cada visita.' });
      services.push({ icon: 'fas fa-star', color: 'amber', title: 'Calidad Garantizada', desc: 'Trabajamos con los mejores estandares de calidad.' });
      services.push({ icon: 'fas fa-clock', color: 'blue', title: 'Atencion Rapida', desc: 'Respondemos de forma agil a todas tus solicitudes.' });
    }
    return services;
  }

  // Split description into sentences and create service cards
  const sentences = description.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 20);
  const topSentences = sentences.slice(0, 6);

  topSentences.forEach((sentence, i) => {
    const title = sentence.length > 50 ? sentence.substring(0, 50) + '...' : sentence;
    services.push({
      icon: icons[ci % icons.length],
      color: colors[ci % colors.length],
      title: title,
      desc: sentence.length > 80 ? sentence.substring(0, 80) + '...' : sentence
    });
    ci++;
  });

  // Ensure at least 3 services
  if (services.length < 3) {
    services.push({ icon: 'fas fa-handshake', color: 'green', title: 'Compromiso Total', desc: 'Nos dedicamos a ofrecer la mejor experiencia a cada cliente.' });
  }
  if (services.length < 3) {
    services.push({ icon: 'fas fa-star', color: 'amber', title: 'Calidad Garantizada', desc: 'Trabajamos cada dia para mejorar nuestros servicios.' });
  }

  return services;
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
