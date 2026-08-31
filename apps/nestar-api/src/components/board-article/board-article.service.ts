import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';

@Injectable()
export class BoardArticleService {
	constructor(
		@InjectModel('BoardArticle')
		private readonly boardArticleModel: Model<null>,
		private memberService: MemberService,
		// private authService: AuthService,
		private viewService: ViewService,
	) {}
}
