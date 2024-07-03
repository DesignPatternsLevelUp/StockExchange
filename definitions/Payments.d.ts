export type Payment = {
    type: 'incoming_payment' | 'outgoing_payment' | 'transaction_failed';
    debitAccountName: string;
    creditAccountName: string;
    amount: number;
    reference: string;
}
