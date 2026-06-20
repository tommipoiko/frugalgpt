import React, {
    useState, useEffect
} from 'react'
import {
    Key, Sun, Moon, Monitor, Eye, EyeOff, Loader2, DollarSign
} from 'lucide-react'
import clsx from 'clsx'
import {
    doc, getDoc, setDoc, deleteField, onSnapshot
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { fetchSpendingLast30Days } from '../services/spendingApi'
import { formatDisplayedSpendingUsd } from '../utils/chatCost'
import ProviderLogo from './Brand/ProviderLogo'
import useKeyboardOverlapBottom from '../hooks/useKeyboardOverlapBottom'
import { getProviderLabel, PROVIDER_ORDER } from '../constants/availableModels'

const PROVIDER_PLACEHOLDERS = {
    anthropic: 'sk-ant-...',
    google: 'AIza...',
    mistral: '...',
    openai: 'sk-...'
}

const PROVIDER_CONFIG = PROVIDER_ORDER.map((id) => ({
    id,
    label: getProviderLabel(id),
    placeholder: PROVIDER_PLACEHOLDERS[id]
}))

const emptyProvidersState = () => ({
    openai: { apiKey: '' },
    anthropic: { apiKey: '' },
    google: { apiKey: '' },
    mistral: { apiKey: '' }
})

function hydrateProvidersFromDoc(userData) {
    const next = emptyProvidersState()
    const stored = userData?.providers
    if (stored && typeof stored === 'object') {
        PROVIDER_CONFIG.forEach(({ id }) => {
            const row = stored[id]
            if (row && typeof row === 'object') {
                next[id] = {
                    apiKey: typeof row.apiKey === 'string' ? row.apiKey : ''
                }
            }
        })
    }
    const legacy = userData?.openAi
    if (legacy?.openaiKey && !next.openai.apiKey) {
        next.openai = { apiKey: legacy.openaiKey }
    }
    return next
}

function User({ setMode }) {
    const keyboardInset = useKeyboardOverlapBottom()
    const [providers, setProviders] = useState(emptyProvidersState)
    const [visibleKeys, setVisibleKeys] = useState({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false
    })
    const [feedback, setFeedback] = useState(null)
    const [theme, setTheme] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [spendingLoading, setSpendingLoading] = useState(true)
    const [spending, setSpending] = useState(null)
    const [spendingError, setSpendingError] = useState('')

    useEffect(() => {
        let unsubSettings = () => {}
        let cancelled = false

        const loadSpending = async (uid) => {
            setSpendingLoading(true)
            setSpendingError('')
            try {
                const summary = await fetchSpendingLast30Days(uid)
                if (!cancelled) setSpending(summary)
            } catch (error) {
                console.error('Failed to load spending summary:', error)
                if (!cancelled) {
                    setSpending(null)
                    setSpendingError('Could not load usage totals. Check your connection and try again.')
                }
            } finally {
                if (!cancelled) setSpendingLoading(false)
            }
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            unsubSettings()
            if (!currentUser) {
                setLoading(false)
                setSpendingLoading(false)
                setSpending(null)
                setSpendingError('')
                setFeedback({ severity: 'warning', message: 'You are not signed in.' })
                return
            }

            setLoading(true)
            setFeedback(null)
            loadSpending(currentUser.uid)
            unsubSettings = onSnapshot(
                doc(db, 'users', currentUser.uid),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setProviders(hydrateProvidersFromDoc(docSnap.data()))
                    }
                    setLoading(false)
                },
                (error) => {
                    console.error('Failed to load user settings:', error)
                    setLoading(false)
                    setFeedback({
                        severity: 'error',
                        message: 'Could not load settings. Check your connection and try again.'
                    })
                }
            )
        })

        return () => {
            cancelled = true
            unsubscribe()
            unsubSettings()
        }
    }, [])

    const buildProvidersPayload = async () => {
        const docRef = doc(db, 'users', auth.currentUser.uid)
        const docSnap = await getDoc(docRef)
        const existingProviders = docSnap.exists() ? docSnap.data()?.providers : null
        const prevMistralKey = existingProviders?.mistral?.apiKey?.trim() || ''
        const nextMistralKey = providers.mistral.apiKey?.trim() || ''
        const providersPayload = {}

        PROVIDER_CONFIG.forEach(({ id }) => {
            const row = providers[id]
            const payload = {
                apiKey: row.apiKey?.trim() || ''
            }
            if (
                id === 'mistral'
                && prevMistralKey === nextMistralKey
                && existingProviders?.mistral?.webSearchAgents
            ) {
                payload.webSearchAgents = existingProviders.mistral.webSearchAgents
            }
            providersPayload[id] = payload
        })

        return providersPayload
    }

    const handleSaveAll = async () => {
        if (!auth.currentUser) {
            setFeedback({ severity: 'warning', message: 'User not authenticated' })
            return
        }
        setSaving(true)
        try {
            const providersPayload = await buildProvidersPayload()
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                providers: providersPayload,
                openAi: deleteField()
            }, { merge: true })
            setFeedback({ severity: 'success', message: 'API settings saved.' })
        } catch (error) {
            setFeedback({ severity: 'error', message: `Error saving settings: ${error.message}` })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteProvider = async (providerId) => {
        if (!auth.currentUser) {
            setFeedback({ severity: 'warning', message: 'User not authenticated' })
            return
        }
        try {
            const next = {
                ...providers,
                [providerId]: { apiKey: '' }
            }
            setProviders(next)
            const providersPayload = await buildProvidersPayload()
            providersPayload[providerId] = { apiKey: '' }
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                providers: providersPayload,
                openAi: deleteField()
            }, { merge: true })
            setFeedback({ severity: 'success', message: `${providerId} API key removed.` })
        } catch (error) {
            setFeedback({ severity: 'error', message: error.message })
        }
    }

    const handleThemeChange = (value) => {
        setTheme(value)
        setMode(value)
        localStorage.setItem('frugalGptTheme', value)
    }

    if (loading) {
        return (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
            </div>
        )
    }

    return (
        <div
            className="box-border flex min-h-0 w-full max-w-full flex-1 overflow-auto [-webkit-overflow-scrolling:touch]"
            style={{
                scrollPaddingBottom: keyboardInset ? `${keyboardInset + 24}px` : undefined
            }}
        >
            <div
                className="mx-auto w-full max-w-lg px-4 pt-8 pb-10 sm:px-6 sm:pt-12"
                style={{
                    paddingBottom: keyboardInset > 0 ? `${24 + keyboardInset}px` : undefined
                }}
            >
                <div className="mb-8 space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        Settings
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">
                        Appearance and API keys for each provider (stored securely; used server-side).
                    </p>
                </div>

                {feedback && (
                    <div
                        className={clsx(
                            'mb-6 rounded-xl border px-4 py-3 text-sm',
                            feedback.severity === 'success'
                            && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
                            feedback.severity === 'warning'
                            && 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
                            feedback.severity === 'error'
                            && 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100'
                        )}
                    >
                        <div className="flex justify-between gap-2">
                            <span>{feedback.message}</span>
                            <button
                                type="button"
                                className="shrink-0 text-xs font-medium underline opacity-80 hover:opacity-100"
                                onClick={() => setFeedback(null)}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                            <DollarSign className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                                Usage
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                Last 30 days
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                                Estimated API spend from chat usage, broken down by provider.
                            </p>
                        </div>
                    </div>

                    {spendingLoading ? (
                        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Loading spend…
                        </div>
                    ) : (
                        <>
                            {spendingError && (
                                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                                    {spendingError}
                                </p>
                            )}
                            <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-zinc-950/60">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                                    Total
                                </p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                                    $
                                    {formatDisplayedSpendingUsd(spending?.totalUsd || 0)}
                                </p>
                                {spending && (spending.estimatedTurns > 0) && (
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                        Includes
                                        {' '}
                                        {spending.estimatedTurns}
                                        {' '}
                                        estimated turn(s).
                                    </p>
                                )}
                            </div>

                            <ul className="mt-4 space-y-2">
                                {PROVIDER_CONFIG.map(({ id, label }) => {
                                    const amount = spending?.byProvider?.[id] || 0
                                    return (
                                        <li
                                            key={id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 px-3 py-2.5 dark:border-white/[0.08]"
                                        >
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <ProviderLogo provider={id} size={18} />
                                                <span className="truncate text-sm font-medium text-slate-800 dark:text-zinc-200">
                                                    {label}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-zinc-300">
                                                $
                                                {formatDisplayedSpendingUsd(amount)}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>

                            {!spendingError && spending?.chatsScanned > 0 && spending.totalUsd === 0 && (
                                <p className="mt-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                    No costs recorded yet for recent chats. Send a new message in each
                                    provider to start tracking, or deploy the latest cloud functions if
                                    usage data is missing from older turns.
                                </p>
                            )}

                            <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-zinc-500">
                                Based on stored message usage (tokens, cache, web search, and
                                documented surcharges). Totals include a 1% allowance for
                                untracked costs such as chat titles. Only turns with a recorded
                                cost in the last 30 days are included.
                            </p>
                        </>
                    )}
                </section>

                <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                        Appearance
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                        Theme
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                        Choose how FrugalGPT looks to you.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-100/80 p-1 dark:bg-zinc-800">
                        {[
                            { id: 'system', icon: Monitor, label: 'System' },
                            { id: 'light', icon: Sun, label: 'Light' },
                            { id: 'dark', icon: Moon, label: 'Dark' }
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => handleThemeChange(id)}
                                className={clsx(
                                    'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                                    theme === id
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {PROVIDER_CONFIG.map(({ id, label, placeholder }) => (
                    <section
                        key={id}
                        className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                            Provider
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                            {label}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                            API key used when you choose a model from this provider in chat.
                        </p>

                        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                            <span className="block">API key</span>
                            <div className="relative mt-1.5">
                                <Key className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={visibleKeys[id] ? 'text' : 'password'}
                                    autoComplete="off"
                                    value={providers[id].apiKey}
                                    onChange={(e) => setProviders((prev) => ({
                                        ...prev,
                                        [id]: { ...prev[id], apiKey: e.target.value }
                                    }))}
                                    placeholder={placeholder}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-[16px] text-slate-900 outline-none ring-brand-500/0 transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-zinc-950 dark:text-white sm:text-sm"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    onClick={() => setVisibleKeys((prev) => ({
                                        ...prev,
                                        [id]: !prev[id]
                                    }))}
                                    aria-label={visibleKeys[id] ? 'Hide key' : 'Show key'}
                                >
                                    {visibleKeys[id]
                                        ? <EyeOff className="h-4 w-4" />
                                        : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </label>

                        <div className="mt-4">
                            <button
                                type="button"
                                disabled={
                                    saving || !providers[id].apiKey?.trim()
                                }
                                onClick={() => handleDeleteProvider(id)}
                                className="w-full rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-400 sm:w-auto"
                            >
                                Clear
                                {' '}
                                {label}
                            </button>
                        </div>
                    </section>
                ))}

                <div className="sticky bottom-4 z-10 flex justify-center pb-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSaveAll}
                        className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save all changes'}
                    </button>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500 dark:text-zinc-500">
                    Keys are merged server-side; clearing a provider removes only that key.
                </p>
            </div>
        </div>
    )
}

export default User
