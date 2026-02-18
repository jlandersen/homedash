import { statsStore, visibleStatsStore, history, HISTORY_WINDOW_MS } from './state.js';

export function createStats() {
    let cpuValueEl;
    let ramValueEl;
    let tempValueEl;
    let hostCpuSparkEl;
    let hostRamSparkEl;
    let hostTempSparkEl;
    let hostTxSparkEl;
    let hostRxSparkEl;
    let hostCpuValueEl;
    let hostRamValueEl;
    let hostTempValueEl;
    let hostTxValueEl;
    let hostRxValueEl;
    let statCpuEl;
    let statRamEl;
    let statTempEl;
    let hostTxCardEl;
    let hostRxCardEl;
    let statsDetailsEl;

    let pruneIntervalId;
    const unsubs = [];

    function applyVisibility() {
        const visible = visibleStatsStore.get();
        if (statCpuEl) statCpuEl.style.display = visible.cpu ? '' : 'none';
        if (statRamEl) statRamEl.style.display = visible.ram ? '' : 'none';
        if (statTempEl) statTempEl.style.display = visible.temp ? '' : 'none';
        if (hostTxCardEl) hostTxCardEl.style.display = visible.netTX ? '' : 'none';
        if (hostRxCardEl) hostRxCardEl.style.display = visible.netRX ? '' : 'none';
        if (statsDetailsEl) {
            statsDetailsEl.style.display = (visible.netTX || visible.netRX) ? '' : 'none';
        }
    }

    function renderSparklines() {
        if (hostCpuSparkEl) hostCpuSparkEl.innerHTML = renderSparkline(history.host.cpu, { min: 0, max: 100 }) || '';
        if (hostRamSparkEl) hostRamSparkEl.innerHTML = renderSparkline(history.host.ram, { min: 0, max: 100 }) || '';
        if (hostTempSparkEl) hostTempSparkEl.innerHTML = renderSparkline(history.host.temp) || '';
        if (hostTxSparkEl) hostTxSparkEl.innerHTML = renderSparkline(history.host.netTx) || '';
        if (hostRxSparkEl) hostRxSparkEl.innerHTML = renderSparkline(history.host.netRx) || '';
    }

    function updateTrendValues(s) {
        if (hostCpuValueEl) hostCpuValueEl.textContent = s.cpu !== null && s.cpu !== undefined ? `${s.cpu.toFixed(0)}%` : '--';
        if (hostRamValueEl) hostRamValueEl.textContent = s.ram !== null && s.ram !== undefined ? `${s.ram.toFixed(0)}%` : '--';
        if (hostTempValueEl) hostTempValueEl.textContent = s.temp !== null && s.temp !== undefined ? `${s.temp.toFixed(0)}°C` : '--';
        if (hostTxValueEl) {
            const formatted = s.netTx !== null && s.netTx !== undefined ? formatNetValue(s.netTx) : null;
            hostTxValueEl.textContent = formatted ? `${formatted.value}${formatted.unit}` : '--';
        }
        if (hostRxValueEl) {
            const formatted = s.netRx !== null && s.netRx !== undefined ? formatNetValue(s.netRx) : null;
            hostRxValueEl.textContent = formatted ? `${formatted.value}${formatted.unit}` : '--';
        }
    }

    function initDetailsPanel() {
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

    return {
        mount(els) {
            cpuValueEl = els.cpuValueEl;
            ramValueEl = els.ramValueEl;
            tempValueEl = els.tempValueEl;
            hostCpuSparkEl = els.hostCpuSparkEl;
            hostRamSparkEl = els.hostRamSparkEl;
            hostTempSparkEl = els.hostTempSparkEl;
            hostTxSparkEl = els.hostTxSparkEl;
            hostRxSparkEl = els.hostRxSparkEl;
            hostCpuValueEl = els.hostCpuValueEl;
            hostRamValueEl = els.hostRamValueEl;
            hostTempValueEl = els.hostTempValueEl;
            hostTxValueEl = els.hostTxValueEl;
            hostRxValueEl = els.hostRxValueEl;
            statCpuEl = els.statCpuEl;
            statRamEl = els.statRamEl;
            statTempEl = els.statTempEl;
            hostTxCardEl = els.hostTxCardEl;
            hostRxCardEl = els.hostRxCardEl;
            statsDetailsEl = els.statsDetailsEl;

            initDetailsPanel();
            applyVisibility();

            unsubs.push(visibleStatsStore.subscribe(() => {
                applyVisibility();
            }));

            pruneIntervalId = setInterval(() => {
                pruneAllHistory(Date.now());
            }, 10000);
        },

        render(s) {
            statsStore.set(s);
            const now = Date.now();
            pushHistory(history.host.cpu, now, s.cpu);
            pushHistory(history.host.ram, now, s.ram);
            pushHistory(history.host.temp, now, s.temp);
            pushHistory(history.host.netTx, now, s.netTx);
            pushHistory(history.host.netRx, now, s.netRx);
            pruneAllHistory(now);
            renderSparklines();
            const visible = visibleStatsStore.get();
            if (visible.cpu && cpuValueEl) cpuValueEl.textContent = s.cpu !== null ? s.cpu.toFixed(0) : '--';
            if (visible.ram && ramValueEl) ramValueEl.textContent = s.ram !== null ? s.ram.toFixed(0) : '--';
            if (visible.temp && tempValueEl) tempValueEl.textContent = s.temp !== null ? s.temp.toFixed(0) : '--';
            updateTrendValues(s);
        },

        hydrateHistory(samples) {
            if (!Array.isArray(samples) || samples.length === 0) return;

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
                statsStore.set(latest.Stats);
            }

            const now = Date.now();
            pruneAllHistory(now);
            renderSparklines();
            updateTrendValues(statsStore.get());
        },

        destroy() {
            clearInterval(pruneIntervalId);
            unsubs.forEach((unsub) => unsub());
            unsubs.length = 0;
        }
    };
}

function pushHistory(list, timestamp, value) {
    list.push({ t: timestamp, v: value });
}

function pruneHistory(list, now) {
    const cutoff = now - HISTORY_WINDOW_MS;
    let firstValidIndex = 0;
    const listLength = list.length;
    while (firstValidIndex < listLength && list[firstValidIndex].t < cutoff) {
        firstValidIndex += 1;
    }
    if (firstValidIndex > 0) {
        list.splice(0, firstValidIndex);
    }
}

function pruneAllHistory(now) {
    pruneHistory(history.host.cpu, now);
    pruneHistory(history.host.ram, now);
    pruneHistory(history.host.temp, now);
    pruneHistory(history.host.netTx, now);
    pruneHistory(history.host.netRx, now);
}

function formatNetValue(value) {
    if (value === null || value === undefined) return null;
    if (value >= 1024) {
        return { value: (value / 1024).toFixed(1), unit: 'MB/s' };
    }
    return { value: value.toFixed(1), unit: 'KB/s' };
}

function renderSparkline(series, options = {}) {
    const values = [];
    let minVal = options.min;
    let maxVal = options.max;

    for (let i = 0; i < series.length; i++) {
        const value = series[i].v;
        if (value === null || value === undefined) continue;
        values.push(value);
        if (minVal === undefined || value < minVal) minVal = value;
        if (maxVal === undefined || value > maxVal) maxVal = value;
    }

    if (values.length < 2) return '';

    const span = maxVal - minVal || 1;
    const width = 120;
    const height = 28;
    const strokeWidth = options.strokeWidth || 2;
    const step = width / (values.length - 1);
    let path = '';

    for (let index = 0; index < values.length; index++) {
        const value = values[index];
        const x = index * step;
        const y = height - ((value - minVal) / span) * height;
        path += `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    }

    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
