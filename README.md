# 📚 BookNook — Backend API

BookNook is a small online library management application. This repository contains the backend API responsible for managing books, borrowing operations, book availability, and secure user authorization.

The backend is built with Node.js, Express.js, and MongoDB, with JWT-based authentication to protect private API routes.

## 🌐 Live API

**Backend URL:** https://b14-booknook-server.vercel.app

**Health Check:** https://b14-booknook-server.vercel.app/api/health

**Frontend:** https://b14-booknook-client.vercel.app

**Backend Repository:** https://github.com/dhsamrat/b14-booknook-server

**Frontend Repository:** https://github.com/dhsamrat/b14-booknook-client

## ✨ Key Features

- **Book Management:** Create, retrieve, update, and delete books.
- **Latest Books:** Retrieve the newest books added to the library.
- **Book Details:** Fetch individual book information using its ID.
- **Borrow Books:** Allow authenticated users to borrow available books.
- **Return Books:** Process book returns and restore available copies.
- **Book Availability:** Automatically update available copies during borrowing and returning.
- **Duplicate Borrow Prevention:** Prevent users from borrowing the same active book multiple times.
- **JWT Authentication:** Verify user identity using JSON Web Tokens.
- **Protected API Routes:** Restrict book management and borrowing operations to authenticated users.
- **Ownership Verification:** Ensure users can manage only their own books and borrow records.

## 🛠️ Technologies Used

- Node.js
- Express.js
- MongoDB
- MongoDB Node.js Driver
- Better Auth
- JSON Web Token (JWT)
- JOSE
- CORS
- dotenv
- Vercel

## 📂 Project Structure

```text
b14-booknook-server/
├── index.js
├── package.json
├── package-lock.json
├── vercel.json
├── .env
└── README.md
```

*Note: The structure above represents the main backend files. Your actual deployment configuration may contain additional files.*

## 🔗 API Endpoints

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check server status |

### Book APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/add-book` | Add a new book | Private |
| GET | `/all-books` | Retrieve all books | Public |
| GET | `/latest-books` | Retrieve latest books | Public |
| GET | `/all-books/:id` | Get book details | Private |
| PATCH | `/all-books/:id` | Update a book | Private |
| DELETE | `/all-books/:id` | Delete a book | Private |

### Borrow APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/borrows` | Borrow a book | Private |
| GET | `/my-borrows/:email` | Get user's borrowed books | Private |
| DELETE | `/my-borrows/:id` | Return a borrowed book | Private |

**Note:** Private endpoints require a valid JWT in the Authorization header.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## ⚙️ Installation and Setup

Follow these steps to run the backend locally.

### 1. Clone the Repository

```bash
git clone https://github.com/dhsamrat/b14-booknook-server.git
```

### 2. Navigate to the Project Folder

```bash
cd b14-booknook-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

Add the required Better Auth configuration and Google OAuth credentials to the appropriate environment where applicable.

**Important:** Never commit `.env` files, database credentials, JWT secrets, or Google OAuth secrets to GitHub.

### 5. Start the Development Server

Use the appropriate development command configured in your project.

```bash
node index.js
```

The backend will run at:

```text
http://localhost:5000
```

## 🔐 Authentication and Security

BookNook backend uses JWT-based authentication to secure private API endpoints.

- JWT tokens are issued through Better Auth.
- JWT verification is handled using JOSE.
- Public routes allow visitors to explore books.
- Protected routes require valid authentication.
- User ownership is verified before sensitive operations.
- Borrowing and returning operations maintain book availability.

## 🗄️ Database

BookNook uses MongoDB for storing application data.

Main collections:

- **add:** Stores book information.
- **borrows:** Stores borrowing records and return information.

Book availability is updated when users borrow or return books.

## 🚀 Deployment

The backend is deployed using Vercel.

Production API:

https://b14-booknook-server.vercel.app

Health check:

https://b14-booknook-server.vercel.app/api/health

## 👨‍💻 Developer

**Delowar Hossain Samrat**

GitHub: https://github.com/dhsamrat

---

**BookNook — Discover, Borrow, and Read.**
