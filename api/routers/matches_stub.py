from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter()

# Временные данные, имитирующие базу данных
STUB_MATCHES = [
    {
        "id": 1,
        "title": "Вечерний футбол 5x5",
        "sport": "Футбол",
        "city": "Алматы",
        "current_players": 8,
        "max_players": 10,
        "price": "2000 KZT"
    },
    {
        "id": 2,
        "title": "Баскетбол на Абая",
        "sport": "Баскетбол",
        "city": "Алматы",
        "current_players": 5,
        "max_players": 12,
        "price": "1500 KZT"
    },
]

@router.get("")
async def get_matches() -> List[Dict[str, Any]]:
    """
    Получение списка ближайших матчей (заглушка).
    """
    return STUB_MATCHES