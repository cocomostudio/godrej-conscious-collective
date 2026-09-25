
/**
 |
 | Every route is an admin route, so Strapi requires a logged-in admin before
 | the handler runs.
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
		],
	},
}
