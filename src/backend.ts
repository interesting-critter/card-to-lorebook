declare const spindle: import('lumiverse-spindle-types').SpindleAPI

type Character = {
  id: string
  name: string
  description?: string
  personality?: string
  tags?: string[]
}

type WorldBook = {
  id: string
  name: string
}

type WorldBookEntry = {
  id: string
  comment: string
  content: string
  position: number
  [key: string]: unknown
}

type EntryDefaults = {
  position: number
  outletName?: string
  depth: number
  role: string | null
  order_value: number
  constant: boolean
  disabled: boolean
  selective: boolean
  exclude_greeting: boolean
  case_sensitive: boolean
  match_whole_words: boolean
  use_regex: boolean
  prevent_recursion: boolean
  exclude_recursion: boolean
  delay_until_recursion: boolean
  priority: number
  probability: number
  use_probability: boolean
  sticky: number
  cooldown: number
  delay: number
  scan_depth: number | null
}

function send(payload: Record<string, unknown>, userId?: string) {
  spindle.sendToFrontend(payload, userId)
}

async function fetchAllCharacters(userId?: string): Promise<Character[]> {
  const all: Character[] = []
  let offset = 0
  const limit = 200

  while (true) {
    const result = await spindle.characters.list({ limit, offset, userId } as any)
    const items = (result.data || []) as Character[]
    all.push(...items)
    if (items.length < limit || all.length >= (result.total || 0)) break
    offset += limit
  }

  return all
}

async function fetchAllWorldBooks(userId?: string): Promise<WorldBook[]> {
  const all: WorldBook[] = []
  let offset = 0
  const limit = 200

  while (true) {
    const result = await spindle.world_books.list({ limit, offset, userId } as any)
    const items = (result.data || []) as WorldBook[]
    all.push(...items)
    if (items.length < limit || all.length >= (result.total || 0)) break
    offset += limit
  }

  return all
}

async function fetchAllEntries(worldBookId: string, userId?: string): Promise<WorldBookEntry[]> {
  const all: WorldBookEntry[] = []
  let offset = 0
  const limit = 200

  while (true) {
    const result = await spindle.world_books.entries.list(worldBookId, {
      limit,
      offset,
      userId,
    } as any)
    const items = (result.data || []) as WorldBookEntry[]
    all.push(...items)
    if (items.length < limit || all.length >= (result.total || 0)) break
    offset += limit
  }

  return all
}

function buildEntryInput(character: Character, defaults: EntryDefaults, order: number) {
  const content = [character.description || '', character.personality || '']
    .filter(Boolean)
    .join('\n\n')
    // These entries are shared by many characters, so bake the source card's
    // name into {{char}} rather than letting it resolve to the active chat's
    // character. {{user}} is intentionally left untouched.
    .replaceAll('{{char}}', character.name)

  return {
    key: [character.name],
    keysecondary: [],
    content,
    comment: character.name,
    position: defaults.position,
    outletName: character.name,
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
  }
}

spindle.onFrontendMessage(async (payload: any, userId?: string) => {
  try {
    switch (payload.type) {
      case 'list_characters': {
        const characters = await fetchAllCharacters(userId)
        send({
          type: 'characters_list',
          characters: characters.map((c) => ({
            id: c.id,
            name: c.name,
            tags: c.tags || [],
          })),
        }, userId)
        break
      }

      case 'list_world_books': {
        const worldBooks = await fetchAllWorldBooks(userId)
        send({ type: 'world_books_list', worldBooks }, userId)
        break
      }

      case 'get_world_book_entries': {
        const entries = await fetchAllEntries(payload.worldBookId, userId)
        send({
          type: 'world_book_entries',
          worldBookId: payload.worldBookId,
          entries: entries.map((entry) => ({
            id: entry.id,
            comment: entry.comment,
            content: entry.content,
            position: entry.position,
          })),
        }, userId)
        break
      }

      case 'get_character_batch': {
        const ids: string[] = Array.isArray(payload.characterIds) ? payload.characterIds : []
        const characters: Character[] = []

        for (const id of ids) {
          const character = await spindle.characters.get(id, userId as any)
          if (character) characters.push(character as Character)
        }

        send({ type: 'character_batch', characters }, userId)
        break
      }

      case 'create_lorebook': {
        const characterIds: string[] = Array.isArray(payload.characterIds)
          ? payload.characterIds
          : []
        const defaults = payload.defaults as EntryDefaults
        const duplicateMode = payload.duplicateMode as 'skip' | 'replace' | 'create'
        const existingEntries = Array.isArray(payload.existingEntries)
          ? (payload.existingEntries as WorldBookEntry[])
          : []

        if (!characterIds.length) throw new Error('No character cards were selected.')
        if (!payload.lorebookName?.trim()) throw new Error('A lorebook name is required.')

        let worldBookId = payload.worldBookId as string | undefined
        let createdBook = false

        if (!worldBookId) {
          const book = await spindle.world_books.create({
            name: payload.lorebookName.trim(),
            description: payload.description?.trim() || 'Created from character cards.',
          }, userId as any)
          worldBookId = book.id
          createdBook = true
        }

        const entriesByName = new Map<string, WorldBookEntry>()
        for (const entry of existingEntries) {
          if (!entriesByName.has(entry.comment)) entriesByName.set(entry.comment, entry)
        }

        const total = characterIds.length
        let completed = 0
        let created = 0
        let replaced = 0
        let skipped = 0
        const errors: Array<{ name: string; message: string }> = []

        send({
          type: 'transfer_started',
          total,
          worldBookId,
          createdBook,
        }, userId)

        for (let i = 0; i < characterIds.length; i++) {
          const characterId = characterIds[i]
          let character: Character | null = null

          try {
            character = (await spindle.characters.get(characterId, userId as any)) as Character | null
            if (!character) throw new Error('Character card no longer exists.')

            const duplicate = entriesByName.get(character.name)

            if (duplicate && duplicateMode === 'skip') {
              skipped++
              completed++
              send({
                type: 'transfer_progress',
                completed,
                total,
                name: character.name,
                action: 'skipped',
                created,
                replaced,
                skipped,
              }, userId)
              continue
            }

            const input = buildEntryInput(character, defaults, defaults.order_value + i)

            if (duplicate && duplicateMode === 'replace') {
              await spindle.world_books.entries.update(duplicate.id, input as any, userId as any)
              replaced++
              completed++
              send({
                type: 'transfer_progress',
                completed,
                total,
                name: character.name,
                action: 'replaced',
                created,
                replaced,
                skipped,
              }, userId)
              continue
            }

            const entry = await spindle.world_books.entries.create(worldBookId, input as any, userId as any)
            entriesByName.set(character.name, entry as WorldBookEntry)
            created++
            completed++
            send({
              type: 'transfer_progress',
              completed,
              total,
              name: character.name,
              action: 'created',
              created,
              replaced,
              skipped,
            }, userId)
          } catch (error: any) {
            completed++
            const message = error?.message || String(error)
            errors.push({ name: character?.name || characterId, message })
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
            }, userId)
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
        }

        if (errors.length) {
          spindle.toast.warning(
            `Lorebook transfer finished with ${errors.length} error${errors.length === 1 ? '' : 's'}.`,
            { userId },
          )
        } else {
          spindle.toast.success(
            `Lorebook transfer complete: ${created + replaced} entr${created + replaced === 1 ? 'y' : 'ies'} processed.`,
            { userId },
          )
        }

        send({ type: 'transfer_complete', ...summary }, userId)
        break
      }
    }
  } catch (error: any) {
    const message = error?.message || String(error)
    spindle.log.error(`[character-lorebook-transfer] ${message}`)
    spindle.toast.error(message, { title: 'Transfer Failed', userId })
    send({ type: 'transfer_error', message }, userId)
  }
})
