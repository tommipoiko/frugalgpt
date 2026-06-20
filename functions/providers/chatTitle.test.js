const test = require('node:test')
const assert = require('node:assert/strict')
const {
    buildTitlePrompt,
    buildOpenAiTitleCreateParams,
    buildGeminiTitleConfig,
    buildMistralTitleBody,
    deriveHeuristicTitle,
    isFirstExchange,
    isPoorChatTitle,
    resolveTitleModelId,
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
    assert.equal(sanitizeChatTitle('Title: Steam Deck Streaming'), 'Steam Deck Streaming')
    assert.equal(sanitizeChatTitle('   '), null)
})

test('buildTitlePrompt includes examples and conversation excerpts', () => {
    const prompt = buildTitlePrompt('Plan a trip to Paris', 'Here are some ideas for your trip.')
    assert.match(prompt, /Apples in Finland/)
    assert.match(prompt, /Steam Deck Streaming/)
    assert.match(prompt, /Plan a trip to Paris/)
    assert.match(prompt, /Here are some ideas/)
    assert.match(prompt, /Title:$/)
})

test('deriveHeuristicTitle strips question phrasing', () => {
    assert.equal(
        deriveHeuristicTitle('Tell me about apples for sale in Finland'),
        'Apples in Finland'
    )
})

test('isPoorChatTitle rejects question-like or copied titles', () => {
    assert.equal(
        isPoorChatTitle('Tell me about apples for sale in Finland', 'Tell me about apples for sale in Finland'),
        true
    )
    assert.equal(isPoorChatTitle('Apples in Finland', 'Tell me about apples for sale in Finland'), false)
    assert.equal(isPoorChatTitle('How do I stream to Steam Deck?', 'How do I stream to Steam Deck?'), true)
})

test('resolveTitleModelId prefers lightweight title models', () => {
    assert.equal(resolveTitleModelId('openai', 'gpt-5.5'), 'gpt-5.4')
    assert.equal(resolveTitleModelId('google', 'gemini-3.1-pro-preview'), 'gemini-3.5-flash')
    assert.equal(resolveTitleModelId('anthropic', 'claude-opus-4-8'), 'claude-sonnet-4-6')
    assert.equal(resolveTitleModelId('mistral', 'magistral-medium-latest'), 'magistral-small-latest')
})

test('title inference helpers avoid web search and reasoning', () => {
    const openAi = buildOpenAiTitleCreateParams('gpt-5.4', 'title prompt')
    assert.equal(openAi.reasoning, undefined)
    assert.equal(openAi.max_output_tokens, 48)
    assert.equal(openAi.tools, undefined)

    const gemini = buildGeminiTitleConfig()
    assert.equal(gemini.maxOutputTokens, 48)
    assert.equal(gemini.thinkingConfig.thinkingBudget, 0)
    assert.equal(gemini.tools, undefined)

    const mistral = buildMistralTitleBody('magistral-small-latest', 'title prompt')
    assert.equal(mistral.prompt_mode, undefined)
    assert.equal(mistral.max_tokens, 48)
})
