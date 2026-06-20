const test = require('node:test')
const assert = require('node:assert/strict')
const {
    estimateUsage,
    computeTurnCost,
    normalizeProviderUsage
} = require('./usageCost')
const { getModelPricing } = require('./loadModels')

test('normalizeProviderUsage maps anthropic usage with cache and tools', () => {
    assert.deepEqual(normalizeProviderUsage('anthropic', {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 1000,
        cache_creation_input_tokens: 200,
        server_tool_use: { web_search_requests: 2 }
    }), {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadInputTokens: 1000,
        cacheCreationInputTokens: 200,
        cacheWrite5mInputTokens: 200,
        cacheWrite1hInputTokens: 0,
        totalInputTokens: 1300,
        thinkingTokens: 0,
        webSearchRequests: 2,
        serviceTier: 'standard',
        inferenceGeo: null,
        estimated: false
    })
})

test('normalizeProviderUsage splits openai cached input tokens', () => {
    assert.deepEqual(normalizeProviderUsage('openai', {
        input_tokens: 1000,
        output_tokens: 500,
        input_tokens_details: { cached_tokens: 800 },
        web_search_calls: 2
    }), {
        inputTokens: 200,
        cachedInputTokens: 800,
        totalInputTokens: 1000,
        outputTokens: 500,
        reasoningTokens: 0,
        webSearchCalls: 2,
        serviceTier: 'standard',
        estimated: false
    })
})

test('computeTurnCost uses base token pricing for simple usage', () => {
    const pricing = getModelPricing('openai', 'gpt-5.4')
    const { costUsd } = computeTurnCost('openai', 'gpt-5.4', {
        input_tokens: 1_000_000,
        output_tokens: 0,
        input_tokens_details: { cached_tokens: 0 }
    }, [], '')
    assert.equal(costUsd, pricing.inputPer1MUsd)
})

test('computeTurnCost includes anthropic cache and web search surcharges', () => {
    const { costUsd, costBreakdown, costSource } = computeTurnCost('anthropic', 'claude-opus-4-8', {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: { web_search_requests: 3 }
    }, [], '')
    assert.equal(costSource, 'usage')
    assert.equal(costBreakdown.webSearchUsd, 0.03)
    assert.equal(costUsd, 0.03)
})

test('computeTurnCost applies anthropic 1h cache write premium', () => {
    const pricing = getModelPricing('anthropic', 'claude-sonnet-4-6')
    const { costBreakdown } = computeTurnCost('anthropic', 'claude-sonnet-4-6', {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: { ephemeral_1h_input_tokens: 100_000 },
        cache_creation_input_tokens: 100_000
    }, [], '')
    const expectedCacheWriteUsd = (100_000 / 1_000_000) * pricing.inputPer1MUsd * 2
    assert.ok(Math.abs(costBreakdown.cacheWriteUsd - expectedCacheWriteUsd) < 1e-9)
})

test('computeTurnCost applies anthropic long-context premium', () => {
    const pricing = getModelPricing('anthropic', 'claude-sonnet-4-6')
    const { costBreakdown } = computeTurnCost('anthropic', 'claude-sonnet-4-6', {
        input_tokens: 250_000,
        output_tokens: 1_000,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0
    }, [], '')
    assert.equal(costBreakdown.longContextApplied, true)
    assert.equal(costBreakdown.inputUsd, (250_000 / 1_000_000) * pricing.inputPer1MUsd * 2)
})

test('computeTurnCost applies openai long-context premium for gpt-5.5', () => {
    const pricing = getModelPricing('openai', 'gpt-5.5')
    const { costBreakdown } = computeTurnCost('openai', 'gpt-5.5', {
        input_tokens: 300_000,
        output_tokens: 1_000,
        input_tokens_details: { cached_tokens: 0 }
    }, [], '')
    assert.equal(costBreakdown.longContextApplied, true)
    assert.equal(costBreakdown.inputUsd, (300_000 / 1_000_000) * pricing.inputPer1MUsd * 2)
})

test('computeTurnCost uses non-reasoning web search rate when model is not reasoning', () => {
    const { costBreakdown } = computeTurnCost('google', 'gemini-3.5-flash', {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        webSearchQueries: 4
    }, [], '')
    assert.equal(costBreakdown.webSearchUsd, 0.056)
})

test('computeTurnCost applies batch discount and inference geo multiplier', () => {
    const pricing = getModelPricing('anthropic', 'claude-sonnet-4-6')
    const { costBreakdown } = computeTurnCost('anthropic', 'claude-sonnet-4-6', {
        input_tokens: 100_000,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        service_tier: 'batch',
        inference_geo: 'us'
    }, [], '')
    const expectedInputUsd = (100_000 / 1_000_000) * pricing.inputPer1MUsd * 0.5 * 1.1
    assert.equal(costBreakdown.batchApplied, true)
    assert.equal(costBreakdown.inferenceGeoApplied, true)
    assert.ok(Math.abs(costBreakdown.inputUsd - expectedInputUsd) < 1e-9)
})

test('computeTurnCost includes mistral agent tool fees', () => {
    const { costBreakdown } = computeTurnCost('mistral', 'magistral-medium-latest', {
        prompt_tokens: 0,
        completion_tokens: 0,
        web_search_requests: 2
    }, [], '')
    assert.equal(costBreakdown.webSearchUsd, 0.02)
})

test('computeTurnCost estimates from text when usage is missing', () => {
    const messages = [{ role: 'user', content: 'Hello there' }]
    const assistantResponse = 'Hi!'
    const { usage, costUsd, costSource } = computeTurnCost(
        'openai',
        'gpt-5.4',
        null,
        messages,
        assistantResponse
    )
    assert.equal(costSource, 'estimated')
    assert.equal(usage.estimated, true)
    assert.ok(usage.inputTokens > 0)
    assert.ok(usage.outputTokens > 0)
    assert.ok(costUsd >= 0)
    assert.equal(
        costUsd,
        computeTurnCost('openai', 'gpt-5.4', estimateUsage(messages, assistantResponse), messages, assistantResponse).costUsd
    )
})
