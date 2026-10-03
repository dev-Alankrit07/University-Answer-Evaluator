document.addEventListener("DOMContentLoaded", async () => {
  const createForm = document.getElementById("createEvaluationForm");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateEvaluationSubmit);
  }

  const answerKeyFileInput = document.getElementById("answerKeyFile");
  const answerKeyUploadButton = document.getElementById("uploadAnswerKeyBtn");
  const continueToStudentBtn = document.getElementById("continueToStudentAnswersBtn");

  if (answerKeyFileInput && answerKeyUploadButton) {
    answerKeyFileInput.addEventListener("change", () => validatePdfFile(answerKeyFileInput, answerKeyUploadButton, "answerKey"));
    answerKeyUploadButton.addEventListener("click", () => handleUploadPdf("upload-answer-key", answerKeyFileInput, "answerKey"));
  }

  if (continueToStudentBtn) {
    continueToStudentBtn.addEventListener("click", () => {
      window.location.href = "student-answers.html";
    });
    updateUploadFlowButtons();
  }

  const studentFileInput = document.getElementById("studentAnswersFile");
  const studentUploadButton = document.getElementById("uploadStudentAnswersBtn");
  const compareButton = document.getElementById("compareAnswersBtn");

  if (studentFileInput && studentUploadButton) {
    studentFileInput.addEventListener("change", () => validatePdfFile(studentFileInput, studentUploadButton, "studentAnswers"));
    studentUploadButton.addEventListener("click", () => handleUploadPdf("upload-student-answers", studentFileInput, "studentAnswers"));
  }

  if (compareButton) {
    compareButton.addEventListener("click", () => {
      const answerKeyUploaded = localStorage.getItem(STORAGE_KEYS.answerKeyUploaded) === "true";
      const studentUploaded = localStorage.getItem(STORAGE_KEYS.studentAnswersUploaded) === "true";

      if (!answerKeyUploaded || !studentUploaded) {
        return;
      }

      window.location.href = "processing.html";
    });
    updateUploadFlowButtons();
  }

  if (window.location.pathname.endsWith("processing.html")) {
    runComparisonProcess();
  }
});

async function handleCreateEvaluationSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = form.querySelector("#evaluationName")?.value.trim();
  const subject = form.querySelector("#evaluationSubject")?.value.trim();
  const semester = form.querySelector("#evaluationSemester")?.value.trim();
  const totalMarks = form.querySelector("#totalMarks")?.value.trim();
  const messageBox = document.getElementById("evaluationMessage");
  const btn = document.getElementById("createEvaluationBtn");

  if (!name || !subject || !semester || !totalMarks) {
    setStatusMessage(messageBox, "error", "All evaluation fields are required.");
    return;
  }

  btn.disabled = true;
  setStatusMessage(messageBox, "info", "Creating evaluation...");

  try {
    const payload = {
      name,
      subject,
      semester,
      total_marks: Number(totalMarks)
    };

    const response = await apiRequest("/evaluations/create", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const evaluationId = response.evaluation_id || response.id || response.evaluationId || response.data?.evaluation_id || response.data?.id;

    if (!evaluationId) {
      throw new Error("The server did not return an evaluation ID.");
    }

    setCurrentEvaluationId(evaluationId);
    setStatusMessage(messageBox, "success", "Evaluation created successfully.");
    window.location.href = "answer-key.html";
  } catch (error) {
    setStatusMessage(messageBox, "error", error.message || "Unable to create the evaluation.");
    btn.disabled = false;
  }
}

function validatePdfFile(fileInput, uploadButton, type) {
  const file = fileInput.files && fileInput.files[0];
  const maxBytes = 1073741824;

  if (!file) {
    uploadButton.disabled = true;
    return false;
  }

  const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  const sizeOk = file.size <= maxBytes;

  if (!isPdf) {
    setStatusMessage(document.getElementById(type === "answerKey" ? "answerKeyMessage" : "studentAnswersMessage"), "error", "Only PDF files are allowed.");
    uploadButton.disabled = true;
    return false;
  }

  if (!sizeOk) {
    setStatusMessage(document.getElementById(type === "answerKey" ? "answerKeyMessage" : "studentAnswersMessage"), "error", "File size exceeds the maximum allowed size of 1 GB.");
    uploadButton.disabled = true;
    return false;
  }

  uploadButton.disabled = false;
  return true;
}

async function handleUploadPdf(pageEndpoint, fileInput, type) {
  const file = fileInput.files && fileInput.files[0];
  const evaluationId = getCurrentEvaluationId();
  const messageBox = document.getElementById(type === "answerKey" ? "answerKeyMessage" : "studentAnswersMessage");
  const uploadButton = document.getElementById(type === "answerKey" ? "uploadAnswerKeyBtn" : "uploadStudentAnswersBtn");

  if (!file) {
    setStatusMessage(messageBox, "error", "Please select a PDF file first.");
    return;
  }

  if (!evaluationId) {
    setStatusMessage(messageBox, "error", "No active evaluation found. Please create a new evaluation first.");
    return;
  }

  if (!validatePdfFile(fileInput, uploadButton, type)) {
    return;
  }

  uploadButton.disabled = true;
  setStatusMessage(messageBox, "info", "Uploading...");

  try {
    const route = pageEndpoint === "upload-answer-key" ? "/evaluations/upload-answer-key" : "/evaluations/upload-student-answers";
    const response = await uploadPdf(route, file, evaluationId);
    const successText = type === "answerKey" ? "✓ Answer Key Uploaded Successfully" : "✓ Student Answer Script Uploaded Successfully";
    setStatusMessage(messageBox, "success", successText);

    if (type === "answerKey") {
      localStorage.setItem(STORAGE_KEYS.answerKeyUploaded, "true");
      const continueButton = document.getElementById("continueToStudentAnswersBtn");
      if (continueButton) {
        continueButton.disabled = false;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.studentAnswersUploaded, "true");
      const compareButton = document.getElementById("compareAnswersBtn");
      if (compareButton) {
        compareButton.disabled = !(localStorage.getItem(STORAGE_KEYS.answerKeyUploaded) === "true" && localStorage.getItem(STORAGE_KEYS.studentAnswersUploaded) === "true");
      }
    }

    updateUploadFlowButtons();
  } catch (error) {
    setStatusMessage(messageBox, "error", error.message || "Upload failed.");
    uploadButton.disabled = false;
  }
}

function updateUploadFlowButtons() {
  const continueButton = document.getElementById("continueToStudentAnswersBtn");
  const compareButton = document.getElementById("compareAnswersBtn");

  if (continueButton) {
    continueButton.disabled = localStorage.getItem(STORAGE_KEYS.answerKeyUploaded) !== "true";
  }

  if (compareButton) {
    compareButton.disabled = !(localStorage.getItem(STORAGE_KEYS.answerKeyUploaded) === "true" && localStorage.getItem(STORAGE_KEYS.studentAnswersUploaded) === "true");
  }
}

async function runComparisonProcess() {
  const evaluationId = getCurrentEvaluationId();
  const messageBox = document.getElementById("processingMessage");

  if (!evaluationId) {
    if (messageBox) {
      messageBox.textContent = "No active evaluation found. Please go back and create one.";
    }
    return;
  }

  const steps = Array.from(document.querySelectorAll(".step"));
  steps.forEach((step) => {
    step.classList.remove("active", "pending");
    step.classList.add("done");
  });

  if (messageBox) {
    messageBox.textContent = "Processing evaluation...";
    messageBox.className = "processing-message";
  }

  try {
    await apiRequest("/evaluations/compare", {
      method: "POST",
      body: JSON.stringify({
        evaluation_id: evaluationId,
        evaluationId
      })
    });

    if (messageBox) {
      messageBox.textContent = "Evaluation completed successfully.";
      messageBox.className = "processing-message";
    }

    window.location.href = "results.html";
  } catch (error) {
    if (messageBox) {
      messageBox.textContent = `Evaluation could not be completed. ${error.message || "Please try again."}`;
      messageBox.className = "processing-message error";
    }
    console.error("Compare failed:", error.message || error);
  }
}
