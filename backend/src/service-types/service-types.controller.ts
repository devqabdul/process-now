import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListQueryDto } from '../common/dto/list-query.dto.js';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ParseIdPipe } from '../common/validators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
} from './dto/service-type.dto.js';
import { ServiceTypesService } from './service-types.service.js';

@ApiTags('service-types')
@Roles(['company_admin'])
@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypes: ServiceTypesService) {}

  @Get()
  findAll(@CompanyId() companyId: string, @Query() query: ListQueryDto) {
    return this.serviceTypes.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.serviceTypes.findOne(companyId, id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceTypeDto,
  ) {
    return this.serviceTypes.create(companyId, user.userId, dto);
  }

  /** Edit, or set active: false. */
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.serviceTypes.update(companyId, user.userId, id, dto);
  }

  /** Only a service no order has used; a used one is retired with isActive: false. */
  @Delete(':id')
  @HttpCode(200)
  remove(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.serviceTypes.remove(companyId, id);
  }
}
