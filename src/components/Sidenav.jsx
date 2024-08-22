import React from 'react'
import {
    Drawer, List, ListItem, ListItemText, Typography
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

function Sidenav() {
    const navigate = useNavigate()

    const handleNewChat = () => {
        // Redirect to a new chat route
        navigate('/chat/new')
    }

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: 240,
                flexShrink: 0,
                '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' }
            }}
        >
            <List>
                <ListItem button onClick={handleNewChat}>
                    <ListItemText primary="New Chat" />
                </ListItem>
                <ListItem>
                    <Typography variant="body2" color="textSecondary">
                        Previous chats will be listed here.
                    </Typography>
                </ListItem>
            </List>
        </Drawer>
    )
}

export default Sidenav
