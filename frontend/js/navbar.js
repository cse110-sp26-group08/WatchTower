const navbarScriptUrl = document.currentScript ? document.currentScript.src : '';
const defaultAssetBase = navbarScriptUrl
    ? new URL('../assets', navbarScriptUrl).href
    : '/assets';
const isProjectRootStaticServer = navbarScriptUrl
    && new URL(navbarScriptUrl).pathname.endsWith('/frontend/js/navbar.js');
const defaultHomeHref = isProjectRootStaticServer
    ? new URL('../webpages/index.html', navbarScriptUrl).href
    : '/';
const defaultLoginHref = isProjectRootStaticServer
    ? new URL('../webpages/login.html', navbarScriptUrl).href
    : '/login';
const defaultSignupHref = isProjectRootStaticServer
    ? new URL('../webpages/signup.html', navbarScriptUrl).href
    : '/signup';
const defaultDocsHref = isProjectRootStaticServer
    ? new URL('../webpages/docs.html', navbarScriptUrl).href
    : '/docs';
const defaultProductHref = 'https://github.com/cse110-sp26-group08/WatchTower/blob/main/documentation/rest-api.md';

class WatchTowerNavbar extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.render();
    }

    getOption(name, fallback) {
        return this.getAttribute(name) || fallback;
    }

    getAssetPath(fileName) {
        return `${this.getOption('asset-base', defaultAssetBase).replace(/\/$/, '')}/${fileName}`;
    }

    render() {
        const homeHref = this.getOption('home-href', defaultHomeHref);
        const productHref = this.getOption('product-href', defaultProductHref);
        const docsHref = this.getOption('docs-href', defaultDocsHref);
        const githubHref = this.getOption(
            'github-href',
            'https://github.com/cse110-sp26-group08/WatchTower',
        );
        const loginHref = this.getOption('login-href', defaultLoginHref);
        const contactHref = this.getOption('contact-href', 'mailto:contact@watchtower.dev');
        const signupHref = this.getOption('signup-href', defaultSignupHref);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 98px;
                    position: relative;
                    z-index: 1000;
                    font-family: Manrope, Arial, sans-serif;
                    color: #211f24;
                }

                * {
                    box-sizing: border-box;
                }

                a {
                    color: inherit;
                    text-decoration: none;
                }

                .site-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    padding: 16px 0 12px;
                    pointer-events: none;
                }

                .site-header::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background:
                        linear-gradient(
                            180deg,
                            rgb(250 250 248 / 90%) 0%,
                            rgb(250 250 248 / 62%) 68%,
                            rgb(250 250 248 / 0%) 100%
                        );
                    backdrop-filter: blur(10px);
                }

                .site-nav {
                    position: relative;
                    z-index: 1;
                    width: fit-content;
                    max-width: calc(100% - 48px);
                    min-height: 66px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: grid;
                    grid-template-columns: auto auto auto;
                    align-items: center;
                    column-gap: clamp(48px, 5vw, 76px);
                    border: 1px solid rgb(255 255 255 / 78%);
                    border-radius: 28px;
                    background: rgb(255 255 255 / 72%);
                    box-shadow: 0 18px 48px rgb(64 61 77 / 12%);
                    backdrop-filter: blur(22px);
                    pointer-events: auto;
                }

                .brand-mark {
                    display: flex;
                    align-items: center;
                    justify-self: start;
                }

                .brand-link {
                    font-size: 1.72rem;
                    font-weight: 800;
                    letter-spacing: 0;
                }

                .nav-links,
                .nav-actions {
                    display: flex;
                    align-items: center;
                }

                .nav-links {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    gap: 3.9rem;
                    font-size: 0.98rem;
                    font-weight: 700;
                    justify-self: center;
                }

                .nav-links li {
                    display: flex;
                    align-items: center;
                }

                .nav-actions {
                    justify-self: end;
                    gap: 16px;
                }

                .nav-login {
                    font-size: 0.98rem;
                    font-weight: 700;
                    color: rgb(33 31 36 / 82%);
                }

                .nav-links a,
                .nav-login {
                    transition: color 180ms ease, opacity 180ms ease, transform 180ms ease;
                }

                .nav-links a:hover,
                .nav-links a:focus-visible,
                .nav-login:hover,
                .nav-login:focus-visible {
                    color: #486bea;
                }

                .github-link {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border: 1px solid rgb(33 31 36 / 14%);
                    border-radius: 8px;
                    background: rgb(255 255 255 / 74%);
                    box-shadow: 0 8px 18px rgb(33 31 36 / 8%);
                    overflow: hidden;
                    transition:
                        background-color 180ms ease,
                        border-color 180ms ease,
                        box-shadow 180ms ease,
                        transform 180ms ease;
                }

                .github-link:hover,
                .github-link:focus-visible {
                    border-color: transparent;
                    background: transparent;
                    box-shadow: 0 10px 22px rgb(33 31 36 / 14%);
                    transform: translateY(-1px);
                }

                .github-link:focus-visible {
                    outline: 2px solid #3864df;
                    outline-offset: 4px;
                }

                .github-icon {
                    display: block;
                    pointer-events: none;
                    object-fit: contain;
                    transition:
                        opacity 180ms ease,
                        transform 180ms ease;
                }

                .github-icon-default {
                    width: 28px;
                    height: 28px;
                    opacity: 1;
                    transform: scale(1);
                }

                .github-icon-hover {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 28px;
                    height: 28px;
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.92);
                }

                .github-link:is(:hover, :focus-visible) .github-icon-default {
                    opacity: 0;
                    transform: scale(0.88);
                }

                .github-link:is(:hover, :focus-visible) .github-icon-hover {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }

                .button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 48px;
                    padding: 0 22px;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    box-shadow: none;
                    transition:
                        transform 180ms ease,
                        box-shadow 180ms ease,
                        background-color 180ms ease,
                        filter 180ms ease;
                }

                .button:hover {
                    transform: translateY(-1px);
                }

                .button-dark {
                    color: #fff;
                    background-color: #030303;
                    box-shadow: 0 16px 28px rgb(0 0 0 / 26%);
                }

                .button-dark:hover,
                .button-dark:focus-visible {
                    background-color: #514a58;
                    box-shadow: 0 14px 24px rgb(33 31 36 / 18%);
                }

                .button-primary {
                    color: #fff;
                    background: linear-gradient(180deg, #486bea 0%, #274fcb 100%);
                    box-shadow: 0 14px 26px rgb(56 100 223 / 26%);
                }

                .button-primary:hover,
                .button-primary:focus-visible {
                    filter: brightness(1.12) saturate(1.08);
                    box-shadow: 0 18px 34px rgb(56 100 223 / 31%);
                }

                @media (width <= 1280px) {
                    .site-nav {
                        max-width: calc(100% - 40px);
                        column-gap: clamp(32px, 4vw, 56px);
                    }

                    .nav-links {
                        gap: 3.2rem;
                    }
                }

                @media (width <= 980px) {
                    :host {
                        height: 220px;
                    }

                    .site-header {
                        padding: 12px 0 14px;
                    }

                    .site-nav {
                        width: min(100% - 28px, 720px);
                        grid-template-columns: 1fr;
                        gap: 16px;
                        padding: 18px;
                    }

                    .brand-mark,
                    .nav-actions {
                        justify-self: center;
                    }

                    .nav-links {
                        justify-content: center;
                        gap: 42px;
                    }
                }

                @media (width <= 620px) {
                    :host {
                        height: 252px;
                    }

                    .site-nav {
                        border-radius: 22px;
                    }

                    .brand-link {
                        font-size: 1.45rem;
                    }

                    .nav-actions {
                        width: 100%;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 12px;
                    }

                    .nav-login {
                        min-height: 42px;
                        display: inline-flex;
                        align-items: center;
                    }

                    .button {
                        min-height: 44px;
                        padding-inline: 18px;
                    }
                }
            </style>

            <header class="site-header">
                <nav class="site-nav" aria-label="Main navigation">
                    <div class="brand-mark">
                        <a href="${homeHref}" class="brand-link">WatchTower</a>
                    </div>

                    <ul class="nav-links">
                        <li><a href="${productHref}">Product</a></li>
                        <li><a href="${docsHref}">Docs</a></li>
                        <li>
                            <a href="${githubHref}" class="github-link" aria-label="WatchTower on GitHub">
                                <img class="github-icon github-icon-default" src="${this.getAssetPath('github-icon-default.svg')}" alt="">
                                <img class="github-icon github-icon-hover" src="${this.getAssetPath('github-icon-hover.svg')}" alt="">
                            </a>
                        </li>
                    </ul>

                    <div class="nav-actions">
                        <a href="${loginHref}" class="nav-login">Sign in</a>
                        <a href="${contactHref}" class="button button-dark">Contact Us</a>
                        <a href="${signupHref}" class="button button-primary">Get started</a>
                    </div>
                </nav>
            </header>
        `;

        const brandLink = this.shadowRoot.querySelector('.brand-link');
        if (brandLink) {
            brandLink.addEventListener('click', (event) => {
                this.handleBrandClick(event, homeHref);
            });
        }
    }

    handleBrandClick(event, homeHref) {
        const targetUrl = new URL(homeHref, window.location.href);
        const currentUrl = new URL(window.location.href);
        const isCurrentPage = targetUrl.origin === currentUrl.origin
            && targetUrl.pathname === currentUrl.pathname
            && targetUrl.search === currentUrl.search
            && targetUrl.hash === currentUrl.hash;

        if (isCurrentPage) {
            event.preventDefault();
            window.location.reload();
        }
    }
}

if (!customElements.get('watchtower-navbar')) {
    customElements.define('watchtower-navbar', WatchTowerNavbar);
}
