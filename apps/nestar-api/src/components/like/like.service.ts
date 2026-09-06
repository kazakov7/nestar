import { BadRequestException, Injectable } from '@nestjs/common';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { InputType } from '@nestjs/graphql';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { OrdinaryInquery } from '../../libs/dto/property/property.input';
import { promises } from 'dns';
import { Properties } from '../../libs/dto/property/property';
import { LikeGroup } from '../../libs/enums/like.enum';
import { lookupFavorite } from '../../libs/config';

@Injectable()
export class LikeService {
	constructor(
		@InjectModel('Like')
		private readonly likeModel: Model<Like>,
	) {}

	public async toggleLike(input: LikeInput): Promise<number> {
		const search: T = {
				memberId: input.memberId,
				likeRefId: input.likeRefId,
			},
			exist = await this.likeModel.findOne(search).exec();
		let modifier = 1;

		if (exist) {
			await this.likeModel.findOneAndDelete(search).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create(input);
			} catch (err) {
				//@ts-ignore
				console.log('error', err.message);
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}

		return modifier;
	}

	public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
		const { memberId, likeRefId } = input;
		const result = await this.likeModel
			.findOne({ memberId: memberId, likeRefId: likeRefId })
			.exec();
		console.log(result);
		return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
	}

	public async getFavoriteProperties(
		memberId: Types.ObjectId,
		input: OrdinaryInquery,
	): Promise<Properties> {
		const { page, limit } = input;
		const match: T = { likeGroup: LikeGroup.PROPERTY, memberId: memberId };

		const data: T = await this.likeModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'properties',
						localField: 'likeRefId',
						foreignField: '_id',
						as: 'favoriteProperty',
					},
				},
				{ $unwind: '$favoriteProperty' },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupFavorite,
							{ $unwind: '$favoriteProperty.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Properties = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.favoriteProperty);

		return result;
	}
}
