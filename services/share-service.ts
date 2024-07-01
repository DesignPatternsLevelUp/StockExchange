import { Repository } from "typeorm";
import { Share } from "../database/models";
import { DBDataSource } from "../database/data-source";
import { QuantityNotAvailableError, SharesFailedError, SharesNotAvailableError } from "./errors";
import { OwnerService } from "./owner-service";
import { CompanyService } from "./company-service";

export class ShareService {
    public static Repo: Repository<Share> = DBDataSource.getRepository(Share);

    private static async getShareByOwner(ownerId: number, companyId: number, forSale: boolean) : Promise<Share | null> {
        let share = await this.Repo.findOneBy({
            company: { id: companyId },
            owner: { id: ownerId },
            forSale: forSale
        });
        return share;
    }

    public static async getPurchasableSharesByOwnerId(ownerId: number, companyId: number) : Promise<Share> {
        let share = await this.getShareByOwner(ownerId, companyId, true);
        if (share == null) throw new SharesNotAvailableError();
        return share;
    }

    public static async getNonPurchasableSharesBySeller(ownerId: number, companyId: number) : Promise<Share> {
        let share = await this.getShareByOwner(ownerId, companyId, false);
        if (share == null) throw new SharesNotAvailableError();
        return share;
    }

    public static async addSharesToOwner(ownerId: number, companyId: number, quantity: number): Promise<Share> {
        let share;
        try {
            share = await this.getPurchasableSharesByOwnerId(ownerId, companyId);
            if (share.numShares == undefined) throw new SharesFailedError(`Share has no numShares`);
            share.numShares += quantity;
        } catch (e) {
            if (e instanceof SharesNotAvailableError) {
                let [owner, company] = await Promise.all([
                    OwnerService.findById(ownerId),
                    CompanyService.findById(companyId)
                ]);
                share = new Share();
                share.owner = owner;
                share.company = company;
                share.forSale = true;
                share.numShares = quantity;
            } else throw e;
        }
        share = await this.Repo.save(share);
        if (share.id == undefined) throw new SharesFailedError("Share has no id");
        return share;
    }

    public static async removeSharesFromOwner(ownerId: number, companyId: number, quantity: number) : Promise<Share> {
        let share = await this.getPurchasableSharesByOwnerId(ownerId, companyId);
        if (share.numShares == undefined) throw new SharesFailedError("Share has no numShares");
        if (share.numShares < quantity) throw new QuantityNotAvailableError(quantity);
        share.numShares -= quantity;
        share = await this.Repo.save(share);
        if (share.id == undefined) throw new SharesFailedError("Share has no id");
        return share;
    }
}