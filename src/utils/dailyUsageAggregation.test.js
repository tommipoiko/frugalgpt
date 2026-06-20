import {
    aggregateDailyUsageFromMessages,
    computeAverageDailyUsage,
    extractWebSearchCount,
    mergeDailyUsageMaps,
    toLocalDateKey
} from './dailyUsageAggregation'
import { estimateDailyModelCost } from './estimateDailyModelCost'

describe('dailyUsageAggregation', () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z')

    test('buckets assistant usage by local date', () => {
        const byDate = aggregateDailyUsageFromMessages([
            {
                role: 'system',
                provider: 'openai',
                costRecordedAt: '2026-06-10T12:00:00.000Z',
                usage: {
                    input_tokens: 1000,
                    output_tokens: 500
                }
            },
            {
                role: 'system',
                provider: 'openai',
                costRecordedAt: '2026-06-10T18:00:00.000Z',
                usage: {
                    input_tokens: 2000,
                    output_tokens: 700,
                    web_search_calls: 2
                }
            },
            {
                role: 'system',
                provider: 'openai',
                costRecordedAt: '2026-05-20T12:00:00.000Z',
                usage: {
                    input_tokens: 9999,
                    output_tokens: 9999
                }
            },
            { role: 'user', content: 'hello' }
        ], cutoff, { provider: 'openai' })

        const dateKey = toLocalDateKey('2026-06-10T12:00:00.000Z')
        expect(byDate[dateKey].inputTokens).toBe(3000)
        expect(byDate[dateKey].outputTokens).toBe(1200)
        expect(byDate[dateKey].webSearches).toBe(2)
        expect(byDate[dateKey].turns).toBe(2)
        expect(Object.keys(byDate)).toHaveLength(1)
    })

    test('merges maps and computes averages over active days only', () => {
        const merged = mergeDailyUsageMaps(
            {
                '2026-06-10': {
                    inputTokens: 1000, outputTokens: 500, webSearches: 1, turns: 1
                }
            },
            {
                '2026-06-10': {
                    inputTokens: 2000, outputTokens: 500, webSearches: 0, turns: 1
                },
                '2026-06-11': {
                    inputTokens: 4000, outputTokens: 1000, webSearches: 2, turns: 2
                }
            }
        )

        const average = computeAverageDailyUsage(merged)
        expect(average.activeDays).toBe(2)
        expect(average.inputTokens).toBe(Math.round((3000 + 4000) / 2))
        expect(average.outputTokens).toBe(Math.round((1000 + 1000) / 2))
        expect(average.webSearches).toBe(Math.round((1 + 2) / 2))
    })

    test('extractWebSearchCount normalizes provider fields', () => {
        expect(extractWebSearchCount('openai', { webSearchCalls: 3 })).toBe(3)
        expect(extractWebSearchCount('google', { webSearchQueries: 4 })).toBe(4)
        expect(extractWebSearchCount('anthropic', { webSearchRequests: 5 })).toBe(5)
    })
})

describe('estimateDailyModelCost', () => {
    test('estimates token and web search cost for a model', () => {
        const modelEntry = {
            provider: 'openai',
            apiModelId: 'gpt-5.4',
            webSearch: true
        }
        const averageUsage = {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            webSearches: 10,
            activeDays: 3
        }

        const estimate = estimateDailyModelCost(modelEntry, averageUsage, {
            webSearchEnabled: true
        })

        expect(estimate.costUsd).toBeCloseTo(2.5 + 15 + 0.1, 2)
        expect(estimate.webSearches).toBe(10)
    })

    test('excludes web search fees when browsing is disabled', () => {
        const modelEntry = {
            provider: 'openai',
            apiModelId: 'gpt-5.4',
            webSearch: true
        }
        const averageUsage = {
            inputTokens: 1_000_000,
            outputTokens: 0,
            webSearches: 10,
            activeDays: 1
        }

        const estimate = estimateDailyModelCost(modelEntry, averageUsage, {
            webSearchEnabled: false
        })

        expect(estimate.costUsd).toBeCloseTo(2.5, 2)
        expect(estimate.webSearches).toBe(0)
    })
})
