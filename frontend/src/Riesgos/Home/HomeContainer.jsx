import UpdatedNavBar from '../NavBar/UpdatedNavBar'
import { Outlet } from 'react-router-dom';

function HomeContainer() {
    return (
        <>
            <UpdatedNavBar />
            <Outlet />
        </>
    )
}

export default HomeContainer