// HomeDash - Frontend JavaScript

const ICON_IDS = [
    'film',
    'tv',
    'music',
    'download',
    'home',
    'workflow',
    'shield',
    'network',
    'server',
    'database',
    'chart',
    'code',
    'git',
    'terminal',
    'box'
];

const ICON_OPTIONS = ICON_IDS;

// State
let apps = [];
let stats = { cpu: null, ram: null, temp: null, netTx: null, netRx: null };
let config = { timeFormat24h: false, showCPU: true, showRAM: true, showTemp: true, showNetTX: true, showNetRX: true };
let selectedIndex = -1;
let filteredResults = [];
const HISTORY_WINDOW_MS = 5 * 60 * 1000;
const history = {
    host: { cpu: [], ram: [], temp: [], netTx: [], netRx: [] }
};


let clockEl, dateEl, appGridEl, searchBtn, themeBtn, viewBtn, editBtn, commandPalette, searchInput, searchResults, statsDetailsEl;
let editModal, editListEl, editSaveBtn, editCancelBtn, editAddBtn;
let isEditMode = false;
let editAppsDraft = [];

document.addEventListener('DOMContentLoaded', () => {
    clockEl = document.getElementById('clock');
    dateEl = document.getElementById('date');
    appGridEl = document.getElementById('appGrid');
    searchBtn = document.getElementById('searchBtn');
    themeBtn = document.getElementById('themeBtn');
    viewBtn = document.getElementById('viewBtn');
    editBtn = document.getElementById('editBtn');
    commandPalette = document.getElementById('commandPalette');
    searchInput = document.getElementById('searchInput');
    searchResults = document.getElementById('searchResults');
    statsDetailsEl = document.getElementById('statsDetails');
    editModal = document.getElementById('editModal');
    editListEl = document.getElementById('editList');
    editSaveBtn = document.getElementById('editSaveBtn');
    editCancelBtn = document.getElementById('editCancelBtn');
    editAddBtn = document.getElementById('editAddBtn');

    initClock();
    initTheme();
    initView();
    initCommandPalette();
    initKeyboardShortcuts();
    initEditMode();
    initStatsDetails();
    initSparklineCleanup();
    
    fetchApps();
    fetchStatsHistory();
    connectSSE();
});

function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: !config.timeFormat24h
    });
    dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function initTheme() {
    const savedTheme = localStorage.getItem('homedash-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
    }
    
    themeBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    localStorage.setItem('homedash-theme', isLight ? 'light' : 'dark');
}

function initView() {
    const savedView = localStorage.getItem('homedash-view');
    if (savedView === 'small') {
        document.body.classList.add('view-small');
    }
    if (viewBtn) {
        viewBtn.addEventListener('click', toggleView);
    }
}

function toggleView() {
    document.body.classList.toggle('view-small');
    const isSmall = document.body.classList.contains('view-small');
    localStorage.setItem('homedash-view', isSmall ? 'small' : 'cards');
}

function initCommandPalette() {
    searchBtn.addEventListener('click', openCommandPalette);
    
    commandPalette.addEventListener('click', (e) => {
        if (e.target === commandPalette) {
            closeCommandPalette();
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        filterApps(e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateResults(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateResults(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            launchSelectedApp();
        }
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to open command palette
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCommandPalette();
        }

        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault();
            openEditMode();
        }
        
        if (e.key === 'Escape') {
            closeCommandPalette();
            closeEditMode();
        }
    });
}

function initEditMode() {
    if (!editBtn || !editModal) return;
    editBtn.addEventListener('click', openEditMode);
    editCancelBtn.addEventListener('click', closeEditMode);
    editSaveBtn.addEventListener('click', saveEditMode);
    editAddBtn.addEventListener('click', addEditRow);

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditMode();
        }
    });

    editListEl.addEventListener('input', (e) => {
        const row = e.target.closest('[data-edit-index]');
        if (!row) return;
        const index = Number(row.dataset.editIndex);
        const key = e.target.dataset.field;
        if (!key || Number.isNaN(index)) return;
        if (key === 'skipCheck') return;
        editAppsDraft[index][key] = e.target.value;
        row.dataset.dirty = 'true';
    });

    editListEl.addEventListener('change', (e) => {
        const row = e.target.closest('[data-edit-index]');
        if (!row) return;
        const index = Number(row.dataset.editIndex);
        if (Number.isNaN(index)) return;
        const field = e.target.dataset.field;
        if (!field) return;
        if (field === 'skipCheck') {
            editAppsDraft[index].skipCheck = e.target.checked;
        } else {
            editAppsDraft[index][field] = e.target.value;
        }
        row.dataset.dirty = 'true';
    });

    editListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const row = btn.closest('[data-edit-index]');
        if (!row) return;
        const index = Number(row.dataset.editIndex);
        if (Number.isNaN(index)) return;
        if (btn.dataset.action === 'delete') {
            editAppsDraft.splice(index, 1);
            renderEditList();
        }
    });
}

function initStatsDetails() {
    if (!statsDetailsEl) return;
    const panel = statsDetailsEl.querySelector('.details-panel');
    const statsSection = document.getElementById('stats');
    if (!panel || !statsSection) return;

    let closeTimer;

    const openPanel = () => {
        clearTimeout(closeTimer);
        statsDetailsEl.classList.add('open');
    };

    const closePanel = () => {
        statsDetailsEl.classList.remove('open');
    };

    const scheduleClose = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closePanel, 150);
    };

    statsSection.addEventListener('mouseenter', openPanel);
    statsSection.addEventListener('mouseleave', scheduleClose);
    panel.addEventListener('mouseenter', openPanel);
    panel.addEventListener('mouseleave', scheduleClose);

    document.addEventListener('click', (event) => {
        if (!statsDetailsEl.contains(event.target) && !statsSection.contains(event.target)) {
            closePanel();
        }
    });
}

function openCommandPalette() {
    commandPalette.classList.add('open');
    searchInput.value = '';
    selectedIndex = 0;
    searchInput.focus();
    filterApps('');
}

function closeCommandPalette() {
    commandPalette.classList.remove('open');
    searchInput.value = '';
    selectedIndex = -1;
    filteredResults = [];
}

async function openEditMode() {
    if (!editModal) return;
    if (config.allowEdit === false) {
        return;
    }
    try {
        const res = await fetch('/api/manifest');
        if (!res.ok) {
            throw new Error('Failed to load manifest');
        }
        const manifestData = await res.json();
        const appList = Array.isArray(manifestData.apps) ? manifestData.apps : [];
        editAppsDraft = appList.map((app) => ({
            name: app.name || '',
            url: app.url || '',
            category: app.category || '',
            icon: app.icon || '',
            checkPath: app.checkPath || '',
            checkType: app.checkType || '',
            skipCheck: Boolean(app.skipCheck)
        }));
        renderEditList();
        editModal.classList.add('open');
        isEditMode = true;
    } catch (err) {
        console.error('Failed to open edit mode:', err);
        alert('Failed to load apps for editing. Check server logs.');
    }
}

function closeEditMode() {
    if (!editModal || !isEditMode) return;
    editModal.classList.remove('open');
    isEditMode = false;
    editAppsDraft = [];
}

function addEditRow() {
    editAppsDraft.push({
        name: '',
        url: '',
        category: '',
        icon: '',
        checkPath: '',
        checkType: '',
        skipCheck: false
    });
    renderEditList();
    const rows = editListEl.querySelectorAll('[data-edit-index]');
    const lastRow = rows[rows.length - 1];
    const firstInput = lastRow ? lastRow.querySelector('input[data-field="name"]') : null;
    if (firstInput) {
        firstInput.focus();
    }
}

function renderEditList() {
    if (!editListEl) return;
    if (!editAppsDraft.length) {
        editListEl.innerHTML = '<div class="empty-state">No apps yet. Add one to get started.</div>';
        return;
    }

    editListEl.innerHTML = editAppsDraft.map((app, index) => {
        const iconOptions = [''].concat(ICON_OPTIONS).map((icon) => {
            const label = icon ? icon : 'auto (box)';
            const selected = icon === (app.icon || '') ? 'selected' : '';
            return `<option value="${escapeHtml(icon)}" ${selected}>${escapeHtml(label)}</option>`;
        }).join('');
        const checkTypeOptions = [
            { value: '', label: 'auto (http)' },
            { value: 'http', label: 'http' },
            { value: 'tcp', label: 'tcp' }
        ].map((option) => {
            const selected = option.value === (app.checkType || '') ? 'selected' : '';
            return `<option value="${option.value}" ${selected}>${option.label}</option>`;
        }).join('');
        return `
            <div class="edit-row" data-edit-index="${index}">
                <div class="edit-fields">
                    <label>
                        <span>Name</span>
                        <input type="text" data-field="name" value="${escapeHtml(app.name)}" placeholder="Name" />
                    </label>
                    <label>
                        <span>URL</span>
                        <input type="text" data-field="url" value="${escapeHtml(app.url)}" placeholder="http://..." />
                    </label>
                    <label>
                        <span>Category</span>
                        <input type="text" data-field="category" value="${escapeHtml(app.category)}" placeholder="Category" />
                    </label>
                    <label>
                        <span>Icon</span>
                        <select data-field="icon">
                            ${iconOptions}
                        </select>
                    </label>
                    <label>
                        <span>Check path</span>
                        <input type="text" data-field="checkPath" value="${escapeHtml(app.checkPath)}" placeholder="/" />
                    </label>
                    <label>
                        <span>Check type</span>
                        <select data-field="checkType">
                            ${checkTypeOptions}
                        </select>
                    </label>
                    <label class="checkbox-field">
                        <input type="checkbox" data-field="skipCheck" ${app.skipCheck ? 'checked' : ''} />
                        <span>Skip checks</span>
                    </label>
                </div>
                <button class="danger-button" data-action="delete">Delete</button>
            </div>
        `;
    }).join('');
}

async function saveEditMode() {
    if (!isEditMode) return;

    const payload = {
        apps: editAppsDraft.map((app) => ({
            name: app.name || '',
            url: app.url || '',
            category: app.category || '',
            icon: app.icon || '',
            checkPath: app.checkPath || '',
            checkType: app.checkType || '',
            skipCheck: Boolean(app.skipCheck)
        }))
    };

    try {
        editSaveBtn.disabled = true;
        editSaveBtn.textContent = 'Saving...';
        const res = await fetch('/api/manifest', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const message = await res.text();
            throw new Error(message || 'Failed to save manifest');
        }
        await res.json();
        closeEditMode();
        await fetchApps();
    } catch (err) {
        console.error('Failed to save manifest:', err);
        alert(`Save failed: ${err.message || err}`);
    } finally {
        editSaveBtn.disabled = false;
        editSaveBtn.textContent = 'Save';
    }
}

function filterApps(query) {
    const q = query.toLowerCase().trim();
    
    if (!q) {
        // Show first 5 apps
        filteredResults = apps.slice(0, 5);
    } else {
        filteredResults = apps.filter(app => 
            app.name.toLowerCase().includes(q) || 
            app.category.toLowerCase().includes(q)
        );
    }
    
    // Reset selection to first item
    selectedIndex = filteredResults.length > 0 ? 0 : -1;
    renderSearchResults(filteredResults, !q ? 'Suggested' : (filteredResults.length ? null : 'No results found'));
}

function renderSearchResults(results, message) {
    if (message && results.length === 0) {
        searchResults.innerHTML = `<div class="no-results">${message}</div>`;
        return;
    }
    
    let html = '';
    if (message) {
        html += `<div class="search-hint" style="padding: 0.5rem 0.75rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;">${message}</div>`;
    }
    
    results.forEach((app, index) => {
        const iconId = ICON_IDS.includes(app.icon) ? app.icon : 'box';
        const icon = renderIcon(iconId);
        const selectedClass = index === selectedIndex ? ' selected' : '';
        html += `
            <div class="search-result${selectedClass}" data-index="${index}" onclick="launchApp('${app.url}')">
                <div class="search-result-icon">${icon}</div>
                <div class="search-result-info">
                    <div class="search-result-name">${escapeHtml(app.name)}</div>
                    <div class="search-result-meta">${escapeHtml(app.category)} &bull; ${app.status}</div>
                </div>
                <div class="search-result-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                </div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
}

function navigateResults(direction) {
    if (filteredResults.length === 0) return;
    
    selectedIndex += direction;
    
    // Wrap around
    if (selectedIndex < 0) {
        selectedIndex = filteredResults.length - 1;
    } else if (selectedIndex >= filteredResults.length) {
        selectedIndex = 0;
    }
    
    updateSelectedResult();
}

function updateSelectedResult() {
    const results = searchResults.querySelectorAll('.search-result');
    results.forEach((el, index) => {
        if (index === selectedIndex) {
            el.classList.add('selected');
            el.scrollIntoView({ block: 'nearest' });
        } else {
            el.classList.remove('selected');
        }
    });
}

function launchSelectedApp() {
    if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
        launchApp(filteredResults[selectedIndex].url);
    }
}

function launchApp(url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.click();
    closeCommandPalette();
}

async function fetchApps() {
    try {
        const res = await fetch('/api/apps');
        apps = await res.json();
        renderApps(apps);
        applyEditVisibility();
    } catch (err) {
        console.error('Failed to fetch apps:', err);
        appGridEl.innerHTML = '<div class="loading">Failed to load apps. Is the server running?</div>';
    }
}

async function fetchStatsHistory() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) {
            throw new Error('Failed to fetch stats history');
        }
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
            config = JSON.parse(e.data);
            updateClock();
            applyStatsVisibility();
            applyEditVisibility();
        } catch (err) {
            console.error('Failed to parse config event:', err);
        }
    });
    
    es.addEventListener('apps', (e) => {
        try {
            const newApps = JSON.parse(e.data);
            // Check if structure changed (new/removed apps) or just status update
            if (appsStructureChanged(apps, newApps)) {
                apps = newApps;
                renderApps(apps);
            } else {
                apps = newApps;
                updateAppStatuses(apps);
            }
        } catch (err) {
            console.error('Failed to parse apps event:', err);
        }
    });
    
    es.addEventListener('stats', (e) => {
        try {
            stats = JSON.parse(e.data);
            renderStats(stats);
        } catch (err) {
            console.error('Failed to parse stats event:', err);
        }
    });
    
    es.onerror = () => {
        console.log('SSE connection lost, reconnecting...');
    };
}

function renderApps(appList) {
    // Group by category
    const groups = {};
    appList.forEach(app => {
        if (!groups[app.category]) {
            groups[app.category] = [];
        }
        groups[app.category].push(app);
    });
    
    const sortedCategories = Object.keys(groups).sort();
    
    let html = '';
    sortedCategories.forEach(category => {
        html += `
            <section class="category-section">
                <div class="category-header">
                    <h2 class="category-title">${escapeHtml(category)}</h2>
                    <div class="category-line"></div>
                </div>
                <div class="app-grid">
                    ${groups[category].map(app => renderAppCard(app)).join('')}
                </div>
            </section>
        `;
    });
    
    appGridEl.innerHTML = html || '<div class="loading">No apps configured. Edit apps.yaml to add some!</div>';
}

// Check if app list structure changed (not just status)
function appsStructureChanged(oldApps, newApps) {
    if (oldApps.length !== newApps.length) return true;
    for (let i = 0; i < oldApps.length; i++) {
        if (oldApps[i].name !== newApps[i].name ||
            oldApps[i].url !== newApps[i].url ||
            oldApps[i].category !== newApps[i].category ||
            oldApps[i].icon !== newApps[i].icon) {
            return true;
        }
    }
    return false;
}

// Update only status indicators without re-rendering
function updateAppStatuses(appList) {
    appList.forEach(app => {
        const appId = btoa(app.name + '|' + app.url).replace(/[^a-zA-Z0-9]/g, '');
        const card = appGridEl.querySelector(`[data-app-id="${appId}"]`);
        if (!card) return;
        
        const statusDot = card.querySelector('.status-dot');
        const statusText = card.querySelector('.status-text');
        
        if (statusDot) {
            statusDot.className = 'status-dot';
            if (app.status === 'UP') statusDot.classList.add('up');
            else if (app.status === 'DOWN') statusDot.classList.add('down');
            else if (app.status === 'SKIPPED') statusDot.classList.add('skipped');
        }
        
        if (statusText) {
            statusText.textContent = app.status;
        }
    });
}

function renderAppCard(app) {
    const iconId = ICON_IDS.includes(app.icon) ? app.icon : 'box';
    const icon = renderIcon(iconId);
    const statusClass = app.status === 'UP' ? 'up' : app.status === 'DOWN' ? 'down' : app.status === 'SKIPPED' ? 'skipped' : '';
    const appId = btoa(app.name + '|' + app.url).replace(/[^a-zA-Z0-9]/g, '');
    
    return `
        <a class="app-card" data-app-id="${appId}" href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer">
            <div class="app-card-icon">${icon}</div>
            <div class="app-card-name">${escapeHtml(app.name)}</div>
            <div class="app-card-status">
                <div class="status-dot ${statusClass}"></div>
                <span class="status-text">${app.status}</span>
            </div>
        </a>
    `;
}

function renderIcon(name) {
    return `
        <svg class="app-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
            <use href="icons/${name}.svg#icon"></use>
        </svg>
    `;
}

function renderStats(s) {
    const now = Date.now();
    pushHistory(history.host.cpu, now, s.cpu);
    pushHistory(history.host.ram, now, s.ram);
    pushHistory(history.host.temp, now, s.temp);
    pushHistory(history.host.netTx, now, s.netTx);
    pushHistory(history.host.netRx, now, s.netRx);
    pruneHistory(history.host.cpu, now);
    pruneHistory(history.host.ram, now);
    pruneHistory(history.host.temp, now);
    pruneHistory(history.host.netTx, now);
    pruneHistory(history.host.netRx, now);
    renderHostSparklines();
    if (config.showCPU) {
        document.getElementById('cpu-value').textContent = s.cpu !== null ? s.cpu.toFixed(0) : '--';
    }
    if (config.showRAM) {
        document.getElementById('ram-value').textContent = s.ram !== null ? s.ram.toFixed(0) : '--';
    }
    if (config.showTemp) {
        document.getElementById('temp-value').textContent = s.temp !== null ? s.temp.toFixed(0) : '--';
    }
    updateHostTrendValues(s);
}

function hydrateHistory(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
        return;
    }

    history.host.cpu = [];
    history.host.ram = [];
    history.host.temp = [];
    history.host.netTx = [];
    history.host.netRx = [];

    samples.forEach((sample) => {
        const timestamp = Date.parse(sample.Timestamp);
        if (!Number.isFinite(timestamp)) return;
        const s = sample.Stats || {};
        pushHistory(history.host.cpu, timestamp, s.cpu);
        pushHistory(history.host.ram, timestamp, s.ram);
        pushHistory(history.host.temp, timestamp, s.temp);
        pushHistory(history.host.netTx, timestamp, s.netTx);
        pushHistory(history.host.netRx, timestamp, s.netRx);
    });

    const latest = samples[samples.length - 1];
    if (latest && latest.Stats) {
        stats = latest.Stats;
    }

    const now = Date.now();
    pruneHistory(history.host.cpu, now);
    pruneHistory(history.host.ram, now);
    pruneHistory(history.host.temp, now);
    pruneHistory(history.host.netTx, now);
    pruneHistory(history.host.netRx, now);
    renderHostSparklines();
    updateHostTrendValues(stats);
}

function applyStatsVisibility() {
    document.getElementById('stat-cpu').style.display = config.showCPU ? '' : 'none';
    document.getElementById('stat-ram').style.display = config.showRAM ? '' : 'none';
    document.getElementById('stat-temp').style.display = config.showTemp ? '' : 'none';
    const hostTxCard = document.getElementById('host-tx-card');
    const hostRxCard = document.getElementById('host-rx-card');
    if (hostTxCard) hostTxCard.style.display = config.showNetTX ? '' : 'none';
    if (hostRxCard) hostRxCard.style.display = config.showNetRX ? '' : 'none';
    if (statsDetailsEl) {
        const showDetails = config.showNetTX || config.showNetRX;
        statsDetailsEl.style.display = showDetails ? '' : 'none';
    }
}

function applyEditVisibility() {
    if (!editBtn) return;
    if (config.allowEdit === false) {
        editBtn.style.display = 'none';
        closeEditMode();
    } else {
        editBtn.style.display = '';
    }
}

function formatNetValue(value) {
    if (value === null || value === undefined) return null;
    if (value >= 1024) {
        return { value: (value / 1024).toFixed(1), unit: 'MB/s' };
    }
    return { value: value.toFixed(1), unit: 'KB/s' };
}

function initSparklineCleanup() {
    setInterval(() => {
        const now = Date.now();
        pruneHistory(history.host.cpu, now);
        pruneHistory(history.host.ram, now);
        pruneHistory(history.host.temp, now);
        pruneHistory(history.host.netTx, now);
        pruneHistory(history.host.netRx, now);
    }, 10000);
}

function pushHistory(list, timestamp, value) {
    list.push({ t: timestamp, v: value });
}

function pruneHistory(list, now) {
    const cutoff = now - HISTORY_WINDOW_MS;
    while (list.length && list[0].t < cutoff) {
        list.shift();
    }
}

function renderHostSparklines() {
    const cpuEl = document.getElementById('host-cpu-spark');
    const ramEl = document.getElementById('host-ram-spark');
    const tempEl = document.getElementById('host-temp-spark');
    const txEl = document.getElementById('host-tx-spark');
    const rxEl = document.getElementById('host-rx-spark');
    if (cpuEl) cpuEl.innerHTML = renderSparkline(history.host.cpu, { min: 0, max: 100 }) || '';
    if (ramEl) ramEl.innerHTML = renderSparkline(history.host.ram, { min: 0, max: 100 }) || '';
    if (tempEl) tempEl.innerHTML = renderSparkline(history.host.temp) || '';
    if (txEl) txEl.innerHTML = renderSparkline(history.host.netTx) || '';
    if (rxEl) rxEl.innerHTML = renderSparkline(history.host.netRx) || '';
}

function updateHostTrendValues(s) {
    const cpuEl = document.getElementById('host-cpu-value');
    const ramEl = document.getElementById('host-ram-value');
    const tempEl = document.getElementById('host-temp-value');
    const txEl = document.getElementById('host-tx-value');
    const rxEl = document.getElementById('host-rx-value');
    if (cpuEl) cpuEl.textContent = s.cpu !== null && s.cpu !== undefined ? `${s.cpu.toFixed(0)}%` : '--';
    if (ramEl) ramEl.textContent = s.ram !== null && s.ram !== undefined ? `${s.ram.toFixed(0)}%` : '--';
    if (tempEl) tempEl.textContent = s.temp !== null && s.temp !== undefined ? `${s.temp.toFixed(0)}°C` : '--';
    if (txEl) {
        const formatted = s.netTx !== null && s.netTx !== undefined ? formatNetValue(s.netTx) : null;
        txEl.textContent = formatted ? `${formatted.value}${formatted.unit}` : '--';
    }
    if (rxEl) {
        const formatted = s.netRx !== null && s.netRx !== undefined ? formatNetValue(s.netRx) : null;
        rxEl.textContent = formatted ? `${formatted.value}${formatted.unit}` : '--';
    }
}

function renderSparkline(series, options = {}) {
    const points = series.filter(point => point.v !== null && point.v !== undefined);
    if (points.length < 2) return '';
    const minVal = options.min !== undefined ? options.min : Math.min(...points.map(p => p.v));
    const maxVal = options.max !== undefined ? options.max : Math.max(...points.map(p => p.v));
    const span = maxVal - minVal || 1;
    const width = 120;
    const height = 28;
    const strokeWidth = options.strokeWidth || 2;
    const step = width / (points.length - 1);
    const path = points.map((point, index) => {
        const x = index * step;
        const y = height - ((point.v - minVal) / span) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
