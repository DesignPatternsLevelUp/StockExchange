import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Repository} from "typeorm";
import { Owner } from "./owner";
import { Company } from "./company";

@Entity({ name: "share"})
export class Share {

    @PrimaryGeneratedColumn()
    id: number | undefined;

    @OneToOne(() => Company, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    company: Company | undefined;

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