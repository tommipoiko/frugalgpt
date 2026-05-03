import React from 'react'
import { Sparkles } from 'lucide-react'

function EmptyState() {
    return (
        <div className="flex w-full flex-col items-center justify-center gap-10 px-2 py-12 sm:py-16">
            <div className="text-center">
                <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-xl shadow-brand-500/30"
                >
                    <Sparkles className="h-7 w-7" aria-hidden />
                </div>
                <h2
                    className="mb-2 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl"
                >
                    How can I help today?
                </h2>
                <p className="text-base text-slate-600 dark:text-zinc-400">
                    Ask anything. I can search the web for the latest information when your provider supports it.
                </p>
            </div>
        </div>
    )
}

export default EmptyState
