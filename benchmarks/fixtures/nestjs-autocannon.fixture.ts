import { Injectable, Controller, Get, Post, Body, Param, Module } from '@nestjs/common';

interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class NestAutocannonDataService {
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

@Controller('api')
export class NestAutocannonApiController {
  constructor(private readonly dataService: NestAutocannonDataService) {}

  @Get('users')
  getAll() {
    return this.dataService.getAll();
  }

  @Get('users/:id')
  getById(@Param('id') id: string) {
    const user = this.dataService.getById(id);
    return user || { error: 'Not found' };
  }

  @Post('users')
  create(@Body() body: any) {
    return this.dataService.create(body);
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: Date.now() };
  }
}

@Module({
  controllers: [NestAutocannonApiController],
  providers: [NestAutocannonDataService],
})
export class NestAutocannonModule {}
