def compute_happy(amount: float, mood_score: int) -> float:
    """心の動きを考慮したHappy Moneyを計算し、0.5〜1.5倍にクランプ。"""
    base = amount * (1 + mood_score / 2)
    lower = amount * 0.5
    upper = amount * 1.5
    return max(lower, min(upper, base))

