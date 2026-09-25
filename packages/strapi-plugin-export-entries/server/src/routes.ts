
/**
 |
 | Every route is an admin route. Strapi requires a logged-in admin before the
 | handler runs on every route but the download, whose ticket is its only
 | credential.
 |
 */
export const routes = {
	admin: {
		type: "admin",
		routes: [
			{
				method: "GET",
				path: "/content-types/:uid",
				handler: "export.describe",
				config: { policies: [ "admin::isAuthenticatedAdmin" ] },
			},
			{
				method: "POST",
				path: "/tickets",
				handler: "export.request_ticket",
				config: { policies: [ "admin::isAuthenticatedAdmin" ] },
			},
			{
				method: "GET",
				path: "/download",
				handler: "export.download",
				config: { auth: false },
			},
		],
	},
}
