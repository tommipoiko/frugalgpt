import React, { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import {
    AppBar, Toolbar, Typography, Button, Container, Menu, MenuItem, IconButton, CssBaseline
} from '@mui/material'
import AccountCircle from '@mui/icons-material/AccountCircle'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './services/firebase'
import Login from './components/Login'
import User from './components/User'
import Signin from './components/Signin'

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
    const [user, setUser] = useState(null)
    const [anchorEl, setAnchorEl] = useState(null)
    const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'system')
    const auth = getAuth()
    const navigate = useNavigate()
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                const docRef = doc(db, 'users', currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const userTheme = docSnap.data().theme || 'system'
                    setMode(userTheme)
                    localStorage.setItem('theme', userTheme)
                }
            }
        })

        return () => unsubscribe()
    }, [auth])

    const getThemeMode = () => {
        if (mode === 'dark') return 'dark'
        if (mode === 'light') return 'light'
        return prefersDarkMode ? 'dark' : 'light'
    }

    const theme = createTheme({
        palette: {
            mode: getThemeMode()
        }
    })

    const handleUserClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleSettings = () => {
        setAnchorEl(null)
        navigate('/user')
    }

    const handleLogout = async () => {
        setAnchorEl(null)
        await signOut(auth)
        navigate('/login')
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        FrugalGPT
                    </Typography>
                    <Button color="inherit" href="/">
                        Home
                    </Button>
                    {user ? (
                        <div>
                            <IconButton
                                size="large"
                                edge="end"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleUserClick}
                                color="inherit"
                            >
                                <AccountCircle />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right'
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right'
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                            >
                                <MenuItem onClick={handleSettings}>Settings</MenuItem>
                                <MenuItem onClick={handleLogout}>Log out</MenuItem>
                            </Menu>
                        </div>
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
                <Route path="/signin" element={<Signin />} />
                <Route path="/user" element={<User setMode={setMode} />} />
            </Routes>
        </ThemeProvider>
    )
}

export default App
