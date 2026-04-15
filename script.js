const shortcodes = globalThis.SEARCH_SHORTCODES || {};

const fallbackEngine = "https://lite.duckduckgo.com/lite?q=";
const exampleQueries = [
    { label: "!yt ambient mix", value: "!yt ambient mix" },
    { label: "@mdn querySelector", value: "@mdn querySelector" },
    { label: "!gm Stamford Bridge", value: "!gm nearest stations" },
    {
        label: "@github.com static site search",
        value: "@github.com static site search",
    },
];

function getUrlParameter(name) {
    const regex = new RegExp(`[?&]${name}=([^&#]*)`);
    const results = regex.exec(window.location.search);
    return results === null
        ? ""
        : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getAbsoluteUrl(url) {
    return new URL(url.startsWith("http") ? url : `https://${url}`);
}

function getBaseUrl(url) {
    return getAbsoluteUrl(url).origin;
}

function normalizeExplicitSiteTarget(value) {
    const normalizedValue = value
        .trim()
        .replace(/^[a-z][a-z\d+.-]*:\/\//i, "")
        .replace(/\/+$/, "");

    if (!normalizedValue || /\s/.test(normalizedValue)) {
        return null;
    }

    const hostname = normalizedValue
        .replace(/\/.*$/, "")
        .replace(/:\d+$/, "")
        .replace(/^www\./i, "");

    if (!/^(?:[a-z0-9-]+\.)+[a-z0-9-]{2,}$/i.test(hostname)) {
        return null;
    }

    return hostname.toLowerCase();
}

function findShortcode(code) {
    const shortcodeKey = code.toLowerCase();
    return (
        Object.entries(shortcodes).find(
            ([key]) => key.toLowerCase() === shortcodeKey,
        ) || null
    );
}

function findShortcodeBySearchUrl(searchUrl) {
    return (
        Object.entries(shortcodes).find(
            ([, value]) => `https://${value.url}` === searchUrl,
        ) || null
    );
}

function getRouteLabel(searchUrl) {
    const matchingShortcode = findShortcodeBySearchUrl(searchUrl);

    if (matchingShortcode) {
        return matchingShortcode[1].desc;
    }

    try {
        return getAbsoluteUrl(searchUrl).hostname.replace(/^www\./, "");
    } catch {
        return "selected engine";
    }
}

function getHomeUrl(searchUrl) {
    const matchingShortcode = findShortcodeBySearchUrl(searchUrl);

    if (matchingShortcode) {
        const [, value] = matchingShortcode;
        return value.base ? `https://${value.base}` : getBaseUrl(value.url);
    }

    try {
        return getAbsoluteUrl(searchUrl).origin;
    } catch {
        return searchUrl;
    }
}

function processCode(code, isSnap) {
    const matchingShortcode = findShortcode(code);

    if (!matchingShortcode && isSnap) {
        const explicitSiteTarget = normalizeExplicitSiteTarget(code);

        if (explicitSiteTarget) {
            return {
                type: "snap",
                key: explicitSiteTarget,
                label: explicitSiteTarget,
                target: explicitSiteTarget,
                result: `site:${explicitSiteTarget} `,
            };
        }
    }

    if (!matchingShortcode) {
        return null;
    }

    const [key, value] = matchingShortcode;
    const target = (value.base || getBaseUrl(value.url)).replace(
        "https://",
        "",
    );

    if (isSnap) {
        return {
            type: "snap",
            key,
            label: value.desc,
            target,
            result: `site:${target} `,
        };
    }

    return {
        type: "bang",
        key,
        label: value.desc,
        target,
        result: `https://${value.url}`,
    };
}

function analyzeQuery(query, defaultEngine) {
    let searchUrl = defaultEngine || fallbackEngine;
    let sitePrefix = "";
    let processedQuery = query.trim();
    let bang = null;
    let snap = null;

    const tokens = processedQuery ? processedQuery.split(/\s+/) : [];
    const withoutBangTokens = [];

    for (const token of tokens) {
        if (token.startsWith("!") && token.length > 1) {
            const result = processCode(token.slice(1), false);

            if (result) {
                searchUrl = result.result;
                bang = result;
                continue;
            }
        }

        withoutBangTokens.push(token);
    }

    const finalTokens = [];
    for (const token of withoutBangTokens) {
        if (token.startsWith("@") && token.length > 1) {
            const result = processCode(token.slice(1), true);

            if (result) {
                sitePrefix = result.result;
                snap = result;
                continue;
            }
        }

        finalTokens.push(token);
    }

    processedQuery = finalTokens.join(" ");

    if (snap) {
        processedQuery = processedQuery
            ? `${sitePrefix}${processedQuery}`
            : sitePrefix.trim();
    }

    return {
        searchUrl,
        processedQuery,
        bang,
        snap,
        selectedLabel: getRouteLabel(defaultEngine || fallbackEngine),
        destinationLabel: getRouteLabel(searchUrl),
        homeUrl: getHomeUrl(searchUrl),
    };
}

function openInNewTab(url) {
    const newTab = window.open(url, "_blank", "noopener,noreferrer");

    if (newTab) {
        newTab.opener = null;
        return;
    }

    window.location.assign(url);
}

function performSearch(query, defaultEngine) {
    openInNewTab(getSearchDestinationUrl(query, defaultEngine));
}

function getSearchDestinationUrl(query, defaultEngine) {
    const analysis = analyzeQuery(query, defaultEngine);

    if (!analysis.processedQuery.trim()) {
        return analysis.homeUrl;
    }

    return `${analysis.searchUrl}${encodeURIComponent(analysis.processedQuery)}`;
}

(function () {
    const searchQuery = getUrlParameter("q");
    const defaultEngine =
        localStorage.getItem("selectedEngine") || fallbackEngine;

    if (searchQuery) {
        performSearch(searchQuery, defaultEngine);
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const pageShell = document.getElementById("wrapper");
    const scriptEnabled = document.getElementById("script-enabled");
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const routePreview = document.getElementById("route-preview");
    const engineSelect = document.getElementById("engine-select");
    const shortcodeList = document.getElementById("shortcode-list");
    const exampleChips = document.getElementById("example-chips");
    const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
    let shortcodeMode = localStorage.getItem("shortcodeMode") || "bang";

    function saveSelectedEngine() {
        localStorage.setItem("selectedEngine", engineSelect.value);
    }

    function loadSelectedEngine() {
        const savedEngine = localStorage.getItem("selectedEngine");

        if (savedEngine) {
            engineSelect.value = savedEngine;
        }

        if (!engineSelect.value) {
            engineSelect.value = fallbackEngine;
        }
    }

    function updatePageMode() {
        pageShell.dataset.mode = shortcodeMode;

        for (const button of modeButtons) {
            button.classList.toggle(
                "is-active",
                button.dataset.mode === shortcodeMode,
            );
        }
    }

    function updateRoutePreview() {
        const currentQuery = searchInput.value;
        const analysis = analyzeQuery(
            currentQuery,
            engineSelect.value || fallbackEngine,
        );

        if (!currentQuery.trim()) {
            routePreview.textContent = `The default route: ${analysis.selectedLabel}. Engine preference is set in local browser storage.`;
            return;
        }

        const previewSegments = [`Route: ${analysis.destinationLabel}`];

        if (analysis.snap) {
            previewSegments.push(`Site: ${analysis.snap.label}`);
        }

        if (analysis.processedQuery.trim()) {
            previewSegments.push(`Query: ${analysis.processedQuery}`);
        } else {
            previewSegments.push(`Open: ${analysis.destinationLabel}`);
        }

        routePreview.textContent = previewSegments.join(" / ");
    }

    function insertAtCursor(token) {
        const selectionStart =
            searchInput.selectionStart ?? searchInput.value.length;
        const selectionEnd =
            searchInput.selectionEnd ?? searchInput.value.length;
        const before = searchInput.value.slice(0, selectionStart);
        const after = searchInput.value.slice(selectionEnd);
        const leftSpacer = before && !before.endsWith(" ") ? " " : "";
        const rightSpacer = after && !after.startsWith(" ") ? " " : "";

        searchInput.value = `${before}${leftSpacer}${token}${rightSpacer}${after}`;

        const caretPosition = (before + leftSpacer + token).length;
        searchInput.focus();
        searchInput.setSelectionRange(caretPosition, caretPosition);
        updateRoutePreview();
    }

    function applyQuery(value) {
        searchInput.value = value;
        searchInput.focus();
        searchInput.setSelectionRange(value.length, value.length);
        updateRoutePreview();
    }

    function handleShortcodeInsert(code) {
        const prefix = shortcodeMode === "bang" ? "!" : "@";
        insertAtCursor(`${prefix}${code}`);
    }

    function buildShortcodeRow(code, value) {
        const li = document.createElement("li");
        const button = document.createElement("button");
        const badge = document.createElement("span");
        const name = document.createElement("span");

        li.className = "shortcode-item";
        button.type = "button";
        button.className = "shortcode-row";
        button.setAttribute(
            "aria-label",
            `Insert ${shortcodeMode} shortcode ${code} for ${value.desc}`,
        );
        button.addEventListener("click", () => handleShortcodeInsert(code));

        badge.className = "shortcode-badge";
        badge.textContent = `${shortcodeMode === "bang" ? "!" : "@"}${code}`;

        name.className = "shortcode-name";
        name.textContent = value.desc;

        button.append(badge, name);
        li.appendChild(button);

        return li;
    }

    function renderShortcodeList() {
        const matchingShortcodes = Object.entries(shortcodes).sort(
            ([firstCode], [secondCode]) => firstCode.localeCompare(secondCode),
        );

        shortcodeList.textContent = "";

        if (!matchingShortcodes.length) {
            const emptyState = document.createElement("li");
            emptyState.className = "empty-state";
            emptyState.textContent = "No routes available.";
            shortcodeList.appendChild(emptyState);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const [code, value] of matchingShortcodes) {
            fragment.appendChild(buildShortcodeRow(code, value));
        }

        shortcodeList.appendChild(fragment);
    }

    function createExampleChips() {
        const fragment = document.createDocumentFragment();

        for (const example of exampleQueries) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "example-chip";
            button.textContent = example.label;
            button.addEventListener("click", () => applyQuery(example.value));
            fragment.appendChild(button);
        }

        exampleChips.appendChild(fragment);
    }

    function setupEventListeners() {
        engineSelect.addEventListener("change", () => {
            saveSelectedEngine();
            updateRoutePreview();
        });

        searchInput.addEventListener("input", updateRoutePreview);

        searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
            searchForm.action = getSearchDestinationUrl(
                searchInput.value.trim(),
                engineSelect.value || fallbackEngine,
            );
            searchForm.submit();
        });

        for (const button of modeButtons) {
            button.addEventListener("click", () => {
                shortcodeMode = button.dataset.mode;
                localStorage.setItem("shortcodeMode", shortcodeMode);
                updatePageMode();
                renderShortcodeList();
            });
        }

        document.addEventListener("keydown", (event) => {
            const activeTagName = document.activeElement?.tagName;

            if (
                event.key === "/" &&
                activeTagName !== "INPUT" &&
                activeTagName !== "TEXTAREA" &&
                activeTagName !== "SELECT"
            ) {
                event.preventDefault();
                searchInput.focus();
                searchInput.select();
                return;
            }

            if (
                event.key === "Escape" &&
                document.activeElement === searchInput
            ) {
                searchInput.value = "";
                updateRoutePreview();
            }
        });
    }

    function init() {
        scriptEnabled.hidden = false;
        loadSelectedEngine();
        updatePageMode();
        createExampleChips();
        renderShortcodeList();
        setupEventListeners();
        updateRoutePreview();
    }

    init();
});
