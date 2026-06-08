// Resolve base URLs at load time while document.currentScript is still available.
const dashNavScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultDashNavAssetBase = dashNavScriptUrl
    ? new URL('../../assets', dashNavScriptUrl).href
    : '/assets';
const defaultDashNavStyleBase = dashNavScriptUrl
    ? new URL('../../styling', dashNavScriptUrl).href
    : '/styling';

// True when running from the filesystem (e.g. VS Code Live Server), not Express.
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

/**
 * `<watchtower-dash-navbar>` — top navigation bar shown inside the dashboard layout.
 * Displays the current app name, page links, and a settings icon.
 *
 * Attributes:
 *   app-name         - Text shown next to the back arrow. Updated reactively.
 *   active           - Highlights the matching nav link. Auto-detected from the URL if omitted.
 *   dashboard-href   - Override the Home link.
 *   apps-href        - Override the "back to projects" link.
 *   errors-href      - Override the Errors link.
 *   performance-href - Override the Performance link.
 *   settings-href    - Override the Settings link.
 *   style-base       - Base URL for loading dash_navbar.css.
 *   asset-base       - Base URL for the settings icon SVG.
 */
class WatchTowerDashNavbar extends WatchTowerBaseElement {
    static get observedAttributes() {
        return ['app-name'];
    }

    constructor() {
        super();
        // Bind here so the exact same reference is used for removeEventListener
        this.updateScrolledState = this.updateScrolledState.bind(this);
    }

    /**
     * Reactively updates the displayed app name without re-rendering the whole navbar.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'app-name' && this.shadowRoot) {
            const el = this.shadowRoot.querySelector('.app-name');
            if (el) el.textContent = newValue || '';
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

    /**
     * Infers the active page from the URL pathname so pages don't need to
     * set the 'active' attribute manually. Handles both Express routes
     * (/advanced-error-metrics) and static file paths (advanced_error_metrics.html).
     *
     * @returns {'errors' | 'performance' | 'settings' | 'home'}
     */
    detectActivePage() {
        const path = window.location.pathname;
        if (path.includes('advanced-error-metrics') || path.includes('advanced_error_metrics')) {
            return 'errors';
        }
        if (path.includes('advanced-performance-metrics') || path.includes('advanced_performance_metrics')) {
            return 'performance';
        }
        if (path.includes('settings')) {
            return 'settings';
        }
        return 'home';
    }

    render() {
        const active = this.getOption('active', this.detectActivePage());
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

    /**
     * Adds "is-scrolled" to the header once the user scrolls past 2px,
     * which triggers a CSS drop-shadow transition.
     */
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
