import React, { useState } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'

function Signin() {
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
            navigate('/')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                Create a New Account
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            {message && <Typography color="primary">{message}</Typography>}
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
            <Button variant="contained" color="primary" fullWidth onClick={handleSignUp} style={{ marginTop: '20px' }}>
                Sign Up
            </Button>
        </Container>
    )
}

export default Signin
