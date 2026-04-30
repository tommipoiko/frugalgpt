import React, { useState } from 'react'
import {
    TextField, Button, Typography, Box, Paper, Alert
} from '@mui/material'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useNavigate, Link } from 'react-router-dom'
import { auth } from '../services/firebase'
import BrandMark from './Brand/BrandMark'
import { brandGradient } from '../theme'

function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    const handleSignUp = async () => {
        setError('')
        setMessage('')
        try {
            await createUserWithEmailAndPassword(auth, email, password)
            setMessage('Account created successfully!')
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
                        Create your account
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Bring your own OpenAI key and start chatting
                    </Typography>
                </Box>

                <Box sx={{ px: 4, py: 3.5 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {message && (
                        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                            {message}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleSignUp()
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
                            autoComplete="new-password"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{ mt: 0.5, py: 1.25 }}
                        >
                            Create account
                        </Button>
                    </Box>
                    <Typography
                        align="center"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 3 }}
                    >
                        Already have an account?
                        {' '}
                        <Link to="/signin" style={{ textDecoration: 'none' }}>
                            <Box
                                component="span"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    '&:hover': { textDecoration: 'underline' }
                                }}
                            >
                                Sign in
                            </Box>
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    )
}

export default Signup
