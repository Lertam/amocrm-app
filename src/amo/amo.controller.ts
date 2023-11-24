import { Controller, Get, Query, Req } from '@nestjs/common';
import { AmoService } from './amo.service';
import { Request } from 'express';

@Controller('amo')
export class AmoController {
  constructor(private amoService: AmoService) {}

  @Get()
  async start(
    @Query('name') name: string,
    @Query('email') email: string,
    @Query('phone') phone: string,
  ): Promise<{ contact: 'created' | 'existed'; salesFunnelId: number }> {
    let user = await this.amoService.findContact(email, phone);
    const contact = !!user ? 'existed' : 'created';
    if (user) {
      user = await this.amoService.updateContact(user.id, name, email, phone);
    } else {
      user = await this.amoService.createContact(name, email, phone);
    }

    const salesFunnelId = await this.amoService.createSale(user.id, user.name);

    return { contact, salesFunnelId };
  }

  @Get('callback')
  resultCallback(@Req() request: Request): string {
    console.log('callback request', request);
    return 'ok';
  }
}
