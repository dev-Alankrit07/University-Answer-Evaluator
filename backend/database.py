import sqlite3

from config import DATABASE_PATH


def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                exam_name TEXT NOT NULL,
                subject TEXT NOT NULL,
                semester TEXT NOT NULL,
                total_marks INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'created',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evaluation_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                document_type TEXT NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evaluation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                marks_obtained INTEGER NOT NULL,
                maximum_marks INTEGER NOT NULL,
                percentage REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS question_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                question_number INTEGER NOT NULL,
                question_text TEXT,
                maximum_marks INTEGER NOT NULL,
                obtained_marks INTEGER NOT NULL,
                status TEXT NOT NULL,
                feedback TEXT,
                student_answer TEXT,
                official_answer TEXT,
                review_required INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
            CREATE INDEX IF NOT EXISTS idx_documents_evaluation_id ON evaluation_documents(evaluation_id);
            CREATE INDEX IF NOT EXISTS idx_results_evaluation_id ON evaluation_results(evaluation_id);
            CREATE INDEX IF NOT EXISTS idx_question_results_evaluation_id ON question_results(evaluation_id);
            """
        )
        conn.commit()
    finally:
        conn.close()
