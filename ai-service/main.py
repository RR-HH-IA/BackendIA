import os
import uvicorn
from fastapi import (
    FastAPI, 
    UploadFile, 
    File, 
    Form, 
    HTTPException
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Importamos las funciones de nuestros módulos
import rag_core
import utils

from fastapi.middleware.cors import CORSMiddleware

# --- Configuración de la App FastAPI ---
app = FastAPI(
    title="Asistente de Políticas de RRHH",
    description="Una API para chatear con las políticas de RRHH de la empresa usando RAG."
)

# --- Configuración de CORS ---
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de Pydantic ---
class QueryRequest(BaseModel):
    """Modelo de Pydantic para la solicitud de chat."""
    input_user: str
    collection_name: str = "rrhh_policies" # Default a la colección de RRHH


# --- Endpoints de la API ---

@app.post("/upload/")
async def upload_document(
    collection_name: str = Form("rrhh_policies"), 
    file: UploadFile = File(...)
):
    """
    Endpoint para subir un único archivo PDF.
    Normaliza el nombre de la colección reemplazando espacios por guiones bajos.
    """
    # Normalizar collection_name
    normalized_collection_name = collection_name.strip().replace(" ", "_")

    temp_file_path = None
    try:
        # Guardar el archivo subido en un archivo temporal
        temp_file_path = await utils.save_temp_file(file)
        
        # Procesar el PDF y guardarlo en el vector store
        chunks_added = await rag_core.process_and_store_pdf(
            file_path=temp_file_path,
            collection_name=normalized_collection_name
        )

        if chunks_added == 0:
            raise HTTPException(
                status_code=400,
                detail="No se pudo extraer texto del PDF."
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando {file.filename}: {str(e)}"
        )
    finally:
        # Limpiar el archivo temporal
        if temp_file_path:
            utils.cleanup_temp_file(temp_file_path)

    return {
        "message": f"Se agregaron {chunks_added} chunks del documento '{file.filename}' a la colección '{normalized_collection_name}'.",
        "file_processed": file.filename
    }
    
    
@app.post("/chat/")
async def chat_with_rag(request: QueryRequest):
    """
    Endpoint para chatear. Recibe una pregunta y el nombre de la colección,
    devuelve una respuesta en streaming.
    """
    try:
        
        normalized_collection_name = request.collection_name.strip().replace(" ", "_")
        
        # 1. Generar el stream de respuesta
        stream = rag_core.query_rag_stream(
            input_user=request.input_user, 
            collection_name=normalized_collection_name
        )
        
        # 2. Devolver StreamingResponse
        return StreamingResponse(stream, media_type="text/plain")

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error en el chat: {str(e)}"
        )

# --- Para ejecutar localmente ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)