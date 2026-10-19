/*
 * tvstyle — the Yasin TV launcher look for YouTube on TV (TizenTube Cobalt).
 *
 * The patched TizenTube app loads this file instead of TizenTube's own userScript.js.
 * It first loads TizenTube itself (ad blocking, SponsorBlock, settings stay as they are),
 * then restyles YouTube's TV interface:
 *   - the left guide becomes a top bar: app badge, sections as tabs (six fit, the rest
 *     scroll), search and profile on the right. YouTube's own guide stays in the page,
 *     invisible, and keeps doing the work; the bar mirrors it and translates the arrows;
 *   - focus ring and glass surfaces as in the launcher.
 */
(function () {
    'use strict';
    if (window.__tvstyle) return;
    window.__tvstyle = true;

    var TIZENTUBE = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js?ver=';
    var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, BACK = 27;
    var VISIBLE_TABS = 6;

    // ---------- TizenTube ----------
    if (!window.__tvstyleNoTizenTube) { // set when previewing in a desktop browser
        var tt = document.createElement('script');
        tt.src = TIZENTUBE + Date.now();
        (document.head || document.documentElement).appendChild(tt);
    }

    // ---------- styles ----------
    var CSS = [
        ':root{--tv-glass:rgba(34,34,40,.78);--tv-stroke:rgba(255,255,255,.17);--tv-ring:#fffaee;--tv-halo:rgba(230,210,180,.55);}',
        /* YouTube's guide keeps working but is not shown; the page no longer slides right when it has focus */
        'ytlr-guide-response{opacity:0!important;}',
        'ytlr-surface-page,ytlr-search-container,ytlr-app-background-container{transform:translateX(-64px)!important;width:calc(100% + 64px)!important;}',
        /* search: the query field sits right under the bar */
        'ytlr-classic-search-page{top:52px!important;}',
        /* the search row on top of browse pages: search lives in the bar now */
        'ytlr-tv-surface-content-renderer>ytlr-search-bar{visibility:hidden!important;}',
        /* pages with their own side list (Settings, Library...): the section title is the tab now */
        'ytlr-tv-secondary-nav-renderer>div>yt-formatted-string{visibility:hidden!important;}',
        /* top bar */
        '#tv-bar{position:fixed;top:26px;left:40px;right:40px;height:52px;z-index:2147483000;display:flex;align-items:center;' +
        'font-family:"YouTube Sans",Roboto,Arial,sans-serif;color:#fff;transition:opacity .2s,transform .2s;}',
        '#tv-bar.hidden{opacity:0;transform:translateY(-12px);}',
        '#tv-bar .gl{background:var(--tv-glass);border:1px solid var(--tv-stroke);box-shadow:inset 0 1px 0 var(--tv-stroke),0 12px 30px rgba(0,0,0,.35);}',
        '#tv-bar .badge{height:52px;box-sizing:border-box;border-radius:26px;padding:0 22px 0 16px;display:flex;align-items:center;font-size:20px;font-weight:700;flex:none;}',
        '#tv-bar .badge i{width:12px;height:12px;border-radius:50%;background:#ff2d2d;margin-right:10px;}',
        '#tv-bar .tabs{position:absolute;left:50%;transform:translateX(-50%);height:52px;box-sizing:border-box;border-radius:26px;padding:5px;overflow:hidden;}',
        '#tv-bar .strip{display:flex;height:42px;transition:transform .25s;}',
        '#tv-bar .tab{flex:none;height:42px;padding:0 18px;border-radius:21px;display:flex;align-items:center;font-size:18px;font-weight:600;' +
        'color:rgba(255,255,255,.72);white-space:nowrap;transition:transform .15s,background .15s,color .15s;}',
        '#tv-bar .tab.sel{background:rgba(255,255,255,.14);color:#fff;}',
        '#tv-bar .tab.f{background:#fff;color:#111114;transform:scale(1.06);}',
        '#tv-bar .right{margin-left:auto;display:flex;gap:12px;flex:none;}',
        '#tv-bar .circ{width:52px;height:52px;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'overflow:hidden;transition:transform .15s,background .15s;}',
        '#tv-bar .circ svg{width:24px;height:24px;}',
        '#tv-bar .circ img{width:100%;height:100%;object-fit:cover;}',
        '#tv-bar .circ.sel{background:rgba(255,255,255,.25);}',
        '#tv-bar .circ.f{background:#fff;color:#111114;transform:scale(1.08);}',
        '#tv-bar .circ.f img{opacity:.92;}',
        /* the launcher focus ring on cards */
        'ytlr-tile-renderer .zylon-focus,ytlr-tile-renderer.zylon-focus{}'
    ].join('\n');

    /** YouTube's CSP only lets styles with its nonce through: append to its own style tag (as TizenTube does). */
    function addStyle() {
        var host = document.querySelector('style[nonce]');
        if (host) {
            host.textContent += '\n/* tvstyle */\n' + CSS;
            return;
        }
        var s = document.createElement('style');
        s.id = 'tv-style';
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    // ---------- keys ----------
    var sending = false;

    function send(code) {
        sending = true;
        try {
            var target = document.activeElement || document;
            ['keydown', 'keyup'].forEach(function (type) {
                var e = document.createEvent('Event');
                e.initEvent(type, true, true);
                e.keyCode = code;
                e.which = code;
                target.dispatchEvent(e);
            });
        } finally {
            sending = false;
        }
    }

    function guideEntries() {
        return Array.prototype.slice.call(document.querySelectorAll('ytlr-guide-response ytlr-guide-entry-renderer'));
    }

    /** Index of the focused guide entry, -1 when focus is elsewhere. */
    function focusedEntry(entries) {
        var a = document.activeElement;
        if (!a || !a.closest) return -1;
        var e = a.closest('ytlr-guide-entry-renderer');
        if (!e) {
            // focus can sit on a wrapper inside the guide
            if (!a.closest('ytlr-guide-response')) return -1;
            e = a.querySelector && a.querySelector('ytlr-guide-entry-renderer');
        }
        return e ? entries.indexOf(e) : -1;
    }

    /** Bar order (left to right) as guide indexes: sections, then search (1) and account (0). */
    function barOrder(n) {
        var o = [];
        for (var i = 2; i < n; i++) o.push(i);
        if (n > 1) o.push(1);
        if (n > 0) o.push(0);
        return o;
    }

    function onWatch() {
        return location.hash.indexOf('#/watch') === 0;
    }

    window.addEventListener('keydown', function (ev) {
        if (sending) return;
        var k = ev.keyCode;
        if (k !== LEFT && k !== RIGHT && k !== UP && k !== DOWN) return;
        var entries = guideEntries();
        var gi = focusedEntry(entries);
        if (gi >= 0) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            if (k === DOWN) {
                send(RIGHT); // into the page, like Right from the side guide
            } else if (k === LEFT || k === RIGHT) {
                var order = barOrder(entries.length);
                var pos = order.indexOf(gi) + (k === RIGHT ? 1 : -1);
                if (pos < 0 || pos >= order.length) return;
                var delta = order[pos] - gi;
                for (var i = 0; i < Math.abs(delta); i++) send(delta > 0 ? DOWN : UP);
            }
            return;
        }
        // Up on the top row of a page: nothing above it but the bar; Back focuses the guide.
        if (k === UP && !onWatch() && entries.length) {
            var before = document.activeElement;
            setTimeout(function () {
                var now = document.activeElement;
                var lost = now === before || (now && now.closest && now.closest('ytlr-search-bar'));
                if (lost) send(BACK);
            }, 160);
        }
    }, true);

    // ---------- bar ----------
    var bar, strip, tabsBox, searchBtn, accountBtn, tabEls = [], builtFor = '', selected = 2;

    var SVG = 'http://www.w3.org/2000/svg';

    /** Small stroked icon; no innerHTML (YouTube enforces Trusted Types in browsers). */
    function icon(shapes) {
        var svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        shapes.forEach(function (s) {
            var n = document.createElementNS(SVG, s[0]);
            for (var a in s[1]) n.setAttribute(a, s[1][a]);
            n.setAttribute('fill', 'none');
            n.setAttribute('stroke', 'currentColor');
            n.setAttribute('stroke-width', '2.1');
            n.setAttribute('stroke-linecap', 'round');
            svg.appendChild(n);
        });
        return svg;
    }

    var ICON_SEARCH = [['circle', {cx: 10.5, cy: 10.5, r: 6.5}], ['path', {d: 'M15.5 15.5l5 5'}]];
    var ICON_PERSON = [['circle', {cx: 12, cy: 8.5, r: 4}], ['path', {d: 'M4.5 20.5c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6'}]];

    function el(tag, cls, parent, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        if (parent) parent.appendChild(e);
        return e;
    }

    function label(e) {
        return (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function build(entries) {
        if (!bar) {
            bar = el('div', '', document.body);
            bar.id = 'tv-bar';
            var badge = el('div', 'badge gl', bar);
            el('i', '', badge);
            badge.appendChild(document.createTextNode('YouTube'));
            tabsBox = el('div', 'tabs gl', bar);
            strip = el('div', 'strip', tabsBox);
            var right = el('div', 'right', bar);
            searchBtn = el('div', 'circ gl', right);
            searchBtn.appendChild(icon(ICON_SEARCH));
            accountBtn = el('div', 'circ gl', right);
            accountBtn.appendChild(icon(ICON_PERSON));
        }
        while (strip.firstChild) strip.removeChild(strip.firstChild);
        tabEls = [];
        for (var i = 2; i < entries.length; i++) {
            var t = document.createElement('div');
            t.className = 'tab';
            t.textContent = label(entries[i]);
            strip.appendChild(t);
            tabEls.push(t);
        }
        // at most six tabs wide; the rest scroll into view
        var w = 0;
        for (var j = 0; j < tabEls.length && j < VISIBLE_TABS; j++) w += tabEls[j].offsetWidth;
        tabsBox.style.width = (w + 10) + 'px';
        var img = entries[0] && entries[0].querySelector('img');
        if (img && img.src) {
            while (accountBtn.firstChild) accountBtn.removeChild(accountBtn.firstChild);
            el('img', '', accountBtn).src = img.src;
        }
    }

    /**
     * The section on screen. The guide marks it only through its own (obfuscated) classes, so
     * take the one section entry whose markup differs from all the others (icons aside).
     */
    function currentSection(entries) {
        var sigs = entries.map(function (e, i) {
            if (i < 2) return '';
            var parts = [];
            Array.prototype.forEach.call(e.querySelectorAll('*'), function (c) {
                if (c.closest('yt-icon')) return;
                parts.push(typeof c.className === 'string' ? c.className : '');
            });
            return parts.join('/');
        });
        var count = {};
        sigs.forEach(function (s, i) { if (i >= 2) count[s] = (count[s] || 0) + 1; });
        var odd = -1;
        for (var i = 2; i < sigs.length; i++) {
            if (count[sigs[i]] === 1) {
                if (odd >= 0) return -1; // more than one differs: can't tell
                odd = i;
            }
        }
        return odd;
    }

    function render() {
        if (!document.body) return;
        var entries = guideEntries();
        if (!entries.length) {
            if (bar) bar.classList.add('hidden');
            return;
        }
        var key = entries.map(label).join('|');
        if (key !== builtFor) {
            builtFor = key;
            build(entries);
        }
        bar.classList.toggle('hidden', onWatch());
        var gi = focusedEntry(entries);
        var cur = currentSection(entries);
        if (location.hash.indexOf('#/search') === 0) selected = 1;
        else if (cur >= 2) selected = cur;
        else if (gi >= 2) selected = gi;
        for (var i = 0; i < tabEls.length; i++) {
            tabEls[i].classList.toggle('f', gi === i + 2);
            tabEls[i].classList.toggle('sel', selected === i + 2 && gi !== i + 2);
        }
        searchBtn.classList.toggle('f', gi === 1);
        searchBtn.classList.toggle('sel', selected === 1 && gi !== 1);
        accountBtn.classList.toggle('f', gi === 0);
        // keep the focused (or selected) tab inside the visible window
        var shown = tabEls[(gi >= 2 ? gi : selected) - 2];
        if (shown) {
            var box = tabsBox.clientWidth - 10, off = parseFloat(strip.dataset.off || '0');
            var l = shown.offsetLeft, r = l + shown.offsetWidth;
            if (l < off) off = l;
            else if (r > off + box) off = r - box;
            strip.dataset.off = String(off);
            strip.style.transform = 'translateX(' + (-off) + 'px)';
        }
    }

    function start() {
        addStyle();
        setInterval(render, 120);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
