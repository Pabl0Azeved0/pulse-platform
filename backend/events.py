import os
from broadcaster import Broadcast

# Fetch the URL from Docker env, fallback to memory if missing (safety net)
BROADCAST_URL = os.environ.get("BROADCAST_URL", "memory://")

broadcaster = Broadcast(BROADCAST_URL)
