import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import {
	InternalServerErrorException,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import {
	AgentsInquiry,
	LoginInput,
	MemberInput,
	MembersInquiry,
} from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId, Types } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import {
	getSerialForImage,
	shapeIntoMongoObjectId,
	validMimeTypes,
} from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Message } from '../../libs/enums/common.enum';
@Resolver()
export class MemberResolver {
	constructor(private readonly memberService: MemberService) {}

	@Mutation(() => Member)
	public async signup(@Args('input') input: MemberInput): Promise<Member> {
		console.log('input', input);
		return this.memberService.signup(input);
	}
	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		console.log('Mutation: login', input);
		return this.memberService.login(input);
	}

	@UseGuards(AuthGuard)
	@Query(() => String)
	public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
		console.log('Query: checkAuth');
		console.log('memberNick:', memberNick);
		return `Hi ${memberNick}`;
	}

	@Roles(MemberType.USER, MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => String)
	public async checkAuthRoles(@AuthMember() member: Member): Promise<string> {
		console.log('Query: checkAuthRoles');
		return `Hi ${member.memberNick}. You are ${member.memberType}. (memberId:${member._id})`;
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		delete input._id;
		return this.memberService.updateMember(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(
		@Args('input') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		console.log('Query: getMember');

		const targetId = shapeIntoMongoObjectId(input);
		return this.memberService.getMember(memberId, targetId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(
		@Args('input') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		console.log('mutation, likeTargetMember');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(memberId, likeRefId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(
		@Args('input') input: AgentsInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Members> {
		console.log('Query: getAgents');

		return this.memberService.getAgents(memberId, input);
	}

	// ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(
		@Args('input') input: MembersInquiry,
	): Promise<Members> {
		return await this.memberService.getAllMembersByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
		console.log('Mutation: updateMemberByAdmin');

		return await this.memberService.updateMemberByAdmin(input);
	}
	// UPLODER
	@UseGuards(AuthGuard)
	@Mutation((returns) => String)
	public async imageUploader(
		@Args({ name: 'file', type: () => GraphQLUpload })
		{ createReadStream, filename, mimetype }: FileUpload,
		@Args('target') target: String,
	): Promise<string> {
		console.log('Mutation: imageUploader');

		if (!filename) throw new Error(Message.UPLOAD_FAILED);
		console.log('jkbfjberbf', mimetype);
		const validMime = validMimeTypes.includes(mimetype);
		if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

		const imageName = getSerialForImage(filename);
		const url = `uploads/${target}/${imageName}`;
		const stream = createReadStream();

		const result = await new Promise((resolve, reject) => {
			stream.on('error', reject);
			stream
				.pipe(createWriteStream(url))
				.on('finish', () => resolve(true))
				.on('error', reject);
		});
		if (!result) throw new Error(Message.UPLOAD_FAILED);

		return url;
	}

	@UseGuards(AuthGuard)
	@Mutation((returns) => [String])
	public async imagesUploader(
		@Args('files', { type: () => [GraphQLUpload] })
		files: Promise<FileUpload>[],
		@Args('target') target: String,
	): Promise<string[]> {
		console.log('Mutation: imagesUploader');

		const uploadedImages = [];
		const promisedList = files.map(
			async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
				try {
					const { filename, mimetype, encoding, createReadStream } = await img;

					const validMime = validMimeTypes.includes(mimetype);
					if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

					const imageName = getSerialForImage(filename);
					const url = `uploads/${target}/${imageName}`;
					const stream = createReadStream();

					const result = await new Promise((resolve, reject) => {
						stream
							.pipe(createWriteStream(url))
							.on('finish', () => resolve(true))
							.on('error', () => reject(false));
					});
					if (!result) throw new Error(Message.UPLOAD_FAILED);

					// @ts-ignore
					uploadedImages[index] = url;
				} catch (err) {
					console.log('Error, file missing!');
				}
			},
		);

		await Promise.all(promisedList);
		return uploadedImages;
	}
}
