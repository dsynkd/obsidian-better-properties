import { DropdownComponent, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";

type MeasurementValue = { value: number | null; unit: string } | null;

const DEFAULT_UNIT = "Unknown";

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

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new MeasurementTypeComponent(plugin, el, value, ctx);
};

class MeasurementTypeComponent extends PropertyWidgetComponentNew<"measurement", MeasurementValue> {
	type = "measurement" as const;

	parseValue = (v: unknown): MeasurementValue => {
		if (v == null || typeof v !== "object") {
			return null;
		}

		const maybe = v as { value?: unknown; unit?: unknown };
		if (maybe.value == null && maybe.unit == null) {
			return null;
		}

		return {
			value: maybe.value != null && maybe.value !== '' ? Number(maybe.value) : null,
			unit: maybe.unit != null && typeof maybe.unit === "string" ? maybe.unit : DEFAULT_UNIT
		};
	};

	numberComponent!: TextComponent;
	unitComponent!: DropdownComponent;
	displayEl!: HTMLDivElement;
	editContainer!: HTMLDivElement;
	units: Record<string, string> = {};
	isEditing = false;

	constructor(
		plugin: BetterProperties,
		container: HTMLElement,
		initial: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, container, initial, ctx);

		this.units = this.loadUnits();
		this.createDisplayView(container)
		this.createEditContainer(container);
		this.initializeValues(initial);
		this.adjustInputWidth();
		this.updateDisplay();
		this.onFocus = () => { this.enterEditMode() };
	}

	private createDisplayView(el: HTMLElement) {
		this.displayEl = el.createDiv();
		this.displayEl.addClasses(['better-properties-measurement-display','metadata-input-longtext']);
		this.displayEl.addEventListener("click", () => {
			this.enterEditMode();
		});
	}

	private createEditContainer(el: HTMLElement) {
		this.editContainer = el.createDiv();
		this.editContainer.addClass('better-properties-measurement-container');
		this.editContainer.style.display = "none"; // Initially Hidden
		this.createNumberComponent();
		this.createUnitComponent();
	}

	private createNumberComponent() {
		const numberEl = this.editContainer.createDiv({ cls: "better-properties-measurement-number" });
		this.numberComponent = new TextComponent(numberEl);
		this.numberComponent.inputEl.type = "number";
		
		// Add event listener to adjust width on input
		this.numberComponent.inputEl.addEventListener("input", () => {
			this.adjustInputWidth();
		});

		// Handle blur to exit edit mode
		this.numberComponent.inputEl.addEventListener("blur", () => {
			setTimeout(() => {
				if(document.activeElement !== this.unitComponent.selectEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		// Handle Enter key to exit edit mode
		this.numberComponent.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.exitEditMode();
			}
		});

		this.numberComponent.onChange(() => this.commit());
	}

	private createUnitComponent() {
		const unitEl = this.editContainer.createDiv({ cls: "better-properties-measurement-select" });

		this.unitComponent = new DropdownComponent(unitEl);
		Object.keys(this.units).forEach((unit) => {
			this.unitComponent.addOption(unit, unit);
		});

		// Add placeholder
		const placeholder = document.createElement("option");
		placeholder.value = "Unknown";
		placeholder.disabled = true;
		placeholder.selected = true;
		placeholder.hidden = true;
		placeholder.innerText = "Unit";
		this.unitComponent.selectEl.prepend(placeholder)

		// Handle blur on dropdown to exit edit mode
		this.unitComponent.selectEl.addEventListener("blur", () => {
			// Use a small timeout to check if focus moved to the input
			setTimeout(() => {
				if (document.activeElement !== this.numberComponent.inputEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		this.unitComponent.onChange(() => this.commit());
	}

	private initializeValues(initial: unknown) {
		const parsed = this.parseValue(initial);
		if(parsed == null) return;
		if (parsed.value != null) {
			this.numberComponent.setValue(`${parsed.value}`);
		}
		if (parsed.unit != null) {
			this.unitComponent.setValue(parsed.unit);
		}
	}

	private loadUnits(): Record<string, string> {
		const settings = this.getSettings();
		if (!settings?.units || settings.units.length === 0) {
			return DEFAULT_UNITS;
		}
		return settings.units.reduce((acc, unit) => {
			acc[unit.name] = unit.shorthand;
			return acc;
		}, {} as Record<string, string>);
	}

	private enterEditMode(): void {
		if (this.isEditing) return;
		this.isEditing = true;
		this.displayEl.style.display = "none";
		this.editContainer.style.display = "";
		this.numberComponent.inputEl.focus();
	}

	private exitEditMode(): void {
		if (!this.isEditing) return;
		this.normalizeInput();
		this.isEditing = false;
		this.displayEl.style.display = "";
		this.editContainer.style.display = "none";
		this.updateDisplay();
	}

	private normalizeInput() {
		// Normalize the input value (removes leading 0s, trailing dots, etc)
		const parsed = this.parseValue(this.getValue());
		if(parsed != null && parsed.value != null) {
			this.numberComponent.setValue(`${parsed.value}`);
			this.adjustInputWidth();
			this.unitComponent.setValue(parsed.unit);
		}
	}

	private updateDisplay(): void {
		const parsed = this.parseValue(this.getValue());
		const settings = this.getSettings();
		
		if (parsed == null || parsed.value == null) {
			this.displayEl.textContent = "";
			return;
		}
		
		const displayValue = parsed.value;
		const shorthand = this.units[parsed.unit] ?? (settings?.units?.find(u => u.name === parsed.unit)?.shorthand ?? "");
		this.displayEl.textContent = `${displayValue}${shorthand}`;
	}

	private adjustInputWidth(): void {
		const input = this.numberComponent.inputEl;
		const value = input.value || input.placeholder || "0";
		
		// Create a temporary element to measure text width
		const temp = document.createElement("span");
		temp.style.visibility = "hidden";
		temp.style.position = "absolute";
		temp.style.fontSize = getComputedStyle(input).fontSize;
		temp.style.fontFamily = getComputedStyle(input).fontFamily;
		temp.style.fontWeight = getComputedStyle(input).fontWeight;
		temp.style.letterSpacing = getComputedStyle(input).letterSpacing;
		temp.textContent = value;
		
		document.body.appendChild(temp);
		const width = temp.getBoundingClientRect().width;
		document.body.removeChild(temp);
		
		// Set width with some padding, respecting min/max constraints
		const minWidth = parseFloat(getComputedStyle(input).minWidth) || 0;
		const maxWidth = parseFloat(getComputedStyle(input).maxWidth) || Infinity;
		const newWidth = Math.max(minWidth, Math.min(maxWidth, width + 18)); // 18px padding
		
		input.style.width = `${newWidth}px`;
	}

	private commit(): void {
		const number = this.numberComponent.getValue();
		const unit = this.unitComponent.getValue();

		if (number == null || unit == null) {
			return;
		}

		// Reset proerty value when input values are empty
		if(number === '' && (unit === '' || unit === null || unit === undefined || unit === DEFAULT_UNIT)) {
			this.resetValue();
			return;
		}
		this.setValue({ value: number === '' ? null : Number(number), unit: unit });
		if (this.isEditing) {
			this.updateDisplay();
		}
	}

	private resetValue() {
		this.numberComponent.setValue('');
		this.unitComponent.setValue(DEFAULT_UNIT);
		// Explicitly call with `null` to reset value
		super.setValue(null);
	}

	getValue(): MeasurementValue {
		const value = this.numberComponent.getValue();
		const unit = this.unitComponent.getValue();
		return {
			value: value == null || value === '' ? null : Number(value),
			unit: unit,
		};
	}

	setValue(v: unknown): void {
		const parsed = this.parseValue(v);
		const current = this.getValue();
		if(parsed == null || current == null) {
			return;
		}
		
		if (current.value !== parsed.value) {
			this.numberComponent.setValue(`${parsed.value}`);
			this.adjustInputWidth();
		}
		if (current.unit !== parsed.unit) {
			this.unitComponent.setValue(parsed.unit);
		}

		super.setValue(parsed);

		// Update display if not in edit mode
		if (!this.isEditing) {
			this.updateDisplay();
		}
	}
}