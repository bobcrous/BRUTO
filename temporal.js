/* BRUTO — ventana especial del 23/09/2026, 20:00–22:00 GMT-3 */
(function () {
    "use strict";

    // GMT-3: 23/09/2026 20:00 = 23/09/2026 23:00 UTC
    // GMT-3: 23/09/2026 22:00 = 24/09/2026 01:00 UTC
    const SPECIAL_START = Date.parse("2026-09-23T23:00:00Z");
    const SPECIAL_END = Date.parse("2026-09-24T01:00:00Z");

    function isSpecialWindow() {
        const now = Date.now();
        return now >= SPECIAL_START && now < SPECIAL_END;
    }

    function isIndexPage() {
        const path = window.location.pathname.toLowerCase();
        return path.endsWith("/") || path.endsWith("/index.html");
    }

    function isCreditsPage() {
        return /\/credits-\d+\.html$/i.test(window.location.pathname);
    }

    function activateSpecialMode() {
        if (isIndexPage()) {
            // Durante la ventana especial, cualquier canción lleva directamente
            // a su página de créditos correspondiente.
            document.querySelectorAll('a[href^="track-"][href$=".html"]').forEach(function (link) {
                const match = link.getAttribute("href").match(/^track-(\d+)\.html$/i);
                if (!match) return;
                link.setAttribute("href", "credits-" + match[1] + ".html");
            });
        }

        if (isCreditsPage()) {
            // Oculta solamente "VOLVER A LA LETRA" durante la ventana especial.
            document.querySelectorAll('a[href^="track-"][href$=".html"]').forEach(function (link) {
                if (link.textContent.trim().toUpperCase() === "[ VOLVER A LA LETRA ]") {
                    link.remove();
                }
            });
        }
    }

    if (isSpecialWindow()) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", activateSpecialMode);
        } else {
            activateSpecialMode();
        }
    }
})();
