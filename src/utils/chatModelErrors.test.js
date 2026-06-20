import { formatChatModelError } from './chatModelErrors'

describe('formatChatModelError', () => {
    it('adds context for legacy model failures', () => {
        const message = formatChatModelError('model not found', {
            modelLabel: 'GPT-4o',
            providerLabel: 'OpenAI',
            isLegacy: true
        })

        expect(message).toContain('GPT-4o')
        expect(message).toContain('may no longer be available')
        expect(message).toContain('model not found')
    })
})
