import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ObjectId, Types } from 'mongoose';
import { BoardArticleService } from '../board-article/board-article.service';
import { PropertyService } from '../property/property.service';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { CommentGroup, CommentStatus, Direction } from '../../libs/enums/comment.enum';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { lookupMember } from '../../libs/config';
import { T } from '../../libs/types/common';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment')
		private readonly commentModel: Model<Comment>,
		private memberService: MemberService,
		private boardArticleService: BoardArticleService,
		private propertyService: PropertyService,
	) {}

	public async createComment(
		memberId: Types.ObjectId,
		input: CommentInput,
	): Promise<Comment> {
		input.memberId = memberId;

		let result: Comment | null;
		try {
			result = await this.commentModel.create(input);
		} catch (err) {
			if (err instanceof Error) {
				console.log('Error, Service.model:', err.message);
			}
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		switch (input.commentGroup) {
			case CommentGroup.PROPERTY:
				await this.propertyService.propertyStatsEditor({
					_id: input.commentRefId,
					targetKey: 'propertyComments',
					modifier: 1,
				});
				break;

			case CommentGroup.ARTICLE:
				await this.boardArticleService.boardArticleStatsEditor({
					_id: input.commentRefId,
					targetKey: 'articleComments',
					modifier: 1,
				});
				break;

			case CommentGroup.MEMBER:
				await this.memberService.memberStatusEditor({
					_id: input.commentRefId,
					targetKey: 'memberComments',
					modifier: 1,
				});
				break;
		}

		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);

		return result as unknown as Comment;
	}

	public async updateComment(
		memberId: Types.ObjectId,
		input: CommentUpdate,
	): Promise<Comment> {
		const { _id } = input;

		const result = await this.commentModel.findOneAndUpdate(
			{
				_id: _id,
				memberId: memberId,
				commentStatus: CommentStatus.ACTIVE,
			},
			input,
			{
				new: true,
			},
		);

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		return result;
	}

	public async getComments(
		memberId: Types.ObjectId,
		input: CommentsInquiry,
	): Promise<Comments> {
		const { commentRefId } = input.search;

		const match: T = {
			commentRefId: commentRefId,
			commentStatus: CommentStatus.ACTIVE,
		};

		const sort: T = {
			[input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
		};

		const result: Comments[] = await this.commentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// mLiked
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) {
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		}

		return result[0];
	}
}
