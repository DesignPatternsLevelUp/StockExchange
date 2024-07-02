import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("person")
export class Person {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column("varchar")
    bankAccount: string | undefined;
}