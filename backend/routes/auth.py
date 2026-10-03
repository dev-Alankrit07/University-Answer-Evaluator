import re

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_connection

auth_bp = Blueprint("auth", __name__)


def get_user_id_from_request():
    if "user_id" in session:
        return session["user_id"]

    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token.startswith("session_"):
            raw_value = token.split("_", 1)[1]
            if raw_value.isdigit():
                session["user_id"] = int(raw_value)
                return int(raw_value)

    return None


def login_required(func):
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        user_id = get_user_id_from_request()
        if user_id is None:
            return jsonify({"success": False, "message": "Authentication required."}), 401
        request.user_id = user_id
        return func(*args, **kwargs)

    return wrapper


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or request.form or {}
    name = (payload.get("name") or payload.get("full_name") or payload.get("fullName") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not name:
        return jsonify({"success": False, "message": "Name is required."}), 400
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    if not password:
        return jsonify({"success": False, "message": "Password is required."}), 400

    email_pattern = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    if not email_pattern.match(email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters long."}), 400

    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"success": False, "message": "An account with this email already exists."}), 400

        password_hash = generate_password_hash(password)
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "user": {"id": user_id, "name": name, "email": email}
        }), 201
    finally:
        conn.close()


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or request.form or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    conn = get_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        if not check_password_hash(user["password_hash"], password):
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        session["user_id"] = user["id"]
        token = f"session_{user['id']}"

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        })
    finally:
        conn.close()


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logout successful."})


@auth_bp.route("/auth/me", methods=["GET"])
@login_required
def get_current_user():
    user_id = request.user_id
    conn = get_connection()
    try:
        user = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404
        return jsonify({"success": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}})
    finally:
        conn.close()


@auth_bp.route("/auth/profile", methods=["PUT"])
@login_required
def update_profile():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()

    if not name or not email:
        return jsonify({"success": False, "message": "Name and email are required."}), 400

    email_pattern = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    if not email_pattern.match(email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

    user_id = request.user_id
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (name, email, user_id),
        )
        conn.commit()
        user = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
        return jsonify({"success": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}})
    finally:
        conn.close()


@auth_bp.route("/auth/me", methods=["PUT"])
@login_required
def update_current_user():
    return update_profile()
