import React, { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import {
    AppBar, Toolbar, Typography, Button, Container, Menu, MenuItem, IconButton
} from '@mui/material'
import AccountCircle from '@mui/icons-material/AccountCircle'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
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
    const [user, setUser] = useState(null)
    const [anchorEl, setAnchorEl] = useState(null)
    const auth = getAuth()
    const navigate = useNavigate()
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    const theme = createTheme({
        palette: {
            mode: prefersDarkMode ? 'dark' : 'light'
        }
    })

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })

        return () => unsubscribe()
    }, [auth])

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
                <Route path="/user" element={<User />} />
            </Routes>
        </ThemeProvider>
    )
}

export default App
