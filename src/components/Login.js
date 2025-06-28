import React from 'react';
import{ GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function Login({setUser}) {
    const onSuccess = (res) => {
        var tokenData = jwtDecode(res.credential);
        var loginData = {
            googleId: tokenData.sub,
            ...tokenData
        }
        setUser(loginData);
        localStorage.setItem('login', JSON.stringify(loginData));
        console.log('Login successful: current user is ', loginData);
    };

    const onFailure = (res) => {
        console.log('Login failed: res: ', res);
    }

    return (
        <div>
            <GoogleLogin
                id = 'login'
                onSuccess={onSuccess}
                onFailure={onFailure}
                cookiePolicy={'single_host_origin'}
                style={{ marginTop: '100px'}}
                isSignedIn={true}
                auto_select={true}
            />
        </div>
    );
}

export default Login;