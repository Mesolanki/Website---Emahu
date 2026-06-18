'use client';

import { useEffect, useRef, useCallback } from 'react';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

/**
 * Reusable hook to trigger Google Sign-In natively on the current page.
 * Fires Google's OAuth popup directly — no intermediate popup window.
 *
 * @param {Function} onSuccess - Called with { email, name, idToken } on success
 * @param {Function} onError   - Called with an error message string on failure
 */
export function useGoogleAuth(onSuccess, onError) {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep callback refs updated to avoid re-initializing GIS with stale callbacks
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const initializedRef = useRef(false);

  // Load GIS script once and initialize on mount
  useEffect(() => {
    if (!CLIENT_ID) {
      console.error("Google Client ID missing");
      return;
    }

    let active = true;

    const initGis = () => {
      if (!active) return;
      if (!window.google?.accounts?.id) {
        setTimeout(initGis, 150);
        return;
      }

      if (initializedRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            const idToken = response.credential;
            try {
              const base64Url = idToken.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(
                decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                )
              );
              onSuccessRef.current?.({
                email: payload.email,
                name: payload.name || payload.given_name || payload.email?.split('@')[0],
                idToken,
              });
            } catch (e) {
              onErrorRef.current?.('Failed to read Google account info.');
            }
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });
        initializedRef.current = true;
      } catch (err) {
        console.error('GIS initialization error:', err);
      }
    };

    // Load GIS script if not present
    if (!document.getElementById('gis-script')) {
      const script = document.createElement('script');
      script.id = 'gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.body.appendChild(script);
    } else {
      initGis();
    }

    return () => {
      active = false;
      // Clean up outstanding prompts on unmount to prevent memory leaks and credentials collision
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel();
        } catch (_) {}
      }
    };
  }, []);

  const triggerGoogleSignIn = useCallback(() => {
    if (!CLIENT_ID) {
      onErrorRef.current?.('Google Client ID is not configured.');
      return;
    }

    console.log("Origin:", typeof window !== 'undefined' ? window.location.origin : 'undefined');
    console.log("Client ID:", CLIENT_ID);

    if (!window.google?.accounts?.id) {
      onErrorRef.current?.('Google Sign-In is loading, please try again.');
      return;
    }

    try {
      // Cancel any existing prompt before initiating a new one to prevent NotAllowedError
      try {
        window.google.accounts.id.cancel();
      } catch (_) {}

      window.google.accounts.id.prompt((notification) => {
        console.log("Google prompt notification:", notification);
      });
    } catch (err) {
      console.error('GIS prompt error:', err);
      onErrorRef.current?.('Google Sign-In failed. Please try again.');
    }
  }, []);

  return { triggerGoogleSignIn };
}
