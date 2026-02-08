// HomeDash - Frontend JavaScript

const ICONS = {
    // Media
    film: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>',
    tv: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    music: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    
    // Smart Home
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    workflow: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>',
    
    // Network
    shield: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>',
    network: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>',
    
    // System
    server: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
    database: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    
    // Development
    code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    git: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/></svg>',
    terminal: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
    
    // Default
    box: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
};

// State
let apps = [];
let stats = { cpu: null, ram: null, temp: null, netTx: null, netRx: null };
let agentStats = [];
let config = { timeFormat24h: false, showCPU: true, showRAM: true, showTemp: true, showNetTX: true, showNetRX: true };
let selectedIndex = -1;
let filteredResults = [];
const HISTORY_WINDOW_MS = 5 * 60 * 1000;
const history = {
    host: { cpu: [], ram: [], temp: [], netTx: [], netRx: [] },
    agents: new Map()
};


let clockEl, dateEl, appGridEl, searchBtn, themeBtn, commandPalette, searchInput, searchResults, statsDetailsEl;

document.addEventListener('DOMContentLoaded', () => {
    clockEl = document.getElementById('clock');
    dateEl = document.getElementById('date');
    appGridEl = document.getElementById('appGrid');
    searchBtn = document.getElementById('searchBtn');
    themeBtn = document.getElementById('themeBtn');
    commandPalette = document.getElementById('commandPalette');
    searchInput = document.getElementById('searchInput');
    searchResults = document.getElementById('searchResults');
    statsDetailsEl = document.getElementById('statsDetails');

    initClock();
    initTheme();
    initCommandPalette();
    initKeyboardShortcuts();
    initStatsDetails();
    initSparklineCleanup();
    
    fetchApps();
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
        
        if (e.key === 'Escape') {
            closeCommandPalette();
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
        const icon = ICONS[app.icon] || ICONS.box;
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
    } catch (err) {
        console.error('Failed to fetch apps:', err);
        appGridEl.innerHTML = '<div class="loading">Failed to load apps. Is the server running?</div>';
    }
}

function connectSSE() {
    const es = new EventSource('/api/events');
    
    es.addEventListener('config', (e) => {
        try {
            config = JSON.parse(e.data);
            updateClock();
            applyStatsVisibility();
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
    
    es.addEventListener('agentstats', (e) => {
        try {
            agentStats = JSON.parse(e.data);
            renderAgentStats(agentStats);
        } catch (err) {
            console.error('Failed to parse agentstats event:', err);
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
    const icon = ICONS[app.icon] || ICONS.box;
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

function applyStatsVisibility() {
    document.getElementById('stat-cpu').style.display = config.showCPU ? '' : 'none';
    document.getElementById('stat-ram').style.display = config.showRAM ? '' : 'none';
    document.getElementById('stat-temp').style.display = config.showTemp ? '' : 'none';
    const hostTxCard = document.getElementById('host-tx-card');
    const hostRxCard = document.getElementById('host-rx-card');
    if (hostTxCard) hostTxCard.style.display = config.showNetTX ? '' : 'none';
    if (hostRxCard) hostRxCard.style.display = config.showNetRX ? '' : 'none';
    if (statsDetailsEl) {
        const showDetails = (config.showNetTX || config.showNetRX) || (agentStats && agentStats.length > 0);
        statsDetailsEl.style.display = showDetails ? '' : 'none';
    }
}

function renderAgentStats(agents) {
    const agentStatsEl = document.getElementById('agentStats');
    const detailsAgentsEl = document.getElementById('detailsAgents');
    
    if (!agents || agents.length === 0) {
        agentStatsEl.style.display = 'none';
        if (detailsAgentsEl) {
            detailsAgentsEl.style.display = 'none';
        }
        if (statsDetailsEl && !(config.showNetTX || config.showNetRX)) {
            statsDetailsEl.style.display = 'none';
        }
        return;
    }
    
    agentStatsEl.style.display = 'block';
    
    const now = Date.now();
    let html = '<div class="agent-stats-grid">';
    
    agents.forEach(agent => {
        const hasError = agent.error && agent.error !== '';
        const statusClass = hasError ? 'error' : 'ok';
        
        // Format stat values with null handling
        const cpuValue = agent.stats.cpu !== null && agent.stats.cpu !== undefined ? agent.stats.cpu.toFixed(0) : '--';
        const ramValue = agent.stats.ram !== null && agent.stats.ram !== undefined ? agent.stats.ram.toFixed(0) : '--';
        const tempValue = agent.stats.temp !== null && agent.stats.temp !== undefined ? agent.stats.temp.toFixed(0) : '--';
        const netTxValue = agent.stats.netTx !== null && agent.stats.netTx !== undefined ? formatNetValue(agent.stats.netTx) : null;
        const netRxValue = agent.stats.netRx !== null && agent.stats.netRx !== undefined ? formatNetValue(agent.stats.netRx) : null;
        const agentHistory = getAgentHistory(agent);
        pushHistory(agentHistory.cpu, now, agent.stats.cpu);
        pushHistory(agentHistory.ram, now, agent.stats.ram);
        pushHistory(agentHistory.temp, now, agent.stats.temp);
        pushHistory(agentHistory.netTx, now, agent.stats.netTx);
        pushHistory(agentHistory.netRx, now, agent.stats.netRx);
        pruneHistory(agentHistory.cpu, now);
        pruneHistory(agentHistory.ram, now);
        pruneHistory(agentHistory.temp, now);
        pruneHistory(agentHistory.netTx, now);
        pruneHistory(agentHistory.netRx, now);
        const cpuSpark = renderSparkline(agentHistory.cpu, { min: 0, max: 100 });
        const ramSpark = renderSparkline(agentHistory.ram, { min: 0, max: 100 });
        const tempSpark = renderSparkline(agentHistory.temp);
        const txSpark = renderSparkline(agentHistory.netTx);
        const rxSpark = renderSparkline(agentHistory.netRx);
        
        html += `
            <div class="agent-stat-card ${statusClass}">
                <div class="agent-name">${escapeHtml(agent.name)}</div>
                ${hasError ? 
                    `<div class="agent-error">${escapeHtml(agent.error)}</div>` :
                    `<div class="agent-stats-values">
                        <div class="agent-stat-item">
                            <span class="agent-stat-label">CPU</span>
                            <span class="agent-stat-value">${cpuValue}<span class="stat-unit">%</span></span>
                            ${cpuSpark ? `<div class="sparkline small">${cpuSpark}</div>` : ''}
                        </div>
                        <div class="agent-stat-item">
                            <span class="agent-stat-label">RAM</span>
                            <span class="agent-stat-value">${ramValue}<span class="stat-unit">%</span></span>
                            ${ramSpark ? `<div class="sparkline small">${ramSpark}</div>` : ''}
                        </div>
                        <div class="agent-stat-item">
                            <span class="agent-stat-label">Temp</span>
                            <span class="agent-stat-value">${tempValue}<span class="stat-unit">°C</span></span>
                            ${tempSpark ? `<div class="sparkline small">${tempSpark}</div>` : ''}
                        </div>
                        ${netTxValue ? `
                        <div class="agent-stat-item">
                            <span class="agent-stat-label">TX</span>
                            <span class="agent-stat-value">${netTxValue.value}<span class="stat-unit">${netTxValue.unit}</span></span>
                            ${txSpark ? `<div class="sparkline small">${txSpark}</div>` : ''}
                        </div>` : ''}
                        ${netRxValue ? `
                        <div class="agent-stat-item">
                            <span class="agent-stat-label">RX</span>
                            <span class="agent-stat-value">${netRxValue.value}<span class="stat-unit">${netRxValue.unit}</span></span>
                            ${rxSpark ? `<div class="sparkline small">${rxSpark}</div>` : ''}
                        </div>` : ''}
                    </div>`
                }
            </div>
        `;
    });
    
    html += '</div>';
    agentStatsEl.innerHTML = html;
    if (detailsAgentsEl) {
        detailsAgentsEl.style.display = '';
    }
    if (statsDetailsEl) {
        statsDetailsEl.style.display = '';
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
        history.agents.forEach((agentHistory, key) => {
            pruneHistory(agentHistory.cpu, now);
            pruneHistory(agentHistory.ram, now);
            pruneHistory(agentHistory.temp, now);
            pruneHistory(agentHistory.netTx, now);
            pruneHistory(agentHistory.netRx, now);
        });
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

function getAgentHistory(agent) {
    const key = agent.name || agent.id || agent.host || JSON.stringify(agent);
    if (!history.agents.has(key)) {
        history.agents.set(key, { cpu: [], ram: [], temp: [], netTx: [], netRx: [] });
    }
    return history.agents.get(key);
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
    const step = width / (points.length - 1);
    const path = points.map((point, index) => {
        const x = index * step;
        const y = height - ((point.v - minVal) / span) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
