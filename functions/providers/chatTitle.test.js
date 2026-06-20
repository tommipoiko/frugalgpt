const test = require('node:test')
const assert = require('node:assert/strict')
const {
    buildTitlePrompt,
    buildOpenAiTitleCreateParams,
    buildGeminiTitleConfig,
    buildMistralTitleBody,
    isFirstExchange,
    sanitizeChatTitle
} = require('./chatTitle')

test('isFirstExchange detects the first user message only', () => {
    assert.equal(isFirstExchange([{ role: 'user', content: 'Hello' }]), true)
    assert.equal(isFirstExchange([
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'Hi there' }
    ]), false)
    assert.equal(isFirstExchange([
        { role: 'user', content: 'One' },
        { role: 'user', content: 'Two' }
    ]), false)
})

test('sanitizeChatTitle trims quotes and punctuation', () => {
    assert.equal(sanitizeChatTitle('"Paris Travel Tips"'), 'Paris Travel Tips')
    assert.equal(sanitizeChatTitle('Budget meal ideas.'), 'Budget meal ideas')
    assert.equal(sanitizeChatTitle('   '), null)
})

test('buildTitlePrompt includes user and assistant excerpts', () => {
    const prompt = buildTitlePrompt('Plan a trip to Paris', 'Here are some ideas for your trip.')
    assert.match(prompt, /Plan a trip to Paris/)
    assert.match(prompt, /Here are some ideas/)
})

test('title inference helpers avoid web search and use minimal effort', () => {
    const openAi = buildOpenAiTitleCreateParams('gpt-5.4', 'title prompt')
    assert.equal(openAi.reasoning.effort, 'minimal')
    assert.equal(openAi.max_output_tokens, 32)
    assert.equal(openAi.tools, undefined)

    const gemini = buildGeminiTitleConfig()
    assert.equal(gemini.maxOutputTokens, 32)
    assert.equal(gemini.tools, undefined)
    assert.equal(gemini.thinkingConfig, undefined)

    const mistral = buildMistralTitleBody('magistral-medium-latest', 'title prompt')
    assert.equal(mistral.prompt_mode, undefined)
    assert.equal(mistral.max_tokens, 32)
})
