(function() {
    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    // Tag, Attribute dan Class statis ADS
    const staticAds = [
        "ytd-banner-promo-renderer",
        "ytd-in-feed-ad-layout-renderer",
        "ytd-ad-slot-renderer",
        "ytd-engagement-panel-ad-subtitle-renderer",
        "ytd-ad-hover-text-button-renderer",
        "ad-slot-renderer",
        "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
        ".ytd-engagement-panel-ad-subtitle-renderer",
        ".ytd-in-feed-ad-layout-renderer",
        ".ytd-player-legacy-desktop-watch-ads-renderer",
        ".ytd-action-companion-ad-renderer",
        ".ytd-ad-slot-renderer",
        ".ytd-display-ad-renderer",
        ".companion-ad-container",
        ".companion-ad-body-container",
        ".companion-ad-icon",
        ".companion-ad-body",
        ".companion-ad-menu"
    ];

    const alredyInjected = Boolean(document.querySelector("style[data-id='static-ads-remover']"));

    if (alredyInjected) {
        return;
    }

    const el = document.createElement("style");
    el.setAttribute("data-id", "static-ads-remover");
    el.textContent = `${staticAds.join(', ')} { display: none !important; visibility: hidden !important }`;

    document.head.appendChild(el);

    browser.runtime.sendMessage({action: "log", message: "Penghapus statis ADS ditambahkan."})
})();