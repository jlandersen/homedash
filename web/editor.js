import { ICON_IDS, configStore } from './state.js';
import { escapeHtml, renderIcon } from './utils.js';

let editModal;
let editListEl;
let editSaveBtn;
let editCancelBtn;
let editAddBtn;
let editCategoryOrderListEl;
let editCategoryOrderAddBtn;
let editCategoryOrderInput;
let editBtn;

let isEditMode = false;
let editAppsDraft = [];
let editCategoryOrderDraft = [];

export function initEditMode(els) {
    editModal = els.editModal;
    editListEl = els.editListEl;
    editSaveBtn = els.editSaveBtn;
    editCancelBtn = els.editCancelBtn;
    editAddBtn = els.editAddBtn;
    editCategoryOrderListEl = els.editCategoryOrderListEl;
    editCategoryOrderAddBtn = els.editCategoryOrderAddBtn;
    editCategoryOrderInput = els.editCategoryOrderInput;
    editBtn = els.editBtn;

    if (!editBtn || !editModal) return;
    editBtn.addEventListener('click', openEditMode);
    editCancelBtn.addEventListener('click', closeEditMode);
    editSaveBtn.addEventListener('click', saveEditMode);
    editAddBtn.addEventListener('click', addEditRow);

    if (editCategoryOrderAddBtn && editCategoryOrderInput) {
        editCategoryOrderAddBtn.addEventListener('click', addCategoryOrderEntry);
        editCategoryOrderInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            addCategoryOrderEntry();
        });
    }

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditMode();
    });

    editListEl.addEventListener('input', (e) => {
        const row = e.target.closest('[data-edit-index]');
        if (!row) return;
        const index = Number(row.dataset.editIndex);
        const key = e.target.dataset.field;
        if (!key || Number.isNaN(index)) return;
        if (key === 'skipCheck') return;
        if (key === 'category' && e.target.dataset.autoCleared === 'true') {
            delete e.target.dataset.prevValue;
            delete e.target.dataset.autoCleared;
        }
        editAppsDraft[index][key] = e.target.value;
        row.dataset.dirty = 'true';
    });

    editListEl.addEventListener('focusin', (e) => {
        const input = e.target.closest('input[data-field="category"]');
        if (!input) return;
        if (input.value && input.dataset.autoCleared !== 'true') {
            input.dataset.prevValue = input.value;
            input.dataset.autoCleared = 'true';
            input.value = '';
        }
    });

    editListEl.addEventListener('focusout', (e) => {
        const input = e.target.closest('input[data-field="category"]');
        if (!input || input.dataset.autoCleared !== 'true') return;
        if (input.value === '' && input.dataset.prevValue !== undefined) {
            input.value = input.dataset.prevValue;
            const row = input.closest('[data-edit-index]');
            const index = row ? Number(row.dataset.editIndex) : NaN;
            if (!Number.isNaN(index)) {
                editAppsDraft[index].category = input.value;
            }
        }
        delete input.dataset.prevValue;
        delete input.dataset.autoCleared;
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
        const option = e.target.closest('.icon-option');
        if (option) {
            const row = option.closest('[data-edit-index]');
            if (!row) return;
            const index = Number(row.dataset.editIndex);
            if (Number.isNaN(index)) return;
            const value = option.dataset.value || '';
            editAppsDraft[index].icon = value;
            row.dataset.dirty = 'true';
            const select = option.closest('.icon-select');
            if (select) {
                const button = select.querySelector('.icon-select-button');
                const labelEl = button ? button.querySelector('.icon-label') : null;
                const previewEl = button ? button.querySelector('.icon-preview') : null;
                if (labelEl) labelEl.textContent = option.dataset.label || '';
                if (previewEl) previewEl.innerHTML = renderIcon(option.dataset.icon || 'box');
                select.classList.remove('open');
            }
            return;
        }

        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const row = btn.closest('[data-edit-index]');
        if (!row) return;
        const index = Number(row.dataset.editIndex);
        if (Number.isNaN(index)) return;
        const action = btn.dataset.action;
        if (action === 'delete') {
            editAppsDraft.splice(index, 1);
            renderEditList();
        }
        if (action === 'icon-toggle') {
            const select = btn.closest('.icon-select');
            if (!select) return;
            const shouldOpen = !select.classList.contains('open');
            editListEl.querySelectorAll('.icon-select.open').forEach((openSelect) => {
                if (openSelect !== select) openSelect.classList.remove('open');
            });
            if (shouldOpen) {
                select.classList.add('open');
            } else {
                select.classList.remove('open');
            }
        }
    });

    if (editCategoryOrderListEl) {
        editCategoryOrderListEl.addEventListener('input', (e) => {
            const input = e.target.closest('input[data-role="category-order-name"]');
            if (!input) return;
            const row = input.closest('[data-category-order-index]');
            if (!row) return;
            const index = Number(row.dataset.categoryOrderIndex);
            if (Number.isNaN(index)) return;
            editCategoryOrderDraft[index] = input.value;
        });

        editCategoryOrderListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const row = btn.closest('[data-category-order-index]');
            if (!row) return;
            const index = Number(row.dataset.categoryOrderIndex);
            if (Number.isNaN(index)) return;

            if (btn.dataset.action === 'category-order-delete') {
                editCategoryOrderDraft.splice(index, 1);
                renderCategoryOrderList();
                return;
            }
            if (btn.dataset.action === 'category-order-up' && index > 0) {
                const temp = editCategoryOrderDraft[index - 1];
                editCategoryOrderDraft[index - 1] = editCategoryOrderDraft[index];
                editCategoryOrderDraft[index] = temp;
                renderCategoryOrderList();
                return;
            }
            if (btn.dataset.action === 'category-order-down' && index < editCategoryOrderDraft.length - 1) {
                const temp = editCategoryOrderDraft[index + 1];
                editCategoryOrderDraft[index + 1] = editCategoryOrderDraft[index];
                editCategoryOrderDraft[index] = temp;
                renderCategoryOrderList();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!isEditMode || !editListEl) return;
        editListEl.querySelectorAll('.icon-select.open').forEach((openSelect) => {
            if (!openSelect.contains(e.target)) openSelect.classList.remove('open');
        });
    });
}


export async function openEditMode() {
    if (!editModal) return;
    if (configStore.get().allowEdit === false) return;
    try {
        const res = await fetch('/api/manifest');
        if (!res.ok) throw new Error('Failed to load manifest');
        const manifestData = await res.json();
        const appList = Array.isArray(manifestData.apps) ? manifestData.apps : [];
        const categoryOrder = Array.isArray(manifestData.categoryOrder) ? manifestData.categoryOrder : [];
        editAppsDraft = appList.map((app) => ({
            name: app.name || '',
            url: app.url || '',
            category: app.category || '',
            icon: app.icon || '',
            notes: app.notes || '',
            checkPath: app.checkPath || '',
            checkType: app.checkType || '',
            skipCheck: Boolean(app.skipCheck)
        }));
        editCategoryOrderDraft = categoryOrder.map((category) => String(category || ''));
        renderEditList();
        renderCategoryOrderList();
        editModal.classList.add('open');
        isEditMode = true;
    } catch (err) {
        console.error('Failed to open edit mode:', err);
        alert('Failed to load apps for editing. Check server logs.');
    }
}

export function closeEditMode() {
    if (!editModal || !isEditMode) return;
    editModal.classList.remove('open');
    isEditMode = false;
    editAppsDraft = [];
    editCategoryOrderDraft = [];
    if (editCategoryOrderInput) editCategoryOrderInput.value = '';
}

export function applyEditVisibility(cfg) {
    if (!editBtn) return;
    if (cfg && cfg.allowEdit === false) {
        editBtn.style.display = 'none';
        closeEditMode();
    } else {
        editBtn.style.display = '';
    }
}

function addEditRow() {
    editAppsDraft.push({
        name: '',
        url: '',
        category: '',
        icon: '',
        notes: '',
        checkPath: '',
        checkType: '',
        skipCheck: false
    });
    renderEditList();
    const rows = editListEl.querySelectorAll('[data-edit-index]');
    const lastRow = rows[rows.length - 1];
    const firstInput = lastRow ? lastRow.querySelector('input[data-field="name"]') : null;
    if (firstInput) firstInput.focus();
}

function renderEditList() {
    if (!editListEl) return;
    if (!editAppsDraft.length) {
        editListEl.innerHTML = '<div class="empty-state">No apps yet. Add one to get started.</div>';
        return;
    }

    const categorySet = new Set();
    editAppsDraft.forEach((app) => {
        const value = (app.category || '').trim();
        if (value) categorySet.add(value);
    });
    const categoryOptions = Array.from(categorySet).sort().map((category) => {
        return `<option value="${escapeHtml(category)}"></option>`;
    }).join('');
    const categoryDatalist = `<datalist id="categoryOptions">${categoryOptions}</datalist>`;

    editListEl.innerHTML = editAppsDraft.map((app, index) => {
        const iconSelection = ICON_IDS.includes(app.icon) ? app.icon : '';
        const selectedLabel = iconSelection ? iconSelection : 'auto (box)';
        const selectedIconId = iconSelection || 'box';
        const iconOptions = [''].concat(ICON_IDS).map((icon) => {
            const label = icon ? icon : 'auto (box)';
            const iconId = icon || 'box';
            const isSelected = icon === iconSelection ? ' aria-selected="true"' : '';
            return `
                <button type="button" class="icon-option" data-value="${escapeHtml(icon)}" data-label="${escapeHtml(label)}" data-icon="${escapeHtml(iconId)}"${isSelected}>
                    <span class="icon-option-icon">${renderIcon(iconId)}</span>
                    <span class="icon-option-label">${escapeHtml(label)}</span>
                </button>
            `;
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
                        <input type="text" data-field="category" value="${escapeHtml(app.category)}" placeholder="Category" list="categoryOptions" />
                    </label>
                    <label>
                        <span>Icon</span>
                        <div class="icon-select" data-field="icon">
                            <button type="button" class="icon-select-button" data-action="icon-toggle">
                                <span class="icon-preview">${renderIcon(selectedIconId)}</span>
                                <span class="icon-label">${escapeHtml(selectedLabel)}</span>
                                <svg class="icon-caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </button>
                            <div class="icon-select-menu">
                                ${iconOptions}
                            </div>
                        </div>
                    </label>
                    <label class="notes-field">
                        <span>Notes</span>
                        <input type="text" data-field="notes" value="${escapeHtml(app.notes)}" placeholder="Optional description" />
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
                        <span>Skip checks</span>
                        <span class="checkbox-control">
                            <input type="checkbox" data-field="skipCheck" ${app.skipCheck ? 'checked' : ''} />
                        </span>
                    </label>
                </div>
                <button class="danger-button" data-action="delete">Delete</button>
            </div>
        `;
    }).join('') + categoryDatalist;
}

function renderCategoryOrderList() {
    if (!editCategoryOrderListEl) return;
    if (!editCategoryOrderDraft.length) {
        editCategoryOrderListEl.innerHTML = '<div class="category-order-empty">No category order entries. Add one to customize sorting.</div>';
        return;
    }
    editCategoryOrderListEl.innerHTML = editCategoryOrderDraft.map((category, index) => `
        <div class="category-order-row" data-category-order-index="${index}">
            <input type="text" class="edit-text-input" data-role="category-order-name" value="${escapeHtml(category)}" placeholder="Category name" />
            <div class="category-order-actions">
                <button type="button" class="secondary-button category-order-button" data-action="category-order-up" ${index === 0 ? 'disabled' : ''}>Up</button>
                <button type="button" class="secondary-button category-order-button" data-action="category-order-down" ${index === editCategoryOrderDraft.length - 1 ? 'disabled' : ''}>Down</button>
                <button type="button" class="danger-button category-order-button" data-action="category-order-delete">Remove</button>
            </div>
        </div>
    `).join('');
}

function addCategoryOrderEntry() {
    if (!editCategoryOrderInput) return;
    const value = editCategoryOrderInput.value.trim();
    if (!value) return;
    const exists = editCategoryOrderDraft.some((entry) => entry.trim().toLowerCase() === value.toLowerCase());
    if (exists) return;
    editCategoryOrderDraft.push(value);
    editCategoryOrderInput.value = '';
    renderCategoryOrderList();
}

function normalizeCategoryOrder(order) {
    const seen = new Set();
    const normalized = [];
    order.forEach((category) => {
        const value = String(category || '').trim();
        if (!value) return;
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push(value);
    });
    return normalized;
}

async function saveEditMode() {
    if (!isEditMode) return;

    const payload = {
        categoryOrder: normalizeCategoryOrder(editCategoryOrderDraft),
        apps: editAppsDraft.map((app) => ({
            name: app.name || '',
            url: app.url || '',
            category: app.category || '',
            icon: app.icon || '',
            notes: app.notes || '',
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
    } catch (err) {
        console.error('Failed to save manifest:', err);
        alert(`Save failed: ${err.message || err}`);
    } finally {
        editSaveBtn.disabled = false;
        editSaveBtn.textContent = 'Save';
    }
}
