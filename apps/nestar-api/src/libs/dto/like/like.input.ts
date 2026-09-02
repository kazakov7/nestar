import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { ObjectId, Types } from 'mongoose';
import { LikeGroup } from '../../enums/like.enum';

@InputType()
export class LikeInput {
	@IsNotEmpty()
	@Field(() => String)
	memberId: Types.ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	likeRefId: Types.ObjectId;

	@IsNotEmpty()
	@Field(() => LikeGroup)
	likeGroup: LikeGroup;
}
