import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenants.module';
import { TaskerController } from './tasker.controller';
import { TaskerService } from './tasker.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [TaskerController],
  providers: [TaskerService],
  exports: [TaskerService],
})
export class TaskerModule {}
