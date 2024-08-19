import React, { useState, useEffect } from 'react'
import {
    TextField, Button, Container, Typography
} from '@mui/material'
import {
    doc, getDoc, setDoc, deleteDoc
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'

function User() {
    const [apiKey, setApiKey] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchApiKey = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setApiKey(docSnap.data().openaiKey || '')
                    setMessage('')
                } else {
                    setMessage('No API key found.')
                }
            } else {
                setMessage('User not authenticated')
            }
            setLoading(false)
        }

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchApiKey()
            } else {
                setLoading(false)
                setMessage('User not authenticated')
            }
        })

        return () => unsubscribe()
    }, [])

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

    const handleDelete = async () => {
        if (auth.currentUser) {
            try {
                await deleteDoc(doc(db, 'users', auth.currentUser.uid))
                setApiKey('')
                setMessage('API Key deleted successfully!')
            } catch (error) {
                setMessage(`Error deleting API Key: ${error.message}`)
            }
        } else {
            setMessage('User not authenticated')
        }
    }

    if (loading) {
        return (
            <Container maxWidth="sm">
                <Typography variant="h4" component="h1" gutterBottom>
                    Loading...
                </Typography>
            </Container>
        )
    }

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                User Settings
            </Typography>
            {message && <Typography color="primary" style={{ marginTop: '20px' }}>{message}</Typography>}
            <TextField
                label="OpenAI API Key"
                variant="outlined"
                fullWidth
                margin="normal"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
            <Button variant="contained" color="primary" fullWidth onClick={handleSave} style={{ marginTop: '20px' }}>
                Save API Key
            </Button>
            <Button variant="contained" color="secondary" fullWidth onClick={handleDelete} style={{ marginTop: '10px' }}>
                Delete API Key
            </Button>
        </Container>
    )
}

export default User
