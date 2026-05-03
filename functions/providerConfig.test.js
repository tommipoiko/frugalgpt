const test = require('node:test')
const assert = require('node:assert/strict')
const {
    inferCapabilities,
    buildAnthropicTools,
    buildGeminiTools,
    buildMistralTools
} = require('./providerConfig')

test('inferCapabilities enables web search for all supported providers', () => {
    assert.equal(inferCapabilities('openai', 'gpt-5.4').webSearch, true)
    assert.equal(inferCapabilities('anthropic', 'claude-sonnet-4-6').webSearch, true)
    assert.equal(inferCapabilities('google', 'gemini-3.1-pro-preview').webSearch, true)
    assert.equal(inferCapabilities('mistral', 'magistral-medium-latest').webSearch, true)
})

test('inferCapabilities keeps unsupported providers disabled', () => {
    assert.deepEqual(inferCapabilities('unknown', 'foo'), {
        reasoning: false,
        webSearch: false
    })
})

test('provider web-search tool payloads match provider adapters', () => {
    assert.deepEqual(buildAnthropicTools(true), [{
        type: 'web_search'
    }])
    assert.deepEqual(buildGeminiTools(true), [{ googleSearch: {} }])
    assert.deepEqual(buildMistralTools(true), [{ type: 'web_search' }])
    assert.equal(buildAnthropicTools(false), undefined)
    assert.equal(buildGeminiTools(false), undefined)
    assert.equal(buildMistralTools(false), undefined)
})
