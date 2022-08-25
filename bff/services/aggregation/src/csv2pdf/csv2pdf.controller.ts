import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
  StreamableFile,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { CsvToPdfService } from './csv2pdf.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import type { Request } from 'express';
import slugify from 'slugify';
import { getCurrentInvoke } from '@vendia/serverless-express';
import { getCsvToPdfServiceUrl } from '../helpers';

// create upload and output path if not exists for csv to pdf conversion
// only runs when booting
const uploadPath = `${tmpdir()}/csv2pdf-microservice-csv-files`;
const outputPath = `${tmpdir()}/csv2pdf-microservice-pdf-files`;
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

@Controller({
  path: 'csv2pdf',
})
export class CsvToPdfController {
  constructor(private readonly csvToPdfService: CsvToPdfService) {}
  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  async process(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'text/csv',
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1000, // 10KB
        })
        .build({
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    const processId = randomUUID();

    // actually, in large production you should not
    // send and get a file from message queue systems
    // but we are doing this to minimize cloud cost
    // consider not doing this in active production
    // use shared file system between serverless functions
    // or use storage like s3
    const serviceResponse = await lastValueFrom(
      this.csvToPdfService.process(processId, {
        csvBuffer: file.buffer,
      }),
    );

    const isSuccess = serviceResponse.success;
    if (isSuccess) {
      const pdfBuffer = Buffer.from(serviceResponse.pdfBuffer);
      const pdfFile = path.resolve(outputPath, `${processId}.pdf`);
      fs.writeFileSync(pdfFile, pdfBuffer, 'binary');
    }

    return {
      success: isSuccess,
      downloadUrl: isSuccess
        ? new URL(
            `download/${processId}/${slugify(
              path.parse(file.originalname).name, // uploaded file name
            )}.pdf`,
            getCsvToPdfServiceUrl(req, getCurrentInvoke().event ?? {}),
          )
        : null,
    };
  }

  @Get('download/:id/:name.pdf')
  getPdf(@Param() params: { id: string; name: string }) {
    const id = params.id;
    const name = params.name;

    const pdfFile = path.resolve(outputPath, `${id}.pdf`);
    if (!fs.existsSync(pdfFile)) throw new NotFoundException();

    // AWS Lambda with api gateway does not support streaming file
    // but @vendia/serverless-express waits until stream complete and
    // returns to client, we are working with less than 100 KB files
    // so it is not a problem to read into the memory
    const file = fs.createReadStream(pdfFile);
    const fileStats = fs.statSync(pdfFile);
    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: `attachment; filename=converted_${name.replace(
        '-',
        '_',
      )}-${id.split('-').pop()}.pdf`,
      length: fileStats.size,
    });
  }
}
