from __future__ import annotations
import sys
from kombu import Connection, Queue, Consumer, Message
from kombu.mixins import ConsumerProducerMixin
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
from . import service

conn = Connection("amqp://")
queue = Queue('csv2pdf', no_declare=True) # declared in bff

class Worker(ConsumerProducerMixin):
    def __init__(self, connection: Connection, queue: Queue) -> None:
        self.connection = connection
        self.queue = queue

    def get_consumers(self, Consumer: Consumer, _channel) -> list[Consumer]:
        return [Consumer(
            queues=[self.queue],
            on_message=self.on_request,
            accept={'application/json'},
            prefetch_count=1,
        )]

    def on_request(self, message: Message) -> None:
        logging.info(f"New message: {message}")
        reply_data = service.handle_message(message)
        service.reply_message(self.producer, message, reply_data)
        message.ack()

def start() -> None:
    logging.info('[x] Awaiting for requests')
    service = Worker(conn, queue)
    service.run()

if __name__ == '__main__':
    start()