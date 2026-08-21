# ARCHITECTURE & DESIGN DOCUMENTATION

## 1. Project Overview
The **AI Legal Assistant** is an AI-powered legal document generation, case analysis, Indian law query research, and document management platform built using a Django REST Framework backend and a React (TypeScript + Vite) frontend.

---

## 2. Directory & Directory Structure

```
AI-legal assist project/
├── PROJECT_RULES.md                # AI coding standards & constraints
├── ARCHITECTURE.md                 # System architecture & database reference
├── CHANGELOG.md                    # Release & task tracking
├── README.md                       # Setup and deployment instructions
├── requirements.txt                # Python backend dependencies
├── frontend/                       # React + TypeScript + Vite frontend app
│   ├── src/
│   │   ├── components/            # Reusable UI components (Sidebar, Navbar, etc.)
│   │   ├── pages/                 # Page components (UserDashboard, Login, SignUp, etc.)
│   │   ├── context/               # React Context Providers (Auth, Theme)
│   │   ├── services/              # API Client & Axios integration
│   │   ├── App.tsx                # Main App & Router definition
│   │   └── main.tsx               # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── project/                       # Django project root
    ├── manage.py
    ├── db.sqlite3                 # Local SQLite database
    ├── IndiaLaw.db                # Legal database (statutes, acts, case laws)
    ├── project/                   # Core Django project settings & ASGI/WSGI
    └── AILegal/                   # Primary Django application module
        ├── models.py              # Database models (User, Document, LegalCase, Query, etc.)
        ├── views.py               # API endpoints & controller logic
        ├── urls.py                # REST API routing
        ├── serializers.py         # DRF serializers
        ├── admin.py               # Admin interface setup
        ├── ikapi_service.py       # Indian Kanoon API integration
        ├── gemini_email_service.py# AI & Email automation services
        ├── pdf_service.py         # PDF generation service
        └── services.py            # Business logic helpers
```

---

## 3. Database Schema Overview

Primary Models in `AILegal`:
- **User / Profile**: Authentication, user profiles, subscription plans, role management (Client, Lawyer, Admin).
- **Document / GeneratedDocument**: Legal document templates, drafts, generated PDFs, export metadata.
- **LegalQuery / CaseSearch**: Indian Kanoon search history, AI legal assistant queries, citation references.
- **EmailNotification / Verification**: Verification tokens, automated email logs.

---

## 4. Primary API Services & Integrations

- **Authentication**: JWT token endpoints (`/api/token/`, `/api/token/refresh/`) using SimpleJWT.
- **Indian Kanoon Integration (`IKAPI`)**: Queries legal judgments, statutes, and acts from Indian Kanoon database.
- **Google Gemini AI Service**: Generates legal advice, draft summaries, document templates, and case law insights.
- **PDF Service**: Converts draft documents into structured legal PDF downloads.

---

## 5. Feature Status

### Features Completed
- [x] Django Backend setup with DRF & JWT authentication.
- [x] Full Google OAuth 2.0 authentication flow with backend ID token validation, account linking, popup monitoring, and default citizen role.
- [x] Google Authenticator (TOTP 2FA) setup with QR code scanning, base32 secret generation, backend code verification, and React setup modal.
- [x] Enterprise Role-Based Access Control (RBAC) with 4 roles (Super Admin, Admin, Lawyer, Citizen), permission matrix, middleware, DRF permission classes, and React route guards.
- [x] React TypeScript Frontend initialized with Vite and Tailwind CSS.
- [x] User Dashboard and authentication pages.
- [x] Indian Kanoon API integration (`ikapi_service.py`).
- [x] AI Legal Query Service using Gemini API.
- [x] Project Rules & Architecture documentation setup.

### Features Pending / In Progress
- [ ] Comprehensive test suite for legal query endpoints.
- [ ] Advanced billing & payment integration (Stripe / Razorpay).
- [ ] Enhanced document collaboration & electronic signature workflow.
