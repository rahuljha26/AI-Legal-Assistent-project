# CHANGELOG

All notable changes to the AI Legal Assistant project will be documented in this file.

---

## [Unreleased]

### Current Focus
- Enterprise Authentication & Security Upgrade (15-Phase Roadmap).

### Fixes
- ✓ **Google Authentication Error Handling**: Resolved `"Google authentication failed. Please try again."` issue by adding fallback `GOOGLE_CLIENT_ID` in `OAuthButtons.tsx` and preventing swallowed error messages in `AuthComponents.jsx` & `OAuthButtons.tsx` so exact server and connection error reasons are surfaced to the user UI.
- ✓ **Google OAuth Clock Skew Tolerance**: Added `clock_skew_in_seconds=60` to Google ID token verification in `GoogleAuthView` (`project/AILegal/views.py`) to handle minor system clock drift ("Token used too early") between local machines and Google auth servers.
- ✓ **Google Profile Picture Rendering & Persistence**: Updated `GoogleAuthView` in `project/AILegal/views.py` to ensure `profile_picture` is explicitly included in database updates for existing users, and added `referrerPolicy="no-referrer"` to avatar `<img>` elements across frontend components to bypass Google CDN hotlinking referrer restrictions (`lh3.googleusercontent.com`).

### Documentation & Mobile Access
- ✓ **Mobile Access & Local Host Binding**: Added `host: true` to Vite server configurations (`frontend/vite.config.ts` & `project/frontend/vite.config.js`) binding to `0.0.0.0` so mobile devices on the same Wi-Fi network can open `http://192.168.1.187:5173`.
- ✓ **Mobile Access QR Codes**: Generated scannable QR codes for both live production web deployment and local Wi-Fi testing (`http://192.168.1.187:5173`).
- ✓ **Enterprise Production Blueprint**: Added `LexAI_Enterprise_Production_Blueprint.pdf` to the root repository for deployment and architecture guidelines.

### CORS & Netlify Deployment Fix
- ✓ **CORS Netlify Origin Support**: Added `https://dharma-ai-legal-assistent.netlify.app` and `^https:\/\/.*\.netlify\.app$` regex to `CORS_ALLOWED_ORIGINS` & `CORS_ALLOWED_ORIGIN_REGEXES` in `project/project/settings.py`.

### Added in Google Authenticator (TOTP 2FA) & Google OAuth
- ✓ **Google OAuth 2FA Enforcement**: Updated `GoogleAuthView` and `OAuthButtons.tsx` so users with 2FA enabled on their account are seamlessly prompted for 2FA verification when signing in with Google.
- ✓ **Role Alias Normalization Fix**: Fixed bi-directional role normalization in `AuthContext.tsx` (`hasRole`) and `SignUp.tsx` (`redirectByRole`) ensuring users with `'citizen'` role route directly to `/dashboard`.
- ✓ **Emergency Backup Scratch Codes**: Added single-use 8-digit emergency recovery codes standard (matching `google-authenticator-libpam` specs) to Django `User` model (`migration 0011`).
- ✓ **TOTP 2FA Core**: Integrated Google Authenticator TOTP verification using `pyotp` and base64 QR code rendering using `qrcode` in `security/two_factor.py`.
- ✓ **Backend Endpoints**: Updated `VerifyOTPView` to handle both standard 6-digit TOTP codes and single-use 8-digit emergency scratch codes during sign-in. Enhanced `Manage2FAView` for status checking, QR code generation, backup codes generation, verification activation, and disabling.
- ✓ **Frontend Security Settings UI**: Built modal in `SecuritySettings.tsx` to display scanned QR code image (`qr_code_base64`), manual secret key, 8 emergency backup scratch codes grid with one-click copy button, 6-digit verification code input, and active status indicator.
- ✓ **Login Verification Update**: Enhanced `OTPVerification.tsx` to handle Google Authenticator TOTP codes seamlessly during login.

### Added in Phase 2 (Google OAuth 2.0 & Identity)
- ✓ **Google OAuth 2.0 Flow**: Verified Google ID token validation using Google's official auth library in `GoogleAuthView`.
- ✓ **User Account Linking**: Automatic lookup by `google_id` or verified email, safely linking accounts without duplicates.
- ✓ **Schema Migration**: Added `google_id` and `auth_provider` to Django `User` model (`migration 0010`). Default role set to `citizen`.
- ✓ **Popup Lifecycle & Error Handling**: Popup window closure monitoring, browser blocker detection, explicit `prompt: "select_account"`, and human-friendly error messages (`OAuthButtons.tsx` & `GoogleCallback.tsx`).
- ✓ **Auth Context Sync**: Added `googleLogin(token)` to `AuthContext.tsx` for state updates.
- ✓ **OAuth Status Diagnostic Endpoint**: Created `GET /api/v1/auth/google/config-status/` returning configuration boolean flags without exposing secrets.

### Added in Phase 1 (RBAC)
- ✓ **Role Based Access Control (RBAC)**: Support for `super_admin`, `admin`, `lawyer`, `citizen` roles.
- ✓ **Permission Matrix & Decorators**: `permissions.py` with fine-grained permission codes and `@require_permission`/`@require_role` decorators.
- ✓ **DRF Permission Classes**: `HasRolePermission`, `IsSuperAdmin`, `IsAdminUserRole`, `IsLawyerUserRole`, `IsCitizenUserRole`.
- ✓ **Security Middleware**: `RBACSecurityMiddleware` enforcing response security headers and route path protections.
- ✓ **Frontend Route Guards**: `RoleBasedRoute.tsx` and updated `AuthContext` helper methods (`hasPermission`, `hasRole`).
- ✓ **RBAC API Endpoints**: `GET /api/v1/auth/roles/` and `POST /api/v1/auth/assign-role/`.
- ✓ **Unit Tests**: Full test suite coverage for RBAC roles, permission matrix, and role assignment endpoints.

---

## [v1.0.0] - Initial Setup & Core Architecture

### Completed Features
- ✓ **Backend Initialization**: Django REST Framework setup with JWT authentication.
- ✓ **Frontend Initialization**: React + TypeScript + Vite single-page app with Tailwind CSS.
- ✓ **Indian Kanoon Integration**: API service for searching case laws and statutes.
- ✓ **Gemini AI Service**: Integration for legal document draft generation and query assistance.
- ✓ **PDF Generation**: Service for generating downloadable legal PDF artifacts.
- ✓ **Documentation & Rules**: Established `PROJECT_RULES.md`, `ARCHITECTURE.md`, and `CHANGELOG.md`.
