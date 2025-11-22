import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from "./index";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import { DEFAULT_UNITS } from "./renderWidget";

type MeasurementSettings = NonNullable<ReturnType<typeof getPropertyTypeSettings<typeof typeKey>>>;
type Unit = NonNullable<MeasurementSettings["units"]>[number];

// Convert DEFAULT_UNITS Record to array format for settings
const getDefaultUnitsArray = (): Unit[] => {
	return Object.entries(DEFAULT_UNITS).map(([name, shorthand]) => ({
		name,
		shorthand,
	}));
};

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl: parentEl } = modal;
	const settings = getPropertyTypeSettings({
		plugin,
		property,
		type: typeKey,
	});

	// Initialize with default units if empty
	if (!settings.units || settings.units.length === 0) {
		settings.units = getDefaultUnitsArray();
		setPropertyTypeSettings({
			plugin,
			property,
			type: typeKey,
			typeSettings: settings,
		});
	}

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property,
			type: typeKey,
			typeSettings: settings,
		});
	});

	const list = new ListSetting<Unit>(parentEl)
		.setName(text("customPropertyTypes.measurement.settings.units.title"))
		.setDesc(text("customPropertyTypes.measurement.settings.units.desc"))
		.setValue(settings.units)
		.onChange((v) => (settings.units = [...v]))
		.onCreateItem((unit, item) => {
			if (unit === undefined || item === undefined) {
				throw new Error("onCreateItem called with undefined");
			}
			const { name, shorthand } = unit;
			item
				.addDragButton()
				.addText((txt) =>
					txt
						.setPlaceholder(text("customPropertyTypes.measurement.settings.units.namePlaceholder"))
						.setValue(name)
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.name = v;
						})
						.then((inp) => item.onFocus(() => inp.inputEl.focus()))
				)
				.addText((txt) =>
					txt
						.setPlaceholder(text("customPropertyTypes.measurement.settings.units.shorthandPlaceholder"))
						.setValue(shorthand)
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.shorthand = v;
						})
				)
				.addDeleteButton();
		})
		.renderAllItems()
		.addFooterButton((btn) =>
			btn
				.setButtonText(text("customPropertyTypes.measurement.settings.units.addButton"))
				.setIcon("lucide-plus" satisfies Icon)
				.setCta()
				.onClick(() => {
					list.addItem({ name: "", shorthand: "" });
				})
		);
};


