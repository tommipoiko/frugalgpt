import React, { useState } from 'react'
import { Link2, ArrowLeft } from 'lucide-react'
import { handleExternalLinkClick } from '../../utils/openExternalLink'

const getDomain = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch (e) {
        return url
    }
}

const getFaviconUrl = (url) => {
    try {
        const u = new URL(url)
        return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
    } catch (e) {
        return null
    }
}

function SourceChips({ sources }) {
    return (
        <div className="flex flex-row flex-wrap gap-2">
            {sources.map((source, index) => {
                const domain = getDomain(source.url)
                const favicon = getFaviconUrl(source.url)
                return (
                    <button
                        type="button"
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${source.url}-${index}`}
                        className="flex max-w-[min(320px,100%)] items-center gap-2 rounded-xl border border-slate-200/90 px-3 py-2 text-left text-inherit no-underline transition hover:border-brand-500 dark:border-white/[0.08]"
                        onClick={(event) => handleExternalLinkClick(event, source.url)}
                    >
                        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-white/[0.06]">
                            {favicon ? (
                                <img src={favicon} alt="" className="h-4 w-4" />
                            ) : (
                                <Link2 className="h-3.5 w-3.5 text-slate-500" />
                            )}
                        </span>
                        <span className="min-w-0 leading-tight">
                            <span
                                className="block truncate text-xs font-semibold text-slate-900 dark:text-zinc-100"
                                title={source.title || domain}
                            >
                                {source.title || domain}
                            </span>
                            <span
                                className="block truncate text-[0.7rem] text-slate-500 dark:text-zinc-400"
                            >
                                {domain}
                            </span>
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

function Sources({ sources }) {
    const [expanded, setExpanded] = useState(false)

    if (!sources || sources.length === 0) return null

    return (
        <div className="mt-4">
            {!expanded ? (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:border-brand-500 dark:border-white/[0.12] dark:text-zinc-100"
                >
                    <Link2 className="h-4 w-4" aria-hidden />
                    {`Sources (${sources.length})`}
                </button>
            ) : (
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-white/[0.08] dark:bg-zinc-900/80">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-zinc-300"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Back to chat
                        </button>
                        <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-zinc-500">
                            {sources.length}
                            {' '}
                            sources
                        </span>
                    </div>
                    <SourceChips sources={sources} />
                </div>
            )}
        </div>
    )
}

export default Sources
