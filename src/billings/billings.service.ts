import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillingInfo } from './entities/billing-info.entity';
import { Invoice } from './entities/invoice.entity';

import { BillingInfoResponseDto } from './dto/billing-info-response.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
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

  async findBillingInfoByUserId(
    userId: string,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserIdOrFail(userId);
    return this.mapBillingInfoToResponse(billingInfo);
  }

  async findBillingInfoByCustomerId(
    stripeCustomerId: string,
  ): Promise<BillingInfo> {
    const billingInfo = await this.billingInfoRepository.findOne({
      where: { stripeCustomerId },
      relations: ['user'],
    });
    if (!billingInfo) {
      throw new Error(`BillingInfo not found for customer ${stripeCustomerId}`);
    }
    return billingInfo;
  }

  async updateBillingInfo(
    userId: string,
    dto: UpdateBillingInfoDto,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserIdOrFail(userId);

    Object.assign(billingInfo, dto);

    const updated = await this.billingInfoRepository.save(billingInfo);

    return this.mapBillingInfoToResponse(updated);
  }

  async updateStripeInfo(
    userId: string,
    stripeCustomerId: string,
  ): Promise<BillingInfoResponseDto> {
    const billingInfo = await this.findBillingInfoByUserIdOrFail(userId);
    billingInfo.stripeCustomerId = stripeCustomerId;

    const updated = await this.billingInfoRepository.save(billingInfo);

    return this.mapBillingInfoToResponse(updated);
  }

  // Invoice methods
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    const invoice = this.invoiceRepository.create(dto);
    const saved = await this.invoiceRepository.save(invoice);
    return this.mapInvoiceToResponse(saved);
  }

  async findInvoiceById(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.findInvoiceOrFail(id);
    return this.mapInvoiceToResponse(invoice);
  }

  async findInvoiceInstanceById(
    stripeInvoiceId: string,
  ): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { stripeInvoiceId },
    });
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
  ): Promise<void> {
    await this.invoiceRepository.update(invoiceId, {
      status,
      processedAt: new Date(),
    });
  }

  async updateInvoice(
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.findInvoiceOrFail(id);
    Object.assign(invoice, dto);

    const updated = await this.invoiceRepository.save(invoice);
    return this.mapInvoiceToResponse(updated);
  }

  async findUserInvoices(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ invoices: InvoiceResponseDto[]; total: number }> {
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: { billingInfo: { userId } },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      invoices: invoices.map((t) => this.mapInvoiceToResponse(t)),
      total,
    };
  }

  async findInvoicesByStatus(
    status: InvoiceStatus,
    limit: number = 50,
  ): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceRepository.find({
      where: { status },
      relations: ['billingInfo', 'subscription'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return invoices.map((t) => this.mapInvoiceToResponse(t));
  }

  async findUserBillingStats(userId: string) {
    const billingInfo = await this.findBillingInfoByUserIdOrFail(userId);

    const [totalInvoices, successfulInvoices, totalSpent] = await Promise.all([
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
      totalInvoices,
      successfulInvoices,
      failedInvoices: totalInvoices - successfulInvoices,
      totalSpent: parseFloat(totalSpent?.total || '0'),
      currency: billingInfo.currency,
    };
  }

  // Private helpers
  private async findInvoiceOrFail(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['billingInfo', 'subscription'],
    });

    if (!invoice) {
      throw new NotFoundException('invoice not found');
    }

    return invoice;
  }

  private async findBillingInfoByUserIdOrFail(
    userId: string,
  ): Promise<BillingInfo> {
    const billingInfo = await this.billingInfoRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!billingInfo) {
      throw new NotFoundException('Billing info not found for this user');
    }

    return billingInfo;
  }

  private mapBillingInfoToResponse(
    billingInfo: BillingInfo,
  ): BillingInfoResponseDto {
    return {
      id: billingInfo.id,
      userId: billingInfo.userId,
      name: billingInfo.name,
      currency: billingInfo.currency,
      hasStripeCustomer: !!billingInfo.stripeCustomerId,
      updatedAt: billingInfo.updatedAt,
    };
  }

  private mapInvoiceToResponse(invoice: Invoice): InvoiceResponseDto {
    return {
      id: invoice.id,
      type: invoice.type,
      status: invoice.status,
      amount: parseFloat(invoice.amount.toString()),
      currency: invoice.currency,
      planName: invoice.planName,
      planType: invoice.planType,
      description: invoice.description,
      processedAt: invoice.processedAt,
      createdAt: invoice.createdAt,
    };
  }
}
