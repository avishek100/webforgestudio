# WebForgeStudio frontend

The Start a Project form sends submissions to the backend at
`/api/project-requests`. In local development, the frontend calls
`http://localhost:4000` by default.

## Run locally with the backend

Start MongoDB first, then open two terminals:

Run both command blocks from the repository root.

1. Start the backend:

   ```powershell
   cd backend
   npm install
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   npm start
   ```

   If MongoDB is not running locally, update `MONGODB_URI` in `backend/.env` to
   your MongoDB connection string. Keep that file private.

2. Start the frontend:

   ```powershell
   cd frontend
   npm install
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   npm run dev
   ```

   Open the local URL printed by Vite. The backend allows
   `http://localhost:5173` and `http://localhost:8080` by default. If the
   frontend uses another origin, add it to `FRONTEND_ORIGIN` in `backend/.env`
   as a comma-separated origin and restart the backend.

For a deployed frontend, set `VITE_API_BASE_URL` to the deployed backend's base
URL when building the frontend, and set `FRONTEND_ORIGIN` in the backend to the
frontend's exact origin. Do not put backend secrets in frontend environment
variables.

## Admin and client project portal

Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (at least 16 characters) in
`backend/.env`, then restart the backend. Sign in at `/login` and open `/admin`
to review submitted project requests, create client workspaces, and publish
progress updates. New clients receive a private one-time setup link to choose a
password; after setup they can sign in at `/login` and view their own projects
at `/portal`. There is no public registration.

For local use, setup links use `http://localhost:8080` (`FRONTEND_BASE_URL`).
If your frontend runs on a different port or is deployed, set that variable to
the frontend origin and include that same origin in `FRONTEND_ORIGIN`.

Set `VITE_WHATSAPP_NUMBER` in `frontend/.env` to your WhatsApp number in
international digits-only format, including the country code. This opens a
WhatsApp conversation for project and payment discussions. Payments are handled
outside the website; this portal does not collect or store payment information.
Restart the relevant app after changing environment settings. Never put admin
credentials or MongoDB connection strings in frontend variables.

Run frontend checks with `npm test` and `npm run build`.
