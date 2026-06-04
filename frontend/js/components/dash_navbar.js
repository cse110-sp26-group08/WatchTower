const dashNavScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultDashNavAssetBase = dashNavScriptUrl
    ? new URL('../../assets', dashNavScriptUrl).href
    : '/assets';
const defaultDashNavStyleBase = dashNavScriptUrl
    ? new URL('../../styling', dashNavScriptUrl).href
    : '/styling';
const isDashNavProjectRootStaticServer = dashNavScriptUrl
    && new URL(dashNavScriptUrl).pathname.endsWith('/frontend/js/components/dash_navbar.js');

const defaultDashNavDashboardHref = isDashNavProjectRootStaticServer
    ? new URL('../../webpages/dashboard.html', dashNavScriptUrl).href
    : '/dashboard';
const defaultDashNavAppsHref = isDashNavProjectRootStaticServer
    ? new URL('../../webpages/app_selection.html', dashNavScriptUrl).href
    : '/apps';
const defaultDashNavErrorsHref = isDashNavProjectRootStaticServer
    ? new URL('../../webpages/advanced_error_metrics.html', dashNavScriptUrl).href
    : '/advanced-error-metrics';
const defaultDashNavPerformanceHref = isDashNavProjectRootStaticServer
    ? new URL('../../webpages/advanced_performance_metrics.html', dashNavScriptUrl).href
    : '/advanced-performance-metrics';
const defaultDashNavSettingsHref = isDashNavProjectRootStaticServer
    ? new URL('../../webpages/settings.html', dashNavScriptUrl).href
    : '/settings';

class WatchTowerDashNavbar extends WatchTowerBaseElement {
    static get observedAttributes() {
        return ['app-name'];
    }

    constructor() {
        super();
        this.updateScrolledState = this.updateScrolledState.bind(this);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'app-name' && this.shadowRoot) {
            const el = this.shadowRoot.querySelector('.app-name');
            if (el) el.textContent = newValue || '';
            this.render();
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
        const active = this.getOption('active', 'home');
        const appName = this.getAttribute('app-name') || '';
        const dashboardHref = this.getOption('dashboard-href', defaultDashNavDashboardHref);
        const appsHref = this.getOption('apps-href', defaultDashNavAppsHref);
        const errorsHref = this.getOption('errors-href', defaultDashNavErrorsHref);
        const performanceHref = this.getOption('performance-href', defaultDashNavPerformanceHref);
        const settingsHref = this.getOption('settings-href', defaultDashNavSettingsHref);
        const stylesheetHref = this.getStylePath('dash_navbar.css', defaultDashNavStyleBase);
        const settingsIconSrc = this.getAssetPath('settings-icon.svg', defaultDashNavAssetBase);

        const navItems = [
            { key: 'home', label: 'Home', href: dashboardHref },
            { key: 'errors', label: 'Errors', href: errorsHref },
            { key: 'performance', label: 'Performance', href: performanceHref },
        ];

        const navItemsHtml = navItems.map(({ key, label, href }) =>
            `<li><a href="${href}" class="nav-link${active === key ? ' nav-link-active' : ''}">${label}</a></li>`
        ).join('');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">
            <header class="sub-header">
                <nav class="sub-nav" aria-label="App navigation">
                    <div class="nav-back">
                        <a href="${appsHref}" class="back-link" aria-label="Back to projects">
                            <svg class="back-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                                <path d="M12 5l-5 5 5 5"/>
                            </svg>
                        </a>
                        <span class="app-name">${appName}</span>
                    </div>

                    <ul class="nav-links">
                        ${navItemsHtml}
                    </ul>

                    <div class="nav-actions">
                        <a href="${settingsHref}" class="settings-link${active === 'settings' ? ' settings-link-active' : ''}" aria-label="App settings">
                            <img class="settings-icon" src="${settingsIconSrc}" alt="">
                        </a>
                    </div>
                </nav>
            </header>
        `;
    }

    updateScrolledState() {
        const header = this.shadowRoot ? this.shadowRoot.querySelector('.sub-header') : null;
        if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 2);
        }
    }
}

if (!customElements.get('watchtower-dash-navbar')) {
    customElements.define('watchtower-dash-navbar', WatchTowerDashNavbar);
}
