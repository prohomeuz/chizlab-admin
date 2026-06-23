import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisProvider } from '../common/redis.provider';
import { Admin } from './admin.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Admin]),
    PassportModule,
    JwtModule.register({}), // secrets are passed dynamically in AuthService
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisProvider],
  exports: [AuthService, JwtStrategy, RedisProvider],
})
export class AuthModule {}
