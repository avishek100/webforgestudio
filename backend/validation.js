export const services = [
  "Business Website",
  "E-commerce",
  "Landing Page",
  "Portfolio Website",
  "Web Application",
  "Website Redesign",
  "Other",
];

export const timelines = [
  "As soon as possible",
  "Within 1 month",
  "Within 2–3 months",
  "Flexible / let's discuss",
];

const limits = {
  name: 120,
  email: 254,
  business: 200,
  description: 5000,
  budget: 200,
};

function readString(value, field, errors, { required = false, maxLength } = {}) {
  if (value === undefined || value === null) {
    if (required) errors[field] = "This field is required.";
    return "";
  }
  if (typeof value !== "string") {
    errors[field] = "Enter text for this field.";
    return "";
  }

  const normalized = value.trim();
  if (required && normalized.length === 0) {
    errors[field] = "This field is required.";
  } else if (maxLength && normalized.length > maxLength) {
    errors[field] = `This field must be ${maxLength} characters or fewer.`;
  }
  return normalized;
}

export function validateProjectRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { data: null, errors: { form: "Submit the form using valid data." } };
  }

  const errors = {};
  const name = readString(payload.name, "name", errors, {
    required: true,
    maxLength: limits.name,
  });
  const email = readString(payload.email, "email", errors, {
    required: true,
    maxLength: limits.email,
  });
  const business = readString(payload.business, "business", errors, {
    maxLength: limits.business,
  });
  const service = readString(payload.service, "service", errors, { required: true });
  const description = readString(payload.description, "description", errors, {
    required: true,
    maxLength: limits.description,
  });
  const budget = readString(payload.budget, "budget", errors, {
    maxLength: limits.budget,
  });
  const timeline = readString(payload.timeline, "timeline", errors);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (service && !services.includes(service)) {
    errors.service = "Select a valid service.";
  }
  if (timeline && !timelines.includes(timeline)) {
    errors.timeline = "Select a valid timeline.";
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors };
  }

  return {
    data: { name, email, business, service, description, budget, timeline },
    errors: {},
  };
}
