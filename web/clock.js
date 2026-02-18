import { configStore } from './state.js';

export function createClock() {
    let clockEl;
    let dateEl;
    let timeFormatter;
    let dateFormatter;
    let lastTimeFormat24h;
    let intervalId;

    const unsubs = [];

    function buildFormatters() {
        const config = configStore.get();
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

    function update() {
        const now = new Date();
        if (!timeFormatter || lastTimeFormat24h !== configStore.get().timeFormat24h) {
            buildFormatters();
        }
        clockEl.textContent = timeFormatter.format(now);
        dateEl.textContent = dateFormatter.format(now);
    }

    return {
        mount(els) {
            clockEl = els.clockEl;
            dateEl = els.dateEl;

            buildFormatters();
            update();
            intervalId = setInterval(update, 1000);

            unsubs.push(configStore.subscribe(() => {
                buildFormatters();
                update();
            }));
        },

        destroy() {
            clearInterval(intervalId);
            unsubs.forEach((unsub) => unsub());
            unsubs.length = 0;
        }
    };
}
