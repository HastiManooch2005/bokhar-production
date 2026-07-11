from rest_framework.exceptions import ValidationError

from ..graphql.refund import (
    ADD_REFUND_MUTATION,
    REFUND_INQUIRY_QUERY,
)
from .graphql_client import GraphQLClient


class RefundService:

    MIN_AMOUNT = 20_000

    def __init__(self, terminal):
        self.graphql = GraphQLClient(terminal)

    def _validate(self, session_id: str, amount: int):

        if not session_id:
            raise ValidationError("session_id is required.")

        if amount < self.MIN_AMOUNT:
            raise ValidationError(
                f"Refund amount must be at least {self.MIN_AMOUNT} Rials."
            )

    def request_refund(
        self,
        *,
        session_id: str,
        amount: int,
        description: str = "",
        method: str = "PAYA",
        reason: str = "CUSTOMER_REQUEST",
    ):

        self._validate(
            session_id=session_id,
            amount=amount,
        )

        variables = {
            "session_id": session_id,
            "amount": amount,
            "description": description or None,
            "method": method,
            "reason": reason,
        }

        result = self.graphql.execute(
            query=ADD_REFUND_MUTATION,
            variables=variables,
        )

        resource = result.get("resource")

        if resource is None:
            raise ValidationError(
                "Invalid response received from ZarinPal."
            )

        # طبق مستندات، timeline در پاسخ AddRefund همیشه یک آبجکت است.
        timeline = resource.get("timeline") or {}

        return {
            "refund_id": resource.get("id"),
            "terminal_id": resource.get("terminal_id"),
            "amount": resource.get("amount"),
            "refund_status": timeline.get("refund_status"),
            "refund_amount": timeline.get("refund_amount"),
            "refund_time": timeline.get("refund_time"),
        }

    def refund_inquiry(
        self,
        *,
        terminal_id: str,
        session_id: str,
    ):

        result = self.graphql.execute(
            query=REFUND_INQUIRY_QUERY,
            variables={
                "terminal_id": terminal_id,
                "id": session_id,
            },
        )

        # طبق مستندات، Session همیشه یک لیست است.
        sessions = result.get("Session") or []

        if not sessions:
            raise ValidationError("Refund session not found.")

        session = sessions[0]

        # طبق مستندات، timeline در پاسخ SessionById همیشه یک آبجکت است.
        timeline = session.get("timeline") or {}

        return {
            "session_id": session.get("id"),
            "terminal_id": (session.get("terminal") or {}).get("id"),
            "amount": session.get("amount"),
            "status": session.get("status"),
            "refund_status": timeline.get("refund_status"),
            "refund_amount": timeline.get("refund_amount"),
            "refund_time": timeline.get("refund_time"),
        }