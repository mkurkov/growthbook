import { Athena } from "aws-sdk";
import { ResultSet } from "aws-sdk/clients/athena";
import { AthenaConnectionParams } from "../../types/integrations/athena";
import { IS_CLOUD } from "../util/secrets";

function getAthenaInstance(params: AthenaConnectionParams) {
  if (!IS_CLOUD && params.authType === "auto") {
    return new Athena({
      region: params.region,
    });
  }

  return new Athena({
    accessKeyId: params.accessKeyId,
    secretAccessKey: params.secretAccessKey,
    region: params.region,
  });
}

export async function runAthenaQuery<T>(
  conn: AthenaConnectionParams,
  sql: string
): Promise<T[]> {
  const athena = getAthenaInstance(conn);

  const { database, bucketUri, workGroup } = conn;

  const { QueryExecutionId } = await athena
    .startQueryExecution({
      QueryString: sql,
      QueryExecutionContext: {
        Database: database,
      },
      ResultConfiguration: {
        EncryptionConfiguration: {
          EncryptionOption: "SSE_S3",
        },
        OutputLocation: bucketUri,
      },
      WorkGroup: workGroup || "primary",
    })
    .promise();

  if (!QueryExecutionId) {
    throw new Error("Failed to start query");
  }

  const waitAndCheck = (delay: number) => {
    return new Promise<false | ResultSet>((resolve, reject) => {
      setTimeout(() => {
        athena
          .getQueryExecution({ QueryExecutionId })
          .promise()
          .then((resp) => {
            const State = resp.QueryExecution?.Status?.State;
            const StateChangeReason =
              resp.QueryExecution?.Status?.StateChangeReason;

            if (State === "RUNNING") {
              resolve(false);
            } else if (State === "FAILED") {
              reject(new Error(StateChangeReason || "Query failed"));
            } else {
              athena
                .getQueryResults({ QueryExecutionId })
                .promise()
                .then(({ ResultSet }) => {
                  if (ResultSet) {
                    resolve(ResultSet);
                  } else {
                    reject("Query did not return results");
                  }
                })
                .catch((e) => {
                  console.error(e);
                  reject(e);
                });
            }
          })
          .catch((e) => {
            console.error(e);
            reject(e);
          });
      }, delay);
    });
  };

  // Check for results with an exponential back-off
  // Max time waiting = ~30 minutes
  for (let i = 0; i < 62; i++) {
    const result = await waitAndCheck(500 * Math.pow(1.1, i));
    if (result && result.Rows && result.ResultSetMetadata?.ColumnInfo) {
      const keys = result.ResultSetMetadata.ColumnInfo.map((info) => info.Name);
      return result.Rows.slice(1).map((row) => {
        // eslint-disable-next-line
        const obj: any = {};
        if (row.Data) {
          row.Data.forEach((value, i) => {
            obj[keys[i]] = value.VarCharValue || null;
          });
        }
        return obj;
      });
    }
  }

  // Cancel the query if it reaches this point
  await athena.stopQueryExecution({ QueryExecutionId }).promise();
  throw new Error("Query timed out after 5 minutes");
}
