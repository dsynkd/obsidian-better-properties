import { CustomPropertyType, CustomTypeKey, PropertyTypeSchema } from "../types";
import { renderWidget } from "./renderWidget";
import { renderSettings } from "./renderSettings";
import { registerListeners } from "./registerListeners";
import * as v from "valibot";

export const typeKey = "currency" satisfies CustomTypeKey;

export const currencyPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => "Currency",
	icon: "lucide-dollar-sign",
	validate: (v) =>
		!v ||
		(typeof v === "object" && v !== null && "value" in v && "currency" in v),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const currencySettingsSchema = v.optional(
	v.object({
		defaultCurrency: v.optional(v.string())
	})
) satisfies PropertyTypeSchema;
