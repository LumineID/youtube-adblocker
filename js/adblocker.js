(function() {
    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    browser.runtime.sendMessage({action: "log", message: `Adblocker sedang berjalan dilatar belakang 🏃‍♂️`});

    function debounce(func, timeout) {
        let timer; 
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        }
    }

    const removeAds = debounce(function() {
        const videoAds = document.querySelector(".video-ads:has(.ytp-ad-player-overlay)");
        const skipLock = document.querySelector(".ytp-ad-preview-text-modern")?.innerText?.trim();

        if (videoAds && skipLock) {
            const videoPlayer = document.getElementsByClassName("video-stream")[0];
            // videoPlayer.muted = true;
            videoPlayer.currentTime = videoPlayer.duration - 0.1;
            videoPlayer.paused && videoPlayer.play();
        }

        if (videoAds) {
            document.querySelector(".ytp-ad-skip-button")?.click();
            document.querySelector(".ytp-ad-skip-button-modern")?.click();

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