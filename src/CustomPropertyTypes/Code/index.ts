import { CustomPropertyType, PropertyTypeSchema } from "../types";
import { Icon } from "~/lib/types/icons";
import { renderWidget } from "./renderWidget";
import * as v from "valibot";


export const codeSettingsSchema = v.optional(
	v.object({})
) satisfies PropertyTypeSchema;

export const codePropertyType: CustomPropertyType = {
  type: "code",
  icon: "lucide-code" as Icon,
  name: () => "Code",
  validate: (value: unknown) => typeof value === "string" || typeof value === "number",
  renderWidget: renderWidget,
  registerListeners: () => {},
  renderSettings: () => {},
};
