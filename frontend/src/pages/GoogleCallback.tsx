/**
 * GoogleCallback.tsx
 *
 * This page is loaded inside the Google OAuth popup after the user authorizes.
 * Google redirects to: /oauth/google/callback#id_token=xxx&state=yyy
 *
 * This page reads the `id_token` from the URL hash fragment and posts it
 * back to the opener window via postMessage, then closes itself.
 */
import { useEffect } from "react";

export default function GoogleCallback() {
  useEffect(() => {
    // Google returns parameters in the hash fragment for implicit flow (response_type=id_token)
    // or in query parameters for auth code flow / error responses.
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    const idToken = hashParams.get("id_token") || queryParams.get("id_token");
    const rawError = hashParams.get("error") || queryParams.get("error");
    const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

    if (rawError || !idToken) {
      let message = "Google authentication failed";
      if (rawError === "access_denied") {
        message = "Google sign-in was cancelled.";
      } else if (rawError === "redirect_uri_mismatch") {
        message = "Google OAuth redirect URI mismatch. Please check Google Cloud settings.";
      } else if (rawError === "unauthorized_client") {
        message = "Google OAuth client is not authorized for this request.";
      } else if (errorDescription) {
        message = errorDescription;
      } else if (rawError) {
        message = `Google sign-in error: ${rawError}`;
      } else {
        message = "No ID token received from Google.";
      }

      window.opener?.postMessage(
        { type: "GOOGLE_OAUTH_ERROR", error: message },
        window.location.origin
      );
      window.close();
      return;
    }

    // Send the ID token to the parent window (Login / SignUp page)
    window.opener?.postMessage(
      { type: "GOOGLE_OAUTH_TOKEN", token: idToken },
      window.location.origin
    );

    window.close();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F172A",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        gap: 16,
      }}
    >
      {/* Simple spinner */}
      <svg
        width="40" height="40" viewBox="0 0 24 24"
        fill="none" stroke="#6366F1" strokeWidth="2.5"
        style={{ animation: "spin 0.9s linear infinite" }}
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </svg>
      <p style={{ fontSize: 15, color: "#94A3B8" }}>
        Completing Google sign-in…
      </p>
    </div>
  );
}
