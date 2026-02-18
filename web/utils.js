export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderIcon(name) {
    return `<span class="app-icon" aria-hidden="true" style="--icon-url: url('icons/${name}.svg');"></span>`;
}
