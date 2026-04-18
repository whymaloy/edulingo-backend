# EduLingo – English Learning Platform

A full-stack LMS (Learning Management System) for English teachers and students.

---

## 📁 Folder Structure

```
project/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Lesson.js
│   │   ├── Test.js
│   │   ├── TestResult.js
│   │   └── Homework.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── lessons.js
│   │   ├── tests.js
│   │   └── homework.js
│   ├── uploads/           ← uploaded files stored here
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── css/
    │   ├── style.css
    │   └── dashboard.css
    ├── js/
    │   ├── api.js
    │   ├── auth.js
    │   ├── teacher.js
    │   └── student.js
    ├── index.html               ← Login / Register
    ├── teacher-dashboard.html
    └── student-dashboard.html
```

---

## 🚀 How to Run

### Requirements
- **Node.js** v18+ → https://nodejs.org
- **MongoDB Community** (local) → https://www.mongodb.com/try/download/community  
  _OR_ use a free **MongoDB Atlas** cloud database.

---

### Step 1 – Install Dependencies

Open a terminal and run:

```bash
cd backend
npm install
```

---

### Step 2 – Configure Environment

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/lms
JWT_SECRET=supersecretjwtkey_for_lms_demo
```

If using **MongoDB Atlas**, replace `MONGODB_URI` with your Atlas connection string.

---

### Step 3 – Start MongoDB

If running locally, make sure MongoDB service is running:
- **Windows**: Open Services → Start "MongoDB"
- Or run: `"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"`

---

### Step 4 – Start the Backend Server

```bash
cd backend
npm start
```

You should see:
```
Server running on port 5000
Connected to MongoDB
```

---

### Step 5 – Open the Frontend

Open `frontend/index.html` directly in your browser  
(double-click or use VS Code Live Server extension).

> **Tip**: If using VS Code, install the "Live Server" extension and right-click `index.html` → "Open with Live Server".

---

## 🔑 Roles

| Role    | Access |
|---------|--------|
| Teacher | Create lessons, tests, homework; grade submissions; view progress |
| Student | View lessons, take tests, submit homework; see own results |

Register two accounts: one with role **Teacher** and one with role **Student**.

---

## ✨ Features

- **Authentication**: JWT-based secure login & register
- **Teacher Dashboard**:
  - Create / view / delete lessons (with video URL + file uploads)
  - Create multiple-choice tests (auto-graded)
  - Assign homework
  - Grade student submissions with feedback
  - View student progress with progress bars
- **Student Dashboard**:
  - Browse and view lessons (video + downloadable materials)
  - Take tests (instant score results)
  - Submit homework (text or file)
  - View all scores and homework feedback
- **Responsive** design for mobile, tablet, and desktop
- **Modern UI** with dark theme, animations, toast notifications

---

## 🛠 Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend  | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth     | JWT + bcryptjs |
| Uploads  | Multer |
