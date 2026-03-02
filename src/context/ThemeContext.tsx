import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ColorScheme = 'dark' | 'light';

interface ThemeContextType {
    colorScheme: ColorScheme;
    toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'procurex_color_scheme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, colorScheme);
    }, [colorScheme]);

    const toggleColorScheme = useCallback(() => {
        setColorScheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return (
        <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
