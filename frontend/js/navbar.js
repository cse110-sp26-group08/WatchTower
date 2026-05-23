const navbarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultNavbarAssetBase = navbarScriptUrl
    ? new URL('../assets', navbarScriptUrl).href
    : '/assets';
const defaultNavbarStyleBase = navbarScriptUrl
    ? new URL('../styling', navbarScriptUrl).href
    : '/styling';
const isNavbarProjectRootStaticServer = navbarScriptUrl
    && new URL(navbarScriptUrl).pathname.endsWith('/frontend/js/navbar.js');
const defaultNavbarHomeHref = isNavbarProjectRootStaticServer
        return `${this.getOption('asset-base', defaultNavbarAssetBase).replace(/\/$/, '')}/${fileName}`;
const defaultNavbarDocsHref = isNavbarProjectRootStaticServer
    ? new URL('../webpages/docs.html', navbarScriptUrl).href
    : '/docs';
const defaultNavbarProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';


class WatchTowerNavbar extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.render();
    }

    getOption(name, fallback) {
        return this.getAttribute(name) || fallback;
    }

    getAssetPath(fileName) {
        return `${this.getOption('asset-base', defaultNavbarAssetBase).replace(/\/$/, '')}/${fileName}`;
    }

    getStylePath(fileName) {
        return `${this.getOption('style-base', defaultNavbarStyleBase).replace(/\/$/, '')}/${fileName}`;
    }

    render() {
        const homeHref = this.getOption('home-href', defaultNavbarHomeHref);
        const docsHref = this.getOption('docs-href', defaultNavbarDocsHref);
        const logoSrc = this.getAssetPath('watchtower-logo.png');
        const stylesheetHref = this.getStylePath('navbar.css');

        this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${stylesheetHref}">

        <header class="site-header">
            <nav class="site-nav" aria-label="Main navigation">
                <div class="brand-mark">
                    <a href="${homeHref}" class="brand-link">WatchTower</a>
                </div>

                <ul class="nav-links">
                    <li><a href="${docsHref}">Docs</a></li>
                </ul>

                <div class="nav-actions">
                    <!-- for now logout button will just go back to home screen -->
                    <a href="${homeHref}" class="nav-logout">Log Out</a> 
                </div>
            </nav>
        </header>
        `;

        const brandLink = this.shadowRoot.querySelector('.footer-brand');
        if (brandLink) {
            brandLink.addEventListener('click', (event) => {
                this.handleBrandClick(event, homeHref);
            });
        }
    }
    
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

if (!customElements.get('watchtower-navbar')) {
    customElements.define('watchtower-navbar', WatchTowerNavbar);
}
    
