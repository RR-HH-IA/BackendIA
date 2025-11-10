import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AiService } from '../ai/ai.service';
import { ChatWorkspaceDto } from './dto/chat-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';

@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly wsService: WorkspaceService,
    private readonly aiService: AiService,
  ) {}

  // Crear workspace
  @Post()
  async create(@Req() req, @Body() dto: CreateWorkspaceDto) {
    const userId = req.user.id;
    return this.wsService.createWorkspace(userId, dto);
  }

  // Lista workspaces donde el usuario es owner
  @Get('owner')
  async list(@Req() req) {
    const userId = req.user.id;
    return this.wsService.listWorkspaces(userId);
  }

  
// Listar los workspaces donde el usuario es member
@Get('member')
async listJoined(@Req() req) {
  // req.user.id viene del JwtGuard
  return this.wsService.listJoinedWorkspaces(req.user.id);
}

  // Obtener por id
  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.wsService.getWorkspaceById(id, userId);
  }

  // Obtener por code (para que invitado entre con código)
  @Get('code/:code')
  async getByCode(@Param('code') code: string) {
    return this.wsService.getWorkspaceByCode(code);
  }

  @Post('join')
  async join(@Req() req, @Body() dto: JoinWorkspaceDto) {
    const userId = req.user.id;
    return this.wsService.joinWorkspace(userId, dto.code);
  }

  // Agregar documento
  @Post(':id/documents')
  async addDocument(
    @Param('id') id: string,
    @Body() dto: AddDocumentDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.wsService.addDocument(id, dto, userId);
  }

  // Listar documentos
  @Get(':id/documents')
  async documents(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.wsService.listDocuments(id, userId);
  }

  // Eliminar documento
  @Delete(':id/documents/:docId')
  async deleteDoc(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.wsService.removeDocument(id, docId, userId);
  }

  // Eliminar workspace
  @Delete(':id')
  async deleteWs(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.wsService.deleteWorkspace(id, userId);
  }

  // El frontend pide a Nest que realice la consulta al AI-Service
  @Post(':id/chat')
  async chat(
    @Param('id') workspaceId: string,
    @Body() body: ChatWorkspaceDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    const workspace = await this.wsService.getWorkspaceById(
      workspaceId,
      userId,
    );

    await this.wsService.validateCollection(workspaceId, body.collectionName);

    const result = await this.aiService.chat(
      workspace.code,
      body.collectionName,
      body.question,
    );

    return result;
  }
}
