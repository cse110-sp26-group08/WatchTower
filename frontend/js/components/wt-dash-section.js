class WtDashSection extends HTMLElement {
    connectedCallback() {
        const heading = this.getAttribute('heading') || '';
        const eyebrow = this.getAttribute('eyebrow') || '';

        const shadow = this.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    min-width: 0;
                }
                .card {
                    background: var(--panel);
                    border: 1px solid rgb(255 255 255 / 72%);
                    border-radius: 16px;
                    box-shadow: var(--shadow);
                    padding: 20px;
                    height: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    min-width: 0;
                }
                .card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 18px;
                }
                .title-block {
                    min-width: 0;
                    flex: 1;
                }
                .eyebrow {
                    margin: 0 0 4px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                    color: var(--blue);
                    font-family: var(--font-family-primary);
                }
                .heading {
                    margin: 0;
                    font-size: 1.18rem;
                    font-weight: 800;
                    line-height: 1.15;
                    color: var(--text);
                    font-family: var(--font-family-primary);
                }
                ::slotted([slot="heading"]) {
                    margin: 0 !important;
                    font-size: 1.18rem !important;
                    font-weight: 800 !important;
                    line-height: 1.15 !important;
                }
            </style>
            <div class="card">
                <div class="card-header">
                    <div class="title-block">
                        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
                        ${heading ? `<h3 class="heading">${heading}</h3>` : ''}
                        <slot name="heading"></slot>
                    </div>
                    <slot name="header-end"></slot>
                </div>
                <slot></slot>
            </div>
        `;
    }
}

if (!customElements.get('wt-dash-section')) {
    customElements.define('wt-dash-section', WtDashSection);
}
