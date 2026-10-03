document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }
});

async function requestLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const accountNotFoundMessage = "Please register first.";
    if (response.status === 404 || payload?.message === accountNotFoundMessage) {
      throw new Error(accountNotFoundMessage);
    }

    if (response.status === 401) {
      const message = payload?.message;
      throw new Error(message && message !== "Your session has expired. Please login again."
        ? message
        : "Invalid email or password.");
    }

    throw new Error(payload?.message || "Login failed. Please try again.");
  }

  return payload;
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtn");
  const messageBox = document.getElementById("loginMessage");

  if (!emailInput || !passwordInput || !messageBox) {
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setStatusMessage(messageBox, "error", "Email and password are required.");
    return;
  }

  loginBtn.disabled = true;
  setStatusMessage(messageBox, "info", "Logging in...");

  try {
    const response = await requestLogin(email, password);

    const user = response.user || response.data?.user || response.data || {};
    const token = response.token || response.access_token || response.data?.token || response.session?.token;

    if (!token) {
      throw new Error("Login response did not include an authentication token.");
    }

    setAuthToken(token);
    setCurrentUser(user && Object.keys(user).length ? user : { email, name: email.split("@")[0] });
    setStatusMessage(messageBox, "success", "Login successful. Redirecting...");
    window.location.href = "dashboard.html";
  } catch (error) {
    if (error.message === "Please register first.") {
      setStatusMessage(messageBox, "error", "Please register first.");
      const registerLink = document.createElement("a");
      registerLink.href = "register.html";
      registerLink.className = "primary-btn";
      registerLink.textContent = "Register Now";
      registerLink.style.display = "inline-block";
      registerLink.style.marginTop = "0.5rem";
      messageBox.append(document.createElement("br"), registerLink);
    } else {
      const message = error instanceof TypeError
        ? "Unable to connect to the Flask server. Please try again."
        : error.message || "Login failed. Please try again.";
      setStatusMessage(messageBox, "error", message);
    }

    if (loginBtn) {
      loginBtn.disabled = false;
    }
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();

  const fullNameInput = document.getElementById("registerName");
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const confirmPasswordInput = document.getElementById("registerConfirmPassword");
  const registerBtn = document.getElementById("registerBtn");
  const messageBox = document.getElementById("registerMessage");

  if (!fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput || !messageBox) {
    return;
  }

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!fullName || !email || !password || !confirmPassword) {
    setStatusMessage(messageBox, "error", "All fields are required.");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    setStatusMessage(messageBox, "error", "Please enter a valid email address.");
    return;
  }

  if (password.length < 8) {
    setStatusMessage(messageBox, "error", "Password must be at least 8 characters long.");
    return;
  }

  if (password !== confirmPassword) {
    setStatusMessage(messageBox, "error", "Passwords do not match.");
    return;
  }

  registerBtn.disabled = true;
  setStatusMessage(messageBox, "info", "Creating your account...");

  try {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        name: fullName,
        email,
        password
      })
    });

    setStatusMessage(messageBox, "success", "Account created successfully. Redirecting to login...");
    window.location.href = "login.html";
  } catch (error) {
    setStatusMessage(messageBox, "error", error.message || "Registration failed. Please try again.");
    registerBtn.disabled = false;
  }
}
