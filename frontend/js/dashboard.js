document.addEventListener("DOMContentLoaded", async () => {
  const welcome = document.getElementById("dashboardWelcome");
  const totalEvaluationsEl = document.getElementById("totalEvaluations");
  const completedEvaluationsEl = document.getElementById("completedEvaluations");
  const pendingEvaluationsEl = document.getElementById("pendingEvaluations");
  const averageScoreEl = document.getElementById("averageScore");
  const tableBody = document.getElementById("recentEvaluationsTableBody");

  if (welcome || totalEvaluationsEl || completedEvaluationsEl || pendingEvaluationsEl || averageScoreEl || tableBody) {
    await loadDashboard();
  }
});

async function loadDashboard() {
  const welcome = document.getElementById("dashboardWelcome");
  const totalEvaluationsEl = document.getElementById("totalEvaluations");
  const completedEvaluationsEl = document.getElementById("completedEvaluations");
  const pendingEvaluationsEl = document.getElementById("pendingEvaluations");
  const averageScoreEl = document.getElementById("averageScore");
  const tableBody = document.getElementById("recentEvaluationsTableBody");

  try {
    const userData = await apiRequest("/auth/me");
    const user = userData.user || userData.data?.user || userData.data || userData || {};

    if (user && Object.keys(user).length > 0) {
      setCurrentUser(user);
    }

    const userName = user.name || user.full_name || user.fullName || user.email || "User";
    if (welcome) {
      welcome.textContent = `Welcome back, ${toTitleCase(userName.split(" ")[0])}`;
    }

    const historyResponse = await apiRequest("/evaluations/history");
    const evaluations = normalizeEvaluations(historyResponse);

    if (totalEvaluationsEl) {
      totalEvaluationsEl.textContent = String(evaluations.length);
    }

    if (completedEvaluationsEl) {
      completedEvaluationsEl.textContent = String(evaluations.filter((item) => isCompleted(item)).length);
    }

    if (pendingEvaluationsEl) {
      pendingEvaluationsEl.textContent = String(evaluations.filter((item) => !isCompleted(item)).length);
    }

    const scoreValues = evaluations.map((item) => Number(getEvaluationScore(item))).filter((value) => Number.isFinite(value));
    const average = scoreValues.length ? Math.round((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)) : 0;

    if (averageScoreEl) {
      averageScoreEl.textContent = `${average}%`;
    }

    renderRecentEvaluations(evaluations.slice(0, 5), tableBody);
  } catch (error) {
    if (welcome) {
      welcome.textContent = "Welcome back, User";
    }

    if (totalEvaluationsEl) {
      totalEvaluationsEl.textContent = "0";
    }

    if (completedEvaluationsEl) {
      completedEvaluationsEl.textContent = "0";
    }

    if (pendingEvaluationsEl) {
      pendingEvaluationsEl.textContent = "0";
    }

    if (averageScoreEl) {
      averageScoreEl.textContent = "0%";
    }

    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No evaluations yet.</td></tr>';
    }
  }
}

function normalizeEvaluations(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.evaluations)) {
    return data.evaluations;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

function renderRecentEvaluations(evaluations, tableBody) {
  if (!tableBody) {
    return;
  }

  if (!evaluations.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No evaluations yet.</td></tr>';
    return;
  }

  tableBody.innerHTML = evaluations.map((item) => {
    const name = getEvaluationName(item);
    const subject = getSubject(item);
    const semester = getSemester(item);
    const date = formatDate(getEvaluationDate(item));
    const statusText = getStatusText(item);
    const score = getEvaluationScore(item);
    const statusClass = statusText.toLowerCase().includes("completed") || statusText.toLowerCase().includes("passed") ? "status-passed" : "status-pending";

    return `
      <tr>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(subject)}</td>
        <td>${escapeHTML(semester)}</td>
        <td>${escapeHTML(date)}</td>
        <td><span class="status-badge ${statusClass}">${escapeHTML(statusText)}</span></td>
        <td>${escapeHTML(String(score))}</td>
        <td><a href="results.html" class="action-btn" data-evaluation-id="${escapeHTML(String(getEvaluationId(item))) || ""}">View Result</a></td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll(".action-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const evaluationId = event.currentTarget.getAttribute("data-evaluation-id");
      if (evaluationId) {
        localStorage.setItem("currentEvaluationId", evaluationId);
      }
      window.location.href = "results.html";
    });
  });
}

function getEvaluationName(item) {
  return item.name || item.examination_name || item.evaluation_name || item.title || "Untitled Evaluation";
}

function getSubject(item) {
  return item.subject || item.course || item.module || "N/A";
}

function getSemester(item) {
  return item.semester || item.term || item.year || "N/A";
}

function getEvaluationDate(item) {
  return item.created_at || item.date || item.submitted_at || item.createdAt || new Date().toISOString();
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch (error) {
    return String(value);
  }
}

function getEvaluationScore(item) {
  const score = item.score ?? item.total_score ?? item.marks_obtained ?? item.obtained_marks ?? item.percentage ?? 0;
  return Number(score) || 0;
}

function getEvaluationId(item) {
  return item.evaluation_id || item.id || item.evaluationId || item._id || "";
}

function getStatusText(item) {
  const status = item.status || item.state || item.result_status || "Pending";
  return status && String(status).trim() ? String(status) : "Pending";
}

function isCompleted(item) {
  const status = String(getStatusText(item)).toLowerCase();
  return ["completed", "passed", "reviewed", "approved"].some((value) => status.includes(value));
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
