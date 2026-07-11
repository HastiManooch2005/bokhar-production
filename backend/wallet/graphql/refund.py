ADD_REFUND_MUTATION = """
mutation AddRefund(
    $session_id: ID!,
    $amount: BigInteger!,
    $description: String,
    $method: InstantPayoutActionTypeEnum
    $reason: RefundReasonEnum
) {
    resource: AddRefund(
        session_id: $session_id,
        amount: $amount,
        description: $description,
        method: $method,
        reason: $reason
    ) {
        id
        terminal_id
        amount
        timeline {
            refund_status
            refund_amount
            refund_time
        }
    }
}
"""


REFUND_INQUIRY_QUERY = """
query RefundInquiry(
    $terminal_id: ID!,
    $id: ID!
) {
    Session(
        terminal_id: $terminal_id,
        id: $id
    ) {
        id
        amount
        status
        terminal {
            id
        }
        timeline {
            refund_status
            refund_amount
            refund_time
        }
    }
}
"""