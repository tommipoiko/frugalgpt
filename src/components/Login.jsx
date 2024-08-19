import React, { useState } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import {
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth'
import { auth } from '../services/firebase'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleSignUp = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                Login or Sign Up
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
            <Button variant="contained" color="secondary" fullWidth onClick={handleSignUp} style={{ marginTop: '10px' }}>
                Sign Up
            </Button>
            <Typography align="center" variant="body2" gutterBottom style={{ marginTop: '20px' }}>
                OR
            </Typography>
            <Button variant="contained" color="error" fullWidth onClick={handleGoogleLogin}>
                Sign in with Google
            </Button>
        </Container>
    )
}

export default Login
