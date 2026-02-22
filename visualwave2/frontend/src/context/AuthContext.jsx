import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Verify token by fetching user data
            authAPI.getMe()
                .then(userData => {
                    setUser(userData);
                    setIsAuthenticated(true);
                })
                .catch(() => {
                    // Token is invalid or expired
                    localStorage.removeItem('auth_token');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authAPI.login(email, password);
            localStorage.setItem('auth_token', response.access_token);
            
            // Fetch user data
            const userData = await authAPI.getMe();
            setUser(userData);
            setIsAuthenticated(true);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const signup = async (name, email, password) => {
        try {
            await authAPI.signup(name, email, password);
            // Auto-login after signup
            return await login(email, password);
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
