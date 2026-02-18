import { appsStore, NOTES_DELAY_MS, ICON_IDS } from './state.js';
import { escapeHtml, renderIcon } from './utils.js';

export function createAppGrid() {
    let gridEl;
    const unsubs = [];

    function appCardId(app) {
        return btoa(app.name + '|' + app.url).replace(/[^a-zA-Z0-9]/g, '');
    }

    function appsStructureChanged(oldApps, newApps) {
        if (oldApps.length !== newApps.length) return true;
        for (let i = 0; i < oldApps.length; i++) {
            if (oldApps[i].name !== newApps[i].name ||
                oldApps[i].url !== newApps[i].url ||
                oldApps[i].category !== newApps[i].category ||
                oldApps[i].icon !== newApps[i].icon ||
                oldApps[i].notes !== newApps[i].notes) {
                return true;
            }
        }
        return false;
    }

    function updateStatuses(appList) {
        appList.forEach((app) => {
            const appId = appCardId(app);
            const card = gridEl.querySelector(`[data-app-id="${appId}"]`);
            if (!card) return;

            const statusDot = card.querySelector('.status-dot');
            const statusText = card.querySelector('.status-text');

            if (statusDot) {
                statusDot.className = 'status-dot';
                if (app.status === 'UP') statusDot.classList.add('up');
                else if (app.status === 'DOWN') statusDot.classList.add('down');
                else if (app.status === 'SKIPPED') statusDot.classList.add('skipped');
            }
            if (statusText) statusText.textContent = app.status;
        });
    }

    function renderAppCard(app) {
        const iconId = ICON_IDS.includes(app.icon) ? app.icon : 'box';
        const icon = renderIcon(iconId);
        const statusClass = app.status === 'UP' ? 'up' : app.status === 'DOWN' ? 'down' : app.status === 'SKIPPED' ? 'skipped' : '';
        const appId = appCardId(app);
        const notesTooltip = app.notes ? `<div class="app-card-notes">${escapeHtml(app.notes)}</div>` : '';

        return `
            <a class="app-card${app.notes ? ' has-notes' : ''}" data-app-id="${appId}" href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer">
                <div class="app-card-icon">${icon}</div>
                <div class="app-card-name">${escapeHtml(app.name)}</div>
                <div class="app-card-status">
                    <div class="status-dot ${statusClass}"></div>
                    <span class="status-text">${app.status}</span>
                </div>
                ${notesTooltip}
            </a>
        `;
    }

    function render(appList) {
        const groups = {};
        appList.forEach((app) => {
            if (!groups[app.category]) groups[app.category] = [];
            groups[app.category].push(app);
        });

        const sortedCategories = Object.keys(groups);

        let html = '';
        sortedCategories.forEach((category) => {
            html += `
                <section class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${escapeHtml(category)}</h2>
                        <div class="category-line"></div>
                    </div>
                    <div class="app-grid">
                        ${groups[category].map((app) => renderAppCard(app)).join('')}
                    </div>
                </section>
            `;
        });

        gridEl.innerHTML = html || '<div class="loading">No apps configured. Edit apps.yaml to add some!</div>';
    }

    function initNotesHover() {
        let hoverTimer;
        let activeHoverCard = null;

        const clearHoverTimer = () => {
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
        };

        gridEl.addEventListener('mouseover', (event) => {
            const card = event.target.closest('.app-card.has-notes');
            if (!card || !gridEl.contains(card)) return;
            if (event.relatedTarget && card.contains(event.relatedTarget)) return;
            clearHoverTimer();
            activeHoverCard = card;
            hoverTimer = setTimeout(() => {
                if (activeHoverCard === card) card.classList.add('notes-active', 'notes-layer');
            }, NOTES_DELAY_MS);
        });

        gridEl.addEventListener('mouseout', (event) => {
            const card = event.target.closest('.app-card.has-notes');
            if (!card || !gridEl.contains(card)) return;
            if (event.relatedTarget && card.contains(event.relatedTarget)) return;
            clearHoverTimer();
            if (activeHoverCard === card) activeHoverCard = null;
            card.classList.remove('notes-active', 'notes-layer');
        });

        gridEl.addEventListener('focusin', (event) => {
            const card = event.target.closest('.app-card.has-notes');
            if (!card || !gridEl.contains(card)) return;
            clearHoverTimer();
            activeHoverCard = card;
            hoverTimer = setTimeout(() => {
                if (activeHoverCard === card) card.classList.add('notes-active', 'notes-layer');
            }, NOTES_DELAY_MS);
        });

        gridEl.addEventListener('focusout', (event) => {
            const card = event.target.closest('.app-card.has-notes');
            if (!card || !gridEl.contains(card)) return;
            clearHoverTimer();
            if (activeHoverCard === card) activeHoverCard = null;
            card.classList.remove('notes-active', 'notes-layer');
        });
    }

    return {
        mount(els) {
            gridEl = els.gridEl;
            initNotesHover();

            let prev = [];
            unsubs.push(appsStore.subscribe((apps) => {
                if (appsStructureChanged(prev, apps)) {
                    render(apps);
                } else {
                    updateStatuses(apps);
                }
                prev = apps;
            }));
        },

        setError(message) {
            if (gridEl) gridEl.innerHTML = `<div class="loading">${message}</div>`;
        },

        destroy() {
            unsubs.forEach((unsub) => unsub());
            unsubs.length = 0;
        }
    };
}
