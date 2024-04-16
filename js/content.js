(function() {
    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        const config = { attributes: true };
        const observer = new MutationObserver(changeAttributes);
        observer.observe(document.documentElement, config);

    }
    
    function changeAttributes(mutation) {
        if (!mutation[0]) {
            return;
        }
        switch (mutation[0].attributeName) {
            case "ad-skip-count":
                var value =  Number(mutation[0].target.attributes["ad-skip-count"]?.value || 0);
                if (value > 0) browser.storage.local.set({ AD_SKIP_COUNT: JSON.stringify(value) });
                break;
            case "ad-update-available":
                var value = mutation[0].target.attributes["ad-update-available"]?.value;
                browser.storage.local.set({ AD_UPDATE_AVAILABLE: JSON.stringify(value === "true")});
                break;
        }
    }
})();
