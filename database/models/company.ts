import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "company"})
export class Company {
    
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column("varchar")
    name: string | undefined;

    @Column("varchar")
    bankAccount: string | undefined;
}