import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryCommentsDto, QueryMinePostsDto } from './dto/query-posts.dto';
import { ToggleReactionDto } from './dto/reaction.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('reaction-types')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listReactionTypes() {
    return this.postsService.listReactionTypes();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  findMine(@Req() req: { user: { sub: string } }, @Query() query: QueryMinePostsDto) {
    return this.postsService.findMine(req.user.sub, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  findOne(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  update(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(req.user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  remove(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.softDeletePost(req.user.sub, id);
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  toggleReaction(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.postsService.togglePostReaction(req.user.sub, id, dto.typeId);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  share(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.sharePost(req.user.sub, id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  addComment(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(req.user.sub, id, dto);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listComments(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryCommentsDto,
  ) {
    return this.postsService.listComments(id, req.user.sub, query);
  }

  @Post(':postId/comments/:commentId/reactions')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  toggleCommentReaction(
    @Req() req: { user: { sub: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.postsService.toggleCommentReaction(req.user.sub, postId, commentId, dto.typeId);
  }
}
