import { Stream } from "@stremio-addon/sdk";
import { getStream, getStreamsJoinProvider } from "../../db/queries.js";
import { API, STREAMS } from "../../utils/constant.js";
import { getOrigin } from "../../utils/domain.js";
import { UserConfig } from "../../lib/manifest.js";
import { formatStreamTitle } from "../../utils/format.js";
import { parseStreamInfo, StreamInfo } from "../../utils/info.js";
import { he } from "zod/locales";

class StreamService {
  static async getStream(id: string) {
    return getStream(id);
  }

  static async getStreamsFromDb(
    id: string,
    season: number,
    episode: number,
    displayName: string,
    config: UserConfig,
  ): Promise<Stream[]> {
    const streamsAndProvider = await getStreamsJoinProvider(
      id,
      season ?? 1,
      episode ?? 1,
    );
    if (streamsAndProvider && streamsAndProvider.length > 0) {
      const streams = await Promise.all(
        streamsAndProvider.map(async (stream, index) => {
          let url = stream.streams.url;
          if (stream.streams.playlist) {
            url = StreamService.getStreamUrl(stream.streams.id);
          }
          let info: StreamInfo = {
            size: 0,
          };
          if (config.info) {
            info = (await parseStreamInfo(url)) || info;
          } else {
            if (stream.streams.size)
              info.size = parseFloat(stream.streams.size);
            if (stream.streams.duration) {
              info.hours = parseInt(stream.streams.duration) / 60;
              info.minutes = parseInt(stream.streams.duration) % 60;
            }
            if (stream.streams.resolution) {
              const width = stream.streams.resolution.split("x")[0];
              const height = stream.streams.resolution.split("x")[1];
              if (width && height) {
                info.resolution = {
                  width: parseInt(width),
                  height: parseInt(height),
                };
              }
            }
          }
          const formatTitle = formatStreamTitle(
            stream.provider_content.title,
            stream.provider_content.year,
            season,
            episode,
            info,
          );
          const filename = `${formatTitle}-${stream.provider_content.provider}`;
          return {
            url: url,
            name: displayName,
            title: formatTitle,
            behaviorHints: {
              notWebReady: true,
              bingeGroup: `${displayName}-${index}`,
              filename: filename,
            },
          };
        }),
      );
      return streams;
    }
    return [];
  }

  static getStreamUrl(id: string) {
    return `${getOrigin()}/${API}/${STREAMS}/${id}.m3u8`;
  }
}

export default StreamService;
