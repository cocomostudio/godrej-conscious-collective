
/**
 |
 | The envelope route.
 |
 | One GET, one response, one cache key. This is the only route the website
 | calls for page content.
 |
 | It is a content-api route with authentication left on, so the action appears
 | in the permission grid and an operator grants it to the Public role
 | deliberately. The route's own permission is not the interesting check,
 | though — see the controller, which checks `find` on every content type it
 | could serve **before** it looks a path up.
 |
 */

export default {
	type: "content-api",
	routes: [
		{
			method: "GET",
			path: "/envelope",
			handler: "envelope.find",
			config: {
				policies: [],
			},
		},
	],
}
