const API_BASE_URL = "http://127.0.0.1:5000/api";

const STORAGE_KEYS = {
  token: "authToken",
  user: "currentUser",
  currentEvaluationId: "currentEvaluationId",
  answerKeyUploaded: "answerKeyUploaded",
  studentAnswersUploaded: "studentAnswersUploaded"
};

function getAuthToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || "";
}

function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(STORAGE_KEYS.token);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.token, token);
}

function getCurrentUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.user);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    return {};
  }
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.user);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function getCurrentEvaluationId() {
  return localStorage.getItem(STORAGE_KEYS.currentEvaluationId) || "";
}

function setCurrentEvaluationId(id) {
  if (!id) {
    localStorage.removeItem(STORAGE_KEYS.currentEvaluationId);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.currentEvaluationId, String(id));
}

function setStatusMessage(element, type, text) {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = "form-message " + type;
}

function toTitleCase(value) {
  if (!value) {
    return "User";
  }

  return String(value).split(" ").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function getErrorMessage(data, statusCode) {
  if (statusCode === 400) {
    return "Bad request. Please check your input and try again.";
  }

  if (statusCode === 401) {
    return "Your session has expired. Please login again.";
  }

  if (statusCode === 404) {
    return "The requested resource was not found.";
  }

  if (statusCode === 413) {
    return "The uploaded file is too large. Please use a file smaller than 1 GB.";
  }

  if (statusCode === 500) {
    return "The server encountered an error while processing the request.";
  }

  if (data && typeof data === "object") {
    const message = data.message || data.error || data.detail || data.msg;
    if (message) {
      return String(message);
    }
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return "Something went wrong while contacting the server.";
}

async function apiRequest(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body !== undefined && !headers.has("Content-Type") && !(options.body instanceof URLSearchParams)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(normalizedEndpoint, {
      ...options,
      headers
    });

    let payload = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.text().catch(() => null);
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, response.status));
    }

    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to connect to Flask server. Make sure the backend is running on port 5000.");
    }

    throw error;
  }
}

async function uploadPdf(endpoint, file, evaluationId) {
  if (!file) {
    throw new Error("Please select a PDF file first.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  if (evaluationId) {
    formData.append("evaluation_id", String(evaluationId));
  }

  const token = getAuthToken();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
    method: "POST",
    headers,
    body: formData
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload;
}
