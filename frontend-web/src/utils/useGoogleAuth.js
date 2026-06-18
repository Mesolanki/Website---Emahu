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
  const initializedRef = useRef(false);

  // Load GIS script once
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.error("Google Client ID missing");
    }
    if (document.getElementById('gis-script')) return;
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const triggerGoogleSignIn = useCallback(() => {
    if (!CLIENT_ID) {
      onError?.('Google Client ID is not configured.');
      return;
    }

    console.log("Origin:", typeof window !== 'undefined' ? window.location.origin : 'undefined');
    console.log("Client ID:", CLIENT_ID);

    const init = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(init, 150);
        return;
      }

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
              onSuccess?.({
                email: payload.email,
                name: payload.name || payload.given_name || payload.email?.split('@')[0],
                idToken,
              });
            } catch (e) {
              onError?.('Failed to read Google account info.');
            }
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });

        initializedRef.current = true;
        window.google.accounts.id.prompt();
      } catch (err) {
        console.error('GIS error:', err);
        onError?.('Google Sign-In failed. Please try again.');
      }
    };

    init();
  }, [onSuccess, onError]);

  return { triggerGoogleSignIn };
}
