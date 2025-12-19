
import { MOTFrame, MOTObject, NaviData, ObjectKind } from '../types';

export class LogParser {
  static parse(content: string): MOTFrame[] {
    const frames: MOTFrame[] = [];
    const trimmedContent = content.trim();

    // Check if the entire content is a JSON array (common for exported logs)
    if (trimmedContent.startsWith('[') && trimmedContent.endsWith(']')) {
      try {
        const parsed = JSON.parse(this.sanitizeJson(trimmedContent));
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const frame = this.parseSingle(item);
          if (frame) frames.push(frame);
        }
        return this.sortAndDedupe(frames);
      } catch (e) {
        // If parsing fails as a whole, fallback to line-by-line
      }
    }

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const marker = "Nanomsg:";
        const markerIdx = trimmedLine.indexOf(marker);
        
        let jsonStr: string;
        if (markerIdx !== -1) {
          jsonStr = trimmedLine.substring(markerIdx + marker.length).trim();
        } else {
          const firstBrace = trimmedLine.search(/\{|\[/);
          if (firstBrace === -1) continue;
          jsonStr = trimmedLine.substring(firstBrace).trim();
        }

        const parsed = JSON.parse(this.sanitizeJson(jsonStr));
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        for (const item of items) {
          const frame = this.parseSingle(item);
          if (frame) frames.push(frame);
        }
      } catch (e) {
        continue;
      }
    }

    return this.sortAndDedupe(frames);
  }

  private static sanitizeJson(str: string): string {
    // Convert Python-style logs to valid JSON
    return str
      .replace(/'/g, '"')
      .replace(/:\s*True/gi, ': true')
      .replace(/:\s*False/gi, ': false')
      .replace(/:\s*None/gi, ': null');
  }

  private static sortAndDedupe(frames: MOTFrame[]): MOTFrame[] {
    const sorted = frames
      .filter(f => f.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return sorted.filter((f, i, arr) => i === 0 || f.timestamp !== arr[i-1].timestamp);
  }

  static parseSingle(item: any): MOTFrame | null {
    if (!item) return null;

    let hmiData = null;

    // 1. Check for wrapped formats (MQTT/Logs with channels)
    if (item.channel === 'mov_objs_hmi') {
      hmiData = item.params;
    } 
    else if (item.channel === 'tracking' && item.params && item.params.mov_objs_hmi) {
      hmiData = item.params.mov_objs_hmi;
    }
    // 2. Check for direct format (provided by user)
    else if (item.navi && Array.isArray(item.objs)) {
      hmiData = item;
    }

    if (hmiData && hmiData.navi && Array.isArray(hmiData.objs)) {
      // Prioritize explicit ts, then navi.ts, then fallback to item timestamp
      const timestamp = hmiData.timestamp || item.timestamp || (Array.isArray(hmiData.navi) ? hmiData.navi[8] : hmiData.navi.ts) || 0;
      
      return {
        timestamp: timestamp,
        vin: hmiData.vin || item.vin || "Unknown",
        navi: this.mapNavi(hmiData.navi),
        objs: hmiData.objs.map((o: any) => this.mapObject(o)),
        raw: JSON.stringify(item, null, 2)
      };
    }
    return null;
  }

  private static mapNavi(navi: any): NaviData {
    if (Array.isArray(navi)) {
      return {
        east: navi[0], north: navi[1], height: navi[2],
        theta: navi[3], alpha: navi[4], beta: navi[5],
        vel: navi[6], yaw_angular_speed: navi[7], ts: navi[8],
      };
    }
    return navi as NaviData;
  }

  private static mapObject(obj: any): MOTObject {
    if (Array.isArray(obj)) {
      return {
        id: obj[0], theta: obj[1], vel: obj[2], vel_theta: obj[3],
        height: obj[4], kind: obj[5] as ObjectKind,
        vertex_points: obj[6] || [], lower_z: obj[7], veh_light_kind: obj[8],
      };
    }
    return obj as MOTObject;
  }
}
