
/**
 |
 | Script — a leaf, and the only thing an HTML document hook may hold.
 |
 | It renders exactly the `<script>` an administrator described. That is the
 | feature: analytics tags and third-party embeds are added here rather than in
 | a deploy. It is also the one place in the catalogue where what an editor
 | types runs in a visitor's browser, which is why the component sits on the
 | page shell — reachable only by whoever is allowed to edit site chrome —
 | rather than anywhere in a page's content.
 |
 | A script with neither an address nor code renders nothing.
 |
 */

import type { HTMLAttributeReferrerPolicy } from "react"

type Script_Props = {
	type?: string | null
	src?: string | null
	code?: string | null
	async?: boolean | null
	defer?: boolean | null
	cross_origin?: string | null
	integrity?: string | null
	nonce?: string | null
	referrer_policy?: HTMLAttributeReferrerPolicy | null
}

export function Script (
	{
		async,
		code,
		cross_origin,
		defer,
		integrity,
		nonce,
		referrer_policy,
		src,
		type,
	}: Script_Props,
) {
	const shared = {
		nonce: nonce || undefined,
		type: type || undefined,
	}

	if ( src ) {
		return <script
			{ ...shared }
			src={ src }
			async={ Boolean( async ) }
			defer={ Boolean( defer ) }
			crossOrigin={ cross_origin as "anonymous" | "use-credentials" }
			integrity={ integrity || undefined }
			referrerPolicy={ referrer_policy ?? undefined } />
	}

	if ( !code ) {
		return null
	}

	// The whole point of the component. `dangerouslySetInnerHTML` is how an
	// inline script's body is written in React, and there is no version of
	// "inject arbitrary code" that escapes it.
	return <script { ...shared } dangerouslySetInnerHTML={ { __html: code } } />
}
