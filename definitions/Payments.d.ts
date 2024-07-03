export type Payment = {
    id: string;
    type: 'incoming_payment' | 'outgoing_payment' | 'transaction_failed';
    debitAccountName: string;
    creditAccountName: string;
    amount: number;
    reference: string;
}
