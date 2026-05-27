const footerScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultFooterAssetBase = footerScriptUrl
    ? new URL('../assets', footerScriptUrl).href
    : '/assets';
const defaultFooterStyleBase = footerScriptUrl
    ? new URL('../styling', footerScriptUrl).href
    : '/styling';
const isFooterProjectRootStaticServer = footerScriptUrl
    && new URL(footerScriptUrl).pathname.endsWith('/frontend/js/footer.js');
const defaultFooterHomeHref = isFooterProjectRootStaticServer
    ? new URL('../webpages/index.html', footerScriptUrl).href
    : '/';
const defaultFooterDocsHref = isFooterProjectRootStaticServer
    ? new URL('../webpages/docs.html', footerScriptUrl).href
    : '/docs';
const defaultFooterProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

class WatchTowerFooter extends HTMLElement {
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
        return `${this.getOption('asset-base', defaultFooterAssetBase).replace(/\/$/, '')}/${fileName}`;
    }

    getStylePath(fileName) {
        return `${this.getOption('style-base', defaultFooterStyleBase).replace(/\/$/, '')}/${fileName}`;
    }

    render() {
        const homeHref = this.getOption('home-href', defaultFooterHomeHref);
        const productHref = this.getOption('product-href', defaultFooterProductHref);
        const docsHref = this.getOption('docs-href', defaultFooterDocsHref);
        const privacyHref = this.getOption('privacy-href', '#privacy-policy');
        const termsHref = this.getOption('terms-href', '#terms-conditions');
        const logoSrc = this.getAssetPath('watchtower-logo.png');
        const stylesheetHref = this.getStylePath('footer.css');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">

            <footer class="site-footer">
                <div class="footer-panel">
                    <div class="footer-top">
                        <a href="${homeHref}" class="footer-brand" aria-label="WatchTower home">
                            <img class="footer-logo" src="${logoSrc}" alt="WatchTower">
                        </a>

                        <nav class="footer-links" aria-label="Footer navigation">
                            <a href="${productHref}">Product</a>
                            <a href="${docsHref}">Docs</a>
                        </nav>
                    </div>

                    <div class="footer-bottom">
                        <p class="copyright">&copy; 2026 UCSD CSE 110 TEAM 7 ATE 9. All rights reserved.</p>

                        <nav class="legal-links" aria-label="Legal links">
                            <a href="${privacyHref}">Privacy Policy</a>
                            <a href="${termsHref}">Terms &amp; Conditions</a>
                        </nav>
                    </div>
                </div>
            </footer>
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

if (!customElements.get('watchtower-footer')) {
    customElements.define('watchtower-footer', WatchTowerFooter);
}
