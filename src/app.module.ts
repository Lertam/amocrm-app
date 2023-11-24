import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AmoController } from './amo/amo.controller';
import { AmoService } from './amo/amo.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, AmoController],
  providers: [AppService, AmoService],
})
export class AppModule {}
