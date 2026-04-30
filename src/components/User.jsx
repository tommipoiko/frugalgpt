import React, { useState, useEffect, useCallback } from 'react'
import {
    TextField, Button, Container, Typography, Card, CardContent, Box,
    ToggleButton, ToggleButtonGroup, Stack, Alert, IconButton, InputAdornment,
    CircularProgress, Divider, FormControl, InputLabel, Select, MenuItem
} from '@mui/material'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import SettingsBrightnessRoundedIcon from '@mui/icons-material/SettingsBrightnessRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import KeyRoundedIcon from '@mui/icons-material/KeyRounded'
import {
    doc, getDoc, setDoc
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import chatApi from '../services/chatApi'

function User({ setMode }) {
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [selectedModel, setSelectedModel] = useState('gpt-5')
    const [availableModels, setAvailableModels] = useState([])
    const [modelsLoading, setModelsLoading] = useState(false)
    const [feedback, setFeedback] = useState(null)
    const [theme, setTheme] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const loadAvailableModels = useCallback(async (currentSelectedModel = 'gpt-5') => {
        if (!auth.currentUser) return
        setModelsLoading(true)
        try {
            const payload = await chatApi.fetchAvailableModels()
            const models = payload.models || []
            setAvailableModels(models)
            const modelIds = models.map((model) => model.id)
            if (!modelIds.includes(currentSelectedModel)) {
                setSelectedModel(payload.defaultModel || 'gpt-5')
            }
        } catch (error) {
            setAvailableModels([])
            setFeedback({
                severity: 'warning',
                message: error.message || 'Could not load model list.'
            })
        } finally {
            setModelsLoading(false)
        }
    }, [])

    useEffect(() => {
        const fetchUserSettings = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const userData = docSnap.data()
                    if (userData.openAi) {
                        const savedApiKey = userData.openAi.openaiKey || ''
                        setApiKey(savedApiKey)
                        const savedModel = userData.openAi.model || 'gpt-5'
                        setSelectedModel(savedModel)
                        if (savedApiKey) {
                            await loadAvailableModels(savedModel)
                        }
                    }
                }
            }
            setLoading(false)
        }

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchUserSettings()
            } else {
                setLoading(false)
                setFeedback({ severity: 'warning', message: 'You are not signed in.' })
            }
        })

        return () => unsubscribe()
    }, [loadAvailableModels])

    const handleSaveApiSettings = async () => {
        if (!auth.currentUser) {
            setFeedback({ severity: 'warning', message: 'User not authenticated' })
            return
        }
        setSaving(true)
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                openAi: { openaiKey: apiKey, model: selectedModel || 'gpt-5' }
            }, { merge: true })
            setFeedback({ severity: 'success', message: 'OpenAI settings saved.' })
            await loadAvailableModels(selectedModel || 'gpt-5')
        } catch (error) {
            setFeedback({ severity: 'error', message: `Error saving settings: ${error.message}` })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteApiKey = async () => {
        if (!auth.currentUser) {
            setFeedback({ severity: 'warning', message: 'User not authenticated' })
            return
        }
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                openAi: {}
            }, { merge: true })
            setApiKey('')
            setSelectedModel('gpt-5')
            setAvailableModels([])
            setFeedback({ severity: 'success', message: 'API key deleted.' })
        } catch (error) {
            setFeedback({ severity: 'error', message: `Error deleting API key: ${error.message}` })
        }
    }

    const handleThemeChange = (_event, value) => {
        if (!value) return
        setTheme(value)
        setMode(value)
        localStorage.setItem('frugalGptTheme', value)
    }

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 8
            }}
            >
                <CircularProgress size={24} />
            </Box>
        )
    }

    return (
        <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
            <Stack spacing={1} sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your appearance and OpenAI API access.
                </Typography>
            </Stack>

            {feedback && (
                <Alert
                    severity={feedback.severity}
                    onClose={() => setFeedback(null)}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    {feedback.message}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Typography
                        variant="overline"
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Appearance
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Theme
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Choose how FrugalGPT looks to you.
                    </Typography>
                    <ToggleButtonGroup
                        value={theme}
                        exclusive
                        onChange={handleThemeChange}
                        sx={{
                            width: '100%',
                            '& .MuiToggleButton-root': {
                                flex: 1,
                                gap: 1,
                                py: 1.25,
                                textTransform: 'none',
                                fontWeight: 500
                            }
                        }}
                    >
                        <ToggleButton value="system">
                            <SettingsBrightnessRoundedIcon fontSize="small" />
                            System
                        </ToggleButton>
                        <ToggleButton value="light">
                            <LightModeRoundedIcon fontSize="small" />
                            Light
                        </ToggleButton>
                        <ToggleButton value="dark">
                            <DarkModeRoundedIcon fontSize="small" />
                            Dark
                        </ToggleButton>
                    </ToggleButtonGroup>
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Typography
                        variant="overline"
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Account
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        OpenAI API key & model
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Your key is stored securely and used server-side for calls.
                    </Typography>
                    <TextField
                        fullWidth
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <KeyRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowKey((prev) => !prev)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showKey
                                            ? <VisibilityOffOutlinedIcon fontSize="small" />
                                            : <VisibilityOutlinedIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <FormControl
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={modelsLoading || !apiKey.trim()}
                    >
                        <InputLabel id="model-select-label">Model</InputLabel>
                        <Select
                            labelId="model-select-label"
                            label="Model"
                            value={selectedModel}
                            onChange={(event) => setSelectedModel(event.target.value)}
                        >
                            {availableModels.length === 0 && (
                                <MenuItem value="gpt-5">gpt-5</MenuItem>
                            )}
                            {availableModels.map((model) => (
                                <MenuItem key={model.id} value={model.id}>
                                    {model.id}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Divider sx={{ my: 2.5 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                        <Button
                            variant="contained"
                            onClick={handleSaveApiSettings}
                            disabled={saving || apiKey.trim() === ''}
                            sx={{ flex: 1 }}
                        >
                            {saving ? 'Saving...' : 'Save settings'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDeleteApiKey}
                            disabled={saving || apiKey.trim() === ''}
                            sx={{ flex: 1 }}
                        >
                            Delete
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Container>
    )
}

export default User
