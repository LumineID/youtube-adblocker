(function() {
    // maksimal whitelist chanel
    const maxWhitelist = 20;

    // jangan diganti xd:)
    const footerLink = [
        { text: "Facebook", url: "https://www.facebook.com/lumine-id" },
        { text: "Github", url: "https://github.com/LumineID" },
        { text: "Trakter", url: "https://trakteer.id/lumine_id?open=true" }
    ];

    if (typeof browser === "undefined") {
        var browser = typeof chrome !== "undefined" ? chrome : null;
    }

    async function init() {
        Object.assign(this, await getLocalSettings());

        if (this.AD_WHITELISTS.length == 0) {
            this.AD_WHITELISTS.push("");
        }

        this.$watch("AD_WHITELISTS", function(value) {
            browser.storage.local.set({ AD_WHITELISTS: JSON.stringify(value) });
        });

        browser.storage.onChanged.addListener(async function() {
            Object.assign(this, await getLocalSettings());
        }.bind(this));

        chrome.windows.onFocusChanged.addListener(function(window) {
            (window !== -1) && browser.storage.local.set({AD_WHITELISTS: JSON.stringify(
                [...new Set(this.AD_WHITELISTS)].filter(user => user.trim() !== "")
            )});
        }.bind(this));

        browser.tabs.query({active: true, currentWindow: true}, async function(tab) {
            tab = tab[0];
            this.isNotYoutubeUrl = !tab?.url.toLowerCase().match(/^https:\/\/(www|m|music)\.youtube\.com/i);
            this.isYoutubeMusic = tab?.url.toLowerCase().match(/^https:\/\/music\.youtube\.com/i);

            if (this.isNotYoutubeUrl) {
                return;
            }

            browser.scripting.executeScript({
                target: {tabId: tab.id},
                files: ["js/check-update.js"]
            }, function (response) {
                if (response?.[0]) {
                    browser.scripting.executeScript({
                        target: {tabId: tab.id},
                        args: [response[0].result],
                        function: function(result) {
                            if (result.error) {
                                document.documentElement.removeAttribute("ad-update-available")
                            } else {
                                document.documentElement.setAttribute("ad-update-available", String(result.updateIsAvailable))
                            }
                        }
                    })
                }
            });

            this.videoData = (await browser.scripting.executeScript({
                target: {tabId: tab.id},
                function: function() {
                    const data = document.documentElement.getAttribute("ad-video-data")?.trim();
                    return data ? JSON.parse(data) : null;
                }
            }))?.[0]?.result;

            this.$nextTick(function() {
                [...document.querySelectorAll("input[name='whitelist']")].forEach(function(el) {
                    if (el.value === this.videoChanelUsername()) {
                        el.classList.add("primary");
                    }
                }.bind(this))
            }.bind(this))
        }.bind(this));
    }

    function reload() {
        chrome.tabs.query({}, function(tabs) {
            tabs.filter(
                tab => String(tab.url).toLowerCase().match(/^https:\/\/(www|m)\.youtube\.com/i)
            ).forEach(tab => chrome.tabs.reload(tab.id))
        })
    }

    function openChanel(e) {
        const username = e.srcElement.dataset.user || "";
        username.trim() && browser.tabs.create({
            url: `https://www.youtube.com/@${username}`,
            selected: true,
            index: 0
        })
    }

    function copyText(e) {
        const text = e.srcElement.dataset.text || "";
        if (text) {
            const el = document.createElement("input");
            el.setAttribute("value", text);
            document.body.appendChild(el);
            el.setSelectionRange(0, 9999999999);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
        }
    }

    function changeCheckbox(e) {
        const name = e.target.attributes.name.nodeValue;
        this[name] = e.target.checked;
        browser.storage.local.set({ [name]: JSON.stringify(e.target.checked) });
    }

    function addWhitelist() {
        if (this.AD_WHITELISTS.length < maxWhitelist) {
            this.AD_WHITELISTS.push("");
            this.$nextTick(function() {
                Array.from(document.querySelectorAll("input[name='whitelist']")).pop()?.focus();
            })
        }
    }

    function deleteWhitelist(e) {
        const index = Number(e.target.dataset.id);
        this.AD_WHITELISTS.splice(index, 1);
    }

    function changeWhitelist(e) {
        const index = Number(e.target.dataset.id);
        const value = e.target.value.replace(/[^a-zA-Z0-9\-_]/gi,"").slice(0, 100);
        e.target.value = value;
        this.AD_WHITELISTS[index] = value;
        if (value === this.videoChanelUsername()) {
            e.target.classList.add("primary");
        } else {
            e.target.classList.remove("primary");
        }
    }   

    function toggleShowSetting() {
        this.showSetting = !this.showSetting;
    }

    function showSectionMain() {
        return this.showSetting === false;
    }

    function showSectionSetting() {
        return this.showSetting === true;
    }

    function isDisabledBtnWhitelist() {
        return this.AD_WHITELISTS.length >= maxWhitelist;
    }

    function whitelistCount() {
        return this.AD_WHITELISTS.length;
    }

    function hasVideoData() {
        return this.videoData && typeof this.videoData === "object";
    }

    function videoChanelUrl() {
        return this.videoData?.chanelUrl;
    }

    function videoChanelName() {
        return this.videoData?.chanelName;
    }

    function videoChanelUsername() {
        return this.videoData?.chanelUsername;
    }

    function videoTitle() {
        return this.videoData?.videoTitle;
    }

    async function getLocalSettings() {
        const storage = await browser.storage.local.get([
            "AD_SKIPPER",
            "AD_STATIC",
            "AD_IGNORE_SUBSCRIBER",
            "AD_WHITELIST",
            "AD_WHITELISTS",
            "AD_SKIP_COUNT",
            "AD_UPDATE_AVAILABLE"
        ]);

        return Object.keys(storage)
            .reduce((result, key) => ({...result, [key]: JSON.parse(storage[key])}), {});
    }

    window.addEventListener("alpine:init", () => {
        Alpine.data("adblocker", () => ({
            AD_SKIPPER: false,
            AD_STATIC: false,
            AD_IGNORE_SUBSCRIBER: false,
            AD_WHITELIST: false,
            AD_WHITELISTS: [],
            AD_SKIP_COUNT: 0,
            AD_UPDATE_AVAILABLE: false,
            videoData: null,
            showSetting: false,
            isNotYoutubeUrl: false,
            isYoutubeMusic: false,
            maxWhitelist,
            maxWhitelist,
            footerLink,
            init,
            reload,
            openChanel,
            copyText,
            changeCheckbox,
            addWhitelist,
            deleteWhitelist,
            changeWhitelist,
            toggleShowSetting,
            showSectionMain,
            showSectionSetting,
            isDisabledBtnWhitelist,
            whitelistCount,
            hasVideoData,
            videoChanelUrl,
            videoChanelName,
            videoChanelUsername,
            videoTitle
        }))
    })
})();