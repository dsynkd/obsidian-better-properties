import { DropdownComponent, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { DEFAULT_CURRENCIES } from "./renderSettings";

export type CurrencyValue = { value: number; currency: string };

const formatNumberDisplay = (num: number): string => {
	const abs = Math.abs(num);
	let suffix = "";
	let val = num;
	if (abs >= 1_000_000_000) {
		val = num / 1_000_000_000;
		suffix = "B";
	} else if (abs >= 1_000_000) {
		val = num / 1_000_000;
		suffix = "M";
	} else if (abs >= 1_000) {
		val = num / 1_000;
		suffix = "K";
	}
	const formatted = new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	}).format(val);
	return `${formatted}${suffix}`;
};

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new CurrencyTypeComponent(plugin, el, value, ctx);
};

class CurrencyTypeComponent extends PropertyWidgetComponentNew<"currency", CurrencyValue> {
	type = "currency" as const;

	parseValue = (v: unknown): CurrencyValue => {
		if (v == null || typeof v !== "object") {
			if (typeof v === "number") {
				return { value: v, currency: this.defaultCurrency };
			} else if (typeof v === "string" && Number(v)) {
				return { value: Number(v), currency: this.defaultCurrency };
			}
			return this.defaultValue();
		}

		const maybe = v as { value?: unknown; currency?: unknown };
		if (maybe.value == null && maybe.currency == null)
            return this.defaultValue();

		return {
			value: maybe.value != null && maybe.value !== "" ? Number(maybe.value) : 0,
			currency:
				maybe.currency != null && typeof maybe.currency === "string"
					? maybe.currency
					: this.defaultCurrency,
		};
	};

    defaultValue = (): CurrencyValue => {
        return { value: 0, currency: this.defaultCurrency }
    }

	numberComponent!: TextComponent;
	currencyComponent!: DropdownComponent;
	displayEl!: HTMLDivElement;
	editContainer!: HTMLDivElement;
	defaultCurrency!: string;
	isEditing = false;

	constructor(
		plugin: BetterProperties,
		container: HTMLElement,
		initial: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, container, initial, ctx);
		this.createDisplayView(container);
		this.createEditContainer(container);
		this.onFocus = () => {
			this.enterEditMode();
		};
		this.defaultCurrency = this.getSettings()?.defaultCurrency || "USD";
		this.initializeValues();
		this.updateDisplay();
	}

	private createDisplayView(el: HTMLElement) {
		this.displayEl = el.createDiv();
		this.displayEl.addClasses([
			"better-properties-currency-display",
			"metadata-input-longtext",
		]);
		this.displayEl.addEventListener("click", () => this.enterEditMode());
	}

	private createEditContainer(el: HTMLElement) {
		this.editContainer = el.createDiv();
		this.editContainer.addClass("better-properties-currency-container");
		this.editContainer.style.display = "none";
		this.createNumberComponent();
		this.createCurrencyComponent();
	}

	private createNumberComponent() {
		const numberEl = this.editContainer.createDiv({
			cls: "better-properties-currency-number",
		});
		this.numberComponent = new TextComponent(numberEl);
		this.numberComponent.inputEl.type = "number";
		this.numberComponent.inputEl.step = "any";
        
        this.numberComponent.inputEl.addEventListener("input", () => {
			this.adjustInputWidth();
		});

		this.numberComponent.inputEl.addEventListener("blur", () => {
			setTimeout(() => {
				if (document.activeElement !== this.currencyComponent.selectEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		this.numberComponent.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.exitEditMode();
		});

		this.numberComponent.onChange(() => this.commit());
	}

	private createCurrencyComponent() {
		const curEl = this.editContainer.createDiv({
			cls: "better-properties-currency-select",
		});
		this.currencyComponent = new DropdownComponent(curEl);

		this.currencyComponent.selectEl.addEventListener("blur", () => {
			setTimeout(() => {
				if (document.activeElement !== this.numberComponent.inputEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		this.currencyComponent.onChange(() => this.commit());
        this.currencyComponent.selectEl.innerHTML = "";
		Object.keys(DEFAULT_CURRENCIES).forEach((code) => {
			this.currencyComponent.addOption(code, code);
		});
	}

	private initializeValues() {
		const parsed = this.parseValue(this.value);
		this.numberComponent.setValue(`${parsed.value}`);
		this.currencyComponent.setValue(parsed?.currency ?? this.defaultCurrency);
	}

	private enterEditMode(): void {
		if (this.isEditing) return;
		this.isEditing = true;
		this.displayEl.style.display = "none";
		this.editContainer.style.display = "";
		this.numberComponent.inputEl.focus();
        this.adjustInputWidth()
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
        this.numberComponent.setValue(`${parsed.value}`);
	}

	private updateDisplay(): void {
		const parsed = this.parseValue(this.getValue());
		if (parsed == null || parsed.value == null) {
			this.displayEl.textContent = "";
			return;
		}
		const symbol = DEFAULT_CURRENCIES[parsed.currency];
		this.displayEl.textContent = `${symbol}${formatNumberDisplay(parsed.value)}`;
	}

	private commit(): void {
		const value = this.getValue();
		this.setValue(value);
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

	getValue(): CurrencyValue {
		const currency = this.currencyComponent.getValue();
		
        const value = this.numberComponent.getValue();
		if (value === "")
            return this.defaultValue();
		
        const num = Number(value);
		if (Number.isNaN(num))
            return this.defaultValue();
		
        return { value: num, currency };
	}
}
