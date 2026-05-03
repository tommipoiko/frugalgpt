import React from 'react'
import { Sparkles } from 'lucide-react'

function ThinkingIndicator({ text }) {
    return (
        <div
            className="inline-flex max-w-full items-center gap-3 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-2 dark:border-brand-400/25 dark:bg-brand-500/10"
        >
            <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-sm shadow-brand-500/30">
                <Sparkles className="h-3 w-3" aria-hidden />
            </div>
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Thinking
            </span>
            {text && (
                <span className="max-w-[min(480px,100%)] truncate text-sm italic text-slate-600 dark:text-zinc-400">
                    {text}
                </span>
            )}
        </div>
    )
}

export default ThinkingIndicator
