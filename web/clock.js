import { config } from './state.js';

let clockEl;
let dateEl;
let timeFormatter;
let dateFormatter;
let lastTimeFormat24h;

export function initClock(clockElement, dateElement) {
    clockEl = clockElement;
    dateEl = dateElement;
    buildClockFormatters();
    updateClock();
    setInterval(updateClock, 1000);
}

export function buildClockFormatters() {
    timeFormatter = new Intl.DateTimeFormat([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !config.timeFormat24h
    });
    dateFormatter = new Intl.DateTimeFormat([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    lastTimeFormat24h = config.timeFormat24h;
}

export function updateClock() {
    const now = new Date();
    if (!timeFormatter || lastTimeFormat24h !== config.timeFormat24h) {
        buildClockFormatters();
    }
    clockEl.textContent = timeFormatter.format(now);
    dateEl.textContent = dateFormatter.format(now);
}
