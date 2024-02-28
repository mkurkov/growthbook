import { v4 as uuidv4 } from "uuid";
import {
  createEventWebHook,
  getAllEventWebHooksForEvent,
  deleteOrganizationventWebHook,
} from "../../src/models/EventWebhookModel";
import mongoInit from "../../src/init/mongo";

describe("getAllEventWebHooksForEvent", () => {
  let connection;
  const organizationId = uuidv4();

  beforeAll(async () => {
    connection = await mongoInit();
  });

  afterAll(async () => {
    await deleteOrganizationventWebHook(organizationId);
    connection?.close();
  });

  it("filters models by tags and projects", async () => {
    const model1 = await createEventWebHook({
      organizationId,
      name: `Webhook ${uuidv4()}`,
      enabled: true,
      events: ["feature.created", "feature.updated", "feature.deleted"],
      url: "http://localhost:8000/test",
      signingKey: "signing-key",
      lastState: "none",
      tags: ["foo"],
      projects: ["gni", "gno"],
    });

    const model2 = await createEventWebHook({
      organizationId,
      name: `Webhook ${uuidv4()}`,
      enabled: true,
      events: ["feature.created", "feature.updated", "feature.deleted"],
      url: "http://localhost:8000/test",
      signingKey: "signing-key",
      lastState: "none",
      tags: ["foo", "bar"],
      projects: ["gni"],
    });

    const model3 = await createEventWebHook({
      organizationId,
      name: `Webhook ${uuidv4()}`,
      enabled: true,
      events: ["feature.created", "feature.updated", "feature.deleted"],
      url: "http://localhost:8000/test",
      signingKey: "signing-key",
      lastState: "none",
    });

    const filteredModels = await getAllEventWebHooksForEvent({
      organizationId,
      eventName: "feature.updated",
      enabled: true,
      tags: ["foo"],
      projects: ["gni"],
    });

    expect(filteredModels.map(({ id }) => id)).toEqual([
      model1.id,
      model2.id,
      model3.id,
    ]);

    const nonFilteredModels = await getAllEventWebHooksForEvent({
      organizationId,
      eventName: "feature.updated",
      enabled: true,
      tags: [],
      projects: [],
    });

    expect(nonFilteredModels.map(({ id }) => id)).toEqual([model3.id]);
  });
});
