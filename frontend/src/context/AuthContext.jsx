import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(); //initializes the context object that will hold authentication state and functions

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); //starts with no user
    const [loading, setLoading] = useState(true); //setloading is true until we check localStorage for existing user data on app load

    useEffect(() => {
        // On app load, check if user is already in localStorage and remembers the user
        const savedUser = localStorage.getItem('bt_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('bt_user', JSON.stringify(userData)); //updates the  localstorage with the new data and still saves it after the tab is closed
        localStorage.setItem('bt_auth', 'true');
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('bt_user');
        localStorage.removeItem('bt_auth');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
            {!loading && children} 
        
        </AuthContext.Provider>
    );// if user exists then its true 
};

// Custom hook to use the AuthContext easily
export const useAuth = () => useContext(AuthContext);