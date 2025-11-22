import { TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new CodeTypeComponent(plugin, el, value, ctx);
};

class CodeTypeComponent extends PropertyWidgetComponentNew<"code", string> {
	type = "code" as const;

	parseValue = (v: unknown): string => {
		if (!v || typeof v !== "string") {
			console.warn("[CodeTypeComponent.parseValue] Could not parse value")
			return ''
		}
        return v
	};

	textComponent!: TextComponent;
	displayEl!: HTMLDivElement;
    displaySpan!: HTMLSpanElement;
	editContainer!: HTMLDivElement;
	isEditing = false;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		initial: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, initial, ctx);

		// Create display view
		this.createDisplayView(el)
		this.createEditContainer(el);

		// Set initial values
		this.textComponent.setValue(this.parseValue(initial));

		// Update display with initial value
		this.updateDisplay();

		this.onFocus = () => {
			this.enterEditMode();
			this.textComponent.inputEl.focus();
		};
	}

	private createDisplayView(el: HTMLElement) {
		this.displayEl = el.createDiv();
		this.displayEl.addClass('metadata-input-longtext');
		this.displayEl.addEventListener("click", () => {
			this.enterEditMode();
		});
        this.displaySpan = this.displayEl.createSpan();
        this.displaySpan.addClass('cm-inline-code');
	}

	private createEditContainer(el: HTMLElement) {
		this.editContainer = el.createDiv();
		this.editContainer.addClass('metadata-input-longtext');
        this.editContainer.style.padding = "0";
		this.editContainer.style.display = "none"; // Initially Hidden
		this.createTextComponent();
	}

	private createTextComponent() {
		this.textComponent = new TextComponent(this.editContainer);
        this.textComponent.inputEl.addClass('cm-inline-code');

		// Handle blur to exit edit mode
		this.textComponent.inputEl.addEventListener("blur", () => {
			this.exitEditMode();
		});

		// Handle Enter key to exit edit mode
		this.textComponent.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.exitEditMode();
			}
		});

		this.textComponent.onChange(() => this.commit());
	}

	enterEditMode(): void {
		if (this.isEditing) return;
		this.isEditing = true;
		this.displayEl.style.display = "none";
		this.editContainer.style.display = "";
		this.textComponent.inputEl.focus();
	}

	exitEditMode(): void {
		if (!this.isEditing) return;
		this.isEditing = false;
		this.displayEl.style.display = "";
		this.editContainer.style.display = "none";
		this.updateDisplay();
	}

	updateDisplay(): void {
		const parsed = this.parseValue(this.getValue());
		this.displaySpan.textContent = parsed;
		if(!parsed) {
			this.displaySpan.style.display = "none";
		} else {
			this.displaySpan.style.display = "";
		}
	}

	commit(): void {
		this.setValue(this.textComponent.getValue());
	}

	getValue(): string {
		return this.textComponent.getValue()
	}

	setValue(v: unknown): void {
		const parsed = this.parseValue(v);
		this.textComponent.setValue(parsed);
		super.setValue(parsed);

		// Update display if not in edit mode
		if (!this.isEditing) {
			this.updateDisplay();
		}
	}
}


