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
const defaultDashboardHref = isProjectRootStaticServer
    ? new URL('../../webpages/dashboard.html', navbarScriptUrl).href
    : '/dashboard';
const defaultAppsHref = isProjectRootStaticServer
    ? new URL('../../webpages/app_selection.html', navbarScriptUrl).href
    : '/apps';
const defaultSettingsHref = isProjectRootStaticServer
    ? new URL('../../webpages/settings.html', navbarScriptUrl).href
    : '/settings';
const defaultErrorsHref = isProjectRootStaticServer
    ? new URL('../../webpages/advanced_error_metrics.html', navbarScriptUrl).href
    : '/advanced-error-metrics';
const defaultPerformanceHref = isProjectRootStaticServer
    ? new URL('../../webpages/advanced_performance_metrics.html', navbarScriptUrl).href
    : '/advanced-performance-metrics';
const defaultProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

class WatchTowerNavbar extends WatchTowerBaseElement {
    static get observedAttributes() {
        return ['active', 'actions', 'variant'];
    }

    constructor() {
        super();
        this.updateScrolledState = this.updateScrolledState.bind(this);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.shadowRoot) {
            this.render();
            this.updateScrolledState();
        }
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
        const isLoggedIn = this.hasAttribute('logged-in');
        const variant = this.getOption('variant', isLoggedIn ? 'app' : 'public');

        if (variant === 'minimal' || variant === 'app') {
            this.renderCompactHeader(variant);
            return;
        }

        const homeHref = this.getOption('home-href', defaultHomeHref);
        const productHref = this.getOption('product-href', defaultProductHref);
        const docsHref = this.getOption('docs-href', defaultDocsHref);
        const githubHref = this.getOption(
            'github-href',
            'https://github.com/cse110-sp26-group08/WatchTower',
        );
        const loginHref = this.isStoredUserLoggedIn()
            ? this.getOption('apps-href', defaultAppsHref)
            : this.getOption('login-href', defaultLoginHref);
        const contactHref = this.getOption('contact-href', 'mailto:contact@watchtower.dev');
        const signupHref = this.getOption('signup-href', defaultSignupHref);
        const stylesheetHref = this.getStylePath('navbar.css', defaultStyleBase);

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

    isStoredUserLoggedIn() {
        try {
            return Boolean(JSON.parse(localStorage.getItem('watchtowerUser') || 'null'));
        } catch (error) {
            return false;
        }
    }

    renderCompactHeader(variant) {
        const homeHref = this.getOption('home-href', defaultHomeHref);
        const dashboardHref = this.getOption('dashboard-href', defaultDashboardHref);
        const appsHref = this.getOption('apps-href', defaultAppsHref);
        const settingsHref = this.getOption('settings-href', defaultSettingsHref);
        const errorsHref = this.getOption('errors-href', defaultErrorsHref);
        const performanceHref = this.getOption('performance-href', defaultPerformanceHref);
        const active = this.getOption('active', '');
        const stylesheetHref = this.getStylePath('navbar.css', defaultStyleBase);
        const actionKeys = this.getOption('actions', 'projects dashboard errors performance settings logout')
            .split(/\s+/)
            .filter(Boolean);
        const hasAction = (key) => actionKeys.includes(key);

        const appActions = variant === 'app'
            ? `
                <nav class="app-primary-actions" aria-label="App navigation">
                    ${hasAction('projects') ? `<a href="${appsHref}" class="app-link${active === 'projects' ? ' app-link-active' : ''}">Projects</a>` : ''}
                    ${hasAction('dashboard') ? `<a href="${dashboardHref}" class="app-link${active === 'dashboard' ? ' app-link-active' : ''}">Dashboard</a>` : ''}
                    ${hasAction('errors') ? `<a href="${errorsHref}" class="app-link${active === 'errors' ? ' app-link-active' : ''}">Errors</a>` : ''}
                    ${hasAction('performance') ? `<a href="${performanceHref}" class="app-link${active === 'performance' ? ' app-link-active' : ''}">Performance</a>` : ''}
                </nav>
                <nav class="app-utility-actions" aria-label="Account navigation">
                    ${hasAction('settings') ? `<a href="${settingsHref}" class="app-link${active === 'settings' ? ' app-link-active' : ''}">Settings</a>` : ''}
                    ${hasAction('logout') ? '<button type="button" class="button button-logout compact-logout" id="navbar-logout-btn">Log out</button>' : ''}
                </nav>
            `
            : '';

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">

            <header class="auth-header${variant === 'app' ? ' auth-header-app' : ''}">
                <a href="${homeHref}" class="brand-link" aria-label="WatchTower home">
                    <img class="brand-logo" src="${this.getAssetPath('watchtower-logo.png', defaultAssetBase)}" alt="WatchTower">
                </a>
                ${appActions}
            </header>
        `;

        const brandLink = this.shadowRoot.querySelector('.brand-link');
        if (brandLink) {
            brandLink.addEventListener('click', (event) => {
                this.handleBrandClick(event, homeHref);
            });
        }

        if (variant === 'app') {
            const logoutBtn = this.shadowRoot.querySelector('#navbar-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    watchtowerLogout('/');
                });
            }
        }
    }

    updateScrolledState() {
        const header = this.shadowRoot
            ? this.shadowRoot.querySelector('.site-header') || this.shadowRoot.querySelector('.auth-header')
            : null;
        if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 2);
        }
    }

}

if (!customElements.get('watchtower-navbar')) {
    customElements.define('watchtower-navbar', WatchTowerNavbar);
}
