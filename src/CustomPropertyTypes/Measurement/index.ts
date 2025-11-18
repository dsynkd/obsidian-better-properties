import { text } from "~/i18next";
import { CustomPropertyType, CustomTypeKey, PropertyTypeSchema } from "../types";
import { renderWidget } from "./renderWidget.ts";
import { renderSettings } from "./renderSettings.ts";
import { registerListeners } from "./registerListeners.ts";
import * as v from "valibot";

export const typeKey = "measurement" satisfies CustomTypeKey;

export const measurementPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.measurement.name"),
	icon: "lucide-ruler",
	validate: (v) =>
		!v ||
		(typeof v === "object" && v !== null && "value" in v && "unit" in v),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const measurementSettingsSchema = v.optional(
	v.object({})
) satisfies PropertyTypeSchema;
