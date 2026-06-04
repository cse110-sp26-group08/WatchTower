const footerScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultFooterAssetBase = footerScriptUrl
    ? new URL('../../assets', footerScriptUrl).href
    : '/assets';
const defaultFooterStyleBase = footerScriptUrl
    ? new URL('../../styling', footerScriptUrl).href
    : '/styling';
const isFooterProjectRootStaticServer = footerScriptUrl
    && new URL(footerScriptUrl).pathname.endsWith('/frontend/js/components/footer.js');
const defaultFooterHomeHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/index.html', footerScriptUrl).href
    : '/';
const defaultFooterDocsHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/docs.html', footerScriptUrl).href
    : '/docs';
const defaultFooterProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';
const footerStyleCachePrefix = 'watchtower:footer-css:v1:';

class WatchTowerFooter extends WatchTowerBaseElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.render();
    }

    render() {
        this.removeAttribute('data-footer-ready');

        const variant = this.getOption('variant', 'public');
        const homeHref = this.getOption('home-href', defaultFooterHomeHref);
        const productHref = this.getOption('product-href', defaultFooterProductHref);
        const docsHref = this.getOption('docs-href', defaultFooterDocsHref);
        const privacyHref = this.getOption('privacy-href', '#privacy-policy');
        const termsHref = this.getOption('terms-href', '#terms-conditions');
        const logoSrc = this.getAssetPath('watchtower-logo.png', defaultFooterAssetBase);
        const stylesheetHref = this.getStylePath('footer.css', defaultFooterStyleBase);

        if (variant === 'app') {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        visibility: hidden;
                    }

                    :host([data-footer-ready]) {
                        visibility: visible;
                    }
                </style>
                <span data-footer-style-slot></span>

                <footer class="site-footer footer-app">
                    <nav class="app-footer-group" aria-label="Internal footer navigation">
                        <span class="app-footer-copy">&copy; 2026 UCSD CSE 110 TEAM 7 ATE 9</span>
                        <a href="${termsHref}">Terms</a>
                        <a href="${privacyHref}">Privacy</a>
                        <a href="mailto:contact@watchtower.dev">Contact Us</a>
                    </nav>
                </footer>
            `;
            this.mountStylesheet(stylesheetHref);
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    visibility: hidden;
                }

                :host([data-footer-ready]) {
                    visibility: visible;
                }
            </style>
            <span data-footer-style-slot></span>

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

        this.shadowRoot.querySelectorAll('a[href]').forEach((link) => {
            link.addEventListener('click', (event) => {
                this.handleCurrentPageClick(event, link.href);
            });
        });
    }

    mountStylesheet(stylesheetHref) {
        this.mountCachedStylesheet({
            cachePrefix: footerStyleCachePrefix,
            root: this.shadowRoot,
            slotSelector: '[data-footer-style-slot]',
            stylesheetHref,
            onReady: () => {
                if (this.isConnected) {
                    this.setAttribute('data-footer-ready', '');
                }
            },
        });
    }

}

if (!customElements.get('watchtower-footer')) {
    customElements.define('watchtower-footer', WatchTowerFooter);
}
