import React from 'react';
import { googleLogout } from '@react-oauth/google';

function Logout({ setUser, clientId }) {


    const logOut = () => {
        googleLogout();
        setUser(null);
        localStorage.setItem("login", null);
        console.log('Logout made successfully');
    };

    return (
        <div>
            <button onClick={logOut}
                    type="button"
                    className="btn btn-light">
                <img src="/images/google_icon.png"
                     alt="Google icon"
                     style={{"height":"20px", "marginRight":"10px"}}></img>
                Log out
            </button>
        </div>
    );
}

export default Logout;