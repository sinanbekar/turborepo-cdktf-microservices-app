from __future__ import annotations
import json
import logging
from typing import Any
import numpy as np
import tempfile
import base64
import os
import csv2pdf
from kombu import Message, Producer

def handle_message(message: Any | Message) -> dict[str, bool]:
    if isinstance(message, Message):
        message_data = json.loads(message.payload)['data']
    else:
        message_data = json.loads(base64.b64decode(message['data']))['data']

    csv_buffer = bytes(message_data['csvBuffer']['data'])
    csv_file = tempfile.NamedTemporaryFile(suffix='.csv')
    csv_file.write(csv_buffer)
    csv_file.seek(0)

    pdf_buffer = None
    pdf_file = tempfile.NamedTemporaryFile(suffix=".pdf")

    is_success = False
    try:
        csv2pdf.convert(csv_file.name, pdf_file.name)
        pdf_file.seek(0)
        is_success = os.stat(pdf_file.name).st_size != 0
    except Exception:
        logging.exception('CsvToPdf')

    if is_success:
        pdf_buffer = np.fromfile(pdf_file.name, dtype=np.uint8).tolist()

    csv_file.close()
    pdf_file.close()
                
    return {"success": is_success, "pdfBuffer": pdf_buffer}

def reply_message(producer: Producer, message: Any | Message, reply_data: Any) -> None:
    if reply_data:
        if isinstance(message, Message):
            reply_to: str = message.properties['reply_to']
            correlatin_id: str = message.properties['correlation_id']
        else:
            reply_to = message['basicProperties']['replyTo']
            correlatin_id = message['basicProperties']['correlationId']

        producer.publish(reply_data,
                exchange='', routing_key=reply_to,
                correlation_id=correlatin_id,
                serializer='json',
                retry=True,
                )
