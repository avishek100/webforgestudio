# WebForgeStudio project request backend

This Node.js service accepts the Start a Project form and stores submissions in MongoDB.

## Setup

1. Install Node.js 20 or later.
2. In this folder, run `npm install`.
3. If `.env` does not already exist, copy `.env.example` to `.env`; otherwise edit the existing `.env` so you do not overwrite its settings. For MongoDB Atlas:
   - Create a database user and allow the backend's IP address in the Atlas Network Access settings.
   - In Atlas, choose **Connect → Drivers** and copy the Node.js connection string into `MONGODB_URI`.
   - Replace the username, password, and cluster host in the URI. URL-encode any special characters in the database user's password.
   - Set `MONGODB_DB` to the database name. Keep the URI private; `.env` is excluded from version control.
   
   For local MongoDB, set `MONGODB_URI=mongodb://127.0.0.1:27017` instead.
4. Set `FRONTEND_ORIGIN` to the exact origin(s) serving the website. The local default allows both `http://localhost:5173` and `http://localhost:8080`; separate multiple origins with commas, with no spaces. Set `FRONTEND_BASE_URL` to the origin clients should use for account setup links (default `http://localhost:8080`). It must match one of the allowed origins. Restart the backend after changing these values.
5. Start the service from this folder with `npm start`. It listens on port 4000 by default.
6. To point the website to a non-local backend, set `VITE_API_BASE_URL` in the frontend's `.env` or build environment to the backend's base URL. The local default is `http://localhost:4000`.

The backend stores public project requests and private client project workspaces in MongoDB. Request and project data can only be read by an authenticated administrator or the client who owns the project.

Check backend and database availability at `http://localhost:4000/health`.

## Portfolio management

Sign in as the administrator and open `/admin` to add, edit, or delete portfolio
projects. Each entry has a name, description, category, and multiple pictures;
categories can be entered directly or reused from existing projects. Picture
descriptions are optional. Supported formats are JPEG, PNG, WebP, and GIF, with
an 8-picture upload limit, a 5 MB per-picture limit, and up to 12 pictures on a
project. Files and project details are stored in MongoDB using GridFS and are
shown on the public home page and `/projects` page. Keep the MongoDB database
and its GridFS collections backed up together.

## Client project portal

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in this folder's private `.env` file to
enable the administrator account. Use a unique password with at least 16 characters,
then restart the backend. Never commit `.env` or put the admin password in the
frontend.

Sign in at the frontend's `/login` page. From `/admin`, manage project requests,
create client project workspaces, publish status updates, and delete an inquiry
or a workspace with its progress updates. Deleting a workspace does not delete
the client's account or their other workspaces. For a new client,
copy the one-time account setup link shown after creating their first project
and send it privately. The client sets a password from that 48-hour, single-use
link, then signs in at `/login` to see only their own project updates at `/portal`.
Additional projects for an existing client use the same account and do not
create another setup link.

Set `VITE_WHATSAPP_NUMBER` in the frontend environment to your international
WhatsApp number using digits only (including country code). The portal uses
WhatsApp for project discussions and payment arrangements; it does not process
or store payments. Restart the frontend after changing its environment.

The backend uses HTTP-only session cookies, password hashing, one-time setup
tokens, and CORS allowlisting. For deployment, use HTTPS and configure
`FRONTEND_ORIGIN` for the exact frontend origin and `FRONTEND_BASE_URL` for the
client account setup links. Keep the frontend and API on the same site where
possible so browser cookie policies allow client sessions.

Run backend validation tests with `npm test`.
