import { execSync } from "node:child_process";
import { axiosGet } from "./axios.js";
import { Logger } from "./logger.js";

const logger = new Logger("INFO");

export interface StreamInfo {
  size?: number;
  hours?: number;
  minutes?: number;
  resolution?: Resolution;
}

export interface Resolution {
  width: number;
  height: number;
}
export interface ProbeStream extends Resolution {
  bit_rate: number;
}

interface ProbeInfo {
  streams: ProbeStream[];
  format: {
    duration: number;
    size: number;
    bit_rate: number;
  };
}

export async function parseStreamInfo(
  url: string,
): Promise<StreamInfo | undefined> {
  let info: StreamInfo | undefined = { size: 0 };
  try {
    const uri = new URL(url);
    const isM3u8 = uri.pathname.endsWith(".m3u8");
    const isMp4 = uri.pathname.endsWith(".mp4");
    if (isM3u8) {
      info = await parseM3u8(url);
    } else if (isMp4) {
      info = await parseMp4(url);
    } else {
      info = await parseMp4(url); // default work for both
    }
  } catch (error) {
    logger.error(`Fail to parse stream info | ${error}`);
  }
  return info;
}

async function parseMp4(url: string): Promise<StreamInfo> {
  logger.log(`GET mp4 info | ${url}`);
  const data = await getProbeInfo(url);
  if (!data) return { size: 0 };
  const hours = getHours(data.format.duration);
  const minutes = getMinutes(data.format.duration);
  const resolution: Resolution = {
    width: data.streams[0]?.width!,
    height: data.streams[0]?.height!,
  };
  let GB = data.format.size;
  const info: StreamInfo = {
    hours: hours,
    minutes: minutes,
    resolution: resolution,
  };
  if (GB > 0) info.size = GB;
  return info;
}

function getHours(durationSeconds: number) {
  return Math.floor(durationSeconds / 60 / 60);
}

function getMinutes(durationSeconds: number) {
  return Math.floor((durationSeconds / 60) % 60);
}

async function parseM3u8(url: string): Promise<StreamInfo | undefined> {
  logger.log(`GET m3u8 | ${url}`);
  const data = await axiosGet<string>(url);
  if (!data) return undefined;
  const lines = data.split("\n");

  let totalDuration = 0;
  let totalSizeInBytes = 0;
  let firstSegmentUrl: string | undefined;
  lines.forEach((line: string) => {
    // Get Duration
    let currentDuration;
    if (line.startsWith("#EXTINF:")) {
      currentDuration = parseFloat(line.split(":")[1]?.replace(",", "") || "");
      totalDuration += currentDuration;
    }

    if (!firstSegmentUrl && !line.startsWith("#")) {
      if (line.startsWith("http")) {
        firstSegmentUrl = line;
      } else if (line.startsWith("//")) {
        firstSegmentUrl = `https:${line}`;
      } else {
        firstSegmentUrl = new URL(line, url).toString();
      }
    }

    // Get Size from Byte Range (Format: length@offset)
    if (line.startsWith("#EXT-X-BYTERANGE:")) {
      const length = parseInt(line.split(":")[1]?.split("@")[0] || "");
      totalSizeInBytes += length;
    }
  });
  let gb = totalSizeInBytes / (1024 * 1024 * 1024);
  let probeResult;
  logger.debug(`First segment ${firstSegmentUrl}`);
  if (firstSegmentUrl && isValidSegmentUrl(firstSegmentUrl)) {
    probeResult = await getProbeInfo(firstSegmentUrl);
  } else {
    probeResult = await getProbeInfo(url);
  }
  if (probeResult?.format.duration && totalDuration == 0) {
    totalDuration = probeResult?.format.duration;
  }

  const hours = getHours(totalDuration);
  const minutes = getMinutes(totalDuration);
  if (!probeResult) {
    return {
      size: gb,
      hours: hours,
      minutes: minutes,
    };
  }
  if (gb === 0 && !Number.isNaN(probeResult.format.size)) {
    gb = probeResult.format.size;
  }
  const resolution: Resolution = {
    height: probeResult.streams[0]?.height!,
    width: probeResult.streams[0]?.width!,
  };
  logger.log(
    `${hours} hours ${minutes} minutes, ${gb.toFixed(2)} GB, ${resolution.width} x ${resolution.height}`,
  );
  const info: StreamInfo = {
    hours: hours,
    minutes: minutes,
    resolution: resolution,
  };
  if (gb > 0) info.size = gb;
  return info;
}

function isValidSegmentUrl(url: string) {
  const segmentUrl = new URL(url);
  const pathname = segmentUrl.pathname.toLowerCase();
  switch (true) {
    case pathname.endsWith("ts"):
    case pathname.endsWith("png"):
      return true;
    default:
      return false;
  }
}

function getProbeInfo(url: string): ProbeInfo | null {
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries format=duration,size -show_entries stream=width,height,bit_rate -of json -allowed_segment_extensions ALL -extension_picky 0 "${url}"`;
    const output = execSync(cmd).toString();
    const data: ProbeInfo = JSON.parse(output);
    const size = (data.streams[0]?.bit_rate! * data.format.duration) / 8;
    data.format.size = size / (1024 * 1024 * 1024);
    return data;
  } catch (err) {
    logger.error(`FFprobe failed | Url ${url}, Error: ${err}`);
    return null;
  }
}

export function getDisplayResolution(resolution: Resolution) {
  const width = resolution.width;
  const height = resolution.height;
  if (width >= 3840 || height >= 2160) return "4K";
  if (width >= 1920 || height >= 800) return "1080p";
  if (width >= 1280 || height >= 534) return "720p";
  if (width >= 854 || height >= 480) return "480p";
  return "SD";
}
