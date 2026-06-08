/**
 * Shared base class for all WatchTower custom elements.
 * Provides helpers for reading HTML attributes with fallbacks and resolving
 * asset/style paths that work in both Express-served and static-file contexts.
 */
class WatchTowerBaseElement extends HTMLElement {
    /**
     * Returns the element's attribute value, or a fallback if the attribute
     * is absent or empty. Components use this instead of getAttribute directly
     * so callers don't have to write the null-check every time.
     *
     * @param {string} name - Attribute name.
     * @param {string} fallback - Value used when the attribute isn't set.
     * @returns {string}
     */
    getOption(name, fallback) {
        return this.getAttribute(name) || fallback;
    }

    /**
     * Builds an asset path relative to the configured or default base URL.
     * defaultBase is the per-component fallback resolved from document.currentScript
     * at load time — it's passed in rather than read here because currentScript is
     * only available during the initial script execution, not later when the element connects.
     *
     * @param {string} fileName
     * @param {string} defaultBase
     * @returns {string}
     */
    getAssetPath(fileName, defaultBase) {
        return `${this.getOption('asset-base', defaultBase).replace(/\/$/, '')}/${fileName}`;
    }

    /**
     * Same as getAssetPath but reads 'style-base' instead of 'asset-base'.
     * Kept separate so components can have assets and stylesheets in different directories.
     *
     * @param {string} fileName
     * @param {string} defaultBase
     * @returns {string}
     */
    getStylePath(fileName, defaultBase) {
        return `${this.getOption('style-base', defaultBase).replace(/\/$/, '')}/${fileName}`;
    }

    /**
     * Handles a click on the brand/logo link. If the link points to the current
     * page, prevents navigation (which would be a no-op) and reloads instead.
     * This avoids the jarring scroll-to-top that happens when the browser
     * processes a same-page anchor click.
     *
     * @param {MouseEvent} event
     * @param {string} homeHref
     */
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
