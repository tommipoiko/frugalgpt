const test = require('node:test')
const assert = require('node:assert/strict')
const {
    buildTitlePrompt,
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
