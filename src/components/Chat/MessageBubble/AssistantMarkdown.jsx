import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import CodeBlock from './CodeBlock'
import { handleExternalLinkClick } from '../../../utils/openExternalLink'

const markdownComponents = {
    h1: ({ children }) => (
        <h1 className="mb-3 mt-5 text-xl font-bold tracking-tight text-slate-900 first:mt-0 dark:text-zinc-50">
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="mb-2 mt-5 text-lg font-semibold tracking-tight text-slate-900 first:mt-0 dark:text-zinc-50">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0 dark:text-zinc-100">
            {children}
        </h3>
    ),
    h4: ({ children }) => (
        <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-800 first:mt-0 dark:text-zinc-200">
            {children}
        </h4>
    ),
    h5: ({ children }) => (
        <h5 className="mb-1 mt-3 text-sm font-semibold text-slate-800 first:mt-0 dark:text-zinc-200">
            {children}
        </h5>
    ),
    h6: ({ children }) => (
        <h6 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600 first:mt-0 dark:text-zinc-400">
            {children}
        </h6>
    ),
    p: ({ children }) => (
        <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
    ),
    strong: ({ children }) => (
        <strong className="font-semibold text-slate-900 dark:text-zinc-50">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => (
        <del className="text-slate-500 dark:text-zinc-500">{children}</del>
    ),
    hr: () => (
        <hr className="my-5 border-0 border-t border-slate-200 dark:border-white/10" />
    ),
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline border-b border-brand-500/40 font-medium text-brand-600 no-underline hover:border-brand-500 dark:text-brand-400"
            onClick={(event) => handleExternalLinkClick(event, href)}
        >
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-4 border-l-[3px] border-slate-200 pl-4 text-slate-600 dark:border-zinc-600 dark:text-zinc-400">
            {children}
        </blockquote>
    ),
    ul: ({ children }) => (
        <ul className="my-3 list-disc space-y-1 pl-6 marker:text-slate-400 dark:marker:text-zinc-500">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="my-3 list-decimal space-y-1 pl-6 marker:text-slate-500 dark:marker:text-zinc-400">
            {children}
        </ol>
    ),
    li: ({ children, className }) => (
        <li className={className}>{children}</li>
    ),
    input: ({ type, checked, disabled }) => {
        if (type === 'checkbox') {
            return (
                <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    disabled={disabled ?? true}
                    className="mr-2 align-middle accent-brand-500"
                />
            )
        }
        return <input type={type} checked={checked} disabled={disabled} readOnly />
    },
    table: ({ children }) => (
        <div className="my-4 overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.10]">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-slate-50 dark:bg-white/[0.04]">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
        <tr className="border-b border-slate-200/80 last:border-b-0 dark:border-white/[0.08]">
            {children}
        </tr>
    ),
    th: ({ children, align }) => (
        <th
            align={align}
            className="px-3 py-2.5 font-semibold text-slate-800 dark:text-zinc-100"
        >
            {children}
        </th>
    ),
    td: ({ children, align }) => (
        <td
            align={align}
            className="px-3 py-2.5 align-top text-slate-700 dark:text-zinc-300"
        >
            {children}
        </td>
    ),
    img: ({ src, alt, title }) => (
        <img
            src={src}
            alt={alt || ''}
            title={title}
            loading="lazy"
            className="my-3 max-w-full rounded-xl border border-slate-200/80 dark:border-white/[0.10]"
        />
    ),
    pre: ({ children }) => children,
    code: CodeBlock
}

function AssistantMarkdown({ content }) {
    return (
        <div className="assistant-markdown min-w-0 [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex]:text-[1.05em]">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

export default AssistantMarkdown
