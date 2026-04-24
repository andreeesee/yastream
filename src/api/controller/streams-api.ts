import { Context } from "hono";
import StreamService from "../../service/resource/stream-service.js";
import { COMMON_TTL } from "../../db/sqlite.js";

export async function streamApiHandler(c: Context) {
  const id = c.req.param("id");
  if (!id) {
    return c.text("Missing parameters", 400);
  }
  const streamId = id.endsWith(".m3u8") ? id.slice(0, -5) : id;
  try {
    const stream = await StreamService.getStream(streamId);
    if (!stream || !stream.playlist) {
      return c.text("No streams found", 404);
    }
    return c.text(stream.playlist, 200, {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `max-age=${COMMON_TTL.stream / 1000}, public`,
    });
  } catch {
    return c.text("Invalid request", 400);
  }
}
