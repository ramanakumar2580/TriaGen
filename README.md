# TriaGen

[![CI/CD](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=github-actions)](https://github.com/ramanakumar2580/TriaGen/actions)

**Live Demo:** [https://triagen.40.192.34.253.sslip.io/](https://triagen.40.192.34.253.sslip.io/)

**TriaGen** is an enterprise-grade Incident Management Platform designed for high-velocity DevOps and SRE teams who need clarity during chaos.

Unlike generic ticketing systems like Jira or simple chat apps—which lack urgency and real-time context—TriaGen creates a dedicated **Real-Time War Room** for every outage. It acts as a unified command center where status updates, evidence collection, and team assignments happen instantly. With built-in SLA monitoring and automated escalation policies, it ensures critical alerts never slip through the cracks.

---

## Key Features

- **Real-Time War Room:** WebSocket-powered collaboration. Status changes, comments, and assignments update instantly across all screens without refreshing.
- **Role-Based Access Control (RBAC):**
  - **Admins:** Full system control, including "Hard Delete" (database + S3 cleanup) and Team management.
  - **Responders:** Can resolve, acknowledge, and manage assignments.
  - **Members:** Can report incidents and contribute context to the timeline.
- **Team-Based Routing:** Smart routing that assigns incidents to specific squads (e.g., "DevOps", "Backend") with instant "Toast" notifications for online team members.
- **SLA Breach Monitoring:** Visual countdown timers for CRITICAL incidents. Cards turn red and flash when the resolution time limit is exceeded.
- **Evidence Locker:** Dedicated sidebar gallery for attaching logs, screenshots, and post-mortem docs, stored securely in **AWS S3**.
- **Automated Escalation:** Background workers (**BullMQ**) automatically escalate incidents (e.g., bump severity to Critical) if they remain unacknowledged for too long.
- **Post-Mortem Exports:** One-click generation of incident logs (`.txt` or `.md`) for compliance and review.

---

## Technical Architecture

TriaGen is built as a **Modern Monorepo** for type safety and speed, fully containerized and deployed via CI/CD pipelines.

- **Frontend:** **Next.js 15 (App Router)** deployed on **AWS EC2**.
- **Backend:** **NestJS** (Node.js) deployed on **AWS EC2** via Docker containers.
- **Database:** **PostgreSQL** (Dockerized) managed via **Prisma ORM**.
- **Real-Time Engine:** **Socket.io** gateway for bi-directional event broadcasting.
- **Queue System:** **BullMQ** running on **Redis** for background jobs (escalation timers).
- **Storage:** **AWS S3** for secure, scalable file hosting.
- **DevOps:** **GitHub Actions** for CI/CD, **Docker Compose** for local orchestration.

---

## Environment Variables

To run this project locally, you must configure environment variables for both the API and the Web client.

### 1. Backend (`apps/api/.env`)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/triagen?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_jwt_key_here
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_BUCKET_NAME=triagen-uploads-private
```

### 2. Frontend (`apps/web/.env`)

```bash
NEXT_PUBLIC_API_URL="[http://40.192.34.253:4000](http://40.192.34.253:4000)"
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_AWS_BUCKET_NAME=triagen-uploads-public
```

### 3. Local Development

```bash
1. Clone the repository
   git clone https://github.com/ramanakumar2580/TriaGen.git
   cd TriaGen
   npm install

2. Start Infrastructure (Docker)
   docker-compose up -d

3. Setup Database & Seed Data
   cd apps/api

# Run Migrations
  npx prisma migrate dev --name init_schema

# Seed Database (Creates Admin User & DevOps Team)
  npx prisma db seed
  cd ../..

4. Run the development server
   npm run dev
```

### 4. Deployment Commands (AWS EC2)

```bash
1. Connecting to the Server
   ssh -i "triagen-key.pem" ubuntu@40.192.34.253

2. Updating the Application
   cd ~/TriaGen
   git pull origin main
   docker-compose down
   docker-compose up --build -d

3. Viewing Logs
   # View Backend Logs
   docker logs -f triagen-api

   # View Database Logs
   docker logs -f triagen-postgres

4. Database Maintenance (Production)
   # Enter the API container
   docker exec -it triagen-api /bin/sh

   # Run Migrations
   npx prisma migrate deploy

   # Seed Production Data
   npx prisma db seed
```
