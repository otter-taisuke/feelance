def compute_happy(amount: float, mood_score: int) -> float:
    """
    心の動きに応じてHappy Moneyを加減算する。
    バイアス: -2→-1.0, -1→-0.5, 0→0, +1→+0.5, +2→+1.0
    """
    bias_map = {
        -2: -1.0,
        -1: -0.5,
        0: 0.0,
        1: 0.5,
        2: 1.0,
    }
    bias = bias_map.get(mood_score, 0.0)
    adjusted = amount * bias
    return adjusted

