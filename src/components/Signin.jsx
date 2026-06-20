import React, { useEffect, useState } from 'react'
import {
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'
import BrandMark from './Brand/BrandMark'
import { brandGradient } from '../theme'
import useKeyboardOverlapBottom from '../hooks/useKeyboardOverlapBottom'

const EMAIL_FOR_SIGN_IN_KEY = 'frugalGptEmailForSignIn'

function Signin() {
    const keyboardInset = useKeyboardOverlapBottom()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [linkSent, setLinkSent] = useState(false)
    const [completingLink, setCompletingLink] = useState(
        () => isSignInWithEmailLink(auth, window.location.href)
    )
    const navigate = useNavigate()
    const redirectParam = new URLSearchParams(window.location.search).get('redirect')

    useEffect(() => {
        const completeEmailLinkSignIn = async () => {
            if (!isSignInWithEmailLink(auth, window.location.href)) return

            setCompletingLink(true)
            setError('')

            let emailForSignIn = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY)
            if (!emailForSignIn) {
                emailForSignIn = window.prompt('Please enter your email to confirm sign-in')
            }
            if (!emailForSignIn) {
                setError('Email is required to complete sign-in')
                setCompletingLink(false)
                return
            }

            try {
                await signInWithEmailLink(auth, emailForSignIn, window.location.href)
                window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY)
                navigate(redirectParam || '/')
            } catch (err) {
                setError(err.message)
                setCompletingLink(false)
            }
        }

        completeEmailLinkSignIn()
    }, [navigate, redirectParam])

    const handleEmailLinkSignin = async () => {
        setError('')
        setLinkSent(false)

        const continueUrl = new URL('/signin', window.location.origin)
        if (redirectParam) {
            continueUrl.searchParams.set('redirect', redirectParam)
        }

        const actionCodeSettings = {
            url: continueUrl.toString(),
            handleCodeInApp: true
        }

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings)
            window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email)
            setLinkSent(true)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleGoogleSignin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            navigate(redirectParam || '/')
        } catch (err) {
            setError(err.message)
        }
    }

    const pb = `${32 + keyboardInset}px`

    return (
        <div
            className="flex flex-1 min-h-0 w-full max-w-full flex-col items-center justify-center overflow-auto scroll-smooth [-webkit-overflow-scrolling:touch]"
            style={{
                paddingTop: '32px',
                paddingBottom: pb,
                scrollPaddingBottom: keyboardInset ? `${keyboardInset + 24}px` : undefined
            }}
        >
            <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-zinc-900">
                <div
                    className="flex flex-col gap-2 px-8 py-8 text-white"
                    style={{ backgroundImage: brandGradient }}
                >
                    <BrandMark size={32} showWordmark={false} />
                    <h1 className="text-xl font-bold">Welcome back</h1>
                    <p className="text-sm opacity-90">Sign in to continue your conversations</p>
                </div>

                <div className="px-8 py-8">
                    {error && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                            {error}
                        </div>
                    )}
                    {linkSent && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                            Check your inbox for a sign-in link. It may take a minute to arrive.
                        </div>
                    )}
                    {completingLink ? (
                        <p className="text-center text-sm text-slate-600 dark:text-zinc-400">
                            Completing sign-in…
                        </p>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleGoogleSignin}
                                className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-slate-200 py-3 text-sm font-semibold dark:border-white/10"
                            >
                                <span className="font-bold text-blue-600">G</span>
                                Continue with Google
                            </button>
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                                    <span className="bg-white px-2 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
                                        OR
                                    </span>
                                </div>
                            </div>
                            <form
                                className="flex flex-col gap-4"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    handleEmailLinkSignin()
                                }}
                            >
                                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                                    <span className="block">Email</span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base dark:border-white/10 dark:bg-zinc-800"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    className="mt-1 w-full rounded-[10px] py-3 text-base font-semibold text-white"
                                    style={{ backgroundImage: brandGradient }}
                                >
                                    Email me a sign-in link
                                </button>
                            </form>
                            <p className="mt-8 text-center text-sm text-slate-600 dark:text-zinc-400">
                                New here? Enter your email and we&apos;ll create your account when you
                                {' '}
                                open the link.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Signin
