# osm_client.py
import asyncio
import logging
from datetime import datetime, timedelta
import time
from typing import List, Dict, Any, Optional
import httpx
import json
from pathlib import Path

import requests


class OSMClient:

    """Client per l'API di OpenSTAManager"""

    #Configurazione logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None, max_retries: int = 3, backoff_factor: float = 2.0, timeout: int = 120) -> Dict:
        """
        Effettua una richiesta HTTP asincrona all'API OSM.
        """
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'OSM-Integration/1.0'
        }

        url = f"{self.base_url}{endpoint}"

        for attempt in range(1, max_retries + 1):
            try:
                response = await self.client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                    timeout=timeout
                )

                self.logger.debug(f"{method} {url} - Status: {response.status_code}")

                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    self.logger.warning(f"Rate limit raggiunto. Riprova tra {retry_after} secondi")
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json() if response.content else {}

            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                self.logger.warning(f"Tentativo {attempt} fallito: {e}")
                if attempt < max_retries:
                    sleep_time = backoff_factor ** (attempt - 1)
                    self.logger.info(f"Riprovo tra {sleep_time} secondi...")
                    await asyncio.sleep(sleep_time)
                else:
                    self.logger.error(f"Tutti i {max_retries} tentativi falliti.")
                    raise Exception(f"Richiesta API fallita dopo {max_retries} tentativi: {e}")


    async def get_interventi(self) -> List[Dict[str, Any]]:
        #Recupera tutti gli interventi dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'interventiall'
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            #Filtra solo per idtipointervento = 1, cioè gli ordini di consumabili
            interventi_filtrati = []
            records = data.get('records', {})

            for key, intervento in records.items():
                if intervento.get('idtipointervento') == 1 or intervento.get('idtipointervento') == 10 and intervento.get('idstatointervento') != 5:
                    # intervento.get('idstatointervento') != 5
                    interventi_filtrati.append(intervento)

            self.logger.info(f"Recuperati {len(interventi_filtrati)} interventi di tipo 1 (ordini consumabili)")
            self.logger.info(interventi_filtrati)
            return interventi_filtrati
        except Exception as e:
            self.logger.error(f"Errore nel recupero interventi: {e}")
            raise

    async def create_intervento(self, data_intervento: dict) -> dict:
        """
        Crea un nuovo intervento tramite l'API di OpenSTAManager.
        
        Args:
            data_intervento: Dizionario con i campi dell'intervento, es:
                {
                    "id_anagrafica": 501,
                    "id_tipo_intervento": 1,
                    "id_stato_intervento": 7,
                    "richiesta": "Richiesta di test",
                    "descrizione": "Descrizione di prova",
                    "data_richiesta": "2025-09-22 10:00:00",
                    "orario_inizio": "2025-09-22 10:00:00",
                    "orario_fine": "2025-09-22 11:00:00"
                }
        
        Returns:
            Dizionario con i dati dell'intervento creato, incluso l'ID.
        
        Raises:
            Exception se la creazione fallisce.
        """
        payload = {
            "token": self.token,
            "resource": "intervento",
            "data": data_intervento
        }

        try:
            result = await self._make_request('POST', '/api/', json_data=payload)

            if not result or 'id' not in result:
                self.logger.error(f"Creazione intervento fallita, risposta server: {result}")
                raise Exception("Creazione intervento fallita")

            self.logger.info(f"✅ Intervento creato: ID={result['id']}, Codice={result.get('codice')}")
            return result

        except Exception as e:
            self.logger.error(f"Errore nella creazione dell'intervento: {e}")
            raise

    async def get_impianto_by_matricola(self, matricola: str) -> List[Dict[str, Any]]:
        #Recupera tutti gli interventi dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'impianto_by_matricola',
            'matricola': matricola
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            records_dict = data.get('records', {})

            # Se esiste almeno un record, prende il primo valore
            records = list(records_dict.values())[0] if records_dict else None

            self.logger.info(f"Recuperato impianto {records}")
            #self.logger.info(interventi_filtrati)
            return records
        except Exception as e:
            self.logger.error(f"Errore nel recupero impianto: {e}")
            raise

    async def add_impianto_to_intervento(self, data_impianto: dict) -> Dict:
        """
        Aggiunge un impianto ad un intervento tramite l'API di OpenSTAManager.
        
        Args:
            data_intervento: Dizionario con i campi dell'impianto, es:
                {
                    "id_intervento": 501,
                    "impianti": 1,
                }
        
        Returns:
            Dizionario con i dati dell'impianto aggiunto all'intervento, incluso l'ID.
        
        Raises:
            Exception se la creazione fallisce.
        """
        # Assicuriamoci che 'impianti' sia una lista
        if isinstance(data_impianto.get("impianti"), int):
            data_impianto["impianti"] = [data_impianto["impianti"]]

        payload = {
            "token": self.token,
            "resource": "impianti_intervento",
            "data": data_impianto
        }

        try:
            result = await self._make_request('POST', '/api/', json_data=payload)

            if not result:
                self.logger.error(f"Aggiunta impianto ad intervento fallita, risposta server: {result}")
                raise Exception("Aggiunta impianto ad intervento fallita")

            self.logger.info(f"✅ Impianto aggiunto ad intervento creato: {result}")
            return result

        except Exception as e:
            self.logger.error(f"Errore nell'aggiunta impianto ad intervento: {e}")
            raise

    async def get_impianti_intervento(self, id_intervento_osm: int):
        #Recupera tutti gli interventi dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'impianti_intervento',
            'id_intervento': id_intervento_osm
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            records_dict = data.get('records', {})

            # Se esiste almeno un record, prende il primo valore
            records = list(records_dict.values())[0] if records_dict else None

            self.logger.info(f"Recuperato impianto {records}")
            #self.logger.info(interventi_filtrati)
            return records
        except Exception as e:
            self.logger.error(f"Errore nel recupero impianto: {e}")
            raise

    async def get_cliente_by_ragione_sociale(self, ragione_sociale: str) -> List[Dict[str, Any]]:
        #Recupera i clienti con filtro sulla ragione sociale dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'cliente-by-ragione-sociale',
            'ragione_sociale': ragione_sociale,
            'page': 0,
            'length': 20
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            records_dict = data.get('results', [])

            records = list(records_dict.values()) if records_dict else []

            self.logger.info(f"Recuperati clienti {records}")
            #self.logger.info(interventi_filtrati)
            return records
        except Exception as e:
            self.logger.error(f"Errore nel recupero cliente: {e}")
            raise

    async def get_impianto_by_id_anagrafica(self, id_anagrafica: int) -> List[Dict[str, Any]]:
        #Recupera gli impianti con filtro su idanagrafica dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'impianti_by_id_anagrafica',
            'idanagrafica': id_anagrafica
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            records = data.get("records", {})
            impianti = list(records.values()) if isinstance(records, dict) else records

            self.logger.info(f"Recuperati impianti {impianti}")
            #self.logger.info(interventi_filtrati)
            return impianti
        except Exception as e:
            self.logger.error(f"Errore nel recupero impianti: {e}")
            raise

    async def get_interventi_by_impianto(self, id_impianto: int):
        #Recupera gli interventi con filtro su id_impianti dall'API OSM
        params = {
            'token': self.token,
            'version': 'v1',
            'resource': 'interventiall',
            'id_impianti': id_impianto
        }

        try:
            data = await self._make_request('GET', '/api/', params=params)

            if data.get('status') != 200: 
                raise Exception(f"API Error: {data.get('message', 'Unknown error')}")
            
            records = data.get("records", {})

            #Filtra solo per idtipointervento = 1, cioè gli ordini di consumabili
            interventi_filtrati = []
            records = data.get('records', {})

            for key, intervento in records.items():
                if intervento.get('idtipointervento') == 1:
                    # intervento.get('idstatointervento') != 5
                    interventi_filtrati.append(intervento)

            self.logger.info(f"Recuperati {len(interventi_filtrati)} interventi di tipo 1 (ordini consumabili)")
            self.logger.info(interventi_filtrati)
            return interventi_filtrati
        except Exception as e:
            self.logger.error(f"Errore nel recupero impianti: {e}")
            raise
