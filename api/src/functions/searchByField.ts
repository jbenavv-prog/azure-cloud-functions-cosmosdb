import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { getCollection } from "../shared/mongoClient";

app.http("searchByField", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "search/by-field",
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const field = (req.query.get("field") ?? "").trim();
    const value = (req.query.get("value") ?? "").trim();
    if (!field || !value) return { status: 400, jsonBody: { error: "Provide 'field' and 'value'" } };

    const allowed = (process.env["ALLOWED_FIELDS"] ?? "")
      .split(",").map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(field)) {
      return { status: 400, jsonBody: { error: `Field not allowed. Use one of: ${allowed.join(", ")}` } };
    }

    const col = await getCollection();
    const doc = await col.findOne({ [field]: value });
    return doc ? { jsonBody: doc } : { status: 404, jsonBody: { error: "Not found" } };
  }
});
