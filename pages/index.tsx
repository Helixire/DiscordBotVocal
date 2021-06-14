import UserLog from '../src/UserLog'
import { useSession } from 'next-auth/client';

export default function Page() {
    const [ session, loading ] = useSession();
    if (session) {
        return <>Welcome {session.user.name}</>
    }
    return <> You should probably <br/> <UserLog/></>
}