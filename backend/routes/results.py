from flask import Blueprint, jsonify, request

from database import get_connection
from routes.auth import login_required

results_bp = Blueprint("results", __name__)


@results_bp.route("/results/<int:evaluation_id>", methods=["GET"])
@login_required
def get_result(evaluation_id):
    user_id = request.user_id
    conn = get_connection()
    try:
        evaluation = conn.execute(
            "SELECT * FROM evaluations WHERE id = ? AND user_id = ?",
            (evaluation_id, user_id),
        ).fetchone()
        if not evaluation:
            return jsonify({"success": False, "message": "Evaluation not found."}), 404

        summary = conn.execute(
            "SELECT * FROM evaluation_results WHERE evaluation_id = ? LIMIT 1",
            (evaluation_id,),
        ).fetchone()
        questions = conn.execute(
            "SELECT * FROM question_results WHERE evaluation_id = ? ORDER BY question_number ASC",
            (evaluation_id,),
        ).fetchall()

        return jsonify({
            "success": True,
            "evaluation": {
                "id": evaluation["id"],
                "exam_name": evaluation["exam_name"],
                "subject": evaluation["subject"],
                "semester": evaluation["semester"],
                "status": evaluation["status"],
            },
            "summary": {
                "marks_obtained": summary["marks_obtained"] if summary else 0,
                "maximum_marks": summary["maximum_marks"] if summary else evaluation["total_marks"],
                "percentage": summary["percentage"] if summary else 0,
                "status": summary["status"] if summary else evaluation["status"],
            },
            "questions": [
                {
                    "question_number": row["question_number"],
                    "question_text": row["question_text"],
                    "maximum_marks": row["maximum_marks"],
                    "obtained_marks": row["obtained_marks"],
                    "status": row["status"],
                    "feedback": row["feedback"],
                    "review_required": bool(row["review_required"]),
                    "student_answer": row["student_answer"],
                    "official_answer": row["official_answer"],
                }
                for row in questions
            ],
        })
    finally:
        conn.close()


@results_bp.route("/results/<int:evaluation_id>/review", methods=["POST"])
@login_required
def update_review_status(evaluation_id):
    user_id = request.user_id
    payload = request.get_json(silent=True) or {}
    question_number = payload.get("question_number")
    reviewed = bool(payload.get("reviewed"))

    conn = get_connection()
    try:
        evaluation = conn.execute(
            "SELECT id FROM evaluations WHERE id = ? AND user_id = ?",
            (evaluation_id, user_id),
        ).fetchone()
        if not evaluation:
            return jsonify({"success": False, "message": "Evaluation not found."}), 404

        if question_number is None:
            conn.execute(
                "UPDATE question_results SET review_required = 0, status = ?, feedback = ? WHERE evaluation_id = ?",
                ("Reviewed", "Reviewed by user after manual check.", evaluation_id),
            )
        else:
            conn.execute(
                "UPDATE question_results SET review_required = 0, status = ?, feedback = ? WHERE evaluation_id = ? AND question_number = ?",
                ("Reviewed", "Reviewed by user after manual check.", evaluation_id, int(question_number)),
            )
        conn.commit()

        updated = conn.execute(
            "SELECT * FROM question_results WHERE evaluation_id = ? ORDER BY question_number ASC",
            (evaluation_id,),
        ).fetchall()
        return jsonify({
            "success": True,
            "reviewed": reviewed,
            "questions": [
                {
                    "question_number": row["question_number"],
                    "status": row["status"],
                    "feedback": row["feedback"],
                    "review_required": bool(row["review_required"]),
                }
                for row in updated
            ]
        })
    finally:
        conn.close()


@results_bp.route("/evaluations/<int:evaluation_id>/review", methods=["POST"])
@login_required
def update_evaluation_review_status(evaluation_id):
    return update_review_status(evaluation_id)
