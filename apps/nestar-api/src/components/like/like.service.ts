import { BadRequestException, Injectable } from '@nestjs/common';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { InputType } from '@nestjs/graphql';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';

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
}
