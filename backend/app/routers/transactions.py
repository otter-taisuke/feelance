from datetime import date
from typing import List, Optional

from fastapi import APIRouter

from app.schemas.transactions import (
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.services.transactions import (
    create_transaction,
    delete_transaction,
    get_transaction,
    list_transactions,
    update_transaction,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionOut])
def list_tx(
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    date_exact: Optional[date] = None,
) -> List[TransactionOut]:
    return list_transactions(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        date_exact=date_exact,
    )


@router.get("/{tx_id}", response_model=TransactionOut)
def get_tx(tx_id: str) -> TransactionOut:
    return get_transaction(tx_id)


@router.post("", response_model=TransactionOut, status_code=201)
def create_tx(payload: TransactionCreate) -> TransactionOut:
    return create_transaction(payload)


@router.put("/{tx_id}", response_model=TransactionOut)
def update_tx(tx_id: str, payload: TransactionUpdate) -> TransactionOut:
    return update_transaction(tx_id, payload)


@router.delete("/{tx_id}", status_code=204)
def delete_tx(tx_id: str) -> None:
    delete_transaction(tx_id)

