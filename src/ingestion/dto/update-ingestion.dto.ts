import { PartialType } from '@nestjs/mapped-types';
import { CreateIngestionDto } from './create-ingestion.dto';

export class UpdateIngestionDto extends PartialType(CreateIngestionDto) {}
