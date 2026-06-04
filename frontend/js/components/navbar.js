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
const navbarStyleCachePrefix = 'watchtower:navbar-css:v8:';

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
        this.removeAttribute('data-nav-ready');

        const isLoggedIn = this.hasAttribute('logged-in');
        const variant = this.getOption('variant', isLoggedIn ? 'app' : 'public');

        const homeHref = this.getOption('home-href', defaultHomeHref);
        const productHref = this.getOption('product-href', defaultProductHref);
        const docsHref = this.getOption('docs-href', defaultDocsHref);
        const dashboardHref = this.getOption('dashboard-href', defaultDashboardHref);
        const appsHref = this.getOption('apps-href', defaultAppsHref);
        const settingsHref = this.getOption('settings-href', defaultSettingsHref);
        const errorsHref = this.getOption('errors-href', defaultErrorsHref);
        const performanceHref = this.getOption('performance-href', defaultPerformanceHref);
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
        const active = this.getOption('active', '');
        const isAppVariant = variant === 'app';
        const actionValue = this.hasAttribute('actions')
            ? this.getAttribute('actions')
            : 'projects dashboard errors performance settings';
        const actionKeys = actionValue
            .split(/\s+/)
            .filter(Boolean);
        const hasAction = (key) => actionKeys.includes(key);
        const hasAppLevelNav = isAppVariant && actionKeys.length > 0;

        const navActions = isLoggedIn || isAppVariant
            ? `<button type="button" class="button button-logout" id="navbar-logout-btn">Log out</button>`
            : `
                <a href="${githubHref}" class="github-link" aria-label="WatchTower on GitHub">
                    <img class="github-icon github-icon-default" src="${this.getAssetPath('github-icon-default.svg', defaultAssetBase)}" alt="">
                    <img class="github-icon github-icon-hover" src="${this.getAssetPath('github-icon-hover.svg', defaultAssetBase)}" alt="">
                </a>
                <a href="${loginHref}" class="nav-login">Sign In</a>
                <a href="${signupHref}" class="button button-primary">Get Started</a>
            `;

        const navLinks = `
            <li><a href="${productHref}">Product</a></li>
            <li><a href="${docsHref}">Docs</a></li>
            <li><a href="${contactHref}">Contact Us</a></li>
        `;

        const appLevelNav = hasAppLevelNav
            ? `
                <nav class="app-level-nav" aria-label="App navigation">
                    ${hasAction('projects') ? `<a href="${appsHref}" class="app-link${active === 'projects' ? ' app-link-active' : ''}">Projects</a>` : ''}
                    ${hasAction('dashboard') ? `<a href="${dashboardHref}" class="app-link${active === 'dashboard' ? ' app-link-active' : ''}">Dashboard</a>` : ''}
                    ${hasAction('errors') ? `<a href="${errorsHref}" class="app-link${active === 'errors' ? ' app-link-active' : ''}">Errors</a>` : ''}
                    ${hasAction('performance') ? `<a href="${performanceHref}" class="app-link${active === 'performance' ? ' app-link-active' : ''}">Performance</a>` : ''}
                    ${hasAction('settings') ? `<a href="${settingsHref}" class="app-link${active === 'settings' ? ' app-link-active' : ''}">Settings</a>` : ''}
                </nav>
            `
            : '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 68px;
                    position: relative;
                    z-index: 1000;
                    visibility: hidden;
                }

                :host([variant="app"]) {
                    height: ${hasAppLevelNav ? '118px' : '68px'};
                }

                @media (width <= 980px) {
                    :host {
                        height: 214px;
                    }

                    :host([variant="app"]) {
                        height: ${hasAppLevelNav ? '118px' : '68px'};
                    }
                }

                @media (width <= 620px) {
                    :host {
                        height: 242px;
                    }

                    :host([variant="app"]) {
                        height: ${hasAppLevelNav ? '132px' : '68px'};
                    }
                }

                @media (width <= 480px) {
                    :host([variant="app"]) {
                        height: ${hasAppLevelNav ? '156px' : '68px'};
                    }
                }

                :host([data-nav-ready]) {
                    visibility: visible;
                }
            </style>
            <span data-navbar-style-slot></span>

            <header class="site-header${isAppVariant ? ' site-header-app' : ''}${hasAppLevelNav ? ' site-header-app-level' : ''}">
                <nav class="site-nav" aria-label="Main navigation">
                    <div class="brand-mark">
                        <a href="${homeHref}" class="brand-link" aria-label="WatchTower home">
                            <img class="brand-logo" src="${this.getAssetPath('watchtower-logo.png', defaultAssetBase)}" alt="WatchTower">
                        </a>
                    </div>

                    <ul class="nav-links">
                        ${navLinks}
                    </ul>

                    <div class="nav-actions">
                        ${navActions}
                    </div>
                </nav>
                ${appLevelNav}
            </header>
        `;

        this.mountStylesheet(stylesheetHref);

        this.shadowRoot.querySelectorAll('a[href]').forEach((link) => {
            link.addEventListener('click', (event) => {
                this.handleCurrentPageClick(event, link.href);
            });
        });

        if (isLoggedIn || isAppVariant) {
            const logoutBtn = this.shadowRoot.querySelector('#navbar-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    watchtowerLogout('/');
                });
            }
        }
    }

    mountStylesheet(stylesheetHref) {
        this.mountCachedStylesheet({
            cachePrefix: navbarStyleCachePrefix,
            root: this.shadowRoot,
            slotSelector: '[data-navbar-style-slot]',
            stylesheetHref,
            onReady: () => {
                if (!this.isConnected) return;
                this.setAttribute('data-nav-ready', '');
                this.updateScrolledState();
            },
        });
    }

    isStoredUserLoggedIn() {
        try {
            return Boolean(JSON.parse(localStorage.getItem('watchtowerUser') || 'null'));
        } catch (error) {
            return false;
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
