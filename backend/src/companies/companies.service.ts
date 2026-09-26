import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { DEFAULT_SETTINGS } from '../common/company-settings.js';
import { fieldError } from '../common/validators.js';
import {
  listArgs,
  paged,
  type ListQueryDto,
  type ListSpec,
} from '../common/dto/list-query.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateCompanyDto,
  UpdateCompanyAdminDto,
  UpdateCompanyDto,
} from './dto/create-company.dto.js';

const companySelect = {
  id: true,
  name: true,
  gstNo: true,
  numberPrefix: true,
  createdAt: true,
  isActive: true,
  users: {
    where: { role: 'company_admin' },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
    },
  },
} as const;

const companyList: ListSpec<
  Prisma.CompanyWhereInput,
  Prisma.CompanyOrderByWithRelationInput
> = {
  search: (term) => {
    const digits = term.replace(/\D/g, '');
    return [
      { name: { contains: term, mode: 'insensitive' } },
      { gstNo: { contains: term, mode: 'insensitive' } },
      {
        users: {
          some: {
            role: 'company_admin',
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          },
        },
      },
    ];
  },
  sortable: {
    createdAt: (dir) => [{ createdAt: dir }],
    name: (dir) => [{ name: dir }],
  },
  defaultSort: '-createdAt',
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The super admin's list, so the base scope is every company. */
  async findAll(query: ListQueryDto) {
    const args = listArgs({}, query, companyList);
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({ ...args, select: companySelect }),
      this.prisma.company.count({ where: args.where }),
    ]);
    return paged(companies.map(toView), total, query);
  }

  async create(actor: string, { admin, ...fields }: CreateCompanyDto) {
    if (!admin.phone && !admin.email) {
      throw fieldError('admin.phone', 'Enter a phone number or an email');
    }
    const taken = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(admin.phone ? [{ phone: admin.phone }] : []),
          ...(admin.email ? [{ email: admin.email }] : []),
        ],
      },
      select: { phone: true, email: true },
    });
    if (taken) {
      const field =
        admin.phone && taken.phone === admin.phone ? 'phone' : 'email';
      const message = `A user with this ${field} already exists`;
      throw new ConflictException({
        message,
        fields: { [`admin.${field}`]: message },
      });
    }

    // One nested create = one transaction: company and its admin, or neither.
    const created = await this.prisma.company.create({
      data: {
        ...fields,
        settings: { ...DEFAULT_SETTINGS },
        createdBy: actor,
        updatedBy: actor,
        users: {
          create: {
            role: 'company_admin',
            name: admin.name,
            phone: admin.phone,
            email: admin.email,
            passwordHash: await bcrypt.hash(admin.password, 10),
            createdBy: actor,
            updatedBy: actor,
          },
        },
      },
      select: companySelect,
    });
    return toView(created);
  }

  /**
   * Sets a company admin's password on their behalf. There is no reset-by-email
   * flow, so this is how a locked-out admin gets back in. Bumping tokenVersion
   * signs out their existing sessions, in case the lockout was a compromise.
   */
  async findOne(id: string) {
    return toView(
      await this.prisma.company.findUniqueOrThrow({
        where: { id },
        select: companySelect,
      }),
    );
  }

  /** Rename, fix the GST number or prefix, or suspend the company. */
  async update(id: string, actor: string, dto: UpdateCompanyDto) {
    return toView(
      await this.prisma.company.update({
        where: { id },
        data: { ...dto, updatedBy: actor },
        select: companySelect,
      }),
    );
  }

  /** Edit the company's admin: their name, how they sign in, or disable them. */
  async updateAdmin(
    companyId: string,
    actor: string,
    dto: UpdateCompanyAdminDto,
  ) {
    const admin = await this.prisma.user.findFirst({
      where: { companyId, role: 'company_admin' },
      select: { id: true },
    });
    if (!admin) throw new NotFoundException('Not found');

    const taken =
      (dto.phone || dto.email) &&
      (await this.prisma.user.findFirst({
        where: {
          id: { not: admin.id },
          OR: [
            ...(dto.phone ? [{ phone: dto.phone }] : []),
            ...(dto.email ? [{ email: dto.email }] : []),
          ],
        },
        select: { phone: true },
      }));
    if (taken) {
      const field = dto.phone && taken.phone === dto.phone ? 'phone' : 'email';
      const message = `A user with this ${field} already exists`;
      throw new ConflictException({ message, fields: { [field]: message } });
    }

    await this.prisma.user.update({
      where: { id: admin.id },
      // Disabling the admin ends their sessions now, not at token expiry.
      data: {
        ...dto,
        updatedBy: actor,
        ...(dto.isActive === false && { tokenVersion: { increment: 1 } }),
      },
    });
    return this.findOne(companyId);
  }

  async resetAdminPassword(companyId: string, actor: string, password: string) {
    const admin = await this.prisma.user.findFirst({
      where: { companyId, role: 'company_admin' },
      select: { id: true, name: true },
    });
    if (!admin) throw new NotFoundException('Not found');

    await this.prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        tokenVersion: { increment: 1 },
        updatedBy: actor,
      },
    });
    return { changed: true, admin: admin.name };
  }
}

/** `users` is the DB relation; the API exposes the single admin it holds. */
const toView = <A, T extends { users: A[] }>({ users, ...company }: T) => ({
  ...company,
  admin: users[0] ?? null,
});
