const footerScriptUrl = document.currentScript ? document.currentScript.src : '';
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

    render() {
        const homeHref = this.getOption('home-href', defaultFooterHomeHref);
        const productHref = this.getOption('product-href', defaultFooterProductHref);
        const docsHref = this.getOption('docs-href', defaultFooterDocsHref);
        const privacyHref = this.getOption('privacy-href', '#privacy-policy');
        const termsHref = this.getOption('terms-href', '#terms-conditions');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: Manrope, Arial, sans-serif;
                    color: #211f24;
                }

                * {
                    box-sizing: border-box;
                }

                a {
                    color: inherit;
                    text-decoration: none;
                }

                .site-footer {
                    width: min(1120px, calc(100% - 48px));
                    margin: 14px auto 18px;
                }

                .footer-panel {
                    padding: 0 8px;
                }

                .footer-top,
                .footer-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                }

                .footer-top {
                    padding-bottom: 8px;
                }

                .footer-brand {
                    font-size: 1.42rem;
                    font-weight: 800;
                    letter-spacing: 0;
                }

                .footer-links,
                .legal-links {
                    display: flex;
                    align-items: center;
                    gap: 28px;
                    font-size: 0.94rem;
                    font-weight: 700;
                }

                .footer-links a,
                .legal-links a {
                    transition: color 180ms ease, opacity 180ms ease;
                }

                .footer-links a:hover,
                .footer-links a:focus-visible,
                .legal-links a:hover,
                .legal-links a:focus-visible {
                    color: #486bea;
                }

                .footer-bottom {
                    padding-top: 8px;
                    font-size: 0.82rem;
                    color: rgb(33 31 36 / 68%);
                }

                .copyright {
                    margin: 0;
                }

                @media (width <= 760px) {
                    .site-footer {
                        width: min(100% - 28px, 680px);
                        margin-top: 12px;
                    }

                    .footer-panel {
                        padding: 0;
                    }

                    .footer-top,
                    .footer-bottom {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .footer-links,
                    .legal-links {
                        flex-wrap: wrap;
                        gap: 16px 24px;
                    }
                }
            </style>

            <footer class="site-footer">
                <div class="footer-panel">
                    <div class="footer-top">
                        <a href="${homeHref}" class="footer-brand">WatchTower</a>

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
