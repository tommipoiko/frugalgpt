import React, { useState } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import {
    signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth'
import { auth } from '../services/firebase'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password)
            alert('Logged in successfully!')
        } catch (err) {
            setError(err.message)
        }
    }

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            const result = await signInWithPopup(auth, provider)
            const credential = GoogleAuthProvider.credentialFromResult(result)
            // eslint-disable-next-line no-unused-vars
            const token = credential.accessToken
            const { user } = result
            alert(`Logged in as ${user.displayName}`)
        } catch (err) {
            setError(err.message)
        }
    }

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
            <Typography align="center" variant="body2" gutterBottom>
                OR
            </Typography>
            <Button variant="contained" color="secondary" fullWidth onClick={handleGoogleLogin}>
                Sign in with Google
            </Button>
        </Container>
    )
}

export default Login
