/*
 * tvstyle — the Yasin TV launcher look for YouTube on TV (TizenTube Cobalt).
 *
 * Loaded by the bootstrap (d/x/userScript.js) next to TizenTube itself, then restyles
 * YouTube's TV interface:
 *   - the left guide becomes a top bar: app badge, sections as tabs (six fit, the rest
 *     scroll), search and profile on the right. YouTube's own guide stays in the page,
 *     invisible, and keeps doing the work; the bar mirrors it and translates the arrows;
 *   - focus ring and glass surfaces as in the launcher.
 */
(function () {
    'use strict';
    // temporary: reports to a log server on the home LAN while the TV build is being debugged
    var VERSION = 'v15';
    var DEBUG_LOG = 'http://192.168.1.111:8098/';
    function log() {
        try {
            var x = new XMLHttpRequest();
            x.open('GET', DEBUG_LOG + '?m=' + encodeURIComponent(Array.prototype.join.call(arguments, ' ')));
            x.send();
        } catch (e) {}
    }
    window.__tvlog = log;
    window.addEventListener('error', function (e) {
        log('error', e.message, e.filename, e.lineno);
    });
    log('start', VERSION, location.href, 'state=' + document.readyState, 'body=' + !!document.body,
        'closest=' + typeof Element.prototype.closest, 'again=' + !!window.__tvstyle);
    if (window.__tvstyle) return;
    window.__tvstyle = true;

    var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, BACK = 27;
    var VISIBLE_TABS = 6;

    // ---------- styles ----------
    var CSS = [
        /* YouTube's guide keeps working but is not shown; the page no longer slides right when it has focus */
        'ytlr-guide-response{opacity:0!important;}',
        'ytlr-surface-page,ytlr-search-container,ytlr-app-background-container{transform:translateX(-64px)!important;width:calc(100% + 64px)!important;}',
        /* search, as in the design: query field and keyboard on a glass panel at the left, suggestions
           under the keyboard, results on the right. Lefts are +64px: the page is shifted by -64px. */
        'ytlr-classic-search-page::before{content:"";position:absolute;left:104px;top:100px;width:480px;height:596px;box-sizing:border-box;' +
        'border-radius:30px;background:rgba(34,34,40,.78);border:1px solid rgba(255,255,255,.17);}',
        'ytlr-classic-search-page>div{left:132px!important;top:118px!important;width:424px!important;height:48px!important;' +
        'display:flex!important;flex-direction:row!important;align-items:center;}',
        'ytlr-classic-search-page>div>ytlr-search-voice{position:relative!important;left:0!important;top:0!important;flex:none;}',
        'ytlr-classic-search-page ytlr-search-text-box{width:364px!important;margin-left:12px!important;flex:none;}',
        'ytlr-classic-search-page ytlr-search-text-box{overflow:hidden!important;border-radius:24px;}',
        'ytlr-classic-search-page ytlr-search-text-box *{max-width:364px!important;box-sizing:border-box;}',
        'ytlr-classic-search-page ytlr-search-text-box ytlr-text-box{width:364px!important;}',
        'ytlr-search-keyboard{left:132px!important;top:182px!important;width:424px!important;overflow:hidden;}',
        'ytlr-search-suggestions{left:132px!important;top:412px!important;width:424px!important;height:268px!important;overflow:hidden;}',
        'ytlr-search-results{left:608px!important;top:100px!important;width:736px!important;height:620px!important;}',
        /* browsing the results YouTube hides keyboard and suggestions: the query stays, results go wide under it */
        'html.tv-sr ytlr-classic-search-page::before{opacity:0;}',
        'html.tv-sr ytlr-search-results{transform:none!important;left:0!important;top:180px!important;width:1344px!important;height:540px!important;}',
        /* the search row on top of browse pages: search lives in the bar now */
        'ytlr-tv-surface-content-renderer>ytlr-search-bar{visibility:hidden!important;}',
        /* pages with their own side list (Settings, Library...): the section title is the tab now */
        'ytlr-tv-secondary-nav-renderer>div>yt-formatted-string{visibility:hidden!important;}',
        /* top bar */
        '#tv-bar{position:fixed;top:26px;left:40px;width:1200px;height:52px;z-index:2147483000;display:flex;align-items:center;' +
        'font-family:"YouTube Sans",Roboto,Arial,sans-serif;color:#fff;transition:opacity .2s,transform .2s;}',
        '#tv-bar.hidden{opacity:0;transform:translateY(-12px);}',
        '#tv-bar .gl{background:rgba(34,34,40,.78);border:1px solid rgba(255,255,255,.17);box-shadow:inset 0 1px 0 rgba(255,255,255,.17),0 12px 30px rgba(0,0,0,.35);}',
        '#tv-bar .badge{position:absolute;left:0;top:0;width:142px;height:52px;box-sizing:border-box;border-radius:26px;padding:0 22px 0 16px;display:flex;align-items:center;font-size:20px;font-weight:700;flex:none;}',
        '#tv-bar .badge i{width:12px;height:12px;border-radius:50%;background:#ff2d2d;margin-right:10px;}',
        '#tv-bar .tabs{position:absolute;left:50%;top:0;transform:translateX(-50%);height:52px;box-sizing:border-box;border-radius:26px;padding:5px;overflow:hidden;}',
        '#tv-bar .strip{display:flex;height:42px;transition:transform .25s;}',
        '#tv-bar .tab{flex:none;height:42px;padding:0 18px;border-radius:21px;display:flex;align-items:center;font-size:18px;font-weight:600;' +
        'color:rgba(255,255,255,.72);white-space:nowrap;transition:transform .15s,background .15s,color .15s;}',
        '#tv-bar .tab.sel{background:rgba(255,255,255,.14);color:#fff;}',
        '#tv-bar .tab.f{background:#fff;color:#111114;transform:scale(1.06);}',
        /* explicit positions and widths: Cobalt stretches unsized absolute flex boxes and ignores right:0 */
        '#tv-bar .right{position:absolute;left:1084px;top:0;width:116px;height:52px;display:flex;}',
        '#tv-bar .right .circ+.circ{margin-left:12px;}',
        '#tv-bar .circ{width:52px;height:52px;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'overflow:hidden;transition:transform .15s,background .15s;}',
        '#tv-bar .g{position:relative;width:24px;height:24px;}',
        '#tv-bar .g i{position:absolute;display:block;box-sizing:border-box;}',
        '#tv-bar .search .a{left:2px;top:2px;width:15px;height:15px;border:2px solid #fff;border-radius:50%;}',
        '#tv-bar .search .b{left:16px;top:14px;width:2.5px;height:8px;background:#fff;border-radius:1px;transform:rotate(-45deg);transform-origin:50% 0;}',
        '#tv-bar .person .a{left:7px;top:2px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;}',
        '#tv-bar .person .b{left:3px;top:14px;width:18px;height:10px;border:2px solid #fff;border-bottom:0;border-radius:9px 9px 0 0;}',
        '#tv-bar .circ.f .g i{border-color:#111114;}',
        '#tv-bar .circ.f .search .b{background:#111114;}',
        '#tv-bar .circ.avatar{background-size:cover;background-position:center;}',
        '#tv-bar .circ.avatar .g{display:none;}',
        '#tv-bar .circ.sel{background:rgba(255,255,255,.25);}',
        '#tv-bar .circ.f{background:#fff;color:#111114;transform:scale(1.08);}',
        '#tv-bar .circ.f img{opacity:.92;}',
        /* focus as in the Lampa skin: no ring, a thin soft white edge, and under the card a glow
           in the picture's own colours (.tv-amb, built in JS: Cobalt has no CSS blur, so it is a
           few faint, offset copies of the thumbnail; it stays within the row's 10px margin,
           which the list clips) */
        'ytlr-tile-header-renderer::after{border-color:rgba(255,255,255,.45)!important;border-width:1.5px!important;top:0!important;' +
        'left:0!important;right:0!important;bottom:0!important;border-radius:12px!important;box-shadow:none!important;}',
        /* behind the thumbnail via z-index:-1 (YouTube's own children keep their positioning) */
        'ytlr-tile-header-renderer{z-index:0;}',
        'ytlr-tile-header-renderer>div:not(.tv-amb){z-index:1;}',
        'ytlr-tile-header-renderer>.tv-amb{position:absolute;left:-10px;top:-10px;right:-10px;bottom:-10px;z-index:-1;pointer-events:none;}',
        '.tv-amb i{position:absolute;display:block;background-size:100% 100%;border-radius:18px;}'
    ].join('\n');

    /**
     * Our own <style>, carrying the page's CSP nonce when there is one (browsers drop inline
     * styles without it). Cobalt ignores text appended to an existing style element.
     */
    function addStyle() {
        var s = document.createElement('style');
        s.id = 'tv-style';
        var host = document.querySelector('style[nonce]');
        var nonce = host && (host.nonce || host.getAttribute('nonce'));
        if (nonce) s.setAttribute('nonce', nonce);
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
        log('style added', 'nonce=' + !!nonce, 'rules=' + (s.sheet && s.sheet.cssRules ? s.sheet.cssRules.length : '?'));
    }

    /** Nearest ancestor-or-self with the tag (Cobalt has no Element.closest). */
    function up(el, tag) {
        tag = tag.toUpperCase();
        for (var e = el; e && e.nodeType === 1; e = e.parentElement) if (e.tagName === tag) return e;
        return null;
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
        // signed in, the account is its own element type; as a guest it is a plain entry ("Войти")
        return Array.prototype.slice.call(document.querySelectorAll(
            'ytlr-guide-response ytlr-guide-account-entry-renderer, ytlr-guide-response ytlr-guide-entry-renderer'));
    }

    /** Index of the focused guide entry, -1 when focus is elsewhere. */
    function focusedEntry(entries) {
        var a = document.activeElement;
        if (!a) return -1;
        var e = up(a, 'ytlr-guide-entry-renderer') || up(a, 'ytlr-guide-account-entry-renderer');
        if (!e) {
            // focus can sit on a wrapper inside the guide
            if (!up(a, 'ytlr-guide-response')) return -1;
            e = a.querySelector && a.querySelector('ytlr-guide-entry-renderer, ytlr-guide-account-entry-renderer');
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

    function swallow(ev) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
    }

    /**
     * Sends code until focus leaves the element with the tag (at most n times), one step at a
     * time: on some pages YouTube moves focus a moment after the key, not during it.
     */
    function sendUntilOut(code, tag, n, done) {
        if (n <= 0 || !up(document.activeElement, tag)) {
            if (done) done();
            return;
        }
        send(code);
        setTimeout(function () { sendUntilOut(code, tag, n - 1, done); }, 70);
    }

    /**
     * The search page is laid out differently from YouTube's (keyboard left, suggestions under it,
     * results right), so arrows that cross between those blocks are translated to YouTube's own
     * moves: suggestions are left of its keyboard and results below it.
     */
    function searchKeys(ev, k) {
        var a = document.activeElement;
        var kb = up(a, 'ytlr-search-keyboard'), sg = up(a, 'ytlr-search-suggestions'), rs = up(a, 'ytlr-search-results');
        if (k === DOWN && (up(a, 'ytlr-search-voice') || up(a, 'ytlr-search-text-box'))) {
            swallow(ev); // the keyboard is under the query field (YouTube: suggestions, then right)
            send(DOWN);
            setTimeout(function () {
                if (up(document.activeElement, 'ytlr-search-suggestions')) send(RIGHT);
            }, 70);
            return true;
        }
        if (kb) {
            var r = a.getBoundingClientRect(), R = kb.getBoundingClientRect();
            if (k === DOWN && r.bottom >= R.bottom - 8) { // bottom row: suggestions are below
                swallow(ev);
                sendUntilOut(LEFT, 'ytlr-search-keyboard', 12);
                return true;
            }
            if (k === RIGHT && r.right >= R.right - 8) { // right column: results are to the right
                swallow(ev);
                sendUntilOut(DOWN, 'ytlr-search-keyboard', 8);
                return true;
            }
            if (k === LEFT && r.left <= R.left + 8) { // nothing left of the panel
                swallow(ev);
                return true;
            }
        } else if (sg) {
            var sr = a.getBoundingClientRect(), SR = sg.getBoundingClientRect();
            if (k === RIGHT) { // results, through the keyboard
                swallow(ev);
                send(RIGHT);
                setTimeout(function () { sendUntilOut(DOWN, 'ytlr-search-keyboard', 8); }, 70);
                return true;
            }
            if (k === UP && sr.top <= SR.top + 8) { // first suggestion: the keyboard is above
                swallow(ev);
                send(RIGHT);
                return true;
            }
            if (k === LEFT) {
                swallow(ev);
                return true;
            }
        } else if (rs && k === LEFT && a.getBoundingClientRect().left < 100) {
            swallow(ev); // leftmost result: back to the keyboard (YouTube: up out of the results)
            sendUntilOut(UP, 'ytlr-search-results', 15, function () {
                if (up(document.activeElement, 'ytlr-search-suggestions')) send(RIGHT);
            });
            return true;
        }
        return false;
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
        if (location.hash.indexOf('#/search') === 0 && searchKeys(ev, k)) return;
        // Up on the top row of a page: nothing above it but the bar; Back focuses the guide.
        if (k === UP && !onWatch() && entries.length) {
            var before = document.activeElement;
            setTimeout(function () {
                var now = document.activeElement;
                var lost = now === before || (now && up(now, 'ytlr-search-bar'));
                if (lost) send(BACK);
            }, 160);
        }
    }, true);

    // ---------- bar ----------
    var lastFocused = -1, stripOff = 0, bar, strip, tabsBox, searchBtn, accountBtn, tabEls = [], builtFor = '', selected = 2;

    /** Search and person glyphs drawn with CSS boxes (Cobalt renders no SVG). */
    function glyph(parent, kind) {
        var g = el('div', 'g ' + kind, parent);
        el('i', 'a', g);
        el('i', 'b', g);
        return g;
    }

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
            glyph(searchBtn, 'search');
            accountBtn = el('div', 'circ gl', right);
            glyph(accountBtn, 'person');
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
        var img = entries[0] && entries[0].querySelector('img, image');
        var src = img && (img.getAttribute('src') || img.src);
        if (src) {
            accountBtn.style.backgroundImage = 'url("' + src + '")';
            accountBtn.classList.add('avatar');
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
                if (up(c, 'yt-icon')) return;
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

    /** On the start page the first section is "Home", unless the user is moving over the tabs. */
    function homeFocusedOrFirst(gi) {
        return gi >= 2 ? gi : 2;
    }

    // ---------- ambient glow under the focused card ----------
    var ambTile = null, ambEl = null;
    // [dx, dy, opacity]: a centre copy and two rings, so the edge fades in steps too small to see
    var AMB = [[0, 0, 0.3]];
    [[3, 0.13], [7, 0.07]].forEach(function (ring) {
        for (var k = 0; k < 8; k++) {
            var a = k * Math.PI / 4;
            AMB.push([Math.cos(a) * ring[0], Math.sin(a) * ring[0], ring[1]]);
        }
    });

    function thumbUrl(tile) {
        var th = tile.querySelector('ytlr-thumbnail-details');
        if (!th) return '';
        var bg = th.style.backgroundImage || getComputedStyle(th).backgroundImage || '';
        if (!bg || bg === 'none') return '';
        // the 320x180 variant: softer, and lighter for nine-plus copies
        return bg.replace(/\/(hq720|hqdefault|sddefault|maxresdefault)\.jpg[^"')]*/, '/mqdefault.jpg');
    }

    function ambient() {
        var tile = up(document.activeElement, 'ytlr-tile-renderer');
        if (tile === ambTile && (!ambEl || ambEl.parentNode)) return;
        if (ambEl && ambEl.parentNode) ambEl.parentNode.removeChild(ambEl);
        ambTile = tile;
        ambEl = null;
        if (!tile) return;
        var head = tile.querySelector('ytlr-tile-header-renderer'), url = thumbUrl(tile);
        if (!head || !url) {
            ambTile = null; // thumbnail not there yet: try again on the next tick
            return;
        }
        ambEl = el('div', 'tv-amb');
        var base = 6;
        AMB.forEach(function (o) {
            var c = el('i', '', ambEl);
            c.style.left = (base + o[0]) + 'px';
            c.style.top = (base + o[1]) + 'px';
            c.style.right = (base - o[0]) + 'px';
            c.style.bottom = (base - o[1]) + 'px';
            c.style.opacity = String(o[2]);
            c.style.backgroundImage = url;
        });
        // appended last: YouTube's incremental DOM matches children by position, so a node put
        // first made it drop its own thumbnail when the card was re-rendered after losing focus
        head.appendChild(ambEl);
    }

    function render() {
        ambient();
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
        document.documentElement.classList.toggle('tv-sr', !!up(document.activeElement, 'ytlr-search-results'));
        var gi = focusedEntry(entries);
        // The section on screen: the entry the user last moved to in the bar; on the start page
        // (#/) the first section. The guide's own marking only helps when nothing else does.
        var h = location.hash;
        if (gi >= 1) lastFocused = gi;
        if (h.indexOf('#/search') === 0) selected = 1;
        else if (h === '' || h === '#/' || h === '#') selected = homeFocusedOrFirst(gi);
        else if (lastFocused >= 2) selected = lastFocused;
        else {
            var cur = currentSection(entries);
            if (cur >= 2) selected = cur;
        }
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
            var box = tabsBox.clientWidth - 10, off = stripOff;
            var l = shown.offsetLeft, r = l + shown.offsetWidth;
            if (l < off) off = l;
            else if (r > off + box) off = r - box;
            stripOff = off;
            strip.style.transform = 'translateX(' + (-off) + 'px)';
        }
    }

    var errors = 0;

    function start() {
        try {
            addStyle();
            log('style', !!document.querySelector('style[nonce]'), document.querySelectorAll('ytlr-guide-entry-renderer').length);
        } catch (e) {
            log('addStyle failed', e && e.message);
        }
        setInterval(function () {
            try {
                render();
            } catch (e) {
                if (errors++ < 5) log('render failed', e && e.message, e && e.stack && e.stack.slice(0, 300));
            }
        }, 120);
        setTimeout(function () {
            var g = document.querySelector('ytlr-guide-response');
            var items = g ? g.querySelectorAll('[role],[tabindex],ytlr-guide-entry-renderer,ytlr-button') : [];
            var desc = [];
            for (var i = 0; i < items.length && i < 30; i++) {
                var it = items[i];
                desc.push(it.tagName.toLowerCase() + '[' + (it.getAttribute('role') || '') + '|' + (it.getAttribute('aria-label') || '').slice(0, 14) + ']');
            }
            log('guide', desc.join(' '));
        }, 8000);
        setTimeout(function () {
            log('after 15s', 'bar=' + !!document.getElementById('tv-bar'), 'entries=' + guideEntries().length,
                'hash=' + location.hash, 'guideOpacity=' + (document.querySelector('ytlr-guide-response') &&
                getComputedStyle(document.querySelector('ytlr-guide-response')).opacity));
        }, 15000);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
