# 💬 Convo — Real-Time Chat Application

**Convo** is a full-stack real-time messaging application built with the **MERN stack** and **Socket.IO**. It provides secure user authentication, private conversations, chat requests, real-time messaging, file sharing, message management, and customizable user profiles through a responsive web interface.

---

## 🚀 Features

* 🔐 **Authentication**

  * User registration and login
  * JWT-based authentication
  * Password hashing with bcrypt

* 💬 **Real-Time Messaging**

  * Instant one-to-one messaging using Socket.IO
  * Persistent conversation history
  * Real-time message synchronization

* 🤝 **Chat Requests**

  * Send connection/chat requests
  * Accept or reject incoming requests
  * Manage connected users

* 📁 **File & Media Sharing**

  * Upload images and documents
  * Store files using MongoDB GridFS
  * Stream uploaded files directly from the server

* ✏️ **Message Management**

  * Edit sent messages
  * Delete messages
  * Synchronize changes across connected clients

* ⌨️ **Typing & Presence**

  * Real-time typing indicators
  * Online/offline user status

* 😄 **Emoji Support**

  * Integrated emoji picker
  * Send expressive messages easily

* 👤 **User Profiles**

  * Customizable user profiles
  * User bios
  * Avatar customization
  * Full-screen avatar preview

* 🎨 **Responsive Interface**

  * Responsive design for different screen sizes
  * Framer Motion animations
  * Lucide and FontAwesome icons
  * Modern glassmorphism-based UI

---

## 🛠️ Tech Stack

### Frontend

| Technology           | Purpose                 |
| -------------------- | ----------------------- |
| **React 19**         | User interface          |
| **React Router 7**   | Client-side routing     |
| **Socket.IO Client** | Real-time communication |
| **Axios**            | HTTP requests           |
| **Framer Motion**    | UI animations           |
| **Lucide React**     | Icons                   |
| **FontAwesome**      | Icons                   |

### Backend

| Technology     | Purpose                 |
| -------------- | ----------------------- |
| **Node.js**    | Server runtime          |
| **Express.js** | REST API                |
| **Socket.IO**  | Real-time communication |
| **MongoDB**    | Database                |
| **Mongoose**   | MongoDB object modeling |
| **GridFS**     | File and media storage  |
| **JWT**        | Authentication          |
| **bcryptjs**   | Password hashing        |

---

## 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │      Convo       │
                         │   Web Client     │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
               REST API                    Socket.IO
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐       ┌──────────────────┐
          │  Express Server  │       │ Real-Time Server │
          └────────┬─────────┘       └────────┬─────────┘
                   │                          │
                   └────────────┬─────────────┘
                                │
                                ▼
                     ┌────────────────────┐
                     │      MongoDB       │
                     │                    │
                     │ Users              │
                     │ Messages           │
                     │ Chat Requests      │
                     │ GridFS Files       │
                     └────────────────────┘
```

---

## 📁 Project Structure

```text
Convo/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── API configuration
│   │   │
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Login/
│   │   │   ├── Profile/
│   │   │   └── ...
│   │   │
│   │   ├── utils/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── socket.js
│   │
│   └── package.json
│
├── server/
│   ├── models/
│   │   ├── User
│   │   ├── Message
│   │   └── ChatRequest
│   │
│   ├── routes/
│   │   ├── Auth
│   │   ├── Messages
│   │   └── ChatRequests
│   │
│   ├── index.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

* **Node.js 18+**
* **npm**
* **MongoDB** or a **MongoDB Atlas** account

---

### 1. Clone the Repository

```bash
git clone https://github.com/karthik-65/Convo.git
cd Convo
```

---

### 2. Configure the Backend

Navigate to the server:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/chat-app
JWT_SECRET=your_super_secret_jwt_key
CLIENT_ORIGINS=http://localhost:3000
```

For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

---

### 3. Start the Backend

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

The backend will run at:

```text
http://localhost:5000
```

---

### 4. Configure the Frontend

Open a new terminal and navigate to the client:

```bash
cd client
npm install
```

Create `.env.development` if your application uses environment-based API configuration:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### 5. Start the Frontend

```bash
npm start
```

The application will be available at:

```text
http://localhost:3000
```

---

## 🔑 Environment Variables

### Backend

Create:

```text
server/.env
```

| Variable         | Description                        |
| ---------------- | ---------------------------------- |
| `PORT`           | Port used by the Express server    |
| `MONGO_URI`      | MongoDB connection string          |
| `JWT_SECRET`     | Secret used to generate JWT tokens |
| `CLIENT_ORIGINS` | Allowed frontend origins for CORS  |

### Frontend

Depending on your configuration:

```text
client/.env.development
client/.env.production
```

| Variable               | Description          |
| ---------------------- | -------------------- |
| `REACT_APP_API_URL`    | Backend API URL      |
| `REACT_APP_SOCKET_URL` | Socket.IO server URL |

> **Important:** Never commit `.env` files or secret keys to GitHub.

---

## 📡 API Overview

### Authentication

| Method | Endpoint             | Description                        |
| ------ | -------------------- | ---------------------------------- |
| `POST` | `/api/auth/register` | Register a new user                |
| `POST` | `/api/auth/login`    | Authenticate a user                |
| `GET`  | `/api/auth/me`       | Get authenticated user information |

### Messages

| Method   | Endpoint                | Description                   |
| -------- | ----------------------- | ----------------------------- |
| `GET`    | `/api/messages/:userId` | Retrieve conversation history |
| `POST`   | `/api/messages`         | Send a message                |
| `PUT`    | `/api/messages/:id`     | Edit a message                |
| `DELETE` | `/api/messages/:id`     | Delete a message              |

### Chat Requests

| Method | Endpoint                 | Description                |
| ------ | ------------------------ | -------------------------- |
| `POST` | `/api/chat-requests`     | Send a chat request        |
| `GET`  | `/api/chat-requests`     | Retrieve pending requests  |
| `PUT`  | `/api/chat-requests/:id` | Accept or reject a request |

### File Handling

| Method | Endpoint          | Description            |
| ------ | ----------------- | ---------------------- |
| `POST` | `/api/upload`     | Upload a file          |
| `GET`  | `/file/:filename` | Retrieve a stored file |

---

## 🔄 How Real-Time Messaging Works

```text
User A
  │
  │ Sends message
  ▼
React Client
  │
  │ Socket.IO
  ▼
Node.js + Socket.IO Server
  │
  ├── Save message
  │        │
  │        ▼
  │     MongoDB
  │
  └── Emit message
           │
           ▼
       User B
```

Socket.IO maintains a persistent connection between clients and the server, allowing messages, typing indicators, presence updates, and message changes to be delivered without refreshing the page.

---

## 🔐 Authentication Flow

```text
Register / Login
       │
       ▼
Express API
       │
       ▼
Validate Credentials
       │
       ▼
Generate JWT
       │
       ▼
Authenticated Client
       │
       ▼
Protected API Requests
```

Passwords are hashed using **bcryptjs**, while **JWT** tokens are used to authenticate protected requests.

---

## 📸 Screenshots

Add screenshots of your application here.

```text
screenshots/
├── login.png
├── register.png
├── chat.png
├── profile.png
└── requests.png
```

Then display them in the README:

```markdown
![Login](screenshots/login.png)

![Chat](screenshots/chat.png)

![Profile](screenshots/profile.png)
```

---

## 🌐 Deployment

Convo can be deployed using separate services for the frontend, backend, and database.

### Frontend

**Netlify**

### Backend

**Render**

### Database

**MongoDB Atlas**

For production deployment, update the frontend API and Socket.IO URLs to point to the deployed backend.

---

## 🔮 Future Enhancements

* 👥 Group conversations
* 📞 Audio and video calling
* 🎙️ Voice messages
* 🔔 Push notifications
* 🔍 Message search
* 🗑️ Message deletion for both users
* 🌙 Dark mode
* 😀 GIF and sticker support
* 📱 Progressive Web App support
* 🔒 End-to-end message encryption

---

## 📚 What I Learned

Building Convo provided hands-on experience with:

* Full-stack MERN development
* REST API design and integration
* Real-time communication using Socket.IO
* JWT authentication and authorization
* Password hashing with bcrypt
* MongoDB and Mongoose
* MongoDB GridFS file storage
* React component-based development
* Client-server communication
* WebSocket event handling
* Responsive UI development
* Git and GitHub
* Full-stack application deployment

---

## 👨‍💻 Author

**Karthik**

B.Tech — Computer Science and Engineering

* GitHub: [karthik-65](https://github.com/karthik-65)
* LinkedIn: [Karthik Sankar Majji](https://www.linkedin.com/in/karthik-sankar-majji-9155322b4)

---

## ⭐ Support

If you found this project useful, consider giving the repository a ⭐ on GitHub.


