import {
    collection, getDocs, query, Timestamp, where
} from 'firebase/firestore'
import { db } from './firebase'
import { aggregateMessageCosts } from '../utils/spendingAggregation'

const PROVIDER_IDS = ['openai', 'anthropic', 'google', 'mistral']

export { aggregateMessageCosts } from '../utils/spendingAggregation'

export async function fetchSpendingLast30Days(userId) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)
    cutoffDate.setHours(0, 0, 0, 0)

    const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId),
        where('lastUpdated', '>=', Timestamp.fromDate(cutoffDate))
    )
    const snapshot = await getDocs(chatsQuery)

    const byProvider = Object.fromEntries(PROVIDER_IDS.map((id) => [id, 0]))
    let totalUsd = 0
    let measuredTurns = 0
    let estimatedTurns = 0
    let chatsScanned = 0

    snapshot.forEach((docSnap) => {
        chatsScanned += 1
        const data = docSnap.data()
        const partial = aggregateMessageCosts(data.messages, cutoffDate, {
            provider: data.provider,
            model: data.model,
            modelKey: data.modelKey
        })
        totalUsd += partial.totalUsd
        measuredTurns += partial.measuredTurns
        estimatedTurns += partial.estimatedTurns
        PROVIDER_IDS.forEach((providerId) => {
            byProvider[providerId] += partial.byProvider[providerId]
        })
    })

    return {
        totalUsd,
        byProvider,
        measuredTurns,
        estimatedTurns,
        chatsScanned,
        cutoffDate: cutoffDate.toISOString()
    }
}
