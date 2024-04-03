(function () {
    // Aktifkan pesan debuging di console
    const debugMessages = true;

    // Cek update
    const checkUpdate = true;

    // Hapus Statis ADS
    const removeStaticAds = true;

    // Link Script
    const scriptLink = "https://github.com/LumineID/youtube-adblocker";

    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    browser.runtime.onInstalled.addListener(onInstalled);
    browser.tabs.onUpdated.addListener(onTabsUpdated);
    browser.runtime.onMessage.addListener(onMessage);

    function getAllTabId() {
        return new Promise(resolve => {
            browser.tabs.query({}, tabs => {
                const result = tabs.filter(
                    tab => String(tab.url).toLowerCase().match(/^https:\/\/(www|m)\.youtube\.com/i)
                ).map(tab => tab.id);
                resolve(result);
            })
        })
    }

    function getCurrentTabId() {
        return new Promise(function (resolve) {
            browser.tabs.query({active: true, currentWindow: true}, ([{ id }]) => resolve(id));
        })
    }

    function executeScript(args) {
        return new Promise(function (resolve) {
            browser.scripting.executeScript(args, resolve);
        })
    }

    async function onInstalled(details) {
        if (details.reason === "install") {
            (await getAllTabId()).forEach(id => browser.tabs.reload(id))
        }
    }

    async function onTabsUpdated(id, info, tab) {
        if (info.status !== "complete") {
            return;
        }

        const isYoutube = String(tab.url).toLowerCase().match(/^https:\/\/(www|m)\.youtube\.com/i);
        const isWatching = String(tab.url).toLowerCase().match(/^https:\/\/(www|m)\.youtube\.com\/watch/i);

        if (!isYoutube) {
            return;
        }

        if (isWatching) {
            executeScript({target: {tabId: id}, files: ["js/adblocker.js"]});
        }

        if (removeStaticAds) {
            executeScript({target: {tabId: id}, files: ["js/static-ads.js"]})
        }

        if (checkUpdate) {
            checkForUpdate();
        }

        const result = await browser.storage.local.get(["AD_SKIP_COUNT"]);

        executeScript({
            target: { tabId: id },
            args: [result.AD_SKIP_COUNT || 0],
            function: count => document.documentElement.setAttribute("ad-skip-count", count)
        })
    }

    function onMessage(event) {
        if (event.action === "log") {
            const message = Array.isArray(event.message) ? event.message : [event.message];
            log(...message);
        }
    }

    async function checkForUpdate() {
        const tabId = await getCurrentTabId();
        const hasIgnoreUpdate = (await executeScript({
            target: {tabId},
            function: () => document.documentElement.hasAttribute("ad-update-available")
        }))?.[0].result;

        if (hasIgnoreUpdate) {
            return;
        }

        const response = await executeScript({
            target: { tabId },
            files: ["js/check-update.js"]
        });

        if (!response?.[0]) {
            return;
        }

        const result = response[0].result;

        if (result.error) {
            log(`Gagal mengecek versi baru. '${result.error}'`, "e", result.error);
        }

        if (result.updateIsAvailable) {
            log(`Update Tersedia. update script melalui link: ${scriptLink}`, "w");
        }

        (await getAllTabId()).forEach(function (id) {
            executeScript({
                target: { tabId: id },
                args: [result.updateIsAvailable],
                function: function (updateAvailable) {
                    document.documentElement.setAttribute("ad-update-available", String(updateAvailable));
                }
            })
        })
    }

    function log(message, error = "l", ...args) {
        if (!debugMessages) {
            return;
        }

        getCurrentTabId().then(function(id) {
            executeScript({
                target: {tabId: id},
                args: [message, error, ...args],
                function: function(message, error, ...args) {
                    message = `\x1b[34mLumineID/youtube-adblocker:\x1b[0m ${message}`;
                    switch (error) {
                        case "l":
                        case "log":
                            console.log(message, ...args);
                            break;
                        case "w":
                        case "warning":
                            console.warn(message, ...args);
                            break;
                        case "e":
                        case "error":
                            console.error(message, ...args);
                            break;
                        case "i":
                        case "info":
                        default:
                            console.info(message, ...args);
                            break;
                    }
                }
            })
        })
    }
})();