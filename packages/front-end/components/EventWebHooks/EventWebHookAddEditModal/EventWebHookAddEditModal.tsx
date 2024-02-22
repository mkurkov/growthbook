import React, { FC, useCallback, useState } from "react";
import z from "zod";
import { useForm } from "react-hook-form";
import { NotificationEventName } from "back-end/src/events/base-types";
import Modal from "@/components/Modal";
import MultiSelectField from "@/components/Forms/MultiSelectField";
import SelectField from "@/components/Forms/SelectField";
import Toggle from "@/components/Forms/Toggle";
import {
  eventWebHookPayloadType,
  EventWebHookPayloadType,
  EventWebHookEditParams,
  eventWebHookEventOptions,
  EventWebHookModalMode,
  notificationEventNames,
} from "@/components/EventWebHooks/utils";
import { useEnvironments } from "@/services/features";
import { useDefinitions } from "@/services/DefinitionsContext";
import TagsInput from "@/components/Tags/TagsInput";

type EventWebHookAddEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventWebHookEditParams) => void;
  mode: EventWebHookModalMode;
  error: string | null;
};

const eventWebHookPayloadValues: { [k in EventWebHookPayloadType]: string } = {
  raw: "Raw",
  slack: "Slack",
  discord: "Discord",
  "ms-teams": "Microsoft Teams",
} as const;

export const EventWebHookAddEditModal: FC<EventWebHookAddEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  error,
}) => {
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const environmentSettings = useEnvironments();
  const environments = environmentSettings.map((env) => env.id);

  const { projects, tags } = useDefinitions();

  const form = useForm<EventWebHookEditParams>({
    defaultValues:
      mode.mode === "edit"
        ? mode.data
        : {
            name: "",
            events: [],
            url: "",
            enabled: true,
            environments: [],
            projects: [],
            tags: [],
            payloadType: "raw",
          },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    onSubmit(values);
  });

  const modalTitle =
    mode.mode == "edit" ? "Edit Webhook" : "Create New Webhook";
  const buttonText = mode.mode == "edit" ? "Save" : "Create";

  const handleFormValidation = useCallback(() => {
    const formValues = form.getValues();

    const schema = z.object({
      url: z.string().url(),
      name: z.string().trim().min(2),
      enabled: z.boolean(),
      events: z.array(z.enum(notificationEventNames)).min(1),
      payloadType: z.enum(eventWebHookPayloadType),
      tags: z.array(z.string()),
      projects: z.array(z.string()),
      environments: z.array(z.string()),
    });

    setCtaEnabled(schema.safeParse(formValues).success);
  }, [form]);

  if (!isOpen) return null;

  return (
    <Modal
      header={modalTitle}
      cta={buttonText}
      close={onClose}
      open={isOpen}
      submit={handleSubmit}
      error={error ?? undefined}
      ctaEnabled={ctaEnabled}
    >
      <div className="form-group">
        <label htmlFor="EventWebHookAddModal-name">Webhook Name</label>

        <input
          className="form-control"
          type="text"
          autoComplete="off"
          placeholder="My Webhook"
          id="EventWebHookAddModal-name"
          {...form.register("name")}
          onChange={(evt) => {
            form.setValue("name", evt.target.value);
            handleFormValidation();
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="EventWebHookAddModal-url">Endpoint URL</label>

        <input
          className="form-control"
          type="text"
          autoComplete="off"
          placeholder="https://example.com/growthbook-webhook"
          id="EventWebHookAddModal-url"
          {...form.register("url")}
          onChange={(evt) => {
            form.setValue("url", evt.target.value);
            handleFormValidation();
          }}
        />
      </div>

      <MultiSelectField
        label="Events"
        value={form.watch("events")}
        placeholder="Choose events"
        options={eventWebHookEventOptions.map(({ id }) => ({
          label: id,
          value: id,
        }))}
        onChange={(value: string[]) => {
          form.setValue("events", value as NotificationEventName[]);
          handleFormValidation();
        }}
      />

      <SelectField
        label="Payload Type"
        value={form.watch("payloadType")}
        placeholder="Choose payload type"
        options={eventWebHookPayloadType.map((key) => ({
          label: eventWebHookPayloadValues[key],
          value: key,
        }))}
        onChange={(value: EventWebHookPayloadType) => {
          form.setValue("payloadType", value);
          handleFormValidation();
        }}
      />

      <MultiSelectField
        label="Environment filters"
        helpText="Only receive notifications for matching environments."
        value={form.watch("environments")}
        options={environments.map((env) => ({
          label: env,
          value: env,
        }))}
        onChange={(value: string[]) => {
          form.setValue("environments", value);
          handleFormValidation();
        }}
      />

      <MultiSelectField
        label="Project filters"
        helpText="Only receive notifications for matching projects."
        value={form.watch("projects")}
        options={projects.map(({ name, id }) => ({
          label: name,
          value: id,
        }))}
        onChange={(value: string[]) => {
          form.setValue("projects", value);
          handleFormValidation();
        }}
      />

      <div className="form-group">
        <label className="d-block">Tag filters</label>
        <div className="mt-1">
          <TagsInput
            tagOptions={tags}
            value={form.watch("tags")}
            onChange={(selected: string[]) => {
              form.setValue(
                "tags",
                selected.map((item) => item)
              );
              handleFormValidation();
            }}
          />
          <small className="text-muted">
            Only receive notifications for matching tags.
          </small>
        </div>
      </div>

      <div className="form-group">
        <Toggle
          id="EventWebHookAddModal-enabled"
          value={form.watch("enabled")}
          setValue={(value) => {
            form.setValue("enabled", value);
            handleFormValidation();
          }}
        />
        <label htmlFor="EventWebHookAddModal-enabled">
          Enable the webhook?
        </label>
      </div>
    </Modal>
  );
};
