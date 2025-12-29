import { Injectable, Controller, Get, Post, Body, Param, Module } from '@nestjs/common';

interface CreateUserDto {
  name: string;
  email: string;
}

@Injectable()
export class NestRequestUserService {
  private users: any[] = [];

  getAll() {
    return this.users;
  }

  getById(id: string) {
    return this.users.find(u => u.id === id) || null;
  }

  create(data: CreateUserDto) {
    const user = { id: Date.now().toString(), ...data };
    this.users.push(user);
    return user;
  }

  clear() {
    this.users = [];
  }
}

@Controller('api/users')
export class NestRequestUserController {
  constructor(private readonly userService: NestRequestUserService) {}

  @Get()
  getAll() {
    return this.userService.getAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }
}

@Module({
  controllers: [NestRequestUserController],
  providers: [NestRequestUserService],
})
export class NestRequestUserModule {}
