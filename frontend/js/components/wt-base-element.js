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

    handleCurrentPageClick(event, href) {
        if (this.isCurrentPageHref(href)) {
            event.preventDefault();
            if (!new URL(href, window.location.href).hash) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return true;
        }

        return false;
    }

    handleBrandClick(event, homeHref) {
        this.handleCurrentPageClick(event, homeHref);
    }

    isCurrentPageHref(href) {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin !== currentUrl.origin || targetUrl.pathname !== currentUrl.pathname) {
            return false;
        }

        if (targetUrl.hash && targetUrl.hash !== currentUrl.hash) {
            return false;
        }

        return !targetUrl.search || targetUrl.search === currentUrl.search;
    }

    getCachedValue(key) {
        try {
            return sessionStorage.getItem(key) || '';
        } catch (error) {
            return '';
        }
    }

    setCachedValue(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (error) {
            // Components still render correctly without tab-level caching.
        }
    }

    getCachedStylesheet(cachePrefix, stylesheetHref) {
        return this.getCachedValue(`${cachePrefix}${stylesheetHref}`);
    }

    cacheStylesheet(cachePrefix, stylesheetHref) {
        fetch(stylesheetHref, { cache: 'force-cache' })
            .then((response) => (response.ok ? response.text() : ''))
            .then((cssText) => {
                if (cssText) {
                    this.setCachedValue(`${cachePrefix}${stylesheetHref}`, cssText);
                }
            })
            .catch(() => undefined);
    }

    mountCachedStylesheet({ cachePrefix, onReady, root, slotSelector, stylesheetHref }) {
        const styleSlot = root.querySelector(slotSelector);
        const cachedCss = this.getCachedStylesheet(cachePrefix, stylesheetHref);

        if (!styleSlot) {
            onReady();
            return;
        }

        if (cachedCss) {
            const style = document.createElement('style');
            style.textContent = cachedCss;
            styleSlot.replaceWith(style);
            onReady();
            return;
        }

        const stylesheet = document.createElement('link');
        let revealed = false;
        const reveal = () => {
            if (revealed || !this.isConnected) return;
            revealed = true;
            onReady();
            this.cacheStylesheet(cachePrefix, stylesheetHref);
        };

        stylesheet.rel = 'stylesheet';
        stylesheet.addEventListener('load', reveal, { once: true });
        stylesheet.addEventListener('error', reveal, { once: true });
        styleSlot.replaceWith(stylesheet);
        stylesheet.href = stylesheetHref;

        if (stylesheet.sheet) {
            reveal();
            return;
        }

        window.setTimeout(reveal, 1200);
    }
}
