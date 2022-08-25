import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CsvToPdfController } from './csv2pdf.controller';
import { CsvToPdfService } from './csv2pdf.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'CSV_TO_PDF_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const user = configService.get('RABBITMQ_USER');
          const password = configService.get('RABBITMQ_PASSWORD');
          const host = configService.get<string>(
            'RABBITMQ_HOST',
            'amqp://localhost:5672',
          );
          const connectionUrl = new URL(host);
          if (user && password) {
            connectionUrl.username = user;
            connectionUrl.password = password;
          }
          const queueName = configService.get('RABBITMQ_QUEUE_NAME');
          return {
            transport: Transport.RMQ,
            options: {
              urls: [connectionUrl.toString()],
              queue: queueName ?? 'csv2pdf',
              queueOptions: {
                durable: false,
                messageTtl: 30000,
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CsvToPdfController],
  providers: [CsvToPdfService],
})
export class CsvToPdfModule {}
