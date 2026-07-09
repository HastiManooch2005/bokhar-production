from payments.enums import RefundMethod, RefundReason
from payments.exceptions import (
    RefundNotFound,
    RefundValidationError,
)
from payments.graphql.refund import (
    ADD_REFUND_MUTATION,
    REFUND_INQUIRY_QUERY,
)
from payments.services.graphql_client import GraphQLClient


class RefundService:

    MIN_AMOUNT = 20_000

    def __init__(self, terminal):
        self.graphql = GraphQLClient(terminal)

    def _validate(
        self,
        session_id: str,
        amount: int,
    ) -> None:

        if not session_id:
            raise RefundValidationError(
                "session_id is required."
            )

        if amount < self.MIN_AMOUNT:
            raise RefundValidationError(
                f"Refund amount must be at least {self.MIN_AMOUNT} Rials."
            )

    def request_refund(
        self,
        *,
        session_id: str,
        amount: int,
        description: str = "",
        method: RefundMethod = RefundMethod.CARD,
        reason: RefundReason = RefundReason.CUSTOMER_REQUEST,
    ):

        self._validate(
            session_id=session_id,
            amount=amount,
        )

        variables = {
            "session_id": session_id,
            "amount": amount,
            "description": description or None,
            "method": method.value,
            "reason": reason.value,
        }

        result = self.graphql.execute(
            query=ADD_REFUND_MUTATION,
            variables=variables,
        )

        resource = result.get("resource")

        if resource is None:
            raise RefundValidationError(
                "Invalid response received from ZarinPal."
            )

        timeline = resource.get("timeline") or {}

        if isinstance(timeline, list):
            timeline = timeline[-1] if timeline else {}

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

        sessions = result.get("Session", [])

        if not sessions:
            raise RefundNotFound(
                "Refund session not found."
            )

        session = sessions[0]

        timeline = session.get("timeline") or {}

        if isinstance(timeline, list):
            timeline = timeline[-1] if timeline else {}

        return {
            "session_id": session.get("id"),
            "terminal_id": session.get("terminal", {}).get("id"),
            "amount": session.get("amount"),
            "status": session.get("status"),
            "refund_status": timeline.get("refund_status"),
            "refund_amount": timeline.get("refund_amount"),
            "refund_time": timeline.get("refund_time"),
        }