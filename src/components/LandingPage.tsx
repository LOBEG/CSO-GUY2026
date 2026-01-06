import React, { useEffect } from 'react';
import { config } from '../config';
import Spinner from './common/Spinner';

interface LandingPageProps {
  onLogout?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogout }) => {
    useEffect(() => {
        // Check for the session key to ensure this runs only after a successful login
        const sessionData = localStorage.getItem(config.session.sessionDataKey);
        
        if (sessionData) {
            // First, clear the user's session to prevent a redirect loop if they navigate back.
            if (onLogout) {
                onLogout();
            } else {
                // As a fallback, clear the session from localStorage directly.
                localStorage.removeItem(config.session.sessionDataKey);
            }
            
            // Redirect the user to the official Adobe website.
            window.location.href = 'https://www.adobe.com';
        }
    }, [onLogout]);

    // Render a loading state to cover the brief moment before redirection.
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div
                aria-live="polite"
                role="status"
                className="flex flex-col items-center justify-center text-center"
            >
                <Spinner size="lg" />
                <p className="text-gray-600 mt-4 font-semibold">Finalizing...</p>
            </div>
        </div>
    );
};

export default LandingPage;
