
/**
 |
 | The two things every writer in this folder needs from Strapi.
 |
 | `Strapi` is the loaded application handed in by the seed script and by the
 | CMS test harness. It is `any` deliberately: the typed surface lives in
 | `types/generated`, which is built from the schemas and therefore not there
 | on a fresh clone — the seed has to run *before* the thing that would type
 | it exists.
 |
 | `create_entry` is the one place the draft-and-publish rule is written down.
 | Pages and sessions both carry it, and a second copy of it could disagree
 | with the first.
 |
 */

export type Strapi = any

/**
 |
 | Writes one entry through the document service, published unless told
 | otherwise.
 |
 | `published` is lifted out of the data rather than passed beside it, so that
 | a caller writing a draft says so in the same object literal as the rest of
 | the row — which is where a reader looks for it.
 |
 */
export async function create_entry (
	strapi: Strapi,
	uid: string,
	{ published = true, ...data }: Record<string, any>,
) {
	return await strapi.documents( uid ).create( {
		data,
		status: published ? "published" : "draft",
	} )
}
