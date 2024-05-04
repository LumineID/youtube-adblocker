(function() {
    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    const adSelector = [
        ".video-ads:has(.ytp-ad-player-overlay)",
        ".video-ads:has(.ytp-ad-player-overlay-layout)"
    ];

    const skipLockSelector = [
        ".video-ads:has(.ytp-preview-ad)",
        ".video-ads:has(.ytp-ad-player-overlay-skip-or-preview)"
    ]

    const skipButtonSelector = [
        ".ytp-skip-ad-button",
        ".ytp-ad-skip-button-modern"
    ];

    browser.runtime.sendMessage({action: "log", message: `Adblocker sedang berjalan dilatar belakang 🏃‍♂️`});

    function debounce(func, timeout) {
        let timer; 
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        }
    }

    const removeAds = debounce(function() {
        const ads = adSelector.map(selector => document.querySelector(selector))
            .filter(el => el instanceof HTMLElement);
        const skipLock = skipLockSelector.map(selector => document.querySelector(selector))
            .filter(el => el instanceof HTMLElement);

        const hasVideoAds = ads.length > 0;
        const hasSkipLock = skipLock.length > 0;

        let videoPlayer = null;

        if (hasVideoAds && hasSkipLock && (videoPlayer = document.querySelector("video.video-stream[src]"))) {
            videoPlayer.muted = true;
            videoPlayer.currentTime = videoPlayer.duration - 0.1;
            videoPlayer.paused && videoPlayer.play();
        }

        if (hasVideoAds) {
            skipButtonSelector.forEach(selector => document.querySelector(selector)?.click());
            const count = Number(document.documentElement.getAttribute("ad-skip-count") || 0) + 1;
            document.documentElement.setAttribute("ad-skip-count", String(count));
            browser.runtime.sendMessage({action: "log", message: `ADS dilewati (${count}) ✔️`})
        }
    }, 200);

    removeAds();
    setTimeout(() => {
        if (window.__OBSERVER) {
            // DISCONNECT PREVIOUS OBSERVER
            window.__OBSERVER.disconnect();
        }

        const targetNode = document.querySelector("div.video-ads");

        if (!targetNode) {
            browser.runtime.sendMessage({action: "log", message: ["Chanel ini tidak menggunkan ADS.", "w"]})
            return;
        }

        /**
         * Alih-alih menggunakan fungsi 'setInterval' seperti script AdBlocker pada umumnya
         * disini saya cukup menggunakan 'MutationObserver' untuk membaca perubahan DOM
         * dengan cara ini jauh lebih efisien untuk menghemat penggunakan memori daripada menggunakan 'setInterval'. 
         */

        window.__OBSERVER = new MutationObserver(removeAds)
        window.__OBSERVER.observe(targetNode, {
            childList: true,
            attributes: true,
            subtree: true   
        });
    }, 1000)
})();