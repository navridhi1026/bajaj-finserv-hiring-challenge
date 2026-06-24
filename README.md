# BFHL — Node Hierarchy Processor

**Chitkara Full Stack Engineering Challenge · Round 1**

A REST API + frontend that accepts an array of node strings (`A->B`), processes hierarchical relationships, detects cycles, handles diamond merges, and returns structured analytics.

---

## Project Structure

```
Bajaj/
├── backend/
│   ├── server.js        # Express API (POST /bfhl)
│   └── package.json
└── frontend/
    ├── index.html       # SPA frontend
    ├── style.css        # Dark glassmorphism design
    ├── app.js           # API calls + dynamic rendering
    └── vercel.json      # Vercel routing config
```

---

## Running Locally

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Start the server (serves frontend too)
node server.js
# → http://localhost:3001
```

Open `http://localhost:3001` — the backend serves the frontend statically.

---

## API

### `POST /bfhl`

**Request:**
```json
{ "data": ["A->B", "A->C", "B->D"] }
```

**Response:** see spec for full schema including `hierarchies`, `invalid_entries`, `duplicate_edges`, `summary`.

---

## Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo, point to the `backend/` folder
3. **Build command:** `npm install`
4. **Start command:** `node server.js`
5. Copy the URL (e.g. `https://bajaj-bfhl.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo, set **Root Directory** to `frontend/`
3. In `frontend/app.js` line 9, update:
   ```js
   const API_BASE = 'https://bajaj-bfhl.onrender.com';
   ```
4. Push and deploy.

> **CORS** is enabled globally on the backend (`cors()` middleware).

---

## Identity Fields

Update these in `backend/server.js` before submission:

```js
const USER_ID             = 'yourname_ddmmyyyy';
const EMAIL_ID            = 'your@chitkara.edu.in';
const COLLEGE_ROLL_NUMBER = 'your_roll_number';
```
