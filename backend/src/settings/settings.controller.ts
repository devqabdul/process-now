import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@Roles(['company_admin'])
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CompanyId() companyId: string) {
    return this.settings.get(companyId);
  }

  @Patch()
  update(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settings.update(companyId, user.userId, dto);
  }
}
