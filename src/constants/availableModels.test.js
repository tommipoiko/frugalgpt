import { AVAILABLE_CHAT_MODELS } from './availableModels'
import catalog from '../../models.json'

describe('AVAILABLE_CHAT_MODELS web search support', () => {
    it('contains exactly the required model ids', () => {
        const expectedKeys = Object.values(catalog.providers).flatMap(
            (provider) => provider.models.map((model) => model.id)
        )
        expect(AVAILABLE_CHAT_MODELS.map((model) => model.key)).toEqual(expectedKeys)
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
