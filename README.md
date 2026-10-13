# Quotation Automation

This project is a quotation management and automation system built with a FastAPI backend and a React frontend. It supports customer/product management, quotation creation, revision control, reminder automation, PDF generation, and reporting.

## Overview

The application is organized into two main parts:

- Backend: Python + FastAPI + SQLAlchemy
- Frontend: React + Vite + React Router

The backend exposes REST APIs for managing the core business data and scheduled reminder flows, while the frontend provides the user interface for interacting with quotations and settings.

## Main Features

- Customer management
- Product catalog management
- Quotation creation and detail view
- Quotation revision history and comparison
- Reminder configuration and automation
- Email-related quotation functionality
- PDF/report generation
- Audit log tracking
- Settings and reporting modules

## Project Structure

```text
quotation-automation/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── audit_logs.py
│   │   │   ├── customers.py
│   │   │   ├── products.py
│   │   │   ├── quotation_emails.py
│   │   │   ├── quotation_reminders.py
│   │   │   ├── quotation_revisions.py
│   │   │   ├── quotations.py
│   │   │   ├── reminder_controls.py
│   │   │   ├── reminder_settings.py
│   │   │   ├── reports.py
│   │   │   └── settings.py
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── generated/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
└── README.md
```

## Backend

The backend is a FastAPI application with:

- SQLAlchemy models for customers, products, quotations, revisions, reminders, and settings
- API routers for business features
- Scheduler support for quotation reminder automation
- PDF/report generation using reportlab
- Health and startup endpoints

Key backend entry point:

- `backend/app/main.py`

## Frontend

The frontend is a React application built with Vite. It includes pages such as:

- Dashboard
- Customers
- Products
- Quotations
- Quotation detail and editor views
- Revisions comparison
- Reminder settings and reminder list
- Reports
- Settings

Key frontend entry point:

- `frontend/src/main.jsx`

## Tech Stack

### Backend

- Python 3
- FastAPI
- SQLAlchemy
- Pydantic
- APScheduler
- ReportLab
- Uvicorn

### Frontend

- React
- Vite
- React Router
- Axios
- Lucide React

## Setup Instructions

### 1. Backend

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Always start the backend with the same activated virtual environment used to
install dependencies. In particular, the company logo upload route requires
`python-multipart`, which is included in `backend/requirements.txt`; after
updating dependencies, run the install step again before starting the API.

The API will run at:

- http://localhost:8000

### 2. Frontend

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The UI will run at:

- http://localhost:5173

## Notes

- The backend enables a scheduler at startup via the application lifecycle hooks.
- CORS is configured for the frontend development URL: `http://localhost:5173`.
- The app is structured for quotation automation workflows and operational reporting.

## Suggested Next Improvements

- Add environment-based configuration for development and production
- Add automated API tests for all routes
- Add deployment scripts for Docker or cloud hosting
- Improve documentation for the reminder and reporting flows
- Add user authentication and role-based access control
