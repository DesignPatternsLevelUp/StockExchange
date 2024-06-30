import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Owner } from "./owner";
import { Company } from "./company";

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
}
