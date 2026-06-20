const test = require('node:test')
const assert = require('node:assert/strict')
const {
    DEFAULT_MODEL_BY_PROVIDER,
    listRequiredModelsForProvider,
    isAllowedModel,
    sanitizeModelId
} = require('./modelCatalog')
const { catalog } = require('./loadModels')

test('model catalog contains exactly required provider models', () => {
    assert.deepEqual(
        listRequiredModelsForProvider('openai'),
        catalog.providers.openai.models.map((model) => model.id)
    )
    assert.deepEqual(
        listRequiredModelsForProvider('google'),
        catalog.providers.google.models.map((model) => model.id)
    )
    assert.deepEqual(
        listRequiredModelsForProvider('anthropic'),
        catalog.providers.anthropic.models.map((model) => model.id)
    )
    assert.deepEqual(
        listRequiredModelsForProvider('mistral'),
        catalog.providers.mistral.models.map((model) => model.id)
    )
})

test('sanitizeModelId enforces strict allowed set per provider', () => {
    assert.equal(sanitizeModelId('openai', 'gpt-5.5'), 'gpt-5.5')
    assert.equal(sanitizeModelId('openai', 'gpt-4o'), DEFAULT_MODEL_BY_PROVIDER.openai)
    assert.equal(sanitizeModelId('google', 'gemini-3.1-pro-preview'), 'gemini-3.1-pro-preview')
    assert.equal(sanitizeModelId('google', 'gemini-2.5-pro'), DEFAULT_MODEL_BY_PROVIDER.google)
})

test('isAllowedModel is true only for required model ids', () => {
    assert.equal(isAllowedModel('anthropic', 'claude-opus-4-8'), true)
    assert.equal(isAllowedModel('anthropic', 'claude-sonnet-4-20250514'), false)
    assert.equal(isAllowedModel('mistral', 'magistral-small-latest'), true)
    assert.equal(isAllowedModel('mistral', 'magistral-medium-latest'), true)
})
