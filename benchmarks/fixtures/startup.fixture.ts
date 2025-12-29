import 'reflect-metadata';
import { Injectable } from '../../src/core/decorators/injectable.decorator';
import { Controller } from '../../src/core/decorators/controller.decorator';
import { Get } from '../../src/core/decorators/route.decorator';
import { Autowired } from '../../src/core/decorators/autowired.decorator';

@Injectable()
export class StartupBenchService {
  getData() {
    return { message: 'Hello from service' };
  }
}

@Controller('/bench')
export class StartupBenchController {
  constructor(
    @Autowired(StartupBenchService) private service: StartupBenchService
  ) {}

  @Get('/hello')
  getHello() {
    return this.service.getData();
  }

  @Get('/simple')
  getSimple() {
    return { message: 'Simple response' };
  }
}
