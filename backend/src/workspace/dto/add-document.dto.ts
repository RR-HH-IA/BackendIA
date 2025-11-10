import { IsString } from 'class-validator';

export class AddDocumentDto {
  @IsString()
  filename: string;         
  @IsString()
  collectionName: string;  
}
