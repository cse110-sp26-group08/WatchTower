/**
 * WatchTower collector — drop-in script for monitored applications.
 * Attaches global error listeners, records page load performance, and
 * intercepts fetch() to track API latency. All data is sent to the
 * WatchTower backend using sendBeacon (fire-and-forget, survives page unload)
 * with a fetch() fallback for environments that don't support sendBeacon.
 *
 * Usage: add this script tag to the monitored app's HTML
 * <script id="collector-script"
 *     src="<url to this file>"
 *     data-apikey="<your api key>"
 *     data-release="<app version>">
 * </script>
 */

/**
 * @param {string} apiKey  - The app's WatchTower API key (from data-apikey).
 * @param {string} release - The app version string (from data-release).
 */
function Collector(apiKey, release) {
    const baseUrl = "http://localhost:3000"; // Update with your backend URL if different

    const routes = {
        error: `${baseUrl}/api/events/error`,
        performance: `${baseUrl}/api/events/performance`,
    };

    // Start intercepting fetch() before the page fires any requests
    trackApiPerformance();

    window.addEventListener("error", (e) => trackError(e.error));
    window.addEventListener("unhandledrejection", (e) => trackError(e.reason));

    // Page load metrics are only available after the load event; if the script
    // runs after load (e.g. deferred), grab them immediately.
    if (document.readyState === "complete") {
        trackPerformance();
    } else {
        window.addEventListener("load", () => trackPerformance());
    }

    /**
     * Sends an event payload to the matching API endpoint.
     * Prefers sendBeacon because it survives page unload — important for
     * error events that fire as the user is navigating away.
     *
     * @param {{
     *   type: "error" | "performance",
     *   apiKey: string,
     *   message?: string,
     *   stack?: string | null,
     *   url?: string,
     *   errorType?: string,
     *   severity?: "low" | "medium" | "high" | "critical",
     *   loadTimeMs?: number,
     *   domContentLoadedMs?: number,
     *   ttfbMs?: number,
     *   apiEndpoint?: string | null,
     *   apiLatencyMs?: number | null,
     *   memoryMB?: number | null,
     *   release?: string,
     *   timestamp?: string
     * }} payload
     */
    function sendEvent(payload) {
        const endpoint = routes[payload.type];
        const data = JSON.stringify(payload);
        const blob = new Blob([data], {
            type: "application/json",
        });
        const sent = navigator.sendBeacon?.(endpoint, blob);
        if (!sent) {
            fetch(endpoint, {
                method: "POST",
                body: data,
                headers: { "Content-Type": "application/json" },
                keepalive: true,
            });
        }
    }

    /**
     * Builds and sends an error event. The error object may be anything
     * (TypeError, string thrown, rejection value) so all fields are accessed defensively.
     *
     * @param {Error | unknown} error
     */
    function trackError(error) {
        sendEvent({
            type: "error",
            apiKey: apiKey,
            message: error?.message || String(error),
            stack: error?.stack || null,
            url: window.location.href,
            errorType: error?.constructor?.name || "Error",
            severity: getSeverity(error),
            release: release,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Maps an error to a severity level based on its type and message content.
     *
     * Severity ladder:
     * - critical: TypeError, ReferenceError (broken code paths)
     * - high:     SyntaxError, network/fetch/failed errors (service problems)
     * - medium:   timeout, RangeError (transient or data issues)
     * - low:      everything else
     *
     * @param {Error | unknown} error
     * @returns {"low" | "medium" | "high" | "critical"}
     */
    function getSeverity(error) {
        if (!error) return "low";
        const message = error.message?.toLowerCase() || "";
        const type = error.constructor?.name || "";
        if (type === "TypeError" || type === "ReferenceError") return "critical";
        if (type === "SyntaxError") return "high";
        if (message.includes("network") || message.includes("fetch") || message.includes("failed")) return "high";
        if (message.includes("timeout")) return "medium";
        if (type === "RangeError") return "medium";
        return "low";
    }

    /**
     * Records a single performance event using the Navigation Timing API.
     * Metrics collected:
     *   loadTimeMs         - Total page load time (loadEventEnd - startTime)
     *   domContentLoadedMs - Time until DOMContentLoaded (domContentLoadedEventEnd - startTime)
     *   ttfbMs             - Time to first byte (responseEnd - requestStart)
     *   memoryMB           - JS heap size in MB (Chrome only via performance.memory)
     *
     * If there's no navigation entry (e.g. bfcache restore), the event is skipped.
     */
    function trackPerformance() {
        const navigation = performance.getEntriesByType("navigation");
        const nav = navigation[0];

        if (!nav) return;

        const loadTimeMs = nav.loadEventEnd - nav.startTime;
        const domContentLoadedMs = nav.domContentLoadedEventEnd - nav.startTime;
        const serverResponseTimeMs = nav.responseEnd - nav.requestStart;
        const memoryMB = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : null;

        sendEvent({
            type: "performance",
            apiKey: apiKey,
            url: window.location.href,
            loadTimeMs: loadTimeMs,
            domContentLoadedMs: domContentLoadedMs,
            ttfbMs: serverResponseTimeMs,
            apiEndpoint: null,
            apiLatencyMs: null,
            memoryMB: memoryMB,
            release: release,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Wraps window.fetch to measure round-trip latency for every API request.
     * Calls to the WatchTower endpoints themselves are passed through unwrapped
     * to prevent an infinite loop of the collector reporting on itself.
     * Latency is recorded even when the request rejects (network failure) so
     * slow-then-broken patterns are still visible.
     */
    function trackApiPerformance() {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const startTime = Date.now();
            const apiEndpoint =
                typeof args[0] === "string" ? args[0] : args[0]?.url;

            // Skip measurement for our own reporting endpoints
            if (apiEndpoint === routes.performance || apiEndpoint === routes.error) {
                return originalFetch(...args);
            }

            try {
                const response = await originalFetch(...args);
                const endTime = Date.now();

                sendEvent({
                    type: "performance",
                    apiKey: apiKey,
                    apiEndpoint,
                    apiLatencyMs: endTime - startTime,
                    url: window.location.href,
                    release: release,
                    timestamp: new Date().toISOString(),
                });

                return response;
            } catch (error) {
                const endTime = Date.now();

                sendEvent({
                    type: "performance",
                    apiKey: apiKey,
                    apiEndpoint,
                    apiLatencyMs: endTime - startTime,
                    url: window.location.href,
                    release: release,
                    timestamp: new Date().toISOString(),
                });

                throw error;
            }
        };
    }
}

const script = document.getElementById('collector-script');
const apiKey = script.dataset.apikey;
const release = script.dataset.release;
Collector(apiKey, release);
