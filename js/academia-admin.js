/**
 * HolaX / AunClick — Administración de la Academia
 * Página independiente: /academia-admin (academia-admin.html)
 *
 * Contiene lo que antes estaba en la pestaña "Academia" del panel admin:
 * canales de YouTube, clases (video + 5 preguntas), preguntas, Partners
 * Digitales (certificado, quitar, eliminar), progreso de agentes y
 * analíticas. Solo para administradores.
 */
(function() {
    'use strict';

    // ─── Utilidades (antes venían de js/app.js) ─────────────────
    var API = '/api';
    var TOKEN_KEY = 'meridaunclick_token';
    var USER_KEY = 'meridaunclick_user';
    var LOGIN_URL = '/login.html?redirect=' + encodeURIComponent('/academia-admin');

    function getToken() {
        try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
    }

    function tokenPayload() {
        var t = getToken();
        if (!t) return null;
        try {
            var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (p.exp && p.exp < Math.floor(Date.now() / 1000)) return null;
            return p;
        } catch (e) { return null; }
    }

    function goLogin() {
        try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch (e) {}
        window.location.href = LOGIN_URL;
    }

    /** Solo administradores: sin sesión -> login; sin permiso -> aviso. */
    function requireAdminPage() {
        var payload = tokenPayload();
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) {}
        if (!payload) { goLogin(); return false; }
        var role = (cached && cached.role) || payload.role;
        if (role !== 'admin') {
            document.getElementById('academyAdminMain').innerHTML =
                '<div class="admin-card" style="padding:40px;text-align:center;">' +
                '<i class="fas fa-lock" style="font-size:2rem;color:#94a3b8;"></i>' +
                '<h2 style="margin:12px 0 6px;font-size:1.2rem;">Acceso solo para administradores</h2>' +
                '<p style="color:#64748b;">Inicia sesión con una cuenta de administrador para gestionar la academia.</p>' +
                '<a class="btn btn-primary" style="margin-top:14px;display:inline-flex;" href="' + LOGIN_URL + '">Iniciar sesión</a></div>';
            return false;
        }
        var nameEl = document.getElementById('academyAdminUser');
        if (nameEl && cached && cached.name) nameEl.textContent = cached.name;
        return true;
    }

    async function apiCall(path, options) {
        var config = { method: options.method, headers: { 'Content-Type': 'application/json' } };
        var token = getToken();
        if (token) config.headers['Authorization'] = 'Bearer ' + token;
        if (options.body !== undefined) config.body = options.body;
        var res;
        try {
            res = await fetch(API + path, config);
        } catch (e) {
            throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        var text = await res.text();
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
        if (res.status === 401) { goLogin(); throw new Error('Sesión expirada'); }
        if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
        return data;
    }

    var api = {
        get: function(url) { return apiCall(url, { method: 'GET' }); },
        post: function(url, data) { return apiCall(url, { method: 'POST', body: JSON.stringify(data || {}) }); },
        put: function(url, data) { return apiCall(url, { method: 'PUT', body: JSON.stringify(data || {}) }); },
        delete: function(url) { return apiCall(url, { method: 'DELETE' }); },
    };

    function showToast(message, type) {
        type = type || 'info';
        var container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        var icon = document.createElement('i');
        icon.className = 'fas ' + (icons[type] || icons.info);
        var span = document.createElement('span');
        span.textContent = message;
        var close = document.createElement('button');
        close.className = 'toast-close';
        close.innerHTML = '&times;';
        close.onclick = function() { toast.remove(); };
        toast.appendChild(icon); toast.appendChild(span); toast.appendChild(close);
        container.appendChild(toast);
        requestAnimationFrame(function() { toast.classList.add('toast-show'); });
        setTimeout(function() { toast.classList.remove('toast-show'); setTimeout(function() { toast.remove(); }, 300); }, 3500);
    }

    // ─── Header: cerrar sesión ──────────────────────────────────
    document.addEventListener('click', function(e) {
        if (e.target.closest('#academyAdminLogout')) goLogin();
    });

    function _esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: ACADEMIA - Clases, Preguntas, Agentes
    //  Funciones: loadAcademyTab, loadAcademyClasses, loadAcademyAgents
    // ═══════════════════════════════════════════════════════════

    var _academyCurrentClassId = null;

    async function loadAcademyTab() {
        loadAcademyClasses();
        loadAcademyAgents();
        setupAcademyHandlers();
        loadAcademyChannel();
        loadAcademyPartners();
    }

    // ── Partners Digitales: certificado, quitar certificación, eliminar cuenta ──
    var _academyPartners = {};

    function partnerIssuedAt(p) {
        return p.exam_passed_at || p.partner_at || p.graduated_at || '';
    }

    async function loadAcademyPartners() {
        var tbody = document.getElementById('academyPartnersTableBody');
        if (!tbody) return;
        try {
            var data = await api.get('/partners');
            var list = data.partners || [];
            _academyPartners = {};
            var countEl = document.getElementById('academyPartnersCount');
            if (countEl) countEl.textContent = '(' + list.length + ')';
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="5"><div style="text-align:center;color:#94a3b8;padding:16px;"><i class="fas fa-certificate"></i> Aún no hay Partners certificados</div></td></tr>';
                return;
            }
            tbody.innerHTML = list.map(function(p) {
                _academyPartners[p.id] = p;
                var info = window.AcademyCertificate ? window.AcademyCertificate.info({ name: p.name, userId: p.id, issuedAt: partnerIssuedAt(p) }) : null;
                var avatar = p.avatar
                    ? '<img src="' + _esc(p.avatar) + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'
                    : '<div style="width:32px;height:32px;border-radius:50%;background:#d97706;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">' + _esc((p.name || '?').charAt(0).toUpperCase()) + '</div>';
                var btn = 'border-radius:6px;padding:4px 9px;cursor:pointer;font-size:0.75rem;background:none;';
                return '<tr>' +
                    '<td><div style="display:flex;align-items:center;gap:8px;">' + avatar + '<div><strong>' + _esc(p.name) + '</strong>' +
                        (p.graduated ? '<div style="font-size:0.7rem;color:#d97706;"><i class="fas fa-graduation-cap"></i> Graduado por admin</div>' : '<div style="font-size:0.7rem;color:#059669;"><i class="fas fa-check-circle"></i> Examen aprobado</div>') +
                    '</div></div></td>' +
                    '<td>Nivel ' + (p.level || 1) + (p.level_name ? ' · ' + _esc(p.level_name) : '') + '<div style="font-size:0.72rem;color:#6b7280;">' + (p.xp || 0) + ' XP</div></td>' +
                    '<td>' + (p.classes_completed || 0) + '</td>' +
                    '<td>' + (info ? '<strong style="font-size:0.78rem;">' + _esc(info.code) + '</strong><div style="font-size:0.72rem;color:#6b7280;">' + _esc(info.dateText) + '</div>' : '-') + '</td>' +
                    '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                        '<button onclick="academyShowCertificate(' + p.id + ')" style="' + btn + 'border:1px solid #fde68a;color:#b45309;" title="Ver certificado"><i class="fas fa-certificate"></i> Certificado</button>' +
                        '<a href="/perfil.html?id=' + p.id + '" target="_blank" style="' + btn + 'border:1px solid #bfdbfe;color:#2563eb;text-decoration:none;" title="Ver perfil"><i class="fas fa-external-link-alt"></i> Perfil</a>' +
                        '<button onclick="academyRevokePartner(' + p.id + ')" style="' + btn + 'border:1px solid #fdba74;color:#c2410c;" title="Quitar certificación"><i class="fas fa-user-minus"></i> Quitar</button>' +
                        '<button onclick="academyDeletePartner(' + p.id + ')" style="' + btn + 'border:1px solid #fca5a5;color:#dc2626;" title="Eliminar cuenta de Partner"><i class="fas fa-trash"></i> Eliminar</button>' +
                    '</div></td>' +
                '</tr>';
            }).join('');
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="5"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i> Error al cargar partners</div></td></tr>';
        }
    }

    var _academyCertInfo = null;
    window.academyShowCertificate = async function(userId, fallback) {
        var p = _academyPartners[userId] || fallback;
        if (!p || !window.AcademyCertificate) { showToast('No se pudo cargar el certificado', 'error'); return; }
        _academyCertInfo = window.AcademyCertificate.info({ name: p.name, userId: userId, issuedAt: p.issued_at || partnerIssuedAt(p) });
        document.getElementById('academyCertModalTitle').innerHTML = '<i class="fas fa-certificate" style="color:#d97706;"></i> Certificado de ' + _esc(p.name);
        document.getElementById('academyCertModalNote').textContent = 'Código ' + _academyCertInfo.code + ' · Emitido el ' + _academyCertInfo.dateText;
        document.getElementById('academyCertModalProfile').href = '/perfil.html?id=' + userId;
        var box = document.getElementById('academyCertPreview');
        box.innerHTML = '<div style="padding:40px;color:#6b7280;"><i class="fas fa-spinner fa-spin"></i> Generando certificado...</div>';
        document.getElementById('academyCertModal').classList.remove('hidden');
        try { await window.AcademyCertificate.preview(_academyCertInfo, box); }
        catch(e) { box.innerHTML = '<div style="padding:40px;color:#dc2626;">' + _esc(e.message || 'Error al generar') + '</div>'; }
    };

    function closeAcademyCertModal() {
        document.getElementById('academyCertModal').classList.add('hidden');
    }

    window.academyRevokePartner = async function(userId) {
        var p = _academyPartners[userId] || {};
        if (!confirm('¿Quitar la certificación de Partner a "' + (p.name || userId) + '"?\n\nPerderá el estado de Partner, su certificado, las medallas de certificación y los 150 XP del examen. Conserva sus clases aprobadas.')) return;
        var reset = confirm('¿Permitir que vuelva a presentar el examen final?\n\nAceptar: se reinician sus intentos (3 nuevos).\nCancelar: conserva los intentos usados.');
        try {
            var r = await api.post('/admin/agent-actions', { action: 'revoke_partner', user_id: userId, reset_exam: reset });
            showToast((r && r.message) || 'Certificación retirada', 'success');
            loadAcademyPartners();
            loadAcademyAgents();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.academyDeletePartner = async function(userId) {
        var p = _academyPartners[userId] || {};
        var name = p.name || String(userId);
        if (!confirm('¿Eliminar la cuenta de Partner de "' + name + '"?\n\nSe borran TODOS sus datos de academia: certificado, clases aprobadas, XP, nivel y medallas. Esto no se puede deshacer.\n\nSu cuenta del sitio (negocios, perfil) NO se elimina.')) return;
        var typed = prompt('Para confirmar escribe ELIMINAR');
        if (!typed || typed.trim().toUpperCase() !== 'ELIMINAR') { showToast('Cancelado', 'info'); return; }
        try {
            var r = await api.post('/admin/agent-actions', { action: 'delete_academy_account', user_id: userId });
            showToast((r && r.message) || 'Cuenta de Partner eliminada', 'success');
            loadAcademyPartners();
            loadAcademyAgents();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    // ── Academia: video de YouTube + 5 preguntas ──
    var ACADEMY_VIDEO_QUESTIONS = 5;

    function academyYoutubeId(url) {
        var s = String(url || '').trim();
        if (!s) return '';
        if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
        var m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : '';
    }

    function renderAcademyVideoQuestions(list) {
        var box = document.getElementById('academyVideoQuestions');
        if (!box) return;
        var html = '';
        for (var i = 0; i < ACADEMY_VIDEO_QUESTIONS; i++) {
            var q = (list && list[i]) || {};
            html += '<div class="academy-vq" data-idx="' + i + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">';
            html += '<label style="font-weight:600;font-size:0.8rem;display:block;margin-bottom:4px;">Pregunta ' + (i + 1) + ' *</label>';
            html += '<input type="text" class="academy-vq-text" value="' + _esc(q.question || '') + '" placeholder="Escribe la pregunta" style="width:100%;padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;margin-bottom:6px;">';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px;">';
            ['a', 'b', 'c', 'd'].forEach(function(l) {
                html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;">' +
                    '<input type="radio" name="academyVQCorrect_' + i + '" value="' + l + '"' + (q.correct_answer === l ? ' checked' : '') + ' style="accent-color:#059669;" title="Respuesta correcta">' +
                    '<strong>' + l.toUpperCase() + '</strong>' +
                    '<input type="text" class="academy-vq-opt" data-letter="' + l + '" value="' + _esc(q['option_' + l] || '') + '" placeholder="Opción ' + l.toUpperCase() + (l === 'a' || l === 'b' ? ' *' : '') + '" style="flex:1;min-width:0;padding:6px 10px;border:2px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;">' +
                    '</label>';
            });
            html += '</div></div>';
        }
        box.innerHTML = html;
    }

    function collectAcademyVideoQuestions() {
        var blocks = document.querySelectorAll('#academyVideoQuestions .academy-vq');
        var out = [];
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            var q = { question: b.querySelector('.academy-vq-text').value.trim(), points: 2 };
            b.querySelectorAll('.academy-vq-opt').forEach(function(inp) { q['option_' + inp.dataset.letter] = inp.value.trim(); });
            var checked = b.querySelector('input[type="radio"]:checked');
            q.correct_answer = checked ? checked.value : '';
            var n = i + 1;
            if (!q.question) return { error: 'Escribe el texto de la pregunta ' + n };
            if (!q.option_a || !q.option_b) return { error: 'La pregunta ' + n + ' necesita al menos las opciones A y B' };
            if (!q.correct_answer) return { error: 'Marca la respuesta correcta de la pregunta ' + n };
            if (!q['option_' + q.correct_answer]) return { error: 'La respuesta correcta de la pregunta ' + n + ' está vacía' };
            out.push(q);
        }
        return { questions: out };
    }

    function updateAcademyVideoUI() {
        var input = document.getElementById('academyClassVideoUrl');
        var preview = document.getElementById('academyVideoPreview');
        var wrap = document.getElementById('academyVideoQuestionsWrap');
        if (!input || !preview || !wrap) return;
        var url = input.value.trim();
        var id = academyYoutubeId(url);
        if (!url) {
            preview.innerHTML = '';
            wrap.classList.add('hidden');
        } else if (!id) {
            preview.innerHTML = '<span style="color:#dc2626;"><i class="fas fa-exclamation-circle"></i> URL de YouTube no válida</span>';
            wrap.classList.add('hidden');
        } else {
            preview.innerHTML = '<div style="display:flex;gap:10px;align-items:center;"><img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" style="width:120px;border-radius:6px;"><span style="color:#059669;"><i class="fas fa-check-circle"></i> Video detectado (' + id + ')</span></div>';
            wrap.classList.remove('hidden');
        }
    }

    // ── Canales de YouTube (uno por profesor, máximo 4) ──
    var ACADEMY_MAX_CHANNELS = 4;

    function academyChannelRow(ch) {
        ch = ch || {};
        return '<div class="academy-channel-row" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:8px;align-items:center;">' +
            '<input type="url" class="academy-channel-url" value="' + _esc(ch.url || '') + '" placeholder="https://www.youtube.com/@canal" style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:0.88rem;outline:none;">' +
            '<input type="text" class="academy-channel-name" value="' + _esc(ch.name || '') + '" placeholder="Profesor / nombre del canal" maxlength="100" style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:0.88rem;outline:none;">' +
            '<button type="button" class="academy-channel-remove" title="Quitar canal" style="background:none;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:8px 10px;cursor:pointer;"><i class="fas fa-trash"></i></button>' +
            '</div>';
    }

    function renderAcademyChannels(list) {
        var box = document.getElementById('academyChannelsList');
        if (!box) return;
        var rows = (list && list.length) ? list : [{}];
        box.innerHTML = rows.slice(0, ACADEMY_MAX_CHANNELS).map(academyChannelRow).join('');
        updateAcademyChannelButtons();
    }

    function updateAcademyChannelButtons() {
        var count = document.querySelectorAll('#academyChannelsList .academy-channel-row').length;
        var addBtn = document.getElementById('academyAddChannelBtn');
        if (addBtn) addBtn.disabled = count >= ACADEMY_MAX_CHANNELS;
    }

    function collectAcademyChannels() {
        var out = [];
        document.querySelectorAll('#academyChannelsList .academy-channel-row').forEach(function(row) {
            var url = row.querySelector('.academy-channel-url').value.trim();
            var name = row.querySelector('.academy-channel-name').value.trim();
            if (url || name) out.push({ url: url, name: name });
        });
        return out;
    }

    async function loadAcademyChannel() {
        try {
            var data = await api.get('/academy-config');
            var cfg = (data && data.config) || {};
            renderAcademyChannels(cfg.youtube_channels || []);
        } catch(e) {
            console.log('academy-config', e);
            renderAcademyChannels([]);
        }
    }

    async function saveAcademyChannel() {
        var channels = collectAcademyChannels();
        for (var i = 0; i < channels.length; i++) {
            if (!channels[i].url) { showToast('Falta la URL del canal ' + (i + 1), 'error'); return; }
        }
        try {
            var data = await api.put('/academy-config', { channels: channels });
            renderAcademyChannels((data && data.config && data.config.youtube_channels) || []);
            showToast((data && data.message) || 'Canales guardados', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    function setupAcademyHandlers() {
        var addBtn = document.getElementById('academyAddClassBtn');
        var saveBtn = document.getElementById('academySaveClassBtn');
        var addQBtn = document.getElementById('academyAddQuestionBtn');
        var saveQBtn = document.getElementById('academySaveInlineQBtn');
        var cancelQBtn = document.getElementById('academyCancelInlineQBtn');
        var closeEditorBtn = document.getElementById('academyCloseEditorBtn');
        var cancelClassBtn = document.getElementById('academyCancelClassBtn');
        var closeQuestionsBtn = document.getElementById('academyCloseQuestionsBtn');
        var genQBtn = document.getElementById('academyGenQBtn');
        var clearPreviewBtn = document.getElementById('academyClearQPreviewBtn');
        var refreshBtn = document.getElementById('academyRefreshBtn');

        if (addBtn && !addBtn._bound) {
            addBtn._bound = true;
            addBtn.addEventListener('click', function() {
                document.getElementById('academyClassId').value = '';
                document.getElementById('academyClassTitle').value = '';
                document.getElementById('academyClassDesc').value = '';
                document.getElementById('academyClassContent').value = '';
                document.getElementById('academyClassXP').value = '10';
                document.getElementById('academyClassOrder').value = '0';
                document.getElementById('academyClassActive').checked = true;
                document.getElementById('academyClassModule').value = 'General';
                document.getElementById('academyClassModuleOrder').value = '0';
                document.getElementById('academyClassVideoUrl').value = '';
                renderAcademyVideoQuestions([]);
                updateAcademyVideoUI();
                document.getElementById('academyEditorTitle').innerHTML = '<i class="fas fa-plus-circle" style="color:#7c3aed;"></i> Nueva Clase';
                document.getElementById('academyClassEditor').classList.remove('hidden');
                window._pendingQuestions = [];
                window._academyKeepQuestions = false;
                renderPendingQuestionsPreview();
            });
        }
        var videoUrlInput = document.getElementById('academyClassVideoUrl');
        if (videoUrlInput && !videoUrlInput._bound) {
            videoUrlInput._bound = true;
            videoUrlInput.addEventListener('input', updateAcademyVideoUI);
        }
        var saveChannelBtn = document.getElementById('academySaveChannelBtn');
        if (saveChannelBtn && !saveChannelBtn._bound) {
            saveChannelBtn._bound = true;
            saveChannelBtn.addEventListener('click', saveAcademyChannel);
        }
        var addChannelBtn = document.getElementById('academyAddChannelBtn');
        if (addChannelBtn && !addChannelBtn._bound) {
            addChannelBtn._bound = true;
            addChannelBtn.addEventListener('click', function() {
                var box = document.getElementById('academyChannelsList');
                if (!box || box.querySelectorAll('.academy-channel-row').length >= ACADEMY_MAX_CHANNELS) return;
                box.insertAdjacentHTML('beforeend', academyChannelRow({}));
                updateAcademyChannelButtons();
                var rows = box.querySelectorAll('.academy-channel-url');
                rows[rows.length - 1].focus();
            });
        }
        var channelsBox = document.getElementById('academyChannelsList');
        if (channelsBox && !channelsBox._bound) {
            channelsBox._bound = true;
            channelsBox.addEventListener('click', function(e) {
                var btn = e.target.closest('.academy-channel-remove');
                if (!btn) return;
                btn.closest('.academy-channel-row').remove();
                if (!channelsBox.querySelector('.academy-channel-row')) renderAcademyChannels([]);
                updateAcademyChannelButtons();
            });
        }
        if (saveBtn && !saveBtn._bound) {
            saveBtn._bound = true;
            saveBtn.addEventListener('click', saveAcademyClass);
        }
        if (addQBtn && !addQBtn._bound) {
            addQBtn._bound = true;
            addQBtn.addEventListener('click', addQuestionInline);
        }
        if (saveQBtn && !saveQBtn._bound) {
            saveQBtn._bound = true;
            saveQBtn.addEventListener('click', saveQuestionInline);
        }
        if (cancelQBtn && !cancelQBtn._bound) {
            cancelQBtn._bound = true;
            cancelQBtn.addEventListener('click', function() {
                document.getElementById('academyInlineQForm').classList.add('hidden');
            });
        }
        if (closeEditorBtn && !closeEditorBtn._bound) {
            closeEditorBtn._bound = true;
            closeEditorBtn.addEventListener('click', function() {
                document.getElementById('academyClassEditor').classList.add('hidden');
            });
        }
        if (cancelClassBtn && !cancelClassBtn._bound) {
            cancelClassBtn._bound = true;
            cancelClassBtn.addEventListener('click', function() {
                document.getElementById('academyClassEditor').classList.add('hidden');
            });
        }
        if (closeQuestionsBtn && !closeQuestionsBtn._bound) {
            closeQuestionsBtn._bound = true;
            closeQuestionsBtn.addEventListener('click', function() {
                document.getElementById('academyQuestionsPanel').classList.add('hidden');
            });
        }
        if (genQBtn && !genQBtn._bound) {
            genQBtn._bound = true;
            genQBtn.addEventListener('click', academyGenerateQuestions);
        }
        if (clearPreviewBtn && !clearPreviewBtn._bound) {
            clearPreviewBtn._bound = true;
            clearPreviewBtn.addEventListener('click', function() {
                window._pendingQuestions = [];
                renderPendingQuestionsPreview();
            });
        }
        if (refreshBtn && !refreshBtn._bound) {
            refreshBtn._bound = true;
            refreshBtn.addEventListener('click', function() {
                loadAcademyClasses();
                loadAcademyAgents();
                loadAcademyPartners();
                showToast('Lista actualizada', 'success');
            });
        }
        var partnersRefresh = document.getElementById('academyPartnersRefreshBtn');
        if (partnersRefresh && !partnersRefresh._bound) {
            partnersRefresh._bound = true;
            partnersRefresh.addEventListener('click', loadAcademyPartners);
        }
        var certModal = document.getElementById('academyCertModal');
        if (certModal && !certModal._bound) {
            certModal._bound = true;
            certModal.addEventListener('click', function(e) { if (e.target === certModal) closeAcademyCertModal(); });
            document.getElementById('academyCertModalClose').addEventListener('click', closeAcademyCertModal);
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !certModal.classList.contains('hidden')) closeAcademyCertModal(); });
            document.getElementById('academyCertModalDownload').addEventListener('click', async function() {
                if (!_academyCertInfo) return;
                try { await window.AcademyCertificate.download(_academyCertInfo); showToast('Certificado descargado', 'success'); }
                catch(e) { showToast('Error: ' + e.message, 'error'); }
            });
        }
        var analyticsBtn = document.getElementById('academyAnalyticsBtn');
        var closeAnalyticsBtn = document.getElementById('academyCloseAnalyticsBtn');
        if (analyticsBtn && !analyticsBtn._bound) {
            analyticsBtn._bound = true;
            analyticsBtn.addEventListener('click', loadAcademyAnalytics);
        }
        if (closeAnalyticsBtn && !closeAnalyticsBtn._bound) {
            closeAnalyticsBtn._bound = true;
            closeAnalyticsBtn.addEventListener('click', function() {
                document.getElementById('academyAnalyticsPanel').classList.add('hidden');
            });
        }
    }

    async function loadAcademyClasses() {
        var tbody = document.getElementById('academyClassesTableBody');
        if (!tbody) return;
        try {
            var data = await api.get('/agent-classes');
            var classes = data.classes || [];
            var totalQ = classes.reduce(function(s, c) { return s + (c.question_count || 0); }, 0);
            var totalComp = classes.reduce(function(s, c) { return s + (c.completions || 0); }, 0);
            var activeC = classes.filter(function(c) { return c.is_active === 1; }).length;
            var statsEl = document.getElementById('academyStats');
            if (statsEl) {
                statsEl.innerHTML =
                    '<div style="background:#f5f3ff;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#7c3aed;">' + classes.length + '</div>' +
                    '<div style="font-size:0.78rem;color:#6b7280;">Total Clases</div></div>' +
                    '<div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#2563eb;">' + activeC + '</div>' +
                    '<div style="font-size:0.78rem;color:#6b7280;">Activas</div></div>' +
                    '<div style="background:#fef3c7;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#d97706;">' + totalQ + '</div>' +
                    '<div style="font-size:0.78rem;color:#6b7280;">Preguntas</div></div>' +
                    '<div style="background:#ecfdf5;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#059669;">' + totalComp + '</div>' +
                    '<div style="font-size:0.78rem;color:#6b7280;">Completados</div></div>';
            }
            if (!classes.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div style="text-align:center;color:#94a3b8;padding:16px;"><i class="fas fa-graduation-cap"></i><p>No hay clases creadas. Haz clic en "Nueva Clase" para comenzar.</p></div></td></tr>';
                return;
            }
            var html = '';
            // Group classes by module
            var grouped = {};
            classes.forEach(function(c) {
                var mod = c.module || 'General';
                if (!grouped[mod]) grouped[mod] = [];
                grouped[mod].push(c);
            });
            var modColors = {'General':'#6b7280','Fundamentos':'#059669','Intermedio':'#2563eb','Avanzado':'#d97706','Examen Final':'#dc2626'};
            Object.keys(grouped).sort().forEach(function(mod) {
                var mColor = modColors[mod] || '#7c3aed';
                html += '<tr><td colspan="7" style="background:linear-gradient(90deg,' + mColor + '12,' + mColor + '06);padding:10px 12px;font-weight:700;font-size:0.85rem;color:' + mColor + ';"><i class="fas fa-book"></i> ' + _esc(mod) + ' (' + grouped[mod].length + ' clases)</td></tr>';
                grouped[mod].forEach(function(c) {
                html += '<tr>';
                html += '<td><strong>' + _esc(c.title) + '</strong>' + (academyYoutubeId(c.video_url) ? ' <i class="fab fa-youtube" style="color:#dc2626;" title="Clase con video de YouTube"></i>' : '') + '</td>';
                html += '<td><button onclick="loadAcademyQuestions(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#2563eb;"><i class="fas fa-question-circle"></i> ' + (c.question_count || 0) + '</button></td>';
                html += '<td><span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">+' + (c.xp_reward || 0) + ' XP</span></td>';
                html += '<td>' + (c.completions || 0) + '</td>';
                html += '<td>' + c.sort_order + '</td>';
                html += '<td>' + (c.is_active === 1 ? '<span style="color:#059669;font-size:0.8rem;"><i class="fas fa-check-circle"></i> Activa</span>' : '<span style="color:#dc2626;font-size:0.8rem;"><i class="fas fa-times-circle"></i> Inactiva</span>') + '</td>';
                html += '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                    '<button onclick="academyEditClass(' + c.id + ')" style="background:none;border:1px solid #d1d5db;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#374151;" title="Editar"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="loadAcademyQuestions(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#2563eb;" title="Preguntas"><i class="fas fa-list"></i></button>' +
                    '<button onclick="academyDeleteClass(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#dc2626;" title="Eliminar"><i class="fas fa-trash"></i></button>' +
                    '</div></td>';
                html += '</tr>';
                });
            });
            tbody.innerHTML = html;
        } catch(e) {
            console.error('loadAcademyClasses error:', e);
            tbody.innerHTML = '<tr><td colspan="7"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar clases</p><p style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">' + _esc(e.message || 'Error desconocido') + '</p><p style="font-size:0.72rem;color:#94a3b8;margin-top:8px;"><button onclick="loadAcademyClasses()" style="background:#7c3aed;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:0.8rem;">Reintentar</button></p></div></td></tr>';
        }
    }

    async function saveAcademyClass() {
        var id = document.getElementById('academyClassId').value;
        var title = document.getElementById('academyClassTitle').value.trim();
        if (!title) { showToast('El titulo es requerido', 'error'); return; }
        var payload = {
            title: title,
            description: document.getElementById('academyClassDesc').value,
            content: document.getElementById('academyClassContent').value,
            xp_reward: parseInt(document.getElementById('academyClassXP').value) || 10,
            sort_order: parseInt(document.getElementById('academyClassOrder').value) || 0,
            is_active: document.getElementById('academyClassActive').checked,
            module: document.getElementById('academyClassModule').value,
            module_order: parseInt(document.getElementById('academyClassModuleOrder').value) || 0,
            video_url: document.getElementById('academyClassVideoUrl').value.trim()
        };
        // Preguntas: las 5 del video, o la lista de preguntas de una clase normal.
        // El servidor reemplaza las preguntas de la clase por esta lista.
        if (payload.video_url) {
            if (!academyYoutubeId(payload.video_url)) { showToast('La URL del video de YouTube no es válida', 'error'); return; }
            var vq = collectAcademyVideoQuestions();
            if (vq.error) { showToast(vq.error, 'error'); return; }
            payload.questions = vq.questions;
        } else if (!window._academyKeepQuestions || (window._pendingQuestions || []).length) {
            payload.questions = window._pendingQuestions || [];
        }
        try {
            if (id) {
                await api.put('/agent-classes/' + id, payload);
                showToast('Clase actualizada', 'success');
            } else {
                await api.post('/agent-classes', payload);
                showToast('Clase creada', 'success');
            }
            window._pendingQuestions = [];
            document.getElementById('academyClassEditor').classList.add('hidden');
            renderPendingQuestionsPreview();
            // Small delay to ensure DB consistency before refresh
            setTimeout(function() { loadAcademyClasses(); }, 300);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    window.academyEditClass = async function(classId) {
        try {
            var data = await api.get('/agent-classes/' + classId);
            var cls = data.class;
            if (!cls) { showToast('Clase no encontrada', 'error'); return; }
            document.getElementById('academyClassId').value = cls.id;
            document.getElementById('academyClassTitle').value = cls.title;
            document.getElementById('academyClassDesc').value = cls.description || '';
            document.getElementById('academyClassContent').value = cls.content || '';
            document.getElementById('academyClassXP').value = cls.xp_reward || 10;
            document.getElementById('academyClassOrder').value = cls.sort_order || 0;
            document.getElementById('academyClassActive').checked = cls.is_active === 1;
            document.getElementById('academyClassModule').value = cls.module || 'General';
            document.getElementById('academyClassModuleOrder').value = cls.module_order || 0;
            document.getElementById('academyClassVideoUrl').value = cls.video_url || '';
            renderAcademyVideoQuestions([]);
            updateAcademyVideoUI();
            document.getElementById('academyEditorTitle').innerHTML = '<i class="fas fa-edit" style="color:#7c3aed;"></i> Editar Clase: ' + _esc(cls.title);
            document.getElementById('academyClassEditor').classList.remove('hidden');
            window._academyKeepQuestions = false;
            try {
                var qData = await api.get('/agent-classes/' + classId + '/questions');
                if (academyYoutubeId(cls.video_url)) {
                    // Clase con video: las preguntas van en los 5 bloques
                    renderAcademyVideoQuestions(qData.questions || []);
                    // Si luego se quita el video, no borrar estas preguntas
                    window._academyKeepQuestions = true;
                    window._pendingQuestions = [];
                    renderPendingQuestionsPreview();
                    return;
                }
                window._pendingQuestions = (qData.questions || []).map(function(q) {
                    return {
                        question: q.question,
                        option_a: q.option_a,
                        option_b: q.option_b,
                        option_c: q.option_c,
                        option_d: q.option_d,
                        correct_answer: q.correct_answer,
                        points: q.points || 10,
                        explanation: q.explanation || ''
                    };
                });
            } catch(ex) {
                // No borrar las preguntas existentes si no se pudieron cargar
                window._pendingQuestions = [];
                window._academyKeepQuestions = true;
            }
            renderPendingQuestionsPreview();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.academyDeleteClass = async function(id, name) {
        if (!confirm('Eliminar la clase "' + name + '" y todas sus preguntas?')) return;
        try {
            await api.delete('/agent-classes/' + id);
            showToast('Clase eliminada', 'success');
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.loadAcademyQuestions = async function(classId, className) {
        _academyCurrentClassId = classId;
        document.getElementById('academyQuestionsClassName').textContent = className;
        document.getElementById('academyQuestionsPanel').classList.remove('hidden');
        document.getElementById('academyInlineQForm').classList.add('hidden');
        var listEl = document.getElementById('academyQuestionsList');
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        try {
            var data = await api.get('/agent-classes/' + classId + '/questions');
            var questions = data.questions || [];
            if (!questions.length) {
                listEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">No hay preguntas. Haz clic en "Agregar Pregunta".</div>';
                return;
            }
            var html = '';
            questions.forEach(function(q, idx) {
                var opts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
                html += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
                html += '<div style="flex:1;">';
                html += '<div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;">[Q' + (idx + 1) + '] ' + _esc(q.question) + '</div>';
                var letters = ['a', 'b', 'c', 'd'];
                letters.forEach(function(l) {
                    var isCorrect = q.correct_answer === l;
                    var prefix = isCorrect ? '<span style="color:#059669;font-weight:700;">&#10003; ' + l.toUpperCase() + '</span>' : '<span style="color:#6b7280;">&nbsp;&nbsp;&nbsp;' + l.toUpperCase() + '</span>';
                    html += '<div style="font-size:0.82rem;padding:2px 0 2px 16px;">' + prefix + ') ' + _esc(opts[l] || '') + '</div>';
                });
                html += '</div>';
                html += '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">';
                html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:600;white-space:nowrap;">' + (q.points || 10) + ' pts</span>';
                html += '<div style="display:flex;gap:4px;">';
                html += '<button onclick="editQuestionInline(' + q.id + ')" style="background:none;border:1px solid #d1d5db;border-radius:6px;padding:3px 6px;cursor:pointer;font-size:0.72rem;color:#374151;" title="Editar"><i class="fas fa-edit"></i></button>';
                html += '<button onclick="deleteQuestionInline(' + q.id + ')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:3px 6px;cursor:pointer;font-size:0.72rem;color:#dc2626;" title="Eliminar"><i class="fas fa-trash"></i></button>';
                html += '</div></div></div></div>';
            });
            listEl.innerHTML = html;
        } catch(e) {
            listEl.innerHTML = '<div style="text-align:center;color:#f59e0b;padding:20px;"><i class="fas fa-exclamation-triangle"></i> Error al cargar preguntas</div>';
        }
    };

    function addQuestionInline() {
        document.getElementById('academyInlineQId').value = '';
        document.getElementById('academyInlineQText').value = '';
        document.getElementById('academyInlineQOptA').value = '';
        document.getElementById('academyInlineQOptB').value = '';
        document.getElementById('academyInlineQOptC').value = '';
        document.getElementById('academyInlineQOptD').value = '';
        document.querySelectorAll('input[name="academyInlineCorrect"]').forEach(function(r) { r.checked = false; });
        document.getElementById('academyInlineQFormTitle').textContent = 'Nueva Pregunta';
        document.getElementById('academyInlineQForm').classList.remove('hidden');
    }

    window.editQuestionInline = async function(qId) {
        try {
            var data = await api.get('/agent-classes/' + _academyCurrentClassId + '/questions');
            var q = (data.questions || []).find(function(q) { return q.id === qId; });
            if (!q) { showToast('Pregunta no encontrada', 'error'); return; }
            document.getElementById('academyInlineQId').value = q.id;
            document.getElementById('academyInlineQText').value = q.question;
            document.getElementById('academyInlineQOptA').value = q.option_a || '';
            document.getElementById('academyInlineQOptB').value = q.option_b || '';
            document.getElementById('academyInlineQOptC').value = q.option_c || '';
            document.getElementById('academyInlineQOptD').value = q.option_d || '';
            document.querySelectorAll('input[name="academyInlineCorrect"]').forEach(function(r) { r.checked = r.value === q.correct_answer; });
            document.getElementById('academyInlineQFormTitle').textContent = 'Editar Pregunta';
            document.getElementById('academyInlineQForm').classList.remove('hidden');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    async function saveQuestionInline() {
        var qId = document.getElementById('academyInlineQId').value;
        var question = document.getElementById('academyInlineQText').value.trim();
        var optA = document.getElementById('academyInlineQOptA').value.trim();
        var optB = document.getElementById('academyInlineQOptB').value.trim();
        var optC = document.getElementById('academyInlineQOptC').value.trim();
        var optD = document.getElementById('academyInlineQOptD').value.trim();
        var correct = document.querySelector('input[name="academyInlineCorrect"]:checked');
        if (!question || !optA || !optB || !optC || !optD) { showToast('Todos los campos son requeridos', 'error'); return; }
        if (!correct) { showToast('Selecciona la respuesta correcta', 'error'); return; }
        var payload = {
            question: question,
            option_a: optA, option_b: optB, option_c: optC, option_d: optD,
            correct_answer: correct.value
        };
        try {
            if (qId) {
                await api.put('/agent-classes/' + _academyCurrentClassId + '/questions/' + qId, payload);
                showToast('Pregunta actualizada', 'success');
            } else {
                await api.post('/agent-classes/' + _academyCurrentClassId + '/questions', payload);
                showToast('Pregunta creada', 'success');
            }
            document.getElementById('academyInlineQForm').classList.add('hidden');
            loadAcademyQuestions(_academyCurrentClassId, document.getElementById('academyQuestionsClassName').textContent);
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    window.deleteQuestionInline = async function(qId) {
        if (!confirm('Eliminar esta pregunta?')) return;
        try {
            await api.delete('/agent-classes/' + _academyCurrentClassId + '/questions/' + qId);
            showToast('Pregunta eliminada', 'success');
            loadAcademyQuestions(_academyCurrentClassId, document.getElementById('academyQuestionsClassName').textContent);
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    async function loadAcademyAgents() {
        var tbody = document.getElementById('academyAgentsTableBody');
        if (!tbody) return;
        try {
            var resp = await fetch(API + '/users?role=agent&limit=200', {
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
            });
            var data = await resp.json();
            var users = data.users || data.results || [];
            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="8"><div style="text-align:center;color:#94a3b8;padding:16px;">No hay agentes registrados</div></td></tr>';
                return;
            }
            var profiles = {};
            for (var i = 0; i < users.length; i++) {
                try {
                    var pResp = await fetch(API + '/partners/' + users[i].id, {
                        headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
                    });
                    var pData = await pResp.json();
                    profiles[users[i].id] = pData;
                } catch(ex) {}
            }
            var html = '';
            var lvlColors = ['#6b7280','#7c3aed','#2563eb','#059669','#d97706','#dc2626','#8b5cf6','#0891b2','#65a30d','#ea580c'];
            for (var i = 0; i < users.length; i++) {
                var u = users[i];
                var p = profiles[u.id] || {};
                var lvl = p.level || 1;
                var xp = p.xp || 0;
                var grad = p.is_graduated || p.graduated || false;
                var LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
                var xpPrev = lvl <= 1 ? 0 : LEVEL_XP[lvl - 2];
                var xpForNext = lvl >= 10 ? LEVEL_XP[9] : LEVEL_XP[lvl - 1];
                var xpInLevel = xp - xpPrev;
                var xpNeeded = xpForNext - xpPrev;
                var pct = lvl >= 10 ? 100 : Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100)));
                var lvlColor = lvlColors[Math.min(lvl - 1, lvlColors.length - 1)];
                html += '<tr>';
                html += '<td><div style="display:flex;align-items:center;gap:8px;">';
                if (u.avatar) {
                    html += '<img src="' + _esc(u.avatar) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">';
                } else {
                    html += '<div style="width:28px;height:28px;border-radius:50%;background:' + lvlColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;">' + _esc(u.name).charAt(0).toUpperCase() + '</div>';
                }
                html += '<strong>' + _esc(u.name) + '</strong></div></td>';
                html += '<td><span style="background:' + lvlColor + '15;color:' + lvlColor + ';border:1px solid ' + lvlColor + '30;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">Nivel ' + lvl + '</span></td>';
                html += '<td style="min-width:120px;"><div style="font-size:0.72rem;color:#6b7280;margin-bottom:3px;">' + xp + ' XP</div><div style="background:#e5e7eb;border-radius:6px;height:6px;overflow:hidden;"><div style="background:' + lvlColor + ';height:100%;border-radius:6px;width:' + pct + '%;transition:width 0.3s;"></div></div></td>';
                html += '<td>' + (p.total_classes_completed || 0) + '</td>';
                html += '<td>' + (p.total_badges || 0) + '</td>';
                html += '<td>';
                if (p.exam_passed) {
                    html += '<span style="color:#059669;font-size:0.8rem;"><i class="fas fa-check-circle"></i> Aprobado</span>';
                } else if (p.exam_attempts > 0) {
                    html += '<span style="color:#dc2626;font-size:0.8rem;"><i class="fas fa-times-circle"></i> ' + p.exam_attempts + ' intentos</span>';
                } else {
                    html += '<span style="color:#94a3b8;font-size:0.8rem;">-</span>';
                }
                html += '</td>';
                html += '<td>';
                if (p.is_partner) {
                    html += '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;">Partner</span>';
                } else if (grad) {
                    html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;">Graduado</span>';
                } else {
                    html += '<span style="color:#94a3b8;font-size:0.8rem;">-</span>';
                }
                html += '</td>';
                html += '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">';
                html += '<a href="/perfil.html?id=' + u.id + '" target="_blank" style="background:none;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#2563eb;text-decoration:none;" title="Ver Perfil"><i class="fas fa-external-link-alt"></i></a>';
                if (p.is_partner) {
                    window._academyAgentCerts = window._academyAgentCerts || {};
                    window._academyAgentCerts[u.id] = { name: u.name, issued_at: p.certificate && p.certificate.issued_at };
                    html += '<button onclick="academyShowCertificate(' + u.id + ', window._academyAgentCerts[' + u.id + '])" style="background:none;border:1px solid #fde68a;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#b45309;" title="Ver certificado"><i class="fas fa-certificate"></i></button>';
                }
                if (!grad) {
                    html += '<button onclick="academyGraduateAgent(' + u.id + ',\'' + _esc(u.name).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #fde68a;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#d97706;" title="Graduar"><i class="fas fa-graduation-cap"></i></button>';
                }
                html += '<button onclick="academyAwardBadge(' + u.id + ',\'' + _esc(u.name).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #ddd6fe;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#7c3aed;" title="Dar Medalla"><i class="fas fa-medal"></i></button>';
                html += '</div></td>';
                html += '</tr>';
            }
            tbody.innerHTML = html;
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar agentes</p></div></td></tr>';
        }
    }

    function renderPendingQuestionsPreview() {
        var wrap = document.getElementById('academyQPreviewWrap');
        var list = document.getElementById('academyQPreviewList');
        var count = document.getElementById('academyQPreviewCount');
        var questions = window._pendingQuestions || [];
        if (!wrap || !list) return;
        count.textContent = questions.length;
        if (!questions.length) {
            wrap.classList.add('hidden');
            return;
        }
        wrap.classList.remove('hidden');
        var html = '';
        questions.forEach(function(q, idx) {
            html += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;position:relative;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
            html += '<div style="flex:1;">';
            html += '<div style="font-weight:600;font-size:0.83rem;margin-bottom:4px;">[Q' + (idx + 1) + '] ' + _esc(q.question) + '</div>';
            var opts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
            ['a','b','c','d'].forEach(function(l) {
                var isCorrect = q.correct_answer === l;
                var prefix = isCorrect ? '<span style="color:#059669;font-weight:700;">&#10003; ' + l.toUpperCase() + '</span>' : '<span style="color:#6b7280;">&nbsp;&nbsp;&nbsp;' + l.toUpperCase() + '</span>';
                html += '<div style="font-size:0.8rem;padding:1px 0 1px 14px;">' + prefix + ') ' + _esc(opts[l] || '') + '</div>';
            });
            html += '</div>';
            html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
            html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">' + (q.points || 10) + ' pts</span>';
            html += '<button onclick="removePendingQuestion(' + idx + ')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:0.72rem;color:#dc2626;" title="Eliminar"><i class="fas fa-times"></i></button>';
            html += '</div></div></div>';
        });
        list.innerHTML = html;
    }

    window.removePendingQuestion = function(idx) {
        var questions = window._pendingQuestions || [];
        questions.splice(idx, 1);
        renderPendingQuestionsPreview();
    };

    window.academyGenerateQuestions = async function() {
        var text = document.getElementById('academyAIText').value.trim();
        if (!text) { showToast('Pega un texto para generar preguntas', 'error'); return; }
        var count = parseInt(document.getElementById('academyGenQCount').value) || 5;
        var btn = document.getElementById('academyGenQBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        try {
            var data = await api.post('/agent-classes/generate-questions', { text: text, num_questions: count });
            var videoField = document.getElementById('academyClassVideoUrl');
            if (data.questions && data.questions.length > 0 && videoField && academyYoutubeId(videoField.value)) {
                // Clase con video: llenar los 5 bloques con las preguntas generadas
                renderAcademyVideoQuestions(data.questions.slice(0, ACADEMY_VIDEO_QUESTIONS));
                showToast('Preguntas cargadas en los 5 bloques del video. Revísalas antes de guardar.', 'success');
            } else if (data.questions && data.questions.length > 0) {
                if (!window._pendingQuestions) window._pendingQuestions = [];
                data.questions.forEach(function(q) { window._pendingQuestions.push(q); });
                renderPendingQuestionsPreview();
                showToast(data.questions.length + ' preguntas generadas. Revisa la vista previa antes de guardar.', 'success');
            } else {
                showToast('No se pudieron generar preguntas. Intenta con mas texto.', 'error');
            }
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generar Preguntas';
    };

    window.academyGraduateAgent = async function(userId, name) {
        if (!confirm('Confirmar graduacion de "' + name + '"? Se le otorgara medalla de graduacion y estatus de Partner.')) return;
        try {
            await api.post('/admin/agent-actions', {
                action: 'graduate',
                user_id: userId,
                badge_name: 'Graduado del Programa',
                badge_description: 'Completo exitosamente el programa de capacitacion'
            });
            showToast(name + ' graduado exitosamente!', 'success');
            loadAcademyAgents();
            loadAcademyPartners();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.academyAwardBadge = function(userId, name) {
        var existing = document.getElementById('academyBadgeInline_' + userId);
        if (existing) { existing.remove(); return; }
        var td = event.target.closest('td');
        if (!td) return;
        var form = document.createElement('div');
        form.id = 'academyBadgeInline_' + userId;
        form.style.cssText = 'position:absolute;right:0;top:100%;background:#fff;border:1px solid #ddd6fe;border-radius:10px;padding:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:50;width:240px;margin-top:4px;';
        form.innerHTML = '<div style="font-weight:600;font-size:0.8rem;color:#7c3aed;margin-bottom:8px;"><i class="fas fa-medal"></i> Medalla para ' + _esc(name) + '</div>' +
            '<input type="text" id="academyBadgeName_' + userId + '" placeholder="Nombre de la medalla" style="width:100%;padding:6px 10px;border:2px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;margin-bottom:6px;">' +
            '<input type="text" id="academyBadgeDesc_' + userId + '" placeholder="Descripcion (opcional)" style="width:100%;padding:6px 10px;border:2px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;margin-bottom:8px;">' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-primary btn-sm" style="background:#7c3aed;font-size:0.75rem;" id="academyBadgeSave_' + userId + '"><i class="fas fa-check"></i> Otorgar</button>' +
            '<button class="btn btn-secondary btn-sm" style="font-size:0.75rem;" id="academyBadgeCancel_' + userId + '"><i class="fas fa-times"></i></button>' +
            '</div>';
        td.style.position = 'relative';
        td.appendChild(form);
        document.getElementById('academyBadgeCancel_' + userId).addEventListener('click', function() { form.remove(); });
        document.getElementById('academyBadgeSave_' + userId).addEventListener('click', async function() {
            var bName = document.getElementById('academyBadgeName_' + userId).value.trim();
            if (!bName) { showToast('El nombre de la medalla es requerido', 'error'); return; }
            var bDesc = document.getElementById('academyBadgeDesc_' + userId).value.trim();
            try {
                await api.post('/admin/agent-actions', {
                    action: 'award_badge',
                    user_id: userId,
                    badge_name: bName,
                    badge_description: bDesc
                });
                showToast('Medalla "' + bName + '" otorgada a ' + name, 'success');
                form.remove();
                loadAcademyAgents();
            } catch(e) { showToast('Error: ' + e.message, 'error'); }
        });
    };

    async function loadAcademyAnalytics() {
        var panel = document.getElementById('academyAnalyticsPanel');
        var content = document.getElementById('academyAnalyticsContent');
        if (!panel || !content) return;
        panel.classList.remove('hidden');
        content.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;"><i class="fas fa-spinner fa-spin"></i> Cargando analíticas...</div>';
        try {
            var data = await api.post('/admin/academy-analytics', {});
            var o = data.overview;
            var html = '';
            // Overview cards
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">';
            var cards = [
                {label:'Clases', val:o.total_classes, icon:'fa-book', color:'#7c3aed'},
                {label:'Preguntas', val:o.total_questions, icon:'fa-question-circle', color:'#2563eb'},
                {label:'Agentes', val:o.total_agents, icon:'fa-users', color:'#059669'},
                {label:'Aprobación Clases', val:o.overall_pass_rate+'%', icon:'fa-check-double', color:o.overall_pass_rate >= 70 ? '#059669' : '#dc2626'},
                {label:'Aprobación Examen', val:o.exam_pass_rate+'%', icon:'fa-trophy', color:o.exam_pass_rate >= 70 ? '#059669' : '#dc2626'},
                {label:'Partners', val:o.total_partners, icon:'fa-certificate', color:'#d97706'},
            ];
            cards.forEach(function(c) {
                html += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:' + c.color + ';">' + c.val + '</div><div style="font-size:0.75rem;color:#6b7280;"><i class="fas ' + c.icon + '"></i> ' + c.label + '</div></div>';
            });
            html += '</div>';

            // Class pass rates
            if (data.class_stats && data.class_stats.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-chart-bar" style="color:#7c3aed;"></i> Tasa de Aprobación por Clase</h4>';
                html += '<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:0.82rem;"><thead><tr><th>Clase</th><th>Módulo</th><th>Intentos</th><th>Aprobados</th><th>Tasa</th></tr></thead><tbody>';
                data.class_stats.forEach(function(c) {
                    var rateColor = c.pass_rate >= 70 ? '#059669' : c.pass_rate >= 50 ? '#d97706' : '#dc2626';
                    html += '<tr><td>' + _esc(c.title) + '</td><td><span style="background:#f5f3ff;color:#7c3aed;padding:2px 8px;border-radius:10px;font-size:0.72rem;">' + _esc(c.module || 'General') + '</span></td><td>' + c.total_attempts + '</td><td>' + c.passed + '</td><td style="color:' + rateColor + ';font-weight:700;">' + c.pass_rate + '%</td></tr>';
                });
                html += '</tbody></table></div>';
            }

            // Failed questions
            if (data.failed_questions && data.failed_questions.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i> Preguntas con Mayor Tasa de Fallo</h4>';
                data.failed_questions.forEach(function(q) {
                    html += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px;margin-bottom:8px;"><div style="font-size:0.82rem;"><strong>Q' + q.id + '</strong> (' + _esc(q.class_title) + ')</div><div style="font-size:0.78rem;color:#6b7280;margin-top:4px;">' + _esc(q.question) + '</div><div style="font-size:0.72rem;margin-top:4px;">' + q.times_answered + ' intentos, ' + q.times_correct + ' correctos (' + q.fail_rate + '% fallo)</div></div>';
                });
            }

            // Level distribution
            if (data.level_distribution && data.level_distribution.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-layer-group" style="color:#2563eb;"></i> Distribución de Niveles</h4>';
                html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
                var lvlColors = ['#6b7280','#7c3aed','#2563eb','#059669','#d97706','#dc2626','#8b5cf6','#0891b2','#65a30d','#ea580c'];
                data.level_distribution.forEach(function(l) {
                    var lc = lvlColors[Math.min(l.level - 1, 9)];
                    html += '<div style="background:' + lc + '15;border:1px solid ' + lc + '30;border-radius:8px;padding:8px 14px;text-align:center;min-width:60px;"><div style="font-size:1.1rem;font-weight:700;color:' + lc + ';">' + l.count + '</div><div style="font-size:0.7rem;color:#6b7280;">Nivel ' + l.level + '</div></div>';
                });
                html += '</div>';
            }

            content.innerHTML = html;
        } catch(e) {
            content.innerHTML = '<div style="text-align:center;color:#f59e0b;padding:20px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar analíticas: ' + _esc(e.message) + '</p></div>';
        }
    }

    // ─── Inicio ─────────────────────────────────────────────────
    function start() {
        if (!requireAdminPage()) return;
        loadAcademyTab();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
