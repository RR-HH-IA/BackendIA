import { IsString } from 'class-validator';

export class ChatWorkspaceDto {
  @IsString()
  collectionName: string;

  @IsString()
  question: string;
}
