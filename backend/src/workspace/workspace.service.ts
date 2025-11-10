import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { randomUUID } from 'crypto';
import { WorkspaceAccessValidator } from './validators/workspace-access.validator';
import { WorkspaceOwnerValidator } from './validators/workspace-owner.validator';
@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private access: WorkspaceAccessValidator,
    private ownerAccess: WorkspaceOwnerValidator,
  ) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    // Se genera un código simple para compartir el workspace
    const code = randomUUID().split('-')[0];

    return await this.prisma.workspace.create({
      data: {
        code,
        name: dto.name,
        ownerId: userId,
      },
    });
  }

  async listWorkspaces(userId: string) {
    // Lista solo los workspaces donde el usuario es dueño
    return this.prisma.workspace.findMany({
      where: { ownerId: userId },
      include: { documents: true },
    });
  }

  async listJoinedWorkspaces(userId: string) {
    // Busca los workspaces donde el usuario es miembro
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { include: { documents: true } } },
    });

    // Devolver solo los workspaces
    return memberships.map((m) => m.workspace);
  }

  async getWorkspaceById(id: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!ws) throw new NotFoundException('Workspace not found');

    await this.access.assertMember(id, userId);

    return ws;
  }

  async joinWorkspace(userId: string, code: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { code } });
    if (!ws) throw new NotFoundException('Workspace not found');

    await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: ws.id,
          userId,
        },
      },
      update: {},
      create: {
        workspaceId: ws.id,
        userId,
      },
    });

    return ws;
  }

  async addDocument(workspaceId: string, dto: AddDocumentDto, userId: string) {
    // Validar owner
    await this.ownerAccess.assertOwner(workspaceId, userId);

    // Validar que no exista collectionName repetida
    const exists = await this.prisma.document.findFirst({
      where: { workspaceId, collectionName: dto.collectionName },
    });
    if (exists) {
      throw new ForbiddenException(
        `collectionName '${dto.collectionName}' ya existe dentro de este workspace`,
      );
    }

    return await this.prisma.document.create({
      data: {
        filename: dto.filename,
        collectionName: dto.collectionName,
        workspaceId,
      },
    });
  }

  async removeDocument(workspaceId: string, docId: string, userId: string) {
    // Solo owner puede eliminar documentos
    await this.ownerAccess.assertOwner(workspaceId, userId);

    await this.prisma.document.deleteMany({
      where: { id: docId, workspaceId },
    });

    return { deleted: true };
  }

  async listDocuments(workspaceId: string, userId: string) {
    // Si querés que solo owner vea los documentos:
    await this.access.assertMember(workspaceId, userId);

    return this.prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!ws) throw new NotFoundException('El Workspace no existe');

    // Solo el dueño puede borrar
    if (ws.ownerId !== userId) {
      throw new ForbiddenException('Solo el dueño puede borrar el workspace');
    }

    await this.prisma.document.deleteMany({ where: { workspaceId } });
    await this.prisma.workspace.delete({ where: { id: workspaceId } });

    return { deleted: true };
  }

  async validateCollection(workspaceId: string, collectionName: string) {
    const doc = await this.prisma.document.findFirst({
      where: { workspaceId, collectionName },
    });

    if (!doc) {
      throw new NotFoundException(
        `No existe documento con collectionName=${collectionName} en este workspace`,
      );
    }

    return doc;
  }
}
