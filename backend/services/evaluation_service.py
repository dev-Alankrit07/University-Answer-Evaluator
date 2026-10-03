import re


def normalize_text(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def parse_question_blocks(text):
    cleaned = normalize_text(text)
    if not cleaned:
        return []

    blocks = []
    pattern = re.compile(r"(?is)(?:^|\s)(?:Q|Question)\s*([0-9]+)\.?\s*(.*?)(?=(?:\s*(?:Q|Question)\s*[0-9]+\.?\s*)|$)")

    for match in pattern.finditer(cleaned):
        question_number = int(match.group(1))
        content = match.group(2).strip()
        if not content:
            continue

        question_text = content
        official_answer = ""
        maximum_marks = 0

        answer_match = re.search(r"(?is)(?:official\s+answer|answer)\s*[:\-]?\s*(.*?)(?=(?:\s*(?:marks?|maximum\s+marks|score)\s*[:\-]?)|$)", content)
        if answer_match:
            official_answer = normalize_text(answer_match.group(1))
            question_text = normalize_text(content[: answer_match.start()])

        marks_match = re.search(r"(?is)(?:marks?|maximum\s+marks|score)\s*[:\-]?\s*(\d+)", content)
        if marks_match:
            maximum_marks = int(marks_match.group(1))

        if not question_text:
            question_text = "Question " + str(question_number)

        blocks.append({
            "question_number": question_number,
            "question_text": question_text,
            "official_answer": official_answer,
            "maximum_marks": maximum_marks or 5,
        })

    if not blocks:
        return [{
            "question_number": 1,
            "question_text": cleaned[:250],
            "official_answer": cleaned,
            "maximum_marks": 5,
        }]

    return blocks


def parse_student_answers(text):
    cleaned = normalize_text(text)
    if not cleaned:
        return []

    answers = []
    pattern = re.compile(r"(?is)(?:^|\s)(?:Q|Question)\s*([0-9]+)\.?\s*(.*?)(?=(?:\s*(?:Q|Question)\s*[0-9]+\.?\s*)|$)")

    for match in pattern.finditer(cleaned):
        question_number = int(match.group(1))
        content = normalize_text(match.group(2))
        if not content:
            continue
        answers.append({
            "question_number": question_number,
            "student_answer": content,
        })

    if not answers:
        answers.append({
            "question_number": 1,
            "student_answer": cleaned,
        })

    return answers
