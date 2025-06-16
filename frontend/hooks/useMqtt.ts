import { useState, useEffect, useCallback } from 'react';
import { mqttClient } from '@/lib/mqttClient';

interface UseMqttOptions {
  topic: string;
  initialValue?: any;
}

export function useMqtt<T>({ topic, initialValue }: UseMqttOptions) {
  const [data, setData] = useState<T | null>(initialValue || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleMessage = useCallback((message: string) => {
    try {
      const parsedData = JSON.parse(message);
      setData(parsedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to parse MQTT message'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mqttClient.subscribe(topic, handleMessage);

    return () => {
      mqttClient.unsubscribe(topic, handleMessage);
    };
  }, [topic, handleMessage]);

  const publish = useCallback((message: any) => {
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      mqttClient.publish(topic, messageString);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to publish MQTT message'));
    }
  }, [topic]);

  return { data, error, isLoading, publish };
} 