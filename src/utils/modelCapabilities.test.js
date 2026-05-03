import inferModelCapabilities from './modelCapabilities'

describe('inferModelCapabilities', () => {
    it('reports webSearch support for all configured providers', () => {
        expect(inferModelCapabilities('openai', 'gpt-5.4').webSearch).toBe(true)
        expect(inferModelCapabilities('anthropic', 'claude-sonnet-4-6').webSearch).toBe(true)
        expect(inferModelCapabilities('google', 'gemini-3.1-pro-preview').webSearch).toBe(true)
        expect(inferModelCapabilities('mistral', 'magistral-medium-latest').webSearch).toBe(true)
    })
})
