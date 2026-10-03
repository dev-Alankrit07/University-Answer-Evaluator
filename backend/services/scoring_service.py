import re


def normalize_keywords(text):
    if not text:
        return []
    return re.findall(r"[a-zA-Z0-9]+", text.lower())


def calculate_similarity(first, second):
    first_tokens = normalize_keywords(first)
    second_tokens = normalize_keywords(second)

    if not first_tokens and not second_tokens:
        return 1.0
    if not first_tokens or not second_tokens:
        return 0.0

    set_a = set(first_tokens)
    set_b = set(second_tokens)
    overlap = len(set_a.intersection(set_b))
    if overlap == 0:
        return 0.0

    return (2 * overlap) / (len(set_a) + len(set_b))


def score_answer(official_answer, student_answer, maximum_marks):
    if not student_answer or not str(student_answer).strip():
        return 0, "Incorrect", "No answer submitted.", True

    similarity = calculate_similarity(official_answer or "", student_answer or "")

    if similarity >= 0.7:
        marks = maximum_marks
        status = "Correct"
        feedback = "Answer covers the required concepts and matches the expected answer closely."
        review_required = False
    elif similarity >= 0.35:
        marks = max(0, int(round(maximum_marks * 0.6)))
        status = "Partially Correct"
        feedback = "The answer includes some relevant ideas but is missing important points."
        review_required = False
    elif similarity >= 0.15:
        marks = max(0, int(round(maximum_marks * 0.3)))
        status = "Needs Human Review"
        feedback = "The answer may be conceptually related, but it needs manual review."
        review_required = True
    else:
        marks = 0
        status = "Incorrect"
        feedback = "Answer does not address the question or does not match the expected concepts."
        review_required = False

    return marks, status, feedback, review_required
