import os
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from config import ANSWER_KEY_FOLDER, MAX_CONTENT_LENGTH, STUDENT_ANSWER_FOLDER
from database import get_connection
from routes.auth import get_user_id_from_request, login_required
from services.evaluation_service import parse_question_blocks, parse_student_answers
from services.pdf_service import get_full_text
from services.scoring_service import score_answer


evaluation_bp = Blueprint("evaluation", __name__)


def get_evaluation_for_user(evaluation_id, user_id):
    conn = get_connection()
    try:
        eval_row = conn.execute(
            "SELECT * FROM evaluations WHERE id = ? AND user_id = ?",
            (evaluation_id, user_id),
        ).fetchone()
        return eval_row
    finally:
        conn.close()


def get_document_for_evaluation(evaluation_id, document_type):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM evaluation_documents WHERE evaluation_id = ? AND document_type = ? ORDER BY uploaded_at DESC LIMIT 1",
            (evaluation_id, document_type),
        ).fetchone()
        return row
    finally:
        conn.close()


def update_evaluation_status(evaluation_id, status):
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE evaluations SET status = ?, updated_at = ? WHERE id = ?",
            (status, datetime.utcnow().isoformat(), evaluation_id),
        )
        conn.commit()
    finally:
        conn.close()


@evaluation_bp.route("/evaluations/create", methods=["POST"])
@login_required
def create_evaluation():
    payload = request.get_json(silent=True) or request.form or {}
    exam_name = (payload.get("exam_name") or payload.get("name") or payload.get("examName") or "").strip()
    subject = (payload.get("subject") or "").strip()
    semester = (payload.get("semester") or "").strip()
    total_marks = payload.get("total_marks")
    if total_marks is None:
        total_marks = payload.get("totalMarks")

    if not exam_name or not subject or not semester or total_marks is None:
        return jsonify({"success": False, "message": "All evaluation fields are required."}), 400

    try:
        total_marks = int(total_marks)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Total marks must be a valid number."}), 400

    if total_marks <= 0:
        return jsonify({"success": False, "message": "Total marks must be greater than zero."}), 400

    user_id = request.user_id
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO evaluations (user_id, exam_name, subject, semester, total_marks, status) VALUES (?, ?, ?, ?, ?, 'created')",
            (user_id, exam_name, subject, semester, total_marks),
        )
        conn.commit()
        evaluation_id = cursor.lastrowid
        return jsonify({
            "success": True,
            "evaluation_id": evaluation_id,
            "message": "Evaluation created successfully."
        }), 201
    finally:
        conn.close()


@evaluation_bp.route("/evaluations/<int:evaluation_id>", methods=["GET"])
@login_required
def get_evaluation(evaluation_id):
    user_id = request.user_id
    conn = get_connection()
    try:
        evaluation = conn.execute(
            "SELECT * FROM evaluations WHERE id = ? AND user_id = ?",
            (evaluation_id, user_id),
        ).fetchone()
        if not evaluation:
            return jsonify({"success": False, "message": "Evaluation not found."}), 404

        answer_key = conn.execute(
            "SELECT 1 FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'answer_key' LIMIT 1",
            (evaluation_id,),
        ).fetchone()
        student_answers = conn.execute(
            "SELECT 1 FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'student_answers' LIMIT 1",
            (evaluation_id,),
        ).fetchone()

        return jsonify({
            "success": True,
            "evaluation": {
                "id": evaluation["id"],
                "exam_name": evaluation["exam_name"],
                "subject": evaluation["subject"],
                "semester": evaluation["semester"],
                "total_marks": evaluation["total_marks"],
                "status": evaluation["status"],
                "answer_key_uploaded": bool(answer_key),
                "student_answers_uploaded": bool(student_answers),
                "created_at": evaluation["created_at"],
                "updated_at": evaluation["updated_at"],
            }
        })
    finally:
        conn.close()


@evaluation_bp.route("/evaluations/history", methods=["GET"])
@login_required
def evaluation_history():
    user_id = request.user_id
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT e.id, e.exam_name, e.subject, e.semester, e.created_at, e.status,
                   COALESCE(er.marks_obtained, 0) AS score,
                   COALESCE(er.maximum_marks, e.total_marks) AS maximum_marks,
                   COALESCE(er.percentage, 0) AS percentage
            FROM evaluations e
            LEFT JOIN evaluation_results er ON er.evaluation_id = e.id
            WHERE e.user_id = ?
            ORDER BY e.created_at DESC
            """,
            (user_id,),
        ).fetchall()

        evaluations = [
            {
                "id": row["id"],
                "evaluation_id": row["id"],
                "name": row["exam_name"],
                "exam_name": row["exam_name"],
                "subject": row["subject"],
                "semester": row["semester"],
                "date": row["created_at"],
                "created_at": row["created_at"],
                "status": row["status"],
                "score": row["score"],
                "maximum_marks": row["maximum_marks"],
                "percentage": row["percentage"],
            }
            for row in rows
        ]

        return jsonify({"success": True, "evaluations": evaluations})
    finally:
        conn.close()


@evaluation_bp.route("/evaluations/upload-answer-key", methods=["POST"])
@login_required
def upload_answer_key():
    evaluation_id = request.form.get("evaluation_id") or (request.get_json(silent=True) or {}).get("evaluation_id")
    if evaluation_id is None:
        return jsonify({"success": False, "message": "Evaluation ID is required."}), 400

    try:
        evaluation_id = int(evaluation_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Evaluation ID must be a valid integer."}), 400

    user_id = request.user_id
    evaluation = get_evaluation_for_user(evaluation_id, user_id)
    if evaluation is None:
        return jsonify({"success": False, "message": "Evaluation not found."}), 404

    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Please upload a valid PDF file."}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "message": "Only PDF files are allowed."}), 400

    file_stream = file.stream.read(5)
    file.stream.seek(0)
    if not file_stream.startswith(b"%PDF"):
        return jsonify({"success": False, "message": "The uploaded file is not a valid PDF."}), 400

    if file.content_length and file.content_length > MAX_CONTENT_LENGTH:
        return jsonify({"success": False, "message": "File size exceeds the maximum allowed size of 1 GB."}), 413

    unique_name = f"answer_key_{uuid.uuid4().hex}_{os.path.basename(filename)}"
    target_path = os.path.join(ANSWER_KEY_FOLDER, unique_name)
    file.save(target_path)

    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'answer_key'",
            (evaluation_id,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE evaluation_documents SET filename = ?, filepath = ?, uploaded_at = ? WHERE id = ?",
                (filename, target_path, datetime.utcnow().isoformat(), existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO evaluation_documents (evaluation_id, document_type, filename, filepath) VALUES (?, 'answer_key', ?, ?)",
                (evaluation_id, filename, target_path),
            )
        conn.execute(
            "UPDATE evaluations SET status = 'answer_key_uploaded', updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), evaluation_id),
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": "Answer key uploaded successfully.",
        "filename": filename,
        "evaluation_id": evaluation_id
    })


@evaluation_bp.route("/evaluations/upload-student-answers", methods=["POST"])
@login_required
def upload_student_answers():
    evaluation_id = request.form.get("evaluation_id") or (request.get_json(silent=True) or {}).get("evaluation_id")
    if evaluation_id is None:
        return jsonify({"success": False, "message": "Evaluation ID is required."}), 400

    try:
        evaluation_id = int(evaluation_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Evaluation ID must be a valid integer."}), 400

    user_id = request.user_id
    evaluation = get_evaluation_for_user(evaluation_id, user_id)
    if evaluation is None:
        return jsonify({"success": False, "message": "Evaluation not found."}), 404

    conn = get_connection()
    try:
        answer_key = conn.execute(
            "SELECT id FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'answer_key' LIMIT 1",
            (evaluation_id,),
        ).fetchone()
    finally:
        conn.close()

    if not answer_key:
        return jsonify({"success": False, "message": "Please upload the answer key before uploading student answers."}), 400

    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Please upload a valid PDF file."}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "message": "Only PDF files are allowed."}), 400

    file_stream = file.stream.read(5)
    file.stream.seek(0)
    if not file_stream.startswith(b"%PDF"):
        return jsonify({"success": False, "message": "The uploaded file is not a valid PDF."}), 400

    if file.content_length and file.content_length > MAX_CONTENT_LENGTH:
        return jsonify({"success": False, "message": "File size exceeds the maximum allowed size of 1 GB."}), 413

    unique_name = f"student_answers_{uuid.uuid4().hex}_{os.path.basename(filename)}"
    target_path = os.path.join(STUDENT_ANSWER_FOLDER, unique_name)
    file.save(target_path)

    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'student_answers'",
            (evaluation_id,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE evaluation_documents SET filename = ?, filepath = ?, uploaded_at = ? WHERE id = ?",
                (filename, target_path, datetime.utcnow().isoformat(), existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO evaluation_documents (evaluation_id, document_type, filename, filepath) VALUES (?, 'student_answers', ?, ?)",
                (evaluation_id, filename, target_path),
            )
        conn.execute(
            "UPDATE evaluations SET status = 'student_answers_uploaded', updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), evaluation_id),
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": "Student answer script uploaded successfully.",
        "filename": filename,
        "evaluation_id": evaluation_id
    })


@evaluation_bp.route("/evaluations/compare", methods=["POST"])
@login_required
def compare_answers():
    payload = request.get_json(silent=True) or request.form or {}
    evaluation_id = payload.get("evaluation_id") or payload.get("evaluationId")
    if evaluation_id is None:
        return jsonify({"success": False, "message": "Evaluation ID is required."}), 400

    try:
        evaluation_id = int(evaluation_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Evaluation ID must be a valid integer."}), 400

    user_id = request.user_id
    evaluation = get_evaluation_for_user(evaluation_id, user_id)
    if evaluation is None:
        return jsonify({"success": False, "message": "Evaluation not found."}), 404

    conn = get_connection()
    try:
        answer_key_doc = conn.execute(
            "SELECT filepath FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'answer_key' LIMIT 1",
            (evaluation_id,),
        ).fetchone()
        student_doc = conn.execute(
            "SELECT filepath FROM evaluation_documents WHERE evaluation_id = ? AND document_type = 'student_answers' LIMIT 1",
            (evaluation_id,),
        ).fetchone()
    finally:
        conn.close()

    if not answer_key_doc:
        return jsonify({"success": False, "message": "Answer key is missing."}), 400
    if not student_doc:
        return jsonify({"success": False, "message": "Student answer script is missing."}), 400

    answer_key_path = answer_key_doc["filepath"]
    student_answers_path = student_doc["filepath"]

    try:
        answer_key_text = get_full_text(answer_key_path)
        student_text = get_full_text(student_answers_path)
    except ValueError as exc:
        update_evaluation_status(evaluation_id, "failed")
        return jsonify({"success": False, "message": str(exc)}), 400

    if not answer_key_text or not student_text:
        update_evaluation_status(evaluation_id, "failed")
        return jsonify({"success": False, "message": "No selectable text was detected. OCR is required for this scanned PDF."}), 400

    update_evaluation_status(evaluation_id, "processing")

    answer_questions = parse_question_blocks(answer_key_text)
    student_answers = parse_student_answers(student_text)
    student_map = {row["question_number"]: row["student_answer"] for row in student_answers}

    question_rows = []
    total_marks = 0
    total_max = 0
    review_required_any = False

    for item in answer_questions:
        question_number = item["question_number"]
        official_answer = item.get("official_answer") or item.get("question_text") or ""
        maximum_marks = int(item.get("maximum_marks") or 5)
        student_answer = student_map.get(question_number, "")
        marks, status, feedback, review_required = score_answer(official_answer, student_answer, maximum_marks)

        total_marks += marks
        total_max += maximum_marks
        if review_required:
            review_required_any = True

        question_rows.append({
            "question_number": question_number,
            "question_text": item.get("question_text") or f"Question {question_number}",
            "maximum_marks": maximum_marks,
            "obtained_marks": marks,
            "status": status,
            "feedback": feedback,
            "student_answer": student_answer,
            "official_answer": official_answer,
            "review_required": int(review_required),
        })

    percentage = round((total_marks / total_max * 100), 2) if total_max else 0
    overall_status = "review_required" if review_required_any else "completed"

    conn = get_connection()
    try:
        conn.execute(
            "DELETE FROM question_results WHERE evaluation_id = ?",
            (evaluation_id,),
        )
        conn.execute(
            "DELETE FROM evaluation_results WHERE evaluation_id = ?",
            (evaluation_id,),
        )

        for item in question_rows:
            conn.execute(
                "INSERT INTO question_results (evaluation_id, question_number, question_text, maximum_marks, obtained_marks, status, feedback, student_answer, official_answer, review_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    evaluation_id,
                    item["question_number"],
                    item["question_text"],
                    item["maximum_marks"],
                    item["obtained_marks"],
                    item["status"],
                    item["feedback"],
                    item["student_answer"],
                    item["official_answer"],
                    item["review_required"],
                ),
            )

        conn.execute(
            "INSERT INTO evaluation_results (evaluation_id, marks_obtained, maximum_marks, percentage, status) VALUES (?, ?, ?, ?, ?)",
            (evaluation_id, total_marks, total_max, percentage, overall_status),
        )
        conn.commit()
    finally:
        conn.close()

    update_evaluation_status(evaluation_id, overall_status)

    return jsonify({
        "success": True,
        "message": "Evaluation compared successfully.",
        "evaluation_id": evaluation_id,
        "summary": {
            "marks_obtained": total_marks,
            "maximum_marks": total_max,
            "percentage": percentage,
            "status": overall_status,
        },
        "questions": [
            {
                "question_number": row["question_number"],
                "maximum_marks": row["maximum_marks"],
                "obtained_marks": row["obtained_marks"],
                "status": row["status"],
                "feedback": row["feedback"],
                "review_required": bool(row["review_required"]),
                "student_answer": row["student_answer"],
                "official_answer": row["official_answer"],
            }
            for row in question_rows
        ],
        "evaluation": {
            "id": evaluation_id,
            "exam_name": evaluation["exam_name"],
            "subject": evaluation["subject"],
            "semester": evaluation["semester"],
        },
    })
