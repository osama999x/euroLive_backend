import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const options = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password') || undefined,
      db: this.configService.get<number>('redis.db'),
      keyPrefix: undefined,
      maxRetriesPerRequest: 3,
    };

    const pubClient = new Redis(options);
    const subClient = pubClient.duplicate();

    await Promise.all([this.waitUntilReady(pubClient), this.waitUntilReady(subClient)]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.IO Redis adapter ready');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  private waitUntilReady(client: Redis): Promise<void> {
    if (client.status === 'ready') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      client.once('ready', () => resolve());
      client.once('error', reject);
    });
  }
}
