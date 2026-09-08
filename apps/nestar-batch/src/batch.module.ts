import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import PropertySchema from '../../nestar-api/src/schemas/Property.model';
import MemberSchema from '../../nestar-api/src/schemas/Member.model';
@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot(),
		DatabaseModule,
		MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
	],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
