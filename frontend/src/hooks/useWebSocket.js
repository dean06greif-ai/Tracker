import { useEffect, useRef } from "react";
import { wsUrl } from "../lib/api";
import { toast } from "sonner";

/**
 * Custom Hook für WebSocket Connection Management
 * FIX: Alle Dependencies korrekt hinzugefügt, onMessage mit useRef stabilisiert
 */
export function useWebSocket({ user, onMessage, enabled = true }) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!user || !enabled) return;

    let ws = null;
    let reconnectTimer = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl());
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            onMessageRef.current(msg);
          } catch (error) {
            console.error("WebSocket message parse error:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket closed, reconnecting in 3s...");
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          try {
            if (ws) ws.close();
          } catch (closeError) {
            console.error("Error closing WebSocket:", closeError);
          }
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
        toast.error("Verbindung fehlgeschlagen", { duration: 2500 });
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        try {
          ws.close();
        } catch (error) {
          console.error("Error during WebSocket cleanup:", error);
        }
      }
    };
  }, [user, enabled]);

  return wsRef;
}