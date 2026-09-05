
import { configured_choice, environment_default } from "./environment"

export const UPLOAD_PROVIDERS = [ "local", "aws-s3" ] as const

export type Upload_Provider = typeof UPLOAD_PROVIDERS[number]

/**
 |
 | Where uploaded files are stored.
 |
 | Its own variable rather than a reading of the environment, because both
 | overrides are things somebody needs: a production-mode instance without S3
 | credentials — a staging box, a local reproduction of a production fault — and
 | a development instance pointed at S3, which is the only way to exercise that
 | provider before it is the one production depends on.
 |
 | Two config files ask this question and would otherwise each carry their own
 | copy of the answer: `config/plugins.ts` chooses the provider, and
 | `config/middlewares.ts` names the hosts it serves from in the CSP. The second
 | follows from the first and not from the environment — a development instance
 | on S3 whose CSP still said "local" would block its own images.
 |
 */
export function upload_provider (): Upload_Provider {
	return configured_choice(
		"UPLOAD_PROVIDER",
		UPLOAD_PROVIDERS,
		environment_default( "aws-s3", "local" ),
	)
}
