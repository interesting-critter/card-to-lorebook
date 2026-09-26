"use strict";
function send(payload, userId) {
    spindle.sendToFrontend(payload, userId);
}
async function fetchAllCharacters(userId) {
    const all = [];
    let offset = 0;
    const limit = 200;
    while (true) {
        const result = await spindle.characters.list({ limit, offset, userId });
        const items = (result.data || []);
        all.push(...items);
        if (items.length < limit || all.length >= (result.total || 0))
            break;
        offset += limit;
    }
    return all;
}
async function fetchAllWorldBooks(userId) {
    const all = [];
    let offset = 0;
    const limit = 200;
    while (true) {
        const result = await spindle.world_books.list({ limit, offset, userId });
        const items = (result.data || []);
        all.push(...items);
        if (items.length < limit || all.length >= (result.total || 0))
            break;
        offset += limit;
    }
    return all;
}
async function fetchAllEntries(worldBookId, userId) {
    const all = [];
    let offset = 0;
    const limit = 200;
    while (true) {
        const result = await spindle.world_books.entries.list(worldBookId, {
            limit,
            offset,
            userId,
        });
        const items = (result.data || []);
        all.push(...items);
        if (items.length < limit || all.length >= (result.total || 0))
            break;
        offset += limit;
    }
    return all;
}
function buildEntryInput(character, defaults, order) {
    const content = [character.description || '', character.personality || '']
        .filter(Boolean)
        .join('\n\n')
        // These entries are shared by many characters, so bake the source card's
        // name into {{char}} rather than letting it resolve to the active chat's
        // character. {{user}} is intentionally left untouched.
        .replaceAll('{{char}}', character.name);
    return {
        key: [],
        keysecondary: [],
        content,
        comment: character.name,
        position: 7,
        depth: defaults.depth,
        role: defaults.role,
        order_value: order,
        selective: defaults.selective,
        constant: defaults.constant,
        disabled: defaults.disabled,
        exclude_greeting: defaults.exclude_greeting,
        case_sensitive: defaults.case_sensitive,
        match_whole_words: defaults.match_whole_words,
        use_regex: defaults.use_regex,
        prevent_recursion: defaults.prevent_recursion,
        exclude_recursion: defaults.exclude_recursion,
        delay_until_recursion: defaults.delay_until_recursion,
        priority: defaults.priority,
        probability: defaults.probability,
        use_probability: defaults.use_probability,
        sticky: defaults.sticky,
        cooldown: defaults.cooldown,
        delay: defaults.delay,
        scan_depth: defaults.scan_depth,
        // Lumiverse's World Info outlet position is position 7.
        outletName: character.name,
    };
}
spindle.onFrontendMessage(async (payload, userId) => {
    try {
        switch (payload.type) {
            case 'list_characters': {
                const characters = await fetchAllCharacters(userId);
                send({
                    type: 'characters_list',
                    characters: characters.map((c) => ({
                        id: c.id,
                        name: c.name,
                        tags: c.tags || [],
                    })),
                }, userId);
                break;
            }
            case 'list_world_books': {
                const worldBooks = await fetchAllWorldBooks(userId);
                send({ type: 'world_books_list', worldBooks }, userId);
                break;
            }
            case 'get_world_book_entries': {
                const entries = await fetchAllEntries(payload.worldBookId, userId);
                send({
                    type: 'world_book_entries',
                    worldBookId: payload.worldBookId,
                    entries: entries.map((entry) => ({
                        id: entry.id,
                        comment: entry.comment,
                        content: entry.content,
                        position: entry.position,
                        outletName: entry.outletName ?? entry.outlet_name ?? '',
                    })),
                }, userId);
                break;
            }
            case 'get_character_batch': {
                const ids = Array.isArray(payload.characterIds) ? payload.characterIds : [];
                const characters = [];
                for (const id of ids) {
                    const character = await spindle.characters.get(id, userId);
                    if (character)
                        characters.push(character);
                }
                send({ type: 'character_batch', characters }, userId);
                break;
            }
            case 'create_lorebook': {
                const characterIds = Array.isArray(payload.characterIds)
                    ? payload.characterIds
                    : [];
                const defaults = payload.defaults;
                const duplicateMode = payload.duplicateMode;
                const existingEntries = Array.isArray(payload.existingEntries)
                    ? payload.existingEntries
                    : [];
                if (!characterIds.length)
                    throw new Error('No character cards were selected.');
                if (!payload.lorebookName?.trim())
                    throw new Error('A lorebook name is required.');
                let worldBookId = payload.worldBookId;
                let createdBook = false;
                if (!worldBookId) {
                    const book = await spindle.world_books.create({
                        name: payload.lorebookName.trim(),
                        description: payload.description?.trim() || 'Created from character cards.',
                    }, userId);
                    worldBookId = book.id;
                    createdBook = true;
                }
                const entriesByName = new Map();
                for (const entry of existingEntries) {
                    if (!entriesByName.has(entry.comment))
                        entriesByName.set(entry.comment, entry);
                }
                const total = characterIds.length;
                let completed = 0;
                let created = 0;
                let replaced = 0;
                let skipped = 0;
                const errors = [];
                send({
                    type: 'transfer_started',
                    total,
                    worldBookId,
                    createdBook,
                }, userId);
                for (let i = 0; i < characterIds.length; i++) {
                    const characterId = characterIds[i];
                    let character = null;
                    try {
                        character = (await spindle.characters.get(characterId, userId));
                        if (!character)
                            throw new Error('Character card no longer exists.');
                        const duplicate = entriesByName.get(character.name);
                        if (duplicate && duplicateMode === 'skip') {
                            skipped++;
                            completed++;
                            send({
                                type: 'transfer_progress',
                                completed,
                                total,
                                name: character.name,
                                action: 'skipped',
                                created,
                                replaced,
                                skipped,
                            }, userId);
                            continue;
                        }
                        const input = buildEntryInput(character, defaults, defaults.order_value + i);
                        if (duplicate && duplicateMode === 'replace') {
                            await spindle.world_books.entries.update(duplicate.id, input, userId);
                            replaced++;
                            completed++;
                            send({
                                type: 'transfer_progress',
                                completed,
                                total,
                                name: character.name,
                                action: 'replaced',
                                created,
                                replaced,
                                skipped,
                            }, userId);
                            continue;
                        }
                        const entry = await spindle.world_books.entries.create(worldBookId, input, userId);
                        entriesByName.set(character.name, entry);
                        created++;
                        completed++;
                        send({
                            type: 'transfer_progress',
                            completed,
                            total,
                            name: character.name,
                            action: 'created',
                            created,
                            replaced,
                            skipped,
                        }, userId);
                    }
                    catch (error) {
                        completed++;
                        const message = error?.message || String(error);
                        errors.push({ name: character?.name || characterId, message });
                        send({
                            type: 'transfer_progress',
                            completed,
                            total,
                            name: character?.name || characterId,
                            action: 'error',
                            error: message,
                            created,
                            replaced,
                            skipped,
                        }, userId);
                    }
                }
                const summary = {
                    worldBookId,
                    createdBook,
                    total,
                    created,
                    replaced,
                    skipped,
                    failed: errors.length,
                    errors,
                };
                if (errors.length) {
                    spindle.toast.warning(`Lorebook transfer finished with ${errors.length} error${errors.length === 1 ? '' : 's'}.`, { userId });
                }
                else {
                    spindle.toast.success(`Lorebook transfer complete: ${created + replaced} entr${created + replaced === 1 ? 'y' : 'ies'} processed.`, { userId });
                }
                send({ type: 'transfer_complete', ...summary }, userId);
                break;
            }
        }
    }
    catch (error) {
        const message = error?.message || String(error);
        spindle.log.error(`[character-lorebook-transfer] ${message}`);
        spindle.toast.error(message, { title: 'Transfer Failed', userId });
        send({ type: 'transfer_error', message }, userId);
    }
});
