import uniq from "lodash/uniq";
import { NotificationEvent } from "../notification-events";

export type FilterDataForNotificationEvent = {
  filterData: {
    tags: string[];
    projects: string[];
  };
};

export const getFilterDataForNotificationEvent = (
  event: NotificationEvent
): FilterDataForNotificationEvent | null => {
  let invalidEvent: never;

  switch (event.event) {
    case "user.login":
      return null;

    case "feature.created":
      return {
        filterData: {
          tags: event.data.current.tags || [],
          projects: event.data.current.project
            ? [event.data.current.project]
            : [],
        },
      };

    case "feature.updated":
      return {
        filterData: {
          tags: uniq(
            (event.data.current.tags || []).concat(
              event.data.previous.tags || []
            )
          ),
          projects: uniq(
            (event.data.current.project
              ? [event.data.current.project]
              : []
            ).concat(
              event.data.previous.project ? [event.data.previous.project] : []
            )
          ),
        },
      };

    case "feature.deleted":
      return {
        filterData: {
          tags: event.data.previous.tags || [],
          projects: event.data.previous.project
            ? [event.data.previous.project]
            : [],
        },
      };

    case "experiment.created":
      return {
        filterData: {
          tags: event.data.current.tags || [],
          projects: event.data.current.project
            ? [event.data.current.project]
            : [],
        },
      };

    case "experiment.updated":
      return {
        filterData: {
          tags: uniq(
            (event.data.current.tags || []).concat(
              event.data.previous.tags || []
            )
          ),
          projects: uniq(
            (event.data.current.project
              ? [event.data.current.project]
              : []
            ).concat(
              event.data.previous.project ? [event.data.previous.project] : []
            )
          ),
        },
      };

    case "experiment.deleted":
      return {
        filterData: {
          tags: event.data.previous.tags || [],
          projects: event.data.previous.project
            ? [event.data.previous.project]
            : [],
        },
      };

    default:
      invalidEvent = event;
      throw `Invalid event: ${invalidEvent}`;
  }
};
