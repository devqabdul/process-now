import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto.js';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ParseIdPipe } from '../common/validators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CompaniesService } from './companies.service.js';
import {
  CreateCompanyDto,
  ResetAdminPasswordDto,
  UpdateCompanyAdminDto,
  UpdateCompanyDto,
} from './dto/create-company.dto.js';

@ApiTags('admin')
@Roles(['super_admin'])
@Controller('admin/companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.companies.findAll(query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id', new ParseIdPipe('id')) id: string) {
    return this.companies.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(id, user.userId, dto);
  }

  /** Edit the company admin: name, how they sign in, or disable the login. */
  @Patch(':id/admin')
  updateAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateCompanyAdminDto,
  ) {
    return this.companies.updateAdmin(id, user.userId, dto);
  }

  /** Sets the company admin's password and signs out their existing sessions. */
  @Patch(':id/admin-password')
  resetAdminPassword(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: ResetAdminPasswordDto,
  ) {
    return this.companies.resetAdminPassword(id, user.userId, dto.password);
  }
}
