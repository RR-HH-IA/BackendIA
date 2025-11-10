import os
from dotenv import load_dotenv

# --- Importaciones de Langchain (de tu notebook) ---
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

# --- Cargar variables de entorno ---
load_dotenv()
api_key = os.getenv("API_KEY")

if not api_key:
    raise ValueError("No se encontró la variable API_KEY en el archivo .env")

# --- Modelos y Plantillas Globales ---

# Embedding (Ollama)
embedding = OllamaEmbeddings(
    model = "embeddinggemma"
)

# LLM (Google) - Ajustado a un modelo común
llm = ChatGoogleGenerativeAI(
    api_key=api_key,
    model="gemini-2.0-flash", 
    temperature= 0.5 # Un poco más determinista para RRHH
)

# Prompt Template - Actualizado para el caso de uso de RRHH
prompt = PromptTemplate.from_template("""Tu rol es actuar como un **Asistente de Recursos Humanos (RR.HH.) experto, empático y orientado a la solución**. Tu objetivo principal es disminuir la carga de consultas repetitivas del área de RR.HH., proporcionando respuestas automáticas y consistentes con la política.

**Manejo de saludos o preguntas generales:**
- Si el usuario dice algo como "hola", "buen día", "qué tal", responde cordialmente, por ejemplo: "Hola, ¿cómo estás?" o "¡Hola! ¿En qué puedo ayudarte hoy?".

- Si el usuario pregunta "qué haces" o algo similar, responde con una frase general sobre tu rol, por ejemplo: "Estoy aquí para ayudarte con las políticas de RR.HH. y responder tus dudas basándome en los documentos internos de la empresa."


**Instrucciones Clave y Restricciones:**

1.  **Fuente Única de Información (Guardrail Crítico):** Debes responder **EXCLUSIVAMENTE** utilizando el contexto proporcionado por los documentos de políticas de la empresa (Reglamento Interno, Política de Vacaciones, Código de Conducta, etc.). **Bajo NINGUNA circunstancia** debes utilizar conocimiento previo, información general, sentido común, o datos que no provengan del contexto. Si dudas de la fuente, aplica la restricción de ausencia de datos.
2.  **Precisión y Referencia Obligatoria:** La información debe ser totalmente precisa y verificable en el contexto. **SIEMPRE** debes referenciar la fuente de forma concisa (ej: "Según la Política de Vacaciones, Sección 4.2" o "Reglamento Interno, Artículo 15").
3.  **Tono y Formato (Amigable y Proactivo):** Formatea tu respuesta de manera **profesional, acogedora y empática**. Utiliza **negritas** para destacar el dato clave o la cantidad. Evita el tono legalista o ambiguo. Ofrece siempre un "próximo paso" o información adicional relevante (siempre y cuando esté en el contexto) para ser más útil.
4.  **🚨 Gestión Estricta de Ausencia de Datos (Guardrail de Fallo):** Si la pregunta del usuario no tiene relación con RR.HH., o la respuesta no se encuentra en el contexto, o la información encontrada es ambigua/parcial, debes limitarte a decir **ÚNICAMENTE** el siguiente mensaje:

    **"Estimado(a), la información específica que buscas no se encuentra detallada en las políticas internas de RR.HH. a las que tengo acceso. Para una respuesta precisa, por favor, contacta directamente a tu área de Recursos Humanos."**

Contexto proporcionado:
{contexto}

Pregunta del empleado:
{input_user}
""")

# --- Funciones "Privadas" del Módulo ---

def _get_vector_store(name_collection: str) -> Chroma:
    """Obtiene o crea la instancia de la base de datos vectorial Chroma."""
    vector_store = Chroma(
        collection_name= name_collection,
        embedding_function=embedding,
        persist_directory="./vectorstore" # Persiste en disco
    )
    return vector_store

def _load_pdf_text(url: str) -> str:
    """Carga y extrae texto de un archivo PDF en la ruta especificada."""
    try:
        loader = PyPDFLoader(url)
        loader = loader.lazy_load()
        text = ""
        for page in loader:
            text += page.page_content + "\n"
        return text
    except Exception as e:
        print(f"Error al cargar PDF: {e}")
        return ""

def _split_text(text: str) -> list:
    """Divide el texto crudo en chunks."""
    text_splitter = CharacterTextSplitter(
        chunk_size = 2000,
        chunk_overlap = 100,
        separator="\n"
    )
    texts = text_splitter.create_documents([text])
    return texts

def _retrieval_docs(input_user: str, collection_name: str) -> list:
    """Realiza la búsqueda de similitud en la base de datos vectorial."""
    vector_store = _get_vector_store(collection_name)
    docs = vector_store.similarity_search(input_user)
    
    print(">>> DOCS ENCONTRADOS:", len(docs))
    print(">>> COLLECTION NAME:", collection_name)
    print(">>> INPUT USER:", input_user)

    return docs

def _generate_response_stream(input_user: str, contexto: str):
    """Generador que streamea la respuesta del LLM."""
    formatted_prompt = prompt.format(contexto=contexto, input_user=input_user)
    
    for chunk in llm.stream(formatted_prompt):
        yield chunk.content

# --- Funciones "Públicas" (para app.py) ---

async def process_and_store_pdf(file_path: str, collection_name: str) -> int:
    """
    Orquesta el procesamiento de un PDF y lo guarda en el Vector Store.
    Retorna el número de chunks añadidos.
    """
    # 1. Cargar el PDF
    text = _load_pdf_text(file_path)
    if not text:
        return 0

    # 2. Dividir el texto
    texts_chunks = _split_text(text)
    if not texts_chunks:
        return 0
        
    # 3. Guardar en el Vector Store
    vectorstore = _get_vector_store(collection_name)
    vectorstore.add_documents(texts_chunks)
    
    return len(texts_chunks)


def query_rag_stream(input_user: str, collection_name: str):
    """
    Orquesta la consulta al RAG y devuelve un generador (stream).
    """
    # 1. Retrieval
    docs = _retrieval_docs(input_user, collection_name)
    
    # 2. Formatear Contexto
    contexto = "\n\n---\n\n".join([doc.page_content for doc in docs])
    if not contexto:
        contexto = "No se encontró información relevante."
        
    # 3. Generar respuesta en streaming
    return _generate_response_stream(input_user=input_user, contexto=contexto)