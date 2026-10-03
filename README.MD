# University Answer Evaluator

A web-based university answer evaluation system that allows students and educators to upload an official answer key and a student answer script, compare the answers, and view question-wise evaluation results.

## 🌐 Live Application

**Frontend:**
https://university-answer-evaluator.onrender.com

**Backend API:**
https://university-answer-evaluator-backend.onrender.com

**GitHub Repository:**
https://github.com/dev-Alankrit07/University-Answer-Evaluator

---

## 📌 Project Overview

University Answer Evaluator is a full-stack web application designed to simplify the evaluation of university examination answer scripts.

The system follows a structured evaluation workflow:

1. Create an evaluation.
2. Upload the official answer key.
3. Upload the student's answer script.
4. Manually start the comparison.
5. Evaluate the answers question by question.
6. Generate marks and feedback.
7. Store and display the evaluation history.

The project uses a lightweight frontend built with HTML, CSS, and JavaScript and a Flask-based Python backend.

---

## ✨ Features

* User registration and login
* Dashboard
* Create new evaluations
* Exam, subject, semester, and total-mark information
* Official answer-key PDF upload
* Student answer-script PDF upload
* Answer-key-first validation
* Student-answer upload validation
* Manual answer comparison
* Question-wise evaluation
* Marks calculation
* Percentage calculation
* Feedback for evaluated answers
* Review flags
* Results page
* Evaluation history
* Profile page
* Authentication using tokens
* PDF processing
* SQLite database
* 1 GB application-level upload limit
* Production deployment using Render
* Gunicorn production server
* CORS configuration for frontend/backend communication

---

## 🔄 Application Workflow

```text
Register / Login
       ↓
Dashboard
       ↓
Create Evaluation
       ↓
Upload Official Answer Key
       ↓
Answer Key Uploaded Successfully
       ↓
Continue to Student Answers
       ↓
Upload Student Answer Script
       ↓
Student Answer Script Uploaded Successfully
       ↓
Click Compare Answers
       ↓
Answer Evaluation
       ↓
Results
       ↓
Evaluation History
```

The comparison is initiated manually by the user after both required PDF files have been uploaded.

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Fetch API
* Local Storage

### Backend

* Python 3.11.9
* Flask
* Flask-CORS
* Gunicorn
* python-dotenv
* Werkzeug

### PDF Processing

* PyMuPDF

### Database

* SQLite

### Deployment

* GitHub
* Render
* Gunicorn

---

## 📁 Project Structure

```text
University-Answer-Evaluator/
│
├── .gitignore
├── .python-version
├── README.md
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── create-evaluation.html
│   ├── answer-key.html
│   ├── student-answers.html
│   ├── processing.html
│   ├── results.html
│   ├── review.html
│   ├── history.html
│   ├── profile.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── evaluation.css
│   │
│   └── js/
│       ├── main.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── evaluation.js
│       ├── api.js
│       ├── results.js
│       ├── history.js
│       └── profile.js
│
└── backend/
    ├── app.py
    ├── config.py
    ├── database.py
    ├── requirements.txt
    │
    ├── routes/
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── evaluation.py
    │   └── results.py
    │
    ├── services/
    │   ├── __init__.py
    │   ├── pdf_service.py
    │   ├── ocr_service.py
    │   ├── evaluation_service.py
    │   └── scoring_service.py
    │
    ├── uploads/
    │   ├── answer_keys/
    │   └── student_answers/
    │
    └── reports/
```

---

## ⚙️ Backend API

The backend exposes REST-style API endpoints used by the frontend.

### Health Check

```text
GET /api/health
```

Used to verify that the backend API is available.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

### Evaluations

```text
POST /api/evaluations
GET  /api/evaluations
GET  /api/evaluations/<id>
```

### Answer Key

```text
POST /api/evaluations/<id>/answer-key
```

### Student Answers

```text
POST /api/evaluations/<id>/student-answers
```

### Comparison

```text
POST /api/evaluations/compare
```

The comparison endpoint is called only after both required documents have been uploaded.

### Results

```text
GET /api/results/<evaluation_id>
```

---

## 💻 Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/dev-Alankrit07/University-Answer-Evaluator.git
```

```bash
cd University-Answer-Evaluator
```

### 2. Create a Python virtual environment

From the project root:

```bash
python -m venv venv
```

Activate it on Windows:

```cmd
venv\Scripts\activate
```

### 3. Install backend dependencies

```cmd
cd backend
pip install -r requirements.txt
```

### 4. Start the Flask backend

```cmd
python app.py
```

The local backend runs at:

```text
http://127.0.0.1:5000
```

### 5. Start the frontend

Open another terminal:

```cmd
cd frontend
python -m http.server 5500
```

The local frontend runs at:

```text
http://127.0.0.1:5500
```

---

## 🔐 Environment Variables

Production configuration uses environment variables.

```text
APP_ENV=production
SECRET_KEY=<your-secret-key>
FRONTEND_ORIGIN=https://university-answer-evaluator.onrender.com
PORT=<provided by hosting platform>
```

Never commit real secrets or `.env` files to GitHub.

---

## 🚀 Production Deployment

The application is deployed using Render.

### Frontend

The frontend is deployed as a Render Static Site.

```text
Root Directory: frontend
Build Command: none
Publish Directory: .
```

### Backend

The backend is deployed as a Render Web Service.

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
```

Production start command:

```bash
gunicorn --bind 0.0.0.0:$PORT app:app
```

The project uses `.python-version` to specify:

```text
3.11.9
```

---

## 🗃️ Database

The current application uses SQLite for local application data.

The database stores information related to:

* Users
* Evaluations
* Uploaded documents
* Evaluation results
* Question-wise results

---

## 📄 PDF Upload

The application supports PDF uploads for:

* Official answer keys
* Student answer scripts

The application validates uploaded files and maintains separate storage locations for answer keys and student answer scripts.

The configured application-level upload limit is 1 GB.

---

## 🔒 Validation and Security

The application includes several validation mechanisms:

* Authentication checks
* Authorization checks
* Evaluation ownership checks
* Secure filenames
* PDF validation
* Upload-size validation
* Required evaluation validation
* Answer-key-first workflow
* Student-answer upload restrictions
* Manual comparison initiation
* Production secret-key configuration
* CORS configuration

---

## 🧪 Tested Workflow

The deployed application has been tested through the complete workflow:

```text
Registration
    ↓
Login
    ↓
Dashboard
    ↓
Create Evaluation
    ↓
Answer Key Upload
    ↓
Student Answer Upload
    ↓
Manual Comparison
    ↓
Results
    ↓
History
```

The production frontend successfully communicates with the deployed Flask backend.

---

## ⚠️ Current Limitations

### Persistent Storage

The current Render Free deployment does not provide a persistent disk.

Therefore, SQLite database files and uploaded files stored on the service filesystem should not be considered permanent across all service lifecycle events.

For a long-term production deployment, persistent database and file/object storage should be added.

### OCR

The current implementation should not be considered a full handwritten-answer OCR system unless a real OCR engine is configured and integrated.

PDFs containing extractable text are the intended input for the current implementation.

### Evaluation Accuracy

Automated answer evaluation is dependent on the extracted document text and implemented comparison/scoring logic.

The system should be treated as an evaluation-assistance tool rather than a replacement for official university examination evaluation.

---

## 🔮 Future Enhancements

Possible future improvements include:

* PostgreSQL or another hosted database
* Persistent cloud file storage
* Real OCR integration
* Better handwritten-answer recognition
* Improved semantic answer matching
* Advanced NLP/LLM-based evaluation
* Teacher/admin accounts
* Multiple evaluator roles
* Detailed downloadable evaluation reports
* PDF report generation
* Advanced analytics
* Question-level performance analytics
* Subject-wise performance tracking
* Batch evaluation
* Improved examination-paper parsing
* Cloud storage integration
* Background processing for large files
* Improved scalability

---

## 🎯 Project Objective

The objective of University Answer Evaluator is to provide a structured digital platform for assisting with university answer-script evaluation.

The system aims to reduce repetitive manual work, organize evaluation records, and provide transparent question-wise feedback while keeping the evaluation process explainable.

---

## 👨‍💻 Project Status

**Status: Deployed and functional**

The application is currently available through the public Render frontend.

### Live Frontend

https://university-answer-evaluator.onrender.com

### Live Backend

https://university-answer-evaluator-backend.onrender.com

---

## 📜 License

This project is currently intended as an academic/educational project.

A formal open-source license can be added in the future if required.
