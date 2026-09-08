import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Server } from 'ws';

@WebSocketGateway()
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketAvantisGateway');
	private summaryClient: number = 0;

	afterInit(server: Server) {
		return this.logger.log(`Websocket server initialized total: ${this.summaryClient}`);
	}

	handleConnection(client: any, ...args: any[]) {
		this.summaryClient++;
		console.log(`Client connected total: ${this.summaryClient}`);
	}

	handleDisonnect(client: WebSocket) {
		this.summaryClient--;
		console.log(`Client disconnected total: ${this.summaryClient}`);
	}

	@SubscribeMessage('message')
	handleMessage(client: any, payload: any): string {
		return 'Hello world!';
	}
}
