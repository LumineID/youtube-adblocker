(async function() {
    // Raw Mainfest
    const manifestUrl = "https://raw.githubusercontent.com/LumineID/youtube-adblocker/master/manifest.json";

    // Versi AdBlocker
    const version = 1.3;

    try {
        let response = await fetch(manifestUrl);
        response = await response.json();

        const lastVersion = parseFloat(response.version);
        const currentVersion = parseFloat(version);

        const updateAvailable = (lastVersion > currentVersion);

        return ({error: null, updateIsAvailable: updateAvailable});
    }
    catch (error) {
        return ({error: error.toString(), updateIsAvailable: false});
    }
})();