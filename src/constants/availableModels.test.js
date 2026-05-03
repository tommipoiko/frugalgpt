import { AVAILABLE_CHAT_MODELS } from './availableModels'

describe('AVAILABLE_CHAT_MODELS web search support', () => {
    it('contains exactly the required model ids', () => {
        expect(AVAILABLE_CHAT_MODELS.map((model) => model.key)).toEqual([
            'gpt-5.4',
            'gpt-5.5',
            'gemini-3.1-pro-preview',
            'claude-sonnet-4-6',
            'claude-opus-4-7',
            'magistral-small-latest',
            'magistral-medium-latest'
        ])
    })

    it('keeps API model ids equal to UI keys', () => {
        AVAILABLE_CHAT_MODELS.forEach((model) => {
            expect(model.apiModelId).toBe(model.key)
        })
    })

    it('enables web search for every listed model', () => {
        AVAILABLE_CHAT_MODELS.forEach((model) => {
            expect(model.webSearch).toBe(true)
        })
    })
})
