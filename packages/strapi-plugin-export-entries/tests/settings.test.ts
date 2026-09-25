
/**
 |
 | The plugin's settings, checked at boot.
 |
 | A bad setting refuses the boot, so that a typo fails loudly at deploy time
 | rather than quietly in front of an admin. The seam is `load()`: a refused
 | boot serves nothing over HTTP, so the tests watch `load()` reject instead.
 |
 */

import { describe, expect, it } from "vitest"

import { boot_fixture_strapi } from "./support/boot-fixture-strapi.ts"
import {
	BIT_COMPONENT,
	BOARD_WITH_DYNAMIC_ZONE,
	GADGET,
	KIT_WITH_COMPONENT,
	LOCALISED_PHRASE,
	SETTING_SINGLE_TYPE,
} from "./support/schemas.ts"

describe("a refused boot", () => {
	it("names a content-type that does not exist", async () => {
		await expect( boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: "api::gizmo.gizmo" },
		} ) ).rejects.toThrow( /api::gizmo\.gizmo/ )
	})

	it("names a single type", async () => {
		await expect( boot_fixture_strapi( {
			content_types: { setting: SETTING_SINGLE_TYPE },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: "api::setting.setting" },
		} ) ).rejects.toThrow( /api::setting\.setting.*single type/ )
	})

	it("names a localised content-type", async () => {
		await expect( boot_fixture_strapi( {
			content_types: { phrase: LOCALISED_PHRASE },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: "api::phrase.phrase" },
		} ) ).rejects.toThrow( /api::phrase\.phrase.*localised/ )
	})

	it("names a content-type holding a component", async () => {
		await expect( boot_fixture_strapi( {
			components: { "parts.bit": BIT_COMPONENT },
			content_types: { kit: KIT_WITH_COMPONENT },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: "api::kit.kit" },
		} ) ).rejects.toThrow( /api::kit\.kit.*"bit".*component/ )
	})

	it("names a content-type holding a dynamic zone", async () => {
		await expect( boot_fixture_strapi( {
			components: { "parts.bit": BIT_COMPONENT },
			content_types: { board: BOARD_WITH_DYNAMIC_ZONE },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: "api::board.board" },
		} ) ).rejects.toThrow( /api::board\.board.*"blocks".*dynamic zone/ )
	})

	it("names a timezone that does not exist", async () => {
		await expect( boot_fixture_strapi( {
			env: { EXPORT_ENTRIES_TIMEZONE: "Mars/Olympus_Mons" },
		} ) ).rejects.toThrow( /Mars\/Olympus_Mons/ )
	})

	it.each( [ "0", "-5", "2.5", "ten" ] )(
		"names the preset %s, which is not a positive whole number",
		async ( preset ) => {
			await expect( boot_fixture_strapi( {
				env: { EXPORT_ENTRIES_PRESETS: `50,${preset}` },
			} ) ).rejects.toThrow( `"${preset}"` )
		},
	)
})

describe("a boot that succeeds", () => {
	it("accepts a plain collection type and a real timezone", async () => {
		const cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: "api::gadget.gadget",
				EXPORT_ENTRIES_PRESETS: "10, 20",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )

		await cms.destroy()
	})
})
