import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { DateRangeQueryDto } from '../common/dto/date-range-query.dto.js';
import { ParseIdPipe } from '../common/validators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  CreateVendorDto,
  ListVendorsQueryDto,
  UpdateVendorDto,
} from './dto/vendor.dto.js';
import { VendorsService } from './vendors.service.js';

@ApiTags('vendors')
@Roles(['company_admin'])
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  findAll(@CompanyId() companyId: string, @Query() query: ListVendorsQueryDto) {
    return this.vendors.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.vendors.findOne(companyId, id);
  }

  /** Orders, bills and payments in a window, with the amount owed after each */
  @Get(':id/statement')
  statement(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.vendors.statement(companyId, id, query);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendors.create(companyId, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendors.update(companyId, user.userId, id, dto);
  }
}
