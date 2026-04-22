import Database from "better-sqlite3";
import { Logger } from "../utils/logger.js";
import { ENV } from "../utils/env.js";

const logger = new Logger("DB");

export const COMMON_TTL = {
  content: 24 * 60 * 60 * 1000,
  provider: 4 * 60 * 60 * 1000,
  stream: 1 * 60 * 60 * 1000,
};

class DatabaseManager {
  private db: Database.Database;

  constructor() {
    this.db = new Database(ENV.DATABASE_URL);
    this.db.pragma("journal_mode = WAL");
  }

  public getDb(): Database.Database {
    return this.db;
  }

  public exec(sql: string) {
    this.db.exec(sql);
  }

  public prepare(sql: string): unknown {
    return this.db.prepare(sql);
  }

  public close() {
    this.db.close();
  }
}

export const db = new DatabaseManager();
