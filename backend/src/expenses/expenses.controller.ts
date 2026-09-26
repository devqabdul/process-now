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
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ParseIdPipe } from '../common/validators.js';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@ApiTags('expenses')
@Roles(['company_admin'])
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expenses.findAll(companyId, query);
  }

  @Get('categories')
  categories(@CompanyId() companyId: string) {
    return this.expenses.categories(companyId);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.create(companyId, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(companyId, user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.expenses.remove(companyId, id);
  }
}
