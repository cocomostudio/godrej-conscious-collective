
import { Infrastructure } from "./src/infra/server/index.ts"

async function entry () {
	await Infrastructure.setup()
}

entry()
