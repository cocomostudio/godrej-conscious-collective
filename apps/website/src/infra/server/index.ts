
import { WebServer } from "./web/index.ts"

export const Infrastructure = {
	async setup () {
		await WebServer.init()
	},
}
