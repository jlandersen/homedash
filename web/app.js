import { apps, setApps, setConfig, setStats, config, NOTES_DELAY_MS, ICON_IDS } from './state.js';
import { initClock, buildClockFormatters } from './clock.js';
import { initStats, initStatsDetails, initSparklineCleanup, renderStats, hydrateHistory, applyStatsVisibility } from './stats.js';
import { initEditMode, openEditMode, closeEditMode, applyEditVisibility } from './editor.js';
import { initCommandPalette, openCommandPalette, closeCommandPalette, launchApp } from './command-palette.js';
import { escapeHtml, renderIcon } from './utils.js';

let appGridEl;

document.addEventListener('DOMContentLoaded', () => {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    appGridEl = document.getElementById('appGrid');
    const searchBtn = document.getElementById('searchBtn');
    const themeBtn = document.getElementById('themeBtn');
    const viewBtn = document.getElementById('viewBtn');
    const editBtn = document.getElementById('editBtn');
    const commandPalette = document.getElementById('commandPalette');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const statsDetailsEl = document.getElementById('statsDetails');

    initClock(clockEl, dateEl);
    initTheme(themeBtn);
    initView(viewBtn);

    initStats({
        cpuValueEl: document.getElementById('cpu-value'),
        ramValueEl: document.getElementById('ram-value'),
        tempValueEl: document.getElementById('temp-value'),
        hostCpuSparkEl: document.getElementById('host-cpu-spark'),
        hostRamSparkEl: document.getElementById('host-ram-spark'),
        hostTempSparkEl: document.getElementById('host-temp-spark'),
        hostTxSparkEl: document.getElementById('host-tx-spark'),
        hostRxSparkEl: document.getElementById('host-rx-spark'),
        hostCpuValueEl: document.getElementById('host-cpu-value'),
        hostRamValueEl: document.getElementById('host-ram-value'),
        hostTempValueEl: document.getElementById('host-temp-value'),
        hostTxValueEl: document.getElementById('host-tx-value'),
        hostRxValueEl: document.getElementById('host-rx-value'),
        statCpuEl: document.getElementById('stat-cpu'),
        statRamEl: document.getElementById('stat-ram'),
        statTempEl: document.getElementById('stat-temp'),
        hostTxCardEl: document.getElementById('host-tx-card'),
        hostRxCardEl: document.getElementById('host-rx-card'),
        statsDetailsEl
    });

    initStatsDetails(statsDetailsEl);
    initSparklineCleanup();

    initCommandPalette({ searchBtn, commandPalette, searchInput, searchResults });

    initEditMode({
        editModal: document.getElementById('editModal'),
        editListEl: document.getElementById('editList'),
        editSaveBtn: document.getElementById('editSaveBtn'),
        editCancelBtn: document.getElementById('editCancelBtn'),
        editAddBtn: document.getElementById('editAddBtn'),
        editCategoryOrderListEl: document.getElementById('editCategoryOrderList'),
        editCategoryOrderAddBtn: document.getElementById('editCategoryOrderAddBtn'),
        editCategoryOrderInput: document.getElementById('editCategoryOrderInput'),
        editBtn
    });

    initKeyboardShortcuts();
    initNotesHover(appGridEl);

    fetchApps();
    fetchStatsHistory();
    connectSSE();
});

// expose launchApp for onclick handlers in search results
window.launchApp = launchApp;

function initTheme(themeBtn) {
    const savedTheme = localStorage.getItem('homedash-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
    }
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        localStorage.setItem('homedash-theme', isLight ? 'light' : 'dark');
    });
}

function initView(viewBtn) {
    const savedView = localStorage.getItem('homedash-view');
    if (savedView === 'small') {
        document.body.classList.add('view-small');
    }
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            document.body.classList.toggle('view-small');
            const isSmall = document.body.classList.contains('view-small');
            localStorage.setItem('homedash-view', isSmall ? 'small' : 'cards');
        });
    }
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCommandPalette();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault();
            openEditMode(config);
        }
        if (e.key === 'Escape') {
            closeCommandPalette();
            closeEditMode();
        }
    });
}

function initNotesHover(appGridEl) {
    if (!appGridEl) return;
    let hoverTimer;
    let activeHoverCard = null;

    const clearHoverTimer = () => {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    };

    appGridEl.addEventListener('mouseover', (event) => {
        const card = event.target.closest('.app-card.has-notes');
        if (!card || !appGridEl.contains(card)) return;
        if (event.relatedTarget && card.contains(event.relatedTarget)) return;
        clearHoverTimer();
        activeHoverCard = card;
        hoverTimer = setTimeout(() => {
            if (activeHoverCard === card) card.classList.add('notes-active', 'notes-layer');
        }, NOTES_DELAY_MS);
    });

    appGridEl.addEventListener('mouseout', (event) => {
        const card = event.target.closest('.app-card.has-notes');
        if (!card || !appGridEl.contains(card)) return;
        if (event.relatedTarget && card.contains(event.relatedTarget)) return;
        clearHoverTimer();
        if (activeHoverCard === card) activeHoverCard = null;
        card.classList.remove('notes-active', 'notes-layer');
    });

    appGridEl.addEventListener('focusin', (event) => {
        const card = event.target.closest('.app-card.has-notes');
        if (!card || !appGridEl.contains(card)) return;
        clearHoverTimer();
        activeHoverCard = card;
        hoverTimer = setTimeout(() => {
            if (activeHoverCard === card) card.classList.add('notes-active', 'notes-layer');
        }, NOTES_DELAY_MS);
    });

    appGridEl.addEventListener('focusout', (event) => {
        const card = event.target.closest('.app-card.has-notes');
        if (!card || !appGridEl.contains(card)) return;
        clearHoverTimer();
        if (activeHoverCard === card) activeHoverCard = null;
        card.classList.remove('notes-active', 'notes-layer');
    });
}

async function fetchApps() {
    try {
        const res = await fetch('/api/apps');
        setApps(await res.json());
        renderApps(apps);
        applyEditVisibility(config);
    } catch (err) {
        console.error('Failed to fetch apps:', err);
        appGridEl.innerHTML = '<div class="loading">Failed to load apps. Is the server running?</div>';
    }
}

async function fetchStatsHistory() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch stats history');
        const historyPayload = await res.json();
        hydrateHistory(historyPayload);
    } catch (err) {
        console.error('Failed to fetch stats history:', err);
    }
}

function connectSSE() {
    const es = new EventSource('/api/events');

    es.addEventListener('config', (e) => {
        try {
            setConfig(JSON.parse(e.data));
            buildClockFormatters();
            applyStatsVisibility();
            applyEditVisibility(config);
        } catch (err) {
            console.error('Failed to parse config event:', err);
        }
    });

    es.addEventListener('apps', (e) => {
        try {
            const newApps = JSON.parse(e.data);
            if (appsStructureChanged(apps, newApps)) {
                setApps(newApps);
                renderApps(apps);
            } else {
                setApps(newApps);
                updateAppStatuses(apps);
            }
        } catch (err) {
            console.error('Failed to parse apps event:', err);
        }
    });

    es.addEventListener('stats', (e) => {
        try {
            const s = JSON.parse(e.data);
            setStats(s);
            renderStats(s);
        } catch (err) {
            console.error('Failed to parse stats event:', err);
        }
    });

    es.onerror = () => {
        console.log('SSE connection lost, reconnecting...');
    };
}

function renderApps(appList) {
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

    appGridEl.innerHTML = html || '<div class="loading">No apps configured. Edit apps.yaml to add some!</div>';
}

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

function updateAppStatuses(appList) {
    appList.forEach((app) => {
        const appId = appCardId(app);
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
