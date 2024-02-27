import { omit } from "lodash";
import {
  CreateFactMetricProps,
  FactMetricInterface,
  LegacyFactMetricInterface,
} from "../../types/fact-table";
import { upgradeFactMetricDoc } from "../util/migrations";
import { ApiFactMetric } from "../../types/openapi";
import { BaseModel, ModelConfig } from "./BaseModel";
import { getFactTable } from "./FactTableModel";

export class FactMetricDataModel extends BaseModel<FactMetricInterface> {
  protected config: ModelConfig<FactMetricInterface> = {
    collectionName: "factmetrics",
    idPrefix: "fact__",
    writePermission: "createMetrics",
    projectScoping: "multiple",
    globallyUniqueIds: false,
    readonlyFields: ["datasource"],
  };

  protected migrate(legacyDoc: unknown): FactMetricInterface {
    return upgradeFactMetricDoc(legacyDoc as LegacyFactMetricInterface);
  }

  protected async beforeCreate(props: CreateFactMetricProps) {
    if (props.id && !props.id.match(/^fact__[-a-zA-Z0-9_]+$/)) {
      throw new Error(
        "Fact metric ids MUST start with 'fact__' and contain only letters, numbers, underscores, and dashes"
      );
    }
  }

  protected async beforeUpdate(existing: FactMetricInterface) {
    if (existing.managedBy === "api" && !this.context.isApiRequest) {
      throw new Error("Cannot update fact metric managed by API");
    }
  }

  protected async beforeDelete(existing: FactMetricInterface) {
    if (existing.managedBy === "api" && !this.context.isApiRequest) {
      throw new Error("Cannot delete fact metric managed by API");
    }
  }

  protected async customValidation(data: FactMetricInterface): Promise<void> {
    const numeratorFactTable = await getFactTable(
      this.context,
      data.numerator.factTableId
    );
    if (!numeratorFactTable) {
      throw new Error("Could not find numerator fact table");
    }

    if (data.numerator.filters?.length) {
      for (const filter of data.numerator.filters) {
        if (!numeratorFactTable.filters.some((f) => f.id === filter)) {
          throw new Error(`Invalid numerator filter id: ${filter}`);
        }
      }
    }

    if (data.metricType === "ratio") {
      if (!data.denominator) {
        throw new Error("Denominator required for ratio metric");
      }
      if (data.denominator.factTableId !== data.numerator.factTableId) {
        const denominatorFactTable = await getFactTable(
          this.context,
          data.denominator.factTableId
        );
        if (!denominatorFactTable) {
          throw new Error("Could not find denominator fact table");
        }
        if (denominatorFactTable.datasource !== numeratorFactTable.datasource) {
          throw new Error(
            "Numerator and denominator must be in the same datasource"
          );
        }

        if (data.denominator.filters?.length) {
          for (const filter of data.denominator.filters) {
            if (!denominatorFactTable.filters.some((f) => f.id === filter)) {
              throw new Error(`Invalid denominator filter id: ${filter}`);
            }
          }
        }
      }
    } else if (data.denominator?.factTableId) {
      throw new Error("Denominator not allowed for non-ratio metric");
    }
  }

  public toApiInterface(factMetric: FactMetricInterface): ApiFactMetric {
    const {
      cappingSettings,
      windowSettings,
      regressionAdjustmentDays,
      regressionAdjustmentEnabled,
      regressionAdjustmentOverride,
      dateCreated,
      dateUpdated,
      denominator,
      ...otherFields
    } = omit(factMetric, ["organization"]);

    return {
      ...otherFields,
      cappingSettings: {
        ...cappingSettings,
        type: cappingSettings.type || "none",
      },
      windowSettings: {
        ...windowSettings,
        type: windowSettings.type || "none",
      },
      managedBy: factMetric.managedBy || "",
      denominator: denominator || undefined,
      regressionAdjustmentSettings: {
        override: regressionAdjustmentOverride || false,
        ...(regressionAdjustmentOverride
          ? {
              enabled: regressionAdjustmentEnabled || false,
            }
          : null),
        ...(regressionAdjustmentOverride && regressionAdjustmentEnabled
          ? {
              days: regressionAdjustmentDays || 0,
            }
          : null),
      },
      dateCreated: dateCreated?.toISOString() || "",
      dateUpdated: dateUpdated?.toISOString() || "",
    };
  }
}
