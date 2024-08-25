import React, { useState, useEffect } from 'react'
import {
    TextField, Button, Container, Typography, Card, CardContent, Grid, FormControl,
    Select, MenuItem
} from '@mui/material'
import {
    doc, getDoc, setDoc
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'

function User({ setMode }) {
    const [apiKey, setApiKey] = useState('')
    const [assistantId, setAssistantId] = useState('')
    const [message, setMessage] = useState('')
    const [theme, setTheme] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserSettings = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const userData = docSnap.data()
                    if (userData.openAi) {
                        setApiKey(userData.openAi.openaiKey || '')
                        setAssistantId(userData.openAi.assistantId || '')
                    }
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
                    openAi: {
                        openaiKey: apiKey,
                        assistantId
                    }
                }, { merge: true })
                setMessage('API Key and Assistant ID saved successfully!')
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
                await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    openAi: {}
                }, { merge: true })
                setApiKey('')
                setAssistantId('')
                setMessage('API Key and Assistant ID deleted successfully!')
            } catch (error) {
                setMessage(`Error deleting API Key: ${error.message}`)
            }
        } else {
            setMessage('User not authenticated')
        }
    }

    const handleThemeChange = (event) => {
        const selectedTheme = event.target.value
        setTheme(selectedTheme)
        setMode(selectedTheme)
        localStorage.setItem('frugalGptTheme', selectedTheme)
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

            <div style={{ minHeight: '25px' }}>
                {message && (
                    <Typography color={message.includes('Error') ? 'error' : 'primary'}>
                        {message}
                    </Typography>
                )}
            </div>

            <Card style={{ marginBottom: '20px' }}>
                <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Theme Preference
                    </Typography>
                    <FormControl fullWidth>
                        <Select
                            value={theme}
                            onChange={handleThemeChange}
                            variant="outlined"
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
                        OpenAI API settings
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={8}>
                            <TextField
                                label="OpenAI API Key"
                                variant="outlined"
                                fullWidth
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                style={{ marginBottom: '10px' }}
                            />
                            <TextField
                                label="Assistant ID"
                                variant="outlined"
                                fullWidth
                                value={assistantId}
                                onChange={(e) => setAssistantId(e.target.value)}
                            />
                        </Grid>
                        <Grid
                            item
                            xs={4}
                            container
                            direction="column"
                            justifyContent="center"
                            spacing={2}
                        >
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={handleSaveApiKey}
                                >
                                    Save
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    onClick={handleDeleteApiKey}
                                >
                                    Delete
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    )
}

export default User
