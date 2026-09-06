import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Follower, Followers, Following, Followings } from '../../libs/dto/follow/follow';
import { AuthService } from '../auth/auth.service';
import { MemberService } from '../member/member.service';
import { Message } from '../../libs/enums/common.enum';
import { error } from 'console';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';
import { T } from '../../libs/types/common';
import { Direction } from '../../libs/enums/comment.enum';
import {
	lookUpAuthMemberFollowData,
	lookUpAuthMemberLiked,
	lookupFollowerData,
	lookupFollowingData,
} from '../../libs/config';

@Injectable()
export class FollowService {
	constructor(
		@InjectModel('Follow')
		private readonly followModel: Model<Follower | Following>,
		private memberService: MemberService,
	) {}

	public async subscribe(
		followerId: Types.ObjectId,
		followingId: Types.ObjectId,
	): Promise<Follower> {
		if (followerId.toString() === followingId.toString()) {
			throw new InternalServerErrorException(Message.SELF_SUBSCRIPTION_DENIED);
		}

		const targetMember = await this.memberService.getMember(null, followingId);
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const result = await this.registerSubscription(followerId, followingId);

		//error
		await this.memberService.memberStatusEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: 1,
		});
		await this.memberService.memberStatusEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: 1,
		});
		return result;
	}
	public async registerSubscription(
		followerid: Types.ObjectId,
		followingId: Types.ObjectId,
	): Promise<Follower> {
		try {
			return await this.followModel.create({
				followingId: followingId,
				followerId: followerid,
			});
		} catch (err) {
			console.log('error: registerSubscribe', err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async unsubscribe(
		followerId: Types.ObjectId,
		followingId: Types.ObjectId,
	): Promise<Follower> {
		const targetMember = await this.memberService.getMember(null, followingId);
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const result = await this.followModel.findOneAndDelete({
			followingId: followingId,
			followerId: followerId,
		});
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		//error
		await this.memberService.memberStatusEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: -1,
		});
		await this.memberService.memberStatusEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: -1,
		});
		return result;
	}

	public async getMemberFollowings(
		memberId: Types.ObjectId,
		input: FollowInquiry,
	): Promise<Followings> {
		const { page, limit, search } = input;
		if (!search?.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);
		const match: T = { followerId: search?.followerId };
		console.log('match:', match);

		const result = await this.followModel
			.aggregate([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookUpAuthMemberLiked(memberId, '$followingId'),
							lookUpAuthMemberFollowData({
								followerId: memberId,
								followingId: '$followingId',
							}),
							lookupFollowingData,
							{ $unwind: '$followingData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getMemberFollowers(
		memberId: Types.ObjectId,
		input: FollowInquiry,
	): Promise<Followers> {
		const { page, limit, search } = input;
		if (!search?.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		const match: T = { followingId: search?.followingId };
		console.log('match:', match);

		const result = await this.followModel
			.aggregate([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookUpAuthMemberLiked(memberId, '$followerId'),
							lookUpAuthMemberFollowData({
								followerId: memberId,
								followingId: '$followerId',
							}),
							lookupFollowerData,
							{ $unwind: '$followerData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}
}
