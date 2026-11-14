// Forwards this route to the msi-api Worker (service binding "API"), so the
// API is served from the website's own domain.
export const onRequest = ({ request, env }) => env.API.fetch(request);
