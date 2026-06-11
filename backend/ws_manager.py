import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        sockets = self.connections.get(user_id)
        if sockets:
            sockets.discard(websocket)
            if not sockets:
                self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict):
        for ws in list(self.connections.get(user_id, [])):
            try:
                await ws.send_json(event)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, user_ids: list[str], event: dict):
        for user_id in user_ids:
            await self.send_to_user(user_id, event)


manager = ConnectionManager()
