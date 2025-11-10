import { app, HttpRequest, HttpResponseInit } from "@azure/functions";

app.http("meta", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "meta",
  handler: async (_req: HttpRequest): Promise<HttpResponseInit> => {
    const primary = process.env["PRIMARY_ID_FIELD"] ?? "_id";
    const allowed = (process.env["ALLOWED_FIELDS"] ?? "")
      .split(",").map(s => s.trim()).filter(Boolean);
    return { jsonBody: { primaryIdField: primary, allowedFields: allowed } };
  }
});