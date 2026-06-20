import { aggregateMessageCosts } from './spendingAggregation'
import { computeTurnCost } from './usageCost'
import { getModelPricing } from './modelPricing'

describe('aggregateMessageCosts', () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z')
    const chatContext = { provider: 'openai' }

    test('sums assistant costs by provider within cutoff', () => {
        const messages = [
            {
                role: 'system',
                costUsd: 0.12,
                provider: 'anthropic',
                costRecordedAt: '2026-06-10T12:00:00.000Z'
            },
            {
                role: 'system',
                costUsd: 0.08,
                provider: 'openai',
                costRecordedAt: '2026-06-15T12:00:00.000Z'
            },
            {
                role: 'system',
                costUsd: 0.05,
                provider: 'openai',
                costRecordedAt: '2026-05-20T12:00:00.000Z'
            },
            {
                role: 'user',
                content: 'hello'
            }
        ]

        const summary = aggregateMessageCosts(messages, cutoff, chatContext)

        expect(summary.totalUsd).toBeCloseTo(0.2)
        expect(summary.byProvider.anthropic).toBeCloseTo(0.12)
        expect(summary.byProvider.openai).toBeCloseTo(0.08)
        expect(summary.measuredTurns).toBe(2)
        expect(summary.estimatedTurns).toBe(0)
    })

    test('falls back to chat provider and tracks estimated turns', () => {
        const summary = aggregateMessageCosts([
            {
                role: 'system',
                costUsd: 0.03,
                costSource: 'estimated',
                usage: { estimated: true },
                costRecordedAt: '2026-06-02T00:00:00.000Z'
            }
        ], cutoff, { provider: 'google' })

        expect(summary.totalUsd).toBeCloseTo(0.03)
        expect(summary.byProvider.google).toBeCloseTo(0.03)
        expect(summary.estimatedTurns).toBe(1)
    })

    test('computes cost from stored usage when costUsd is missing', () => {
        expect(getModelPricing('openai', 'gpt-5.4')?.inputPer1MUsd).toBe(2.5)
        const turn = computeTurnCost('openai', 'gpt-5.4', {
            inputTokens: 1_000_000,
            outputTokens: 0,
            estimated: false
        }, [], '')
        expect(turn.costUsd).toBeCloseTo(2.5)

        const summary = aggregateMessageCosts([
            {
                role: 'system',
                provider: 'openai',
                modelKey: 'gpt-5.4',
                usage: {
                    inputTokens: 1_000_000,
                    outputTokens: 0,
                    estimated: false
                },
                costRecordedAt: '2026-06-02T00:00:00.000Z'
            }
        ], cutoff, chatContext)

        expect(summary.totalUsd).toBeCloseTo(2.5)
        expect(summary.byProvider.openai).toBeCloseTo(2.5)
        expect(summary.measuredTurns).toBe(1)
    })

    test('includes legacy turns without costRecordedAt', () => {
        const summary = aggregateMessageCosts([
            {
                role: 'system',
                costUsd: 0.99,
                provider: 'mistral'
            }
        ], cutoff, { provider: 'mistral' })

        expect(summary.totalUsd).toBeCloseTo(0.99)
        expect(summary.byProvider.mistral).toBeCloseTo(0.99)
    })
})
