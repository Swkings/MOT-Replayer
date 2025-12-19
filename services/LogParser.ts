
import { MOTFrame, MOTObject, NaviData, ObjectKind } from '../types';

export class LogParser {
  static parse(content: string): MOTFrame[] {
    let frames: MOTFrame[] = [];

    // 1. Try to parse the entire content as a single JSON object or array (common for exported files)
    try {
      const trimmedContent = content.trim();
      if (trimmedContent.startsWith('[') || trimmedContent.startsWith('{')) {
        const parsed = JSON.parse(trimmedContent);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const frame = this.parseSingle(item);
          if (frame) frames.push(frame);
        }
        if (frames.length > 0) return this.finalizeFrames(frames);
      }
    } catch (e) {
      // Not a valid full-file JSON, fall back to line-by-line parsing
    }

    // 2. Line-by-line parsing for traditional log files
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

        // Robust Python-to-JSON conversion for logs
        jsonStr = jsonStr.replace(/'/g, '"');
        jsonStr = jsonStr.replace(/:\s*True/gi, ': true')
                         .replace(/:\s*False/gi, ': false')
                         .replace(/:\s*None/gi, ': null');

        const parsed = JSON.parse(jsonStr);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        for (const item of items) {
          const frame = this.parseSingle(item);
          if (frame) frames.push(frame);
        }
      } catch (e) {
        continue;
      }
    }

    return this.finalizeFrames(frames);
  }

  private static finalizeFrames(frames: MOTFrame[]): MOTFrame[] {
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

    // Check various channel markers or nested structures
    // "mot-6" and "mov_objs_hmi" are common channel identifiers
    const motChannels = ['mov_objs_hmi', 'tracking', 'mot_msg', 'mot_6', 'tracking_msg'];
    
    if (motChannels.includes(item.channel)) {
      hmiData = item.params;
    } else if (item.params?.mov_objs_hmi) {
      hmiData = item.params.mov_objs_hmi;
    } else if (item.params?.mot_msg) {
      hmiData = item.params.mot_msg;
    } else if (item.params?.objs || item.params?.mot_objs) {
      hmiData = item.params;
    } else if (item.objs || item.mot_objs) {
      hmiData = item;
    }

    if (hmiData) {
      const navi = hmiData.navi || hmiData.navi_msg;
      const objs = hmiData.objs || hmiData.mot_objs || hmiData.objects;

      if (navi && Array.isArray(objs)) {
        const timestamp = item.timestamp || hmiData.timestamp || 
                          (Array.isArray(navi) ? navi[8] : (navi.ts || navi.timestamp)) || 0;
        
        return {
          timestamp: timestamp,
          vin: item.vin || "Unknown",
          navi: this.mapNavi(navi),
          objs: objs.map((o: any) => this.mapObject(o)),
          raw: JSON.stringify(item, null, 2)
        };
      }
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
    // Handle camelCase or snake_case for navi data fields
    return {
      east: navi.east,
      north: navi.north,
      height: navi.height,
      theta: navi.theta,
      alpha: navi.alpha,
      beta: navi.beta,
      vel: navi.vel,
      yaw_angular_speed: navi.yaw_angular_speed || navi.yaw_speed || 0,
      ts: navi.ts || navi.timestamp || 0
    };
  }

  private static mapObject(obj: any): MOTObject {
    if (Array.isArray(obj)) {
      return {
        id: obj[0], theta: obj[1], vel: obj[2], vel_theta: obj[3],
        height: obj[4], kind: obj[5] as ObjectKind,
        vertex_points: obj[6] || [], lower_z: obj[7], veh_light_kind: obj[8],
      };
    }
    // Deep clone vertex points to ensure no reference issues
    return {
      id: obj.id,
      theta: obj.theta,
      vel: obj.vel,
      vel_theta: obj.vel_theta || obj.velTheta || 0,
      height: obj.height,
      kind: obj.kind as ObjectKind,
      vertex_points: Array.isArray(obj.vertex_points) ? [...obj.vertex_points] : [],
      lower_z: obj.lower_z || obj.lowerZ || 0,
      veh_light_kind: obj.veh_light_kind || obj.vehLightKind || -1,
    };
  }
}
