import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn} from "typeorm";
import { Owner } from "./owner";

@Entity({ name: "share"})
export class Share {

    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column("int")
    numShares: number | undefined;

    @OneToOne(() => Owner, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    owner: Owner | undefined;

    @Column("boolean")
    forSale: boolean | undefined;

    @Column("money")
    pricePerShare: number | undefined;
}