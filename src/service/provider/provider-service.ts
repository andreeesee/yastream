import { getProviderContent } from "../../db/queries.js";

class ProviderService {
  static async getProviderContent(id: string) {
    return getProviderContent(id);
  }
}

export default ProviderService;
