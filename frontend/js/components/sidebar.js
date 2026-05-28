const sidebarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultSidebarStyleBase = sidebarScriptUrl
    ? new URL('../../styling', sidebarScriptUrl).href
    : '/styling';
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
