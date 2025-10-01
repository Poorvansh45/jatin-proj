<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&pause=1000&color=6366F1&background=00000000&center=true&vCenter=true&width=600&lines=SkillBridge+Connect;Peer-to-Peer+Learning+Platform;Connecting+Students+Worldwide" alt="Typing SVG" />
</div>

## 🚀 Features

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="600">
</div>

<div align="center">

| Feature | Description | Status |
|:---:|:---|:---:|
| 🔐 **Google OAuth Authentication** | Secure login with Google accounts | ✅ |
| 💬 **Real-time Messaging** | Socket.io powered instant chat | ✅ |
| 📝 **Request Management** | Create, accept, and complete help requests | ✅ |
| 🏷️ **Category System** | Organized by subject areas | ✅ |
| 👤 **User Profiles** | Skills, ratings, and reviews | ✅ |
| 🤖 **Learning Chatbot** | AI-powered chatbot to assist users with instant answers, study help, and platform guidance | ✅ |
| 📧 **Email Notifications** | Automated email alerts for request updates, new messages, and important actions | ✅ |
| 📱 **Responsive Design** | Works perfectly on all devices | ✅ |

</div>

## ✨ Highlighted Features

- **Learning Chatbot:**
  - Get instant answers to academic questions, platform usage, and study help.
  - The chatbot is available 24/7 to guide users, suggest resources, and provide smart support.

- **Email Notifications:**
  - Receive real-time email alerts when your request is accepted, completed, or when you get a new message.
  - Stay updated on all important activities without missing a beat.

## 🛠️ Tech Stack

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" width="100">
</div>

<div align="center">
### Frontend

- React 18 + TypeScript
- Vite (Build tool)
- Axios (HTTP client)
- Socket.io Client (Real-time)
- Tailwind CSS + shadcn/ui
- React Router DOM
- React Query

### Backend

- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (Real-time)
- JWT Authentication
- Google OAuth

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 📦 Installation

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="400">
</div>

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)

### 🔧 Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/skillwave
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:8000
```

Seed the database:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

### 🎨 Frontend Setup

```bash
npm install
```

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Start the frontend:

```bash
npm run dev
```

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 🎯 Usage

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="600">
</div>

<div align="center">
  
| Step | Action | Description |
|:---:|:---:|:---|
| 1️⃣ | **Register/Login** | Use Google OAuth to create an account |
| 2️⃣ | **Create Requests** | Post help requests in various categories |
| 3️⃣ | **Browse Requests** | Find requests that match your skills |
| 4️⃣ | **Accept Requests** | Help other students with their queries |
| 5️⃣ | **Chat** | Real-time messaging with request participants |
| 6️⃣ | **Complete Requests** | Mark requests as finished and get rated |

</div>

## 📁 Project Structure

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" width="100">
</div>

```
📦 SkillWave Connect
├── 📁 src/                    # Frontend source
│   ├── 📁 components/         # Reusable UI components
│   ├── 📁 contexts/          # React contexts
│   ├── 📁 pages/             # Route components
│   ├── 📁 services/          # API and socket services
│   └── 📁 utils/             # Helper functions
├── 📁 backend/               # Backend source
│   ├── 📁 models/            # MongoDB models
│   ├── 📁 routes/            # API routes
│   ├── 📁 config/            # Database config
│   └── 📁 scripts/           # Database scripts
└── 📄 README.md
```

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 🔧 API Endpoints

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="400">
</div>

### 🔐 Authentication

- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify` - Verify JWT token

### 📝 Requests

- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create new request
- `GET /api/requests/:id` - Get single request
- `POST /api/requests/:id/accept` - Accept request
- `POST /api/requests/:id/complete` - Complete request
- `GET /api/requests/categories/all` - Get categories

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 🚀 Deployment

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" width="100">
</div>

### Backend (Railway/Heroku)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Frontend (Vercel/Netlify)

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set environment variables
4. Deploy automatically

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 📝 Environment Variables

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="400">
</div>

### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/skillwave
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:8000
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>
