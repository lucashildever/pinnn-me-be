import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillingInfo } from './entities/billing-info.entity';
import { Transaction } from './entities/transaction.entity';

import { BillingInfoResponseDto } from './dto/billing-response.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus } from './enums/transaction-status.enum';

@Injectable()
export class BillingsService {
  constructor(
    @InjectRepository(BillingInfo)
    private readonly billingInfoRepository: Repository<BillingInfo>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async createBillingInfo(
    userId: string,
    dto: CreateBillingInfoDto,
  ): Promise<BillingInfoResponseDto> {
    const existingBilling = await this.billingInfoRepository.findOne({
      where: { userId: userId },
    });

    if (existingBilling) {
      throw new BadRequestException(
        'Billing info already exists for this user',
      );
    }

    const billingInfo = this.billingInfoRepository.create({
      ...dto,
      userId: userId,
    });
    const saved = await this.billingInfoRepository.save(billingInfo);

    return this.mapBillingInfoToResponse(saved);
  }

  async getBillingInfoByUserId(
    userId: string,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserId(userId);
    return this.mapBillingInfoToResponse(billingInfo);
  }

  async updateBillingInfo(
    userId: string,
    dto: UpdateBillingInfoDto,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserId(userId);
    Object.assign(billingInfo, dto);
    const updated = await this.billingInfoRepository.save(billingInfo);
    return this.mapBillingInfoToResponse(updated);
  }

  async updateStripeInfo(
    userId: string,
    stripeCustomerId: string,
    defaultPaymentMethodId?: string,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserId(userId);
    billingInfo.stripeCustomerId = stripeCustomerId;
    if (defaultPaymentMethodId) {
      billingInfo.defaultPaymentMethodId = defaultPaymentMethodId;
    }
    const updated = await this.billingInfoRepository.save(billingInfo);
    return this.mapBillingInfoToResponse(updated);
  }

  // Private helper for internal use
  private async findBillingInfoByUserId(userId: string): Promise<BillingInfo> {
    const billingInfo = await this.billingInfoRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!billingInfo) {
      throw new NotFoundException('Billing info not found for this user');
    }

    return billingInfo;
  }

  // Transaction methods
  async createTransaction(
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = this.transactionRepository.create(dto);
    const saved = await this.transactionRepository.save(transaction);
    return this.mapTransactionToResponse(saved);
  }

  async getTransactionById(id: string): Promise<TransactionResponseDto> {
    const transaction = await this.findTransactionById(id);
    return this.mapTransactionToResponse(transaction);
  }

  async updateTransaction(
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.findTransactionById(id);
    Object.assign(transaction, dto);
    const updated = await this.transactionRepository.save(transaction);
    return this.mapTransactionToResponse(updated);
  }

  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: TransactionResponseDto[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { billingInfo: { userId } },
        relations: ['subscription'],
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      },
    );

    return {
      transactions: transactions.map((t) => this.mapTransactionToResponse(t)),
      total,
    };
  }

  async getTransactionsByStatus(
    status: TransactionStatus,
    limit: number = 50,
  ): Promise<TransactionResponseDto[]> {
    const transactions = await this.transactionRepository.find({
      where: { status },
      relations: ['billingInfo', 'subscription'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return transactions.map((t) => this.mapTransactionToResponse(t));
  }

  // Private helper for internal use
  private async findTransactionById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['billingInfo', 'subscription'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  // Helper methods
  async getUserBillingStats(userId: string) {
    const billingInfo = await this.findBillingInfoByUserId(userId);

    const [totalTransactions, successfulTransactions, totalSpent] =
      await Promise.all([
        this.transactionRepository.count({
          where: { billingInfoId: billingInfo.id },
        }),
        this.transactionRepository.count({
          where: {
            billingInfoId: billingInfo.id,
            status: TransactionStatus.COMPLETED,
          },
        }),
        this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where('transaction.billingInfoId = :billingInfoId', {
            billingInfoId: billingInfo.id,
          })
          .andWhere('transaction.status = :status', {
            status: TransactionStatus.COMPLETED,
          })
          .getRawOne(),
      ]);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions: totalTransactions - successfulTransactions,
      totalSpent: parseFloat(totalSpent?.total || '0'),
      currency: billingInfo.currency,
    };
  }

  // Response mappers
  private mapBillingInfoToResponse(
    billingInfo: BillingInfo,
  ): BillingInfoResponseDto {
    return {
      id: billingInfo.id,
      userId: billingInfo.userId,
      fullName: billingInfo.fullName,
      addressStreet: billingInfo.addressStreet,
      addressCity: billingInfo.addressCity,
      addressState: billingInfo.addressState,
      addressZipCode: billingInfo.addressZipCode,
      addressCountry: billingInfo.addressCountry,
      currency: billingInfo.currency,
      taxId: billingInfo.taxId,
      hasStripeCustomer: !!billingInfo.stripeCustomerId,
      hasDefaultPaymentMethod: !!billingInfo.defaultPaymentMethodId,
      updatedAt: billingInfo.updatedAt,
    };
  }

  private mapTransactionToResponse(
    transaction: Transaction,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency,
      planName: transaction.planName,
      planType: transaction.planType,
      description: transaction.description,
      processedAt: transaction.processedAt,
      createdAt: transaction.createdAt,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
    };
  }
}
