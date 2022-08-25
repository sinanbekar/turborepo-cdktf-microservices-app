import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable, timeout } from 'rxjs';

@Injectable()
export class CsvToPdfService {
  constructor(
    @Inject('CSV_TO_PDF_SERVICE') private csvToPdfService: ClientProxy,
  ) {}

  process(
    processId: string,
    {
      csvBuffer,
    }: {
      csvBuffer: Buffer;
    },
  ): Observable<{
    success: boolean;
    pdfBuffer?: ArrayBuffer | null;
  }> {
    return this.csvToPdfService
      .send('', { processId, csvBuffer })
      .pipe(timeout(30000));
  }
}
