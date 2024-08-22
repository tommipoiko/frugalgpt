import React from 'react'
import {
    List, ListItem, ListItemText, Typography
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

function Sidenav() {
    const navigate = useNavigate()

    const handleNewChat = () => {
        navigate('/chat/new')
    }

    return (
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
    )
}

export default Sidenav
