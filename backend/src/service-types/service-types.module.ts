import { Module } from '@nestjs/common';
import { ServiceTypesController } from './service-types.controller.js';
import { ServiceTypesService } from './service-types.service.js';

@Module({
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
  exports: [ServiceTypesService],
})
export class ServiceTypesModule {}
