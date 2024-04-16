(function () {
    // Aktifkan pesan debuging di console
    const debugMessages = true;

    // Cek update
    const checkUpdate = true;

    const defaultSettings = {
        AD_SKIPPER: true,
        AD_STATIC: true,
        AD_IGNORE_SUBSCRIBER: false,
        AD_WHITELIST: false,
        AD_SKIP_COUNT: 0,
        AD_WHITELISTS: []
    }

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
                    tab => String(tab.url).toLowerCase().match(/^https:\/\/(www|m|music)\.youtube\.com/i)
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
            (await getAllTabId()).forEach(id => browser.tabs.reload(id));

            Object.keys(defaultSettings).forEach(function(key) {
                browser.storage.local.set({ [key]: JSON.stringify(defaultSettings[key]) })
            })
        }
    }

    async function onTabsUpdated(id, info, tab) {
        if (info.status !== "complete") {
            return;
        }

        const isYoutube = String(tab.url).toLowerCase().match(/^https:\/\/(www|m|music)\.youtube\.com/i);
        const isYoutubeMusic = String(tab.url).toLowerCase().match(/^https:\/\/music\.youtube\.com/i);
        const isWatching = String(tab.url).toLowerCase().match(/^https:\/\/(www|m|music)\.youtube\.com\/watch/i);

        if (!isYoutube) {
            return;
        }

        const settings = await getLocalSettings();

        let hasAdblocker = (isWatching && settings.AD_SKIPPER);
        let videoData = null;

        if (hasAdblocker && !isYoutubeMusic && (settings.AD_IGNORE_SUBSCRIBER || (settings.AD_WHITELIST && settings.AD_WHITELISTS.length > 0))) {
            if (!(videoData = await getVideoData((new URL(tab.url)).searchParams.get("v")))) {
                log("Informasi vidio tidak dapat dimuat dengan ini pengaturan adblocker tidak berfungsi dengan semestinya.", "w");
            } else {
                hasAdblocker = !((settings.AD_IGNORE_SUBSCRIBER && videoData.isSubscribed) || settings.AD_WHITELISTS.includes(videoData.chanelUsername));
                if (!hasAdblocker) {
                    log(`Chanel '${videoData.chanelName}' dikecualikan oleh adblocker.`);
                    log("Iklan akan tetap muncul dalam vidio ini.");
                }
            }
        }

        if (hasAdblocker) {
            executeScript({target: {tabId: id}, files: ["js/adblocker.js"]})
        }

        if (settings.AD_STATIC) {
            executeScript({target: {tabId: id}, files: ["js/static-ads.js"]})
        }

        if (checkUpdate) {
            checkForUpdate();
        }

        const result = await browser.storage.local.get(["AD_SKIP_COUNT"]);

        executeScript({
            target: { tabId: id },
            args: [result.AD_SKIP_COUNT || 0, videoData],
            function: (count, videoData) => {
                document.documentElement.setAttribute("ad-skip-count", count);
                if (videoData) {
                    document.documentElement.setAttribute("ad-video-data", JSON.stringify(videoData));
                } else {
                    document.documentElement.removeAttribute("ad-video-data");
                }
            }
        })
    }

    function onMessage(event) {
        if (event.action === "log") {
            const message = Array.isArray(event.message) ? event.message : [event.message];
            log(...message);
        }
    }

    async function getLocalSettings() {
        const storage = await browser.storage.local.get([
            "AD_SKIPPER",
            "AD_STATIC",
            "AD_IGNORE_SUBSCRIBER",
            "AD_WHITELIST",
            "AD_WHITELISTS"
        ]);

        return Object.keys(storage)
            .reduce((result, key) => ({...result, [key]: JSON.parse(storage[key])}), {});
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

    function getVideoData(videoId) {
        return new Promise(function(resolve) {
            if (typeof videoId !== "string" || videoId.trim() == "") {
                return resolve(null);
            }

            fetch(`https://www.youtube.com/watch?v=${videoId}#VIDEO_DATA`).then(r => r.text()).then(function(text) {
                const scriptInitData = text.match(/>var\sytInitialData\s=(.*?);</i)
                const scriptInitPlayer = text.match(/>var\sytInitialPlayerResponse\s=(.*?);var/i);
                
                if (!scriptInitPlayer?.[1]) {
                    return resolve(null);
                }

                const data = JSON.parse(scriptInitPlayer[1].trim());
                const playerMicroformatRenderer = data.microformat.playerMicroformatRenderer;
    
                if (scriptInitData?.[1]) {
                    Object.assign(data, JSON.parse(scriptInitData[1].trim()))
                }
    
                const result = {
                    chanelName: playerMicroformatRenderer.ownerChannelName,
                    chanelUsername: playerMicroformatRenderer.ownerProfileUrl.match(/\@(.*)$/i)?.[1] || null,
                    chanelUrl: playerMicroformatRenderer.ownerProfileUrl,
                    videoTitle: playerMicroformatRenderer.title.simpleText,
                    isSubscribed: null
                }
    
                let subscribeButtonRenderer;
    
                if (data.annotations && data.annotations.length > 0) {
                    subscribeButtonRenderer = data.annotations.find(
                        item => Boolean(item.playerAnnotationsExpandedRenderer)
                    ).playerAnnotationsExpandedRenderer.featuredChannel.subscribeButton.subscribeButtonRenderer;
                } else if (data.contents?.twoColumnWatchNextResults) {
                    subscribeButtonRenderer = data.contents.twoColumnWatchNextResults.results.results.contents.find(
                        item => Boolean(item.videoSecondaryInfoRenderer)
                    ).videoSecondaryInfoRenderer.subscribeButton.subscribeButtonRenderer;
                }
    
                if (subscribeButtonRenderer) {
                    Object.assign(result, { isSubscribed: subscribeButtonRenderer.subscribed });
                }
    
                resolve(result);
            }).catch((e) => resolve(null))
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