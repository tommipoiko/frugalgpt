import React, { useState } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { useNavigate, Link } from 'react-router-dom' // Import Link
import { auth } from '../services/firebase'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password)
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
            navigate(redirectTo || '/')
        } catch (err) {
            setError(err.message)
        }
    }

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
            navigate(redirectTo || '/')
        } catch (err) {
            setError(err.message)
        }
    }

    const redirectParam = new URLSearchParams(window.location.search).get('redirect')

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                Login
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            <TextField
                label="Email"
                variant="outlined"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
                Login
            </Button>
            <Typography align="center" variant="body2" gutterBottom style={{ marginTop: '20px' }}>
                OR
            </Typography>
            <Button variant="contained" color="error" fullWidth onClick={handleGoogleLogin}>
                Sign in with Google
            </Button>
            <Typography align="center" variant="body2" gutterBottom style={{ marginTop: '20px' }}>
                New here?
                {' '}
                <Link to={`/signin${redirectParam
                    ? `?redirect=${encodeURIComponent(redirectParam)}`
                    : ''}`}
                >
                    Create an account
                </Link>
            </Typography>
        </Container>
    )
}

export default Login
