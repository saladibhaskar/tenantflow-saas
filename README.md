# TenantWorks – Multi-Tenant Task & Project Manager

TenantWorks is a **production-ready multi-tenant SaaS application** built using **Node.js, Express, React, and PostgreSQL**.  
It allows multiple organizations (tenants) to manage users, projects, and tasks with **strict data isolation** and **role-based access control**.

This project was developed as part of **GPP Task 3**.

---

## 🎯 Key Features

- Multi-tenant architecture with strict tenant-level data isolation
- JWT-based authentication (24-hour expiry)
- Role-based access control:
  - super_admin
  - tenant_admin
  - user
- Tenant registration with subdomain-based login
- Project and task management (CRUD)
- User management within tenants
- Subscription limits (users & projects)
- Audit logging for critical actions
- Fully Dockerized using Docker Compose

---

## 🏗️ Architecture

### Multi-Tenancy Model
- Shared Database + Shared Schema
- Every table contains `tenant_id`
- All backend queries are filtered using `tenant_id`

This approach ensures scalability while maintaining strong isolation between tenants.

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcryptjs

### Frontend
- React 18
- React Router
- Axios
- Bootstrap 5

### DevOps
- Docker
- Docker Compose
- PostgreSQL 15

---

## 📁 Project Structure

```
tenantflow-saas/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.js
│   ├── migrations/
│   ├── seeds/
│   ├── Dockerfile
│   └── package.json
├── ui/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Running the Application (Docker)

### Prerequisites
- Docker
- Docker Compose

### Start the Application

```bash
docker-compose up -d --build
```

### Access URLs
- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000/api  
- Health Check: http://localhost:5000/api/health  

---

## 🔐 Environment Variables

### Backend
```
DB_HOST=database
DB_PORT=5432
DB_NAME=saas_db
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your_jwt_secret_key_min_32_chars_here_2024
JWT_EXPIRES_IN=24h

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://frontend:3000
```

### Frontend
```
REACT_APP_API_URL=http://backend:5000/api
```

---

## 📚 API Overview

Authentication  
- POST /api/auth/register-tenant  
- POST /api/auth/login  
- GET /api/auth/me  
- POST /api/auth/logout  

Tenants  
- GET /api/tenants  
- GET /api/tenants/:tenantId  
- PUT /api/tenants/:tenantId  

Users  
- POST /api/tenants/:tenantId/users  
- GET /api/tenants/:tenantId/users  
- PUT /api/users/:userId  
- DELETE /api/users/:userId  

Projects  
- POST /api/projects  
- GET /api/projects  
- PUT /api/projects/:projectId  
- DELETE /api/projects/:projectId  

Tasks  
- POST /api/projects/:projectId/tasks  
- GET /api/projects/:projectId/tasks  
- PATCH /api/tasks/:taskId/status  
- PUT /api/tasks/:taskId  
- DELETE /api/tasks/:taskId  

---

## 🧪 Demo Credentials

Super Admin  
- Email: superadmin@system.com  
- Password: Admin@123  

Demo Tenant  
- Subdomain: demo  
- Admin Email: admin@demo.com  
- Password: Demo@123  

Demo Users  
- user1@demo.com / User@123  
- user2@demo.com / User@123  

---

## 🩺 Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## ✅ Status

✔ Docker build successful  
✔ Backend & frontend running  
✔ Multi-tenant isolation enforced  
✔ Ready for evaluation and submission
