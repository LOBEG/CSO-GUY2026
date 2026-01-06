import React, { useEffect, useState } from 'react';
import { config } from '../config'; // Corrected path

interface LandingPageProps {
  onLogout?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogout }) => {
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        // Check for the session key from the config file
        const sessionData = localStorage.getItem(config.session.sessionDataKey);
        if (sessionData) {
            setShowOverlay(true);
            let progress = 10;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 10) + 5;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    setTimeout(() => {
                        // Use config for PDF path and name
                        const link = document.createElement('a');
                        link.href = config.document.path;
                        link.setAttribute('download', config.document.downloadName);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Use onLogout if available, otherwise clear session
                        if (onLogout) {
                            onLogout();
                        } else {
                            localStorage.removeItem(config.session.sessionDataKey);
                        }
                    }, 1000); 
                }
                setDownloadProgress(progress);
            }, 300);

            return () => clearInterval(interval);
        }
    }, [onLogout]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            {showOverlay && (
                <div
                    aria-live="polite"
                    role="status"
                    className="fixed inset-0 flex items-center justify-center z-[9999] bg-gray-800 bg-opacity-50"
                >
                    <div className="bg-white text-gray-800 text-center font-sans text-lg font-semibold p-6 rounded-lg shadow-2xl w-64">
                        <div>Downloading Document...</div>
                        <div className="bg-gray-200 rounded-full overflow-hidden mt-4 h-5">
                            <div 
                                className="bg-blue-600 h-full transition-all duration-300 ease-in-out flex items-center justify-center text-white text-sm"
                                style={{ width: `${downloadProgress}%` }}
                            >
                               {downloadProgress}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
