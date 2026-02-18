import { createStore, derive } from './store.js';

export const ICON_IDS = [
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

export const HISTORY_WINDOW_MS = 5 * 60 * 1000;
export const NOTES_DELAY_MS = 500;

export const appsStore = createStore([]);
export const statsStore = createStore({ cpu: null, ram: null, temp: null, netTx: null, netRx: null });
export const configStore = createStore({ timeFormat24h: false, showCPU: true, showRAM: true, showTemp: true, showNetTX: true, showNetRX: true });

export const visibleStatsStore = derive([configStore], ([cfg]) => ({
    cpu: cfg.showCPU,
    ram: cfg.showRAM,
    temp: cfg.showTemp,
    netTX: cfg.showNetTX,
    netRX: cfg.showNetRX
}));

export const history = {
    host: { cpu: [], ram: [], temp: [], netTx: [], netRx: [] }
};
