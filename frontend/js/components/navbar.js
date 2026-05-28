/* global watchtowerLogout */
const navbarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultAssetBase = navbarScriptUrl
    ? new URL('../../assets', navbarScriptUrl).href
    : '/assets';
const defaultStyleBase = navbarScriptUrl
    ? new URL('../../styling', navbarScriptUrl).href
    : '/styling';
const isProjectRootStaticServer = navbarScriptUrl
    && new URL(navbarScriptUrl).pathname.endsWith('/frontend/js/components/navbar.js');
const defaultHomeHref = isProjectRootStaticServer
    ? new URL('../../webpages/index.html', navbarScriptUrl).href
    : '/';
const defaultLoginHref = isProjectRootStaticServer
    ? new URL('../../webpages/login.html', navbarScriptUrl).href
    : '/login';
const defaultSignupHref = isProjectRootStaticServer
    ? new URL('../../webpages/signup.html', navbarScriptUrl).href
    : '/signup';
const defaultDocsHref = isProjectRootStaticServer
    ? new URL('../../webpages/docs.html', navbarScriptUrl).href
    : '/docs';
const defaultProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

class WatchTowerNavbar extends WatchTowerBaseElement {
    constructor() {
        super();
        this.updateScrolledState = this.updateScrolledState.bind(this);
    }

    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.render();
        window.addEventListener('scroll', this.updateScrolledState, { passive: true });
        this.updateScrolledState();
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.updateScrolledState);
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
        const stylesheetHref = this.getStylePath('navbar.css', defaultStyleBase);
        const isLoggedIn = this.hasAttribute('logged-in');

        const navActions = isLoggedIn
            ? `<button type="button" class="button button-logout" id="navbar-logout-btn">Log out</button>`
            : `
                <a href="${githubHref}" class="github-link" aria-label="WatchTower on GitHub">
                    <img class="github-icon github-icon-default" src="${this.getAssetPath('github-icon-default.svg', defaultAssetBase)}" alt="">
                    <img class="github-icon github-icon-hover" src="${this.getAssetPath('github-icon-hover.svg', defaultAssetBase)}" alt="">
                </a>
                <a href="${loginHref}" class="nav-login">Sign In</a>
                <a href="${signupHref}" class="button button-primary">Get Started</a>
            `;

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">

            <header class="site-header">
                <nav class="site-nav" aria-label="Main navigation">
                    <div class="brand-mark">
                        <a href="${homeHref}" class="brand-link" aria-label="WatchTower home">
                            <img class="brand-logo" src="${this.getAssetPath('watchtower-logo.png', defaultAssetBase)}" alt="WatchTower">
                        </a>
                    </div>

                    <ul class="nav-links">
                        <li><a href="${productHref}">Product</a></li>
                        <li><a href="${docsHref}">Docs</a></li>
                        <li><a href="${contactHref}">Contact Us</a></li>
                    </ul>

                    <div class="nav-actions">
                        ${navActions}
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

        if (isLoggedIn) {
            const logoutBtn = this.shadowRoot.querySelector('#navbar-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    watchtowerLogout('/');
                });
            }
        }
    }

    updateScrolledState() {
        const header = this.shadowRoot ? this.shadowRoot.querySelector('.site-header') : null;
        if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 2);
        }
    }

}

if (!customElements.get('watchtower-navbar')) {
    customElements.define('watchtower-navbar', WatchTowerNavbar);
}
