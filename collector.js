const Collector = (() => {
    let config = {};
    const routes = {
        error: "/api/events/error",
        performance: "/api/events/performance",
    };
    /**
     * Initializes the Watchtower collector with user configuration.
     * Stores the provided config, registers global browser listeners for
     * uncaught errors and unhandled promise rejections, and starts performance
     * tracking.
     * @param {{ apiKey: string, release?: string }} userConfig - Collector configuration.
     */
    function init(userConfig) {
        config = userConfig;
        window.addEventListener("error", (e) => trackError(e.error));
        window.addEventListener("unhandledrejection", (e) => trackError(e.reason));
        trackPerformance();
    }
    /**
     * Sends a Watchtower event payload to the matching API endpoint.
     * Uses navigator.sendBeacon when available, then falls back to fetch if
     * sendBeacon is unavailable or fails.
     * @param {{
     *   type: "error" | "performance",
     *   apiKey: string,
     *   message?: string,
     *   stack?: string | null,
     *   url?: string,
     *   errorType?: string,
     *   severity?: "low" | "medium" | "high" | "critical",
     *   release?: string,
     *   timestamp?: string
     * }} payload - Event data to send.
     */
    function sendEvent(payload) {
        const endpoint = routes[payload.type];
        const data = JSON.stringify(payload);
        const sent = navigator.sendBeacon?.(endpoint, data);
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
     * Tracks a JavaScript error and sends it to the Watchtower error endpoint.
     * Builds an error event payload using the configured API key and release,
     * then sends the event through sendEvent().
     * @param error - The error object or value to track.
     */
    function trackError(error) {
        sendEvent({
            type: "error",
            apiKey: config.apiKey,
            message: error?.message || String(error),
            stack: error?.stack || null,
            url: window.location.href,
            errorType: error?.constructor?.name || "Error",
            severity: getSeverity(error),
            release: config.release,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Determines the severity level for a JavaScript error.
     *
     * Severity is based on the error type and message:
     * - TypeError and ReferenceError are critical
     * - SyntaxError, network, fetch, and failed errors are high
     * - Timeout and RangeError errors are medium
     * - All other errors are low
     * @param error - The error object or value to evaluate.
     * @returns The calculated severity level.
     */
    function getSeverity(error) {
        if (!error) return "low";
        const message = error.message?.toLowerCase() || "";
        const type = error.constructor?.name || "";
        if (type == "TypeError" || type == "ReferenceError") return "critical";
        if (type == "SyntaxError") return "high";
        if (message.includes("network") || message.includes("fetch") || message.includes("failed")) return "high";
        if (message.includes("timeout")) return "medium";
        if (type == "RangeError") return "medium";
        return "low";
    }

    function trackPerformance() {
    }

    return { init, trackError, trackPerformance };
})();