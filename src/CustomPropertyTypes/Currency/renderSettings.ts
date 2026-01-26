import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { typeKey } from "./index";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";

export const DEFAULT_CURRENCIES: Record<string, string> = {
	USD: "$",
	EUR: "€",
	JPY: "¥",
	GBP: "£",
	AUD: "$",
	CAD: "$",
	CHF: "CHF",
	CNY: "¥",
	HKD: "$",
	NZD: "$",
	SEK: "kr",
	KRW: "₩",
	SGD: "$",
	NOK: "kr",
	MXN: "$",
	INR: "₹",
	RUB: "₽",
	ZAR: "R",
	TRY: "₺",
	BRL: "R$",
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

	settings.defaultCurrency = "USD";
	setPropertyTypeSettings({
		plugin,
		property,
		type: typeKey,
		typeSettings: settings,
	});

	new Setting(parentEl)
		.setName("Default currency")
		.addDropdown((dropdown) => {
			Object.keys(DEFAULT_CURRENCIES).forEach((code) => {
				dropdown.addOption(code, code);
			});
			dropdown.setValue(settings.defaultCurrency ?? "USD");
			dropdown.onChange((value) => {
				settings.defaultCurrency = value;
				setPropertyTypeSettings({
					plugin,
					property,
					type: typeKey,
					typeSettings: settings,
				});
			});
		});
};
