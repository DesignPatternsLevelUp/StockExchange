import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Person } from "./person";
import { Company } from "./company";

@Entity({ name: "owner"})
export class Owner {

    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column("boolean")
    isCompany: boolean | undefined;

    @OneToOne(() => Person, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    person: Person | undefined;

    @OneToOne(() => Company, { onUpdate: "CASCADE", onDelete: "CASCADE" })
    @JoinColumn()
    company: Company | undefined;
}