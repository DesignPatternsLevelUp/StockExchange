import "reflect-metadata"
import { DataSource } from "typeorm"
import * as dotenv from "dotenv";
import { Person, Owner, Company, Transaction, Share } from "./models";

dotenv.config();

export const DBDataSource: DataSource = new DataSource({
    type: "postgres",
    host: process.env["POSTGRESS_HOST"],
    port: 5432,
    username: process.env["POSTGRES_USER"],
    password: process.env["POSTGRES_PASSWORD"],
    database: process.env["POSTGRES_DB"],
    logging: false,
    entities: [Company, Person, Owner, Share, Transaction],
    migrations: ["dist/database/migrations/*.js"],
    subscribers: [],
    // TODO: Remove once we have code for migrations
    migrationsTableName: "type_orm_migrations",
});
