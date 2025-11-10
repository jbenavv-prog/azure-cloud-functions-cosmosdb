import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { ObjectId } from "mongodb";
import { getCollection } from "../shared/mongoClient";

app.http("searchById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "search/by-id",
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const id = (req.query.get("id") ?? "").trim();
    if (!id) return { status: 400, jsonBody: { error: "Missing 'id'" } };

    const primary = process.env["PRIMARY_ID_FIELD"] ?? "_id";
    const col = await getCollection();

    let filter: any = { [primary]: id };
    if (primary === "_id" && /^[a-fA-F0-9]{24}$/.test(id)) {
      try { filter = { _id: new ObjectId(id) }; } catch {}
    }

    const doc = await col.findOne(filter);
    return doc ? { jsonBody: doc } : { status: 404, jsonBody: { error: "Not found" } };
  }
});
