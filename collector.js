const Collector = (() => {
    let config = {};

    function init(userConfig) {
        config = userConfig;
        window.addEventListener("error", (e) => trackError(e.error));
        window.addEventListener("unhandledrejection", (e) => trackError(e.reason));
        trackPerformance();
    }

/*    function sendEvent(payload) {
        const data = JSON.stringify(payload);
        const sent = navigator.sendBeacon?.(config.endpoint, data);
        if (!sent) {
            fetch(config.endpoint, {
                method: "POST",
                body: data,
                headers: { "Content-Type": "application/json" },
                keepalive: true,
            });
        }
    } */

    function trackError(error) {
    }

    function trackPerformance() {
    }

    function trackFeedback(feedback) {
    }

    function trackEvent(eventName, data){
    }
    return {init, trackError, trackFeedback, trackEvent};
})();