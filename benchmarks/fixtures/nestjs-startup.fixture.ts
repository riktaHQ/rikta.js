import { Injectable, Controller, Get, Module } from '@nestjs/common';

@Injectable()
export class NestStartupBenchService {
  getData() {
    return { message: 'Hello from service' };
  }
}

@Controller('bench')
export class NestStartupBenchController {
  constructor(private readonly service: NestStartupBenchService) {}

  @Get('hello')
  getHello() {
    return this.service.getData();
  }

  @Get('simple')
  getSimple() {
    return { message: 'Simple response' };
  }
}

@Module({
  controllers: [NestStartupBenchController],
  providers: [NestStartupBenchService],
})
export class NestStartupBenchModule {}
