const DEFAULTS = {
    depth: 4,
    role: null,
    order_value: 100,
    constant: true,
    disabled: false,
    selective: false,
    exclude_greeting: false,
    case_sensitive: false,
    match_whole_words: true,
    use_regex: false,
    prevent_recursion: false,
    exclude_recursion: false,
    delay_until_recursion: false,
    priority: 10,
    probability: 100,
    use_probability: false,
    sticky: 0,
    cooldown: 0,
    delay: 0,
    scan_depth: null,
};
const BATCH_SIZE = 40;
function addEl(tag, parent, text) {
    const el = document.createElement(tag);
    if (text !== undefined)
        el.textContent = text;
    parent.appendChild(el);
    return el;
}
function button(parent, label, primary = false) {
    const el = addEl('button', parent, label);
    el.className = `clt-btn${primary ? ' clt-btn-primary' : ''}`;
    return el;
}
function fieldLabel(parent, label, hint) {
    const row = addEl('label', parent);
    row.className = 'clt-field';
    const title = addEl('span', row, label);
    title.className = 'clt-label';
    if (hint) {
        const small = addEl('span', row, hint);
        small.className = 'clt-hint';
    }
    return row;
}
function inputNumber(parent, label, value, step = 1) {
    const row = fieldLabel(parent, label);
    const input = addEl('input', row);
    input.type = 'number';
    input.value = String(value);
    input.step = String(step);
    return input;
}
function checkbox(parent, label, checked) {
    const row = addEl('label', parent);
    row.className = 'clt-check';
    const input = addEl('input', row);
    input.type = 'checkbox';
    input.checked = checked;
    addEl('span', row, label);
    return input;
}
export function setup(ctx) {
    const removeStyle = ctx.dom.addStyle(`
    .clt-shell { display:flex; flex-direction:column; gap:14px; padding:14px; color:var(--lumiverse-text); }
    .clt-title { font-size:18px; font-weight:700; }
    .clt-subtitle { color:var(--lumiverse-text-muted); font-size:12px; line-height:1.45; }
    .clt-section { border:1px solid var(--lumiverse-border); border-radius:var(--lumiverse-radius); padding:12px; display:flex; flex-direction:column; gap:10px; }
    .clt-section-title { font-size:13px; font-weight:700; }
    .clt-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .clt-row > * { min-width:0; }
    .clt-input, .clt-select, .clt-number, .clt-search { box-sizing:border-box; width:100%; border:1px solid var(--lumiverse-border); border-radius:var(--lumiverse-radius); background:var(--lumiverse-fill-subtle); color:var(--lumiverse-text); padding:7px 9px; font:inherit; font-size:12px; }
    .clt-select { max-width:420px; }
    .clt-search { max-width:none; }
    .clt-btn { border:1px solid var(--lumiverse-border); background:var(--lumiverse-fill-subtle); color:var(--lumiverse-text); border-radius:var(--lumiverse-radius); padding:7px 10px; font-size:12px; cursor:pointer; }
    .clt-btn:hover { background:var(--lumiverse-fill); }
    .clt-btn:disabled { opacity:.45; cursor:not-allowed; }
    .clt-btn-primary { background:var(--lumiverse-accent); color:var(--lumiverse-accent-contrast, #fff); border-color:transparent; }
    .clt-field { display:flex; flex-direction:column; gap:4px; font-size:12px; }
    .clt-label { font-weight:600; }
    .clt-hint { color:var(--lumiverse-text-muted); font-size:10px; font-weight:400; }
    .clt-check { display:flex; gap:7px; align-items:center; font-size:12px; cursor:pointer; }
    .clt-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
    .clt-list { display:flex; flex-direction:column; gap:4px; max-height:330px; overflow:auto; border:1px solid var(--lumiverse-border); border-radius:var(--lumiverse-radius); padding:6px; }
    .clt-card { display:flex; gap:8px; align-items:center; padding:7px; border-radius:6px; }
    .clt-card:hover { background:var(--lumiverse-fill-subtle); }
    .clt-card-name { flex:1; font-size:12px; font-weight:600; }
    .clt-card-tags { color:var(--lumiverse-text-muted); font-size:10px; }
    .clt-count { color:var(--lumiverse-text-muted); font-size:11px; }
    .clt-preview { display:flex; flex-direction:column; gap:6px; max-height:340px; overflow:auto; }
    .clt-preview-item { border:1px solid var(--lumiverse-border); border-radius:6px; padding:8px; }
    .clt-preview-name { font-weight:700; font-size:12px; }
    .clt-preview-content { white-space:pre-wrap; color:var(--lumiverse-text-muted); font-size:11px; line-height:1.45; margin-top:5px; }
    .clt-outlets { font-family:monospace; white-space:pre-wrap; width:100%; min-height:130px; resize:vertical; box-sizing:border-box; border:1px solid var(--lumiverse-border); border-radius:var(--lumiverse-radius); background:var(--lumiverse-fill-subtle); color:var(--lumiverse-text); padding:9px; font-size:11px; }
    .clt-progress-track { height:7px; background:var(--lumiverse-fill-subtle); border-radius:99px; overflow:hidden; }
    .clt-progress-bar { height:100%; width:0; background:var(--lumiverse-accent); transition:width .15s ease; }
    .clt-log { max-height:190px; overflow:auto; font-size:11px; display:flex; flex-direction:column; gap:3px; }
    .clt-log-error { color:var(--lumiverse-danger, #f66); }
    .clt-log-muted { color:var(--lumiverse-text-muted); }
    .clt-pill { border:1px solid var(--lumiverse-border); border-radius:999px; padding:3px 7px; font-size:10px; color:var(--lumiverse-text-muted); }
    @media (max-width:700px) { .clt-grid { grid-template-columns:1fr; } }
  `);
    const tab = ctx.ui.registerDrawerTab({
        id: 'character-lorebook-transfer',
        title: 'Character Lorebook Transfer',
        shortName: 'Card Lore',
        description: 'Create lorebooks from character descriptions and personalities.',
        keywords: ['character', 'cards', 'lorebook', 'world book', 'transfer', 'outlet'],
        headerTitle: 'Card Lore Transfer',
    });
    const root = addEl('div', tab.root);
    root.className = 'clt-shell';
    addEl('div', root, 'Character Lorebook Transfer').className = 'clt-title';
    addEl('div', root, 'Create a world book whose outlet entries contain only each selected card’s description and personality. The source cards are never modified.').className = 'clt-subtitle';
    const bookSection = addEl('section', root);
    bookSection.className = 'clt-section';
    addEl('div', bookSection, '1. Lorebook').className = 'clt-section-title';
    const bookMode = addEl('select', bookSection);
    bookMode.className = 'clt-select';
    addEl('option', bookMode, 'Create a new lorebook').value = 'new';
    addEl('option', bookMode, 'Use an existing lorebook').value = 'existing';
    const newBookName = addEl('input', bookSection);
    newBookName.className = 'clt-input';
    newBookName.placeholder = 'New lorebook name';
    const existingBook = addEl('select', bookSection);
    existingBook.className = 'clt-select';
    existingBook.style.display = 'none';
    const description = addEl('input', bookSection);
    description.className = 'clt-input';
    description.placeholder = 'Optional lorebook description';
    const defaultsSection = addEl('section', root);
    defaultsSection.className = 'clt-section';
    addEl('div', defaultsSection, '2. Entry defaults').className = 'clt-section-title';
    addEl('div', defaultsSection, 'Every generated entry uses Outlet insertion. Outlet Name is the character’s exact card name.').className = 'clt-subtitle';
    const defaultsGrid = addEl('div', defaultsSection);
    defaultsGrid.className = 'clt-grid';
    const depthInput = inputNumber(defaultsGrid, 'Depth', DEFAULTS.depth);
    const orderInput = inputNumber(defaultsGrid, 'Starting order', DEFAULTS.order_value);
    const priorityInput = inputNumber(defaultsGrid, 'Priority', DEFAULTS.priority);
    const probabilityInput = inputNumber(defaultsGrid, 'Probability', DEFAULTS.probability);
    const stickyInput = inputNumber(defaultsGrid, 'Sticky turns', DEFAULTS.sticky);
    const cooldownInput = inputNumber(defaultsGrid, 'Cooldown turns', DEFAULTS.cooldown);
    const delayInput = inputNumber(defaultsGrid, 'Delay turns', DEFAULTS.delay);
    const scanDepthInput = inputNumber(defaultsGrid, 'Scan depth (-1 = global)', -1);
    const constantInput = checkbox(defaultsSection, 'Constant / always active', DEFAULTS.constant);
    const disabledInput = checkbox(defaultsSection, 'Create entries disabled', DEFAULTS.disabled);
    const useProbabilityInput = checkbox(defaultsSection, 'Use probability', DEFAULTS.use_probability);
    const matchWholeWordsInput = checkbox(defaultsSection, 'Match whole words', DEFAULTS.match_whole_words);
    const caseSensitiveInput = checkbox(defaultsSection, 'Case sensitive', DEFAULTS.case_sensitive);
    const preventRecursionInput = checkbox(defaultsSection, 'Prevent recursion', DEFAULTS.prevent_recursion);
    const excludeRecursionInput = checkbox(defaultsSection, 'Exclude from recursion', DEFAULTS.exclude_recursion);
    const excludeGreetingInput = checkbox(defaultsSection, 'Exclude greeting from scans', DEFAULTS.exclude_greeting);
    const charactersSection = addEl('section', root);
    charactersSection.className = 'clt-section';
    addEl('div', charactersSection, '3. Choose character cards').className = 'clt-section-title';
    const searchInput = addEl('input', charactersSection);
    searchInput.className = 'clt-search';
    searchInput.placeholder = 'Search by character name or tag...';
    const selectionRow = addEl('div', charactersSection);
    selectionRow.className = 'clt-row';
    const selectAllBtn = button(selectionRow, 'Select all');
    const clearAllBtn = button(selectionRow, 'Clear');
    const selectedCount = addEl('span', selectionRow, '0 selected');
    selectedCount.className = 'clt-count';
    const characterList = addEl('div', charactersSection);
    characterList.className = 'clt-list';
    const previewSection = addEl('section', root);
    previewSection.className = 'clt-section';
    addEl('div', previewSection, '4. Preview & duplicate handling').className = 'clt-section-title';
    const previewStatus = addEl('div', previewSection, 'Select cards to generate a preview.');
    previewStatus.className = 'clt-subtitle';
    const duplicateSelect = addEl('select', previewSection);
    duplicateSelect.className = 'clt-select';
    addEl('option', duplicateSelect, 'Skip existing entries').value = 'skip';
    addEl('option', duplicateSelect, 'Replace existing entries').value = 'replace';
    addEl('option', duplicateSelect, 'Create another entry').value = 'create';
    const previewList = addEl('div', previewSection);
    previewList.className = 'clt-preview';
    const outletSection = addEl('section', root);
    outletSection.className = 'clt-section';
    addEl('div', outletSection, 'Outlet macro list').className = 'clt-section-title';
    addEl('div', outletSection, 'Copy this into a prompt/preset field. Each macro points at the selected character’s outlet, with two newlines between entries.').className = 'clt-subtitle';
    const outletsText = addEl('textarea', outletSection);
    outletsText.className = 'clt-outlets';
    const copyOutletsBtn = button(outletSection, 'Copy outlet list');
    const actionRow = addEl('div', root);
    actionRow.className = 'clt-row';
    const transferBtn = button(actionRow, 'Create lorebook', true);
    transferBtn.disabled = true;
    const progressSection = addEl('section', root);
    progressSection.className = 'clt-section';
    progressSection.style.display = 'none';
    addEl('div', progressSection, 'Transfer progress').className = 'clt-section-title';
    const progressText = addEl('div', progressSection, '0 / 0');
    progressText.className = 'clt-count';
    const track = addEl('div', progressSection);
    track.className = 'clt-progress-track';
    const bar = addEl('div', track);
    bar.className = 'clt-progress-bar';
    const log = addEl('div', progressSection);
    log.className = 'clt-log';
    let characters = [];
    let selectedIds = new Set();
    let loadedCharacters = new Map();
    let worldBooks = [];
    let existingEntries = [];
    let loadingBatch = false;
    let transferRunning = false;
    function filteredCharacters() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query)
            return characters;
        return characters.filter((c) => c.name.toLowerCase().includes(query) ||
            c.tags.some((tag) => tag.toLowerCase().includes(query)));
    }
    function renderCharacters() {
        characterList.replaceChildren();
        const filtered = filteredCharacters();
        if (!filtered.length) {
            addEl('div', characterList, characters.length ? 'No cards match the filter.' : 'Loading character cards...').className = 'clt-log-muted';
            return;
        }
        for (const character of filtered) {
            const row = addEl('label', characterList);
            row.className = 'clt-card';
            const check = addEl('input', row);
            check.type = 'checkbox';
            check.checked = selectedIds.has(character.id);
            check.onchange = () => {
                if (check.checked)
                    selectedIds.add(character.id);
                else
                    selectedIds.delete(character.id);
                updateSelectionUI();
            };
            const name = addEl('span', row, character.name);
            name.className = 'clt-card-name';
            if (character.tags.length) {
                const tags = addEl('span', row, character.tags.slice(0, 4).join(', '));
                tags.className = 'clt-card-tags';
            }
        }
    }
    function updateSelectionUI() {
        selectedCount.textContent = `${selectedIds.size} selected`;
        transferBtn.disabled = transferRunning || selectedIds.size === 0;
        renderPreviewShell();
        loadSelectedCharacterBatches();
    }
    function getDuplicateNames() {
        const names = new Set(existingEntries.map((entry) => entry.comment));
        return [...selectedIds]
            .map((id) => characters.find((c) => c.id === id)?.name)
            .filter((name) => Boolean(name && names.has(name)));
    }
    function previewContent(character) {
        return [character.description || '', character.personality || '']
            .filter(Boolean)
            .join('\n\n')
            .replaceAll('{{char}}', character.name);
    }
    function renderPreviewShell() {
        const duplicates = getDuplicateNames();
        previewStatus.textContent = selectedIds.size
            ? `${selectedIds.size} card${selectedIds.size === 1 ? '' : 's'} selected${duplicates.length ? ` · ${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} in destination` : ''}.`
            : 'Select cards to generate a preview.';
        const outletNames = [...selectedIds]
            .map((id) => characters.find((c) => c.id === id)?.name)
            .filter((name) => Boolean(name));
        outletsText.value = outletNames.map((name) => `{{outlet::${name}}}`).join('\n\n');
        previewList.replaceChildren();
        for (const id of selectedIds) {
            const summary = characters.find((c) => c.id === id);
            if (!summary)
                continue;
            const item = addEl('div', previewList);
            item.className = 'clt-preview-item';
            addEl('div', item, summary.name).className = 'clt-preview-name';
            const character = loadedCharacters.get(id);
            const content = character
                ? previewContent(character)
                : 'Loading card data…';
            addEl('div', item, content || '(empty description/personality)').className = 'clt-preview-content';
            if (existingEntries.some((entry) => entry.comment === summary.name)) {
                addEl('span', item, 'Existing entry').className = 'clt-pill';
            }
        }
    }
    function readDefaults() {
        const scanDepth = Number(scanDepthInput.value);
        return {
            depth: Number(depthInput.value) || 4,
            role: null,
            order_value: Number(orderInput.value) || 100,
            constant: constantInput.checked,
            disabled: disabledInput.checked,
            selective: false,
            exclude_greeting: excludeGreetingInput.checked,
            case_sensitive: caseSensitiveInput.checked,
            match_whole_words: matchWholeWordsInput.checked,
            use_regex: false,
            prevent_recursion: preventRecursionInput.checked,
            exclude_recursion: excludeRecursionInput.checked,
            delay_until_recursion: false,
            priority: Number(priorityInput.value) || 10,
            probability: Math.max(0, Math.min(100, Number(probabilityInput.value) || 100)),
            use_probability: useProbabilityInput.checked,
            sticky: Math.max(0, Number(stickyInput.value) || 0),
            cooldown: Math.max(0, Number(cooldownInput.value) || 0),
            delay: Math.max(0, Number(delayInput.value) || 0),
            scan_depth: scanDepth < 0 ? null : Math.max(0, scanDepth),
        };
    }
    async function loadSelectedCharacterBatches() {
        if (loadingBatch || selectedIds.size === 0)
            return;
        loadingBatch = true;
        try {
            const ids = [...selectedIds];
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                ctx.sendToBackend({ type: 'get_character_batch', characterIds: batch });
                await new Promise((resolve) => {
                    const check = () => {
                        if (batch.every((id) => loadedCharacters.has(id)))
                            resolve();
                        else
                            setTimeout(check, 20);
                    };
                    check();
                });
            }
            renderPreviewShell();
        }
        finally {
            loadingBatch = false;
        }
    }
    function loadWorldBooks() {
        ctx.sendToBackend({ type: 'list_world_books' });
    }
    function loadCharacters() {
        ctx.sendToBackend({ type: 'list_characters' });
    }
    function selectedWorldBookId() {
        return bookMode.value === 'existing' ? existingBook.value : '';
    }
    function refreshExistingEntries() {
        existingEntries = [];
        const id = selectedWorldBookId();
        if (id)
            ctx.sendToBackend({ type: 'get_world_book_entries', worldBookId: id });
        renderPreviewShell();
    }
    bookMode.onchange = () => {
        const isExisting = bookMode.value === 'existing';
        newBookName.style.display = isExisting ? 'none' : '';
        description.style.display = isExisting ? 'none' : '';
        existingBook.style.display = isExisting ? '' : 'none';
        if (isExisting)
            refreshExistingEntries();
        else {
            existingEntries = [];
            renderPreviewShell();
        }
    };
    existingBook.onchange = refreshExistingEntries;
    searchInput.oninput = renderCharacters;
    selectAllBtn.onclick = () => {
        for (const character of filteredCharacters())
            selectedIds.add(character.id);
        updateSelectionUI();
    };
    clearAllBtn.onclick = () => {
        selectedIds.clear();
        updateSelectionUI();
    };
    copyOutletsBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(outletsText.value);
            copyOutletsBtn.textContent = 'Copied';
            setTimeout(() => { copyOutletsBtn.textContent = 'Copy outlet list'; }, 1200);
        }
        catch {
            outletsText.select();
            document.execCommand('copy');
        }
    };
    duplicateSelect.onchange = () => renderPreviewShell();
    transferBtn.onclick = () => {
        if (transferRunning || selectedIds.size === 0)
            return;
        const isExisting = bookMode.value === 'existing';
        if (!isExisting && !newBookName.value.trim()) {
            newBookName.focus();
            return;
        }
        if (isExisting && !existingBook.value)
            return;
        transferRunning = true;
        transferBtn.disabled = true;
        progressSection.style.display = '';
        progressText.textContent = 'Starting…';
        bar.style.width = '0%';
        log.replaceChildren();
        ctx.sendToBackend({
            type: 'create_lorebook',
            lorebookName: newBookName.value,
            description: description.value,
            worldBookId: selectedWorldBookId() || undefined,
            characterIds: [...selectedIds],
            defaults: readDefaults(),
            duplicateMode: duplicateSelect.value,
            existingEntries,
        });
    };
    const unsub = ctx.onBackendMessage((payload) => {
        switch (payload.type) {
            case 'characters_list': {
                characters = payload.characters || [];
                renderCharacters();
                updateSelectionUI();
                break;
            }
            case 'world_books_list': {
                worldBooks = payload.worldBooks || [];
                existingBook.replaceChildren();
                for (const book of worldBooks) {
                    const option = addEl('option', existingBook, book.name);
                    option.value = book.id;
                }
                if (worldBooks.length)
                    refreshExistingEntries();
                break;
            }
            case 'world_book_entries': {
                existingEntries = payload.entries || [];
                renderPreviewShell();
                break;
            }
            case 'character_batch': {
                for (const character of payload.characters || []) {
                    loadedCharacters.set(character.id, character);
                }
                renderPreviewShell();
                break;
            }
            case 'transfer_started': {
                progressText.textContent = `0 / ${payload.total}`;
                addEl('div', log, `Started transfer into ${payload.worldBookId}.`).className = 'clt-log-muted';
                break;
            }
            case 'transfer_progress': {
                const percent = payload.total ? (payload.completed / payload.total) * 100 : 0;
                progressText.textContent = `${payload.completed} / ${payload.total} · ${payload.created} created · ${payload.replaced} replaced · ${payload.skipped} skipped`;
                bar.style.width = `${percent}%`;
                const line = addEl('div', log);
                line.textContent = `${payload.action === 'error' ? '✕' : '✓'} ${payload.name}${payload.error ? ` — ${payload.error}` : ''}`;
                if (payload.action === 'error')
                    line.className = 'clt-log-error';
                log.scrollTop = log.scrollHeight;
                break;
            }
            case 'transfer_complete': {
                transferRunning = false;
                transferBtn.disabled = selectedIds.size === 0;
                progressText.textContent = `Finished · ${payload.created} created · ${payload.replaced} replaced · ${payload.skipped} skipped · ${payload.failed} failed`;
                bar.style.width = '100%';
                if (payload.worldBookId) {
                    bookMode.value = 'existing';
                    newBookName.style.display = 'none';
                    description.style.display = 'none';
                    existingBook.style.display = '';
                    existingBook.value = payload.worldBookId;
                    ctx.sendToBackend({ type: 'get_world_book_entries', worldBookId: payload.worldBookId });
                }
                break;
            }
            case 'transfer_error': {
                transferRunning = false;
                transferBtn.disabled = selectedIds.size === 0;
                progressText.textContent = `Failed: ${payload.message}`;
                break;
            }
        }
    });
    renderCharacters();
    renderPreviewShell();
    loadCharacters();
    loadWorldBooks();
    return () => {
        unsub();
        removeStyle();
        tab.destroy();
    };
}
