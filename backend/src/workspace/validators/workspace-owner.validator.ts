import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceOwnerValidator {
  constructor(private prisma: PrismaService) {}

  async assertOwner(workspaceId: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!ws) {
      throw new NotFoundException('El Workspace no existe');
    }

    if (ws.ownerId !== userId) {
      throw new ForbiddenException('Solo el dueño del workspace puede realizar esta acción');
    }

    return true;
  }
}