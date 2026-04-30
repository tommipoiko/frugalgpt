import React, { useEffect, useState } from 'react'
import {
    TextField, Button, Typography, Box, Paper, Divider, Alert
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { useNavigate, Link } from 'react-router-dom'
import { auth } from '../services/firebase'
import BrandMark from './Brand/BrandMark'
import { brandGradient } from '../theme'

function Signin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const redirectParam = new URLSearchParams(window.location.search).get('redirect')

    useEffect(() => {
        if (redirectParam) {
            setError('You need to sign in to access this page')
        }
    }, [redirectParam])

    const handleSignin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password)
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
            navigate(redirectTo || '/')
        } catch (err) {
            setError(err.message)
        }
    }

    const handleGoogleSignin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
            navigate(redirectTo || '/')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 64px)',
                px: 2,
                py: 4
            }}
        >
            <Paper
                elevation={0}
                variant="outlined"
                sx={{
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 4,
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        backgroundImage: brandGradient,
                        color: '#fff',
                        px: 4,
                        py: 3.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                    }}
                >
                    <BrandMark size={32} wordmarkVariant="h6" showWordmark={false} />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Welcome back
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Sign in to continue your conversations
                    </Typography>
                </Box>

                <Box sx={{ px: 4, py: 3.5 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleSignin()
                        }}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{ mt: 0.5, py: 1.25 }}
                        >
                            Sign in
                        </Button>
                    </Box>
                    <Divider sx={{ my: 2.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            OR
                        </Typography>
                    </Divider>
                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<GoogleIcon />}
                        onClick={handleGoogleSignin}
                        sx={{ py: 1.1 }}
                    >
                        Continue with Google
                    </Button>
                    <Typography
                        align="center"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 3 }}
                    >
                        New here?
                        {' '}
                        <Link
                            to={`/signup${redirectParam
                                ? `?redirect=${encodeURIComponent(redirectParam)}`
                                : ''}`}
                            style={{
                                color: 'inherit',
                                fontWeight: 600,
                                textDecoration: 'none'
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    color: 'primary.main',
                                    '&:hover': { textDecoration: 'underline' }
                                }}
                            >
                                Create an account
                            </Box>
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    )
}

export default Signin
