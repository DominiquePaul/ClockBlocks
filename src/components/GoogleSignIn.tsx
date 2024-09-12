import React from 'react';

const GoogleSignInButton: React.FC<{ onClick: () => void; text?: string }> = ({ onClick, text = "Sign in with Google" }) => {
  return (
    <button
      onClick={onClick}
      aria-label={text}
      className="flex items-center bg-white border border-button-border-light rounded-full p-0.5 pr-4"
    >
      <div className="flex items-center justify-center bg-white w-9 h-9 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
          <title>{text}</title>
          <desc>Google G Logo</desc>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            className="fill-google-logo-blue"
          ></path>
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            className="fill-google-logo-green"
          ></path>
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            className="fill-google-logo-yellow"
          ></path>
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            className="fill-google-logo-red"
          ></path>
        </svg>
      </div>
      <span className="text-sm text-google-text-gray tracking-wider">{text}</span>
    </button>
  );
};

export default GoogleSignInButton;
