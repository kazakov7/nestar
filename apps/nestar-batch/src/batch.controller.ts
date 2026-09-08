import { Controller, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Cron, Timeout } from '@nestjs/schedule';
import { BATCH_ROLLBACK, BATCH_TOP_PROPERTIES, BATCH_TOP_AGENTS } from './libs/config';

@Controller()
export class BatchController {
	constructor(private readonly batchService: BatchService) {}
	private logger: Logger = new Logger('BatchController');

	@Timeout(1000)
	handleTimeout() {
		this.logger.debug('BATCH SERVER READY!');
	}

	@Cron('00 00 01 * * *', { name: BATCH_ROLLBACK })
	public async batchRollback() {
		try {
			this.logger['context'] = BATCH_ROLLBACK;
			this.logger.debug('EXECUTED!');
			console.log('hi');

			await this.batchService.batchRollback();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('20 00 01 * * *', { name: BATCH_TOP_PROPERTIES })
	public async batchTopProperties() {
		try {
			this.logger['context'] = BATCH_TOP_PROPERTIES;
			this.logger.debug('EXECUTED!');

			await this.batchService.batchTopProperties();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('40 00 01 * * *', { name: BATCH_TOP_AGENTS })
	public async batchTopAgents() {
		try {
			this.logger['context'] = BATCH_TOP_AGENTS;
			this.logger.debug('EXECUTED!');

			await this.batchService.batchTopAgents();
		} catch (err) {
			this.logger.error(err);
		}
	}
}
