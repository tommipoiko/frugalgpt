import React, { useEffect, useState } from 'react'
import {
    Route, Routes, useNavigate, useLocation
} from 'react-router-dom'
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
    Menu,
    MenuItem,
    Button
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AccountCircle from '@mui/icons-material/AccountCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import useMediaQuery from '@mui/material/useMediaQuery'
import { onAuthStateChanged } from 'firebase/auth'
import Signin from './components/Signin'
import User from './components/User'
import Signup from './components/Signup'
import Sidenav from './components/Sidenav'
import Chat from './components/Chat/Chat'
import { auth } from './services/firebase'

const drawerWidth = 300

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
        }),
        [theme.breakpoints.down('sm')]: {
            marginLeft: 0,
            padding: theme.spacing(2)
        }
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

function App() {
    const theme = useTheme()
    const [user, setUser] = useState(
        () => JSON.parse(localStorage.getItem('frugalGptUser')) || null
    )
    const [anchorEl, setAnchorEl] = useState(null)
    const [open, setOpen] = useState(() => localStorage.getItem('frugalGptSidenav') === 'true')
    const [mode, setMode] = useState(() => localStorage.getItem('frugalGptTheme') || 'system')
    const [currentChat, setCurrentChat] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            const redirectPaths = ['chats', 'user']
            if (!currentUser && redirectPaths.includes(location.pathname.split('/')[1])) {
                const intendedPath = location.pathname
                navigate(`/signin?redirect=${encodeURIComponent(intendedPath)}`)
            } else {
                setUser(currentUser)
                localStorage.setItem('frugalGptUser', JSON.stringify(currentUser))
            }
        })

        return () => unsubscribe()
    }, [auth, location, navigate])

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

    const handleSignOut = async () => {
        setAnchorEl(null)
        auth.signOut()
        setUser(null)
        localStorage.removeItem('frugalGptUser')
        navigate('/signin')
    }

    const toggleDrawerOpen = () => {
        setOpen(true)
        localStorage.setItem('frugalGptSidenav', 'true')
    }

    const toggleDrawerClose = () => {
        setOpen(false)
        localStorage.setItem('frugalGptSidenav', 'false')
    }

    const handleNewChat = () => {
        setCurrentChat(null)
        navigate('/')
        if (isMobile) {
            toggleDrawerClose()
        }
    }

    const handleNavigateChat = (id) => {
        if (id === 'new') {
            handleNewChat()
            return
        }
        setCurrentChat(id)
        navigate(`/chats/${id}`)
        if (isMobile) {
            toggleDrawerClose()
        }
    }

    const themeConfig = createTheme({
        palette: {
            mode: getThemeMode()
        }
    })

    return (
        <ThemeProvider theme={themeConfig}>
            <CssBaseline enableColorScheme />
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
                        <Button
                            color="inherit"
                            onClick={handleNewChat}
                            sx={{ marginRight: 2 }}
                        >
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
                                        vertical: 'bottom',
                                        horizontal: 'right'
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right'
                                    }}
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                    PaperProps={{
                                        style: {
                                            padding: '4px 0',
                                            borderRadius: '8px',
                                            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <MenuItem onClick={handleSettings}>
                                        <SettingsIcon fontSize="small" sx={{ marginRight: 1 }} />
                                        Settings
                                    </MenuItem>
                                    <MenuItem onClick={handleSignOut}>
                                        <LogoutIcon fontSize="small" sx={{ marginRight: 1 }} />
                                        Sign out
                                    </MenuItem>
                                </Menu>
                            </div>
                        ) : (
                            <Button color="inherit" href="/signin">
                                <LoginIcon sx={{ marginRight: 1 }} />
                                Sign in
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
                            boxSizing: 'border-box',
                            ...(isMobile && { width: '100vw', height: '100vh' })
                        }
                    }}
                    variant={isMobile ? 'temporary' : 'persistent'}
                    anchor="left"
                    open={open}
                    onClose={toggleDrawerClose}
                >
                    <DrawerHeader>
                        <IconButton onClick={toggleDrawerClose}>
                            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                        </IconButton>
                    </DrawerHeader>
                    <Sidenav user={user} onNavigateChat={handleNavigateChat} />
                </Drawer>
                <Main open={open}>
                    <DrawerHeader />
                    <Routes>
                        <Route path="/" element={<Chat currentChat={currentChat} />} />
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/user" element={<User setMode={setMode} />} />
                        <Route path="/chats/:id" element={<Chat currentChat={currentChat} />} />
                    </Routes>
                </Main>
            </Box>
        </ThemeProvider>
    )
}

export default App
