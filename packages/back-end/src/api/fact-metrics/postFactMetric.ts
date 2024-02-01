import z from "zod";
import { getScopedSettings } from "shared/settings";
import {
  CreateFactMetricProps,
  FactTableInterface,
} from "../../../types/fact-table";
import { PostFactMetricResponse } from "../../../types/openapi";
import { getFactTable } from "../../models/FactTableModel";
import { createApiRequestHandler } from "../../util/handler";
import { postFactMetricValidator } from "../../validators/openapi";
import { OrganizationInterface } from "../../../types/organization";
import { findAllProjectsByOrganization } from "../../models/ProjectModel";

export async function getCreateMetricPropsFromBody(
  body: z.infer<typeof postFactMetricValidator.bodySchema>,
  organization: OrganizationInterface,
  getFactTable: (id: string) => Promise<FactTableInterface | null>
): Promise<CreateFactMetricProps> {
  const { settings: scopedSettings } = getScopedSettings({
    organization,
  });

  const factTable = await getFactTable(body.numerator.factTableId);
  if (!factTable) {
    throw new Error("Could not find fact table");
  }

  const {
    cappingSettings,
    windowSettings,
    regressionAdjustmentSettings,
    numerator,
    denominator,
    ...otherFields
  } = body;

  const cleanedNumerator = {
    filters: [],
    ...numerator,
    column:
      body.metricType === "proportion"
        ? "$$distinctUsers"
        : body.numerator.column || "$$distinctUsers",
  };

  const data: CreateFactMetricProps = {
    datasource: factTable.datasource,
    loseRisk: scopedSettings.loseRisk.value || 0,
    winRisk: scopedSettings.winRisk.value || 0,
    maxPercentChange:
      scopedSettings.metricDefaults.value.maxPercentageChange || 0,
    minPercentChange:
      scopedSettings.metricDefaults.value.minPercentageChange || 0,
    minSampleSize: scopedSettings.metricDefaults.value.minimumSampleSize || 0,
    description: "",
    owner: "",
    projects: [],
    tags: [],
    inverse: false,
    capping: "",
    capValue: 0,
    regressionAdjustmentOverride: false,
    regressionAdjustmentDays:
      scopedSettings.regressionAdjustmentDays.value || 0,
    regressionAdjustmentEnabled: !!scopedSettings.regressionAdjustmentEnabled,
    conversionDelayHours: scopedSettings.conversionDelayHours.value || 0,
    conversionWindowValue: scopedSettings.conversionWindowHours.value || 72,
    conversionWindowUnit: "hours",
    hasConversionWindow: false,
    numerator: cleanedNumerator,
    denominator: null,
    ...otherFields,
  };

  if (denominator) {
    data.denominator = {
      filters: [],
      ...denominator,
      column: denominator.column || "$$distinctUsers",
    };
  }

  if (cappingSettings?.type && cappingSettings?.type !== "none") {
    data.capping = cappingSettings.type;
    data.capValue = cappingSettings.value || 0;
  }
  if (windowSettings?.type && windowSettings?.type !== "none") {
    data.hasConversionWindow = true;
    if (windowSettings.delayHours) {
      data.conversionDelayHours = windowSettings.delayHours;
    }
    if (windowSettings.windowValue) {
      data.conversionWindowValue = windowSettings.windowValue;
    }
    if (windowSettings.windowUnit) {
      data.conversionWindowUnit = windowSettings.windowUnit;
    }
  }

  if (regressionAdjustmentSettings?.override) {
    data.regressionAdjustmentOverride = true;
    if (regressionAdjustmentSettings.enabled) {
      data.regressionAdjustmentEnabled = true;
    }
    if (regressionAdjustmentSettings.days) {
      data.regressionAdjustmentDays = regressionAdjustmentSettings.days;
    }
  }

  return data;
}

export const postFactMetric = createApiRequestHandler(postFactMetricValidator)(
  async (req): Promise<PostFactMetricResponse> => {
    req.checkPermissions("createMetrics", req.body.projects || "");

    const lookupFactTable = async (id: string) => getFactTable(req.context, id);

    if (req.body.projects?.length) {
      const projects = await findAllProjectsByOrganization(req.context);
      const projectIds = new Set(projects.map((p) => p.id));
      for (const projectId of req.body.projects) {
        if (!projectIds.has(projectId)) {
          throw new Error(`Project ${projectId} not found`);
        }
      }
    }

    const data = await getCreateMetricPropsFromBody(
      req.body,
      req.organization,
      lookupFactTable
    );

    const factMetric = await req.context.factMetrics.create(data);

    return {
      factMetric: req.context.factMetrics.toApiInterface(factMetric),
    };
  }
);
