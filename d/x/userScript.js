/*
 * tvstyle bootstrap. The patched TizenTube app loads this file (pinned by tag, so the CDN
 * never serves a stale copy) instead of TizenTube's own userscript. It only loads two
 * scripts and never needs to change:
 *   1. TizenTube itself, latest release (ad blocking, SponsorBlock, its settings);
 *   2. tvstyle.js from GitHub Pages, which updates within a minute of a push.
 * YouTube's CSP only runs scripts that carry the page nonce, so both get it. If Pages can't
 * be reached, tvstyle.js comes from the home server instead (LAN, allowed by the CSP).
 */
(function () {
    'use strict';
    if (window.__tvboot) return;
    window.__tvboot = true;

    var T = Date.now();
    var TIZENTUBE = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js?ver=' + T;
    var STYLE = 'https://akroitoru.github.io/tvstyle/tvstyle.js?t=' + T;
    var STYLE_LAN = 'http://192.168.1.111:8098/tvstyle.js';
    var LOG = 'http://192.168.1.111:8098/';

    function log(msg) {
        try {
            var x = new XMLHttpRequest();
            x.open('GET', LOG + '?m=' + encodeURIComponent('boot ' + msg));
            x.send();
        } catch (e) {}
    }

    function nonce() {
        var s = document.querySelector('script[nonce]');
        return s ? (s.nonce || s.getAttribute('nonce') || '') : '';
    }

    // Browsers with Trusted Types (desktop Chrome) refuse plain strings as script URLs.
    var policy = null;
    try {
        if (window.trustedTypes) policy = window.trustedTypes.createPolicy('tvstyle', {createScriptURL: function (u) { return u; }});
    } catch (e) {}

    function inject(src, onerror) {
        var s = document.createElement('script');
        var n = nonce();
        if (n) s.setAttribute('nonce', n);
        s.src = policy ? policy.createScriptURL(src) : src;
        s.onerror = onerror || null;
        (document.head || document.documentElement).appendChild(s);
    }

    function fromLan() {
        log('pages failed, trying LAN');
        try {
            var x = new XMLHttpRequest();
            x.open('GET', STYLE_LAN + '?t=' + T);
            x.onload = function () {
                if (x.status === 200) (0, eval)(x.responseText);
                else log('LAN status ' + x.status);
            };
            x.send();
        } catch (e) {
            log('LAN failed ' + (e && e.message));
        }
    }

    log('start nonce=' + !!nonce());
    if (!window.__tvbootNoTizenTube) inject(TIZENTUBE, function () { log('tizentube failed'); }); // flag: desktop preview
    inject(STYLE, fromLan);
})();
