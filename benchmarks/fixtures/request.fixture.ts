import 'reflect-metadata';
import { Injectable } from '../../src/core/decorators/injectable.decorator';
import { Controller } from '../../src/core/decorators/controller.decorator';
import { Get, Post } from '../../src/core/decorators/route.decorator';
import { Autowired } from '../../src/core/decorators/autowired.decorator';
import { Body, Param } from '../../src/core/decorators/param.decorator';

interface CreateUserDto {
  name: string;
  email: string;
}

@Injectable()
export class RequestUserService {
  private users: any[] = [];

  getAll() {
    return this.users;
  }

  getById(id: string) {
    return { id, name: `User ${id}`, email: `user${id}@test.com` };
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

@Controller('/api/users')
export class RequestUserController {
  constructor(
    @Autowired(RequestUserService) private userService: RequestUserService
  ) {}

  @Get('/')
  getAll() {
    return this.userService.getAll();
  }

  @Get('/:id')
  getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Post('/')
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }
}
