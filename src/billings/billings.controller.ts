import {
  Put,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BillingsService } from './billings.service';

import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { InvoiceStatus } from './enums/invoice-status.enum';

@ApiTags('Billings')
@Controller('billings')
export class BillingsController {
  constructor(private readonly billingsService: BillingsService) {}

  // BillingInfo
  @Post('info/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create billing info for user' })
  async createBillingInfo(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: CreateBillingInfoDto,
  ) {
    return this.billingsService.createBillingInfo(userId, dto);
  }

  @Get('info/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get billing info by user ID' })
  async getBillingInfo(@Param('userId') userId: string) {
    return this.billingsService.findBillingInfoByUserId(userId);
  }

  @Put('info/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update billing info' })
  async updateBillingInfo(
    @Param('userId') userId: string,
    @Body() dto: UpdateBillingInfoDto,
  ) {
    return this.billingsService.updateBillingInfo(userId, dto);
  }

  // Invoices endpoints
  @Post('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create invoice' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billingsService.createInvoice(dto);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id') id: string) {
    return this.billingsService.findInvoiceById(id);
  }

  @Put('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update invoice status' })
  async updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingsService.updateInvoice(id, dto);
  }

  @Get('users/:userId/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user invoice history' })
  async getUserInvoices(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const { invoices, total } = await this.billingsService.findUserInvoices(
      userId,
      limit,
      offset,
    );

    return {
      data: invoices,
      total,
      limit,
      offset,
    };
  }

  @Get('users/:userId/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user billing statistics' })
  async getUserBillingStats(@Param('userId') userId: string) {
    return this.billingsService.findUserBillingStats(userId);
  }

  // Admin endpoints
  @Get('invoices/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get invoices by status (admin)' })
  async getInvoicesByStatus(
    @Param('status') status: InvoiceStatus,
    @Query('limit') limit: number = 50,
  ) {
    const invoices = await this.billingsService.findInvoicesByStatus(
      status,
      limit,
    );

    return {
      data: invoices,
      total: invoices.length,
    };
  }
}
