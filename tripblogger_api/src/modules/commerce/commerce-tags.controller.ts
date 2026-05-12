import { Controller, Get, Query } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('commerce/tags')
export class CommerceTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  search(@Query('search') search?: string) {
    return this.tagsService.search(search);
  }
}
