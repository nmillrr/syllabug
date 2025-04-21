import React, { useEffect, useState } from 'react';
import Home from './pages/Home';
import ThemeToggle from './components/ThemeToggle';

function App() {
  // Listen for theme changes - default to light mode
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Only check localStorage and don't default to system preference
    return localStorage.getItem('theme') === 'dark';
  });
  
  useEffect(() => {
    const updateThemeState = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkTheme(isDark);
    };
    
    // Initial update
    updateThemeState();
    
    // Set up event listener for theme changes using MutationObserver
    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <Home isDarkTheme={isDarkTheme} />
    </div>
  );
}

export default App;