import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { PropertyModule } from './property/property.module';
import { AuthModule } from './auth/auth.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { CommentModule } from './comment/comment.module';
import { FollowModule } from './follow/follow.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';

@Module({
	imports: [
		MemberModule,
		PropertyModule,
		AuthModule,
		BoardArticleModule,
		CommentModule,
		FollowModule,
		LikeModule,
		ViewModule,
	],
})
export class ComponentsModule {}
