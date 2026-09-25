export function textFileResponse(body: string, filename: string): Response {
	return new Response(body, {
		headers: {
			"Content-Disposition": `inline; filename="${filename}"`,
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
