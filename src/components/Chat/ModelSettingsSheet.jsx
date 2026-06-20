import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import ProviderLogo from '../Brand/ProviderLogo'
import { getChatModelEntry } from '../../constants/availableModels'

function ModelSettingsSheet({
    open,
    onClose,
    isMobile,
    draftModelKey,
    onDraftModelChange,
    draftReasoning,
    onDraftReasoningChange,
    draftWebSearch,
    onDraftWebSearchChange,
    onApply,
    readOnly = false,
    entry = null,
    /** Allowed catalog rows for this user */
    models
}) {
    useEffect(() => {
        if (!open) return undefined
        const handler = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    const draftEntry = entry || getChatModelEntry(draftModelKey)
    const showReasoningToggle = draftEntry.reasoningMode === 'toggle'
    const showWebToggle = draftEntry.webSearch === true

    const panelClassName = clsx(
        'flex flex-col bg-[#f7f7f8] shadow-2xl dark:bg-[#0b0b0f]',
        'w-full max-w-[min(920px,calc(100vw-2rem))]',
        isMobile
            ? 'h-[min(85vh,720px)] rounded-t-2xl border border-slate-200/80 pb-[max(12px,env(safe-area-inset-bottom,0px))] dark:border-white/[0.08]'
            : 'max-h-[min(640px,90vh)] rounded-2xl border border-slate-200/80 dark:border-white/[0.08]'
    )

    const panel = (
        <div className={panelClassName}>
            <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                <div>
                    <h2 id="model-sheet-title" className="text-base font-semibold text-slate-900 dark:text-white">
                        Chat model
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {readOnly ? 'View active model settings for this chat.' : 'Choose a model and tools for this chat.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                        Model
                    </span>
                    <div className="mt-1.5 flex items-center gap-2.5">
                        <ProviderLogo provider={draftEntry.provider} size={22} />
                        {readOnly ? (
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                                    {draftEntry.label}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">
                                    {draftEntry.providerLabel || draftEntry.provider}
                                    {' · '}
                                    {draftEntry.apiModelId}
                                </p>
                            </div>
                        ) : (
                            <select
                                value={draftModelKey}
                                disabled={models.length === 0}
                                onChange={(e) => onDraftModelChange(e.target.value)}
                                className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 dark:border-white/[0.12] dark:bg-zinc-900 dark:text-zinc-100"
                            >
                                {models.map((m) => (
                                    <option key={m.key} value={m.key}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    {readOnly && draftEntry.isLegacy && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                            This model is no longer listed in FrugalGPT, but this chat keeps using
                            the saved API model id.
                        </p>
                    )}
                    {models.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                            Add an API key for at least one provider in settings to use models.
                        </p>
                    )}
                </label>

                {showReasoningToggle && (
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-zinc-900">
                        <span className="text-sm font-medium text-slate-800 dark:text-zinc-100">
                            Reasoning
                        </span>
                        <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-brand-600"
                            checked={draftReasoning}
                            disabled={readOnly}
                            onChange={(e) => onDraftReasoningChange(e.target.checked)}
                        />
                    </label>
                )}

                {showWebToggle && (
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-zinc-900">
                        <span className="text-sm font-medium text-slate-800 dark:text-zinc-100">
                            Web browsing
                        </span>
                        <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-brand-600"
                            checked={draftWebSearch}
                            disabled={readOnly}
                            onChange={(e) => onDraftWebSearchChange(e.target.checked)}
                        />
                    </label>
                )}

                {readOnly && (
                    <p className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/[0.10] dark:bg-zinc-900 dark:text-zinc-300">
                        Existing chats are locked to their original model/settings for consistency.
                    </p>
                )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-slate-200/70 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                {readOnly ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                        Close
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200/90 py-2.5 text-sm font-semibold text-slate-800 hover:bg-black/[0.03] dark:border-white/[0.12] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onApply}
                            disabled={models.length === 0}
                            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <div
                className="fixed inset-0 z-[1400] flex flex-col bg-black/50"
                role="dialog"
                aria-modal="true"
                aria-labelledby="model-sheet-title"
            >
                <button
                    type="button"
                    className="absolute inset-0 z-0 cursor-default"
                    aria-label="Dismiss overlay"
                    onClick={onClose}
                />
                <div className="relative z-10 flex min-h-0 flex-1 items-end justify-center px-2 pt-[env(safe-area-inset-top)]">
                    {panel}
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/45 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-sheet-title"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Dismiss overlay"
                onClick={onClose}
            />
            <div className="relative z-10 flex w-full justify-center">
                {panel}
            </div>
        </div>
    )
}

export default ModelSettingsSheet
