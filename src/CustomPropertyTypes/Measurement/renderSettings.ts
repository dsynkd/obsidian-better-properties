import { DropdownComponent, Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from "./index";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/classes/ListSetting";
import { Icon } from "~/lib/types/icons";

type MeasurementSettings = NonNullable<ReturnType<typeof getPropertyTypeSettings<typeof typeKey>>>;
type Unit = NonNullable<MeasurementSettings["units"]>[number];

// Default units that will be used if no units are configured in settings
export const DEFAULT_UNITS: Record<string, string> = {
	// Metric length
	"Millimeter": "mm",
	"Centimeter": "cm",
	"Meter": "m",
	"Kilometer": "km",
	// Imperial length
	"Inch": "in",
	"Foot": "ft",
	"Yard": "yd",
	"Mile": "mi",
	// Metric mass
	"Milligram": "mg",
	"Gram": "g",
	"Kilogram": "kg",
	"Metric Ton": "t",
	// Imperial mass
	"Ounce": "oz",
	"Pound": "lb",
	"Liter": "l",
	// Volume imperial
	"Teaspoon": "tsp",
	"Tablespoon": "tbsp",
	"Fluid Ounce": "fl oz",
	"Cup": "cup",
	"Pint": "pt",
	"Quart": "qt",
	"Gallon": "gal",
	// Area
	"Square Millimeter": "mm²",
	"Square Centimeter": "cm²",
	"Square Meter": "m²",
	"Square Kilometer": "km²",
	"Square Inch": "in²",
	"Square Foot": "ft²",
	"Square Yard": "yd²",
	"Acre": "acre",
	// Speed
	"Meters per Second": "m/s",
	"Kilometers per Hour": "km/h",
	"Miles per Hour": "mph",
	// Temperature
	"Celsius": "°C",
	"Fahrenheit": "°F",
	"Kelvin": "K",
	// Time
	"Millisecond": "ms",
	"Second": "s",
	"Minute": "min",
	"Hour": "h",
};

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

	let defaultUnitDropdown: DropdownComponent | null = null;

	const updateDefaultUnitDropdown = () => {
		if (!defaultUnitDropdown) return;
		defaultUnitDropdown.selectEl.innerHTML = "";
		defaultUnitDropdown.addOption("Unknown", text("customPropertyTypes.measurement.settings.defaultUnit.none"));
		
		// Add existing units
		let isDefaultUnitValid = false;
		const units = settings.units;
		if (units) {
			for (const unit of units) {
				defaultUnitDropdown.addOption(unit.name, unit.name);
				if(unit.name === settings.defaultUnit) {
					isDefaultUnitValid = true;
				}
			}
		}
		
		if(isDefaultUnitValid) {
			defaultUnitDropdown.setValue(settings.defaultUnit ?? "Unknown");
		} else {
			// Reset Default Unit value, possibly because it was deleted from list
			settings.defaultUnit = undefined;
		}
	};

	new Setting(parentEl)
		.setName(text("customPropertyTypes.measurement.settings.defaultUnit.title"))
		.addDropdown((dropdown) => {
			defaultUnitDropdown = dropdown;
			updateDefaultUnitDropdown();
			
			dropdown.onChange((value) => {
				settings.defaultUnit = value === "Unknown" ? undefined : value;
			});
		});

	const list = new ListSetting<Unit>(parentEl)
		.setName(text("customPropertyTypes.measurement.settings.units.title"))
		.setDesc(text("customPropertyTypes.measurement.settings.units.desc"))
		.setValue(settings.units)
		.onChange((v) => {
			settings.units = [...v];
			updateDefaultUnitDropdown();
		})
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
							console.log(`matched: ${matched}`);
							if (matched === undefined) return;
							const oldName = matched.name;
							console.log(`oldName: ${oldName}`);
							matched.name = v;
							// If the default unit was set to the old name, update it to the new name
							if (settings.defaultUnit === oldName) {
								settings.defaultUnit = v;
							}
							updateDefaultUnitDropdown();
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
			
			// Focus item only if new item being created
			if (name === '') {
				item.focusCallback();
			}
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


