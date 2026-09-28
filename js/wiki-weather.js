/**
 * HolaX - Clima en vivo para la wiki de estados (/estado/:slug)
 * Usa Open-Meteo (gratis, sin API key) con las coordenadas de la capital.
 */
(function () {
    'use strict';

    var el = document.getElementById('hxWeather');
    if (!el) return;

    // WMO weather codes → texto e icono Font Awesome
    function describe(code, isDay) {
        var c = Number(code);
        if (c === 0) return { t: 'Despejado', i: isDay ? 'fa-sun' : 'fa-moon' };
        if (c <= 2) return { t: 'Parcialmente nublado', i: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon' };
        if (c === 3) return { t: 'Nublado', i: 'fa-cloud' };
        if (c === 45 || c === 48) return { t: 'Neblina', i: 'fa-smog' };
        if (c >= 51 && c <= 57) return { t: 'Llovizna', i: 'fa-cloud-rain' };
        if (c >= 61 && c <= 67) return { t: 'Lluvia', i: 'fa-cloud-showers-heavy' };
        if (c >= 71 && c <= 77) return { t: 'Nieve', i: 'fa-snowflake' };
        if (c >= 80 && c <= 82) return { t: 'Chubascos', i: 'fa-cloud-showers-heavy' };
        if (c >= 95) return { t: 'Tormenta', i: 'fa-cloud-bolt' };
        return { t: 'Variable', i: 'fa-cloud-sun' };
    }

    var DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    function render(data) {
        var cur = data.current;
        var d = describe(cur.weather_code, cur.is_day);
        var daily = data.daily;
        var forecast = '';
        for (var i = 1; i < daily.time.length; i++) {
            var day = new Date(daily.time[i] + 'T12:00:00');
            var dd = describe(daily.weather_code[i], 1);
            forecast += '<div class="hx-fc-day"><span>' + DAYS[day.getDay()] + '</span>'
                + '<i class="fas ' + dd.i + '" title="' + dd.t + '"></i>'
                + '<strong>' + Math.round(daily.temperature_2m_max[i]) + '°</strong>'
                + '<small>' + Math.round(daily.temperature_2m_min[i]) + '°</small>'
                + (daily.precipitation_probability_max ? '<em><i class="fas fa-droplet"></i> ' + (daily.precipitation_probability_max[i] || 0) + '%</em>' : '')
                + '</div>';
        }
        el.innerHTML = '<div class="hx-weather-now">'
            + '<i class="fas ' + d.i + '"></i>'
            + '<div><strong>' + Math.round(cur.temperature_2m) + '°C</strong><span>' + d.t + ' · ' + el.getAttribute('data-place') + '</span>'
            + '<small>Humedad ' + Math.round(cur.relative_humidity_2m) + '% · Viento ' + Math.round(cur.wind_speed_10m) + ' km/h</small></div>'
            + '</div>'
            + '<div class="hx-fc">' + forecast + '</div>'
            + '<p class="hx-weather-src">Datos: Open-Meteo</p>';
    }

    var url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + encodeURIComponent(el.getAttribute('data-lat'))
        + '&longitude=' + encodeURIComponent(el.getAttribute('data-lng'))
        + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
        + '&timezone=America%2FCaracas&forecast_days=4';

    fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(render)
        .catch(function () {
            el.innerHTML = '<p class="hx-note">No se pudo cargar el clima actual. Intenta más tarde.</p>';
        });
})();
