const layoutScriptUrl = document.currentScript ? document.currentScript.src : '';

// Eagerly load the footer component if it hasn't been registered yet.
// wt-dash-layout is the entry point for dashboard pages, so it's responsible
// for pulling in footer.js rather than requiring every page to include it separately.
if (!customElements.get('watchtower-footer')) {
    const footerScript = document.createElement('script');
    footerScript.src = layoutScriptUrl
        ? new URL('footer.js', layoutScriptUrl).href
        : '/frontend/js/components/footer.js';
    document.head.appendChild(footerScript);
}

/**
 * `<wt-dash-layout>` — shell component that wraps the dashboard page structure.
 * Fetches and stamps a shared HTML template (dashboard-layout.html) into its
 * shadow root so the layout markup doesn't have to be duplicated in every page file.
 *
 * Observed attributes are forwarded to the inner `<watchtower-dash-navbar>` so
 * the navbar can be controlled from the outside without re-rendering the layout.
 *
 * Attributes:
 *   active    - Forwarded to the inner navbar for active link highlighting.
 *   app-name  - Forwarded to the inner navbar to display the current app name.
 */
class WtDashLayout extends WatchTowerBaseElement {
    static get observedAttributes() {
        return ['active', 'app-name'];
    }

    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
        this._render();
    }

    /**
     * Syncs attribute changes to the inner navbar without re-fetching the template.
     */
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this._syncAttr(name, newVal);
        }
    }

    /**
     * Passes an attribute value to the inner dash-navbar element.
     * No-ops if the shadow root hasn't been populated yet (template fetch pending).
     *
     * @param {string} name
     * @param {string | null} value
     */
    _syncAttr(name, value) {
        const nav = this.shadowRoot && this.shadowRoot.querySelector('#layout-dash-nav');
        if (!nav) return;
        if (value !== null) {
            nav.setAttribute(name, value);
        } else {
            nav.removeAttribute(name);
        }
    }

    /**
     * Fetches the layout HTML template and stamps it into the shadow root.
     * The template is fetched rather than inlined here so it can be edited
     * without touching JS. After stamping, any already-set observed attributes
     * are forwarded to the inner navbar.
     */
    _render() {
        const templateUrl = layoutScriptUrl
            ? new URL('../../templates/dashboard-layout.html', layoutScriptUrl).href
            : '/frontend/templates/dashboard-layout.html';
        const styleUrl = layoutScriptUrl
            ? new URL('../../styling/dashboard-layout.css', layoutScriptUrl).href
            : '/frontend/styling/dashboard-layout.css';

        fetch(templateUrl)
            .then(r => r.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const tpl = doc.getElementById('wt-dash-layout-template');
                if (!tpl) return;

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = styleUrl;

                this.shadowRoot.innerHTML = '';
                this.shadowRoot.appendChild(link);
                this.shadowRoot.appendChild(tpl.content.cloneNode(true));

                // Forward observed attributes to the inner dash-navbar
                for (const attr of WtDashLayout.observedAttributes) {
                    if (this.hasAttribute(attr)) {
                        this._syncAttr(attr, this.getAttribute(attr));
                    }
                }
            });
    }
}

if (!customElements.get('wt-dash-layout')) {
    customElements.define('wt-dash-layout', WtDashLayout);
}
