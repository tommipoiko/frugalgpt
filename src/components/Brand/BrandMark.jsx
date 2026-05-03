import React from 'react'
import clsx from 'clsx'
import { brandGradient } from '../../theme'

function BrandMark({
    size = 28,
    showWordmark = true,
    wordmarkClassName = 'text-xl font-bold tracking-tight'
}) {
    return (
        <div className="flex items-center gap-2.5">
            <div
                className="relative shrink-0 rounded-xl shadow-[0_6px_20px_-6px_rgba(16,185,129,0.55)] overflow-hidden"
                style={{
                    width: size,
                    height: size,
                    backgroundImage: brandGradient
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 55%)'
                    }}
                />
            </div>
            {showWordmark && (
                <span
                    className={clsx(
                        wordmarkClassName,
                        'bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 via-emerald-500 to-emerald-400'
                    )}
                    style={{ WebkitBackgroundClip: 'text' }}
                >
                    FrugalGPT
                </span>
            )}
        </div>
    )
}

export default BrandMark
