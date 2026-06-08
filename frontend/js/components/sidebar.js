// Resolve hrefs at load time while document.currentScript is still available.
// After this script executes, currentScript becomes null and can't be used.
const sidebarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultSidebarStyleBase = sidebarScriptUrl
    ? new URL('../../styling', sidebarScriptUrl).href
    : '/styling';

// True when running through a filesystem static server (e.g. VS Code Live Server)
// rather than Express. Affects whether nav hrefs use .html file paths or clean routes.
const isSidebarProjectRootStaticServer = sidebarScriptUrl
    && new URL(sidebarScriptUrl).pathname.endsWith('/frontend/js/components/sidebar.js');

const defaultSidebarDashboardHref = isSidebarProjectRootStaticServer
    ? new URL('../../webpages/dashboard.html', sidebarScriptUrl).href
    : '/dashboard';
const defaultSidebarAppsHref = isSidebarProjectRootStaticServer
    ? new URL('../../webpages/app_selection.html', sidebarScriptUrl).href
    : '/apps';
const defaultSidebarErrorsHref = isSidebarProjectRootStaticServer
    ? new URL('../../webpages/advanced_error_metrics.html', sidebarScriptUrl).href
    : '/advanced-error-metrics';
const defaultSidebarPerformanceHref = isSidebarProjectRootStaticServer
    ? new URL('../../webpages/advanced_performance_metrics.html', sidebarScriptUrl).href
    : '/advanced-performance-metrics';

/**
 * `<watchtower-sidebar>` — left-side navigation for dashboard pages.
 *
 * Attributes:
 *   active            - Highlights the matching nav item. One of: home, projects, errors, performance.
 *   dashboard-href    - Override the home link URL.
 *   apps-href         - Override the projects link URL.
 *   errors-href       - Override the errors link URL.
 *   performance-href  - Override the performance link URL.
 *   style-base        - Base URL for loading sidebar.css (defaults to ../../styling relative to this script).
 */
class WatchTowerSidebar extends WatchTowerBaseElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
        this.render();
    }

    render() {
        const active = this.getOption('active', 'home');
        const dashboardHref = this.getOption('dashboard-href', defaultSidebarDashboardHref);
        const appsHref = this.getOption('apps-href', defaultSidebarAppsHref);
        const errorsHref = this.getOption('errors-href', defaultSidebarErrorsHref);
        const performanceHref = this.getOption('performance-href', defaultSidebarPerformanceHref);
        const stylesheetHref = this.getStylePath('sidebar.css', defaultSidebarStyleBase);

        const items = [
            { key: 'home', label: 'Home', href: dashboardHref },
            { key: 'projects', label: 'Projects', href: appsHref },
            { key: 'errors', label: 'Advanced Error Metrics', href: errorsHref },
            { key: 'performance', label: 'Advanced Performance Metrics', href: performanceHref },
        ];

        const itemsHtml = items.map(({ key, label, href }) => `
            <a class="nav-item${active === key ? ' nav-item-active' : ''}" href="${href}">
                <span class="nav-item-label">${label}</span>
            </a>
        `).join('');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${stylesheetHref}">
            <nav class="sidebar" aria-label="Dashboard navigation">
                ${itemsHtml}
            </nav>
        `;
    }
}

if (!customElements.get('watchtower-sidebar')) {
    customElements.define('watchtower-sidebar', WatchTowerSidebar);
}
