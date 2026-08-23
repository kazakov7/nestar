import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import {
	AgentsInquiry,
	LoginInput,
	MemberInput,
} from '../../libs/dto/member/member.input';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';
import { T } from '../../libs/types/common';
import { ViewService } from '../view/view.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { Direction } from '../../libs/enums/comment.enum';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member')
		private readonly memberModel: Model<Member>,
		private authService: AuthService,
		private viewService: ViewService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		input.memberPassword = await this.authService.hashPassword(input.memberPassword);
		try {
			const result = await this.memberModel.create(input);
			result.accessToken = await this.authService.createToken(result);
			return result;
		} catch (err) {
			// @ts-ignore
			console.log('Error, Service.model', err.message);
			throw new BadRequestException(Message.USED_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { memberNick, memberPassword } = input;
		const response = await this.memberModel
			.findOne({ memberNick: memberNick })
			.select('+memberPassword')
			.exec();

		if (!response || response.memberStatus === MemberStatus.DELETE) {
			throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		} else if (response.memberStatus === MemberStatus.BLOCK) {
			throw new InternalServerErrorException(Message.BLOCKED_USER);
		}

		if (!response.memberPassword) {
			throw new InternalServerErrorException(Message.WRONG_PASSWORD);
		}

		const isMatch = await this.authService.comparePasswords(
			input.memberPassword,
			response.memberPassword,
		);
		if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

		response.accessToken = await this.authService.createToken(response);

		return response;
	}

	public async updateMember(memberId, input): Promise<Member> {
		const result = await this.memberModel
			.findOneAndUpdate(
				{
					_id: memberId,
					memberStatus: MemberStatus.ACTIVE,
				},
				input,
				{ new: true },
			)
			.exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}
	public async getMember(
		memberId: Types.ObjectId,
		targetId: Types.ObjectId,
	): Promise<Member> {
		const search: T = {
			_id: targetId,
			memberStatus: {
				$in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
			},
		};
		const result = await this.memberModel.findOne(search).lean().exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = {
				memberId: memberId,
				viewRefId: targetId,
				viewGroup: ViewGroup.MEMBER,
			};

			const newView = await this.viewService.recordView(viewInput);

			if (newView) {
				await this.memberModel
					.findOneAndUpdate(search, { $inc: { memberViews: 1 } }, { new: true })
					.exec();

				result.memberViews++;
			}
		}

		return result;
	}

	public async getAgents(
		memberId: Types.ObjectId,
		input: AgentsInquiry,
	): Promise<Members> {
		const { text } = input.search;

		const match: T = {
			memberType: MemberType.AGENT,
			memberStatus: MemberStatus.ACTIVE,
		};

		const sort: T = {
			[input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
		};

		if (text)
			match.memberNick = {
				$regex: new RegExp(text, 'i'),
			};

		console.log('match:', match);

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{
								$skip: (input.page - 1) * input.limit,
							},
							{
								$limit: input.limit,
							},
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		console.log('result:', result);

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}
}
