import axios from "axios";
import { execSync } from "node:child_process";
import { Logger } from "./logger.js";

const logger = new Logger("INFO");

export interface StreamInfo {
  size: number;
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

export async function parseStreamInfo(url: string): Promise<StreamInfo> {
  const uri = new URL(url);
  const isM3u8 = uri.pathname.endsWith(".m3u8");
  const isMp4 = uri.pathname.endsWith(".mp4");
  if (isM3u8) {
    return parseM3u8(url);
  } else if (isMp4) {
    return parseMp4(url);
  }
  return { size: 0 };
}

async function parseMp4(url: string): Promise<StreamInfo> {
  const cmd = `ffprobe -v error -select_streams v:0 -show_entries format=duration,size -show_entries stream=width,height -of json "${url}"`;
  const output = execSync(cmd).toString();
  const data: ProbeInfo = JSON.parse(output);
  const hours = getHours(data.format.duration);
  const minutes = getMinutes(data.format.duration);
  const resolution: Resolution = {
    width: data.streams[0]?.width!,
    height: data.streams[0]?.height!,
  };
  let GB = data.format.size / (1024 * 1024 * 1024);
  return {
    size: GB,
    hours: hours,
    minutes: minutes,
    resolution: resolution,
  };
}

function getHours(durationSeconds: number) {
  return Math.floor(durationSeconds / 60 / 60);
}

function getMinutes(durationSeconds: number) {
  return Math.floor((durationSeconds / 60) % 60);
}

async function parseM3u8(url: string): Promise<StreamInfo> {
  const response = await axios.get(url);
  const lines = response.data.split("\n");

  let totalDuration = 0;
  let totalSizeInBytes = 0;
  let firstSegmentUrl: string;
  let firstDuration: number;
  lines.forEach((line: string) => {
    // Get Duration
    let currentDuration;
    if (line.startsWith("#EXTINF:")) {
      currentDuration = parseFloat(line.split(":")[1]?.replace(",", "") || "");
      totalDuration += currentDuration;
    }

    if (!firstSegmentUrl && !line.startsWith("#")) {
      firstDuration = currentDuration!;
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
  const hours = getHours(totalDuration);
  const minutes = getMinutes(totalDuration);
  logger.debug(`First segment ${firstSegmentUrl!}`);
  const segmentUrl = new URL(firstSegmentUrl!);
  let probeResult;
  if (!segmentUrl.pathname.endsWith("ts")) {
    probeResult = await getProbeInfoFromUrl(firstSegmentUrl!);
  } else {
    probeResult = await getProbeInfoFromUrl(url);
  }
  if (gb === 0) {
    gb = probeResult?.gb!;
    // const estimatedTotalSizeMB = await estimateTotalSize(
    //   totalDuration,
    //   firstSegmentUrl!,
    //   firstDuration!,
    // );
    // logger.debug(`Estimate size ${estimatedTotalSizeMB}`);
    // gb = estimatedTotalSizeMB / 1024;
  }
  logger.log(
    `| ${hours} hours ${minutes} minutes, ${gb.toFixed(2)} GB, ${probeResult?.resolution.width} x ${probeResult?.resolution.height}`,
  );
  return {
    size: gb,
    hours: hours,
    minutes: minutes,
    resolution: probeResult?.resolution!,
  };
}

function getProbeInfoFromUrl(
  segmentUrl: string,
): { resolution: Resolution; gb: number } | null {
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries format=duration,size -show_entries stream=width,height,bit_rate -of json "${segmentUrl}"`;
    const output = execSync(cmd).toString();
    const data: ProbeInfo = JSON.parse(output);
    const size = (data.streams[0]?.bit_rate! * data.format.duration) / 8;
    return {
      resolution: {
        width: data.streams[0]?.width!,
        height: data.streams[0]?.height!,
      },
      gb: size / (1024 * 1024 * 1024),
    };
  } catch (err) {
    logger.error(
      `FFprobe failed. Make sure ffmpeg is installed on your system | Url ${segmentUrl}`,
    );
    return null;
  }
}

async function estimateTotalSize(
  totalDurationSeconds: number,
  firstSegmentUrl: string,
  firstDuration: number,
) {
  // 2. Get the actual size of the first segment via a HEAD request
  const response = await axios.head(firstSegmentUrl, {
    timeout: 5000,
    headers: { "User-Agent": "Mozilla/5.0" }, // Some hosts block empty UAs
  });

  let segmentSizeBytes = parseInt(response.headers["content-length"] || "0");
  // if (segmentSizeBytes === 0) {
  //   segmentSizeBytes = await getRealSize(firstSegmentUrl);
  // }

  // 3. Get the duration of that specific segment (from your JSON)
  const segmentDurationSeconds = firstDuration;

  // 4. Calculate the average bitrate of that segment
  const bitsPerSecond = (segmentSizeBytes * 8) / segmentDurationSeconds;

  // 5. Estimate the full movie size
  const totalEstimatedBytes = (bitsPerSecond * totalDurationSeconds) / 8;
  const totalMB = totalEstimatedBytes / (1024 * 1024);

  return totalMB;
}

// Does Not Work
// const getRealSize = async (url: string) => {
//   try {
//     const response = await axios.get(url, {
//       headers: {
//         Range: "bytes=0-5", // Just ask for the first 2 bytes
//         "User-Agent": "Mozilla/5.0...",
//       },
//     });

//     // Content-Range looks like: "bytes 0-1/1548290"
//     const contentRange = response.headers["content-range"];
//     if (contentRange) {
//       const totalSize = contentRange.split("/")[1];
//       return parseInt(totalSize);
//     }

//     // Fallback: If no Range support, check if they sent content-length on GET
//     return parseInt(response.headers["content-length"] || "0");
//   } catch (e) {
//     return 0;
//   }
// };

export function getDisplayResolution(resolution: Resolution) {
  const width = resolution.width;
  const height = resolution.height;
  if (width >= 3840 || height >= 2160) return "4K";
  if (width >= 1920 || height >= 800) return "1080p";
  if (width >= 1280 || height >= 534) return "720p"; // Your 640px height falls here
  if (width >= 854 || height >= 480) return "480p";
  return "SD";
}
