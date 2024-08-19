import React, { useState } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

function User() {
    const [apiKey, setApiKey] = useState('')
    const [message, setMessage] = useState('')

    const handleSave = async () => {
        if (auth.currentUser) {
            try {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    openaiKey: apiKey
                })
                setMessage('API Key saved successfully!')
            } catch (error) {
                setMessage(`Error saving API Key: ${error.message}`)
            }
        } else {
            setMessage('User not authenticated')
        }
    }

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                User Settings
            </Typography>
            <TextField
                label="OpenAI API Key"
                variant="outlined"
                fullWidth
                margin="normal"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
            <Button variant="contained" color="primary" fullWidth onClick={handleSave}>
                Save API Key
            </Button>
            {message && <Typography color="primary" style={{ marginTop: '20px' }}>{message}</Typography>}
        </Container>
    )
}

export default User
