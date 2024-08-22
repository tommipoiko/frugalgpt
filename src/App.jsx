import React, { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import {
    styled, useTheme, ThemeProvider, createTheme
} from '@mui/material/styles'
import {
    AppBar as MuiAppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    Toolbar,
    Typography,
    Menu,
    MenuItem,
    Button
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AccountCircle from '@mui/icons-material/AccountCircle'
import useMediaQuery from '@mui/material/useMediaQuery'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import Login from './components/Login'
import User from './components/User'
import Signin from './components/Signin'
import Sidenav from './components/Sidenav'
import Chat from './components/Chat'

const drawerWidth = 240

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        marginLeft: `-${drawerWidth}px`,
        ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen
            }),
            marginLeft: 0
        })
    })
)

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open'
})(({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
    }),
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        })
    })
}))

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end'
}))

function Home() {
    return (
        <Box sx={{ padding: 3 }}>
            <Typography variant="h2" component="h1" gutterBottom>
                Welcome to FrugalGPT
            </Typography>
            <Typography variant="body1" gutterBottom>
                Start building your frugal solutions with AI-powered guidance.
            </Typography>
        </Box>
    )
}

function App() {
    const theme = useTheme()
    const [user, setUser] = useState(
        () => JSON.parse(localStorage.getItem('frugalGptUser')) || null
    )
    const [anchorEl, setAnchorEl] = useState(null)
    const [open, setOpen] = useState(() => localStorage.getItem('frugalGptSidenav') === 'true')
    const [mode, setMode] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const auth = getAuth()
    const navigate = useNavigate()
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            localStorage.setItem('frugalGptUser', JSON.stringify(currentUser))
        })

        return () => unsubscribe()
    }, [auth])

    const getThemeMode = () => {
        if (mode === 'dark') return 'dark'
        if (mode === 'light') return 'light'
        return prefersDarkMode ? 'dark' : 'light'
    }

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
        setUser(null)
        localStorage.removeItem('frugalGptUser')
        navigate('/login')
    }

    const toggleDrawerOpen = () => {
        setOpen(true)
        localStorage.setItem('frugalGptSidenav', 'true')
    }

    const toggleDrawerClose = () => {
        setOpen(false)
        localStorage.setItem('frugalGptSidenav', 'false')
    }

    const themeConfig = createTheme({
        palette: {
            mode: getThemeMode()
        }
    })

    return (
        <ThemeProvider theme={themeConfig}>
            <CssBaseline />
            <Box sx={{ display: 'flex' }}>
                <AppBar position="fixed" open={open}>
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            onClick={toggleDrawerOpen}
                            edge="start"
                            sx={{ mr: 2, ...(open && { display: 'none' }) }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button color="inherit" href="/" sx={{ marginRight: 2 }}>
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
                <Drawer
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box'
                        }
                    }}
                    variant="persistent"
                    anchor="left"
                    open={open}
                >
                    <DrawerHeader>
                        <IconButton onClick={toggleDrawerClose}>
                            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                        </IconButton>
                    </DrawerHeader>
                    <Sidenav />
                </Drawer>
                <Main open={open}>
                    <DrawerHeader />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/user" element={<User setMode={setMode} />} />
                        <Route path="/chat/:id" element={<Chat />} />
                    </Routes>
                </Main>
            </Box>
        </ThemeProvider>
    )
}

export default App
