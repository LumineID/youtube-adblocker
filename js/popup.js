(function() {
    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    async function syncStorage() {
        const result = await browser.storage.local.get([
            "AD_SKIP_COUNT",
            "AD_UPDATE_AVAILABLE"
        ]);

        document.querySelector("[data='ad-count']").innerText = String(result.AD_SKIP_COUNT || 0);

        if (result.AD_UPDATE_AVAILABLE) {
            document.querySelector("[data='ad-update']").classList.remove("hidden");
        } else {
            document.querySelector("[data='ad-update']").classList.add("hidden");
        }
    }

    function init() {
        browser.tabs.query({active: true, currentWindow: true}, async function(tab) {
            if (tab?.[0].url.match(/^https:\/\/(www|m)\.youtube\.com/i)) {
                document.querySelector("[data='ad-open-youtube']").classList.add("hidden");
    
                const response = await browser.scripting.executeScript({
                    target: {tabId: tab[0].id},
                    files: ["js/check-update.js"]
                });

                if (!response?.[0]) {
                    return;
                }

                browser.scripting.executeScript({
                    target: {tabId: tab[0].id},
                    args: [response[0].result],
                    function: function(result) {
                        if (result.error) {
                            document.documentElement.removeAttribute("ad-update-available")
                        } else {
                            document.documentElement.setAttribute("ad-update-available", String(result.updateIsAvailable))
                        }
                    }
                })
            } else {
                document.querySelector("[data='ad-open-youtube']").classList.remove("hidden");
            }
        })
    }

    browser.storage.onChanged.addListener(syncStorage);
    init();
    syncStorage();
})();