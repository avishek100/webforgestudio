import "dotenv/config";
import { createServer } from "node:http";
import { GridFSBucket, ObjectId, MongoClient } from "mongodb";
import {
  createToken,
  hashAdminPassword,
  hashPassword,
  hashToken,
  verifyAdminPassword,
  verifyPassword,
} from "./auth.js";
import { validateProjectRequest } from "./validation.js";
import {
  normalizePortfolioProject,
  readPortfolioForm,
  validatePortfolioFields,
} from "./portfolio.js";

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB ?? "webforgestudio";
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173,http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(frontendOrigins);
const frontendBaseUrl = (process.env.FRONTEND_BASE_URL ?? frontendOrigins[0] ?? "").replace(/\/+$/, "");
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionCookieName = "wfs_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const maxBodyBytes = 16 * 1024;
const maxPortfolioImages = 12;
const projectStatuses = new Set(["planning", "design", "development", "review", "completed", "on-hold"]);
const loginAttempts = new Map();

if (!mongoUri) {
  throw new Error("MONGODB_URI is required. Configure it in backend/.env.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (frontendBaseUrl && !allowedOrigins.has(frontendBaseUrl)) {
  throw new Error("FRONTEND_BASE_URL must exactly match one of the origins in FRONTEND_ORIGIN.");
}
if (Boolean(adminEmail) !== Boolean(adminPassword)) {
  throw new Error("Configure both ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.");
}
if (adminPassword && adminPassword.length < 16) {
  throw new Error("ADMIN_PASSWORD must be at least 16 characters.");
}
if (!adminEmail) {
  console.warn("Admin login is disabled. Configure ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.");
}

const mongoClient = new MongoClient(mongoUri);
const database = mongoClient.db(databaseName);
const requests = database.collection("project_requests");
const clients = database.collection("clients");
const projects = database.collection("client_projects");
const portfolio = database.collection("portfolio_projects");
const imageBucket = new GridFSBucket(database, { bucketName: "portfolio_images" });
const sessions = database.collection("sessions");
const adminPasswordHash = adminPassword ? await hashAdminPassword(adminPassword) : null;

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function jsonResponse(response, origin, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...corsHeaders(origin),
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function uploadPortfolioImage(image, alt) {
  const fileId = new ObjectId();
  const upload = imageBucket.openUploadStreamWithId(fileId, image.filename, {
    contentType: image.contentType,
    metadata: { contentType: image.contentType },
  });
  return new Promise((resolve, reject) => {
    upload.once("error", reject);
    upload.once("finish", () => resolve({
      fileId,
      filename: image.filename,
      alt: alt || image.filename,
    }));
    upload.end(image.buffer);
  });
}

async function deletePortfolioImages(images) {
  await Promise.all(images.map((image) => imageBucket.delete(image.fileId)));
}

async function uploadPortfolioImages(images, imageAlts) {
  const results = await Promise.allSettled(
    images.map((image, index) => uploadPortfolioImage(image, imageAlts[index])),
  );
  const storedImages = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedUpload = results.find((result) => result.status === "rejected");
  if (failedUpload) {
    await deletePortfolioImages(storedImages);
    throw failedUpload.reason;
  }
  return storedImages;
}

function cookieHeader(token, maxAge = sessionLifetimeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(request, name) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseCookieHeader(token, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function getSession(request) {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;
  return sessions.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
}

async function createSession(response, origin, type, userId) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);
  await sessions.insertOne({ tokenHash: hashToken(token), type, userId, expiresAt });
  response.setHeader("set-cookie", cookieHeader(token));
  return expiresAt;
}

function requireRole(session, role, response, origin) {
  if (!session || session.type !== role) {
    jsonResponse(response, origin, 401, { message: "Please sign in to continue." });
    return false;
  }
  return true;
}

function normalizeProject(project) {
  return {
    id: project._id.toString(),
    name: project.name,
    summary: project.summary,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    updates: [...(project.updates ?? [])].reverse(),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function allowLoginAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.expiresAt <= now) {
    loginAttempts.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 10;
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    jsonResponse(response, null, 403, { message: "This site is not allowed to access the service." });
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    try {
      await database.command({ ping: 1 });
      jsonResponse(response, origin, 200, { status: "ok" });
    } catch {
      jsonResponse(response, origin, 503, { status: "unavailable" });
    }
    return;
  }

  if (!pathname.startsWith("/api/")) {
    jsonResponse(response, origin, 404, { message: "Endpoint not found." });
    return;
  }

  const isPortfolioUpload =
    (request.method === "POST" && pathname === "/api/admin/portfolio") ||
    (request.method === "PATCH" && /^\/api\/admin\/portfolio\/[a-f0-9]{24}$/i.test(pathname));
  const isJsonRequest = request.headers["content-type"]?.startsWith("application/json");
  const isMultipartRequest = request.headers["content-type"]?.startsWith("multipart/form-data");
  if (
    (request.method === "POST" || request.method === "PATCH") &&
    !isJsonRequest &&
    !(isPortfolioUpload && isMultipartRequest)
  ) {
    jsonResponse(response, origin, 415, { message: "Submit the request as JSON." });
    return;
  }

  try {
    if (request.method === "GET" && pathname === "/api/portfolio") {
      const items = await portfolio.find({}).sort({ createdAt: -1 }).limit(100).toArray();
      jsonResponse(response, origin, 200, { projects: items.map(normalizePortfolioProject) });
      return;
    }

    const imageMatch = pathname.match(/^\/api\/portfolio\/images\/([a-f0-9]{24})$/i);
    if (request.method === "GET" && imageMatch) {
      const fileId = new ObjectId(imageMatch[1]);
      const file = await database.collection("portfolio_images.files").findOne({ _id: fileId });
      if (!file) {
        jsonResponse(response, origin, 404, { message: "Picture not found." });
        return;
      }
      response.writeHead(200, {
        "content-type": file.metadata?.contentType ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
        ...corsHeaders(origin),
      });
      const download = imageBucket.openDownloadStream(fileId);
      download.on("error", (error) => {
        console.error("Could not read portfolio picture.", error);
        if (!response.headersSent) {
          jsonResponse(response, origin, 500, { message: "The picture could not be loaded." });
        } else {
          response.destroy(error);
        }
      });
      download.pipe(response);
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/login") {
      const ip = request.socket.remoteAddress ?? "unknown";
      if (!allowLoginAttempt(ip)) {
        jsonResponse(response, origin, 429, { message: "Too many sign-in attempts. Try again in 15 minutes." });
        return;
      }

      const body = await readJson(request);
      const email = text(body.email, 254).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      let type;
      let userId;
      let name;

      if (adminEmail && email === adminEmail && adminPasswordHash && await verifyAdminPassword(password, adminPasswordHash)) {
        type = "admin";
        userId = "admin";
        name = "Administrator";
      } else if (adminEmail && email === adminEmail) {
        jsonResponse(response, origin, 401, { message: "Email or password is incorrect." });
        return;
      } else {
        const client = await clients.findOne({ email, setupTokenHash: { $exists: false } });
        if (!client || !await verifyPassword(password, client.passwordHash)) {
          jsonResponse(response, origin, 401, { message: "Email or password is incorrect." });
          return;
        }
        type = "client";
        userId = client._id.toString();
        name = client.name;
      }

      await createSession(response, origin, type, userId);
      jsonResponse(response, origin, 200, { type, name, email });
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/logout") {
      const token = readCookie(request, sessionCookieName);
      if (token) await sessions.deleteOne({ tokenHash: hashToken(token) });
      jsonResponse(response, origin, 200, { message: "Signed out." }, { "set-cookie": parseCookieHeader("", 0) });
      return;
    }

    if (request.method === "GET" && pathname === "/api/auth/me") {
      const session = await getSession(request);
      if (!session) {
        jsonResponse(response, origin, 401, { message: "Please sign in to continue." });
        return;
      }
      if (session.type === "admin") {
        jsonResponse(response, origin, 200, { type: "admin", name: "Administrator", email: adminEmail });
        return;
      }
      const client = await clients.findOne({ _id: new ObjectId(session.userId) }, { projection: { name: 1, email: 1 } });
      if (!client) {
        jsonResponse(response, origin, 401, { message: "This account is no longer available." });
        return;
      }
      jsonResponse(response, origin, 200, { type: "client", name: client.name, email: client.email });
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/setup") {
      const body = await readJson(request);
      const token = text(body.token, 128);
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 12) {
        jsonResponse(response, origin, 400, { message: "Choose a password with at least 12 characters." });
        return;
      }
      const client = await clients.findOne({
        setupTokenHash: hashToken(token),
        setupExpiresAt: { $gt: new Date() },
      });
      if (!client) {
        jsonResponse(response, origin, 400, { message: "This account setup link is invalid or has expired. Ask the administrator for a new one." });
        return;
      }
      await clients.updateOne(
        { _id: client._id },
        { $set: { passwordHash: await hashPassword(password) }, $unset: { setupTokenHash: "", setupExpiresAt: "" } },
      );
      await createSession(response, origin, "client", client._id.toString());
      jsonResponse(response, origin, 200, { type: "client", name: client.name, email: client.email });
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/overview") {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const [projectRequests, clientProjects] = await Promise.all([
        requests.find({}, {
          projection: { name: 1, email: 1, business: 1, service: 1, description: 1, budget: 1, timeline: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).limit(100).toArray(),
        projects.find({}).sort({ updatedAt: -1 }).limit(100).toArray(),
      ]);
      jsonResponse(response, origin, 200, {
        requests: projectRequests.map((item) => ({ ...item, id: item._id.toString() })),
        projects: clientProjects.map((item) => ({
          ...normalizeProject(item),
          clientName: item.clientName,
          clientEmail: item.clientEmail,
        })),
      });
      return;
    }

    const adminProjectMatch = pathname.match(/^\/api\/admin\/projects\/([a-f0-9]{24})$/i);
    if (request.method === "DELETE" && adminProjectMatch) {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const result = await projects.deleteOne({ _id: new ObjectId(adminProjectMatch[1]) });
      if (!result.deletedCount) {
        jsonResponse(response, origin, 404, { message: "Client workspace not found." });
        return;
      }
      jsonResponse(response, origin, 200, { message: "Client workspace and its updates deleted." });
      return;
    }

    const inquiryMatch = pathname.match(/^\/api\/admin\/requests\/([a-f0-9]{24})$/i);
    if (request.method === "DELETE" && inquiryMatch) {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const result = await requests.deleteOne({ _id: new ObjectId(inquiryMatch[1]) });
      if (!result.deletedCount) {
        jsonResponse(response, origin, 404, { message: "Project inquiry not found." });
        return;
      }
      jsonResponse(response, origin, 200, { message: "Project inquiry deleted." });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/portfolio") {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const { fields, images } = await readPortfolioForm(request);
      const details = validatePortfolioFields(fields);
      if (!images.length) {
        jsonResponse(response, origin, 400, { message: "Add at least one picture to the portfolio entry." });
        return;
      }

      const storedImages = await uploadPortfolioImages(images, details.imageAlts);
      const now = new Date();
      try {
        const result = await portfolio.insertOne({
          name: details.name,
          description: details.description,
          category: details.category,
          images: storedImages,
          createdAt: now,
          updatedAt: now,
        });
        jsonResponse(response, origin, 201, {
          message: "Portfolio project created.",
          project: normalizePortfolioProject({
            _id: result.insertedId,
            name: details.name,
            description: details.description,
            category: details.category,
            images: storedImages,
          }),
        });
      } catch (error) {
        await deletePortfolioImages(storedImages);
        throw error;
      }
      return;
    }

    const portfolioMatch = pathname.match(/^\/api\/admin\/portfolio\/([a-f0-9]{24})$/i);
    if (request.method === "PATCH" && portfolioMatch) {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const { fields, images } = await readPortfolioForm(request);
      const details = validatePortfolioFields(fields);
      const projectId = new ObjectId(portfolioMatch[1]);
      const current = await portfolio.findOne({ _id: projectId });
      if (!current) {
        jsonResponse(response, origin, 404, { message: "Portfolio project not found." });
        return;
      }

      const removedImages = (current.images ?? []).filter((image) =>
        details.removeImageIds.includes(image.fileId.toString()),
      );
      const remainingImages = (current.images ?? []).filter((image) =>
        !details.removeImageIds.includes(image.fileId.toString()),
      );
      if (remainingImages.length + images.length > maxPortfolioImages) {
        jsonResponse(response, origin, 400, {
          message: `A portfolio project can have no more than ${maxPortfolioImages} pictures.`,
        });
        return;
      }

      const storedImages = await uploadPortfolioImages(images, details.imageAlts);
      let updatedImages;
      try {
        updatedImages = [...remainingImages, ...storedImages];
        await portfolio.updateOne(
          { _id: projectId },
          {
            $set: {
              name: details.name,
              description: details.description,
              category: details.category,
              images: updatedImages,
              updatedAt: new Date(),
            },
          },
        );
      } catch (error) {
        await deletePortfolioImages(storedImages);
        throw error;
      }
      await deletePortfolioImages(removedImages);
      jsonResponse(response, origin, 200, {
        message: "Portfolio project updated.",
        project: normalizePortfolioProject({
          ...current,
          name: details.name,
          description: details.description,
          category: details.category,
          images: updatedImages,
        }),
      });
      return;
    }

    if (request.method === "DELETE" && portfolioMatch) {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const projectId = new ObjectId(portfolioMatch[1]);
      const current = await portfolio.findOne({ _id: projectId });
      if (!current) {
        jsonResponse(response, origin, 404, { message: "Portfolio project not found." });
        return;
      }
      await deletePortfolioImages(current.images ?? []);
      await portfolio.deleteOne({ _id: projectId });
      jsonResponse(response, origin, 200, { message: "Portfolio project deleted." });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/projects") {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const body = await readJson(request);
      const name = text(body.clientName, 120);
      const email = text(body.clientEmail, 254).toLowerCase();
      const projectName = text(body.projectName, 160);
      const summary = text(body.summary, 2000);
      if (!name || !isValidEmail(email) || !projectName || !summary) {
        jsonResponse(response, origin, 400, { message: "Enter the client's name and email, project name, and project summary." });
        return;
      }
      if (email === adminEmail) {
        jsonResponse(response, origin, 400, { message: "Use a different email for client accounts than the administrator account." });
        return;
      }

      let client = await clients.findOne({ email });
      let setupUrl;
      if (!client) {
        const setupToken = createToken();
        const setupExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const result = await clients.insertOne({
          name,
          email,
          setupTokenHash: hashToken(setupToken),
          setupExpiresAt,
          createdAt: new Date(),
        });
        client = { _id: result.insertedId, name, email };
        setupUrl = `${frontendBaseUrl}/setup-account?token=${encodeURIComponent(setupToken)}`;
      } else if (client.setupTokenHash) {
        const setupToken = createToken();
        const setupExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await clients.updateOne(
          { _id: client._id },
          { $set: { setupTokenHash: hashToken(setupToken), setupExpiresAt, name } },
        );
        setupUrl = `${frontendBaseUrl}/setup-account?token=${encodeURIComponent(setupToken)}`;
      }

      const now = new Date();
      const result = await projects.insertOne({
        clientId: client._id,
        clientName: client.name,
        clientEmail: client.email,
        name: projectName,
        summary,
        status: "planning",
        updates: [{ status: "planning", message: "Project workspace created.", createdAt: now }],
        createdAt: now,
        updatedAt: now,
      });
      jsonResponse(response, origin, 201, {
        message: "Project created.",
        projectId: result.insertedId.toString(),
        ...(setupUrl ? { setupUrl } : {}),
      });
      return;
    }

    const updateMatch = pathname.match(/^\/api\/admin\/projects\/([a-f0-9]{24})\/updates$/i);
    if (request.method === "POST" && updateMatch) {
      const session = await getSession(request);
      if (!requireRole(session, "admin", response, origin)) return;
      const body = await readJson(request);
      const status = text(body.status, 30);
      const message = text(body.message, 2000);
      if (!projectStatuses.has(status) || !message) {
        jsonResponse(response, origin, 400, { message: "Choose a valid project status and enter a progress update." });
        return;
      }
      const now = new Date();
      const result = await projects.updateOne(
        { _id: new ObjectId(updateMatch[1]) },
        { $set: { status, updatedAt: now }, $push: { updates: { status, message, createdAt: now } } },
      );
      if (!result.matchedCount) {
        jsonResponse(response, origin, 404, { message: "Project not found." });
        return;
      }
      jsonResponse(response, origin, 201, { message: "Progress update published." });
      return;
    }

    if (request.method === "GET" && pathname === "/api/client/projects") {
      const session = await getSession(request);
      if (!requireRole(session, "client", response, origin)) return;
      const clientProjects = await projects.find({ clientId: new ObjectId(session.userId) }).sort({ updatedAt: -1 }).toArray();
      jsonResponse(response, origin, 200, { projects: clientProjects.map(normalizeProject) });
      return;
    }

    jsonResponse(response, origin, 404, { message: "Endpoint not found." });
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      jsonResponse(response, origin, Number(error.statusCode), { message: error.message });
      return;
    }
    console.error("Project portal request failed.", error);
    jsonResponse(response, origin, 503, { message: "The service could not complete the request. Please try again later." });
  }
});

async function shutdown(signal) {
  console.info(`${signal} received; closing the project portal backend.`);
  server.close(async (error) => {
    if (error) {
      console.error("The backend server did not close cleanly.");
      process.exitCode = 1;
    }
    await mongoClient.close();
  });
}

try {
  await mongoClient.connect();
  await database.command({ ping: 1 });
  await Promise.all([
    requests.createIndex({ createdAt: -1 }),
    clients.createIndex({ email: 1 }, { unique: true }),
    clients.createIndex({ setupExpiresAt: 1 }),
    projects.createIndex({ clientId: 1, updatedAt: -1 }),
    portfolio.createIndex({ createdAt: -1 }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  server.listen(port, "0.0.0.0", () => {
    console.info(`Project portal backend listening on port ${port}.`);
  });
} catch (error) {
  console.error("Could not connect to MongoDB or initialize the project portal backend.", error);
  process.exitCode = 1;
  await mongoClient.close();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
