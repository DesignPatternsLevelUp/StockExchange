export class OwnerEntityNotAvailableError extends Error {
    constructor(ownerId: number) {
        super(`Owner: ${ownerId} was not found`)
        this.name = 'OwnerEntityNotAvailableError'
    }
}

export class CompanyEntityNotAvailableError extends Error {
    constructor(companyId: number) {
        super(`Company: ${companyId} was not found`)
        this.name = 'CompanyEntityNotAvailableError'
    }
}

export class QuantityNotAvailableError extends Error {
    constructor(quantity: number) {
        super(`Quantity: ${quantity} is not available`)
        this.name = 'QuantityNotAvailableError'
    }
}

export class SharesNotAvailableError extends Error {
    constructor() {
        super(`Shares is not available`)
        this.name = 'SharesNotAvailableError'
    }
}

export class SharesFailedError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SharesFailedError'
    }
}

export class SharesNotForSaleError extends Error {
    constructor() {
        super(`Shares is not for sale`)
        this.name = 'SharesNotForSaleError'
    }
}

export class TransactionFailedError extends Error {
    constructor(message: string = `Transaction not saved`) {
        super(message)
        this.name = 'TransactionFailedError'
    }
}

export class EscrowFailedError extends Error {
    constructor(message: string = `Escrow not saved`) {
        super(message)
        this.name = 'EscrowFailedError'
    }
}