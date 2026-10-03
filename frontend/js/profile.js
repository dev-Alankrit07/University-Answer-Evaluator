document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("profileForm");
  const logoutBtn = document.getElementById("profileLogoutBtn");

  if (form) {
    form.addEventListener("submit", handleProfileSave);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  await loadProfile();
});

async function loadProfile() {
  const nameField = document.getElementById("profileName");
  const emailField = document.getElementById("profileEmail");

  try {
    const response = await apiRequest("/auth/me");
    const user = response.user || response.data?.user || response.data || response || {};
    const name = user.name || user.full_name || user.fullName || "User";
    const email = user.email || "";

    if (nameField) {
      nameField.value = name;
    }

    if (emailField) {
      emailField.value = email;
    }

    setCurrentUser({ ...user, name, email });
  } catch (error) {
    const localUser = getCurrentUser();
    if (nameField) {
      nameField.value = localUser.name || "User";
    }
    if (emailField) {
      emailField.value = localUser.email || "";
    }
  }
}

async function handleProfileSave(event) {
  event.preventDefault();

  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const messageBox = document.getElementById("profileMessage");

  const name = profileName.value.trim();
  const email = profileEmail.value.trim();

  if (!name || !email) {
    setStatusMessage(messageBox, "error", "Name and email are required.");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    setStatusMessage(messageBox, "error", "Please enter a valid email address.");
    return;
  }

  const nextUser = {
    ...getCurrentUser(),
    name,
    email
  };

  setCurrentUser(nextUser);
  updateProfileAvatar();

  try {
    await apiRequest("/auth/me", {
      method: "PUT",
      body: JSON.stringify({ name, email })
    });
    setStatusMessage(messageBox, "success", "Profile changes saved successfully.");
  } catch (error) {
    setStatusMessage(messageBox, "success", "Profile updated locally. Backend update endpoint is not available yet.");
  }
}
