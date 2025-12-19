
import mqtt from 'mqtt';
import { ConnectionConfig, MOTFrame, SourceType } from '../types';
import { LogParser } from './LogParser';

export class StreamService {
  private mqttClient: any = null;
  private wsClient: WebSocket | null = null;
  private onFrameCallback: (frame: MOTFrame | null, raw: string) => void = () => {};
  private onErrorCallback: (err: string) => void = () => {};

  connect(
    type: SourceType, 
    config: ConnectionConfig, 
    onMessage: (frame: MOTFrame | null, raw: string) => void,
    onError?: (err: string) => void
  ) {
    this.disconnect();
    this.onFrameCallback = onMessage;
    if (onError) this.onErrorCallback = onError;

    const isPageSecure = window.location.protocol === 'https:';

    try {
      if (type === 'MQTT') {
        // Respect the user's selected protocol
        let protocol = config.protocol || (isPageSecure ? 'wss://' : 'ws://');
        
        // Sanitize host: remove any manual protocol prefixes the user might have typed in the host field
        const host = config.url.trim().replace(/^(ws:\/\/|wss:\/\/|mqtt:\/\/|mqtts:\/\/)/, '');
        
        // Construct standard EMQX WebSocket URL with /mqtt path
        const brokerUrl = `${protocol}${host}${config.port ? `:${config.port}` : ''}/mqtt`;
        
        console.log(`[StreamService] Connecting to MQTT via WebSocket: ${brokerUrl}`);
        
        const options = {
          keepalive: 60,
          protocolId: 'MQTT' as 'MQTT',
          protocolVersion: 4 as 4,
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
          clientId: 'mot_web_' + Math.random().toString(16).substring(2, 10),
          username: config.username || undefined,
          password: config.password || undefined,
        };

        this.mqttClient = mqtt.connect(brokerUrl, options);

        this.mqttClient.on('connect', () => {
          console.log('[StreamService] MQTT Client Connected');
          if (config.topic) {
            this.mqttClient.subscribe(config.topic, { qos: 0 }, (error: any) => {
              if (error) {
                console.error('[StreamService] Subscription error:', error);
                this.onErrorCallback(`Subscription failed: ${error.message}`);
              } else {
                console.log(`[StreamService] Subscribed to topic: ${config.topic}`);
              }
            });
          }
        });

        this.mqttClient.on('message', (topic: string, payload: Uint8Array) => {
          try {
            const raw = new TextDecoder().decode(payload);
            const frame = this.parseMessage(raw);
            this.onFrameCallback(frame, raw);
          } catch (e) {
            console.error('[StreamService] Failed to decode or parse MQTT payload:', e);
          }
        });

        this.mqttClient.on('error', (err: any) => {
          const msg = err?.message || 'MQTT Connection Error';
          console.error('[StreamService] MQTT Error:', msg);
          this.onErrorCallback(msg);
          this.mqttClient.end();
        });

        this.mqttClient.on('reconnect', () => {
          console.log('[StreamService] Attempting to reconnect to broker...');
        });

        this.mqttClient.on('offline', () => {
          console.warn('[StreamService] MQTT client is offline');
        });
      } 
      else if (type === 'WEBSOCKET') {
        let protocol = config.protocol || (isPageSecure ? 'wss://' : 'ws://');
        const host = config.url.trim().replace(/^(ws:\/\/|wss:\/\/)/, '');
        const fullUrl = `${protocol}${host}${config.port ? `:${config.port}` : ''}`;
        
        console.log(`[StreamService] Connecting to Generic WebSocket: ${fullUrl}`);

        this.wsClient = new WebSocket(fullUrl);
        
        this.wsClient.onmessage = (event) => {
          const raw = event.data.toString();
          const frame = this.parseMessage(raw);
          this.onFrameCallback(frame, raw);
        };

        this.wsClient.onerror = (err) => {
          console.error('[StreamService] WebSocket Error:', err);
          this.onErrorCallback('WebSocket link failed. Check your server status and console for security errors.');
        };
      }
    } catch (err: any) {
      console.error('[StreamService] Connection Engine Initialization Failed:', err);
      this.onErrorCallback(err?.message || 'Failed to initialize network driver.');
    }
  }

  private parseMessage(data: string): MOTFrame | null {
    try {
      const parsed = JSON.parse(data);
      return LogParser.parseSingle(parsed);
    } catch (e) {
      const frames = LogParser.parse(data);
      return frames.length > 0 ? frames[0] : null;
    }
  }

  disconnect() {
    if (this.mqttClient) {
      console.log('[StreamService] Disconnecting MQTT client');
      this.mqttClient.end();
      this.mqttClient = null;
    }
    if (this.wsClient) {
      console.log('[StreamService] Closing WebSocket connection');
      this.wsClient.close();
      this.wsClient = null;
    }
  }
}

export const streamService = new StreamService();
