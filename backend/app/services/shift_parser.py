import os
import json
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()

def parse_shift_image(image_bytes: bytes, month: int = 9, year: int = 2026):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(">>> [ERRORE]: GEMINI_API_KEY non trovata nel file .env!")
        return []
        
    genai.configure(api_key=api_key)
    
    # Lista prioritaria di modelli aggiornati e attivi sulla tua chiave
    models_to_try = [
        'models/gemini-3.6-flash',
        'gemini-3.6-flash',
        'models/gemini-3.5-flash',
        'models/gemini-flash-latest'
    ]
    
    image = Image.open(io.BytesIO(image_bytes))
    
    prompt = """
    Sei un sistema OCR per fogli turni ospedalieri.
    Analizza l'immagine e individua la riga del medico "ONOFRIO LUCIANO" (o "ONOFRIO L.").
    Estrai i turni per tutti i giorni del mese di Settembre 2026 per questo medico.

    Legenda codici:
    - MA = Mattina (07:30 - 14:00)
    - PO = Pomeriggio (14:00 - 20:00)
    - NO = Notte (20:00 - 08:00)
    - FF = Ferie (orari vuoti)
    - $ = Libero (orari vuoti)
    - MA+PO = Giornata (07:30 - 20:00)
    - PSP = Sala Operatoria (07:30 - 20:00)
    - GDG = Pronto Soccorso (07:30 - 14:00)

    Restituisci ESCLUSIVAMENTE un array JSON valido con tutti i giorni del mese, senza blocchi markdown o altro testo:
    [
      {"date": "2026-09-01", "shift_type": "Mattina", "code": "MA", "start_time": "07:30", "end_time": "14:00", "notes": ""},
      {"date": "2026-09-02", "shift_type": "Pomeriggio", "code": "PO", "start_time": "14:00", "end_time": "20:00", "notes": ""}
    ]
    """

    for model_name in models_to_try:
        try:
            print(f">>> TENTATIVO CON MODELLO: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt, image])
            raw_text = response.text.strip()
            
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
                
            data = json.loads(raw_text)
            shifts = []
            if isinstance(data, list):
                shifts = data
            elif isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        shifts = v
                        break
                        
            if len(shifts) > 0:
                print(f">>> SUCCESSO! Estratti {len(shifts)} turni con {model_name}")
                return shifts
        except Exception as e:
            print(f">>> Fallito {model_name}: {e}")
            continue

    print(">>> Nessun modello ha restituito turni validi.")
    return []
