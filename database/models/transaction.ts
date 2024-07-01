import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Repository } from "typeorm";
import { Owner } from "./owner";
import { Company } from "./company";

export enum TransactionStatus {
    PENDING = 0,
    CANCELLED = 1,
    FUNDS_TRANSFERED = 2,
    BUYER_STOCKS_INC = 3,
    SELLER_STOCKS_DEC = 4,
    EXCHANGE_COMPLETE = 5,
    FEES_PAID = 6,
    COMPLETE = 7,
    FAILED = 8,
}

@Entity({ name: "transaction"})
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number | undefined

    @Column("int")
    quantity: number | undefined

    @OneToOne(() => Owner, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    seller: Owner | undefined

    @OneToOne(() => Owner, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    buyer: Owner | undefined

    @Column("money")
    pricePerShare: number | undefined

    @OneToOne(() => Company, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    company: Company | undefined

    @Column({ type: "enum", enum: TransactionStatus, default: TransactionStatus.PENDING})
    status: TransactionStatus | undefined
}
