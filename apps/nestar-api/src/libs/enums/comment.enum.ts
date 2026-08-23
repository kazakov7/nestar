import { registerEnumType } from '@nestjs/graphql';

export enum CommentStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(CommentStatus, {
	name: 'CommentStatus',
});

export enum CommentGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
}
registerEnumType(CommentGroup, {
	name: 'CommentGroup',
});

export enum Direction {
	ASC = 1,
	DESC = -1,
}
registerEnumType(Direction, {
	name: 'Direction',
});
