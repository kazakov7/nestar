import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PropertyService } from './property.service';
import { UseGuards } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { Properties, Property } from '../../libs/dto/property/property';
import {
	AgentPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '../../libs/dto/property/property.input';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Types } from 'mongoose';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import { Member } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class PropertyResolver {
	constructor(private readonly propertyService: PropertyService) {}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async createProperty(
		@Args('input') input: PropertyInput,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Property> {
		console.log('Mutation: createProperty');
		input.memberId = memberId;

		return await this.propertyService.createProperty(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Property)
	public async getProperty(
		@Args('propertyId') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Property> {
		console.log('Query: getProperty');

		const propertyId = shapeIntoMongoObjectId(input);

		return await this.propertyService.getProperty(memberId, propertyId);
	}
	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async updateProperty(
		@Args('input') input: PropertyUpdate,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Property> {
		console.log('Mutation: updateProperty');

		input._id = shapeIntoMongoObjectId(input._id);

		return await this.propertyService.updateProperty(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query((returns) => Properties)
	public async getProperties(
		@Args('input') input: PropertiesInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getProperties');
		return await this.propertyService.getProperties(memberId, input);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query((returns) => Properties)
	public async getAgentProperties(
		@Args('input') input: AgentPropertiesInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getAgentProperties');
		return await this.propertyService.getAgentProperties(memberId, input);
	}
	@UseGuards(AuthGuard)
	@Mutation(() => Property)
	public async likeTargetProperty(
		@Args('propertyId') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Property> {
		console.log('mutation, likeTargetMember');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.propertyService.likeTargetProperty(memberId, likeRefId);
	}
	// ADMIN

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query((returns) => Properties)
	public async getAllPropertiesByAdmin(
		@Args('input') input: AllPropertiesInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Properties> {
		console.log('query: getAllPropertiesByAdmin');
		return await this.propertyService.getAllPropertiesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async updatePropertyByAdmin(
		@Args('input') input: PropertyUpdate,
	): Promise<Property> {
		console.log('Mutation: updatePropertyByAdmin');

		input._id = shapeIntoMongoObjectId(input._id);

		return await this.propertyService.updatePropertyByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async removePropertyByAdmin(
		@Args('propertyId') input: string,
	): Promise<Property> {
		console.log('Mutation: removePropertyByAdmin');

		const propertyId = shapeIntoMongoObjectId(input);

		return await this.propertyService.removePropertyByAdmin(propertyId);
	}
}
