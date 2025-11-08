import os
import tempfile
from fastapi import UploadFile

async def save_temp_file(file: UploadFile) -> str:
    """
    Guarda un UploadFile en un archivo temporal y devuelve la ruta.
    """
    try:
        # Usar NamedTemporaryFile para crear un archivo temporal seguro
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            # Escribir el contenido del archivo subido
            content = await file.read()
            temp_file.write(content)
            # Devolver la ruta al archivo temporal
            return temp_file.name
    except Exception as e:
        print(f"Error al guardar archivo temporal: {e}")
        return None
    finally:
        # Asegurarse de que el archivo se cierre si aún está abierto
        await file.close()


def cleanup_temp_file(path: str):
    """
    Elimina un archivo del sistema de archivos.
    """
    if path and os.path.exists(path):
        try:
            os.unlink(path)
        except Exception as e:
            print(f"Error al limpiar archivo temporal: {e}")