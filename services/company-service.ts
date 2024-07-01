import { Repository } from "typeorm";
import { Company } from "../database/models";
import { DBDataSource } from "../database/data-source";
import { CompanyEntityNotAvailableError } from "./errors";

export class CompanyService {
    public static Repo: Repository<Company> = DBDataSource.getRepository(Company);

    public static async findById(companyId: number): Promise<Company> {
        let company = await this.Repo.findOne({ where: { id: companyId } });
        if (company == null) {
            throw new CompanyEntityNotAvailableError(companyId);
        }
        return company;
    }
}