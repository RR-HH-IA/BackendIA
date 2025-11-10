import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WorkspaceAccessValidator } from './validators/workspace-access.validator';
import { WorkspaceOwnerValidator } from './validators/workspace-owner.validator';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, PrismaService, AiService, WorkspaceAccessValidator, WorkspaceOwnerValidator],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
