'use client';

import { useState, useCallback } from 'react';
import { IoTMessage, DataPoint, PLCData } from '@/types/iot.types';

export const useRealtimeData = (bufferSize: number = 60) => {
  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);
  const [latestData, setLatestData] = useState<PLCData>({});
  const [messageCount, setMessageCount] = useState(0);

  const handleMessage = useCallback((message: IoTMessage) => {
    const dataPoint: DataPoint = {
      timestamp: Date.now(),
      temperatura: message.data.temperatura || 0,
      presion: message.data.presion || 0,
      consumo_kw: message.data.consumo_kw || 0,
      flujo: message.data.flujo || 0,
    };

    setDataBuffer(prev => {
      const newBuffer = [...prev, dataPoint];
      return newBuffer.slice(-bufferSize);
    });

    setLatestData(message.data);
    setMessageCount(prev => prev + 1);
  }, [bufferSize]);

  return {
    dataBuffer,
    latestData,
    messageCount,
    handleMessage,
  };
};