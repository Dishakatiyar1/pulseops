import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WsContext = createContext(null);

export function WsProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const listeners = useRef({});
  const ws = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const url = `ws://localhost:5000/ws`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectTimer.current);
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents(prev => [{ ...data, _id: Date.now() + Math.random() }, ...prev].slice(0, 100));
        const handlers = listeners.current[data.type] || [];
        handlers.forEach(fn => fn(data));
        // also call wildcard listeners
        const wildcards = listeners.current['*'] || [];
        wildcards.forEach(fn => fn(data));
      } catch (_) {}
    };

    ws.current.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((type, fn) => {
    if (!listeners.current[type]) listeners.current[type] = [];
    listeners.current[type].push(fn);
    return () => {
      listeners.current[type] = listeners.current[type].filter(f => f !== fn);
    };
  }, []);

  return (
    <WsContext.Provider value={{ connected, events, subscribe }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs() {
  return useContext(WsContext);
}
