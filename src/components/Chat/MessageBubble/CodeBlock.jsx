import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Copy, Check } from 'lucide-react'

function CodeBlock({
    className, children, ...props
}) {
    const [copied, setCopied] = useState(false)
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : 'text'
    const code = String(children).replace(/\n$/, '')
    const isBlock = Boolean(match) || code.includes('\n')

    const handleCopied = () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
    }

    if (!isBlock) {
        return (
            <code
                className="rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-white/[0.08] dark:text-zinc-200"
                {...props}
            >
                {children}
            </code>
        )
    }

    return (
        <div className="my-4 overflow-hidden rounded-xl border border-slate-200/80 bg-[#1e1e2e] dark:border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.05] px-3 py-2">
                <span className="font-mono text-[0.75rem] tracking-wide text-white/70">
                    {language}
                </span>
                <CopyToClipboard text={code} onCopy={handleCopied}>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-white/75 transition hover:bg-white/10"
                        title={copied ? 'Copied' : 'Copy'}
                    >
                        {copied
                            ? <Check className="h-4 w-4 text-emerald-300" />
                            : <Copy className="h-4 w-4" />}
                    </button>
                </CopyToClipboard>
            </div>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '14px 16px',
                    overflowX: 'auto',
                    background: 'transparent',
                    fontSize: '0.82rem',
                    lineHeight: 1.55
                }}
                {...props}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    )
}

export default CodeBlock
