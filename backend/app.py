import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from config import ANSWER_KEY_FOLDER, CORS_ORIGINS, REPORTS_FOLDER, STUDENT_ANSWER_FOLDER, UPLOAD_FOLDER
from database import init_db
from routes.auth import auth_bp
from routes.evaluation import evaluation_bp
from routes.results import results_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")
    app.config["JSON_SORT_KEYS"] = False

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(ANSWER_KEY_FOLDER, exist_ok=True)
    os.makedirs(STUDENT_ANSWER_FOLDER, exist_ok=True)
    os.makedirs(REPORTS_FOLDER, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}}, supports_credentials=True)

    init_db()

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(evaluation_bp, url_prefix="/api")
    app.register_blueprint(results_bp, url_prefix="/api")

    @app.route("/")
    def index():
        return jsonify({"message": "University Answer Evaluator API is running."})

    @app.route("/api/health")
    def health():
        return jsonify({"status": "healthy", "service": "University Answer Evaluator"})

    @app.errorhandler(400)
    def handle_400(error):
        return jsonify({"success": False, "message": "Bad request."}), 400

    @app.errorhandler(401)
    def handle_401(error):
        return jsonify({"success": False, "message": "Authentication required."}), 401

    @app.errorhandler(403)
    def handle_403(error):
        return jsonify({"success": False, "message": "Forbidden."}), 403

    @app.errorhandler(404)
    def handle_404(error):
        return jsonify({"success": False, "message": "Resource not found."}), 404

    @app.errorhandler(RequestEntityTooLarge)
    def handle_413(error):
        return jsonify({"success": False, "message": "File size exceeds the maximum allowed size of 1 GB."}), 413

    @app.errorhandler(500)
    def handle_500(error):
        return jsonify({"success": False, "message": "Internal server error."}), 500

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "").lower() == "true" and os.environ.get("APP_ENV", "").lower() != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
