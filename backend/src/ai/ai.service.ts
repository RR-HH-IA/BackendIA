import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AiService {
  private FASTAPI_URL = process.env.FASTAPI_URL;

  // Funcion que manda solicitud a /chat de FASTAPI
  async chat(workspaceCode: string, collectionName: string, question: string) {
    // Generamos el nombre de la colección con el prefijo del workspace
    const collection = `${workspaceCode}_${collectionName}`;

    const url = `${this.FASTAPI_URL}/chat/`; 
    const body = {
      input_user: question,       
      collection_name: collection 
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new InternalServerErrorException(`AI service error: ${res.status} ${text}`);
      }

      // Leemos la respuesta completa como texto
      const result = await res.text();

      return { answer: result };
    } catch (e) {
      throw new InternalServerErrorException(`Error al comunicarse con el AI service: ${e.message || e}`);
    }
  }
}
