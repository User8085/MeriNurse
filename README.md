# MeriNurse — AI-Powered Healthcare Portal & Record Management

MeriNurse is a state-of-the-art, full-stack patient-doctor web portal. It integrates advanced medical record storage, AI-driven report analysis, drug-allergy matching against a massive database of 253k+ Indian medicines, real-time FDA drug interaction checks, a highly personalized chatbot, and an integrated appointment scheduling workflow.

---

#  Features & Core Capabilities

# 1. Personalized AI Health Assistant & Chatbot
 **Context-Aware Assistance**: The chatbot automatically retrieves the patient's medical history—including the last 10 medical records, AI summaries, diagnosed conditions, active prescriptions, and documented allergies—injecting it directly into the Gemini API system prompt for personalized advice.
 **Inline Allergy Recording**: Patients can add allergies by simply chatting (e.g., "I'm allergic to paracetamol"*). The AI generates a structured command tag `[ADD_ALLERGY:{...}]` which is automatically intercepted by the backend router to record the allergy in MongoDB.
**Clean Formatting**: Output is rendered using a custom markdown parser that strips distraction markers (such as raw markdown double asterisks) and displays clean bold headers, list items, and paragraph styling.

# 2. Intelligent Medical Report Analysis
* **Automated Document OCR & Summary**: Uploading lab tests, imaging reports, or consultation letters automatically triggers Google Gemini to extract structural metrics, primary impressions, and clinical findings.
**Auto-Allergy Extraction**: The AI analyzes medical files for mention of allergic reactions or warnings, outputting a structured block (`DETECTED_ALLERGIES_JSON:...`) that adds those allergies to the patient profile automatically.

# 3. Dual-Mode Prescription Management
**Flexible Prescription Adding**: Includes an interface modal supporting:
  1. **Manual Entry**: Quick fields for name, dosage, frequency, and duration.
  2. **AI OCR Upload**: Extracts prescription details directly from a photo or scan.
**Clear Attribution Badges**: Cards are marked clearly with badges: `AI-Extracted`, `Self-Entered`, or `Doctor-Prescribed`.
**Proactive Warning Engine**: Automatically queries active prescriptions against:
  1. **OpenFDA**: To cross-reference global drug-drug interactions.
  2. **SQLite Database**: To scan the patient's active allergies against the prescribed medication's salt composition.

# 4. SQLite Indian Medicine Database
**Local Indexing**: Links a dataset of **253,000+ Indian medicines** directly in the backend.
**Automatic Seeding**: Built on Node 22's native `node:sqlite` API, the server detects if the local `medicines.db` exists. If not, it parses the root CSV file (`updated_indian_medicine_data - Copy.csv`) and creates the index inside a single SQLite transaction automatically on startup.
**Advanced Allergy & Cross-Reactivity Engine**:
  * Matches direct allergen brand names and salt compositions.
  * Cross-references drug families via class-based rules (Penicillins, NSAIDs, Cephalosporins, Macrolides, Sulfas, Fluoroquinolones).
  * Warns patients and doctors immediately on the dashboard if a newly added prescription contains a potential allergen.

# 5. Doctor-Patient Appointment Scheduler
 **Booking System**: Patients can request appointments with registered doctors, detailing a date, time, and reason.
 **Approval Workflow**: Doctors can view pending requests, confirm them (optionally adding notes), or decline them.
 **Dashboard Widgets**: Active appointments are displayed directly in the user and doctor dashboards with status color indicators (`Pending` 🟡, `Confirmed` 🟢, `Declined` 🔴).

# 6. Granular Doctor Access Controls
**Patient-Consent Model**: Patients explicitly grant, update, or revoke access permissions for individual doctors.
**Granular Levels**: Patients can control what doctors can see (e.g., viewing medical records vs uploading prescriptions).

---

# Tech Stack

| Component | Technology | Description |

| **Frontend** | React 19 + Vite | Built-in UI, fast page loads, responsive navigation |
| **Styling** | Vanilla CSS Variables | Curated dark/light medical aesthetic, custom grid dashboards |
| **Backend** | Node.js (v22+) + Express | Scalable API gateway, custom authorization middlewares |
| **Primary DB** | MongoDB + Mongoose | Stores user credentials, metadata, appointments, allergies, and access rules |
| **Medicine DB** | SQLite (`node:sqlite`) | High-speed local searches for 253k+ Indian drug records |
| **GenAI APIs** | Google Gemini (1.5 Flash) | Handles chatbot personalization, image analysis, and report reading |
| **Medical APIs** | OpenFDA & RxNav | Powers drug information search, interactions, and adverse events |



# Project Structure


MeriNurse/
├── client/                     # React Single Page App
│   ├── public/                 # Static assets
│   └── src/
│       ├── components/         # Shared layouts (Navbar, Sidebar)
│       ├── context/            # AuthContext (JWT management)
│       ├── pages/              # Main UI views (Dashboard, Records, Chat, Prescriptions, Appointments, etc.)
│       └── services/           # api.js (Axios instances for routing)
├── server/                     # Express Backend
│   ├── config/                 # db.js (Mongoose DB client)
│   ├── middleware/             # auth.js (Access control layers), upload.js (Multer file storage)
│   ├── models/                 # Mongoose schemas (User, Prescription, Appointment, Allergy, etc.)
│   ├── routes/                 # Express API Route Handlers
│   ├── services/               # geminiService.js, drugService.js, indianMedicineService.js
│   ├── uploads/                # Temporary/permanent storage directory for uploads
│   ├── medicines.db            # SQLite database (auto-generated on boot)
│   └── server.js               # Express application entrypoint
├── updated_indian_medicine_data - Copy.csv   # Local Indian drug composition database
├── .env.example                # Default configuration skeleton
└── README.md                   # Project Documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: Version 22.0.0 or higher (required for built-in `node:sqlite`)
* **MongoDB**: A running local instance or a MongoDB Atlas connection string
* **API Keys**:
  * **Google Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
  * **OpenFDA API Key**: [OpenFDA Portal](https://open.fda.gov/apis/authentication/) *(Optional, but prevents rate-limiting)*

### Step 1: Clone and Configure
Navigate to your project root folder and create a `.env` file from the example:
```bash
cp .env.example .env
```
Open `.env` and fill in your actual credentials (MongoDB connection, Gemini Key, and OpenFDA Key).

# Step 2: Install Dependencies (Root Command)
From the project root directory, run the install command. This automatically triggers installation for both client and server packages:
```bash
npm install
```

# Step 3: Launch the Application
Start both the backend API server and frontend client concurrently with a single command from the project root:
```bash
npm run dev
```
Note: During the first startup, the SQLite database compilation takes ~5-15 seconds depending on disk speed.

# Step 4: Access the Application
Open your browser and visit: **`http://localhost:5173`**

---

# Alternative: Running Separately
If you prefer to run the client and server in separate terminal windows:
 **Backend Server**:
  ```bash
  cd server
  npm run dev
  ```
 **Frontend Client**:
  ```bash
  cd client
  npm run dev
  ```

---

# API Reference

# Authentication (`/api/auth`)
* `POST /api/auth/register` — Registers a new `patient` or `doctor`.
* `POST /api/auth/login` — Verifies credentials, returning a JWT token.
* `GET /api/auth/me` — Fetches current user profile and session data.

# Medical Records (`/api/records`)
* `GET /api/records` — Retrieves medical records belonging to the patient (or shared with the calling doctor).
* `POST /api/records` — Uploads a medical record document (PDF/Image) using Multer.
* `POST /api/records/:id/analyze` — Triggers Gemini to analyze the report and extract summaries/allergies.
* `DELETE /api/records/:id` — Removes a record and its linked file.

# Prescriptions & Allergies (`/api/prescriptions` / `/api/allergies`)
* `GET /api/prescriptions` — Lists prescriptions (performs allergy database checks against active salts).
* `POST /api/prescriptions` — Creates a prescription manually or extracts data via OCR.
* `GET /api/allergies` — Fetches user's registered allergies.
* `POST /api/allergies` — Adds an allergy manually.
* `DELETE /api/allergies/:id` — Removes/soft-deletes an allergy.

# AI Chatbot (`/api/chat`)
* `GET /api/chat/conversations` — Retrieves conversation list.
* `POST /api/chat/conversations/:id/messages` — Sends a message to the bot (personalizes dynamically using current medical reports and allergy DB).

# Appointments (`/api/appointments`)
* `GET /api/appointments` — Lists appointments for the logged-in user (patients see booked, doctors see requests).
* `POST /api/appointments` — Patients request a new appointment time slot.
* `PUT /api/appointments/:id/confirm` — Doctor confirms an appointment (adds date/time/notes).
* `PUT /api/appointments/:id/decline` — Doctor declines an appointment.
* `DELETE /api/appointments/:id` — Cancels an appointment.

# Drug Information (`/api/drugs`)
* `GET /api/drugs/search?q=...` — Searches FDA drug catalogs.
* `POST /api/drugs/interactions` — Submits a list of drugs to check for dangerous interactions via RxNav.

---

Built with ❤️ by Shubh._Saysss for better, safer patient care.
=======
# MeriNurse
MeriNurse is an AI-Powered healthcare platform for securely storing, organizing and accessing medical records, prescriptions and health document, with intelligent document management features.

