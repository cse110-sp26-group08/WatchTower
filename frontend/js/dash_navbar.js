const dashNavScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultDashNavAssetBase = dashNavScriptUrl
    ? new URL('../assets', dashNavScriptUrl).href
    : '/assets';
const defaultDashNavStyleBase = dashNavScriptUrl
    ? new URL('../styling', dashNavScriptUrl).href
    : '/styling';
const isDashNavProjectRootStaticServer = dashNavScriptUrl
    && new URL(dashNavScriptUrl).pathname.endsWith('/frontend/js/dash_navbar.js');

const defaultDashNavHomeHref = isDashNavProjectRootStaticServer
    ? new URL('../webpages/index.html', dashNavScriptUrl).href
    : '/';
const defaultDashNavDashboardHref = isDashNavProjectRootStaticServer
    ? new URL('../webpages/dashboard.html', dashNavScriptUrl).href
    : '/dashboard';
const defaultDashNavAppsHref = isDashNavProjectRootStaticServer
    ? new URL('../webpages/app_selection.html', dashNavScriptUrl).href
    : '/apps';
const defaultDashNavErrorsHref = isDashNavProjectRootStaticServer
    ? new URL('../webpages/advanced_error_metrics.html', dashNavScriptUrl).href
    : '/advanced-error-metrics';
const defaultDashNavPerformanceHref = isDashNavProjectRootStaticServer
    ? new URL('../webpages/advanced_performance_metrics.html', dashNavScriptUrl).href
    : '/advanced-performance-metrics';

class WatchTowerDashNavbar extends HTMLElement {
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

    getOption(name, fallback) {
        return this.getAttribute(name) || fallback;
    }

    getAssetPath(fileName) {
        return `${this.getOption('asset-base', defaultDashNavAssetBase).replace(/\/$/, '')}/${fileName}`;
    }

    getStylePath(fileName) {
        return `${this.getOption('style-base', defaultDashNavStyleBase).replace(/\/$/, '')}/${fileName}`;
    }

    render() {
        const active = this.getOption('active', 'home');
        const homeHref = this.getOption('home-href', defaultDashNavHomeHref);
        const dashboardHref = this.getOption('dashboard-href', defaultDashNavDashboardHref);
        const appsHref = this.getOption('apps-href', defaultDashNavAppsHref);
        const errorsHref = this.getOption('errors-href', defaultDashNavErrorsHref);
        const performanceHref = this.getOption('performance-href', defaultDashNavPerformanceHref);
        const stylesheetHref = this.getStylePath('dash_navbar.css');

        const navItems = [
            { key: 'home', label: 'Home', href: dashboardHref },
            { key: 'projects', label: 'Projects', href: appsHref },
            { key: 'errors', label: 'Errors', href: errorsHref },
            { key: 'performance', label: 'Performance', href: performanceHref },
        ];

        const navItemsHtml = navItems.map(({ key, label, href }) =>
            `<li><a href="${href}" class="nav-link${active === key ? ' nav-link-active' : ''}">${label}</a></li>`
        ).join('');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">
            <header class="site-header">
                <nav class="site-nav" aria-label="Dashboard navigation">
                    <div class="brand-mark">
                        <a href="${homeHref}" class="brand-link" aria-label="WatchTower home">
                            <img class="brand-logo" src="${this.getAssetPath('watchtower-logo.png')}" alt="WatchTower">
                        </a>
                    </div>

                    <ul class="nav-links">
                        ${navItemsHtml}
                    </ul>

                    <div class="nav-actions">
                        <button type="button" class="button button-logout" id="dash-logout-btn">Log out</button>
                    </div>
                </nav>
            </header>
        `;

        this.shadowRoot.querySelector('#dash-logout-btn').addEventListener('click', () => {
            watchtowerLogout(homeHref);
        });
    }

    updateScrolledState() {
        const header = this.shadowRoot ? this.shadowRoot.querySelector('.site-header') : null;
        if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 2);
        }
    }
}

if (!customElements.get('watchtower-dash-navbar')) {
    customElements.define('watchtower-dash-navbar', WatchTowerDashNavbar);
}
