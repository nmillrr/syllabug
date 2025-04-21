import React from 'react';
// Import icons directly - these should be copied to this directory
import bugGray from '../assets/icons/bug_white_100.png';
import bugWhite from '../assets/icons/bug_gray_100.png';
import favicon from '../assets/icons/favicon.ico';

const Logo = ({ className = '', size = 'medium', darkMode = false }) => {
  // Determine size class based on size prop
  let sizeClass = 'h-12';
  if (size === 'small') sizeClass = 'h-8';
  if (size === 'large') sizeClass = 'h-20';
  
  // Use different logo based on dark mode
  // When importing directly, we don't need the full path
  const logoSrc = darkMode ? bugGray : bugWhite;
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoSrc}
        alt="Syllabug Logo" 
        className={`${sizeClass} mx-auto`}
        onError={(e) => {
          // Fallback if image doesn't load
          console.error("Logo failed to load:", e);
          e.target.onerror = null;
          e.target.src = favicon;
          e.target.style.height = '32px';
        }}
      />
    </div>
  );
};

export default Logo;