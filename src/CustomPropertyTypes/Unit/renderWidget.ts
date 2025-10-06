import { DropdownComponent, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";

type UnitValue = { value: number | undefined; unit: string } | undefined;

const DEFAULT_UNITS: string[] = [
	// Metric length
	"mm",
	"cm",
	"m",
	"km",
	// Imperial length
	"in",
	"ft",
	"yd",
	"mi",
	// Metric mass
	"mg",
	"g",
	"kg",
	"t",
	// Imperial mass
	"oz",
	"lb",
	// Volume metric
	"ml",
	"l",
	// Volume imperial
	"tsp",
	"tbsp",
	"fl oz",
	"cup",
	"pt",
	"qt",
	"gal",
	// Area
	"mm²",
	"cm²",
	"m²",
	"km²",
	"in²",
	"ft²",
	"yd²",
	"acre",
	// Speed
	"m/s",
	"km/h",
	"mph",
	// Temperature (kept for unit selection only; numeric value is separate)
	"°C",
	"°F",
	"K",
	// Time
	"ms",
	"s",
	"min",
	"h",
];

const UNIT_DISPLAY_NAMES: Record<string, string> = {
	// Metric length
	"mm": "Millimeter",
	"cm": "Centimeter", 
	"m": "Meter",
	"km": "Kilometer",
	// Imperial length
	"in": "Inch",
	"ft": "Foot",
	"yd": "Yard",
	"mi": "Mile",
	// Metric mass
	"mg": "Milligram",
	"g": "Gram",
	"kg": "Kilogram",
	"t": "Metric Ton",
	// Imperial mass
	"oz": "Ounce",
	"lb": "Pound",
	// Volume metric
	"ml": "Milliliter",
	"l": "Liter",
	// Volume imperial
	"tsp": "Teaspoon",
	"tbsp": "Tablespoon",
	"fl oz": "Fluid Ounce",
	"cup": "Cup",
	"pt": "Pint",
	"qt": "Quart",
	"gal": "Gallon",
	// Area
	"mm²": "Square Millimeter",
	"cm²": "Square Centimeter",
	"m²": "Square Meter",
	"km²": "Square Kilometer",
	"in²": "Square Inch",
	"ft²": "Square Foot",
	"yd²": "Square Yard",
	"acre": "Acre",
	// Speed
	"m/s": "Meters per Second",
	"km/h": "Kilometers per Hour",
	"mph": "Miles per Hour",
	// Temperature
	"°C": "Celsius",
	"°F": "Fahrenheit",
	"K": "Kelvin",
	// Time
	"ms": "Millisecond",
	"s": "Second",
	"min": "Minute",
	"h": "Hour",
};

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new UnitTypeComponent(plugin, el, value, ctx);
};

class UnitTypeComponent extends PropertyWidgetComponentNew<"unit", UnitValue> {
	type = "unit" as const;
	parseValue = (v: unknown): UnitValue => {
		if (!v) return { value: undefined, unit: this.units[0] };
		if (typeof v === "object" && v !== null) {
			const maybe = v as { value?: unknown; unit?: unknown };
			return {
				value:
					maybe.value === undefined || maybe.value === null
						? undefined
						: Number(maybe.value),
				unit: typeof maybe.unit === "string" ? maybe.unit : this.units[0],
			};
		}
		return { value: Number(v), unit: this.units[0] };
	};

	numberComponent!: TextComponent;
	unitComponent!: DropdownComponent;
	units: string[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		public initial: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, initial, ctx);

		const settings = this.getSettings();
		this.units = settings?.allowedUnits?.length
			? settings.allowedUnits
			: DEFAULT_UNITS;

		const container = el.createDiv({ 
			cls: "better-properties-unit-container"
		});
		const numberEl = container.createDiv({ cls: "better-properties-unit-number" });
		const unitEl = container.createDiv({ cls: "better-properties-unit-select" });

		this.numberComponent = new TextComponent(numberEl);
		this.numberComponent.inputEl.type = "number";
		if (settings?.decimalPlaces !== undefined) {
			this.numberComponent.inputEl.step = (1 / 10 ** settings.decimalPlaces).toString();
		}

		// Make the input width adjust to content
		this.numberComponent.inputEl.style.width = "auto";
		this.numberComponent.inputEl.style.minWidth = "3ch";
		this.numberComponent.inputEl.style.maxWidth = "15ch";
		
		// Add event listener to adjust width on input
		this.numberComponent.inputEl.addEventListener("input", () => {
			this.adjustInputWidth();
		});

		this.unitComponent = new DropdownComponent(unitEl);
		this.units.forEach((u) => {
			const displayName = UNIT_DISPLAY_NAMES[u] || u;
			this.unitComponent.addOption(u, displayName);
		});

		const parsed = this.parseValue(initial);
		this.numberComponent.setValue(
			parsed?.value === undefined ? "" : String(parsed?.value ?? "")
		);
		this.unitComponent.setValue(parsed?.unit ?? this.units[0]);

		this.numberComponent.onChange(() => this.commit());
		this.unitComponent.onChange(() => this.commit());

		// Adjust width for initial value
		this.adjustInputWidth();

		this.onFocus = () => {
			this.numberComponent.inputEl.focus();
		};
	}

	adjustInputWidth(): void {
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
		const newWidth = Math.max(minWidth, Math.min(maxWidth, width + 18)); // 8px padding
		
		input.style.width = `${newWidth}px`;
	}

	commit(): void {
		const valueStr = this.numberComponent.getValue();
		const settings = this.getSettings();
		let num: number | undefined = valueStr === "" ? undefined : Number(valueStr);
		if (num !== undefined && settings?.decimalPlaces !== undefined) {
			const dp = settings.decimalPlaces;
			const factor = 10 ** dp;
			num = Math.round(num * factor) / factor;
		}
		this.setValue({ value: num, unit: this.unitComponent.getValue() });
	}

	getValue(): UnitValue {
		const valueStr = this.numberComponent.getValue();
		return {
			value: valueStr === "" ? undefined : Number(valueStr),
			unit: this.unitComponent.getValue(),
		};
	}

	setValue(v: unknown): void {
		const parsed = this.parseValue(v);
		const current = this.getValue();
		if (current?.value !== parsed?.value) {
			this.numberComponent.setValue(
				parsed?.value === undefined ? "" : String(parsed?.value)
			);
			this.adjustInputWidth();
		}
		if (current?.unit !== parsed?.unit) {
			this.unitComponent.setValue(parsed?.unit ?? this.units[0]);
		}
		super.setValue(parsed);
	}
}


