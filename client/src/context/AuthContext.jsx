import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };


    useEffect(() => {
        const initializeAuth = async () => {
            if (token) {
                // In a real app, we'd verify the token with the backend here
                // and maybe fetch user details. For now, we'll decode enough to be useful.
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setUser({ email: payload.sub });
                } catch {
                    logout();
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };
        initializeAuth();
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
