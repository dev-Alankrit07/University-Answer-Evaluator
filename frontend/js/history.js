document.addEventListener("DOMContentLoaded", async () => {
  const historyTableBody = document.getElementById("historyTableBody");
  if (!historyTableBody) {
    return;
  }

  await loadHistory();
});

async function loadHistory() {
  const historyTableBody = document.getElementById("historyTableBody");

  try {
    const response = await apiRequest("/evaluations/history");
    const evaluations = normalizeHistory(response);

    if (!evaluations.length) {
      historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No evaluation history found.</td></tr>';
      return;
    }

    historyTableBody.innerHTML = evaluations.map((item) => {
      const name = item.name || item.examination_name || item.evaluation_name || item.title || "Untitled Evaluation";
      const subject = item.subject || item.course || item.module || "N/A";
      const semester = item.semester || item.term || item.year || "N/A";
      const date = item.created_at || item.date || item.submitted_at || item.createdAt || "N/A";
      const status = item.status || item.state || "Pending";
      const score = item.score ?? item.total_score ?? item.marks_obtained ?? item.obtained_marks ?? 0;
      const id = item.evaluation_id || item.id || item.evaluationId || item._id || "";

      return `
        <tr>
          <td>${escapeHTML(name)}</td>
          <td>${escapeHTML(subject)}</td>
          <td>${escapeHTML(semester)}</td>
          <td>${escapeHTML(formatDate(date))}</td>
          <td><span class="status-badge ${status.toLowerCase() === "completed" || status.toLowerCase() === "passed" ? "status-passed" : "status-pending"}">${escapeHTML(status)}</span></td>
          <td>${escapeHTML(String(score))}</td>
          <td><a href="results.html" class="action-btn" data-evaluation-id="${escapeHTML(String(id))}">View Result</a></td>
        </tr>
      `;
    }).join("");

    historyTableBody.querySelectorAll(".action-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const evaluationId = event.currentTarget.getAttribute("data-evaluation-id");
        if (evaluationId) {
          localStorage.setItem("currentEvaluationId", evaluationId);
        }
        window.location.href = "results.html";
      });
    });
  } catch (error) {
    historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No evaluation history found.</td></tr>';
  }
}

function normalizeHistory(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.evaluations)) {
    return data.evaluations;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function formatDate(value) {
  if (!value || value === "N/A") {
    return "N/A";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch (error) {
    return String(value);
  }
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
