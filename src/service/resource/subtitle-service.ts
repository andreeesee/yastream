import { Subtitle } from "@stremio-addon/sdk";
import { getSubtitle, getSubtitlesJoinProvider } from "../../db/queries.js";
import { API, SUBTITLES } from "../../utils/constant.js";
import { getOrigin } from "../../utils/domain.js";

class SubtitleService {
  static async getSubtitle(id: string) {
    return getSubtitle(id);
  }
  static async getSubtitlesFromDb(
    id: string,
    season: number,
    episode: number,
  ): Promise<Subtitle[]> {
    const subtitlesAndProvider = await getSubtitlesJoinProvider(
      id,
      season ?? 1,
      episode ?? 1,
    );
    if (subtitlesAndProvider && subtitlesAndProvider.length > 0) {
      const subtitles = subtitlesAndProvider.map((subtitle) => {
        let url = subtitle.subtitles.url;
        if (subtitle.subtitles.subtitle) {
          url = SubtitleService.getSubtitleUrl(subtitle.subtitles.id);
        }
        return {
          id: id,
          label: subtitle.provider_content.provider,
          lang: subtitle.subtitles.lang,
          url: url,
        };
      });
      return subtitles;
    }
    return [];
  }
  static getSubtitleUrl(id: string) {
    return `${getOrigin()}/${API}/${SUBTITLES}/${id}.vtt`;
  }
}
export default SubtitleService;
