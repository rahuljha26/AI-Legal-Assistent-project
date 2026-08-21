"""Password strength validation and input sanitization."""

import re

from django.core.exceptions import ValidationError


PASSWORD_RULES = [
    (r'.{8,}', 'Password must be at least 8 characters.'),
    (r'[A-Z]', 'Password must contain at least one uppercase letter.'),
    (r'[a-z]', 'Password must contain at least one lowercase letter.'),
    (r'[0-9]', 'Password must contain at least one digit.'),
    (r'[!@#$%^&*(),.?":{}|<>]', 'Password must contain at least one special character.'),
]


def validate_password_strength(password: str) -> None:
    errors = []
    for pattern, message in PASSWORD_RULES:
        if not re.search(pattern, password):
            errors.append(message)
    if errors:
        raise ValidationError(errors)


def get_password_strength_score(password: str) -> dict:
    """Return score 0-100 and feedback for UI."""
    score = 0
    feedback = []
    checks = {
        'length': len(password) >= 8,
        'uppercase': bool(re.search(r'[A-Z]', password)),
        'lowercase': bool(re.search(r'[a-z]', password)),
        'digit': bool(re.search(r'[0-9]', password)),
        'special': bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password)),
    }
    score = sum(20 for v in checks.values() if v)
    if len(password) >= 12:
        score = min(100, score + 10)
    if not checks['length']:
        feedback.append('Use at least 8 characters')
    if not checks['uppercase']:
        feedback.append('Add an uppercase letter')
    if not checks['lowercase']:
        feedback.append('Add a lowercase letter')
    if not checks['digit']:
        feedback.append('Add a number')
    if not checks['special']:
        feedback.append('Add a special character')

    label = 'Weak'
    if score >= 80:
        label = 'Strong'
    elif score >= 60:
        label = 'Good'
    elif score >= 40:
        label = 'Fair'

    return {'score': score, 'label': label, 'checks': checks, 'feedback': feedback}


def sanitize_string(value: str, max_length: int = 1000) -> str:
    if not value:
        return ''
    cleaned = re.sub(r'[<>"\']', '', str(value))
    return cleaned[:max_length]
