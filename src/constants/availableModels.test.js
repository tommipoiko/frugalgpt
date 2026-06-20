import {
    AVAILABLE_CHAT_MODELS,
    buildLegacyModelEntry,
    findCatalogModel,
    getChatModelEntry,
    resolveChatInferenceFromFirestore,
    resolveModelKeyFromFirestore
} from './availableModels'

describe('chat model persistence helpers', () => {
    it('lists catalog models in provider and model order', () => {
        expect(AVAILABLE_CHAT_MODELS.map((entry) => entry.key)).toEqual([
            'claude-sonnet-4-6',
            'claude-opus-4-8',
            'gemini-3.1-pro-preview',
            'gemini-3.5-flash',
            'magistral-small-latest',
            'magistral-medium-latest',
            'gpt-5.4',
            'gpt-5.5'
        ])
    })

    it('finds catalog models by provider and api id', () => {
        const entry = findCatalogModel({
            provider: 'openai',
            model: 'gpt-5.4'
        })
        expect(entry?.key).toBe('gpt-5.4')
    })

    it('resolves legacy chat inference when model is removed from catalog', () => {
        const inference = resolveChatInferenceFromFirestore({
            provider: 'openai',
            model: 'gpt-4o',
            modelKey: 'gpt-4o',
            modelLabel: 'GPT-4o',
            providerLabel: 'OpenAI',
            reasoningEnabled: true,
            webSearchEnabled: false
        })

        expect(inference?.isLegacy).toBe(true)
        expect(inference?.modelKey).toBe('gpt-4o')
        expect(inference?.entry.apiModelId).toBe('gpt-4o')
    })

    it('keeps stored model key even when it is not in the catalog', () => {
        expect(resolveModelKeyFromFirestore({
            modelKey: 'retired-model',
            provider: 'anthropic',
            model: 'retired-model'
        })).toBe('retired-model')
    })

    it('uses fallback entry for removed models in getChatModelEntry', () => {
        const legacy = buildLegacyModelEntry({
            modelKey: 'retired-model',
            provider: 'google',
            model: 'retired-model',
            modelLabel: 'Retired Model'
        })
        const entry = getChatModelEntry('retired-model', legacy)
        expect(entry.label).toBe('Retired Model')
        expect(entry.isLegacy).toBe(true)
    })
})
