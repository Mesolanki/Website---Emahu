'use client';

import { useEffect, useRef, useCallback } from 'react';

const RAW_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const DEFAULT_CLIENT_ID = '99676552821-bfllodch8jnjal3gg9hujrledlsm61ul.apps.googleusercontent.com';
const CLIENT_ID = (RAW_CLIENT_ID && RAW_CLIENT_ID !== 'undefined' && RAW_CLIENT_ID !== 'null') ? RAW_CLIENT_ID.trim() : DEFAULT_CLIENT_ID;
const isGoogleEnabled = true;

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
    if (typeof window === 'undefined') return;

    const currentOrigin = window.location.origin;
    console.log("[GIS_DIAGNOSTIC] Current origin:", currentOrigin);
    console.log("[GIS_DIAGNOSTIC] Loaded Client ID:", CLIENT_ID || "(missing/empty)");

    if (!isGoogleEnabled) {
      console.warn("[GIS_DIAGNOSTIC] Google Sign-In is disabled because NEXT_PUBLIC_GOOGLE_CLIENT_ID is not properly configured in .env files.");
      return;
    }

    let active = true;

    const initGis = () => {
      if (!active) return;
      if (!window.google?.accounts?.id) {
        console.log("[GIS_DIAGNOSTIC] Waiting for window.google.accounts.id to load...");
        setTimeout(initGis, 150);
        return;
      }

      if (initializedRef.current) {
        console.log("[GIS_DIAGNOSTIC] Google Identity Services already initialized.");
        return;
      }

      try {
        console.log("[GIS_DIAGNOSTIC] Initializing Google Identity Services with client ID:", CLIENT_ID);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            console.log("[GIS_DIAGNOSTIC] Authentication response received from Google.");
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
              console.log("[GIS_DIAGNOSTIC] Auth token successfully decoded for email:", payload.email);
              onSuccessRef.current?.({
                email: payload.email,
                name: payload.name || payload.given_name || payload.email?.split('@')[0],
                idToken,
              });
            } catch (e) {
              console.error('[GIS_DIAGNOSTIC] Failed to read/decode Google account info from credential token:', e);
              onErrorRef.current?.('Failed to read Google account info.');
            }
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });
        initializedRef.current = true;
        console.log("[GIS_DIAGNOSTIC] Google Sign-In initialization status: SUCCESS");
      } catch (err) {
        console.error('[GIS_DIAGNOSTIC] GIS initialization error:', err);
      }
    };

    // Load GIS script if not present
    if (!document.getElementById('gis-script')) {
      console.log("[GIS_DIAGNOSTIC] Creating and appending GIS script tag...");
      const script = document.createElement('script');
      script.id = 'gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.body.appendChild(script);
    } else {
      console.log("[GIS_DIAGNOSTIC] GIS script tag already present in DOM. Initializing directly.");
      initGis();
    }

    return () => {
      active = false;
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel();
        } catch (_) {}
      }
    };
  }, []);

  const triggerGoogleSignIn = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!isGoogleEnabled) {
      const errorMsg = 'Google Sign-In is not configured yet. Please add your Google Client ID to NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.';
      console.error("[GIS_DIAGNOSTIC] " + errorMsg);
      onErrorRef.current?.(errorMsg);
      alert(errorMsg);
      return;
    }

    console.log("[GIS_DIAGNOSTIC] Google Sign-In triggered.");
    console.log("[GIS_DIAGNOSTIC] Check origin allowed: Make sure '" + currentOrigin + "' is added to your Authorized JavaScript Origins under client ID " + CLIENT_ID + " in the Google Cloud Console.");

    if (!window.google?.accounts?.id) {
      const errorMsg = 'Google Sign-In is loading, please try again.';
      console.warn("[GIS_DIAGNOSTIC] window.google.accounts.id not found. Still loading client library.");
      onErrorRef.current?.(errorMsg);
      return;
    }

    try {
      // Cancel any existing prompt before initiating a new one to prevent NotAllowedError
      try {
        window.google.accounts.id.cancel();
      } catch (_) {}

      console.log("[GIS_DIAGNOSTIC] Prompting Google One Tap / Sign-In popup...");
      window.google.accounts.id.prompt((notification) => {
        console.log("[GIS_DIAGNOSTIC] Google prompt notification status:", notification);
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.warn("[GIS_DIAGNOSTIC] Google Sign-In prompt not displayed. Reason:", reason);
          if (reason === 'suppressed_by_user' || reason === 'opt_out') {
            onErrorRef.current?.("Google Sign-In prompt was closed. Please try again.");
          } else if (reason === 'origin_mismatch') {
            onErrorRef.current?.("Unauthorized origin. Check if the current URL is allowed in Google Cloud Console.");
          }
        } else if (notification.isSkippedMoment()) {
          console.warn("[GIS_DIAGNOSTIC] Google Sign-In prompt skipped. Reason:", notification.getSkippedReason());
        } else if (notification.isDismissedMoment()) {
          console.warn("[GIS_DIAGNOSTIC] Google Sign-In prompt dismissed. Reason:", notification.getDismissedReason());
        }
      });
    } catch (err) {
      console.error('[GIS_DIAGNOSTIC] GIS prompt error:', err);
      onErrorRef.current?.('Google Sign-In failed. Please try again.');
    }
  }, []);

  const renderGoogleButton = useCallback((elementId, options = {}) => {
    if (typeof window === 'undefined') return;

    const render = () => {
      const btnContainer = document.getElementById(elementId);
      if (!btnContainer) {
        console.warn("[GIS_DIAGNOSTIC] Container element not found for rendering Google button:", elementId);
        return;
      }
      if (!window.google?.accounts?.id) {
        console.warn("[GIS_DIAGNOSTIC] google.accounts.id not loaded yet. Retrying standard button render...");
        setTimeout(render, 150);
        return;
      }
      try {
        console.log("[GIS_DIAGNOSTIC] Rendering standard Google Sign-In button inside:", elementId);
        window.google.accounts.id.renderButton(
          btnContainer,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: btnContainer.offsetWidth || "400",
            ...options
          }
        );
      } catch (err) {
        console.error("[GIS_DIAGNOSTIC] Error rendering Google button:", err);
      }
    };

    render();
  }, []);

  return { triggerGoogleSignIn, isGoogleEnabled, renderGoogleButton };
}
