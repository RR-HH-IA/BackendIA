import { IsString, Length } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @Length(1, 120)
  name: string;
}
