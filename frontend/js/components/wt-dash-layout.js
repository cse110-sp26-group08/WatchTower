const layoutScriptUrl = document.currentScript ? document.currentScript.src : '';

// Load footer component alongside this layout component if not already registered
if (!customElements.get('watchtower-footer')) {
    const footerScript = document.createElement('script');
    footerScript.src = layoutScriptUrl
        ? new URL('footer.js', layoutScriptUrl).href
        : '/frontend/js/components/footer.js';
    document.head.appendChild(footerScript);
}

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

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this._syncAttr(name, newVal);
        }
    }

    _syncAttr(name, value) {
        const nav = this.shadowRoot && this.shadowRoot.querySelector('#layout-dash-nav');
        if (!nav) return;
        if (value !== null) {
            nav.setAttribute(name, value);
        } else {
            nav.removeAttribute(name);
        }
    }

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
