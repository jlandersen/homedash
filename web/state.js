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

export let apps = [];
export let stats = { cpu: null, ram: null, temp: null, netTx: null, netRx: null };
export let config = { timeFormat24h: false, showCPU: true, showRAM: true, showTemp: true, showNetTX: true, showNetRX: true };

export const history = {
    host: { cpu: [], ram: [], temp: [], netTx: [], netRx: [] }
};

export function setApps(value) { apps = value; }
export function setStats(value) { stats = value; }
export function setConfig(value) { config = value; }
