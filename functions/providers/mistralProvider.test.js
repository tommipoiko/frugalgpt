const test = require('node:test')
const assert = require('node:assert/strict')
const {
    appendFromContent,
    extractFromChatCompletionEvent,
    extractFromConversationEvent,
    isMagistralModel,
    buildWebSearchAgentBody,
    webSearchAgentName,
    readStoredWebSearchAgentId
} = require('./mistralProvider')

test('buildWebSearchAgentBody configures a dedicated web search agent', () => {
    const body = buildWebSearchAgentBody('magistral-medium-latest')

    assert.equal(body.model, 'magistral-medium-latest')
    assert.equal(body.name, webSearchAgentName('magistral-medium-latest'))
    assert.deepEqual(body.tools, [{ type: 'web_search' }])
    assert.match(body.instructions, /web_search/)
    assert.match(body.instructions, /current or recent information/)
    assert.equal(body.completion_args.temperature, 0.3)
    assert.equal(body.completion_args.prompt_mode, undefined)
})

test('readStoredWebSearchAgentId reads persisted agent ids from user settings', () => {
    const userData = {
        providers: {
            mistral: {
                webSearchAgents: {
                    'magistral-medium-latest': 'ag_saved_medium',
                    'magistral-small-latest': 'ag_saved_small'
                }
            }
        }
    }

    assert.equal(
        readStoredWebSearchAgentId(userData, 'magistral-medium-latest', true),
        'ag_saved_medium'
    )
    assert.equal(readStoredWebSearchAgentId(userData, 'unknown-model', true), null)
})

test('isMagistralModel detects magistral SKUs', () => {
    assert.equal(isMagistralModel('magistral-medium-latest'), true)
    assert.equal(isMagistralModel('mistral-large-latest'), false)
})

test('appendFromContent handles plain strings and structured chunks', () => {
    assert.deepEqual(appendFromContent('Hello', () => {}), {
        text: 'Hello',
        reasoning: ''
    })

    const parsed = appendFromContent([
        {
            type: 'thinking',
            thinking: [{ type: 'text', text: 'Let me think' }]
        },
        { type: 'text', text: 'Answer' }
    ], () => {})

    assert.equal(parsed.reasoning, 'Let me think')
    assert.equal(parsed.text, 'Answer')
})

test('extractFromChatCompletionEvent reads chat completion deltas', () => {
    const parsed = extractFromChatCompletionEvent({
        choices: [{ delta: { content: 'Hi' } }]
    }, () => {})

    assert.equal(parsed.text, 'Hi')
})

test('extractFromConversationEvent reads conversation message.output.delta events', () => {
    const parsed = extractFromConversationEvent({
        type: 'message.output.delta',
        content: 'The'
    }, () => {})

    assert.equal(parsed.text, 'The')
})

test('extractFromConversationEvent ignores unrelated conversation events', () => {
    const parsed = extractFromConversationEvent({
        type: 'tool.execution.started',
        name: 'web_search'
    }, () => {})

    assert.deepEqual(parsed, { text: '', reasoning: '' })
})

test('appendFromContent handles single chunk objects from conversation deltas', () => {
    const parsed = appendFromContent({
        type: 'thinking',
        thinking: [{ type: 'text', text: 'Searching...' }]
    }, () => {})

    assert.equal(parsed.reasoning, 'Searching...')
    assert.equal(parsed.text, '')

    const textChunk = appendFromContent({
        type: 'text',
        text: 'Result'
    }, () => {})

    assert.equal(textChunk.text, 'Result')
})

test('extractFromConversationEvent reads full message.output and response.done outputs', () => {
    const sources = []
    const recordSource = (source) => sources.push(source)

    const fromMessage = extractFromConversationEvent({
        type: 'message.output',
        content: [
            { type: 'text', text: 'Spain won ' },
            {
                type: 'tool_reference',
                url: 'https://example.com/euro',
                title: 'Euro winners'
            },
            { type: 'text', text: 'in 2024.' }
        ]
    }, recordSource)

    assert.equal(fromMessage.text, 'Spain won in 2024.')
    assert.equal(sources.length, 1)

    const fromDone = extractFromConversationEvent({
        type: 'conversation.response.done',
        outputs: [{
            type: 'message.output',
            content: 'Fallback answer'
        }]
    }, () => {})

    assert.equal(fromDone.text, 'Fallback answer')
})
