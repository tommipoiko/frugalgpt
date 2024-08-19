import React, { useEffect, useState } from 'react'
import {
    Route, Routes, useNavigate
} from 'react-router-dom'
import {
    AppBar, Toolbar, Typography, Button, Container
} from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import useMediaQuery from '@mui/material/useMediaQuery'
import createTheme from '@mui/material/styles/createTheme'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import Login from './components/Login'
import User from './components/User'

function Home() {
    return (
        <Container>
            <Typography variant="h2" component="h1" gutterBottom>
                Welcome to FrugalGPT
            </Typography>
            <Typography variant="body1">
                Start building your frugal solutions with AI-powered guidance.
            </Typography>
        </Container>
    )
}

function About() {
    return (
        <Container>
            <Typography variant="h2" component="h1" gutterBottom>
                About FrugalGPT
            </Typography>
            <Typography variant="body1">
                FrugalGPT is a platform that helps you optimize your resources with AI.
            </Typography>
        </Container>
    )
}

function App() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const theme = React.useMemo(() => createTheme({
        palette: {
            mode: prefersDarkMode ? 'dark' : 'light'
        }
    }), [prefersDarkMode])

    const [user, setUser] = useState(null)
    const auth = getAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })

        return () => unsubscribe()
    }, [auth])

    const handleUserClick = () => {
        navigate('/user')
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        FrugalGPT
                    </Typography>
                    {user ? (
                        <Button color="inherit" onClick={handleUserClick}>
                            {user.displayName?.split(' ')[0] || 'User'}
                        </Button>
                    ) : (
                        <Button color="inherit" href="/login">
                            Login
                        </Button>
                    )}
                </Toolbar>
            </AppBar>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/user" element={<User />} />
            </Routes>
        </ThemeProvider>
    )
}

export default App
