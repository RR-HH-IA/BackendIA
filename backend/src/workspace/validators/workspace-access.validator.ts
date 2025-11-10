import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceAccessValidator {
  constructor(private prisma: PrismaService) {}

  async assertMember(workspaceId: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    // Owner siempre puede
    if (ws.ownerId === userId) return true;

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!member) {
      throw new ForbiddenException('No perteneces a este workspace');
    }

    return true;
  }
}
