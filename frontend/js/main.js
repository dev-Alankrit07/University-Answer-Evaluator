document.addEventListener("DOMContentLoaded", () => {
  const pageName = window.location.pathname.split("/").pop() || "index.html";
  const authPages = ["login.html", "register.html"];
  const token = getAuthToken();

  if (pageName === "index.html") {
    window.location.href = token ? "dashboard.html" : "login.html";
    return;
  }

  if (authPages.includes(pageName)) {
    if (token) {
      window.location.href = "dashboard.html";
      return;
    }
  } else if (!token) {
    window.location.href = "login.html";
    return;
  }

  setActiveSidebar(pageName);
  updateProfileAvatar();
  bindGlobalLogout();
});

function setActiveSidebar(pageName) {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const page = item.getAttribute("data-page");
    const matches = pageName === `${page}.html` || (pageName === "dashboard.html" && page === "dashboard");
    item.classList.toggle("active", matches);
  });
}

function updateProfileAvatar() {
  const avatar = document.getElementById("profileAvatar");
  if (!avatar) {
    return;
  }

  const user = getCurrentUser();
  const name = user && (user.name || user.full_name || user.fullName || user.email);
  const initial = name ? String(name).trim().charAt(0).toUpperCase() : "U";
  avatar.textContent = initial;
}

function bindGlobalLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

async function handleLogout() {
  const token = getAuthToken();

  try {
    if (token) {
      await apiRequest("/auth/logout", {
        method: "POST"
      });
    }
  } catch (error) {
    console.warn("Logout request failed:", error.message || error);
  }

  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.currentEvaluationId);
  localStorage.removeItem(STORAGE_KEYS.answerKeyUploaded);
  localStorage.removeItem(STORAGE_KEYS.studentAnswersUploaded);
  window.location.href = "login.html";
}
