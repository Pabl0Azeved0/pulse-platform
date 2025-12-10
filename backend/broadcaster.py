import asyncio
from typing import List, Any

class PulseBroadcaster:
    def __init__(self):
        # A list of active connections (queues)
        self.subscribers: List[asyncio.Queue] = []

    async def subscribe(self):
        """Creates a new queue for a connecting user"""
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        try:
            while True:
                # Yield messages as they arrive
                yield await queue.get()
        except asyncio.CancelledError:
            # Clean up when user disconnects
            self.subscribers.remove(queue)

    async def publish(self, message: Any):
        """Sends a message to all active queues"""
        for queue in self.subscribers:
            await queue.put(message)

# Create a single global instance
broadcaster = PulseBroadcaster()
