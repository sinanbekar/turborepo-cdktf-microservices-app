import os
import sys
from typing import Optional

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

if 'LAMBDA_TASK_ROOT' in os.environ:
    sys.path.append(os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'python'))
    sys.path.append(os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'src'))

from kombu import Producer, Connection
import csv_to_pdf_microservice as service

connection: Optional[Connection] = None
channel = None
producer: Optional[Producer] = None

def lambda_handler(event, context):
    logger.info('## ENVIRONMENT VARIABLES')
    logger.info(os.environ)
    logger.info('## EVENT')
    logger.info(event)

    global connection, channel, producer
    if connection is None or channel is None or producer is None:
        connection = Connection(os.getenv("RABBITMQ_HOST", "amqp://"),
            userid=os.getenv("RABBITMQ_USER"), password=os.getenv("RABBITMQ_PASSWORD"), ssl=True)
        channel = connection.channel()
        producer = Producer(channel)
        if connection and channel and producer:
            logger.info("Reconnected to RabbitMQ")
    else:
        logger.info("Using cached connection")
    
    if 'rmqMessagesByQueue' not in event:
        return {
            'statusCode': 404
        }
        
    for queue in event["rmqMessagesByQueue"]:
        for message in event['rmqMessagesByQueue'][queue]:
            reply_data = service.handle_message(message)
            service.reply_message(producer, message, reply_data)
    return {
            'statusCode': 200
        }