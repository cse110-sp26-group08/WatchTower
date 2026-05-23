const navbarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultAssetBase = navbarScriptUrl
    ? new URL('../assets', navbarScriptUrl).href
    : '/assets';
const defaultStyleBase = navbarScriptUrl
    ? new URL('../styling', navbarScriptUrl).href
    : '/styling';
const isProjectRootStaticServer = navbarScriptUrl
    && new URL(navbarScriptUrl).pathname.endsWith('/frontend/js/navbar.js');
const defaultHomeHref = isProjectRootStaticServer
    ? new URL('../webpages/index.html', navbarScriptUrl).href
    : '/';
const defaultLoginHref = isProjectRootStaticServer
    ? new URL('../webpages/login.html', navbarScriptUrl).href
    : '/login';
const defaultSignupHref = isProjectRootStaticServer
    ? new URL('../webpages/signup.html', navbarScriptUrl).href
    : '/signup';
const defaultDocsHref = isProjectRootStaticServer
    ? new URL('../webpages/docs.html', navbarScriptUrl).href
    : '/docs';
const defaultProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

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
        return `${this.getOption('asset-base', defaultAssetBase).replace(/\/$/, '')}/${fileName}`;
    }

    getStylePath(fileName) {
        return `${this.getOption('style-base', defaultStyleBase).replace(/\/$/, '')}/${fileName}`;
    }

    render() {
        const homeHref = this.getOption('home-href', defaultHomeHref);
        const productHref = this.getOption('product-href', defaultProductHref);
        const docsHref = this.getOption('docs-href', defaultDocsHref);
        const githubHref = this.getOption(
            'github-href',
            'https://github.com/cse110-sp26-group08/WatchTower',
        );
        const loginHref = this.getOption('login-href', defaultLoginHref);
        const contactHref = this.getOption('contact-href', 'mailto:contact@watchtower.dev');
        const signupHref = this.getOption('signup-href', defaultSignupHref);
        const stylesheetHref = this.getStylePath('navbar.css');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">

            <header class="site-header">
                <nav class="site-nav" aria-label="Main navigation">
                    <div class="brand-mark">
                        <a href="${homeHref}" class="brand-link" aria-label="WatchTower home">
                            <img class="brand-logo" src="${this.getAssetPath('watchtower-logo.png')}" alt="WatchTower">
                        </a>
                    </div>

                    <ul class="nav-links">
                        <li><a href="${productHref}">Product</a></li>
                        <li><a href="${docsHref}">Docs</a></li>
                        <li><a href="${contactHref}">Contact Us</a></li>
                    </ul>

                    <div class="nav-actions">
                        <a href="${githubHref}" class="github-link" aria-label="WatchTower on GitHub">
                            <img class="github-icon github-icon-default" src="${this.getAssetPath('github-icon-default.svg')}" alt="">
                            <img class="github-icon github-icon-hover" src="${this.getAssetPath('github-icon-hover.svg')}" alt="">
                        </a>
                        <a href="${loginHref}" class="nav-login">Sign In</a>
                        <a href="${signupHref}" class="button button-primary">Get Started</a>
                    </div>
                </nav>
            </header>
        `;

        const brandLink = this.shadowRoot.querySelector('.brand-link');
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
