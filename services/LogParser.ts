
import { MOTFrame, MOTObject, NaviData, ObjectKind } from '../types';

export class LogParser {
  static parse(content: string): MOTFrame[] {
    const frames: MOTFrame[] = [];
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
          // Attempt to find the first '{' or '[' if marker is missing
          const firstBrace = trimmedLine.search(/\{|\[/);
          if (firstBrace === -1) continue;
          jsonStr = trimmedLine.substring(firstBrace).trim();
        }

        // Robust Python-to-JSON conversion
        // 1. Replace single quotes with double quotes (handling nested cases is hard, but simple replacement usually works for these logs)
        jsonStr = jsonStr.replace(/'/g, '"');
        // 2. Replace Python booleans and None
        jsonStr = jsonStr.replace(/:\s*True/gi, ': true')
                         .replace(/:\s*False/gi, ': false')
                         .replace(/:\s*None/gi, ': null');

        const parsed = JSON.parse(jsonStr);
        
        // Handle array of messages or single message
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        for (const item of items) {
          const frame = this.parseSingle(item);
          if (frame) frames.push(frame);
        }
      } catch (e) {
        // Skip lines that fail to parse
        continue;
      }
    }

    // Filter and sort by timestamp
    const sorted = frames
      .filter(f => f.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // De-duplicate frames with same timestamp
    return sorted.filter((f, i, arr) => i === 0 || f.timestamp !== arr[i-1].timestamp);
  }

  static parseSingle(item: any): MOTFrame | null {
    if (!item) return null;

    let hmiData = null;

    // Check direct channel
    if (item.channel === 'mov_objs_hmi') {
      hmiData = item.params;
    } 
    // Check nested tracking channel data which often mirrors hmi
    else if (item.channel === 'tracking' && item.params && item.params.mov_objs_hmi) {
      hmiData = item.params.mov_objs_hmi;
    }

    if (hmiData && hmiData.navi && Array.isArray(hmiData.objs)) {
      const timestamp = item.timestamp || (Array.isArray(hmiData.navi) ? hmiData.navi[8] : hmiData.navi.ts) || 0;
      
      return {
        timestamp: timestamp,
        vin: item.vin || "Unknown",
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
