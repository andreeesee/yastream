import { Stream } from "@stremio-addon/sdk";
import { getStream, getStreamsJoinProvider } from "../../db/queries.js";
import { API, STREAMS } from "../../utils/constant.js";
import { getOrigin } from "../../utils/domain.js";
import { UserConfig } from "../../lib/manifest.js";
import { formatStreamTitle } from "../../utils/format.js";
import { parseStreamInfo } from "../../utils/info.js";

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
          const info = config.info ? await parseStreamInfo(url) : undefined;
          const formatTitle = formatStreamTitle(
            stream.provider_content.title,
            stream.provider_content.year,
            season,
            episode,
            info,
          );
          return {
            url: url,
            name: displayName,
            title: formatTitle,
            behaviorHints: {
              notWebReady: true,
              bingeGroup: `${displayName}-${index}`,
              filename: `${formatTitle}-${stream.provider_content.provider}`,
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
