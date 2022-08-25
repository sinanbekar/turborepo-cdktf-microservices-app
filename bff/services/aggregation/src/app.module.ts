import { Module } from '@nestjs/common';
import { CsvToPdfModule } from './csv2pdf/csv2pdf.module';

@Module({
  imports: [CsvToPdfModule],
})
export class AppModule {}
