import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  FolderKanban,
  Images,
  LogOut,
  MessageCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalApiError, portalApi, portalApiUrl, whatsappUrl } from "@/lib/portal-api";
import type { PortfolioImage } from "@/lib/portfolio";

type User = { type: "admin" | "client"; name: string; email: string };
type ProjectUpdate = { status: string; message: string; createdAt: string };
type Project = {
  id: string;
  name: string;
  summary: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  updates: ProjectUpdate[];
  clientName?: string;
  clientEmail?: string;
};
type ProjectRequest = {
  id: string;
  name: string;
  email: string;
  service: string;
  createdAt: string;
  description: string;
  business?: string;
  budget?: string;
  timeline?: string;
};
type Overview = { requests: ProjectRequest[]; projects: Project[] };
type PortfolioProject = {
  id: string;
  name: string;
  description: string;
  category: string;
  images: PortfolioImage[];
};
const statuses = ["planning", "design", "development", "review", "completed", "on-hold"];
const statusLabels: Record<string, string> = {
  planning: "Planning",
  design: "Design",
  development: "Development",
  review: "Review",
  completed: "Completed",
  "on-hold": "On hold",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function PortalFrame({ children, user }: { children: React.ReactNode; user?: User | undefined }) {
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState("");
  async function signOut() {
    setSignOutError("");
    try {
      await portalApi("/api/auth/logout", { method: "POST", body: "{}" });
      await navigate({ to: "/login" });
    } catch (cause) {
      setSignOutError(errorMessage(cause));
    }
  }

  return (
    <section className="container min-h-[70vh] py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> WebForgeStudio
          </Link>
          <h1 className="text-3xl font-extrabold">Project portal</h1>
          {user && (
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as {user.name} ({user.email})
            </p>
          )}
        </div>
        {user && (
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        )}
      </div>
      {signOutError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {signOutError}
        </p>
      )}
      {children}
    </section>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await portalApi<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await navigate({ to: user.type === "admin" ? "/admin" : "/portal" });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalFrame>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
          <ShieldCheck />
        </div>
        <h2 className="text-xl font-bold">Sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Access the admin dashboard or your private project updates.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1.5 text-sm font-semibold">
            Email
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 font-normal"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Password
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 font-normal"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          Client accounts are created by the administrator. If you need access, please contact them.
        </p>
      </div>
    </PortalFrame>
  );
}

export function SetupAccountPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await portalApi("/api/auth/setup", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      await navigate({ to: "/portal" });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalFrame>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 shadow-sm md:p-8">
        <h2 className="text-xl font-bold">Set up your client account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a password to securely view your project progress. This setup link can only be used
          once.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1.5 text-sm font-semibold">
            New password
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 font-normal"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="text-xs font-normal text-muted-foreground">
              Use at least 12 characters.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Confirm password
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 font-normal"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !token}>
            {busy ? "Setting up..." : "Create password"}
          </Button>
          {!token && (
            <p className="text-sm text-destructive" role="alert">
              No setup token was found in this link.
            </p>
          )}
        </form>
      </div>
    </PortalFrame>
  );
}

function ProjectProgress({ project }: { project: Project }) {
  return (
    <article className="rounded-xl border border-border bg-background p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {statusLabels[project.status] ?? project.status}
          </p>
          <h3 className="mt-1 text-xl font-bold">{project.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.summary}</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
          Updated {dateLabel(project.updatedAt)}
        </span>
      </div>
      <div className="mt-6 border-l-2 border-border pl-4">
        <h4 className="mb-3 text-sm font-bold">Progress updates</h4>
        <div className="grid gap-4">
          {project.updates.map((update, index) => (
            <div className="relative" key={`${update.createdAt}-${index}`}>
              <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-primary">
                {statusLabels[update.status] ?? update.status}{" "}
                <span className="font-normal text-muted-foreground">
                  · {dateLabel(update.createdAt)}
                </span>
              </p>
              <p className="mt-1 text-sm leading-6">{update.message}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ClientPortalPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const whatsapp = whatsappUrl("Hi, I would like to discuss my project progress and next steps.");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentUser = await portalApi<User>("/api/auth/me");
        if (currentUser.type !== "client") {
          await navigate({ to: "/admin" });
          return;
        }
        const data = await portalApi<{ projects: Project[] }>("/api/client/projects");
        if (active) {
          setUser(currentUser);
          setProjects(data.projects);
        }
      } catch (cause) {
        if (active) {
          if (cause instanceof PortalApiError && cause.status === 401)
            await navigate({ to: "/login" });
          else setError(errorMessage(cause));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <PortalFrame user={user}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Your workspace</p>
          <h2 className="mt-1 text-2xl font-extrabold">Project progress</h2>
        </div>
        {whatsapp && (
          <Button asChild variant="outline">
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Discuss on WhatsApp{" "}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
      <p className="mb-6 max-w-2xl text-sm leading-6 text-muted-foreground">
        Track your project's current stage and the latest progress notes here. For payment, pricing,
        or other arrangements, please message us on WhatsApp.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your projects...</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : projects.length ? (
        <div className="grid gap-5">
          {projects.map((project) => (
            <ProjectProgress key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h3 className="font-bold">No projects linked yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact WebForgeStudio if you expected to see a project here.
          </p>
        </div>
      )}
      {!whatsapp && (
        <p className="mt-6 text-xs text-muted-foreground">
          WhatsApp contact is not configured yet. The administrator can set `VITE_WHATSAPP_NUMBER`
          in the frontend environment.
        </p>
      )}
    </PortalFrame>
  );
}

function ProjectUpdateForm({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const [status, setStatus] = useState(project.status);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await portalApi(`/api/admin/projects/${project.id}/updates`, {
        method: "POST",
        body: JSON.stringify({ status, message }),
      });
      setMessage("");
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-5 grid gap-3 border-t border-border pt-4"
      onSubmit={(event) => void submit(event)}
    >
      <label className="grid gap-1 text-xs font-semibold">
        Project status
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {statuses.map((item) => (
            <option value={item} key={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Progress update for the client
        <textarea
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          maxLength={2000}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share a clear update about the work completed or next steps."
        />
      </label>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !message.trim()}>
        {busy ? "Publishing..." : "Publish update"}
      </Button>
    </form>
  );
}

function AdminPortfolioManager() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryIsCustom, setCategoryIsCustom] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [imageAlts, setImageAlts] = useState<string[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    portalApi<{ projects: PortfolioProject[] }>("/api/portfolio")
      .then((result) => {
        if (active) setProjects(result.projects);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingId("");
    setName("");
    setDescription("");
    setCategory("");
    setCategoryIsCustom(false);
    setFiles([]);
    setImageAlts([]);
    setRemoveImageIds([]);
    setFileInputKey((key) => key + 1);
    setError("");
  }

  function editProject(project: PortfolioProject) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description);
    setCategory(project.category);
    setCategoryIsCustom(false);
    setFiles([]);
    setImageAlts([]);
    setRemoveImageIds([]);
    setFileInputKey((key) => key + 1);
    setError("");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("name", name);
    body.append("description", description);
    body.append("category", category);
    body.append("imageAlts", JSON.stringify(imageAlts));
    body.append("removeImageIds", JSON.stringify(removeImageIds));
    files.forEach((file) => body.append("images", file));
    try {
      const { project } = await portalApi<{ project: PortfolioProject }>(
        editingId ? `/api/admin/portfolio/${editingId}` : "/api/admin/portfolio",
        {
          method: editingId ? "PATCH" : "POST",
          body,
        },
      );
      setProjects((current) =>
        editingId
          ? current.map((item) => (item.id === project.id ? project : item))
          : [project, ...current],
      );
      resetForm();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(project: PortfolioProject) {
    if (!window.confirm(`Delete "${project.name}" and all of its pictures?`)) return;
    setBusy(true);
    setError("");
    try {
      await portalApi(`/api/admin/portfolio/${project.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (editingId === project.id) resetForm();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const editingProject = projects.find((project) => project.id === editingId);
  const categoryOptions = [
    ...new Set([
      "Business",
      "E-commerce",
      "Portfolio",
      ...projects.map((project) => project.category),
    ]),
  ];

  return (
    <section className="rounded-xl border border-border bg-background p-5 shadow-sm md:p-6">
      <h3 className="text-lg font-bold">Portfolio projects</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Add projects, upload several pictures, edit details, and organize work with categories.
      </p>
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <form className="mt-5 grid gap-3" onSubmit={(event) => void saveProject(event)}>
        <label className="grid gap-1 text-xs font-semibold">
          Project name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Category
          <select
            value={categoryIsCustom ? "__custom__" : category}
            onChange={(event) => {
              const isCustom = event.target.value === "__custom__";
              setCategoryIsCustom(isCustom);
              if (isCustom) setCategory("");
              else setCategory(event.target.value);
            }}
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          >
            <option value="" disabled>
              Select a category
            </option>
            {categoryOptions.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
            <option value="__custom__">Add a new category…</option>
          </select>
          {categoryIsCustom && (
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={60}
              required
              className="mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
              placeholder="Enter a new category"
            />
          )}
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Project details
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            required
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
            placeholder="Describe the project and what it does."
          />
        </label>
        {editingProject && editingProject.images.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-semibold">Current pictures</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {editingProject.images.map((image) => {
                const markedForRemoval = removeImageIds.includes(image.id);
                return (
                  <div
                    className={`overflow-hidden rounded-md border border-border ${markedForRemoval ? "opacity-40" : ""}`}
                    key={image.id}
                  >
                    <img
                      src={portalApiUrl(image.url)}
                      alt={image.alt}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/5"
                      onClick={() =>
                        setRemoveImageIds((current) =>
                          markedForRemoval
                            ? current.filter((id) => id !== image.id)
                            : [...current, image.id],
                        )
                      }
                    >
                      {markedForRemoval ? "Keep picture" : "Remove picture"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <label className="grid gap-1 text-xs font-semibold">
          {editingId ? "Add more pictures" : "Pictures"}
          <input
            key={fileInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            required={!editingId}
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []);
              setFiles(selectedFiles);
              setImageAlts(selectedFiles.map(() => ""));
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1"
          />
          <span className="font-normal text-muted-foreground">
            JPEG, PNG, WebP, or GIF; up to 8 pictures per upload and 5 MB each.
          </span>
        </label>
        {files.map((file, index) => (
          <label className="grid gap-1 text-xs font-semibold" key={`${file.name}-${index}`}>
            Picture description for {file.name}
            <input
              value={imageAlts[index] ?? ""}
              onChange={(event) =>
                setImageAlts((current) =>
                  current.map((alt, currentIndex) =>
                    currentIndex === index ? event.target.value : alt,
                  ),
                )
              }
              maxLength={200}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
              placeholder="Optional accessibility description"
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            <ImagePlus className="mr-2 h-4 w-4" />
            {busy ? "Saving..." : editingId ? "Save portfolio project" : "Add portfolio project"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>
      <div className="mt-7 grid gap-3">
        <h4 className="text-sm font-bold">Managed projects ({projects.length})</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading portfolio projects...</p>
        ) : projects.length ? (
          projects.map((project) => (
            <article
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              key={project.id}
            >
              {project.images[0] && (
                <img
                  src={portalApiUrl(project.images[0].url)}
                  alt={project.images[0].alt}
                  className="h-14 w-20 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h5 className="truncate text-sm font-bold">{project.name}</h5>
                <p className="text-xs text-muted-foreground">
                  {project.category} · {project.images.length}{" "}
                  {project.images.length === 1 ? "picture" : "pictures"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => editProject(project)}
                disabled={busy}
                aria-label={`Edit ${project.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void deleteProject(project)}
                disabled={busy}
                aria-label={`Delete ${project.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No managed portfolio projects yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [adminSection, setAdminSection] = useState<
    "overview" | "workspaces" | "requests" | "create" | "portfolio"
  >("overview");
  const [user, setUser] = useState<User>();
  const [overview, setOverview] = useState<Overview>({ requests: [], projects: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [deletingItemId, setDeletingItemId] = useState("");

  async function loadOverview() {
    const data = await portalApi<Overview>("/api/admin/overview");
    setOverview(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentUser = await portalApi<User>("/api/auth/me");
        if (currentUser.type !== "admin") {
          await navigate({ to: "/portal" });
          return;
        }
        const data = await portalApi<Overview>("/api/admin/overview");
        if (active) {
          setUser(currentUser);
          setOverview(data);
        }
      } catch (cause) {
        if (active) {
          if (cause instanceof PortalApiError && cause.status === 401)
            await navigate({ to: "/login" });
          else setError(errorMessage(cause));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSetupUrl("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await portalApi<{ setupUrl?: string }>("/api/admin/projects", {
        method: "POST",
        body: JSON.stringify({
          clientName: form.get("clientName"),
          clientEmail: form.get("clientEmail"),
          projectName: form.get("projectName"),
          summary: form.get("summary"),
        }),
      });
      setSetupUrl(result.setupUrl ?? "");
      formElement.reset();
      await loadOverview();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setError("");
    try {
      await loadOverview();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function deleteWorkspace(project: Project) {
    if (
      !window.confirm(
        `Delete the "${project.name}" workspace and all of its progress updates? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingItemId(project.id);
    setError("");
    try {
      await portalApi(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      setOverview((current) => ({
        ...current,
        projects: current.projects.filter((item) => item.id !== project.id),
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDeletingItemId("");
    }
  }

  async function deleteInquiry(inquiry: ProjectRequest) {
    if (
      !window.confirm(`Delete the project inquiry from ${inquiry.name}? This cannot be undone.`)
    ) {
      return;
    }
    setDeletingItemId(inquiry.id);
    setError("");
    try {
      await portalApi(`/api/admin/requests/${inquiry.id}`, { method: "DELETE" });
      setOverview((current) => ({
        ...current,
        requests: current.requests.filter((item) => item.id !== inquiry.id),
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDeletingItemId("");
    }
  }

  const copySetupUrl = () => {
    void navigator.clipboard
      .writeText(setupUrl)
      .catch((cause: unknown) => setError(errorMessage(cause)));
  };

  return (
    <PortalFrame user={user}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Administration</p>
          <h2 className="mt-1 text-2xl font-extrabold">
            {
              {
                overview: "Dashboard",
                workspaces: "Client workspaces",
                requests: "Project inquiries",
                create: "Create a workspace",
                portfolio: "Portfolio manager",
              }[adminSection]
            }
          </h2>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
      {error && (
        <p
          className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      {setupUrl && (
        <div className="mb-7 rounded-xl border border-primary/30 bg-accent p-4">
          <h3 className="font-bold">One-time client setup link</h3>
          <p className="mt-1 text-sm">
            Copy and send this private link to the client. It expires in 48 hours and can only be
            used once. It will not be shown again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 text-xs">
              {setupUrl}
            </code>
            <Button type="button" variant="outline" onClick={copySetupUrl}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="Admin dashboard"
            className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/40 p-3 md:sticky md:top-24 md:grid-cols-1"
          >
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "workspaces", label: "Client workspaces", icon: FolderKanban },
              { id: "requests", label: "Project inquiries", icon: Inbox },
              { id: "create", label: "Create workspace", icon: PlusCircle },
              { id: "portfolio", label: "Portfolio manager", icon: Images },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant={adminSection === id ? "secondary" : "ghost"}
                className="justify-start"
                aria-pressed={adminSection === id}
                onClick={() => setAdminSection(id as typeof adminSection)}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </Button>
            ))}
          </nav>
          <div className="min-w-0">
            {adminSection === "overview" && (
              <section aria-labelledby="admin-overview-heading">
                <h3 id="admin-overview-heading" className="mb-4 text-lg font-bold">
                  Studio overview
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Client workspaces",
                      count: overview.projects.length,
                      section: "workspaces" as const,
                      icon: FolderKanban,
                    },
                    {
                      label: "Project inquiries",
                      count: overview.requests.length,
                      section: "requests" as const,
                      icon: Inbox,
                    },
                    {
                      label: "Portfolio manager",
                      count: "Manage",
                      section: "portfolio" as const,
                      icon: Images,
                    },
                  ].map(({ label, count, section, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-xl border border-border bg-background p-5 text-left shadow-sm transition-colors hover:bg-accent"
                      onClick={() => setAdminSection(section)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </span>
                      <span className="mt-3 block text-2xl font-extrabold">{count}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => setAdminSection("create")}>
                    <PlusCircle className="h-4 w-4" />
                    Create client workspace
                  </Button>
                  <Button variant="outline" onClick={() => setAdminSection("portfolio")}>
                    <ImagePlus className="h-4 w-4" />
                    Manage portfolio
                  </Button>
                </div>
              </section>
            )}
            {adminSection === "workspaces" && (
              <section>
                <h3 className="mb-4 text-lg font-bold">
                  Active project workspaces ({overview.projects.length})
                </h3>
                {overview.projects.length ? (
                  <div className="grid gap-4">
                    {overview.projects.map((project) => (
                      <article
                        className="rounded-xl border border-border bg-background p-5 shadow-sm"
                        key={project.id}
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase text-primary">
                              {statusLabels[project.status] ?? project.status}
                            </p>
                            <h4 className="mt-1 text-lg font-bold">{project.name}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {project.clientName} · {project.clientEmail}
                            </p>
                            <p className="mt-3 text-sm leading-6">{project.summary}</p>
                          </div>
                          <div className="flex gap-2">
                            {whatsappUrl(
                              `Hi ${project.clientName}, here's a quick way to discuss your ${project.name} project and any payment arrangements.`,
                            ) && (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={whatsappUrl(
                                    `Hi ${project.clientName}, here's a quick way to discuss your ${project.name} project and any payment arrangements.`,
                                  )!}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${project.name} workspace`}
                              disabled={deletingItemId !== ""}
                              onClick={() => void deleteWorkspace(project)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <ProjectUpdateForm project={project} onSaved={() => void refresh()} />
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No client projects have been created yet.
                  </p>
                )}
              </section>
            )}
            {adminSection === "requests" && (
              <section>
                <h3 className="mb-4 text-lg font-bold">
                  Incoming project requests ({overview.requests.length})
                </h3>
                {overview.requests.length ? (
                  <div className="grid gap-3">
                    {overview.requests.map((request) => (
                      <article className="rounded-xl border border-border p-4" key={request.id}>
                        <div className="flex flex-wrap justify-between gap-2">
                          <h4 className="font-bold">
                            {request.name} · {request.service}
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {dateLabel(request.createdAt)}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete inquiry from ${request.name}`}
                              disabled={deletingItemId !== ""}
                              onClick={() => void deleteInquiry(request)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.email}
                          {request.business ? ` · ${request.business}` : ""}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                          {request.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Budget: {request.budget || "Not specified"} · Timeline:{" "}
                          {request.timeline || "Not specified"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No requests received yet.
                  </p>
                )}
              </section>
            )}
            {adminSection === "portfolio" && <AdminPortfolioManager />}
            {adminSection === "create" && (
              <section className="rounded-xl border border-border bg-secondary/50 p-5 md:p-6">
                <h3 className="text-lg font-bold">Create a client project</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Create a private workspace. New clients receive a one-time setup link; existing
                  client accounts can be linked to another project.
                </p>
                <form className="mt-5 grid gap-3" onSubmit={(event) => void createProject(event)}>
                  <label className="grid gap-1 text-xs font-semibold">
                    Client name
                    <input
                      name="clientName"
                      maxLength={120}
                      required
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Client email
                    <input
                      name="clientEmail"
                      type="email"
                      maxLength={254}
                      required
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Project name
                    <input
                      name="projectName"
                      maxLength={160}
                      required
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Project summary
                    <textarea
                      name="summary"
                      maxLength={2000}
                      required
                      className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                      placeholder="What are you building for this client?"
                    />
                  </label>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Creating..." : "Create workspace"}
                  </Button>
                </form>
                {!whatsappUrl("") && (
                  <p className="mt-5 text-xs leading-5 text-muted-foreground">
                    Configure `VITE_WHATSAPP_NUMBER` in the frontend environment to enable WhatsApp
                    contact links.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </PortalFrame>
  );
}
