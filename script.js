    const shortcodes = {
        g: { url: "www.google.com/search?q=", desc: "Google" },
        gm: { url: "www.google.com/maps/search/", base: "google.com/maps", desc: "Google Maps" },
        gt: { url: "trends.google.com/explore?q=", desc: "Google Trends" },
        yt: { url: "www.youtube.com/search?q=", desc: "YouTube" },
        appm: { url: "music.apple.com/search?term=", desc: "Apple Music" },
        b: { url: "www.bing.com/search?q=", desc: "Bing Search" },
        ddg: { url: "start.duckduckgo.com/?q=", desc: "DuckDuckGo" },
        ddgh: { url: "html.duckduckgo.com/html?q=", desc: "DuckDuckGo (HTML)" },
        ddgl: { url: "lite.duckduckgo.com/lite?q=", desc: "DuckDuckGo (Lite)" },
        yan: { url: "yandex.com/search/?text=", desc: "Yandex" },
        y: { url: "search.yahoo.com/search?p=", desc: "Yahoo!" },
        ask: { url: "www.ask.com/web?q=", desc: "Ask" },
        q: { url: "www.qwant.com/?q=", desc: "Qwant" },
        sp: { url: "www.startpage.com/do/search?query=", desc: "StartPage" },
        br: { url: "search.brave.com/search?q=", desc: "Brave Search" },
        eco: { url: "www.ecosia.org/search?q=", desc: "Ecosia" },
        amz: { url: "www.amazon.co.uk/s?k=", desc: "Amazon" },
        hn: { url: "hn.algolia.com/?q=", base: "news.ycombinator.com", desc: "Hacker News" },
        w: { url: "wikipedia.org/w/index.php?search=", desc: "Wikipedia" },
        ud: { url: "www.urbandictionary.com/define.php?term=", desc: "Urban Dictionary" },
        r: { url: "www.reddit.com/search/?q=", desc: "Reddit" },
        ciu: { url: "caniuse.com/?search=", desc: "Can I Use" },
        imdb: { url: "www.imdb.com/find/?q=", desc: "IMDB" },
        osm: { url: "www.openstreetmap.org/search?query=", desc: "OpenStreetMap" },
        mdn: { url: "developer.mozilla.org/en-US/search?q=", desc: "MDN Web Docs" },
        html: { url: "developer.mozilla.org/en-US/search?topic=html&q=", base: "developer.mozilla.org/en-US/docs/Web/HTML", desc: "MDN HTML" },
        css: { url: "developer.mozilla.org/en-US/search?topic=css&q=", base: "developer.mozilla.org/en-US/docs/Web/CSS", desc: "MDN CSS" },
        js: { url: "developer.mozilla.org/en-US/search?topic=js&q=", base: "developer.mozilla.org/en-US/docs/Web/JavaScript", desc: "MDN JavaScript" },
        cfd: { url: "developer.chrome.com/s/results?q=", desc: "Chrome for Developers" },
        pypi: { url: "pypi.org/search/?q=", desc: "Python Package Index" },
        bs: { url: "bsky.app/search?q=", desc: "Bluesky" },
        gh: { url: "github.com/search?q=", desc: "GitHub" },
        mcw: { url: "minecraft.wiki/w/?search=", desc: "Minecraft Wiki" },
        sms: { url: "searchmysite.net/search/?q=", desc: "Search My Site" },
        s: { url: "www.shodan.io/search?query=", desc: "Shodan" },
        apple: { url: "www.apple.com/search/", desc: "Apple" },
        v: { url: "www.theverge.com/search?q=", desc: "The Verge" },
    };

    function getUrlParameter(name) {
        const regex = new RegExp(`[?&]${name}=([^&#]*)`),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function getBaseUrl(url) {
        const urlObj = new URL("https://" + url);
        return urlObj.origin;
    }

    function processCode(code, isSnap) {
        const shortcodeKey = code.toLowerCase();
        const matchingShortcode = Object.keys(shortcodes).find((key) => key.toLowerCase() === shortcodeKey);

        if (matchingShortcode) {
            if (isSnap) {
                const baseUrl = shortcodes[matchingShortcode].base || getBaseUrl(shortcodes[matchingShortcode].url);
                if (baseUrl) {
                    return {
                        type: "snap",
                        result: `site:${baseUrl.replace("https://", "")} `,
                    };
                }
            } else {
                return {
                    type: "bang",
                    result: "https://" + shortcodes[matchingShortcode].url,
                };
            }
        }
        return null;
    }

    function performSearch(query, defaultEngine) {
        let searchUrl = defaultEngine;
        let sitePrefix = "";
        let processedQuery = query;

        const tokens = query.split(" ");
        const processedTokens = [];
        let bangFound = false;
        let snapFound = false;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.startsWith("!")) {
                const bangCode = token.slice(1);
                const result = processCode(bangCode, false, defaultEngine);

                if (result && result.type === "bang") {
                    searchUrl = result.result;
                    bangFound = true;
                } else {
                    processedTokens.push(token);
                }
            } else {
                processedTokens.push(token);
            }
        }

        const finalTokens = [];
        for (let i = 0; i < processedTokens.length; i++) {
            const token = processedTokens[i];
            if (token.startsWith("@")) {
                const snapCode = token.slice(1);
                const result = processCode(snapCode, true, defaultEngine);

                if (result && result.type === "snap") {
                    sitePrefix = result.result;
                    snapFound = true;
                } else {
                    finalTokens.push(token);
                }
            } else {
                finalTokens.push(token);
            }
        }

        processedQuery = finalTokens.join(" ");

        if (!processedQuery.trim()) {
            const shortcodeKey = Object.keys(shortcodes).find((key) => "https://" + shortcodes[key].url === searchUrl);

            if (shortcodeKey) {
                if (shortcodes[shortcodeKey].base) {
                    window.location.href = "https://" + shortcodes[shortcodeKey].base;
                } else {
                    window.location.href = searchUrl.split("/").slice(0, 3).join("/");
                }
            } else {
                window.location.href = searchUrl;
            }
            return;
        }

        if (snapFound) {
            processedQuery = sitePrefix + processedQuery;
        }

        window.location.href = `${searchUrl}${encodeURIComponent(processedQuery)}`;
    }

    (function () {
        const searchQuery = getUrlParameter("q");
        const defaultEngine = localStorage.getItem("selectedEngine");

        if (searchQuery) {
            performSearch(searchQuery, defaultEngine);
        }
    })();

    document.addEventListener("DOMContentLoaded", function () {
        const scriptEnabled = document.getElementById("script-enabled"),
            searchForm = document.getElementById("search-form"),
            searchInput = document.getElementById("search-input"),
            engineSelect = document.getElementById("engine-select"),
            shortcodeList = document.getElementById("shortcode-list");

        function createShortcodeList() {
            const fragment = document.createDocumentFragment();
            Object.entries(shortcodes)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([code, { desc }]) => {
                    const li = document.createElement("li");
                    li.textContent = `${code} - ${desc}`;
                    fragment.appendChild(li);
                });
            shortcodeList.appendChild(fragment);
        }

        function saveSelectedEngine() {
            localStorage.setItem("selectedEngine", engineSelect.value);
        }

        function loadSelectedEngine() {
            const savedEngine = localStorage.getItem("selectedEngine");
            if (savedEngine) {
                engineSelect.value = savedEngine;
            }
        }

        function setupEventListeners() {
            engineSelect.addEventListener("change", saveSelectedEngine);

            searchForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                performSearch(query, engineSelect.value);
            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "/" && document.activeElement !== searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                } else if (e.key === "Escape" && document.activeElement === searchInput) {
                    searchInput.value = "";
                }
            });
        }

        function init() {
            scriptEnabled.style.display = "flex";
            createShortcodeList();
            loadSelectedEngine();
            setupEventListeners();
        }

        init();
    })();
