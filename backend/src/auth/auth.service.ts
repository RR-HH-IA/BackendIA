import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const userExist = await this.prisma.user.findUnique({ where: { email } });

    if (userExist) {
      throw new BadRequestException('Correo electronico ya registrado');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, password: hash },
    });

    return ({email, password})
  }

  async login(loginDto: LoginDto) {

    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Correo Invalido');
    }

    const correctPassword = await bcrypt.compare(password, user.password);

    if (!correctPassword) {
      throw new UnauthorizedException('Contraseña Invalida');
    }

    return this.sign(user.id, user.email);
  }

  private sign(id: string, email: string) {

    const token = this.jwt.sign({ id, email });

    return { token };
  }
}
