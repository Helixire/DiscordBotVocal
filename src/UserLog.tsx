import React from 'react';
import { signIn, signOut, useSession } from 'next-auth/client';
import { Button, Avatar, Menu, MenuItem, handleClick } from '@material-ui/core'

export default function UserLog() {
    const [ session, loading ] = useSession();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    return (
    <>
        {!session && <>
        <Button onClick={() => signIn("discord")}>Sign in</Button>
        </>}
        {session && session.user && <>
        <Button aria-controls="simple-menu" aria-haspopup="true" onClick={handleClick}>
            <Avatar
                src={session.user.image}
                alt={session.user.name}
            />
        </Button>
        <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
        >
            <MenuItem onClick={()=>{signOut();handleClose();}}>Log Out</MenuItem>    
        </Menu>
        </>}
    </>
    );
}