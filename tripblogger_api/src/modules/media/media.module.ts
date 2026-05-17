import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaEntity } from './entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MediaEntity])],
  exports: [TypeOrmModule],
})
export class MediaModule {}
