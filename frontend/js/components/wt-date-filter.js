const dateFilterScriptUrl = document.currentScript ? document.currentScript.src : '';

class WtDateFilter extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        const assetBase = dateFilterScriptUrl
            ? new URL('../../assets', dateFilterScriptUrl).href
            : '/assets';

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
            <style>
                :host { display: block; }
                .filter-card {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    width: fit-content;
                    padding: 4px 7px;
                    background: white;
                    border-radius: 16px;
                    border: 1px solid rgb(33 31 36 / 6%);
                    flex-shrink: 0;
                }
                .filter-icon img {
                    width: 28px;
                    height: 28px;
                    object-fit: contain;
                    opacity: 0.95;
                }
                .date-input {
                    width: 215px;
                    min-height: 36px;
                    padding: 0 10px;
                    border: 1px solid rgb(33 31 36 / 12%);
                    border-radius: 8px;
                    background: #fff;
                    font: inherit;
                    font-size: 0.85rem;
                    cursor: pointer;
                    box-sizing: border-box;
                }
            </style>
            <div class="filter-card">
                <div class="filter-icon">
                    <img src="${assetBase}/calendar-icon.svg" alt="Calendar">
                </div>
                <input class="date-input" type="text" placeholder="Select date range" readonly>
            </div>
        `;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._initPicker(), { once: true });
        } else {
            this._initPicker();
        }
    }

    _initPicker() {
        if (!window.flatpickr) return;
        const input = this.shadowRoot.querySelector('.date-input');
        this._fp = window.flatpickr(input, {
            mode: 'range',
            dateFormat: 'm/d/Y',
            defaultDate: [
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                new Date(),
            ],
            onChange: (selectedDates) => {
                if (selectedDates.length === 2) {
                    this.dispatchEvent(new CustomEvent('datechange', {
                        bubbles: true,
                        detail: { from: selectedDates[0], to: selectedDates[1] },
                    }));
                }
            },
        });
    }

    get dates() {
        return this._fp?.selectedDates ?? [];
    }

    get from() {
        return this.dates[0] ?? null;
    }

    get to() {
        return this.dates[1] ?? null;
    }
}

if (!customElements.get('wt-date-filter')) {
    customElements.define('wt-date-filter', WtDateFilter);
}
