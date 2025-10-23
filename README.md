# College-Event-Management-System
# College Events Management System

A full-stack web application for managing college events with AI-powered recommendations.

## Features
- 🎯 Event Discovery & Registration
- 🔐 User Authentication
- 🎫 Digital Ticketing with QR Codes
- 🤖 AI-Powered Recommendations
- 📱 Responsive Design
- 🌙 Dark Mode Support
- 🔍 Advanced Search & Filters

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB
- **AI:** Python, Scikit-learn
- **Authentication:** JWT

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB
- Python 3.8+ (for AI features)

### Installation

1. **Clone and setup:**
```bash
unzip college-events-management-system.zip
cd college-events-management-system

college-events-management-system/
├── 📄 README.md
├── 📄 package.json
├── 📁 server/
│   ├── 📄 package.json
│   ├── 📄 server.js
│   ├── 📄 .env
│   ├── 📁 models/
│   │   ├── 📄 User.js
│   │   ├── 📄 Event.js
│   │   └── 📄 Ticket.js
│   ├── 📁 routes/
│   │   ├── 📄 auth.js
│   │   ├── 📄 events.js
│   │   └── 📄 users.js
│   ├── 📁 middleware/
│   │   └── 📄 auth.js
│   └── 📁 config/
│       └── 📄 database.js
├── 📁 client/
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   ├── 📄 index.html
│   ├── 📁 src/
│   │   ├── 📄 main.jsx
│   │   ├── 📄 App.jsx
│   │   ├── 📄 index.css
│   │   ├── 📁 components/
│   │   │   ├── 📁 Layout/
│   │   │   │   ├── 📄 Header.jsx
│   │   │   │   └── 📄 Footer.jsx
│   │   │   └── 📁 Events/
│   │   │       └── 📄 EventCard.jsx
│   │   ├── 📁 pages/
│   │   │   ├── 📄 Home.jsx
│   │   │   ├── 📄 Events.jsx
│   │   │   ├── 📄 EventDetails.jsx
│   │   │   ├── 📄 Profile.jsx
│   │   │   ├── 📄 Login.jsx
│   │   │   └── 📄 Register.jsx
│   │   ├── 📁 contexts/
│   │   │   └── 📄 AuthContext.jsx
│   │   ├── 📁 services/
│   │   │   └── 📄 api.js
│   │   └── 📁 utils/
│   │       └── 📄 constants.js
│   └── 📁 public/
│       └── 📄 vite.svg
├── 📁 ai-recommendations/
│   ├── 📄 recommendation_engine.py
│   ├── 📄 recommendation_service.py
│   ├── 📄 requirements.txt
│   └── 📄 test_recommendations.py
└── 📁 scripts/
    ├── 📄 setup.sh
    ├── 📄 install-dependencies.sh
    └── 📄 start-all.js
