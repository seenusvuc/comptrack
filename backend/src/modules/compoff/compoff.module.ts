import { Module } from '@nestjs/common';

import { CompOffController } from './compoff.controller';
import { CompOffService } from './compoff.service';

@Module({
  controllers: [CompOffController],
  providers: [CompOffService],
})
export class CompOffModule {}
