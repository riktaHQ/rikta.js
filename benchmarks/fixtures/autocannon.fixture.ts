import 'reflect-metadata';
import { Injectable } from '../../src/core/decorators/injectable.decorator';
import { Controller } from '../../src/core/decorators/controller.decorator';
import { Get, Post } from '../../src/core/decorators/route.decorator';
import { Autowired } from '../../src/core/decorators/autowired.decorator';
import { Body } from '../../src/core/decorators/param.decorator';

interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class AutocannonDataService {
  private data: User[] = [];

  getAll(): User[] {
    return this.data;
  }

  getById(id: string): User | null {
    return this.data.find(u => u.id === id) || null;
  }

  create(user: Omit<User, 'id'>): User {
    const newUser = { id: Date.now().toString(), ...user };
    this.data.push(newUser);
    return newUser;
  }

  clear() {
    this.data = [];
  }
}

@Controller('/api')
export class AutocannonApiController {
  constructor(
    @Autowired(AutocannonDataService) private dataService: AutocannonDataService
  ) {}

  @Get('/users')
  getAll() {
    return this.dataService.getAll();
  }

  @Get('/users/:id')
  getById(params: any) {
    const user = this.dataService.getById(params.id);
    return user || { error: 'Not found' };
  }

  @Post('/users')
  create(@Body() body: any) {
    return this.dataService.create(body);
  }

  @Get('/health')
  health() {
    return { status: 'ok', timestamp: Date.now() };
  }
}
