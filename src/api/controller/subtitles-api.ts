import { Context } from "hono";
import { COMMON_TTL } from "../../db/sqlite.js";
import SubtitleService from "../../service/resource/subtitle-service.js";

export async function subtitleApiHandler(c: Context) {
  const id = c.req.param("id");
  if (!id) {
    return c.text("Missing parameters", 400);
  }
  const subtitleId = id.endsWith(".vtt") ? id.slice(0, -4) : id;
  try {
    const subtitle = await SubtitleService.getSubtitle(subtitleId);
    if (!subtitle || !subtitle.subtitle) {
      return c.text("No subtitles found", 404);
    }
    return c.text(subtitle.subtitle, 200, {
      "Content-Type": "text/vtt",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `max-age=${COMMON_TTL.stream / 1000}, public`,
    });
  } catch {
    return c.text("Invalid request", 400);
  }
}
