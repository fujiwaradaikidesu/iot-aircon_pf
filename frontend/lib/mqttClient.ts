import mqtt, { MqttClient } from 'mqtt';

const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'wss://v604492f.ala.asia-southeast1.emqxsl.com:8084/mqtt';
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || 'user';
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || 'TBtDXZQPYbb2mzn';

class MQTTClient {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, ((message: string) => void)[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    this.client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: `web-client-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      rejectUnauthorized: true, // TLS/SSL証明書の検証を有効化
      protocol: 'wss', // WebSocket over TLS/SSLを使用
    });

    this.client.on('connect', () => {
      console.log('MQTT Connected');
      this.isConnected = true;
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      const handlers = this.messageHandlers.get(topic);
      if (handlers) {
        handlers.forEach(handler => handler(message.toString()));
      }
    });

    this.client.on('error', (error: Error) => {
      console.error('MQTT Error:', error);
    });

    this.client.on('close', () => {
      console.log('MQTT Disconnected');
      this.isConnected = false;
      // 再接続を試みる
      setTimeout(() => this.connect(), 5000);
    });
  }

  public publish(topic: string, message: string) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message);
    } else {
      console.error('MQTT client is not connected');
    }
  }

  public subscribe(topic: string, handler: (message: string) => void) {
    if (this.client && this.isConnected) {
      this.client.subscribe(topic);
      if (!this.messageHandlers.has(topic)) {
        this.messageHandlers.set(topic, []);
      }
      this.messageHandlers.get(topic)?.push(handler);
    }
  }

  public unsubscribe(topic: string, handler: (message: string) => void) {
    if (this.client && this.isConnected) {
      this.client.unsubscribe(topic);
      const handlers = this.messageHandlers.get(topic);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  public disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

export const mqttClient = new MQTTClient(); 