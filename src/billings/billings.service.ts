import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillingInfo } from './entities/billing-info.entity';
import { Invoice } from './entities/invoice.entity';

import { BillingInfoResponseDto } from './dto/billing-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class BillingsService {
  constructor(
    @InjectRepository(BillingInfo)
    private readonly billingInfoRepository: Repository<BillingInfo>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
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
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    const transaction = this.invoiceRepository.create(dto);
    const saved = await this.invoiceRepository.save(transaction);
    return this.mapTransactionToResponse(saved);
  }

  async getInvoiceById(id: string): Promise<InvoiceResponseDto> {
    const transaction = await this.findTransactionById(id);
    return this.mapTransactionToResponse(transaction);
  }

  async updateInvoice(
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const transaction = await this.findTransactionById(id);
    Object.assign(transaction, dto);
    const updated = await this.invoiceRepository.save(transaction);
    return this.mapTransactionToResponse(updated);
  }

  async getUserInvoices(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: InvoiceResponseDto[]; total: number }> {
    const [transactions, total] = await this.invoiceRepository.findAndCount({
      where: { billingInfo: { userId } },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      transactions: transactions.map((t) => this.mapTransactionToResponse(t)),
      total,
    };
  }

  async getTransactionsByStatus(
    status: InvoiceStatus,
    limit: number = 50,
  ): Promise<InvoiceResponseDto[]> {
    const transactions = await this.invoiceRepository.find({
      where: { status },
      relations: ['billingInfo', 'subscription'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return transactions.map((t) => this.mapTransactionToResponse(t));
  }

  // Private helper for internal use
  private async findTransactionById(id: string): Promise<Invoice> {
    const transaction = await this.invoiceRepository.findOne({
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
        this.invoiceRepository.count({
          where: { billingInfoId: billingInfo.id },
        }),
        this.invoiceRepository.count({
          where: {
            billingInfoId: billingInfo.id,
            status: InvoiceStatus.COMPLETED,
          },
        }),
        this.invoiceRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where('transaction.billingInfoId = :billingInfoId', {
            billingInfoId: billingInfo.id,
          })
          .andWhere('transaction.status = :status', {
            status: InvoiceStatus.COMPLETED,
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

  private mapTransactionToResponse(transaction: Invoice): InvoiceResponseDto {
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
    };
  }
}
