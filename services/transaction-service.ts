import { Repository } from "typeorm";
import { Transaction, TransactionStatus } from "../database/models"
import { DBDataSource } from "../database/data-source";
import { OwnerService } from "./owner-service";
import { ShareService } from "./share-service";
import { CompanyService } from "./company-service";
import { QuantityNotAvailableError, SharesNotAvailableError, TransactionFailedError } from "./errors";

export class TransactionService {
    public static Repo: Repository<Transaction> = DBDataSource.getRepository(Transaction)

    public static async findById(transactionId: number): Promise<Transaction> {
        let transaction = await this.Repo.findOne({ where: { id: transactionId } })
        if (transaction == null) throw new TransactionFailedError("Transaction not found");
        return transaction;
    }

    public static async setTransactionStatus(transactionId: number, status: TransactionStatus): Promise<Transaction> {
        let transaction = await this.findById(transactionId);
        if (transaction == null) throw new TransactionFailedError("Transaction not found");
        if (transaction.status != status) {
            transaction.status = status;
            transaction = await this.Repo.save(transaction);
            if (transaction.id == undefined) throw new TransactionFailedError();
        }
        return transaction;
    }

    public static async createTransaction(buyerId: number, sellerId: number, companyId: number, quantity: number) : Promise<Transaction>{
        let [buyer, seller, company, share] = await Promise.all([
            OwnerService.findById(buyerId),
            OwnerService.findById(sellerId),
            CompanyService.findById(companyId),
            ShareService.getPurchasableSharesByOwnerId(sellerId, companyId)
        ])
        if ((share.numShares || 0) < quantity) throw new QuantityNotAvailableError(quantity);
        if (share.id == undefined) throw new SharesNotAvailableError();
        
        const transaction = new Transaction()
        transaction.buyer = buyer;
        transaction.seller = seller;
        transaction.company = company;
        transaction.quantity = quantity;
        transaction.pricePerShare = share.pricePerShare;
        transaction.status = TransactionStatus.PENDING;
        return transaction;
    }

    public static async persistTransation(transaction: Transaction): Promise<Transaction> {
        if (transaction.id === undefined) {
            transaction = await this.Repo.save(transaction);
            if (transaction.id == undefined) throw new TransactionFailedError();
        }
        return transaction;
    } 
}