import React from 'react'
import { Sparkles, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import CodeBlock from './CodeBlock'
import Sources from '../Sources'

function MessageBubble({ message }) {
    const isUser = message.role === 'user'

    if (isUser) {
        return (
            <div
                className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[4px] bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 px-4 py-3 text-white shadow-lg shadow-brand-500/20"
            >
                {!!message.content?.trim() && (
                    <p className="text-[0.95rem] leading-relaxed">{message.content}</p>
                )}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                        {message.attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className="inline-flex items-center gap-2 text-[0.8rem] opacity-90"
                            >
                                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {attachment.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex w-full max-w-full items-start gap-3">
            <div
                className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/25"
            >
                <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 break-words text-[0.95rem] leading-relaxed text-slate-900 dark:text-zinc-100 [&_a]:border-b [&_a]:border-brand-500/40 [&_a]:text-brand-600 [&_a]:no-underline hover:[&_a]:border-brand-500 dark:[&_a]:text-brand-400 [&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:text-zinc-400 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_li]:mb-1 [&_ol]:my-2 [&_ol]:pl-6 [&_p]:mb-3 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:pl-6 [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-slate-100 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] dark:[&_:not(pre)>code]:bg-white/[0.08]">
                {message.content
                    ? (
                        <ReactMarkdown components={{ code: CodeBlock }}>
                            {message.content}
                        </ReactMarkdown>
                    )
                    : (
                        <div className="flex gap-1.5 py-2">
                            {[0, 1, 2].map((dot) => (
                                <span
                                    key={dot}
                                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 opacity-40 dark:bg-zinc-500"
                                    style={{ animationDelay: `${dot * 0.18}s` }}
                                />
                            ))}
                        </div>
                    )}
                {Array.isArray(message.sources) && message.sources.length > 0 && (
                    <Sources sources={message.sources} />
                )}
            </div>
        </div>
    )
}

export default MessageBubble
