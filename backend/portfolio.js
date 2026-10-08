import Busboy from "busboy";

const maxImageBytes = 5 * 1024 * 1024;
const maxTotalImageBytes = 20 * 1024 * 1024;
const maxImagesPerRequest = 8;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function requestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function detectContentType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function safeFilename(filename) {
  return (filename || "image")
    .split(/[\\/]/)
    .at(-1)
    .replace(/[^\w.-]/g, "_")
    .slice(0, 120) || "image";
}

export async function readPortfolioForm(request) {
  let parser;
  try {
    parser = Busboy({
      headers: request.headers,
      limits: {
        fileSize: maxImageBytes,
        files: maxImagesPerRequest,
        fields: 10,
        fieldSize: 16 * 1024,
      },
    });
  } catch {
    throw requestError("Submit portfolio details and pictures using a valid multipart form.");
  }

  const fields = {};
  const images = [];
  let totalImageBytes = 0;
  let failure;

  parser.on("field", (name, value, info) => {
    if (info.valueTruncated) failure ??= requestError("A portfolio field is too large.", 413);
    fields[name] = value;
  });

  parser.on("file", (fieldName, file, info) => {
    if (fieldName !== "images" || !info.filename) {
      file.resume();
      failure ??= requestError("Upload pictures using the images field.");
      return;
    }

    const chunks = [];
    let imageBytes = 0;
    file.on("data", (chunk) => {
      imageBytes += chunk.length;
      totalImageBytes += chunk.length;
      if (totalImageBytes > maxTotalImageBytes) {
        failure ??= requestError("Pictures must total 20 MB or less.", 413);
      } else {
        chunks.push(chunk);
      }
    });
    file.on("limit", () => {
      failure ??= requestError("Each picture must be 5 MB or smaller.", 413);
    });
    file.on("end", () => {
      if (file.truncated || failure) return;
      const buffer = Buffer.concat(chunks);
      const contentType = detectContentType(buffer);
      if (!contentType || !allowedContentTypes.has(contentType)) {
        failure ??= requestError("Use JPEG, PNG, WebP, or GIF picture files.");
        return;
      }
      if (info.mimeType !== contentType && info.mimeType !== "application/octet-stream") {
        failure ??= requestError("A picture's file type does not match its contents.");
        return;
      }
      images.push({
        filename: safeFilename(info.filename),
        contentType,
        buffer,
      });
    });
  });

  parser.on("filesLimit", () => {
    failure ??= requestError(`Upload no more than ${maxImagesPerRequest} pictures at a time.`, 413);
  });
  parser.on("fieldsLimit", () => {
    failure ??= requestError("Too many portfolio fields were submitted.");
  });
  parser.on("error", () => {
    failure ??= requestError("Submit portfolio pictures using a valid multipart form.");
  });

  await new Promise((resolve, reject) => {
    parser.once("close", resolve);
    parser.once("error", () =>
      reject(requestError("Submit portfolio pictures using a valid multipart form.")),
    );
    request.once("error", reject);
    request.once("aborted", () => reject(requestError("The picture upload was interrupted.")));
    request.pipe(parser);
  });

  if (failure) throw failure;
  return { fields, images };
}

export function validatePortfolioFields(fields) {
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const description = typeof fields.description === "string" ? fields.description.trim() : "";
  const category = typeof fields.category === "string" ? fields.category.trim() : "";
  if (!name || name.length > 120) {
    throw requestError("Enter a project name of 1 to 120 characters.");
  }
  if (!description || description.length > 2000) {
    throw requestError("Enter project details of 1 to 2,000 characters.");
  }
  if (!category || category.length > 60) {
    throw requestError("Enter a category of 1 to 60 characters.");
  }

  let imageAlts = [];
  if (fields.imageAlts) {
    try {
      imageAlts = JSON.parse(fields.imageAlts);
    } catch {
      throw requestError("Picture descriptions must be valid JSON.");
    }
    if (
      !Array.isArray(imageAlts) ||
      imageAlts.some((alt) => typeof alt !== "string" || alt.trim().length > 200)
    ) {
      throw requestError("Each picture description must be 200 characters or fewer.");
    }
    imageAlts = imageAlts.map((alt) => alt.trim());
  }

  let removeImageIds = [];
  if (fields.removeImageIds) {
    try {
      removeImageIds = JSON.parse(fields.removeImageIds);
    } catch {
      throw requestError("The pictures to remove are invalid.");
    }
    if (
      !Array.isArray(removeImageIds) ||
      removeImageIds.some((id) => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))
    ) {
      throw requestError("The pictures to remove are invalid.");
    }
    removeImageIds = [...new Set(removeImageIds)];
  }

  return { name, description, category, imageAlts, removeImageIds };
}

export function normalizePortfolioProject(project) {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    category: project.category,
    images: (project.images ?? []).map((image) => ({
      id: image.fileId.toString(),
      url: `/api/portfolio/images/${image.fileId.toString()}`,
      alt: image.alt,
    })),
  };
}
