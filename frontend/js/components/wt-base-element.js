class WatchTowerBaseElement extends HTMLElement {
    getOption(name, fallback) {
        return this.getAttribute(name) || fallback;
    }

    // defaultBase is the per-component fallback resolved from document.currentScript at load time
    getAssetPath(fileName, defaultBase) {
        return `${this.getOption('asset-base', defaultBase).replace(/\/$/, '')}/${fileName}`;
    }

    getStylePath(fileName, defaultBase) {
        return `${this.getOption('style-base', defaultBase).replace(/\/$/, '')}/${fileName}`;
    }

    // Reloads the page when the brand link is clicked on the current page,
    // rather than navigating (which would be a no-op but resets scroll position).
    handleBrandClick(event, homeHref) {
        const targetUrl = new URL(homeHref, window.location.href);
        const currentUrl = new URL(window.location.href);
        const isCurrentPage = targetUrl.origin === currentUrl.origin
            && targetUrl.pathname === currentUrl.pathname
            && targetUrl.search === currentUrl.search
            && targetUrl.hash === currentUrl.hash;

        if (isCurrentPage) {
            event.preventDefault();
            window.location.reload();
        }
    }
}
