import { Engine } from "./dist/bot/engine.js";
import { fakeHeaders } from "./dist/shared/utils.js";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MjVjOTc0NS0zYTJhLTQwYTctODdiZS1jOTZjOGRhMjFhMzYiLCJzaWQiOiI0MjhlODgxNy1hNTFlLTQ0NjQtYjI3MC00OTQ1OTIwNmU2YmEiLCJzdHlwIjoiZ2FtZSIsImV4cCI6MTc4NDkxMDIwNywiaWF0IjoxNzg0OTA5MzA3fQ.2nasLERpvTeEExitZ94136Xi1SnH0yMk20VAkDofCYI";

(async () => {
  const engine = new Engine("damdam5", { token }, {}, {});
  
  // Try to get map markers
  console.log("Fetching /api/game/map-markers...");
  const hunts = await engine.httpGet("/api/game/map-markers");
  console.log("Hunts result:", JSON.stringify(hunts).slice(0, 300));
  
  if (hunts?.hunts?.length > 0) {
    const hunt = hunts.hunts[0];
    console.log("First hunt:", hunt.id, hunt.slug, hunt.name);
  }
  
  console.log("Fetching /api/game/hunts...");
  const hunts2 = await engine.httpGet("/api/game/hunts");
  console.log("Hunts2 result:", JSON.stringify(hunts2).slice(0, 300));

})();
