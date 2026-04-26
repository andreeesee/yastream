import {
  getCountProviderContent,
  getProviderContent,
} from "../../db/queries.js";

class ProviderService {
  static async getProviderContent(id: string) {
    return getProviderContent(id);
  }
  static async getTotalProviderContent() {
    const count = await getCountProviderContent();
    if (!count) return 0;
    const total = count[0]?.count ?? 0;
    return total;
  }
}

export default ProviderService;
