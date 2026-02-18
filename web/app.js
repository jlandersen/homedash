import { appsStore, configStore } from './state.js';
import { createClock } from './clock.js';
import { createStats } from './stats.js';
import { createEditMode } from './editor.js';
import { createCommandPalette } from './command-palette.js';
import { createAppGrid } from './app-grid.js';

document.addEventListener('DOMContentLoaded', () => {
    const clock = createClock();
    clock.mount({
        clockEl: document.getElementById('clock'),
        dateEl: document.getElementById('date')
    });

    const stats = createStats();
    stats.mount({
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
        statsDetailsEl: document.getElementById('statsDetails')
    });

    const appGrid = createAppGrid();
    appGrid.mount({ gridEl: document.getElementById('appGrid') });

    const commandPalette = createCommandPalette();
    commandPalette.mount({
        searchBtn: document.getElementById('searchBtn'),
        commandPalette: document.getElementById('commandPalette'),
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults')
    });

    const editMode = createEditMode();
    editMode.mount({
        editModal: document.getElementById('editModal'),
        editListEl: document.getElementById('editList'),
        editSaveBtn: document.getElementById('editSaveBtn'),
        editCancelBtn: document.getElementById('editCancelBtn'),
        editAddBtn: document.getElementById('editAddBtn'),
        editCategoryOrderListEl: document.getElementById('editCategoryOrderList'),
        editCategoryOrderAddBtn: document.getElementById('editCategoryOrderAddBtn'),
        editCategoryOrderInput: document.getElementById('editCategoryOrderInput'),
        editBtn: document.getElementById('editBtn')
    });

    initTheme(document.getElementById('themeBtn'));
    initView(document.getElementById('viewBtn'));

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            commandPalette.open();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault();
            editMode.open();
        }
        if (e.key === 'Escape') {
            commandPalette.close();
            editMode.close();
        }
    });

    fetchApps(appGrid);
    fetchStatsHistory(stats);
    connectSSE(stats);
});

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

async function fetchApps(appGrid) {
    try {
        const res = await fetch('/api/apps');
        appsStore.set(await res.json());
    } catch (err) {
        console.error('Failed to fetch apps:', err);
        appGrid.setError('Failed to load apps. Is the server running?');
    }
}

async function fetchStatsHistory(stats) {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch stats history');
        stats.hydrateHistory(await res.json());
    } catch (err) {
        console.error('Failed to fetch stats history:', err);
    }
}

function connectSSE(stats) {
    const es = new EventSource('/api/events');

    es.addEventListener('config', (e) => {
        try {
            configStore.set(JSON.parse(e.data));
        } catch (err) {
            console.error('Failed to parse config event:', err);
        }
    });

    es.addEventListener('apps', (e) => {
        try {
            appsStore.set(JSON.parse(e.data));
        } catch (err) {
            console.error('Failed to parse apps event:', err);
        }
    });

    es.addEventListener('stats', (e) => {
        try {
            stats.render(JSON.parse(e.data));
        } catch (err) {
            console.error('Failed to parse stats event:', err);
        }
    });

    es.onerror = () => {
        console.log('SSE connection lost, reconnecting...');
    };
}
