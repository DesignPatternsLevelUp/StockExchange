import { Repository } from "typeorm";
import { Owner } from "../database/models";
import { DBDataSource } from "../database/data-source";
import { OwnerEntityNotAvailableError } from "./errors";

export class OwnerService {
    public static Repo: Repository<Owner> = DBDataSource.getRepository(Owner);

    public static async findById(ownerId: number) : Promise<Owner> {
        let owner = await this.Repo.findOneBy({ id: ownerId });
        if (owner == null) {
            throw new OwnerEntityNotAvailableError(ownerId);
        }
        return owner;
    }
}