const layoutScriptUrl = document.currentScript ? document.currentScript.src : '';
const dashLayoutTemplateCachePrefix = 'watchtower:shadow-template:';
const dashLayoutStyleCachePrefix = 'watchtower:shadow-css:';

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
        return ['active'];
    }

    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
        this._render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this._syncNavbarAttr(name, newVal);
        }
    }

    _syncNavbarAttr(name, value) {
        const nav = this.shadowRoot && this.shadowRoot.querySelector('#layout-app-nav');
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
        const cachedTemplate = this.getCachedValue(`${dashLayoutTemplateCachePrefix}${templateUrl}`);

        if (cachedTemplate) {
            this._mountTemplate(cachedTemplate, styleUrl);
            return;
        }

        fetch(templateUrl, { cache: 'force-cache' })
            .then(r => r.text())
            .then(html => {
                this.setCachedValue(`${dashLayoutTemplateCachePrefix}${templateUrl}`, html);
                this._mountTemplate(html, styleUrl);
            });
    }

    _mountTemplate(html, styleUrl) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const tpl = doc.getElementById('wt-dash-layout-template');
        if (!tpl) return;

        this.shadowRoot.innerHTML = '';
        this._appendStylesheet(styleUrl);
        this.shadowRoot.appendChild(tpl.content.cloneNode(true));

        for (const attr of WtDashLayout.observedAttributes) {
            if (this.hasAttribute(attr)) {
                this._syncNavbarAttr(attr, this.getAttribute(attr));
            }
        }
    }

    _appendStylesheet(styleUrl) {
        const slot = document.createElement('span');
        slot.dataset.layoutStyleSlot = '';
        this.shadowRoot.appendChild(slot);
        this.mountCachedStylesheet({
            cachePrefix: dashLayoutStyleCachePrefix,
            root: this.shadowRoot,
            slotSelector: '[data-layout-style-slot]',
            stylesheetHref: styleUrl,
            onReady: () => undefined,
        });
    }
}

if (!customElements.get('wt-dash-layout')) {
    customElements.define('wt-dash-layout', WtDashLayout);
}
