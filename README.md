# BiteSpeed Identity Reconciliation

A REST API service that consolidates customer identities across multiple contact records, linking emails and phone numbers that belong to the same person.

## Live URL

> **[https://bitespeed-w5gl.onrender.com](https://bitespeed-w5gl.onrender.com)**

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL

## API

### `POST /identify`

Identifies and reconciles a contact based on email and/or phone number.

**Request Body:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
> At least one of `email` or `phoneNumber` is required.

**Response (200 OK):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

### `GET /`

Health check endpoint.

---

## Local Development

### Prerequisites
- Node.js >= 18
- PostgreSQL database

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bitespeed-identity-reconciliation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/bitespeed_db?schema=public"
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server runs on `http://localhost:3000`.

---

## Deployment (Render.com)

1. Push code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your GitHub repository.
4. Render will auto-detect the `render.yaml` config.
5. Set up a **PostgreSQL** database on Render and copy the connection string to `DATABASE_URL` environment variable.
6. Deploy — Render runs migrations automatically on each deploy.

---

## Business Logic

| Scenario | Behaviour |
|---|---|
| No existing contact | Creates a new `primary` contact |
| New info linked to existing contact | Creates a new `secondary` contact linked to the existing primary |
| Two separate primary contact groups linked | The older primary stays primary; the newer becomes secondary |
