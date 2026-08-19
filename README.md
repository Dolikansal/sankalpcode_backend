# ⚡ SankalpCode — Backend REST API

A scalable, secure, and production-ready backend service built with **Node.js, Express.js, and MongoDB** to power the **SankalpCode** interactive coding and learning ecosystem.

🔗 **Frontend Application:** [https://sankalpcode-frontend-silk.vercel.app/signup](https://sankalpcode-frontend-silk.vercel.app/signup)  
📂 **Backend Repository:** [https://github.com/Dolikansal/sankalpcode_backend](https://github.com/Dolikansal/sankalpcode_backend)

---

## 🌟 Architectural Overview

The backend uses a standard **Layered Controller-Service-Model Architecture** adhering to separation of concerns:

[ Client Request ]
│
▼
[ Security Middlewares (CORS, Helmet, Rate Limiter) ]
│
▼
[ Routing Layer (/api/v1/auth, /api/v1/users, /api/v1/problems) ]
│
▼
[ Auth & Validation Middlewares (JWT Verify, Role Guard, Joi/Zod) ]
│
▼
[ Controllers (Request parsing & response dispatching) ]
│
▼
[ Services / Business Logic ]
│
▼
[ Data Access Layer (Mongoose Schemas & MongoDB Database) ]

---

## ✨ Core Functionalities & Modules

### 1. 🔐 Authentication & Role-Based Authorization
- **User Registration & Login:** Password hashing with `bcryptjs` (salt rounds: 10).
- **Session Tokens:** Stateless authentication utilizing JSON Web Tokens (`JWT`) signed with cryptographic secrets.
- **Role-Based Access Control (RBAC):** Middleware checks to enforce distinct access permissions (`student`, `instructor`, `admin`).
- **Profile Management:** Endpoints to fetch, update, and secure user credentials and preferences.

### 2. 📚 Course & Problem Management
- Full CRUD capabilities for programming problems, tutorials, and test cases.
- Tagging and difficulty categorization (`Easy`, `Medium`, `Hard`).
- Structured schema validation to store problem statements, constraints, boilerplate code, and hidden/sample test cases.

### 3. 📊 Submission & Progress Tracking
- User code submission logging with runtime, status (`Accepted`, `Wrong Answer`, `Time Limit Exceeded`), and timestamping.
- Profile stats calculating solved problems and learning milestones.

### 4. 🛡️ Security & Performance
- **Cross-Origin Resource Sharing (CORS):** Whitelisted access for the frontend production and development domains.
- **Environment Isolation:** Zero hardcoded credentials; all secrets injected at runtime via environment variables.
- **Centralized Error Handling:** Global error-handling middleware to intercept exceptions and dispatch structured error payloads without leaking stack traces in production.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js (v18+) | Non-blocking, event-driven JavaScript runtime |
| **Web Framework** | Express.js (v4.x) | Minimal and flexible HTTP web application framework |
| **Database** | MongoDB Atlas | Cloud-hosted NoSQL document database |
| **ODM** | Mongoose (v8+) | Schema-based data modeling for MongoDB |
| **Authentication** | JWT (`jsonwebtoken`) | Stateless token generation and verification |
| **Encryption** | `bcryptjs` | One-way password hashing algorithm |
| **Middleware & Tools** | `cors`, `dotenv`, `morgan` | Cross-origin requests, environment management, HTTP logging |

---

## 📁 Repository Structure

```text
sankalpcode_backend/
├── config/                 # Configuration files
│   └── db.js               # MongoDB connection logic (Mongoose instance)
├── controllers/            # Request handlers (business execution)
│   ├── authController.js   # User registration, login, logout
│   ├── userController.js   # User profile data & progress
│   └── problemController.js# Problem CRUD and listing logic
├── middleware/             # Custom express middlewares
│   ├── authMiddleware.js   # JWT verification and user extraction
│   ├── adminMiddleware.js  # Role verification guard
│   └── errorMiddleware.js # Centralized 404 & 500 error handlers
├── models/                 # Database Mongoose schemas
│   ├── User.js             # User identity, hashed passwords, solved stats
│   ├── Problem.js          # Problem description, difficulty, test cases
│   └── Submission.js       # Code submissions, verdicts, timestamps
├── routes/                 # Express API router declarations
│   ├── authRoutes.js       # /api/v1/auth
│   ├── userRoutes.js       # /api/v1/users
│   └── problemRoutes.js    # /api/v1/problems
├── utils/                  # Helper functions and token generators
│   └── generateToken.js    # JWT signing utility
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules (node_modules, .env)
├── package.json            # Dependencies and npm script declarations
├── server.js               # Main application entry point & listener
└── README.md               # Backend documentation
