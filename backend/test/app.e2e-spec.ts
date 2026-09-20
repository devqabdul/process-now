import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import { setupApp } from '../src/setup-app.js';
import { api } from './helpers.js';

class ItemDto {
  @IsInt()
  @Min(1)
  qtyIn: number;
}

class EchoDto {
  @IsString()
  @MinLength(2)
  name: string;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

@Controller('probe')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }

  @Post()
  post(@Body() body: EchoDto) {
    return body;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('global app setup (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps success in the envelope', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/probe'))
      .expect(200);
    expect(res.body).toEqual({
      status_code: 200,
      message: 'OK',
      data: { ok: true },
    });
  });

  it('returns 422 with nested field errors', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/probe'))
      .send({ name: 'x', items: [{ qtyIn: 0 }], extra: 1 })
      .expect(422);
    expect(res.body.status_code).toBe(422);
    expect(Object.keys(res.body.fields).sort()).toEqual([
      'extra',
      'items.0.qtyIn',
      'name',
    ]);
  });

  it('returns 404 in the error shape', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/nope'))
      .expect(404);
    expect(res.body).toMatchObject({ status_code: 404 });
    expect(res.body).not.toHaveProperty('data');
  });
});
