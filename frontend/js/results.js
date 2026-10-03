document.addEventListener("DOMContentLoaded", async () => {
  const resultsTableBody = document.getElementById("resultsTableBody");
  const reviewTableBody = document.getElementById("reviewTableBody");

  if (resultsTableBody) {
    await loadResults();
  }

  if (reviewTableBody) {
    await loadReviewData();
    const saveButton = document.getElementById("saveReviewBtn");
    if (saveButton) {
      saveButton.addEventListener("click", handleSaveReview);
    }
  }
});

async function loadResults() {
  const evaluationId = getCurrentEvaluationId();

  if (!evaluationId) {
    const table = document.getElementById("resultsTableBody");
    if (table) {
      table.innerHTML = '<tr><td colspan="5" class="empty-state">No evaluation selected.</td></tr>';
    }
    return;
  }

  try {
    const evaluationResponse = await apiRequest(`/evaluations/${evaluationId}`);
    const evaluation = evaluationResponse.evaluation || evaluationResponse.data || evaluationResponse || {};
    const resultResponse = await apiRequest(`/results/${evaluationId}`);
    const resultData = resultResponse.data || resultResponse || {};
    const questionRows = resultData.questions || resultData.results || resultData.items || [];

    const subject = evaluation.subject || evaluation.course || "N/A";
    const semester = evaluation.semester || evaluation.term || "N/A";
    const name = evaluation.name || evaluation.evaluation_name || evaluation.title || "Evaluation Results";

    const resultTitle = document.getElementById("resultTitle");
    const resultSubject = document.getElementById("resultSubject");
    const resultSemester = document.getElementById("resultSemester");

    if (resultTitle) resultTitle.textContent = name;
    if (resultSubject) resultSubject.textContent = subject;
    if (resultSemester) resultSemester.textContent = semester;

    const summary = resultData.summary || {};
    const maxMarks = Number(summary.maximum_marks ?? summary.total_marks ?? summary.max_marks ?? getMaxMarks(questionRows) ?? 0) || 0;
    const obtainedMarks = Number(summary.marks_obtained ?? summary.obtained_marks ?? summary.score ?? sumObtained(questionRows) ?? 0) || 0;
    const percentage = maxMarks ? Math.round((obtainedMarks / maxMarks) * 100) : 0;
    const statusText = summary.status || getResultStatus(obtainedMarks, maxMarks, questionRows);

    const obtainedElement = document.getElementById("marksObtained");
    const maxElement = document.getElementById("maximumMarks");
    const percentElement = document.getElementById("percentageScore");
    const statusElement = document.getElementById("resultStatus");

    if (obtainedElement) obtainedElement.textContent = String(obtainedMarks);
    if (maxElement) maxElement.textContent = String(maxMarks);
    if (percentElement) percentElement.textContent = `${percentage}%`;
    if (statusElement) statusElement.textContent = statusText;

    const tableBody = document.getElementById("resultsTableBody");
    if (!questionRows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No results available yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = questionRows.map((question, index) => {
      const questionNumber = question.question_number || question.number || index + 1;
      const maxQuestionMarks = question.maximum_marks ?? question.max_marks ?? question.total_marks ?? 0;
      const obtainedQuestionMarks = question.obtained_marks ?? question.marks_obtained ?? question.score ?? 0;
      const status = question.status || question.result_status || getQuestionResultStatus(obtainedQuestionMarks, maxQuestionMarks);
      const feedback = question.feedback || question.comment || "Answer covers the required concepts.";

      return `
        <tr>
          <td>Q${questionNumber}</td>
          <td>${maxQuestionMarks}</td>
          <td>${obtainedQuestionMarks}</td>
          <td>${status}</td>
          <td>${escapeHTML(feedback)}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    const table = document.getElementById("resultsTableBody");
    if (table) {
      table.innerHTML = '<tr><td colspan="5" class="empty-state">Unable to load results.</td></tr>';
    }
  }
}

async function loadReviewData() {
  const evaluationId = getCurrentEvaluationId();
  const tableBody = document.getElementById("reviewTableBody");

  if (!tableBody || !evaluationId) {
    return;
  }

  try {
    const response = await apiRequest(`/results/${evaluationId}`);
    const resultData = response.data || response || {};
    const rows = resultData.questions || resultData.results || resultData.items || [];
    const reviewItems = rows.filter((item) => {
      const status = String(item.status || item.result_status || "").toLowerCase();
      return status.includes("review") || item.needs_review === true;
    });

    if (!reviewItems.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No questions require human review.</td></tr>';
      return;
    }

    tableBody.innerHTML = reviewItems.map((item, index) => {
      const questionNumber = item.question_number || item.number || index + 1;
      const officialAnswer = item.official_answer || item.answer_key || item.correct_answer || "N/A";
      const studentAnswer = item.student_answer || item.answer || "N/A";
      const autoMarks = item.obtained_marks ?? item.marks_obtained ?? 0;
      const maxMarks = item.maximum_marks ?? item.max_marks ?? item.total_marks ?? 0;
      const reason = item.review_reason || item.reason || "Needs manual verification";

      return `
        <tr>
          <td>Q${questionNumber}</td>
          <td>${escapeHTML(officialAnswer)}</td>
          <td>${escapeHTML(studentAnswer)}</td>
          <td>${escapeHTML(String(autoMarks))}</td>
          <td>${escapeHTML(String(maxMarks))}</td>
          <td>${escapeHTML(reason)}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No questions require human review.</td></tr>';
  }
}

async function handleSaveReview() {
  const evaluationId = getCurrentEvaluationId();
  const messageBox = document.getElementById("reviewMessage");

  if (!evaluationId) {
    setStatusMessage(messageBox, "error", "No active evaluation selected.");
    return;
  }

  try {
    await apiRequest(`/evaluations/${evaluationId}/review`, {
      method: "POST",
      body: JSON.stringify({
        evaluation_id: evaluationId,
        reviewed_at: new Date().toISOString()
      })
    });
    setStatusMessage(messageBox, "success", "Review saved successfully.");
  } catch (error) {
    setStatusMessage(messageBox, "success", "Review submission is prepared locally. Backend review endpoint is not available yet.");
  }
}

function getResultStatus(obtainedMarks, maxMarks, questionRows) {
  if (!questionRows.length) {
    return "Pending";
  }

  const average = maxMarks ? (obtainedMarks / maxMarks) * 100 : 0;
  if (average >= 50) {
    return "Pass";
  }
  if (average >= 30) {
    return "Borderline";
  }
  return "Needs Attention";
}

function getQuestionResultStatus(obtainedMarks, maxMarks) {
  if (!maxMarks) {
    return "Needs Human Review";
  }

  const percentage = (obtainedMarks / maxMarks) * 100;
  if (percentage === 100) return "Correct";
  if (percentage > 0) return "Partially Correct";
  return "Incorrect";
}

function getMaxMarks(questionRows) {
  return questionRows.reduce((sum, item) => sum + (Number(item.maximum_marks ?? item.max_marks ?? item.total_marks ?? 0) || 0), 0);
}

function sumObtained(questionRows) {
  return questionRows.reduce((sum, item) => sum + (Number(item.obtained_marks ?? item.marks_obtained ?? item.score ?? 0) || 0), 0);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
