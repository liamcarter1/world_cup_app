import type { FootballDataProvider, ProviderSnapshot } from "@/lib/types";
import { seedSnapshot } from "@/data/seed-fixtures";

// Zero-network provider — the committed snapshot. Always available.
export class SeedProvider implements FootballDataProvider {
  name = "seed";
  async getSnapshot(): Promise<ProviderSnapshot> {
    return seedSnapshot();
  }
}
