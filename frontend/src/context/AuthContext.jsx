import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(); //initializes the context object that will hold authentication state and functions

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); //starts with no user
    const [loading, setLoading] = useState(true); //setloading is true until we check storage for existing user data on app load

    useEffect(() => {
        // On app load, check localStorage (remembered session) first, then sessionStorage (this-tab-only session)
        const savedUser = localStorage.getItem('bt_user') || sessionStorage.getItem('bt_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // remember=true -> localStorage (survives closing the browser, until the 7-day token expires)
    // remember=false -> sessionStorage (cleared as soon as this tab/browser closes)
    const login = (userData, token, remember = true) => {
        const store = remember ? localStorage : sessionStorage;
        const other = remember ? sessionStorage : localStorage;
        // Clear the other storage so a stale session there can't linger or conflict
        other.removeItem('bt_user');
        other.removeItem('bt_auth');
        other.removeItem('bt_token');

        store.setItem('bt_user', JSON.stringify(userData));
        store.setItem('bt_auth', 'true');
        store.setItem('bt_token', token);
        setUser(userData);
    };

    // Merge a patch (e.g. new firstName) into the stored user without requiring a re-login
    const updateUser = (patch) => {
        setUser(prev => {
            const updated = { ...prev, ...patch };
            const store = localStorage.getItem('bt_user') ? localStorage : sessionStorage;
            store.setItem('bt_user', JSON.stringify(updated));
            return updated;
        });
    };

    const logout = () => {
        localStorage.removeItem('bt_user');
        localStorage.removeItem('bt_auth');
        localStorage.removeItem('bt_token');
        sessionStorage.removeItem('bt_user');
        sessionStorage.removeItem('bt_auth');
        sessionStorage.removeItem('bt_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser, loading }}>
            {!loading && children}

        </AuthContext.Provider>
    );
};

// Custom hook to use the AuthContext easily
export const useAuth = () => useContext(AuthContext);
