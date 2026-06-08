// Resolve base URLs at load time while document.currentScript is still available.
const footerScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultFooterAssetBase = footerScriptUrl
    ? new URL('../../assets', footerScriptUrl).href
    : '/assets';
const defaultFooterStyleBase = footerScriptUrl
    ? new URL('../../styling', footerScriptUrl).href
    : '/styling';

// True when running from the filesystem (e.g. VS Code Live Server), not Express.
const isFooterProjectRootStaticServer = footerScriptUrl
    && new URL(footerScriptUrl).pathname.endsWith('/frontend/js/components/footer.js');
const defaultFooterHomeHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/index.html', footerScriptUrl).href
    : '/';
const defaultFooterDocsHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/docs.html', footerScriptUrl).href
    : '/docs';
const defaultFooterPrivacyHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/privacy.html', footerScriptUrl).href
    : '/privacy';
const defaultFooterTermsHref = isFooterProjectRootStaticServer
    ? new URL('../../webpages/terms.html', footerScriptUrl).href
    : '/terms';
const defaultFooterProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

/**
 * `<watchtower-footer>` — site-wide footer with navigation and legal links.
 *
 * Attributes:
 *   home-href     - Override the brand logo link.
 *   product-href  - Override the Product link (defaults to the GitHub REST API doc).
 *   docs-href     - Override the Docs link.
 *   privacy-href  - Override the Privacy Policy link.
 *   terms-href    - Override the Terms & Conditions link.
 *   style-base    - Base URL for loading footer.css.
 *   asset-base    - Base URL for the WatchTower logo image.
 */
class WatchTowerFooter extends WatchTowerBaseElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.render();
    }

    render() {
        const homeHref = this.getOption('home-href', defaultFooterHomeHref);
        const productHref = this.getOption('product-href', defaultFooterProductHref);
        const docsHref = this.getOption('docs-href', defaultFooterDocsHref);
        const privacyHref = this.getOption('privacy-href', defaultFooterPrivacyHref);
        const termsHref = this.getOption('terms-href', defaultFooterTermsHref);
        const logoSrc = this.getAssetPath('watchtower-logo.png', defaultFooterAssetBase);
        const stylesheetHref = this.getStylePath('footer.css', defaultFooterStyleBase);

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">

            <footer class="site-footer">
                <div class="footer-panel">
                    <div class="footer-top">
                        <a href="${homeHref}" class="footer-brand" aria-label="WatchTower home">
                            <img class="footer-logo" src="${logoSrc}" alt="WatchTower">
                        </a>

                        <nav class="footer-links" aria-label="Footer navigation">
                            <a href="${productHref}" target="_blank" rel="noopener noreferrer">Product</a>
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

        // Use the inherited brand-click handler so clicking the logo on the home
        // page reloads instead of doing nothing.
        const brandLink = this.shadowRoot.querySelector('.footer-brand');
        if (brandLink) {
            brandLink.addEventListener('click', (event) => {
                this.handleBrandClick(event, homeHref);
            });
        }
    }

}

if (!customElements.get('watchtower-footer')) {
    customElements.define('watchtower-footer', WatchTowerFooter);
}
