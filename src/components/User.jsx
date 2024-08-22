import React, { useState, useEffect } from 'react'
import {
    TextField, Button, Container, Typography, Card, CardContent, Grid, FormControl,
    InputLabel, Select, MenuItem
} from '@mui/material'
import {
    doc, getDoc, setDoc, deleteDoc
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'

function User({ setMode }) {
    const [apiKey, setApiKey] = useState('')
    const [message, setMessage] = useState('')
    const [theme, setTheme] = useState('system')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserSettings = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const userData = docSnap.data()
                    setApiKey(userData.openaiKey || '')
                    setTheme(userData.theme || 'system')
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
                fetchUserSettings()
            } else {
                setLoading(false)
                setMessage('User not authenticated')
            }
        })

        return () => unsubscribe()
    }, [])

    const handleSaveApiKey = async () => {
        if (auth.currentUser) {
            try {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    openaiKey: apiKey
                }, { merge: true })
                setMessage('API Key saved successfully!')
            } catch (error) {
                setMessage(`Error saving API Key: ${error.message}`)
            }
        } else {
            setMessage('User not authenticated')
        }
    }

    const handleDeleteApiKey = async () => {
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

    const handleThemeChange = async (event) => {
        const selectedTheme = event.target.value
        setTheme(selectedTheme)
        setMode(selectedTheme)
        if (auth.currentUser) {
            try {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    theme: selectedTheme
                }, { merge: true })
                setMessage('Theme preference saved successfully!')
            } catch (error) {
                setMessage(`Error saving theme preference: ${error.message}`)
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

            <Card style={{ marginBottom: '20px' }}>
                <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Theme Preference
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Theme</InputLabel>
                        <Select
                            value={theme}
                            label="Theme"
                            onChange={handleThemeChange}
                        >
                            <MenuItem value="system">System Default</MenuItem>
                            <MenuItem value="light">Light Mode</MenuItem>
                            <MenuItem value="dark">Dark Mode</MenuItem>
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                        OpenAI API Key
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={8}>
                            <TextField
                                label="OpenAI API Key"
                                variant="outlined"
                                fullWidth
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <Button variant="contained" color="primary" fullWidth onClick={handleSaveApiKey}>
                                Save
                            </Button>
                            <Button variant="contained" color="secondary" fullWidth onClick={handleDeleteApiKey} style={{ marginTop: '10px' }}>
                                Delete
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    )
}

export default User
