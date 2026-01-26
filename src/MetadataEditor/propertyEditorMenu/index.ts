import BetterProperties from "~/main";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { Icon } from "~/lib/types/icons";
import { deleteProperty } from "~/lib/utils";
import { openDeleteModal } from "./delete";
import { openRenameModal } from "./rename";
import { Menu, MenuItem, MenuSeparator } from "obsidian";
import { openChangeIconModal } from "./icon";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import { customPropertyTypePrefix } from "~/lib/constants";
import { MetadataTypeManager } from "obsidian-typings";
import { getTrueProperty, isSubProperty, triggerPropertyTypeChange, getPropertySettings, setPropertySettings } from "~/CustomPropertyTypes/utils";

export const onFilePropertyMenu = (
	plugin: BetterProperties,
	menu: Menu,
	property: string
) => {
	const { metadataTypeManager } = plugin.app;

	const trueProperty = getTrueProperty(property);
	const isSubProp = isSubProperty(property);

	const found = menu.items.find((item) => {
		if (item instanceof MenuSeparator) return false;
		return !!item.submenu;
	}) as MenuItem | undefined;
	found?.setSection("action");

	if (found) {
		recreateTypeOptionsSubmenu({
			found,
			metadataTypeManager,
			property,
			plugin,
		});
	}

	const isReserved = Object.values(
		metadataTypeManager.registeredTypeWidgets
	).some(({ reservedKeys }) => {
		return reservedKeys?.includes(property);
	});
	if (found && isReserved) {
		found.submenu?.items?.forEach((item) => {
			if (item instanceof MenuSeparator) return;
			item.setDisabled(true);
		});
	}

	menu.addItem((item) =>
		item
			.setSection("action")
			.setTitle(obsidianText("interface.settings"))
			.setIcon("lucide-settings" satisfies Icon)
			.onClick(() => {
				showPropertySettingsModal({ plugin, property: trueProperty });
			})
	);

	if (!isSubProp) {
		menu.addItem((item) =>
			item
				.setSection("action")
				.setTitle(obsidianText("interface.menu.rename"))
				.setIcon("lucide-pen" satisfies Icon)
				.onClick(() => {
					openRenameModal({ plugin, property });
				})
		);
	}

	menu.addItem((item) =>
		item
			.setSection("action")
			.setTitle(text("common.icon"))
			.setIcon("lucide-badge-info" satisfies Icon)
			.onClick(() => {
				openChangeIconModal({ plugin, property: trueProperty });
			})
	);

	if (!isSubProp) {
		menu.addItem((item) =>
			item
				.setSection("danger")
				.setWarning(true)
				.setTitle(obsidianText("interface.delete-action-short-name"))
				.setIcon("lucide-x-circle" satisfies Icon)
				.onClick(async () => {
					if (plugin.settings.confirmPropertyDelete ?? true) {
						openDeleteModal({ plugin, property });
						return;
					}
					await deleteProperty({
						plugin,
						property,
					});
				})
		);
	}

	menu.sort();
};

const recreateTypeOptionsSubmenu = ({
	found,
	metadataTypeManager,
	property,
	plugin,
}: {
	found: MenuItem;
	metadataTypeManager: MetadataTypeManager;
	property: string;
	plugin: BetterProperties;
}) => {
	found.submenu!.items.forEach((item) => {
		(item as MenuItem).dom.remove();
	});

	found.submenu?.unload();
	found.submenu?.dom.remove();
	found.submenu = null;
	found.dom.querySelector(".menu-item-icon.mod-submenu")?.remove();
	const submenu = found.setSubmenu();

	const OBSIDIAN = "obsidian";
	const BETTER_PROPERTIES = "better-properties";
	submenu.addSections([OBSIDIAN, BETTER_PROPERTIES]);

	const isSubProp = isSubProperty(property);
	
	Object.values(metadataTypeManager.registeredTypeWidgets).forEach((widget) => {
		if (widget.reservedKeys) return;
		submenu.addItem((item) => {
			const isBuiltin = !widget.type.startsWith(customPropertyTypePrefix);
			item.onClick(() => {
				if (isSubProp) {
					// For sub-properties, store the custom type in settings
					const settings = getPropertySettings({ plugin, property });
					if (!settings.general) {
						settings.general = {
							icon: "",
							hidden: false,
							defaultValue: undefined,
							alias: undefined,
							suggestions: undefined,
							collapsed: false,
							customPropertyType: widget.type,
						};
					} else {
						settings.general.customPropertyType = widget.type;
					}
					setPropertySettings({ plugin, property, settings });
				} else {
					// For top-level properties, use metadata type manager
					metadataTypeManager.setType(property, widget.type);
				}
				// Trigger refresh for sub-properties to ensure parent container re-renders
				triggerPropertyTypeChange(metadataTypeManager, property);
			});
			item.setTitle(widget.name()).setIcon(widget.icon);

			if (!isBuiltin) {
				item.dom.setAttribute("data-is-better-properties", "true");
			}

			// TODO make this an optional in settings
			// item.setSection(isBuiltin ? OBSIDIAN : BETTER_PROPERTIES);

			// Check if this widget is the currently assigned one
			let isAssigned = false;
			if (isSubProp) {
				// For sub-properties, check settings
				const settings = getPropertySettings({ plugin, property });
				isAssigned = settings.general?.customPropertyType === widget.type;
			} else {
				// For top-level properties, check metadata type manager
				isAssigned = metadataTypeManager.getAssignedWidget(property) === widget.type;
			}
			
			if (isAssigned) {
				item.setChecked(true);
			}
		});
	});
};
