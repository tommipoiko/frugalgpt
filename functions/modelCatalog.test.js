const test = require('node:test')
const assert = require('node:assert/strict')
const {
    DEFAULT_MODEL_BY_PROVIDER,
    listRequiredModelsForProvider,
    isAllowedModel,
    sanitizeModelId
} = require('./modelCatalog')

test('model catalog contains exactly required provider models', () => {
    assert.deepEqual(listRequiredModelsForProvider('openai'), ['gpt-5.5', 'gpt-5.4'])
    assert.deepEqual(listRequiredModelsForProvider('google'), ['gemini-3.1-pro-preview'])
    assert.deepEqual(listRequiredModelsForProvider('anthropic'), ['claude-opus-4-7', 'claude-sonnet-4-6'])
    assert.deepEqual(listRequiredModelsForProvider('mistral'), ['magistral-medium-latest', 'magistral-small-latest'])
})

test('sanitizeModelId enforces strict allowed set per provider', () => {
    assert.equal(sanitizeModelId('openai', 'gpt-5.5'), 'gpt-5.5')
    assert.equal(sanitizeModelId('openai', 'gpt-4o'), DEFAULT_MODEL_BY_PROVIDER.openai)
    assert.equal(sanitizeModelId('google', 'gemini-3.1-pro-preview'), 'gemini-3.1-pro-preview')
    assert.equal(sanitizeModelId('google', 'gemini-2.5-pro'), DEFAULT_MODEL_BY_PROVIDER.google)
})

test('isAllowedModel is true only for required model ids', () => {
    assert.equal(isAllowedModel('anthropic', 'claude-opus-4-7'), true)
    assert.equal(isAllowedModel('anthropic', 'claude-sonnet-4-20250514'), false)
    assert.equal(isAllowedModel('mistral', 'magistral-small-latest'), true)
    assert.equal(isAllowedModel('mistral', 'magistral-medium-latest'), true)
})
